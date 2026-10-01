"use client";

import {
  getCurrentUser,
  getStoredSession,
  refreshStoredSession,
  publicStorageUrl,
  restSelect,
  rpcRequest,
} from "@/lib/supabase/browser";
import type { CountryScope } from "@/lib/discoveryCountry";
import { GLOBAL_COUNTRY_SCOPE, matchesCountryScope } from "@/lib/discoveryCountry";
import { loadFriendSnapshot } from "@/components/connect/connectData";

type Row = Record<string, any>;

export type SocialActivityType = "trip" | "event" | "community";
export type SocialPostVisibility =
  | "public"
  | "friends"
  | "trip_members"
  | "event_participants"
  | "community_members"
  | "only_me";

export type SocialFeedPost = {
  id: string;
  authorId: string;
  authorName: string;
  authorAge: number | null;
  authorPhotoUrl: string;
  authorCountry: string;
  authorCity: string;
  title: string;
  body: string;
  visibility: SocialPostVisibility;
  locationName: string;
  latitude: number | null;
  longitude: number | null;
  activityType: SocialActivityType | null;
  activityId: string;
  activityTitle: string;
  activitySubtitle: string;
  activityImageUrl: string;
  activityImagePath: string;
  images: Array<{ path: string; url: string }>;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  isLiked: boolean;
  isSaved: boolean;
  canManage: boolean;
  createdAt: string;
  updatedAt: string;
  boostedAt: string;
};

export type SocialPostComment = {
  id: string;
  postId: string;
  parentCommentId: string;
  authorId: string;
  authorName: string;
  authorPhotoUrl: string;
  body: string;
  canDelete: boolean;
  createdAt: string;
};

export type FeedViewer = {
  id: string;
  name: string;
  avatarUrl: string;
  city: string;
  country: string;
};

const SOCIAL_POSTS_BUCKET = "social-posts";
export const MAX_SOCIAL_POST_IMAGES = 4;
export const MAX_SOCIAL_POST_TITLE_LENGTH = 120;
export const MAX_SOCIAL_POST_IMAGE_BYTES = 12 * 1024 * 1024;

export type SocialPostLocationInput = {
  name: string;
  latitude: number | null;
  longitude: number | null;
};

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";

function first(row: Row | null | undefined, keys: string[]) {
  if (!row) return null;
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") return value;
  }
  return null;
}

function str(row: Row | null | undefined, keys: string[], fallback = "") {
  const value = first(row, keys);
  return value === null ? fallback : String(value).trim();
}

function num(value: unknown, fallback = 0) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function bool(value: unknown) {
  return value === true || value === "true" || value === 1 || value === "1";
}

function arr(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(String).map((item) => item.trim()).filter(Boolean);
    } catch {}
  }
  return [];
}

function encodePath(path: string) {
  return path
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function normalizeStoragePath(value: string) {
  const raw = value.trim();
  if (!raw) return "";
  const markerVariants = [
    `/storage/v1/object/public/${SOCIAL_POSTS_BUCKET}/`,
    `/storage/v1/object/sign/${SOCIAL_POSTS_BUCKET}/`,
    `/storage/v1/object/authenticated/${SOCIAL_POSTS_BUCKET}/`,
  ];
  for (const marker of markerVariants) {
    const at = raw.indexOf(marker);
    if (at >= 0) {
      const encoded = raw.slice(at + marker.length).split("?")[0];
      return encoded
        .split("/")
        .filter(Boolean)
        .map((segment) => {
          try { return decodeURIComponent(segment); } catch { return segment; }
        })
        .join("/");
    }
  }
  if (/^(https?:|data:|blob:)/i.test(raw)) return raw;
  return raw.startsWith(`${SOCIAL_POSTS_BUCKET}/`)
    ? raw.slice(SOCIAL_POSTS_BUCKET.length + 1)
    : raw.replace(/^\/+/, "");
}

function signedStorageUrl(rawUrl: string) {
  if (!rawUrl) return "";
  return /^https?:\/\//i.test(rawUrl)
    ? rawUrl
    : `${supabaseUrl}/storage/v1${rawUrl.startsWith("/") ? "" : "/"}${rawUrl}`;
}

async function signSocialImages(values: string[]): Promise<Map<string, { path: string; url: string }>> {
  const result = new Map<string, { path: string; url: string }>();
  const normalizedValues = [...new Set(values.map(normalizeStoragePath).filter(Boolean))];

  const privatePaths: string[] = [];
  for (const normalized of normalizedValues) {
    if (/^(https?:|data:|blob:)/i.test(normalized)) {
      result.set(normalized, { path: normalized, url: normalized });
    } else {
      privatePaths.push(normalized);
    }
  }

  if (!privatePaths.length) return result;

  const refreshed = await refreshStoredSession().catch(() => null);
  const accessToken = refreshed?.access_token || getStoredSession()?.access_token || "";
  if (!supabaseUrl || !publishableKey || !accessToken) {
    for (const path of privatePaths) result.set(path, { path, url: "" });
    return result;
  }

  const commonHeaders = {
    apikey: publishableKey,
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  // Supabase Storage supports signing multiple object paths in one request.
  // Use that first so a feed with many images does not create one network
  // round-trip per photo. Any path not returned by the batch endpoint falls
  // back to the existing single-object request for compatibility.
  const batchResponse = await fetch(
    `${supabaseUrl}/storage/v1/object/sign/${encodeURIComponent(SOCIAL_POSTS_BUCKET)}`,
    {
      method: "POST",
      headers: commonHeaders,
      body: JSON.stringify({
        expiresIn: 60 * 60 * 24 * 7,
        paths: privatePaths,
      }),
    },
  ).catch(() => null);

  if (batchResponse?.ok) {
    const payload = await batchResponse.json().catch(() => []);
    const rows = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.data)
        ? payload.data
        : [];

    rows.forEach((item: any, index: number) => {
      const path = normalizeStoragePath(String(item?.path || privatePaths[index] || ""));
      const rawUrl = String(item?.signedURL || item?.signedUrl || item?.signed_url || "");
      if (path && rawUrl) result.set(path, { path, url: signedStorageUrl(rawUrl) });
    });
  }

  const missing = privatePaths.filter((path) => !result.get(path)?.url);
  if (missing.length) {
    await Promise.all(
      missing.map(async (path) => {
        const response = await fetch(
          `${supabaseUrl}/storage/v1/object/sign/${encodeURIComponent(SOCIAL_POSTS_BUCKET)}/${encodePath(path)}`,
          {
            method: "POST",
            headers: commonHeaders,
            body: JSON.stringify({ expiresIn: 60 * 60 * 24 * 7 }),
          },
        ).catch(() => null);

        if (!response?.ok) {
          result.set(path, { path, url: "" });
          return;
        }

        const payload = await response.json().catch(() => ({}));
        const rawUrl = String(payload?.signedURL || payload?.signedUrl || payload?.signed_url || "");
        result.set(path, { path, url: signedStorageUrl(rawUrl) });
      }),
    );
  }

  return result;
}

function cleanFileExtension(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "";
  if (fromName && fromName.length <= 8) return fromName;
  const mime = file.type.toLowerCase();
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("heic")) return "heic";
  if (mime.includes("heif")) return "heif";
  return "jpg";
}

async function storageError(response: Response) {
  try {
    const payload = await response.json();
    return String(payload?.message || payload?.error || payload?.statusCode || `HTTP ${response.status}`);
  } catch {
    return `HTTP ${response.status}`;
  }
}

async function currentStorageAuth() {
  const user = await getCurrentUser();
  const session = (await refreshStoredSession().catch(() => null)) ?? getStoredSession();
  if (!user?.id || !session?.access_token) throw new Error("Authentication required.");
  if (!supabaseUrl || !publishableKey) throw new Error("Supabase is not configured.");
  return { userId: user.id, accessToken: session.access_token };
}

export async function uploadSocialPostImagesWeb(postId: string, files: File[]) {
  const selected = files.slice(0, MAX_SOCIAL_POST_IMAGES);
  if (!selected.length) return [] as string[];

  for (const file of selected) {
    if (!file.type.toLowerCase().startsWith("image/")) throw new Error("Only image files are supported.");
    if (file.size > MAX_SOCIAL_POST_IMAGE_BYTES) throw new Error("Each image must be 12 MB or smaller.");
  }

  const { userId, accessToken } = await currentStorageAuth();
  const uploaded: string[] = [];

  try {
    for (const [index, file] of selected.entries()) {
      const extension = cleanFileExtension(file);
      const nonce = typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const path = `${userId}/posts/${postId}/${Date.now()}-${index}-${nonce}.${extension}`;
      const response = await fetch(
        `${supabaseUrl}/storage/v1/object/${encodeURIComponent(SOCIAL_POSTS_BUCKET)}/${encodePath(path)}`,
        {
          method: "POST",
          headers: {
            apikey: publishableKey,
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": file.type || "application/octet-stream",
            "cache-control": "3600",
            "x-upsert": "false",
          },
          body: file,
        },
      );
      if (!response.ok) throw new Error(await storageError(response));
      uploaded.push(path);
    }
    return uploaded;
  } catch (error) {
    await deleteSocialPostImagesWeb(uploaded).catch(() => undefined);
    throw error;
  }
}

export async function deleteSocialPostImagesWeb(paths: string[]) {
  const normalized = [...new Set(paths.map(normalizeStoragePath).filter((path) => path && !/^(https?:|data:|blob:)/i.test(path)))];
  if (!normalized.length) return;
  const { accessToken } = await currentStorageAuth();
  await Promise.all(normalized.map(async (path) => {
    const response = await fetch(
      `${supabaseUrl}/storage/v1/object/${encodeURIComponent(SOCIAL_POSTS_BUCKET)}/${encodePath(path)}`,
      {
        method: "DELETE",
        headers: { apikey: publishableKey, Authorization: `Bearer ${accessToken}` },
      },
    );
    if (!response.ok && response.status !== 404) throw new Error(await storageError(response));
  }));
}

function profilePhoto(path: string) {
  return path ? publicStorageUrl("profile-photos", path) : "";
}

function activityImage(path: string) {
  return path ? publicStorageUrl("activity-images", path) : "";
}

async function titleMap(postIds: string[]) {
  const ids = [...new Set(postIds.filter(Boolean))];
  const map = new Map<string, string>();
  if (!ids.length) return map;

  const result = await rpcRequest<Row[]>("get_social_post_titles", { p_post_ids: ids });
  if (result.error || !Array.isArray(result.data)) return map;

  for (const row of result.data) {
    const id = str(row, ["post_id"]);
    if (id) map.set(id, str(row, ["title"]));
  }
  return map;
}

async function profileMap(authorIds: string[]) {
  const ids = [...new Set(authorIds.filter(Boolean))].slice(0, 100);
  const map = new Map<string, Row>();
  if (!ids.length) return map;

  const result = await restSelect<Row[]>(
    "profiles",
    `select=id,first_name,last_name,display_name,date_of_birth,photo_paths,city,province,country,nationality,primary_language&id=in.(${ids.map(encodeURIComponent).join(",")})`,
  );
  if (result.error || !Array.isArray(result.data)) return map;

  for (const row of result.data) map.set(String(row.id), row);
  return map;
}

function mapPost(
  row: Row,
  profiles: Map<string, Row>,
  titles: Map<string, string>,
  signedImages: Map<string, { path: string; url: string }>,
) {
  const id = str(row, ["id"]);
  const authorId = str(row, ["author_id", "user_id", "profile_id"]);
  const profile = profiles.get(authorId);
  const photoPaths = arr(profile?.photo_paths);
  const authorPhotoPath = str(row, ["author_photo_path"]) || photoPaths[0] || "";
  const imagePaths = arr(row.image_paths).slice(0, MAX_SOCIAL_POST_IMAGES);
  const signed = imagePaths
    .map((value) => signedImages.get(normalizeStoragePath(value)) ?? { path: normalizeStoragePath(value), url: "" })
    .filter((image) => image.url);

  const rawType = str(row, ["activity_type"]);
  const activityType: SocialActivityType | null =
    rawType === "trip" || rawType === "event" || rawType === "community"
      ? rawType
      : null;

  return {
    id,
    authorId,
    authorName:
      str(row, ["author_name"]) ||
      str(profile, ["first_name", "display_name", "full_name", "name", "username"]) ||
      "Melo member",
    authorAge: (() => {
      const raw = str(profile, ["date_of_birth", "birth_date", "birthday"]);
      if (!raw) return null;
      const birth = new Date(`${raw.slice(0, 10)}T00:00:00`);
      if (Number.isNaN(birth.getTime())) return null;
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const beforeBirthday =
        today.getMonth() < birth.getMonth() ||
        (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate());
      if (beforeBirthday) age -= 1;
      return age >= 0 && age <= 120 ? age : null;
    })(),
    authorPhotoUrl: profilePhoto(authorPhotoPath),
    authorCountry: str(profile, ["country", "nationality"]),
    authorCity: str(profile, ["city", "province"]),
    title: titles.get(id) ?? str(row, ["title"]),
    body: str(row, ["body", "content", "text"]),
    visibility: (str(row, ["visibility"], "public") || "public") as SocialPostVisibility,
    locationName: str(row, ["location_name"]),
    latitude: first(row, ["latitude"]) == null ? null : num(first(row, ["latitude"]), Number.NaN),
    longitude: first(row, ["longitude"]) == null ? null : num(first(row, ["longitude"]), Number.NaN),
    activityType,
    activityId: str(row, ["activity_id"]),
    activityTitle: str(row, ["activity_title"]),
    activitySubtitle: str(row, ["activity_subtitle"]),
    activityImageUrl: activityImage(str(row, ["activity_image_path"])),
    activityImagePath: str(row, ["activity_image_path"]),
    images: signed,
    likeCount: Math.max(0, num(first(row, ["like_count"]))),
    commentCount: Math.max(0, num(first(row, ["comment_count"]))),
    shareCount: Math.max(0, num(first(row, ["share_count"]))),
    isLiked: bool(first(row, ["is_liked"])),
    isSaved: bool(first(row, ["is_saved"])),
    canManage: bool(first(row, ["can_manage"])),
    createdAt: str(row, ["created_at"], new Date().toISOString()),
    updatedAt: str(row, ["updated_at"], new Date().toISOString()),
    boostedAt: str(row, ["boosted_at"]),
  } satisfies SocialFeedPost;
}

export async function loadSocialFeedWeb(parameters?: {
  limit?: number;
  offset?: number;
  authorId?: string | null;
  savedOnly?: boolean;
  postId?: string | null;
  countryScope?: CountryScope;
}): Promise<SocialFeedPost[]> {
  const params = {
    p_limit: Math.max(1, Math.min(parameters?.limit ?? 30, 50)),
    p_offset: Math.max(0, parameters?.offset ?? 0),
    p_author_id: parameters?.authorId || null,
    p_saved_only: parameters?.savedOnly ?? false,
    p_post_id: parameters?.postId || null,
  };
  // V11: fetch from a dedicated boost-aware RPC first. This is important because
  // client-side sorting cannot promote a boosted post that was never included in
  // the legacy RPC page in the first place. The database now ranks by
  // coalesce(boosted_at, created_at) before LIMIT/OFFSET is applied.
  let result = await rpcRequest<Row[]>("get_social_feed_boosted_v11", params);
  if (result.error) result = await rpcRequest<Row[]>("get_social_feed_boosted", params);
  if (result.error) result = await rpcRequest<Row[]>("get_social_feed", params);
  if (result.error) throw new Error(result.error);

  const rows = Array.isArray(result.data) ? result.data : [];
  const ids = rows.map((row) => str(row, ["id"])).filter(Boolean);

  // V10 compatibility: older feed RPCs can return rows in created_at order and
  // may not expose boosted_at at all. The boost column already lives on
  // social_posts, so hydrate that metadata directly and do the final ranking in
  // the browser. This keeps Feed boost behavior correct while older RPC/schema
  // caches are still present.
  let boostByPostId = new Map<string, string>();
  if (ids.length) {
    const idFilter = ids.map((id) => encodeURIComponent(id)).join(",");
    const boostMeta = await restSelect<Row[]>(
      "social_posts",
      `select=id,boosted_at&id=in.(${idFilter})`,
    );
    if (!boostMeta.error && Array.isArray(boostMeta.data)) {
      boostByPostId = new Map(
        boostMeta.data
          .map((row) => [str(row, ["id"]), str(row, ["boosted_at"])] as const)
          .filter(([id, boostedAt]) => Boolean(id && boostedAt)),
      );
    }
  }

  const hydratedRows = rows.map((row) => {
    const id = str(row, ["id"]);
    const boostedAt = str(row, ["boosted_at"]) || boostByPostId.get(id) || "";
    return boostedAt ? { ...row, boosted_at: boostedAt } : row;
  });
  const authorIds = hydratedRows.map((row) => str(row, ["author_id", "user_id", "profile_id"])).filter(Boolean);
  const allImageValues = rows.flatMap((row) => arr(row.image_paths).slice(0, MAX_SOCIAL_POST_IMAGES));
  const [titles, profiles, signedImages] = await Promise.all([
    titleMap(ids),
    profileMap(authorIds),
    signSocialImages(allImageValues),
  ]);
  const posts = hydratedRows.map((row) => mapPost(row, profiles, titles, signedImages));
  const scope = parameters?.countryScope ?? GLOBAL_COUNTRY_SCOPE;

  return posts
    .filter(
      (post) =>
        scope === GLOBAL_COUNTRY_SCOPE ||
        !post.authorCountry ||
        matchesCountryScope(post.authorCountry, scope),
    )
    .sort((a,b)=>{
      const aTime=new Date(a.boostedAt||a.createdAt).getTime();
      const bTime=new Date(b.boostedAt||b.createdAt).getTime();
      return bTime-aTime;
    });
}

export async function loadFeedViewer(): Promise<FeedViewer | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const result = await restSelect<Row[]>(
    "profiles",
    `select=id,first_name,last_name,display_name,photo_paths,city,province,country,nationality&id=eq.${encodeURIComponent(user.id)}&limit=1`,
  );
  const profile = Array.isArray(result.data) ? result.data[0] || {} : {};
  const paths = arr(profile.photo_paths);

  return {
    id: user.id,
    name: str(profile, ["first_name", "display_name", "full_name", "name", "username"]) || user.email?.split("@")[0] || "Melo",
    avatarUrl: profilePhoto(paths[0] || ""),
    city: str(profile, ["city", "province"]),
    country: str(profile, ["country", "nationality"]),
  };
}

export async function toggleSocialPostLikeWeb(postId: string) {
  const result = await rpcRequest<Row | Row[]>("toggle_social_post_like", { p_post_id: postId });
  if (result.error) throw new Error(result.error);
  const row = Array.isArray(result.data) ? result.data[0] || {} : result.data || {};
  return {
    isLiked: bool((row as Row).is_liked),
    likeCount: Math.max(0, num((row as Row).like_count)),
  };
}

export async function toggleSocialPostSaveWeb(postId: string) {
  const result = await rpcRequest<boolean>("toggle_social_post_save", { p_post_id: postId });
  if (result.error) throw new Error(result.error);
  return bool(result.data);
}

export async function recordSocialPostShareWeb(postId: string) {
  const result = await rpcRequest<number>("record_social_post_share", { p_post_id: postId });
  if (result.error) throw new Error(result.error);
  return Math.max(0, num(result.data));
}

export async function loadSocialPostCommentsWeb(postId: string): Promise<SocialPostComment[]> {
  const result = await rpcRequest<Row[]>("get_social_post_comments", { p_post_id: postId });
  if (result.error) throw new Error(result.error);
  const rows = Array.isArray(result.data) ? result.data : [];

  return rows
    .map((row) => ({
      id: str(row, ["id"]),
      postId: str(row, ["post_id"]),
      parentCommentId: str(row, ["parent_comment_id"]),
      authorId: str(row, ["author_id"]),
      authorName: str(row, ["author_name"], "Melo member"),
      authorPhotoUrl: profilePhoto(str(row, ["author_photo_path"])),
      body: str(row, ["body"]),
      canDelete: bool(first(row, ["can_delete"])),
      createdAt: str(row, ["created_at"], new Date().toISOString()),
    }))
    .filter((item) => Boolean(item.id));
}

export async function createSocialPostCommentWeb(postId: string, body: string) {
  const result = await rpcRequest<string>("create_social_post_comment", {
    p_post_id: postId,
    p_body: body.trim(),
    p_parent_comment_id: null,
  });
  if (result.error) throw new Error(result.error);
  return String(result.data || "");
}

export async function deleteSocialPostWeb(postId: string) {
  const result = await rpcRequest("delete_social_post", { p_post_id: postId });
  if (result.error) throw new Error(result.error);
}

export async function boostSocialPostWeb(postId: string) {
  const result = await rpcRequest("boost_social_post", { p_post_id: postId });
  if (result.error) throw new Error(result.error);
  return true;
}

export async function reportSocialPostWeb(postId: string, reason = "inappropriate") {
  const result = await rpcRequest("report_social_post", {
    p_post_id: postId,
    p_reason: reason,
    p_details: null,
  });
  if (result.error) throw new Error(result.error);
}

async function friendAudienceIds() {
  try {
    const snapshot = await loadFriendSnapshot();
    return [...new Set(snapshot.connections.map((item) => item.userId).filter(Boolean))];
  } catch {
    return [];
  }
}

export async function createTextSocialPostWeb(input: {
  title: string;
  body: string;
  visibility: SocialPostVisibility;
  imageFiles?: File[];
  location?: SocialPostLocationInput | null;
  activity?: {
    type: SocialActivityType;
    id: string;
    title: string;
    subtitle: string;
    imagePath: string;
  } | null;
}) {
  const audienceUserIds = input.visibility === "friends" ? await friendAudienceIds() : [];
  const files = (input.imageFiles || []).slice(0, MAX_SOCIAL_POST_IMAGES);
  const location = input.location || null;
  const safeBody = input.body.trim() || input.activity?.title || input.title.trim() || (files.length ? "\u200B" : "");

  const created = await rpcRequest<string>("create_social_post", {
    p_body: safeBody,
    p_visibility: input.visibility,
    p_image_paths: [],
    p_location_name: location?.name.trim() || null,
    p_latitude: location?.latitude ?? null,
    p_longitude: location?.longitude ?? null,
    p_activity_type: input.activity?.type || null,
    p_activity_id: input.activity?.id || null,
    p_activity_title: input.activity?.title || null,
    p_activity_subtitle: input.activity?.subtitle || null,
    p_activity_image_path: input.activity?.imagePath || null,
    p_audience_user_ids: audienceUserIds,
  });
  if (created.error) throw new Error(created.error);

  const postId = String(created.data || "");
  if (!postId) throw new Error("Unable to create social post.");

  let uploadedPaths: string[] = [];
  try {
    if (files.length) {
      uploadedPaths = await uploadSocialPostImagesWeb(postId, files);
      const mediaUpdate = await rpcRequest<string>("update_social_post", {
        p_post_id: postId,
        p_body: safeBody,
        p_visibility: input.visibility,
        p_image_paths: uploadedPaths,
        p_location_name: location?.name.trim() || null,
        p_latitude: location?.latitude ?? null,
        p_longitude: location?.longitude ?? null,
        p_activity_type: input.activity?.type || null,
        p_activity_id: input.activity?.id || null,
        p_activity_title: input.activity?.title || null,
        p_activity_subtitle: input.activity?.subtitle || null,
        p_activity_image_path: input.activity?.imagePath || null,
        p_audience_user_ids: audienceUserIds,
      });
      if (mediaUpdate.error) throw new Error(mediaUpdate.error);
    }

    const title = input.title.trim().slice(0, MAX_SOCIAL_POST_TITLE_LENGTH);
    const titleResult = await rpcRequest("set_social_post_title", {
      p_post_id: postId,
      p_title: title || null,
    });
    if (titleResult.error) throw new Error(titleResult.error);
    return postId;
  } catch (error) {
    if (uploadedPaths.length) await deleteSocialPostImagesWeb(uploadedPaths).catch(() => undefined);
    await rpcRequest("delete_social_post", { p_post_id: postId }).catch(() => undefined);
    throw error;
  }
}

export async function updateSocialPostWeb(
  post: SocialFeedPost,
  input: {
    title: string;
    body: string;
    visibility: SocialPostVisibility;
    existingImagePaths?: string[];
    newImageFiles?: File[];
    location?: SocialPostLocationInput | null;
  },
) {
  const audienceUserIds = input.visibility === "friends" ? await friendAudienceIds() : [];
  const keptPaths = (input.existingImagePaths ?? post.images.map((image) => image.path))
    .map(normalizeStoragePath)
    .filter(Boolean)
    .slice(0, MAX_SOCIAL_POST_IMAGES);
  const newFiles = (input.newImageFiles || []).slice(0, Math.max(0, MAX_SOCIAL_POST_IMAGES - keptPaths.length));
  const location = input.location === undefined
    ? { name: post.locationName, latitude: post.latitude, longitude: post.longitude }
    : input.location;
  const safeBody = input.body.trim() || post.activityTitle || input.title.trim() || ((keptPaths.length || newFiles.length) ? "\u200B" : "");

  let uploadedPaths: string[] = [];
  try {
    uploadedPaths = await uploadSocialPostImagesWeb(post.id, newFiles);
    const finalPaths = [...keptPaths, ...uploadedPaths].slice(0, MAX_SOCIAL_POST_IMAGES);
    const updated = await rpcRequest<string>("update_social_post", {
      p_post_id: post.id,
      p_body: safeBody,
      p_visibility: input.visibility,
      p_image_paths: finalPaths,
      p_location_name: location?.name.trim() || null,
      p_latitude: location?.latitude ?? null,
      p_longitude: location?.longitude ?? null,
      p_activity_type: post.activityType,
      p_activity_id: post.activityId || null,
      p_activity_title: post.activityTitle || null,
      p_activity_subtitle: post.activitySubtitle || null,
      p_activity_image_path: post.activityImagePath || null,
      p_audience_user_ids: audienceUserIds,
    });
    if (updated.error) throw new Error(updated.error);

    const title = input.title.trim().slice(0, MAX_SOCIAL_POST_TITLE_LENGTH);
    const titleResult = await rpcRequest("set_social_post_title", { p_post_id: post.id, p_title: title || null });
    if (titleResult.error) throw new Error(titleResult.error);

    const originalPaths = post.images.map((image) => normalizeStoragePath(image.path)).filter(Boolean);
    const removedPaths = originalPaths.filter((path) => !finalPaths.includes(path));
    if (removedPaths.length) void deleteSocialPostImagesWeb(removedPaths).catch(() => undefined);
    return post.id;
  } catch (error) {
    if (uploadedPaths.length) await deleteSocialPostImagesWeb(uploadedPaths).catch(() => undefined);
    throw error;
  }
}
