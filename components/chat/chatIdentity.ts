/**
 * Melo Chat Web — shared message identity rules.
 * Keeps User identity and active Partner/Business identity separate.
 *
 * Build fix: 2026-08-31
 * - Keeps the previous User/Business ownership behavior.
 * - Fixes malformed RegExp escaping in resolveMeloContactText().
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

  // "business_id" describes the sender only when the row explicitly identifies
  // the sender as a business/partner/store. This prevents the conversation's
  // business_id from making customer messages look like business messages.
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
 * User mode:
 *   "mine" means the authenticated USER sent the message.
 *
 * Partner mode:
 *   "mine" means the ACTIVE BUSINESS sent the message.
 *
 * An owner/staff auth uid alone is not enough to identify a business-authored
 * message.
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

    // Compatibility for legacy business-message rows that expose the sender role
    // and user id but do not yet expose sender_business_id.
    if (businessSender && userId && senderUserId) {
      return senderUserId === userId;
    }

    return false;
  }

  // In User mode, an explicitly business-authored row is always the other side.
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

const BOLD_MELO_MEMBER_LINK =
  /\[\*\*Melo member\*\*\]\(([^)]*\/users\/[0-9a-fA-F-]{16,})\)/gi;

const MELO_MEMBER_LINK =
  /\[Melo member\]\(([^)]*\/users\/[0-9a-fA-F-]{16,})\)/gi;

/**
 * Replaces the generic "Melo member" label with the real name only when the
 * existing message/contact data already contains a usable display name.
 * The destination URL remains unchanged.
 */
export function resolveMeloContactText(
  text: unknown,
  message?: AnyRecord,
): string {
  const raw = String(text ?? "");
  if (!raw) return raw;

  const displayName = pickDisplayName(message ?? {});
  if (!displayName) return raw;

  return raw
    .replace(
      BOLD_MELO_MEMBER_LINK,
      (_match, url: string) => `[**${displayName}**](${url})`,
    )
    .replace(
      MELO_MEMBER_LINK,
      (_match, url: string) => `[${displayName}](${url})`,
    );
}
