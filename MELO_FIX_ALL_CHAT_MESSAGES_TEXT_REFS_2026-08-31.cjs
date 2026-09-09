#!/usr/bin/env node
/**
 * Melo Web - FULL chat_messages schema parity fix
 * Date: 2026-08-31
 *
 * Fixes every static Supabase chat_messages schema reference to `text`
 * in Web writes/selects/field arguments, using Android as the source of truth.
 *
 * It does NOT rename UI model fields such as message.text.
 */

const fs = require("fs");
const path = require("path");

const webRoot = process.cwd();
const androidRoot = process.argv[2] ? path.resolve(process.argv[2]) : "";
const overrideColumn = (process.argv[3] || "").trim();

if (!androidRoot || !fs.existsSync(androidRoot)) {
  console.error("ERROR: Android project folder not found:", androidRoot);
  process.exit(2);
}

let ts;
try {
  ts = require("typescript");
} catch (e) {
  console.error("ERROR: TypeScript package was not found in this Web project.");
  console.error("Run npm install only if your project dependencies are missing.");
  process.exit(3);
}

const ignored = new Set([
  "node_modules",".next",".expo",".git","dist","build","coverage",".turbo",
  "android","ios"
]);
const exts = new Set([".ts",".tsx",".js",".jsx",".sql"]);

function walk(root) {
  const out = [], stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    let ents = [];
    try { ents = fs.readdirSync(dir,{withFileTypes:true}); } catch { continue; }
    for (const ent of ents) {
      if (ignored.has(ent.name)) continue;
      if (/\.melo-before-|MELO_.*2026-08-31/i.test(ent.name)) continue;
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) stack.push(full);
      else if (exts.has(path.extname(ent.name).toLowerCase())) out.push(full);
    }
  }
  return out;
}
function read(file){ try{return fs.readFileSync(file,"utf8")}catch{return ""} }
function rel(root,file){ return path.relative(root,file).split(path.sep).join("/") }
function isString(node){ return ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) }
function propName(node) {
  if (!node) return "";
  if (ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNumericLiteral(node)) return node.text;
  return "";
}
function containsChatFrom(node) {
  let found = false;
  function visit(n) {
    if (found) return;
    if (ts.isCallExpression(n) &&
        ts.isPropertyAccessExpression(n.expression) &&
        n.expression.name.text === "from" &&
        n.arguments.length &&
        isString(n.arguments[0]) &&
        n.arguments[0].text === "chat_messages") {
      found = true; return;
    }
    ts.forEachChild(n, visit);
  }
  visit(node);
  return found;
}
function callMethod(node) {
  return ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
    ? node.expression.name.text : "";
}

const candidates = ["content","message","body","message_text","text"];
const scores = new Map(candidates.map(x=>[x,0]));
const evidence = [];

function score(col, pts, file, why) {
  if (!scores.has(col)) return;
  scores.set(col, scores.get(col)+pts);
  evidence.push({col,pts,file:rel(androidRoot,file),why});
}

function inspectObjectForColumns(obj, file, pts, why) {
  if (!ts.isObjectLiteralExpression(obj)) return;
  for (const p of obj.properties) {
    if (ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p)) {
      const n = propName(p.name);
      if (candidates.includes(n)) score(n,pts,file,why);
    }
  }
}

for (const file of walk(androidRoot)) {
  const src = read(file);
  if (!/chat_messages/i.test(src)) continue;

  if (path.extname(file).toLowerCase() === ".sql") {
    if (/create\s+table[\s\S]{0,500}(?:public\.)?chat_messages/i.test(src) ||
        /alter\s+table[\s\S]{0,500}(?:public\.)?chat_messages/i.test(src)) {
      for (const col of candidates) {
        const re = new RegExp(`\\b${col}\\b\\s+(?:text|varchar|character\\s+varying)`, "i");
        if (re.test(src)) score(col,200,file,"SQL schema column");
      }
    }
    continue;
  }

  const sf = ts.createSourceFile(file,src,ts.ScriptTarget.Latest,true,
    file.endsWith(".tsx") || file.endsWith(".jsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);

  function visit(node) {
    if (ts.isCallExpression(node) && containsChatFrom(node)) {
      const method = callMethod(node);
      if (["insert","upsert","update"].includes(method) && node.arguments[0]) {
        const arg = node.arguments[0];
        if (ts.isObjectLiteralExpression(arg)) inspectObjectForColumns(arg,file,80,"Android chat_messages write");
        if (ts.isArrayLiteralExpression(arg)) {
          for (const el of arg.elements) inspectObjectForColumns(el,file,80,"Android chat_messages write");
        }
      }
      if (method === "select" && node.arguments[0] && isString(node.arguments[0])) {
        const s = node.arguments[0].text;
        for (const col of candidates) {
          if (new RegExp(`(^|[,\\s])${col}($|[,\\s])`).test(s))
            score(col,20,file,"Android chat_messages select");
        }
      }
    }
    ts.forEachChild(node,visit);
  }
  visit(sf);

  // Secondary proximity evidence.
  for (const col of candidates) {
    if (new RegExp(`chat_messages[\\s\\S]{0,1800}\\b${col}\\b`,"i").test(src))
      score(col,5,file,"Android nearby reference");
  }
}

let realColumn = overrideColumn;
if (realColumn && !candidates.includes(realColumn)) {
  console.error("ERROR: Invalid override body column:", realColumn);
  process.exit(4);
}

if (!realColumn) {
  const ranked = [...scores.entries()].sort((a,b)=>b[1]-a[1]);
  console.log("");
  console.log("Android chat_messages body-column evidence");
  console.log("===========================================");
  ranked.forEach(([c,s])=>console.log(`- ${c}: ${s}`));

  if (!ranked[0] || ranked[0][1] <= 0) {
    console.error("SAFE STOP: Could not determine the Android message body column.");
    process.exit(5);
  }
  if (ranked[0][0] === "text") {
    console.error("SAFE STOP: Android source says `text`, but your live Supabase error says it does not exist.");
    console.error("Check that Web and Android point to the same Supabase project.");
    process.exit(6);
  }
  if (ranked[1] && ranked[1][1] > 0 &&
      ranked[0][1] < ranked[1][1]*1.2 &&
      ranked[0][1] < 200) {
    console.error(`SAFE STOP: Ambiguous column: ${ranked[0][0]}=${ranked[0][1]}, ${ranked[1][0]}=${ranked[1][1]}`);
    process.exit(7);
  }
  realColumn = ranked[0][0];
}

console.log("");
console.log("Using DB message body column:", realColumn);

function collectVarObjects(sf) {
  const map = new Map();
  function visit(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer &&
        (ts.isObjectLiteralExpression(node.initializer) || ts.isArrayLiteralExpression(node.initializer))) {
      if (!map.has(node.name.text)) map.set(node.name.text,[]);
      map.get(node.name.text).push(node.initializer);
    }
    ts.forEachChild(node,visit);
  }
  visit(sf);
  return map;
}

function addEdit(edits,start,end,replacement,reason) {
  edits.push({start,end,replacement,reason});
}
function patchObject(obj, edits) {
  if (ts.isArrayLiteralExpression(obj)) {
    for (const el of obj.elements) patchObject(el,edits);
    return;
  }
  if (!ts.isObjectLiteralExpression(obj)) return;

  for (const p of obj.properties) {
    if (ts.isPropertyAssignment(p) && propName(p.name)==="text") {
      addEdit(edits,p.name.getStart(),p.name.getEnd(),realColumn,"write object key");
    } else if (ts.isShorthandPropertyAssignment(p) && p.name.text==="text") {
      addEdit(edits,p.getStart(),p.getEnd(),`${realColumn}: text`,"write shorthand");
    }
  }
}

function replaceSelectField(raw) {
  return raw.split(",").map(part => {
    const lead = part.match(/^\s*/)?.[0] || "";
    const trail = part.match(/\s*$/)?.[0] || "";
    const core = part.trim();
    if (core === "text") return lead + realColumn + trail;
    if (core.startsWith("text:")) return lead + realColumn + core.slice(4) + trail;
    return part;
  }).join(",");
}

const changedFiles = [];
const editLog = [];

for (const file of walk(webRoot)) {
  const ext = path.extname(file).toLowerCase();
  if (![".ts",".tsx",".js",".jsx"].includes(ext)) continue;
  const src = read(file);
  if (!/chat_messages/.test(src) || !/\btext\b/.test(src)) continue;

  const sf = ts.createSourceFile(file,src,ts.ScriptTarget.Latest,true,
    file.endsWith(".tsx") || file.endsWith(".jsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const vars = collectVarObjects(sf);
  const edits = [];

  function visit(node) {
    if (ts.isCallExpression(node) && containsChatFrom(node)) {
      const method = callMethod(node);

      if (["insert","upsert","update"].includes(method) && node.arguments[0]) {
        const arg = node.arguments[0];
        if (ts.isObjectLiteralExpression(arg) || ts.isArrayLiteralExpression(arg)) {
          patchObject(arg,edits);
        } else if (ts.isIdentifier(arg) && vars.has(arg.text)) {
          // Patch local payload object(s) passed by identifier.
          for (const obj of vars.get(arg.text)) patchObject(obj,edits);
        }
      }

      if (method === "select" && node.arguments[0] && isString(node.arguments[0])) {
        const lit = node.arguments[0];
        const next = replaceSelectField(lit.text);
        if (next !== lit.text) {
          const quote = src[lit.getStart()];
          addEdit(edits,lit.getStart(),lit.getEnd(),quote+next+quote,"select field");
        }
      }

      if (["eq","neq","gt","gte","lt","lte","like","ilike","is","in","contains","containedBy","order"].includes(method)
          && node.arguments[0] && isString(node.arguments[0]) && node.arguments[0].text==="text") {
        const lit = node.arguments[0], quote = src[lit.getStart()];
        addEdit(edits,lit.getStart(),lit.getEnd(),quote+realColumn+quote,method+" field");
      }
    }
    ts.forEachChild(node,visit);
  }
  visit(sf);

  // Deduplicate same range, then apply backwards.
  const unique = new Map();
  for (const e of edits) unique.set(`${e.start}:${e.end}`,e);
  const finalEdits = [...unique.values()].sort((a,b)=>b.start-a.start);

  if (finalEdits.length) {
    let out = src;
    for (const e of finalEdits) out = out.slice(0,e.start)+e.replacement+out.slice(e.end);
    const backup = file+".melo-before-full-chat-schema-fix";
    if (!fs.existsSync(backup)) fs.copyFileSync(file,backup);
    fs.writeFileSync(file,out,"utf8");
    changedFiles.push(rel(webRoot,file));
    for (const e of finalEdits) editLog.push({file:rel(webRoot,file),...e});
  }
}

console.log("");
console.log("Changed files:");
if (!changedFiles.length) console.log("- none");
else changedFiles.forEach(f=>console.log("- "+f));

// Verification pass: find any remaining static `text` DB refs in chat_messages calls.
const remaining = [];

for (const file of walk(webRoot)) {
  const ext = path.extname(file).toLowerCase();
  if (![".ts",".tsx",".js",".jsx"].includes(ext)) continue;
  const src = read(file);
  if (!/chat_messages/.test(src) || !/\btext\b/.test(src)) continue;

  const sf = ts.createSourceFile(file,src,ts.ScriptTarget.Latest,true,
    file.endsWith(".tsx") || file.endsWith(".jsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const vars = collectVarObjects(sf);

  function objectHasText(obj) {
    if (ts.isArrayLiteralExpression(obj)) return obj.elements.some(objectHasText);
    if (!ts.isObjectLiteralExpression(obj)) return false;
    return obj.properties.some(p =>
      (ts.isPropertyAssignment(p) && propName(p.name)==="text") ||
      (ts.isShorthandPropertyAssignment(p) && p.name.text==="text")
    );
  }

  function visit(node) {
    if (ts.isCallExpression(node) && containsChatFrom(node)) {
      const method = callMethod(node);
      if (["insert","upsert","update"].includes(method) && node.arguments[0]) {
        const arg = node.arguments[0];
        let bad = false;
        if (ts.isObjectLiteralExpression(arg) || ts.isArrayLiteralExpression(arg)) bad = objectHasText(arg);
        else if (ts.isIdentifier(arg) && vars.has(arg.text))
          bad = vars.get(arg.text).some(objectHasText);
        if (bad) remaining.push(`${rel(webRoot,file)}:${sf.getLineAndCharacterOfPosition(node.getStart()).line+1} write text`);
      }
      if (method==="select" && node.arguments[0] && isString(node.arguments[0]) &&
          /(^|[,\s])text($|[,\s])/.test(node.arguments[0].text)) {
        remaining.push(`${rel(webRoot,file)}:${sf.getLineAndCharacterOfPosition(node.getStart()).line+1} select text`);
      }
    }
    ts.forEachChild(node,visit);
  }
  visit(sf);
}

const report = [
  "# Melo Web FULL chat_messages schema parity fix",
  "",
  `Database body column: \`${realColumn}\``,
  "",
  "Changed files:",
  ...(changedFiles.length ? changedFiles.map(f=>`- \`${f}\``) : ["- none"]),
  "",
  "Edits:",
  ...editLog.map(e=>`- \`${e.file}\` — ${e.reason}`),
  "",
  "Remaining static DB references to text:",
  ...(remaining.length ? remaining.map(x=>`- ${x}`) : ["- none"]),
  ""
].join("\n");
fs.writeFileSync(path.join(webRoot,"MELO_CHAT_MESSAGES_FULL_SCHEMA_PARITY_REPORT_2026-08-31.md"),report,"utf8");

if (remaining.length) {
  console.error("");
  console.error("SAFE STOP / VERIFY FAILED: remaining chat_messages DB references to `text`:");
  remaining.forEach(x=>console.error("- "+x));
  console.error("Source changes were backed up. Send the report back for targeted follow-up.");
  process.exit(8);
}

if (!changedFiles.length) {
  console.error("");
  console.error("No static chat_messages DB field `text` was found to patch.");
  console.error("If the live app still reports chat_messages.text, the value is being created dynamically");
  console.error("or a stale Next.js server is running.");
  process.exit(9);
}

console.log("");
console.log("VERIFY OK: no remaining static `text` field in Web chat_messages DB operations.");
console.log("Report: MELO_CHAT_MESSAGES_FULL_SCHEMA_PARITY_REPORT_2026-08-31.md");
