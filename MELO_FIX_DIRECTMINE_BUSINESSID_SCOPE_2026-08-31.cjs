#!/usr/bin/env node
/**
 * MELO WEB - directMine businessId scope fix
 * Date: 2026-08-31
 *
 * Scope:
 *   components/chat/ChatConversationPane.tsx -> directMine() only
 *
 * Why:
 *   A previous patch referenced businessId inside Direct Chat even though Direct
 *   Chat has no active business identity. Instead of rewriting the function,
 *   define businessId as null locally so the existing helper executes in User mode.
 */

const fs = require("fs");
const path = require("path");

const projectRoot = process.cwd();
const rel = "components/chat/ChatConversationPane.tsx";
const file = path.join(projectRoot, rel);

if (!fs.existsSync(file)) {
  console.error("ERROR: " + rel + " not found.");
  console.error("Run this command from the Melochat Web project root.");
  process.exit(2);
}

let src = fs.readFileSync(file, "utf8");

function findDirectMineBlock(text) {
  const patterns = [
    /\bfunction\s+directMine\s*\([^)]*\)\s*\{/,
    /\bconst\s+directMine\s*=\s*\([^)]*\)\s*=>\s*\{/,
  ];

  let match = null;
  for (const re of patterns) {
    const m = re.exec(text);
    if (m && (!match || m.index < match.index)) match = m;
  }
  if (!match) return null;

  const open = text.indexOf("{", match.index);
  if (open < 0) return null;

  let depth = 0;
  let quote = null;
  let escaped = false;

  for (let i = open; i < text.length; i++) {
    const ch = text[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (quote) {
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }

    if (ch === "'" || ch === '"' || ch === "`") {
      quote = ch;
      continue;
    }

    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        return {
          start: match.index,
          open,
          end: i + 1,
          block: text.slice(match.index, i + 1),
        };
      }
    }
  }

  return null;
}

const found = findDirectMineBlock(src);
if (!found) {
  console.error("SAFE STOP: directMine() not found. No file changed.");
  process.exit(3);
}

const block = found.block;

if (!/\bbusinessId\b/.test(block)) {
  console.log("");
  console.log("No fix needed: directMine() no longer references businessId.");
  console.log("You may delete .next and restart Next.js.");
  process.exit(0);
}

// If businessId is already declared inside directMine, do not duplicate it.
const localDeclaration =
  /\b(?:const|let|var)\s+businessId\b/.test(block) ||
  /\bbusinessId\s*:\s*string\b/.test(block);

if (localDeclaration) {
  console.log("");
  console.log("businessId is already locally declared inside directMine().");
  console.log("No source change needed.");
  process.exit(0);
}

// Determine indentation from the first non-empty line after the opening brace.
const afterOpen = src.slice(found.open + 1, found.end);
const indentMatch = afterOpen.match(/\n([ \t]+)\S/);
const indent = indentMatch ? indentMatch[1] : "  ";

const injection =
  `\n${indent}// Direct Chat never uses an active Business identity.\n` +
  `${indent}// Keep the shared identity helper explicitly in User mode.\n` +
  `${indent}const businessId: string | null = null;`;

const patched =
  src.slice(0, found.open + 1) +
  injection +
  src.slice(found.open + 1);

const backup = file + ".melo-before-businessid-scope-fix";
if (!fs.existsSync(backup)) fs.copyFileSync(file, backup);

fs.writeFileSync(file, patched, "utf8");

// Post-write verification.
const saved = fs.readFileSync(file, "utf8");
const verified = findDirectMineBlock(saved);

if (
  !verified ||
  !/\bconst\s+businessId\s*:\s*string\s*\|\s*null\s*=\s*null\s*;/.test(verified.block)
) {
  console.error("ERROR: post-write verification failed.");
  process.exit(4);
}

console.log("");
console.log("MELO Web Direct Chat businessId Scope Fix");
console.log("=========================================");
console.log("- Patched:", rel);
console.log("- directMine() now has: const businessId: string | null = null;");
console.log("- Existing Direct Chat logic was otherwise preserved.");
console.log("- Backup:", rel + ".melo-before-businessid-scope-fix");
console.log("");
console.log("Verified directMine block:");
console.log("--------------------------------");
console.log(verified.block);
console.log("--------------------------------");
console.log("");
console.log("Next:");
console.log("1) Stop npm run dev with Ctrl+C");
console.log("2) Remove .next");
console.log("3) npm run build");
console.log("4) npm run dev");
