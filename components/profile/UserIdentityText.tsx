"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "@/components/SiteProviders";
import { countryFlagEmoji } from "@/lib/countryFlag";
import { getPublicUserIdentity } from "./userIdentityWeb";
import styles from "./UserIdentityText.module.css";

type Props = {
  userId?: string | null;
  country?: string | null;
  nationality?: string | null;
  verified?: boolean;
  className?: string;
};

const VERIFIED_LABEL: Record<string, string> = {
  th: "ยืนยันแล้ว",
  en: "Verified",
  de: "Verifiziert",
  zh: "已认证",
  ja: "認証済み",
  ko: "인증됨",
};

export default function UserIdentityText({
  userId,
  country,
  nationality,
  verified,
  className = "",
}: Props) {
  const { locale } = useLocale();
  const [resolved, setResolved] = useState({
    verified: Boolean(verified),
    country: country?.trim() || null,
    nationality: nationality?.trim() || null,
  });

  useEffect(() => {
    let active = true;
    setResolved({
      verified: Boolean(verified),
      country: country?.trim() || null,
      nationality: nationality?.trim() || null,
    });

    const id = String(userId ?? "").trim();
    if (!id) return () => { active = false; };

    void getPublicUserIdentity(id).then((meta) => {
      if (!active) return;
      setResolved({
        verified: Boolean(verified) || meta.verified,
        country: country?.trim() || meta.country,
        nationality: nationality?.trim() || meta.nationality,
      });
    });

    return () => { active = false; };
  }, [country, nationality, userId, verified]);

  const nation = resolved.nationality || resolved.country || "";
  const flag = useMemo(
    () => countryFlagEmoji(resolved.nationality) || countryFlagEmoji(resolved.country),
    [resolved.country, resolved.nationality],
  );

  if (!resolved.verified && !nation && !flag) return null;

  return (
    <span className={`${styles.root} ${className}`.trim()}>
      {resolved.verified ? <span className={styles.verified}>✓ {VERIFIED_LABEL[locale] ?? VERIFIED_LABEL.en}</span> : null}
      {resolved.verified && (nation || flag) ? <span className={styles.separator}>·</span> : null}
      {flag || nation ? <span className={styles.nationality}>{flag ? <b>{flag}</b> : null}{nation ? <span>{nation}</span> : null}</span> : null}
    </span>
  );
}
