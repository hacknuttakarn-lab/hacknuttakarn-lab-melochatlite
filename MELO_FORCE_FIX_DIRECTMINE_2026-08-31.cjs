#!/usr/bin/env node
/**
 * MELO WEB - directMine FORCE FIX
 * Date: 2026-08-31
 *
 * Fixes only components/chat/ChatConversationPane.tsx
 * Removes the erroneous Business identity call from Direct Chat.
 */

const fs = require("fs");
const path = require("path");

const projectRoot = process.cwd();
const rel = "components/chat/ChatConversationPane.tsx";
const file = path.join(projectRoot, rel);

if (!fs.existsSync(file)) {
  console.error("ERROR: " + rel + " was not found.");
  console.error("Run this command from D:\\project\\melochat-web");
  process.exit(2);
}

let src = fs.readFileSync(file, "utf8");
const original = src;

function findDirectMineBlock(text) {
  const start = text.search(/\bfunction\s+directMine\s*\(|\bconst\s+directMine\s*=/);
  if (start < 0) return null;

  // Find opening brace after declaration.
  const brace = text.indexOf("{", start);
  if (brace < 0) return null;

  let depth = 0;
  let inSingle = false, inDouble = false, inTemplate = false, escaped = false;

  for (let i = brace; i < text.length; i++) {
    const ch = text[i];

    if (escaped) {
      escaped = false;
      continue;
    }
    if ((inSingle || inDouble || inTemplate) && ch === "\\") {
      escaped = true;
      continue;
    }
    if (!inDouble && !inTemplate && ch === "'") inSingle = !inSingle;
    else if (!inSingle && !inTemplate && ch === '"') inDouble = !inDouble;
    else if (!inSingle && !inDouble && ch === "`") inTemplate = !inTemplate;

    if (inSingle || inDouble || inTemplate) continue;

    if (ch === "{") depth++;
    if (ch === "}") {
      depth--;
      if (depth === 0) {
        return { start, end: i + 1, block: text.slice(start, i + 1) };
      }
    }
  }

  return null;
}

const found = findDirectMineBlock(src);
if (!found) {
  console.error("SAFE STOP: directMine() was not found.");
  console.error("No file was changed.");
  process.exit(3);
}

let block = found.block;

// Exact known bad line from runtime screenshot.
const exactBad =
  /if\s*\(\s*message\.senderId\s*&&\s*currentUserId\s*\)\s*return\s+isMeloMessageMine\s*\(\s*message\s*,\s*\{\s*userId\s*:\s*currentUserId\s*,\s*businessId\s*:\s*businessId\s*,\s*mode\s*:\s*businessId\s*\?\s*["']partner["']\s*:\s*["']user["']\s*\}\s*\)\s*;?/g;

let replacements = 0;
block = block.replace(exactBad, () => {
  replacements++;
  return "if (message.senderId && currentUserId) return message.senderId === currentUserId;";
});

// Fallback limited strictly to the directMine block:
// any return isMeloMessageMine(message, {... businessId ...}) after the same guard.
if (!replacements) {
  const fallback =
    /if\s*\(\s*message\.senderId\s*&&\s*currentUserId\s*\)\s*return\s+isMeloMessageMine\s*\(\s*message\s*,\s*\{[\s\S]*?\bbusinessId\b[\s\S]*?\}\s*\)\s*;?/g;

  block = block.replace(fallback, () => {
    replacements++;
    return "if (message.senderId && currentUserId) return message.senderId === currentUserId;";
  });
}

if (!replacements) {
  console.error("SAFE STOP: directMine() exists, but the bad Business identity expression was not found.");
  console.error("");
  console.error("Current directMine block:");
  console.error("--------------------------------");
  console.error(found.block);
  console.error("--------------------------------");
  console.error("No file was changed.");
  process.exit(4);
}

// Verify no businessId remains inside directMine.
if (/\bbusinessId\b/.test(block)) {
  console.error("SAFE STOP: businessId still exists inside directMine after attempted patch.");
  console.error("No file was changed.");
  process.exit(5);
}

src = src.slice(0, found.start) + block + src.slice(found.end);

// If helper function is now only present in import, remove it from import.
// Do not touch it if another code path still uses it.
const totalUses = (src.match(/\bisMeloMessageMine\b/g) || []).length;
if (totalUses === 1) {
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
  console.error("SAFE STOP: no change produced.");
  process.exit(6);
}

const backup = file + ".melo-before-directmine-force-fix";
if (!fs.existsSync(backup)) {
  fs.copyFileSync(file, backup);
}
fs.writeFileSync(file, src, "utf8");

// Final re-read verification.
const saved = fs.readFileSync(file, "utf8");
const after = findDirectMineBlock(saved);
if (!after || /\bbusinessId\b/.test(after.block)) {
  console.error("ERROR: post-write verification failed.");
  process.exit(7);
}

console.log("");
console.log("MELO Web directMine FORCE FIX");
console.log("=============================");
console.log("Patched:", rel);
console.log("Replacements:", replacements);
console.log("");
console.log("Verified directMine():");
console.log("--------------------------------");
console.log(after.block);
console.log("--------------------------------");
console.log("");
console.log("OK: businessId is no longer referenced inside Direct Chat directMine().");
console.log("");
console.log("IMPORTANT:");
console.log("1) Stop the current Next.js dev server (Ctrl+C).");
console.log("2) Delete the .next cache.");
console.log("3) Run npm run build.");
console.log("4) Run npm run dev.");
