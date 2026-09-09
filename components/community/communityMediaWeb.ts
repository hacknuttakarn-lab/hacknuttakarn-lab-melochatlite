"use client";

import {
  getCurrentUser,
  getStoredSession,
  isSupabaseConfigured,
  publicStorageUrl,
  rpcRequest,
} from "@/lib/supabase/browser";

const COMMUNITY_BUCKET = "activity-images";
const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";

type CreateCommunityInput = {
  name: string;
  description: string;
  category: string;
  privacy: "public" | "private";
};

function extensionFromFile(file: File) {
  const byName = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "";
  if (byName && byName.length <= 5) return byName;
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/heic") return "heic";
  return "jpg";
}

async function responseError(response: Response) {
  try {
    const payload = await response.json();
    return String(
      payload?.message ||
      payload?.details ||
      payload?.hint ||
      payload?.error_description ||
      payload?.error ||
      `HTTP ${response.status}`,
    );
  } catch {
    return `HTTP ${response.status}`;
  }
}

function authHeaders(contentType = "application/json") {
  const session = getStoredSession();
  if (!session?.access_token) throw new Error("AUTH_REQUIRED");
  return {
    apikey: supabaseKey,
    Authorization: `Bearer ${session.access_token}`,
    "Content-Type": contentType,
    Prefer: "return=representation",
  };
}

function extractCommunityId(value: unknown): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (Array.isArray(value)) {
    for (const item of value) {
      const id = extractCommunityId(item);
      if (id) return id;
    }
    return "";
  }
  if (value && typeof value === "object") {
    const row = value as Record<string, unknown>;
    for (const key of ["id", "community_id", "created_id"]) {
      const item = row[key];
      if (typeof item === "string" && item.trim()) return item.trim();
    }
  }
  return "";
}

function rpcSignatureMismatch(error: string) {
  const normalized = error.toLowerCase();
  return (
    normalized.includes("pgrst202") ||
    normalized.includes("could not find the function") ||
    normalized.includes("function public.create_community") ||
    normalized.includes("function create_community") ||
    normalized.includes("schema cache") ||
    normalized.includes("does not exist")
  );
}

async function insertCommunityDirect(input: CreateCommunityInput, ownerId: string) {
  const response = await fetch(`${supabaseUrl}/rest/v1/communities`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      owner_id: ownerId,
      name: input.name,
      description: input.description || null,
      category: input.category,
      privacy: input.privacy,
    }),
  });
  if (!response.ok) throw new Error(await responseError(response));
  const data = await response.json().catch(() => null);
  const id = extractCommunityId(data);
  if (!id) throw new Error("COMMUNITY_ID_MISSING");
  return id;
}

export async function createCommunityWeb(input: CreateCommunityInput) {
  if (!isSupabaseConfigured()) throw new Error("Supabase is not configured.");
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("AUTH_REQUIRED");

  const rpcCandidates: Record<string, unknown>[] = [
    {
      p_name: input.name,
      p_description: input.description || null,
      p_category: input.category,
      p_privacy: input.privacy,
    },
    {
      p_name: input.name,
      p_description: input.description || null,
      p_category: input.category,
      p_is_private: input.privacy === "private",
    },
  ];

  let lastRpcError = "";
  for (const params of rpcCandidates) {
    const result = await rpcRequest<unknown>("create_community", params);
    if (!result.error) {
      const id = extractCommunityId(result.data);
      if (id) return id;
      break;
    }
    lastRpcError = result.error;
    if (!rpcSignatureMismatch(result.error)) throw new Error(result.error);
  }

  try {
    return await insertCommunityDirect(input, user.id);
  } catch (cause) {
    if (cause instanceof Error && cause.message) throw cause;
    throw new Error(lastRpcError || "Unable to create community.");
  }
}

export function validateCommunityImage(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("IMAGE_REQUIRED");
  if (file.size > 12 * 1024 * 1024) throw new Error("IMAGE_TOO_LARGE");
}

export async function saveCommunityCoverWeb(communityId: string, file: File | null) {
  if (!file) return { path: "", url: "" };
  if (!isSupabaseConfigured()) throw new Error("Supabase is not configured.");
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("AUTH_REQUIRED");

  validateCommunityImage(file);
  const suffix = Math.random().toString(36).slice(2, 10);
  const path = `${user.id}/community/${communityId}/cover/${Date.now()}-${suffix}.${extensionFromFile(file)}`;
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  const upload = await fetch(
    `${supabaseUrl}/storage/v1/object/${COMMUNITY_BUCKET}/${encodedPath}`,
    {
      method: "POST",
      headers: {
        ...authHeaders(file.type || "application/octet-stream"),
        "x-upsert": "false",
        "cache-control": "3600",
      },
      body: file,
    },
  );
  if (!upload.ok) throw new Error(await responseError(upload));

  const patch = await fetch(
    `${supabaseUrl}/rest/v1/communities?id=eq.${encodeURIComponent(communityId)}`,
    {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ image_path: path }),
    },
  );
  if (!patch.ok) throw new Error(await responseError(patch));

  return { path, url: publicStorageUrl(COMMUNITY_BUCKET, path) };
}
