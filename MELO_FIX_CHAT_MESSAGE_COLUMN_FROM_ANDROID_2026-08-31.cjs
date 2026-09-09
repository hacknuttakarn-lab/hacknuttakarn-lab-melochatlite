#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const webRoot = process.cwd();
const androidRoot = process.argv[2] ? path.resolve(process.argv[2]) : "";

if (!androidRoot || !fs.existsSync(androidRoot)) {
  console.error("ERROR: Android project folder was not found.");
  console.error('Usage: node MELO_FIX_CHAT_MESSAGE_COLUMN_FROM_ANDROID_2026-08-31.cjs "D:\\project\\melochat-main"');
  process.exit(2);
}

const ignored = new Set(["node_modules",".next",".expo",".git","dist","build","coverage",".turbo","android","ios"]);
const exts = new Set([".ts",".tsx",".js",".jsx",".sql"]);
const BODY_CANDIDATES = ["content","message","body","message_text","text"];

function walk(root) {
  const out = [], stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    let ents = [];
    try { ents = fs.readdirSync(dir, {withFileTypes:true}); } catch { continue; }
    for (const ent of ents) {
      if (ignored.has(ent.name)) continue;
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) stack.push(full);
      else if (exts.has(path.extname(ent.name).toLowerCase())) out.push(full);
    }
  }
  return out;
}

function read(file) { try { return fs.readFileSync(file, "utf8"); } catch { return ""; } }

const scores = new Map(BODY_CANDIDATES.map(x => [x, 0]));
const evidence = [];

function add(col, score, file, why) {
  if (!scores.has(col)) return;
  scores.set(col, scores.get(col) + score);
  evidence.push({col, score, file: path.relative(androidRoot,file).replaceAll("\\","/"), why});
}

for (const file of walk(androidRoot)) {
  const src = read(file);
  if (!/chat_messages/i.test(src)) continue;

  if (/create\s+table[\s\S]{0,400}(?:public\.)?chat_messages/i.test(src) ||
      /alter\s+table[\s\S]{0,250}(?:public\.)?chat_messages/i.test(src)) {
    for (const col of BODY_CANDIDATES) {
      const re = new RegExp(`\\b${col}\\b\\s+(?:text|varchar|character\\s+varying)`, "i");
      if (re.test(src)) add(col, 100, file, "SQL chat_messages column");
    }
  }

  const chunks = src.split(/\.from\(\s*["'`]chat_messages["'`]\s*\)/i);
  if (chunks.length > 1) {
    for (let i = 1; i < chunks.length; i++) {
      const near = chunks[i].slice(0, 1800);
      if (/\.(?:insert|upsert|update)\s*\(/.test(near)) {
        for (const col of BODY_CANDIDATES) {
          const re = new RegExp(`\\b${col}\\s*:`);
          if (re.test(near)) add(col, 40, file, "Android chat_messages write");
        }
      }
      for (const col of BODY_CANDIDATES) {
        const re = new RegExp(`\\b${col}\\b`);
        if (re.test(near)) add(col, 5, file, "Android chat_messages nearby reference");
      }
    }
  }
}

const ranked = [...scores.entries()].sort((a,b)=>b[1]-a[1]);
console.log("");
console.log("Android chat_messages body-column evidence");
console.log("===========================================");
for (const [col, score] of ranked) console.log(`- ${col}: ${score}`);

const top = ranked[0], second = ranked[1];

if (!top || top[1] <= 0) {
  console.error("SAFE STOP: Could not determine Android/DB message body column. No Web file changed.");
  process.exit(3);
}
if (top[0] === "text") {
  console.error("SAFE STOP: Android evidence says text, but Supabase says text does not exist.");
  console.error("This may mean Android source/schema is stale or Web points to another Supabase project.");
  process.exit(4);
}
if (second && second[1] > 0 && top[1] < second[1] * 1.25 && top[1] < 100) {
  console.error(`SAFE STOP: Ambiguous body column (${top[0]}=${top[1]}, ${second[0]}=${second[1]}).`);
  process.exit(5);
}

const realColumn = top[0];
console.log("");
console.log("Detected real message body column:", realColumn);

const changed = [];
for (const file of walk(webRoot)) {
  let src = read(file);
  if (!/\.from\(\s*["'`]chat_messages["'`]\s*\)/i.test(src)) continue;
  if (!/\btext\s*:/.test(src)) continue;

  const original = src;
  const fromRe = /\.from\(\s*["'`]chat_messages["'`]\s*\)/gi;
  const matches = [...src.matchAll(fromRe)].reverse();

  for (const m of matches) {
    const start = m.index;
    const end = Math.min(src.length, start + 2600);
    const segment = src.slice(start, end);
    const writeMatch = /\.(insert|upsert|update)\s*\(/.exec(segment);
    if (!writeMatch) continue;

    const abs = start + writeMatch.index;
    const chunkEnd = Math.min(src.length, abs + 1600);
    let chunk = src.slice(abs, chunkEnd);

    chunk = chunk.replace(/(^|[,{]\s*)text\s*:/gm, `$1${realColumn}:`);
    chunk = chunk.replace(/([,{]\s*)text(\s*[,}])/g, `$1${realColumn}: text$2`);

    src = src.slice(0, abs) + chunk + src.slice(chunkEnd);
  }

  if (src !== original) {
    const backup = file + ".melo-before-chat-message-column-fix";
    if (!fs.existsSync(backup)) fs.copyFileSync(file, backup);
    fs.writeFileSync(file, src, "utf8");
    changed.push(path.relative(webRoot,file).replaceAll("\\","/"));
  }
}

if (!changed.length) {
  console.error(`SAFE STOP: Detected \`${realColumn}\`, but no Web chat_messages write using text was safely found.`);
  process.exit(6);
}

const report = [
  "# Melo Web chat_messages column parity fix",
  "",
  `Detected Android/DB body column: \`${realColumn}\``,
  "",
  "Changed Web files:",
  ...changed.map(x=>`- \`${x}\``),
  "",
  "Evidence:",
  ...evidence.filter(x=>x.col===realColumn).sort((a,b)=>b.score-a.score).slice(0,20)
    .map(x=>`- +${x.score} \`${x.file}\` — ${x.why}`),
  ""
].join("\n");

fs.writeFileSync(path.join(webRoot,"MELO_CHAT_MESSAGE_COLUMN_PARITY_REPORT_2026-08-31.md"), report, "utf8");

console.log("");
console.log("MELO Web chat message column parity fix");
console.log("=======================================");
console.log("Android/DB body column:", realColumn);
for (const f of changed) console.log("- Patched:", f);
console.log("Report: MELO_CHAT_MESSAGE_COLUMN_PARITY_REPORT_2026-08-31.md");
console.log("Next: delete .next, npm run build, npm run dev");
