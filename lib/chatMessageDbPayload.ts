/**
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
