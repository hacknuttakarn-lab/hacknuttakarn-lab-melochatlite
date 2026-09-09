#!/usr/bin/env node
/**
 * Melo Web — Direct Chat Runtime Fix
 * Fixes the erroneous businessId injection inside directMine().
 * Scope: components/chat/ChatConversationPane.tsx only
 */

const fs = require("fs");
const path = require("path");

const root = process.cwd();
const rel = "components/chat/ChatConversationPane.tsx";
const file = path.join(root, rel);

if (!fs.existsSync(file)) {
  console.error("ERROR: " + rel + " not found.");
  console.error("Run this command from the Melochat Web project root.");
  process.exit(2);
}

let src = fs.readFileSync(file, "utf8");
const original = src;

// The previous overlay changed the Direct Chat ownership line to call
// isMeloMessageMine(...businessId...), but directMine has no business identity.
// Restore Direct Chat to its correct user-to-user ownership rule.
const badDirectMine =
  /if\s*\(\s*message\.senderId\s*&&\s*currentUserId\s*\)\s*return\s+isMeloMessageMine\s*\(\s*message\s*,\s*\{[\s\S]*?\}\s*\)\s*;?/;

if (!badDirectMine.test(src)) {
  console.error("SAFE STOP: the erroneous directMine ownership expression was not found.");
  console.error("No source file was changed.");
  process.exit(3);
}

src = src.replace(
  badDirectMine,
  "if (message.senderId && currentUserId) return message.senderId === currentUserId;"
);

// Clean the helper import only if isMeloMessageMine is no longer used anywhere.
const useCount = (src.match(/\bisMeloMessageMine\b/g) || []).length;
if (useCount === 1) {
  // One occurrence means import only.
  src = src.replace(
    /import\s*\{\s*isMeloMessageMine\s*,\s*resolveMeloContactText\s*\}\s*from\s*["']\.\/chatIdentity["'];?/,
    'import { resolveMeloContactText } from "./chatIdentity";'
  );
  src = src.replace(
    /import\s*\{\s*resolveMeloContactText\s*,\s*isMeloMessageMine\s*\}\s*from\s*["']\.\/chatIdentity["'];?/,
    'import { resolveMeloContactText } from "./chatIdentity";'
  );
}

if (src === original) {
  console.error("SAFE STOP: no change was produced.");
  process.exit(4);
}

const backup = file + ".melo-before-direct-runtime-fix";
if (!fs.existsSync(backup)) {
  fs.copyFileSync(file, backup);
}

fs.writeFileSync(file, src, "utf8");

console.log("");
console.log("Melo Web Direct Chat Runtime Fix");
console.log("================================");
console.log("- Fixed:", rel);
console.log("- directMine now uses senderId === currentUserId");
console.log("- Removed the invalid businessId dependency from Direct Chat");
console.log("- Backup:", rel + ".melo-before-direct-runtime-fix");
console.log("");
console.log("Next: npm run build");
