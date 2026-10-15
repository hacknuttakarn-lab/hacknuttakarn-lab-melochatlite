"use client";

export function VerifiedBadge({
  size = 16,
  label = "Verified",
}: {
  size?: number;
  label?: string;
}) {
  return (
    <span
      title={label}
      aria-label={label}
      style={{
        display: "inline-flex",
        flex: "0 0 auto",
        width: size,
        height: size,
        marginLeft: 5,
        verticalAlign: "-0.18em",
      }}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="12" cy="12" r="10" fill="#2f9df4" />
        <path d="M7.25 12.2 10.45 15.4 16.95 8.9" fill="none" stroke="#fff" strokeWidth="2.35" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
