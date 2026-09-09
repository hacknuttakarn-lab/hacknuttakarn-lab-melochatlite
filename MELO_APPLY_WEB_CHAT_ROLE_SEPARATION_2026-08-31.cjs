#!/usr/bin/env node
/**
 * MELO Web Chat Role Separation Fix
 * Date: 2026-08-31
 *
 * Scope:
 * - Patch only Web chat ownership/direction logic when a safe existing pattern is detected.
 * - Add a small identity helper used by the patched expression.
 * - Normalize the visible "[Melo member](.../users/<id>)" fallback when the message row
 *   already carries a usable display name.
 *
 * Safety:
 * - No DB/schema changes.
 * - No package install.
 * - No unrelated UI/theme/i18n changes.
 * - If the expected source shape is not found, the script stops instead of guessing.
 */

const fs = require("fs");
const path = require("path");

const projectRoot = process.cwd();

function exists(rel) {
  return fs.existsSync(path.join(projectRoot, rel));
}

function read(rel) {
  return fs.readFileSync(path.join(projectRoot, rel), "utf8");
}

function write(rel, text) {
  const file = path.join(projectRoot, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text, "utf8");
}

function backup(rel) {
  const src = path.join(projectRoot, rel);
  const dst = src + ".melo-before-chat-role-fix";
  if (!fs.existsSync(dst)) fs.copyFileSync(src, dst);
}

const candidateFiles = [
  "components/chat/ChatConversationPane.tsx",
  "components/chat/chatData.ts",
  "components/chat/ChatCenter.tsx",
  "components/chat/ChatDrawer.tsx",
];

const existing = candidateFiles.filter(exists);

if (!existing.length) {
  console.error("ERROR: Melo Web chat files were not found.");
  console.error("Expected one of:");
  for (const file of candidateFiles) console.error(" - " + file);
  console.error("Run this command from the Melochat Web project root.");
  process.exit(2);
}

const helperRel = "components/chat/chatIdentity.ts";

const helperSource = `/**
 * Melo Chat Web — shared message identity rules.
 * Keeps User identity and active Partner/Business identity separate.
 */

export type MeloChatViewerIdentity = {
  userId?: string | null;
  businessId?: string | null;
  mode?: string | null;
};

type AnyRecord = Record<string, any>;

const value = (...items: any[]): string => {
  for (const item of items) {
    if (typeof item === "string" && item.trim()) return item.trim();
  }
  return "";
};

const lower = (item: any) => String(item ?? "").trim().toLowerCase();

export function getMeloMessageSenderUserId(message: AnyRecord): string {
  return value(
    message?.sender_user_id,
    message?.senderUserId,
    message?.sender_id,
    message?.senderId,
    message?.author_id,
    message?.authorId,
    message?.user_id,
    message?.userId,
  );
}

export function getMeloMessageSenderBusinessId(message: AnyRecord): string {
  const senderKind = lower(
    message?.sender_type ??
      message?.senderType ??
      message?.sender_role ??
      message?.senderRole ??
      message?.author_type ??
      message?.authorType,
  );

  const explicit = value(
    message?.sender_business_id,
    message?.senderBusinessId,
    message?.from_business_id,
    message?.fromBusinessId,
    message?.author_business_id,
    message?.authorBusinessId,
  );

  if (explicit) return explicit;

  // "business_id" describes the sender only when the row itself explicitly says
  // that the sender is a business/partner. This avoids treating the room's business
  // id as the sender for customer messages.
  if (
    senderKind === "business" ||
    senderKind === "partner" ||
    senderKind === "store"
  ) {
    return value(message?.business_id, message?.businessId);
  }

  return "";
}

export function isMeloBusinessSender(message: AnyRecord): boolean {
  const senderKind = lower(
    message?.sender_type ??
      message?.senderType ??
      message?.sender_role ??
      message?.senderRole ??
      message?.author_type ??
      message?.authorType,
  );

  return (
    senderKind === "business" ||
    senderKind === "partner" ||
    senderKind === "store" ||
    Boolean(getMeloMessageSenderBusinessId(message))
  );
}

/**
 * Important rule:
 * User mode => "mine" means the authenticated USER sent it.
 * Partner mode => "mine" means the ACTIVE BUSINESS sent it.
 *
 * A partner staff/owner auth uid is not enough on its own; customer messages must
 * never become "mine" merely because a room belongs to that business.
 */
export function isMeloMessageMine(
  message: AnyRecord,
  viewer: MeloChatViewerIdentity,
): boolean {
  const userId = value(viewer?.userId);
  const businessId = value(viewer?.businessId);
  const mode = lower(viewer?.mode);
  const senderUserId = getMeloMessageSenderUserId(message);
  const senderBusinessId = getMeloMessageSenderBusinessId(message);
  const businessSender = isMeloBusinessSender(message);

  const partnerMode =
    mode === "partner" ||
    mode === "business" ||
    mode === "store" ||
    Boolean(businessId);

  if (partnerMode) {
    if (businessId && senderBusinessId) {
      return senderBusinessId === businessId;
    }

    // Compatibility for older business-message rows that identify the sender role
    // but do not yet expose sender_business_id.
    if (businessSender && userId && senderUserId) {
      return senderUserId === userId;
    }

    return false;
  }

  // In User mode, any explicitly business-authored row belongs to the other side.
  if (businessSender) return false;

  return Boolean(userId && senderUserId && senderUserId === userId);
}

const pickDisplayName = (message: AnyRecord): string =>
  value(
    message?.contact_name,
    message?.contactName,
    message?.display_name,
    message?.displayName,
    message?.user_name,
    message?.userName,
    message?.sender_name,
    message?.senderName,
    message?.profile?.display_name,
    message?.profile?.displayName,
    message?.sender_profile?.display_name,
    message?.senderProfile?.displayName,
    message?.contact_profile?.display_name,
    message?.contactProfile?.displayName,
  );

/**
 * Web previously exposed Markdown fallback such as:
 * [**Melo member**](http://localhost:3000/users/<uuid>)
 *
 * If the same message row already contains a real profile/contact name, use it.
 * Otherwise preserve the original text; the UI never fabricates a name.
 */
export function resolveMeloContactText(text: unknown, message?: AnyRecord): string {
  const raw = String(text ?? "");
  if (!raw) return raw;

  const displayName = pickDisplayName(message ?? {});
  if (!displayName) return raw;

  return raw
    .replace(
      /\[\*\*Melo member\*\*\]\(([^)]*\/users\/[0-9a-f-]{16,})\)/gi,
      (_, url) => \`[**\${displayName}**](\${url})\`,
    )
    .replace(
      /\[Melo member\]\(([^)]*\/users\/[0-9a-f-]{16,})\)/gi,
      (_, url) => \`[\${displayName}](\${url})\`,
    );
}
`;

write(helperRel, helperSource);

function findUserExpr(source) {
  const patterns = [
    /(?:sender_id|senderId|sender_user_id|senderUserId|author_id|authorId)\s*===\s*([A-Za-z_$][\w$]*(?:\?\.)?(?:\.[A-Za-z_$][\w$]*)*)/,
    /([A-Za-z_$][\w$]*(?:\?\.)?(?:\.[A-Za-z_$][\w$]*)*)\s*===\s*(?:[A-Za-z_$][\w$]*\.)?(?:sender_id|senderId|sender_user_id|senderUserId|author_id|authorId)/,
  ];
  for (const re of patterns) {
    const m = source.match(re);
    if (m && m[1]) return m[1];
  }

  const candidates = ["currentUserId", "userId", "viewerId", "authUserId"];
  for (const c of candidates) {
    if (new RegExp("\\b" + c + "\\b").test(source)) return c;
  }

  if (/\buser\?\.id\b/.test(source)) return "user?.id";
  if (/\buser\.id\b/.test(source)) return "user.id";
  if (/\bsession\?\.user\?\.id\b/.test(source)) return "session?.user?.id";
  if (/\bsession\.user\.id\b/.test(source)) return "session.user.id";

  return "";
}

function findBusinessExpr(source) {
  const candidates = [
    "activeBusinessId",
    "selectedBusinessId",
    "currentBusinessId",
    "partnerBusinessId",
    "businessId",
  ];

  for (const c of candidates) {
    if (new RegExp("\\b" + c + "\\b").test(source)) return c;
  }

  const propPatterns = [
    /([A-Za-z_$][\w$]*(?:\?\.)?\.active_business_id)/,
    /([A-Za-z_$][\w$]*(?:\?\.)?\.activeBusinessId)/,
    /([A-Za-z_$][\w$]*(?:\?\.)?\.business_id)/,
    /([A-Za-z_$][\w$]*(?:\?\.)?\.businessId)/,
  ];

  for (const re of propPatterns) {
    const m = source.match(re);
    if (m && m[1]) return m[1];
  }

  return "";
}

function addImport(source, names) {
  if (source.includes('from "./chatIdentity"') || source.includes("from './chatIdentity'")) {
    return source;
  }

  const importLine = `import { ${names.join(", ")} } from "./chatIdentity";\n`;
  const imports = [...source.matchAll(/^import .*?;\s*$/gm)];
  if (imports.length) {
    const last = imports[imports.length - 1];
    const pos = last.index + last[0].length;
    return source.slice(0, pos) + "\n" + importLine + source.slice(pos);
  }

  return importLine + source;
}

function patchOwnership(rel) {
  let source = read(rel);
  const original = source;

  const userExpr = findUserExpr(source);
  const businessExpr = findBusinessExpr(source);

  // Only patch ownership if both identities are available in the same source.
  // This is deliberately conservative.
  if (!userExpr || !businessExpr) {
    return { rel, ownership: false, contact: false, reason: "identity expressions not safely detected" };
  }

  let ownershipCount = 0;

  // Covers the common Web normalization/render patterns:
  // row.sender_id === currentUserId
  // message.senderUserId === user.id
  // item.sender_user_id === session.user.id
  const ownershipRegex =
    /\b([A-Za-z_$][\w$]*)\.(sender_id|senderId|sender_user_id|senderUserId|author_id|authorId)\s*===\s*([A-Za-z_$][\w$]*(?:(?:\?\.|\.)[A-Za-z_$][\w$]*)*)/g;

  source = source.replace(ownershipRegex, (full, msgVar, field, rhs) => {
    // Preserve comparisons unrelated to the detected authenticated user expression.
    if (rhs !== userExpr) return full;
    ownershipCount += 1;
    return `isMeloMessageMine(${msgVar}, { userId: ${userExpr}, businessId: ${businessExpr}, mode: ${businessExpr} ? "partner" : "user" })`;
  });

  // Reverse comparison: currentUserId === row.sender_id
  const reverseRegex =
    /\b([A-Za-z_$][\w$]*(?:(?:\?\.|\.)[A-Za-z_$][\w$]*)*)\s*===\s*([A-Za-z_$][\w$]*)\.(sender_id|senderId|sender_user_id|senderUserId|author_id|authorId)\b/g;

  source = source.replace(reverseRegex, (full, lhs, msgVar) => {
    if (lhs !== userExpr) return full;
    ownershipCount += 1;
    return `isMeloMessageMine(${msgVar}, { userId: ${userExpr}, businessId: ${businessExpr}, mode: ${businessExpr} ? "partner" : "user" })`;
  });

  let contactCount = 0;

  // Normalize plain JSX rendering only. We intentionally do not rewrite markdown parser
  // configuration or links.
  const textPatterns = [
    /\{([A-Za-z_$][\w$]*)\.text\}/g,
    /\{([A-Za-z_$][\w$]*)\.content\}/g,
    /\{([A-Za-z_$][\w$]*)\.message\}/g,
  ];

  for (const re of textPatterns) {
    source = source.replace(re, (full, msgVar) => {
      // Avoid repeatedly wrapping an already patched expression.
      const needle = `resolveMeloContactText(${msgVar}.`;
      if (full.includes(needle)) return full;
      contactCount += 1;
      const field = full.includes(".content}") ? "content" : full.includes(".message}") ? "message" : "text";
      return `{resolveMeloContactText(${msgVar}.${field}, ${msgVar})}`;
    });
  }

  if (ownershipCount || contactCount) {
    const names = [];
    if (ownershipCount) names.push("isMeloMessageMine");
    if (contactCount) names.push("resolveMeloContactText");
    source = addImport(source, names);
    backup(rel);
    write(rel, source);
  }

  return {
    rel,
    ownership: ownershipCount > 0,
    ownershipCount,
    contact: contactCount > 0,
    contactCount,
    reason: ownershipCount || contactCount ? "patched" : "no safe target expression found",
  };
}

const results = existing.map(patchOwnership);
const ownershipPatched = results.some((r) => r.ownership);

console.log("");
console.log("Melo Web Chat Role Separation");
console.log("=============================");
for (const r of results) {
  console.log(
    `- ${r.rel}: ownership=${r.ownership ? r.ownershipCount : 0}, contact=${r.contact ? r.contactCount : 0} (${r.reason})`,
  );
}
console.log(`- ${helperRel}: installed`);

if (!ownershipPatched) {
  console.error("");
  console.error("SAFE STOP: The script did not find a chat ownership comparison that can be");
  console.error("patched without guessing the current source structure.");
  console.error("No existing chat file was changed for ownership; only the helper was added.");
  console.error("The .melo-before-chat-role-fix backup is created only for files actually changed.");
  process.exitCode = 3;
} else {
  console.log("");
  console.log("OK: chat sender/receiver ownership now distinguishes User identity from active Business identity.");
  console.log("Next: run npm run build (or npm run dev) and test the same conversation from both User and Partner modes.");
}
