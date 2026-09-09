"use client";

import {
  getCurrentUser,
  publicStorageUrl,
  restSelect,
  rpcRequest,
} from "@/lib/supabase/browser";

export type ReputationSummaryWeb = {
  userId: string;
  displayName: string;
  photoUrl: string;
  identityVerified: boolean;
  selfieVerified: boolean;
  isVerified: boolean;
  averageRating: number;
  reviewCount: number;
  completedEvents: number;
  completedTrips: number;
  topTags: string[];
  punctualityRating: number;
  friendlinessRating: number;
  reliabilityRating: number;
  safetyRating: number;
  confirmedAttendance: number;
  noShowCount: number;
  cancelledCount: number;
  showRate: number;
};

export type ReputationReviewWeb = {
  id: string;
  reviewerId: string;
  reviewerName: string;
  reviewerPhotoUrl: string;
  reviewerVerified: boolean;
  rating: number;
  punctualityRating: number | null;
  friendlinessRating: number | null;
  reliabilityRating: number | null;
  safetyRating: number | null;
  tags: string[];
  comment: string;
  contextType: "event" | "trip";
  contextId: string;
  createdAt: string;
  caseStatus: string;
  canReport: boolean;
  canDispute: boolean;
};

type Row = Record<string, any>;

function firstRow(value: unknown): Row | null {
  if (Array.isArray(value)) return (value[0] as Row | undefined) ?? null;
  return value && typeof value === "object" ? value as Row : null;
}
function numberValue(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
function boolValue(value: unknown) {
  return value === true || value === "true" || value === 1 || value === "1";
}
function textValue(value: unknown) {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}
function arrayValue(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).map((x) => x.trim()).filter(Boolean);
  return [];
}
function isMissingPhase26(error: string | null | undefined) {
  const m = String(error || "").toLowerCase();
  return m.includes("phase26") || m.includes("get_phase26_") || m.includes("submit_phase26_") || m.includes("could not find the function") || m.includes("schema cache") || m.includes("pgrst202") || m.includes("42883");
}
function profilePhoto(path: string) {
  return path ? publicStorageUrl("profile-photos", path) : "";
}

async function reviewerProfiles(ids: string[]) {
  const unique = [...new Set(ids.filter(Boolean))];
  const map = new Map<string, Row>();
  if (!unique.length) return map;
  const result = await restSelect<Row[]>("profiles", `select=id,display_name,photo_paths&id=in.(${unique.join(",")})`);
  if (result.error || !Array.isArray(result.data)) return map;
  for (const row of result.data) map.set(String(row.id), row);
  return map;
}
function firstPhotoPath(profile: Row | undefined) {
  const raw = profile?.photo_paths;
  if (Array.isArray(raw)) return textValue(raw[0]);
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return textValue(parsed[0]);
    } catch {}
  }
  return "";
}

export async function loadReputationSummaryWeb(userId: string): Promise<ReputationSummaryWeb | null> {
  const legacyResult = await rpcRequest<Row[] | Row>("get_reputation_summary", { p_user_id: userId });
  if (legacyResult.error) throw new Error(legacyResult.error);
  const legacy = firstRow(legacyResult.data);
  if (!legacy) return null;

  let metrics: Row | null = null;
  const metricsResult = await rpcRequest<Row[] | Row>("get_phase26_reputation_metrics", { p_user_id: userId });
  if (!metricsResult.error) metrics = firstRow(metricsResult.data);
  else if (!isMissingPhase26(metricsResult.error)) throw new Error(metricsResult.error);

  const row = metrics ? { ...legacy, ...metrics } : legacy;
  return {
    userId: textValue(legacy.user_id || userId),
    displayName: textValue(legacy.display_name || "Melo member"),
    photoUrl: profilePhoto(textValue(legacy.photo_path)),
    identityVerified: boolValue(legacy.identity_verified),
    selfieVerified: boolValue(legacy.selfie_verified),
    isVerified: boolValue(legacy.is_verified),
    averageRating: numberValue(row.average_rating),
    reviewCount: numberValue(row.review_count),
    completedEvents: numberValue(row.completed_events),
    completedTrips: numberValue(row.completed_trips),
    topTags: arrayValue(row.top_tags),
    punctualityRating: numberValue(row.punctuality_rating),
    friendlinessRating: numberValue(row.friendliness_rating),
    reliabilityRating: numberValue(row.reliability_rating),
    safetyRating: numberValue(row.safety_rating),
    confirmedAttendance: numberValue(row.confirmed_attendance),
    noShowCount: numberValue(row.no_show_count),
    cancelledCount: numberValue(row.cancelled_count),
    showRate: numberValue(row.show_rate),
  };
}

function mapReview(row: Row): ReputationReviewWeb {
  return {
    id: textValue(row.id),
    reviewerId: textValue(row.reviewer_id),
    reviewerName: textValue(row.reviewer_name || "Melo member"),
    reviewerPhotoUrl: "",
    reviewerVerified: boolValue(row.reviewer_verified),
    rating: numberValue(row.rating),
    punctualityRating: row.punctuality_rating == null ? null : numberValue(row.punctuality_rating),
    friendlinessRating: row.friendliness_rating == null ? null : numberValue(row.friendliness_rating),
    reliabilityRating: row.reliability_rating == null ? null : numberValue(row.reliability_rating),
    safetyRating: row.safety_rating == null ? null : numberValue(row.safety_rating),
    tags: arrayValue(row.tags),
    comment: textValue(row.comment),
    contextType: textValue(row.context_type) === "trip" ? "trip" : "event",
    contextId: textValue(row.context_id),
    createdAt: textValue(row.created_at || new Date().toISOString()),
    caseStatus: textValue(row.case_status),
    canReport: boolValue(row.can_report),
    canDispute: boolValue(row.can_dispute),
  };
}

export async function loadReputationReviewsWeb(userId: string): Promise<ReputationReviewWeb[]> {
  const legacyResult = await rpcRequest<Row[]>("get_reputation_reviews", { p_user_id: userId });
  const legacy: ReputationReviewWeb[] = legacyResult.error ? [] : (Array.isArray(legacyResult.data) ? legacyResult.data.map(mapReview) : []);

  const phaseResult = await rpcRequest<Row[]>("get_phase26_reputation_reviews", { p_user_id: userId });
  let merged: ReputationReviewWeb[];
  if (!phaseResult.error) {
    const phase: ReputationReviewWeb[] = Array.isArray(phaseResult.data) ? phaseResult.data.map(mapReview) : [];
    const legacyById = new Map<string, ReputationReviewWeb>(legacy.map((x) => [x.id, x]));
    const phaseIds = new Set(phase.map((x) => x.id));
    merged = [
      ...phase.map((review) => ({
        ...review,
        reviewerName: legacyById.get(review.id)?.reviewerName || review.reviewerName,
        reviewerVerified: legacyById.get(review.id)?.reviewerVerified ?? review.reviewerVerified,
      })),
      ...legacy.filter((review) => !phaseIds.has(review.id)),
    ];
  } else if (isMissingPhase26(phaseResult.error)) {
    merged = legacy;
  } else {
    throw new Error(phaseResult.error);
  }

  const profiles = await reviewerProfiles(merged.map((r) => r.reviewerId));
  return merged.map((review) => {
    const p = profiles.get(review.reviewerId);
    return {
      ...review,
      reviewerName: review.reviewerName === "Melo member" ? textValue(p?.display_name || review.reviewerName) : review.reviewerName,
      reviewerPhotoUrl: profilePhoto(firstPhotoPath(p)),
    };
  });
}

export async function loadReputationPageWeb(userId: string) {
  const [summary, reviews, viewer] = await Promise.all([
    loadReputationSummaryWeb(userId),
    loadReputationReviewsWeb(userId),
    getCurrentUser(),
  ]);
  return { summary, reviews, viewerId: viewer?.id || "" };
}

export async function submitReputationCaseWeb(input: {
  reviewId: string;
  caseType: "report" | "dispute";
  reason: string;
  details: string;
}) {
  const result = await rpcRequest("submit_phase26_review_case", {
    p_review_id: input.reviewId,
    p_case_type: input.caseType,
    p_reason: input.reason,
    p_details: input.details.trim() || null,
  });
  if (result.error) throw new Error(result.error);
}
