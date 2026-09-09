"use client";

import {
  getCurrentUser,
  getStoredSession,
  isSupabaseConfigured,
  publicStorageUrl,
  restSelect,
  rpcRequest,
} from "@/lib/supabase/browser";

export type ProfileRow = Record<string, any>;
export type VerificationRow = Record<string, any>;
export type ReputationRow = Record<string, any>;
export type ReviewRow = Record<string, any>;

export type MediaPosition = { x: number; y: number };

export type DisplayNameChangeStatus = {
  displayName: string;
  changedAt: string | null;
  canChange: boolean;
  nextAllowedAt: string | null;
};

export type OwnProfileSnapshot = {
  userId: string;
  profile: ProfileRow;
  userMetadata: Record<string, unknown>;
  verification: VerificationRow | null;
  reputation: ReputationRow | null;
  reviews: ReviewRow[];
};

const COVER_PATH_KEY = "melo_profile_cover_path";
const COVER_POSITION_KEY = "melo_web_profile_cover_position";
const AVATAR_POSITION_KEY = "melo_web_profile_avatar_position";
const PROFILE_BUCKET = "profile-photos";

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";

export function arrayOf(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item : item?.name ?? item?.label ?? ""))
      .map((item) => String(item).trim())
      .filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    const clean = value.trim();
    if (clean.startsWith("[") && clean.endsWith("]")) {
      try {
        const parsed = JSON.parse(clean);
        if (Array.isArray(parsed)) return parsed.map(String).map((item) => item.trim()).filter(Boolean);
      } catch {}
    }
    return clean.split(",").map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

export function firstValue(record: ProfileRow | null | undefined, keys: string[]) {
  if (!record) return null;
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") return value;
  }
  return null;
}

export function ageFrom(value: unknown): number | null {
  if (!value) return null;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - date.getFullYear();
  const beforeBirthday =
    now.getMonth() < date.getMonth() ||
    (now.getMonth() === date.getMonth() && now.getDate() < date.getDate());
  if (beforeBirthday) age -= 1;
  return age >= 0 && age < 120 ? age : null;
}

export function formatBirthDate(value: unknown, locale = "en-US") {
  if (!value) return "";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

export function profilePhotoUrl(profile: ProfileRow | null | undefined, index = 0) {
  const paths = arrayOf(firstValue(profile, ["photo_paths", "photos"]));
  const direct = index === 0 ? firstValue(profile, ["avatar_url", "photo_url", "profile_image"]) : null;
  const candidate = String(direct || paths[index] || "");
  return publicStorageUrl(PROFILE_BUCKET, candidate);
}

export function profileCoverUrl(
  profile: ProfileRow | null | undefined,
  userMetadata?: Record<string, unknown> | null,
) {
  const metadataPath = typeof userMetadata?.[COVER_PATH_KEY] === "string"
    ? String(userMetadata[COVER_PATH_KEY]).trim()
    : "";
  if (metadataPath) return publicStorageUrl(PROFILE_BUCKET, metadataPath);

  const direct = String(
    firstValue(profile, ["cover_url", "cover_image_url", "profile_cover_url", "cover_path"]) || "",
  );
  if (direct) return publicStorageUrl(PROFILE_BUCKET, direct);
  return profilePhotoUrl(profile, 1) || profilePhotoUrl(profile, 0);
}

function clampPercent(value: unknown, fallback = 50) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : fallback;
}

function positionFromUnknown(value: unknown): MediaPosition {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const row = value as Record<string, unknown>;
    return { x: clampPercent(row.x), y: clampPercent(row.y) };
  }
  if (typeof value === "string" && value.trim()) {
    try {
      return positionFromUnknown(JSON.parse(value));
    } catch {}
  }
  return { x: 50, y: 50 };
}

export function profileMediaPosition(
  userMetadata: Record<string, unknown> | null | undefined,
  kind: "cover" | "avatar",
): MediaPosition {
  return positionFromUnknown(userMetadata?.[kind === "cover" ? COVER_POSITION_KEY : AVATAR_POSITION_KEY]);
}

export async function loadOwnProfile(): Promise<{
  data: OwnProfileSnapshot | null;
  error: string | null;
}> {
  if (!isSupabaseConfigured()) return { data: null, error: "Supabase is not configured." };

  const user = await getCurrentUser();
  if (!user) return { data: null, error: "AUTH_REQUIRED" };

  const [profileResult, verificationResult, reputationResult, reviewsResult] = await Promise.all([
    restSelect<ProfileRow[]>("profiles", `select=*&id=eq.${encodeURIComponent(user.id)}&limit=1`),
    rpcRequest<VerificationRow[] | VerificationRow>("get_my_verification", {}),
    rpcRequest<ReputationRow[] | ReputationRow>("get_reputation_summary", { p_user_id: user.id }),
    rpcRequest<ReviewRow[]>("get_reputation_reviews", { p_user_id: user.id }),
  ]);

  const profileRows = Array.isArray(profileResult.data) ? profileResult.data : [];
  const verificationRaw = verificationResult.data;
  const reputationRaw = reputationResult.data;

  const firstError = profileResult.error || verificationResult.error || reputationResult.error || reviewsResult.error || null;

  return {
    data: {
      userId: user.id,
      profile: profileRows[0] || {},
      userMetadata: (user.user_metadata || {}) as Record<string, unknown>,
      verification: Array.isArray(verificationRaw) ? verificationRaw[0] || null : verificationRaw || null,
      reputation: Array.isArray(reputationRaw) ? reputationRaw[0] || null : reputationRaw || null,
      reviews: Array.isArray(reviewsResult.data) ? reviewsResult.data : [],
    },
    error: firstError,
  };
}

function restHeaders(accessToken: string, contentType = "application/json") {
  return {
    apikey: supabaseKey,
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": contentType,
    Prefer: "return=representation",
  };
}

async function readResponseError(response: Response) {
  try {
    const payload = await response.json();
    return payload?.message || payload?.details || payload?.hint || payload?.error_description || payload?.error || `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
}

export async function updateOwnProfile(
  userId: string,
  payload: Record<string, unknown>,
): Promise<{ data: ProfileRow | null; error: string | null }> {
  if (!isSupabaseConfigured()) return { data: null, error: "Supabase is not configured." };
  const session = getStoredSession();
  if (!session?.access_token) return { data: null, error: "AUTH_REQUIRED" };

  const response = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`, {
    method: "PATCH",
    headers: restHeaders(session.access_token),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const raw = await readResponseError(response);
    return {
      data: null,
      error: raw.includes("DISPLAY_NAME_CHANGE_COOLDOWN")
        ? "DISPLAY_NAME_CHANGE_COOLDOWN"
        : raw,
    };
  }

  const rows = (await response.json()) as ProfileRow[];
  return { data: rows?.[0] || null, error: null };
}

export async function loadDisplayNameChangeStatus(): Promise<DisplayNameChangeStatus | null> {
  const result = await rpcRequest<Record<string, any>[] | Record<string, any>>(
    "get_my_display_name_change_status",
    {},
  );
  if (result.error || !result.data) return null;
  const row = Array.isArray(result.data) ? result.data[0] || {} : result.data;
  return {
    displayName: String(row.display_name || ""),
    changedAt: row.changed_at || null,
    canChange: row.can_change !== false,
    nextAllowedAt: row.next_allowed_at || null,
  };
}

async function updateUserMetadata(patch: Record<string, unknown>) {
  const session = getStoredSession();
  if (!session?.access_token) throw new Error("AUTH_REQUIRED");
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    method: "PUT",
    headers: restHeaders(session.access_token),
    body: JSON.stringify({ data: patch }),
  });
  if (!response.ok) throw new Error(await readResponseError(response));
  await getCurrentUser();
}

export async function updateProfileMediaPositions(input: {
  cover: MediaPosition;
  avatar: MediaPosition;
}) {
  await updateUserMetadata({
    [COVER_POSITION_KEY]: { x: clampPercent(input.cover.x), y: clampPercent(input.cover.y) },
    [AVATAR_POSITION_KEY]: { x: clampPercent(input.avatar.x), y: clampPercent(input.avatar.y) },
  });
}

function extensionFromFile(file: File) {
  const byName = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "";
  if (byName && byName.length <= 5) return byName;
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

async function uploadProfileFile(path: string, file: File) {
  const session = getStoredSession();
  if (!session?.access_token) throw new Error("AUTH_REQUIRED");
  if (!file.type.startsWith("image/")) throw new Error("IMAGE_REQUIRED");
  if (file.size > 12 * 1024 * 1024) throw new Error("IMAGE_TOO_LARGE");

  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  const response = await fetch(`${supabaseUrl}/storage/v1/object/${PROFILE_BUCKET}/${encodedPath}`, {
    method: "POST",
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": file.type || "application/octet-stream",
      "x-upsert": "false",
      "cache-control": "3600",
    },
    body: file,
  });
  if (!response.ok) throw new Error(await readResponseError(response));
  return path;
}

export async function uploadProfileCoverWeb(file: File) {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("AUTH_REQUIRED");
  const suffix = Math.random().toString(36).slice(2, 10);
  const path = `${user.id}/cover/${Date.now()}-${suffix}.${extensionFromFile(file)}`;
  await uploadProfileFile(path, file);
  await updateUserMetadata({ [COVER_PATH_KEY]: path });
  return { path, url: publicStorageUrl(PROFILE_BUCKET, path) };
}

export async function uploadProfilePhotoWeb(input: {
  file: File;
  slotIndex: number;
  currentPaths: string[];
}) {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("AUTH_REQUIRED");
  const slotIndex = Math.max(0, Math.min(5, Math.round(input.slotIndex)));
  const suffix = Math.random().toString(36).slice(2, 10);
  const path = `${user.id}/${Date.now()}-${slotIndex}-${suffix}.${extensionFromFile(input.file)}`;
  await uploadProfileFile(path, input.file);

  const next = input.currentPaths.filter(Boolean).slice(0, 6);
  if (slotIndex < next.length) next[slotIndex] = path;
  else next.push(path);

  const result = await updateOwnProfile(user.id, { photo_paths: next });
  if (result.error) throw new Error(result.error);
  return { paths: next, path, url: publicStorageUrl(PROFILE_BUCKET, path) };
}

export async function removeProfilePhotoWeb(input: {
  slotIndex: number;
  currentPaths: string[];
}) {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("AUTH_REQUIRED");
  const next = input.currentPaths.filter(Boolean).slice(0, 6);
  next.splice(Math.max(0, Math.min(next.length - 1, input.slotIndex)), 1);
  const result = await updateOwnProfile(user.id, { photo_paths: next });
  if (result.error) throw new Error(result.error);
  return next;
}
