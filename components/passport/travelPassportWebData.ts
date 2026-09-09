"use client";

import {
  getCurrentUser,
  publicStorageUrl,
  rpcRequest,
} from "@/lib/supabase/browser";

export type TravelPassportSummary = {
  user_id: string;
  display_name: string;
  photo_path: string | null;
  is_owner: boolean;
  is_public: boolean;
  show_activity_titles: boolean;
  total_stamps: number;
  trip_count: number;
  event_count: number;
  country_count: number;
  city_count: number;
  organizer_count: number;
  unlocked_badges: number;
  total_badges: number;
  first_stamp_on: string | null;
  latest_stamp_on: string | null;
};

export type TravelStamp = {
  id: string;
  source_type: "trip" | "event";
  source_id: string;
  title: string;
  place_label: string;
  city: string;
  country: string;
  category: string;
  visited_on: string;
  role: "organizer" | "participant";
  created_at: string;
};

export type TravelBadge = {
  code: string;
  icon: string;
  name_th: string;
  name_en: string;
  description_th: string;
  description_en: string;
  metric_type: string;
  target_value: number;
  sort_order: number;
  unlocked: boolean;
  unlocked_at: string | null;
  progress_value: number;
};

export type PassportSnapshot = {
  viewerId: string;
  summary: TravelPassportSummary | null;
  stamps: TravelStamp[];
  badges: TravelBadge[];
};

type Row = Record<string, any>;

function rowArray(value: unknown): Row[] {
  return Array.isArray(value)
    ? value.filter((row): row is Row => Boolean(row) && typeof row === "object")
    : [];
}

function firstRow<T>(value: unknown): T | null {
  if (Array.isArray(value)) return (value[0] as T | undefined) ?? null;
  if (value && typeof value === "object") return value as T;
  return null;
}

export function passportPhotoUrl(path: string | null | undefined) {
  return path ? publicStorageUrl("profile-photos", path) : "";
}

export async function refreshMyTravelPassportWeb() {
  const result = await rpcRequest("refresh_my_travel_passport");
  if (result.error) throw new Error(result.error);
}

export async function loadTravelPassportWeb(
  requestedUserId?: string,
): Promise<PassportSnapshot> {
  const viewer = await getCurrentUser();
  if (!viewer) throw new Error("AUTH_REQUIRED");

  const targetUserId = requestedUserId || viewer.id;
  const isOwner = targetUserId === viewer.id;

  if (isOwner) {
    await refreshMyTravelPassportWeb();
  }

  const summaryResult = await rpcRequest<TravelPassportSummary[]>(
    "get_travel_passport_summary",
    { p_user_id: targetUserId },
  );
  if (summaryResult.error) throw new Error(summaryResult.error);

  const summary = firstRow<TravelPassportSummary>(summaryResult.data);
  if (!summary) {
    return { viewerId: viewer.id, summary: null, stamps: [], badges: [] };
  }

  const [stampResult, badgeResult] = await Promise.all([
    rpcRequest<TravelStamp[]>("get_travel_passport_stamps", {
      p_user_id: targetUserId,
    }),
    rpcRequest<TravelBadge[]>("get_travel_passport_badges", {
      p_user_id: targetUserId,
    }),
  ]);

  if (stampResult.error) throw new Error(stampResult.error);
  if (badgeResult.error) throw new Error(badgeResult.error);

  const stamps = rowArray(stampResult.data)
    .map((row) => row as TravelStamp)
    .sort((a, b) => String(b.visited_on || "").localeCompare(String(a.visited_on || "")));

  const badges = rowArray(badgeResult.data)
    .map((row) => row as TravelBadge)
    .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));

  return {
    viewerId: viewer.id,
    summary,
    stamps,
    badges,
  };
}

export async function saveTravelPassportPreferencesWeb(input: {
  isPublic: boolean;
  showActivityTitles: boolean;
}) {
  const result = await rpcRequest("save_my_travel_passport_preferences", {
    p_is_public: input.isPublic,
    p_show_activity_titles: input.showActivityTitles,
  });
  if (result.error) throw new Error(result.error);
}
