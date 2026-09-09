"use client";

import {
  getCurrentUser,
  getStoredSession,
  isSupabaseConfigured,
  publicStorageUrl,
} from "@/lib/supabase/browser";

const ACTIVITY_BUCKET = "activity-images";
const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";

type ActivityKind = "trip" | "event";

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

export function previewFile(file: File | null) {
  return file ? URL.createObjectURL(file) : "";
}

export function validateActivityImage(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("IMAGE_REQUIRED");
  if (file.size > 12 * 1024 * 1024) throw new Error("IMAGE_TOO_LARGE");
}

export async function uploadActivityImageWeb(input: {
  kind: ActivityKind;
  activityId: string;
  file: File;
  role: "cover" | "gallery";
  index?: number;
}) {
  if (!isSupabaseConfigured()) throw new Error("Supabase is not configured.");
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("AUTH_REQUIRED");

  validateActivityImage(input.file);

  const suffix = Math.random().toString(36).slice(2, 10);
  const index = Math.max(0, Math.round(input.index ?? 0));
  const path =
    `${user.id}/${input.kind}/${input.activityId}/${input.role}/` +
    `${Date.now()}-${index}-${suffix}.${extensionFromFile(input.file)}`;

  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  const response = await fetch(
    `${supabaseUrl}/storage/v1/object/${ACTIVITY_BUCKET}/${encodedPath}`,
    {
      method: "POST",
      headers: {
        ...authHeaders(input.file.type || "application/octet-stream"),
        "x-upsert": "false",
        "cache-control": "3600",
      },
      body: input.file,
    },
  );

  if (!response.ok) throw new Error(await responseError(response));
  return { path, url: publicStorageUrl(ACTIVITY_BUCKET, path) };
}

async function patchActivity(
  table: "trips" | "events",
  activityId: string,
  payload: Record<string, unknown>,
) {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/${table}?id=eq.${encodeURIComponent(activityId)}`,
    {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    return { ok: false, error: await responseError(response) };
  }
  return { ok: true, error: null };
}

function missingColumnError(error: string) {
  const normalized = error.toLowerCase();
  return (
    normalized.includes("column") ||
    normalized.includes("schema cache") ||
    normalized.includes("pgrst204") ||
    normalized.includes("does not exist")
  );
}

export async function saveActivityCoverWeb(input: {
  kind: ActivityKind;
  activityId: string;
  coverFile: File | null;
}) {
  if (!input.coverFile) return { path: "", url: "" };

  const uploaded = await uploadActivityImageWeb({
    kind: input.kind,
    activityId: input.activityId,
    file: input.coverFile,
    role: "cover",
  });

  const table = input.kind === "trip" ? "trips" : "events";
  const patched = await patchActivity(table, input.activityId, {
    image_path: uploaded.path,
  });
  if (!patched.ok) throw new Error(patched.error || "Unable to save cover image.");

  return uploaded;
}

async function insertActivityMediaRows(input: {
  kind: ActivityKind;
  activityId: string;
  paths: string[];
}) {
  if (!input.paths.length) return true;

  const payload = input.paths.map((path, index) => ({
    activity_type: input.kind,
    activity_id: input.activityId,
    image_path: path,
    position: index + 1,
  }));

  const response = await fetch(`${supabaseUrl}/rest/v1/activity_images`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  return response.ok;
}

export async function saveActivityGalleryWeb(input: {
  kind: ActivityKind;
  activityId: string;
  files: File[];
}) {
  if (!input.files.length) return { paths: [] as string[], urls: [] as string[] };

  const uploaded = [];
  for (let index = 0; index < input.files.length; index += 1) {
    uploaded.push(
      await uploadActivityImageWeb({
        kind: input.kind,
        activityId: input.activityId,
        file: input.files[index],
        role: "gallery",
        index,
      }),
    );
  }

  const paths = uploaded.map((item) => item.path);
  const table = input.kind === "trip" ? "trips" : "events";

  // Compatibility order:
  // 1. Dedicated activity_images table if present.
  // 2. Existing JSON/array column names used by older/newer Melo schemas.
  if (!(await insertActivityMediaRows({ kind: input.kind, activityId: input.activityId, paths }))) {
    const candidates = [
      "image_paths",
      "gallery_paths",
      "additional_image_paths",
      "additional_images",
    ];

    let persisted = false;
    let lastError = "";

    for (const column of candidates) {
      const result = await patchActivity(table, input.activityId, { [column]: paths });
      if (result.ok) {
        persisted = true;
        break;
      }
      lastError = result.error || "";
      if (!missingColumnError(lastError)) throw new Error(lastError);
    }

    // Main cover remains valid even if the current DB does not have a gallery
    // field/table yet. Do not fail the entire Activity creation.
    if (!persisted && lastError && !missingColumnError(lastError)) {
      throw new Error(lastError);
    }
  }

  return {
    paths,
    urls: uploaded.map((item) => item.url),
  };
}

export async function updateActivityCreationFields(input: {
  kind: ActivityKind;
  activityId: string;
  membershipOpen: boolean;
}) {
  const table = input.kind === "trip" ? "trips" : "events";
  const result = await patchActivity(table, input.activityId, {
    membership_open: input.membershipOpen,
  });

  // Some old schemas do not expose membership_open on creation yet.
  if (!result.ok && !missingColumnError(result.error || "")) {
    throw new Error(result.error || "Unable to update activity.");
  }
}

export async function saveEventLocationCoordinatesWeb(
  eventId: string,
  location: { latitude: number | null; longitude: number | null },
) {
  if (!Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) return;
  const result = await patchActivity("events", eventId, {
    latitude: Number(location.latitude),
    longitude: Number(location.longitude),
  });
  // Android stores these fields when present. Older web schemas may not expose them yet.
  if (!result.ok && !missingColumnError(result.error || "")) {
    throw new Error(result.error || "Unable to save Event coordinates.");
  }
}

export async function updateEventChatModeWeb(
  eventId: string,
  chatMode: "group" | "announcement_only" | "disabled",
) {
  const result = await patchActivity("events", eventId, { chat_mode: chatMode });

  // Keep compatibility with older schemas that predate configurable Event chat.
  if (!result.ok && !missingColumnError(result.error || "")) {
    throw new Error(result.error || "Unable to update Event communication.");
  }
}

export async function saveTripRouteCoordinatesWeb(
  tripId: string,
  route: {
    start?: { latitude: number; longitude: number } | null;
    destination?: { latitude: number; longitude: number } | null;
  },
) {
  const payload: Record<string, number> = {};
  if (route.start && Number.isFinite(route.start.latitude) && Number.isFinite(route.start.longitude)) {
    payload.start_latitude = route.start.latitude;
    payload.start_longitude = route.start.longitude;
  }
  if (route.destination && Number.isFinite(route.destination.latitude) && Number.isFinite(route.destination.longitude)) {
    payload.destination_latitude = route.destination.latitude;
    payload.destination_longitude = route.destination.longitude;
  }
  if (!Object.keys(payload).length) return;

  const result = await patchActivity("trips", tripId, payload);
  if (!result.ok && !missingColumnError(result.error || "")) {
    throw new Error(result.error || "Unable to save Trip coordinates.");
  }
}

export async function saveTripStopsWeb(
  tripId: string,
  stops: Array<{ label: string; latitude?: number | null; longitude?: number | null }>,
) {
  const clean = stops
    .map((item) => ({ ...item, label: item.label.trim() }))
    .filter((item) => Boolean(item.label));
  if (!clean.length) return;

  const payload = clean.map((item, index) => ({
    trip_id: tripId,
    label: item.label,
    position: index + 1,
    ...(Number.isFinite(item.latitude) && Number.isFinite(item.longitude)
      ? { latitude: item.latitude, longitude: item.longitude }
      : {}),
  }));

  let response = await fetch(`${supabaseUrl}/rest/v1/trip_stops`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await responseError(response);
    const normalized = error.toLowerCase();
    const hasCoordinates = payload.some((item) => "latitude" in item || "longitude" in item);

    if (hasCoordinates && (normalized.includes("column") || normalized.includes("schema cache"))) {
      response = await fetch(`${supabaseUrl}/rest/v1/trip_stops`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(clean.map((item, index) => ({
          trip_id: tripId,
          label: item.label,
          position: index + 1,
        }))),
      });
      if (response.ok) return;
    }

    const fallbackError = response.ok ? "" : await responseError(response);
    const fallbackNormalized = fallbackError.toLowerCase();
    if (
      fallbackError &&
      !fallbackNormalized.includes("column") &&
      !fallbackNormalized.includes("null value") &&
      !fallbackNormalized.includes("schema cache")
    ) {
      throw new Error(fallbackError);
    }
  }
}

export async function saveTripItineraryWeb(
  tripId: string,
  items: Array<{ timeLabel: string; title: string; description?: string }>,
) {
  const clean = items
    .map((item) => ({
      timeLabel: item.timeLabel.trim(),
      title: item.title.trim(),
      description: (item.description || "").trim(),
    }))
    .filter((item) => item.title);

  if (!clean.length) return;

  const payload = clean.map((item, index) => ({
    trip_id: tripId,
    time_label: item.timeLabel || null,
    title: item.title,
    description: item.description || null,
    position: index + 1,
  }));

  const response = await fetch(`${supabaseUrl}/rest/v1/trip_itinerary`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await responseError(response);
    const normalized = error.toLowerCase();

    // Keep older Melo schemas compatible. Trip creation itself must not fail
    // only because an older database does not yet expose itinerary fields.
    if (
      normalized.includes("column") ||
      normalized.includes("schema cache") ||
      normalized.includes("does not exist")
    ) {
      return;
    }
    throw new Error(error);
  }
}

