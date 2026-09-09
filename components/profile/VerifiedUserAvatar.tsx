"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { countryFlagEmoji } from "@/lib/countryFlag";
import { publicStorageUrl } from "@/lib/supabase/browser";
import { getPublicUserIdentity } from "./userIdentityWeb";
import styles from "./VerifiedUserAvatar.module.css";

type Props = {
  userId?: string | null;
  name: string;
  src?: string | null;
  country?: string | null;
  nationality?: string | null;
  verified?: boolean;
  size?: number;
  badgeSize?: number;
  className?: string;
  shape?: "circle" | "rounded" | "square";
  alt?: string;
  objectPosition?: string;
  showCountryFlag?: boolean;
  showVerified?: boolean;
};


function photoSource(value: string | null | undefined) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (/^(?:https?:|blob:|data:)/i.test(raw)) return raw;
  const normalized = raw.replace(/^\/+/, "");
  return normalized.startsWith("profile-photos/")
    ? publicStorageUrl("profile-photos", normalized.slice("profile-photos/".length))
    : publicStorageUrl("profile-photos", normalized);
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "M";
}

export default function VerifiedUserAvatar({
  userId,
  name,
  src = "",
  country,
  nationality,
  verified,
  size,
  badgeSize,
  className = "",
  shape = "circle",
  alt = "",
  objectPosition,
  showCountryFlag = true,
  showVerified = true,
}: Props) {
  const [resolved, setResolved] = useState({
    verified: Boolean(verified),
    country: country?.trim() || null,
    nationality: nationality?.trim() || null,
    photoUrl: photoSource(src),
  });

  useEffect(() => {
    let active = true;
    const id = String(userId ?? "").trim();
    setResolved({
      verified: verified === undefined ? false : Boolean(verified),
      country: country?.trim() || null,
      nationality: nationality?.trim() || null,
      photoUrl: photoSource(src),
    });

    if (!id) return () => { active = false; };
    void getPublicUserIdentity(id).then((meta) => {
      if (!active) return;
      setResolved({
        verified: Boolean(verified) || meta.verified,
        country: country?.trim() || meta.country,
        nationality: nationality?.trim() || meta.nationality,
        photoUrl: photoSource(src) || meta.photoUrl,
      });
    });
    return () => { active = false; };
  }, [country, nationality, src, userId, verified]);

  const flag = showCountryFlag
    ? countryFlagEmoji(resolved.nationality) || countryFlagEmoji(resolved.country)
    : "";
  const effectiveBadge = badgeSize ?? (size ? Math.max(16, Math.round(size * 0.34)) : 18);
  const rootClass = [
    styles.root,
    shape === "rounded" ? styles.rounded : shape === "square" ? styles.square : "",
    className,
  ].filter(Boolean).join(" ");
  const rootStyle = useMemo(() => ({
    ...(size ? { width: size, height: size } : {}),
    "--melo-avatar-badge": `${effectiveBadge}px`,
    "--melo-avatar-ring": `${size && size >= 64 ? 3 : 2.5}px`,
  } as CSSProperties), [effectiveBadge, size]);

  return (
    <span className={rootClass} style={rootStyle} data-verified={showVerified && resolved.verified ? "true" : "false"}>
      <span className={styles.frame}>
        <span className={styles.media}>
          {resolved.photoUrl ? (
            <img src={resolved.photoUrl} alt={alt} style={objectPosition ? { objectPosition } : undefined} />
          ) : (
            <span className={styles.fallback}>{initials(name)}</span>
          )}
        </span>
      </span>
      {flag ? <span className={styles.flag} aria-label={resolved.nationality || resolved.country || undefined}>{flag}</span> : null}
      {showVerified && resolved.verified ? <span className={styles.check} title="Verified" aria-label="Verified">✓</span> : null}
    </span>
  );
}
