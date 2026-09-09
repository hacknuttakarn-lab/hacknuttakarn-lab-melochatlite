"use client";

import { publicStorageUrl, restSelect, rpcRequest } from "@/lib/supabase/browser";

type Row = Record<string, any>;

export type PublicUserIdentityMeta = {
  country: string | null;
  nationality: string | null;
  photoUrl: string;
  verified: boolean;
};

type ProfileMeta = Omit<PublicUserIdentityMeta, "verified">;

const profileCache = new Map<string, ProfileMeta>();
const verificationCache = new Map<string, boolean>();
const verificationPending = new Map<string, Promise<boolean>>();
const profileResolvers = new Map<string, Array<(value: ProfileMeta) => void>>();
const queuedProfileIds = new Set<string>();
let profileFlushTimer: ReturnType<typeof setTimeout> | null = null;

function text(row: Row | null | undefined, ...keys: string[]) {
  if (!row) return "";
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function truthy(value: unknown) {
  return value === true || value === "true" || value === 1 || value === "1";
}

function emptyProfile(): ProfileMeta {
  return { country: null, nationality: null, photoUrl: "" };
}

function profilePhoto(row: Row | null | undefined) {
  if (!row) return "";
  const direct = text(row, "photo_url", "avatar_url", "profile_image_url");
  if (/^https?:\/\//i.test(direct)) return direct;
  const paths = Array.isArray(row.photo_paths) ? row.photo_paths.map(String).filter(Boolean) : [];
  const raw = direct || paths[0] || text(row, "photo_path", "profile_image_path");
  if (!raw) return "";
  const normalized = raw.replace(/^\/+/, "");
  return normalized.startsWith("profile-photos/")
    ? publicStorageUrl("profile-photos", normalized.slice("profile-photos/".length))
    : publicStorageUrl("profile-photos", normalized);
}

function normalizeProfile(row: Row | null | undefined): ProfileMeta {
  if (!row) return emptyProfile();
  return {
    country: text(row, "country") || null,
    nationality: text(row, "nationality") || null,
    photoUrl: profilePhoto(row),
  };
}

async function flushProfileQueue() {
  profileFlushTimer = null;
  const ids = [...queuedProfileIds];
  queuedProfileIds.clear();
  if (!ids.length) return;

  const resultMap = new Map<string, ProfileMeta>();
  try {
    const query = `select=*&or=(${ids.map((id) => `id.eq.${encodeURIComponent(id)}`).join(",")})`;
    const result = await restSelect<Row[]>("profiles", query);
    if (!result.error) {
      for (const row of Array.isArray(result.data) ? result.data : []) {
        const id = text(row, "id");
        if (!id) continue;
        const meta = normalizeProfile(row);
        resultMap.set(id, meta);
        profileCache.set(id, meta);
      }
    }
  } catch {}

  for (const id of ids) {
    const meta = resultMap.get(id) ?? emptyProfile();
    if (!profileCache.has(id)) profileCache.set(id, meta);
    const resolvers = profileResolvers.get(id) ?? [];
    profileResolvers.delete(id);
    resolvers.forEach((resolve) => resolve(meta));
  }
}

export function getPublicProfileMeta(userId: string): Promise<ProfileMeta> {
  const id = String(userId ?? "").trim();
  if (!id) return Promise.resolve(emptyProfile());
  const cached = profileCache.get(id);
  if (cached) return Promise.resolve(cached);

  return new Promise((resolve) => {
    const resolvers = profileResolvers.get(id) ?? [];
    resolvers.push(resolve);
    profileResolvers.set(id, resolvers);
    queuedProfileIds.add(id);
    if (!profileFlushTimer) profileFlushTimer = setTimeout(() => { void flushProfileQueue(); }, 12);
  });
}

export async function getPublicUserVerified(userId: string) {
  const id = String(userId ?? "").trim();
  if (!id) return false;
  const cached = verificationCache.get(id);
  if (cached !== undefined) return cached;
  const pending = verificationPending.get(id);
  if (pending) return pending;

  const request = (async () => {
    try {
      const result = await rpcRequest<Row | Row[]>("get_reputation_summary", { p_user_id: id });
      if (result.error) return false;
      const row = Array.isArray(result.data) ? result.data[0] : result.data;
      const verified = truthy(row?.is_verified);
      verificationCache.set(id, verified);
      return verified;
    } catch {
      return false;
    } finally {
      verificationPending.delete(id);
    }
  })();

  verificationPending.set(id, request);
  return request;
}

export async function getPublicUserIdentity(userId: string): Promise<PublicUserIdentityMeta> {
  const [profile, verified] = await Promise.all([
    getPublicProfileMeta(userId),
    getPublicUserVerified(userId),
  ]);
  return { ...profile, verified };
}

export function primePublicUserIdentity(
  userId: string,
  meta: Partial<PublicUserIdentityMeta>,
) {
  const id = String(userId ?? "").trim();
  if (!id) return;
  const existing = profileCache.get(id) ?? emptyProfile();
  profileCache.set(id, {
    country: meta.country !== undefined ? meta.country : existing.country,
    nationality: meta.nationality !== undefined ? meta.nationality : existing.nationality,
    photoUrl: meta.photoUrl !== undefined ? meta.photoUrl : existing.photoUrl,
  });
  if (meta.verified !== undefined) verificationCache.set(id, Boolean(meta.verified));
}
