#!/usr/bin/env node
/**
 * MELO Web - dynamic chat_messages payload fix
 * Date: 2026-08-31
 *
 * Android evidence shows the DB body column is `message`.
 * Static scans found no literal `text:` in chat_messages writes, so the bad key
 * is being carried dynamically in a payload object.
 *
 * This patch wraps ONLY .from("chat_messages").insert/update/upsert payloads:
 *
 *   insert(payload)
 * becomes
 *   insert(normalizeChatMessageDbPayload(payload))
 *
 * The helper:
 * - preserves all other DB fields
 * - if row.text exists, copies it to row.message only when message is absent
 * - removes row.text before Supabase receives the payload
 * - supports one row or an array of rows
 *
 * UI values such as message.text are not renamed.
 */

const fs = require("fs");
const path = require("path");

let ts;
try {
  ts = require("typescript");
} catch {
  console.error("ERROR: TypeScript dependency was not found in this Web project.");
  process.exit(2);
}

const projectRoot = process.cwd();
const helperRel = "lib/chatMessageDbPayload.ts";
const helperAbs = path.join(projectRoot, helperRel);

const ignored = new Set([
  "node_modules",".next",".expo",".git","dist","build","coverage",".turbo",
  "android","ios"
]);
const exts = new Set([".ts",".tsx",".js",".jsx"]);

function walk(root) {
  const out = [], stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    let ents = [];
    try { ents = fs.readdirSync(dir,{withFileTypes:true}); } catch { continue; }

    for (const ent of ents) {
      if (ignored.has(ent.name)) continue;
      if (/\.melo-before-|^MELO_.*2026-08-31/i.test(ent.name)) continue;

      const full = path.join(dir,ent.name);
      if (ent.isDirectory()) stack.push(full);
      else if (exts.has(path.extname(ent.name).toLowerCase())) out.push(full);
    }
  }
  return out;
}

function read(file) {
  try { return fs.readFileSync(file,"utf8"); } catch { return ""; }
}

function rel(file) {
  return path.relative(projectRoot,file).split(path.sep).join("/");
}

function isString(node) {
  return ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node);
}

function containsChatMessagesFrom(node) {
  let found = false;

  function visit(n) {
    if (found) return;

    if (
      ts.isCallExpression(n) &&
      ts.isPropertyAccessExpression(n.expression) &&
      n.expression.name.text === "from" &&
      n.arguments.length > 0 &&
      isString(n.arguments[0]) &&
      n.arguments[0].text === "chat_messages"
    ) {
      found = true;
      return;
    }

    ts.forEachChild(n,visit);
  }

  visit(node);
  return found;
}

function importPathFor(file) {
  const fromDir = path.dirname(file);
  const target = path.join(projectRoot,"lib","chatMessageDbPayload");
  let p = path.relative(fromDir,target).split(path.sep).join("/");
  if (!p.startsWith(".")) p = "./" + p;
  return p;
}

function addImport(source,file) {
  if (/\bnormalizeChatMessageDbPayload\b/.test(source) &&
      /chatMessageDbPayload/.test(source)) {
    return source;
  }

  const line =
    `import { normalizeChatMessageDbPayload } from "${importPathFor(file)}";\n`;

  const imports = [...source.matchAll(/^import[\s\S]*?;\s*$/gm)];
  if (imports.length) {
    const last = imports[imports.length-1];
    const pos = last.index + last[0].length;
    return source.slice(0,pos) + "\n" + line + source.slice(pos);
  }

  return line + source;
}

const helper = `/**
 * Database-boundary normalizer for public.chat_messages.
 *
 * Android/live DB uses "message" as the text-body column.
 * Web UI may still use "text" internally, which is fine.
 */
export function normalizeChatMessageDbPayload<T>(payload: T): T {
  const normalizeOne = (row: any) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) return row;

    if (!Object.prototype.hasOwnProperty.call(row, "text")) {
      return row;
    }

    const next = { ...row };

    if (
      (next.message === undefined || next.message === null) &&
      next.text !== undefined &&
      next.text !== null
    ) {
      next.message = next.text;
    }

    delete next.text;
    return next;
  };

  if (Array.isArray(payload)) {
    return payload.map(normalizeOne) as T;
  }

  return normalizeOne(payload) as T;
}
`;

fs.mkdirSync(path.dirname(helperAbs),{recursive:true});
if (!fs.existsSync(helperAbs)) {
  fs.writeFileSync(helperAbs,helper,"utf8");
} else {
  const existing = read(helperAbs);
  if (!/normalizeChatMessageDbPayload/.test(existing)) {
    const backup = helperAbs + ".melo-before-dynamic-chat-payload-fix";
    if (!fs.existsSync(backup)) fs.copyFileSync(helperAbs,backup);
    fs.writeFileSync(helperAbs,helper,"utf8");
  }
}

const changed = [];
const wrapped = [];

for (const file of walk(projectRoot)) {
  if (file === helperAbs) continue;

  const source = read(file);
  if (!/chat_messages/.test(source)) continue;

  const sf = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") || file.endsWith(".jsx")
      ? ts.ScriptKind.TSX
      : ts.ScriptKind.TS
  );

  const edits = [];

  function visit(node) {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression)
    ) {
      const method = node.expression.name.text;

      if (
        ["insert","update","upsert"].includes(method) &&
        node.arguments.length > 0 &&
        containsChatMessagesFrom(node.expression.expression)
      ) {
        const arg = node.arguments[0];
        const argText = source.slice(arg.getStart(sf),arg.getEnd());

        if (!/^normalizeChatMessageDbPayload\s*\(/.test(argText.trim())) {
          edits.push({
            start: arg.getStart(sf),
            end: arg.getEnd(),
            replacement: `normalizeChatMessageDbPayload(${argText})`,
            line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
            method,
          });
        }
      }
    }

    ts.forEachChild(node,visit);
  }

  visit(sf);

  if (!edits.length) continue;

  let out = source;
  for (const e of edits.sort((a,b)=>b.start-a.start)) {
    out = out.slice(0,e.start) + e.replacement + out.slice(e.end);
  }

  out = addImport(out,file);

  const backup = file + ".melo-before-dynamic-chat-payload-fix";
  if (!fs.existsSync(backup)) fs.copyFileSync(file,backup);
  fs.writeFileSync(file,out,"utf8");

  changed.push(rel(file));
  for (const e of edits) {
    wrapped.push(`${rel(file)}:${e.line} ${e.method}`);
  }
}

console.log("");
console.log("MELO Web dynamic chat_messages payload fix");
console.log("==========================================");
console.log("- Helper:", helperRel);

if (!changed.length) {
  console.error("");
  console.error("SAFE STOP: No .from(\"chat_messages\").insert/update/upsert call was found.");
  console.error("No existing Web source file was changed.");
  console.error("");
  console.error("This strongly indicates sending is done through an RPC / Edge Function instead");
  console.error("of a direct chat_messages table write.");
  process.exit(3);
}

console.log("- Changed files:");
for (const f of changed) console.log("  - " + f);

console.log("- Wrapped DB writes:");
for (const x of wrapped) console.log("  - " + x);

// Verification: every direct chat_messages write must now be wrapped.
const remaining = [];

for (const file of walk(projectRoot)) {
  if (file === helperAbs) continue;

  const source = read(file);
  if (!/chat_messages/.test(source)) continue;

  const sf = ts.createSourceFile(
    file,source,ts.ScriptTarget.Latest,true,
    file.endsWith(".tsx") || file.endsWith(".jsx")
      ? ts.ScriptKind.TSX
      : ts.ScriptKind.TS
  );

  function visit(node) {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression)
    ) {
      const method = node.expression.name.text;

      if (
        ["insert","update","upsert"].includes(method) &&
        node.arguments.length > 0 &&
        containsChatMessagesFrom(node.expression.expression)
      ) {
        const arg = node.arguments[0];
        const argText = source.slice(arg.getStart(sf),arg.getEnd()).trim();

        if (!/^normalizeChatMessageDbPayload\s*\(/.test(argText)) {
          remaining.push(
            `${rel(file)}:${sf.getLineAndCharacterOfPosition(node.getStart(sf)).line+1} ${method}`
          );
        }
      }
    }

    ts.forEachChild(node,visit);
  }

  visit(sf);
}

const report = [
  "# Melo Web dynamic chat_messages payload fix",
  "",
  "DB text-body column: `message`",
  "",
  "Changed files:",
  ...changed.map(x=>`- \`${x}\``),
  "",
  "Wrapped direct DB writes:",
  ...wrapped.map(x=>`- ${x}`),
  "",
  "Remaining unwrapped direct chat_messages writes:",
  ...(remaining.length ? remaining.map(x=>`- ${x}`) : ["- none"]),
  ""
].join("\n");

fs.writeFileSync(
  path.join(projectRoot,"MELO_CHAT_MESSAGES_DYNAMIC_PAYLOAD_REPORT_2026-08-31.md"),
  report,
  "utf8"
);

if (remaining.length) {
  console.error("");
  console.error("VERIFY FAILED: some chat_messages writes are still unwrapped:");
  remaining.forEach(x=>console.error("- "+x));
  process.exit(4);
}

console.log("");
console.log("VERIFY OK: every direct chat_messages write now normalizes the DB payload.");
console.log("Report: MELO_CHAT_MESSAGES_DYNAMIC_PAYLOAD_REPORT_2026-08-31.md");
