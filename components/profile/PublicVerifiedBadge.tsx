"use client";

import { useEffect, useState } from "react";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { loadPublicVerifiedUserIds } from "@/lib/publicVerification";

export default function PublicVerifiedBadge({
  userId,
  size = 16,
  label = "Verified",
}: {
  userId?: string | null;
  size?: number;
  label?: string;
}) {
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    let active = true;
    const id = String(userId ?? "").trim();
    if (!id) {
      setVerified(false);
      return () => { active = false; };
    }
    void loadPublicVerifiedUserIds([id]).then((ids) => {
      if (active) setVerified(ids.has(id));
    });
    return () => { active = false; };
  }, [userId]);

  return verified ? <VerifiedBadge size={size} label={label} /> : null;
}
