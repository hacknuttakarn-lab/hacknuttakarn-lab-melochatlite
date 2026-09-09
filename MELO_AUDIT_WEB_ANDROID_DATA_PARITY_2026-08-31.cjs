#!/usr/bin/env node
/**
 * MELO Web <-> Android data parity static audit
 * Date: 2026-08-31
 *
 * Usage:
 *   node MELO_AUDIT_WEB_ANDROID_DATA_PARITY_2026-08-31.cjs "D:\\project\\melochat-main"
 *
 * Run from the Melochat Web project root.
 * The script does not modify app source. It creates:
 *   MELO_WEB_ANDROID_DATA_PARITY_REPORT_2026-08-31.md
 */

const fs = require("fs");
const path = require("path");

const webRoot = process.cwd();
const argAndroid = process.argv[2] ? path.resolve(process.argv[2]) : "";

function isDir(p) {
  try { return fs.statSync(p).isDirectory(); } catch { return false; }
}

function detectAndroidRoot() {
  if (argAndroid && isDir(argAndroid)) return argAndroid;

  const parent = path.dirname(webRoot);
  const candidates = [
    path.join(parent, "melochat-main"),
    path.join(parent, "melochat-main(3)"),
    path.join(parent, "bluebond-dating-app"),
  ];
  return candidates.find(isDir) || "";
}

const androidRoot = detectAndroidRoot();

if (!androidRoot) {
  console.error("ERROR: Android project folder was not found.");
  console.error('Run: node MELO_AUDIT_WEB_ANDROID_DATA_PARITY_2026-08-31.cjs "D:\\project\\melochat-main"');
  process.exit(2);
}

const ignored = new Set([
  "node_modules", ".next", ".expo", ".git", "dist", "build", "web-build",
  "coverage", ".turbo", "android", "ios"
]);

const extensions = new Set([".ts", ".tsx", ".js", ".jsx", ".sql"]);

function walk(root) {
  const out = [];
  const stack = [root];
  while (stack.length) {
    const current = stack.pop();
    let entries = [];
    try { entries = fs.readdirSync(current, { withFileTypes: true }); } catch { continue; }
    for (const ent of entries) {
      if (ignored.has(ent.name)) continue;
      const full = path.join(current, ent.name);
      if (ent.isDirectory()) stack.push(full);
      else if (extensions.has(path.extname(ent.name).toLowerCase())) out.push(full);
    }
  }
  return out;
}

function rel(root, file) {
  return path.relative(root, file).split(path.sep).join("/");
}

function read(file) {
  try { return fs.readFileSync(file, "utf8"); } catch { return ""; }
}

function uniq(items) {
  return [...new Set(items)].sort();
}

function extractAll(source, re) {
  const result = [];
  for (const m of source.matchAll(re)) if (m[1]) result.push(m[1]);
  return uniq(result);
}

function scanFile(root, file) {
  const source = read(file);
  return {
    file: rel(root, file),
    tables: extractAll(source, /\.from\(\s*["'`]([^"'`]+)["'`]\s*\)/g),
    rpc: extractAll(source, /\.rpc\(\s*["'`]([^"'`]+)["'`]/g),
    functions: extractAll(source, /\.functions\.invoke\(\s*["'`]([^"'`]+)["'`]/g),
    storage: extractAll(source, /\.storage\.from\(\s*["'`]([^"'`]+)["'`]\s*\)/g),
    fetchHosts: extractAll(source, /fetch\(\s*["'`](https?:\/\/[^/"'`]+)/g),
    hasMeloMember: /Melo member/i.test(source),
    hasPartnerIdentity:
      /active_business_id|activeBusinessId|partner_mode_preferences|partnerMode|businessId/i.test(source),
    hasChatSender:
      /sender_id|senderId|sender_user_id|senderUserId|sender_business_id|senderBusinessId/i.test(source),
    hasNominatim: /nominatim|photon\.komoot|photon/i.test(source),
    hasAiTripPlaceSearch: /ai-trip-place-search/i.test(source),
  };
}

function inventory(root) {
  return walk(root).map((file) => scanFile(root, file));
}

const web = inventory(webRoot);
const android = inventory(androidRoot);

function reverseIndex(items, key) {
  const map = new Map();
  for (const item of items) {
    for (const name of item[key]) {
      if (!map.has(name)) map.set(name, []);
      map.get(name).push(item.file);
    }
  }
  return map;
}

const categories = ["tables", "rpc", "functions", "storage"];
const webIndexes = Object.fromEntries(categories.map((c) => [c, reverseIndex(web, c)]));
const androidIndexes = Object.fromEntries(categories.map((c) => [c, reverseIndex(android, c)]));

function mdList(items) {
  return items.length ? items.map((x) => `\`${x}\``).join(", ") : "—";
}

function sectionCompare(title, key) {
  const w = webIndexes[key];
  const a = androidIndexes[key];
  const all = uniq([...w.keys(), ...a.keys()]);
  let s = `## ${title}\n\n`;
  s += `| Name | Web | Android | Status |\n|---|---:|---:|---|\n`;
  for (const name of all) {
    const wc = (w.get(name) || []).length;
    const ac = (a.get(name) || []).length;
    const status = wc && ac ? "Shared" : wc ? "Web only" : "Android only";
    s += `| \`${name}\` | ${wc} | ${ac} | ${status} |\n`;
  }
  s += "\n";
  return s;
}

function isPageLike(file) {
  return (
    /(^|\/)app\/.*\/page\.(tsx?|jsx?)$/.test(file) ||
    /(^|\/)app\/page\.(tsx?|jsx?)$/.test(file) ||
    /(^|\/)pages\/.*\.(tsx?|jsx?)$/.test(file)
  );
}

function hasDataUse(x) {
  return x.tables.length || x.rpc.length || x.functions.length || x.storage.length || x.fetchHosts.length;
}

const webPages = web.filter((x) => isPageLike(x.file));
const webDataFiles = web.filter(hasDataUse);

const suspicious = [];
for (const x of web) {
  if (x.hasMeloMember && /chat/i.test(x.file)) {
    suspicious.push({
      severity: "HIGH",
      file: x.file,
      issue: 'Chat contains fallback text "Melo member"; verify profile display-name resolution.',
    });
  }

  if (/chat/i.test(x.file) && x.hasChatSender && !x.hasPartnerIdentity) {
    suspicious.push({
      severity: "HIGH",
      file: x.file,
      issue: "Chat reads sender fields but no active Business/Partner identity token was detected.",
    });
  }

  if (x.hasNominatim && !x.hasAiTripPlaceSearch) {
    suspicious.push({
      severity: "MEDIUM",
      file: x.file,
      issue: "Web location source differs from Android ai-trip-place-search baseline.",
    });
  }
}

// Page-level parity: show every Web page and the DB/API names it touches.
let report = `# Melo Chat Web ↔ Android Data Parity Audit\n\n`;
report += `Generated: 2026-08-31\n\n`;
report += `- Web root: \`${webRoot}\`\n`;
report += `- Android root: \`${androidRoot}\`\n`;
report += `- Web source files scanned: **${web.length}**\n`;
report += `- Android source files scanned: **${android.length}**\n`;
report += `- Web pages detected: **${webPages.length}**\n\n`;

report += `## Important interpretation\n\n`;
report += `This is a static source audit. "Shared" means Web and Android reference the same Supabase table/RPC/function/bucket name somewhere in source. It does not by itself prove that parameters, filters, RLS, status values, or returned fields are semantically identical. High-risk mismatches are listed separately below.\n\n`;

report += `## Web pages — data source inventory\n\n`;
report += `| Web page | Tables | RPC | Edge Functions | Storage | External fetch |\n`;
report += `|---|---|---|---|---|---|\n`;
for (const p of webPages.sort((a,b) => a.file.localeCompare(b.file))) {
  report += `| \`${p.file}\` | ${mdList(p.tables)} | ${mdList(p.rpc)} | ${mdList(p.functions)} | ${mdList(p.storage)} | ${mdList(p.fetchHosts)} |\n`;
}
report += "\n";

report += sectionCompare("Supabase tables", "tables");
report += sectionCompare("Supabase RPC functions", "rpc");
report += sectionCompare("Supabase Edge Functions", "functions");
report += sectionCompare("Supabase Storage buckets", "storage");

report += `## High-risk findings\n\n`;
if (!suspicious.length) {
  report += `No high-risk string/static-pattern mismatch was detected by this scanner.\n\n`;
} else {
  report += `| Severity | Web file | Finding |\n|---|---|---|\n`;
  for (const f of suspicious) {
    report += `| ${f.severity} | \`${f.file}\` | ${f.issue} |\n`;
  }
  report += "\n";
}

report += `## Web data-access files with no matching Android reference\n\n`;
const webOnlyRows = [];
for (const item of webDataFiles) {
  const missing = [];
  for (const key of categories) {
    for (const name of item[key]) {
      if (!androidIndexes[key].has(name)) missing.push(`${key}:${name}`);
    }
  }
  if (missing.length) webOnlyRows.push({ file: item.file, missing: uniq(missing) });
}

if (!webOnlyRows.length) {
  report += `None.\n\n`;
} else {
  report += `| Web file | Web-only references |\n|---|---|\n`;
  for (const r of webOnlyRows.sort((a,b) => a.file.localeCompare(b.file))) {
    report += `| \`${r.file}\` | ${mdList(r.missing)} |\n`;
  }
  report += "\n";
}

report += `## Android data references not found anywhere in Web\n\n`;
for (const key of categories) {
  const missing = [...androidIndexes[key].keys()].filter((name) => !webIndexes[key].has(name)).sort();
  report += `### ${key}\n\n${missing.length ? missing.map((x) => `- \`${x}\``).join("\n") : "—"}\n\n`;
}

report += `## Chat-specific checks\n\n`;
const chatWeb = web.filter((x) => /chat/i.test(x.file) && (x.hasDataUse || x.hasChatSender || x.hasMeloMember));
if (!chatWeb.length) {
  report += `No chat source was detected by the scanner.\n`;
} else {
  report += `| Web chat file | Tables/RPC | Business identity | Sender fields | "Melo member" fallback |\n|---|---|---:|---:|---:|\n`;
  for (const x of chatWeb.sort((a,b) => a.file.localeCompare(b.file))) {
    const refs = [...x.tables.map(v=>`table:${v}`), ...x.rpc.map(v=>`rpc:${v}`)];
    report += `| \`${x.file}\` | ${mdList(refs)} | ${x.hasPartnerIdentity ? "YES" : "NO"} | ${x.hasChatSender ? "YES" : "NO"} | ${x.hasMeloMember ? "YES" : "NO"} |\n`;
  }
  report += "\n";
}

report += `## Known Android baseline rules used for review\n\n`;
report += `1. Partner/Business mode must use the active business identity, not only auth.uid().\n`;
report += `2. A customer message in a Business Chat must render as the other side for Partner mode.\n`;
report += `3. A Business-authored message must render as the other side for User mode.\n`;
report += `4. Contact/profile labels should resolve from profile/business data; do not expose a raw \"Melo member\" localhost Markdown fallback when a real display name is available.\n`;
report += `5. Web pages should prefer the same Supabase table/RPC/Edge Function contract as Android when they implement the same product flow.\n`;

const reportFile = path.join(webRoot, "MELO_WEB_ANDROID_DATA_PARITY_REPORT_2026-08-31.md");
fs.writeFileSync(reportFile, report, "utf8");

console.log("");
console.log("Melo Web <-> Android Data Parity Audit");
console.log("======================================");
console.log("Web files scanned    :", web.length);
console.log("Android files scanned:", android.length);
console.log("Web pages detected   :", webPages.length);
console.log("High-risk findings   :", suspicious.length);
console.log("Report               :", reportFile);
