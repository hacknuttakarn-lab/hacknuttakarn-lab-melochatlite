"use client";

import { rpcRequest } from "@/lib/supabase/browser";

export async function loadPublicVerifiedUserIds(userIds: string[]): Promise<Set<string>> {
  const uniqueIds = Array.from(
    new Set(userIds.map((id) => String(id || "").trim()).filter(Boolean)),
  ).slice(0, 100);

  if (!uniqueIds.length) return new Set<string>();

  const rows = await Promise.all(
    uniqueIds.map(async (userId) => {
      try {
        const result = await rpcRequest<boolean>("get_public_identity_verification", {
          p_user_id: userId,
        });
        return !result.error && result.data === true ? userId : "";
      } catch {
        return "";
      }
    }),
  );

  return new Set(rows.filter(Boolean));
}
