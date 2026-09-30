"use client";

import {
  getCurrentUser,
  invokeEdgeFunction,
  publicStorageUrl,
  restDelete,
  restSelect,
  rpcRequest,
} from "@/lib/supabase/browser";
import {
  GLOBAL_COUNTRY_SCOPE,
  matchesCountryScope,
  type CountryScope,
} from "@/lib/discoveryCountry";

type Row = Record<string, any>;

export type TripLifecycle = "upcoming" | "ongoing" | "completed" | "cancelled";

export type TripWebRecord = {
  id: string;
  title: string;
  description: string;
  category: string;
  imageUrl: string;
  imagePath: string;
  startPoint: string;
  destination: string;
  province: string;
  district: string;
  city: string;
  startDate: string;
  endDate: string;
  capacity: number;
  memberCount: number;
  budgetPerPerson: number | null;
  primaryLanguage: string;
  organizerId: string;
  organizerName: string;
  organizerPhotoUrl: string;
  organizerCity: string;
  country: string;
  relation: string;
  createdByMe: boolean;
  joined: boolean;
  membershipOpen: boolean;
  lifecycle: TripLifecycle;
  createdAt: string;
};

export type TripMemberWeb = {
  id: string;
  name: string;
  photoUrl: string;
  role: string;
};

export type TripStopWeb = {
  id: string;
  label: string;
  latitude: number | null;
  longitude: number | null;
  position: number;
};

export type TripItineraryWeb = {
  id: string;
  timeLabel: string;
  title: string;
  description: string;
  position: number;
};

export type TripDetailWeb = TripWebRecord & {
  startLatitude: number | null;
  startLongitude: number | null;
  destinationLatitude: number | null;
  destinationLongitude: number | null;
  stops: TripStopWeb[];
  itinerary: TripItineraryWeb[];
  members: TripMemberWeb[];
  requestStatus: "pending" | "approved" | "rejected" | null;
  isOwner: boolean;
  pendingRequestCount?: number;
};

function rowsOf(value: unknown): Row[] {
  if (Array.isArray(value)) {
    return value.filter((row): row is Row => Boolean(row) && typeof row === "object");
  }
  if (value && typeof value === "object") return [value as Row];
  return [];
}

function text(row: Row | null | undefined, ...keys: string[]) {
  if (!row) return "";
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function num(row: Row | null | undefined, ...keys: string[]) {
  if (!row) return 0;
  for (const key of keys) {
    const value = Number(row[key]);
    if (Number.isFinite(value)) return value;
  }
  return 0;
}

function boolValue(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (value === "true" || value === 1 || value === "1") return true;
  if (value === "false" || value === 0 || value === "0") return false;
  return fallback;
}

function arrayOfStrings(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(String).map((item) => item.trim()).filter(Boolean);
    } catch {}
  }
  return [];
}

function profilePhoto(row: Row | undefined) {
  if (!row) return "";
  const direct = text(row, "photo_url", "avatar_url");
  if (/^https?:\/\//i.test(direct)) return direct;
  const paths = arrayOfStrings(row.photo_paths);
  const path = paths[0] || text(row, "photo_path", "profile_image_path");
  return path ? publicStorageUrl("profile-photos", path) : "";
}

function tripImage(row: Row) {
  const direct = text(row, "image_url", "cover_image_url", "photo_url");
  if (/^https?:\/\//i.test(direct)) return direct;
  const path = text(row, "image_path");
  return path ? publicStorageUrl("activity-images", path) : "";
}

function lifecycleTimestamp(value: string, endOfDay = false) {
  const clean = value.trim();
  if (!clean) return Number.NaN;
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(clean);
  if (dateOnly) {
    return new Date(
      Number(dateOnly[1]),
      Number(dateOnly[2]) - 1,
      Number(dateOnly[3]),
      endOfDay ? 23 : 0,
      endOfDay ? 59 : 0,
      endOfDay ? 59 : 0,
      endOfDay ? 999 : 0,
    ).getTime();
  }
  return new Date(clean).getTime();
}

function deriveLifecycle(row: Row): TripLifecycle {
  const stored = text(row, "lifecycle_status", "status").toLowerCase();
  if (stored === "cancelled" || stored === "canceled") return "cancelled";
  if (stored === "completed" || stored === "ended" || row.archived_at) return "completed";

  const start = lifecycleTimestamp(text(row, "start_date"), false);
  const end = lifecycleTimestamp(text(row, "end_date") || text(row, "start_date"), true);
  const now = Date.now();

  if (Number.isFinite(end) && end < now) return "completed";
  if (stored === "ongoing") return "ongoing";
  if (Number.isFinite(start) && start <= now) return "ongoing";
  return "upcoming";
}

function mergeRows(
  directRows: Row[],
  myRows: Row[],
  publicRows: Row[],
) {
  const map = new Map<string, Row>();

  for (const row of directRows) {
    const id = text(row, "id");
    if (id) map.set(id, { ...row });
  }

  // Public discovery data can be a wider/newer projection than get_my_trips,
  // so merge it before the personal rows. Personal membership fields must win
  // at the end; otherwise a public row with an empty relation can erase
  // relation=joined and make an approved Trip disappear from My Trips.
  for (const row of publicRows) {
    const id = text(row, "id");
    if (!id) continue;
    const existing = map.get(id) ?? {};
    map.set(id, {
      ...existing,
      ...row,
      image_path: text(row, "image_path") || text(existing, "image_path"),
      __my: existing.__my === true,
    });
  }

  for (const row of myRows) {
    const id = text(row, "id");
    if (!id) continue;
    const existing = map.get(id) ?? {};
    map.set(id, {
      ...existing,
      ...row,
      image_path: text(row, "image_path") || text(existing, "image_path"),
      __my: true,
    });
  }

  return [...map.values()];
}

async function loadProfileMap(userIds: string[]) {
  const ids = [...new Set(userIds.filter(Boolean))];
  const map = new Map<string, Row>();
  if (!ids.length) return map;

  const result = await restSelect<Row[]>(
    "profiles",
    `select=id,display_name,photo_paths,city,province,country,nationality&id=in.(${ids.join(",")})`,
  );

  if (result.error || !Array.isArray(result.data)) return map;
  for (const row of result.data) map.set(text(row, "id"), row);
  return map;
}

function normalizeTrip(
  row: Row,
  profile: Row | undefined,
  currentUserId: string,
): TripWebRecord {
  const relation = text(row, "relation").toLowerCase();
  const organizerId = text(row, "organizer_id");
  const lifecycle = deriveLifecycle(row);
  const country =
    text(row, "country") ||
    text(profile, "country", "nationality");

  return {
    id: text(row, "id"),
    title: text(row, "title") || "Melo Trip",
    description: text(row, "description"),
    category: text(row, "category"),
    imageUrl: tripImage(row),
    imagePath: text(row, "image_path"),
    startPoint: text(row, "start_point"),
    destination: text(row, "destination"),
    province: text(row, "destination_province", "province", "region", "state"),
    district: text(row, "destination_district", "district", "subdistrict"),
    city: text(row, "destination_city", "city"),
    startDate: text(row, "start_date"),
    endDate: text(row, "end_date"),
    capacity: Math.max(0, num(row, "capacity")),
    memberCount: Math.max(
      0,
      num(row, "approved_members", "member_count", "current_members"),
    ),
    budgetPerPerson:
      row.budget_per_person === null || row.budget_per_person === undefined
        ? null
        : num(row, "budget_per_person"),
    primaryLanguage: text(row, "primary_language"),
    organizerId,
    organizerName:
      text(row, "organizer_name") ||
      text(profile, "display_name") ||
      "Melo member",
    organizerPhotoUrl: profilePhoto(profile),
    organizerCity: text(profile, "city", "province"),
    country,
    relation,
    createdByMe:
      organizerId === currentUserId ||
      relation === "created" ||
      row.__mine === true && relation === "created",
    joined:
      relation === "joined" ||
      relation === "created" ||
      boolValue(row.is_joined) ||
      boolValue(row.joined),
    membershipOpen:
      row.membership_open === undefined
        ? true
        : boolValue(row.membership_open, true),
    lifecycle,
    createdAt: text(row, "created_at"),
  };
}

export async function loadTripsWeb(
  countryScope: CountryScope = GLOBAL_COUNTRY_SCOPE,
) {
  const user = await getCurrentUser();
  if (!user) return { userId: "", trips: [] as TripWebRecord[], error: "AUTH_REQUIRED" };

  const [publicResult, myResult, directResult, approvedMembershipResult] = await Promise.all([
    rpcRequest<Row[]>("get_public_trips"),
    rpcRequest<Row[]>("get_my_trips"),
    restSelect<Row[]>("trips", "select=*&order=created_at.desc&limit=120"),
    // This table is the source of truth used by the app/chat after an organizer
    // approves a Trip request. Use it as a fallback in case get_my_trips is
    // stale or returns a reduced projection.
    restSelect<Row[]>(
      "trip_join_requests",
      `select=trip_id,status&user_id=eq.${encodeURIComponent(user.id)}&status=eq.approved`,
    ),
  ]);

  if (publicResult.error && myResult.error && directResult.error && approvedMembershipResult.error) {
    return {
      userId: user.id,
      trips: [] as TripWebRecord[],
      error: publicResult.error || myResult.error || directResult.error || approvedMembershipResult.error,
    };
  }

  let merged = mergeRows(
    rowsOf(directResult.data),
    rowsOf(myResult.data),
    rowsOf(publicResult.data),
  );

  const approvedTripIds = new Set(
    rowsOf(approvedMembershipResult.data)
      .map((row) => text(row, "trip_id"))
      .filter(Boolean),
  );

  // A joined/private Trip may be omitted from the public RPC. Fetch only the
  // missing approved ids, then mark all approved rows as My Trips explicitly.
  const knownIds = new Set(merged.map((row) => text(row, "id")).filter(Boolean));
  const missingApprovedIds = [...approvedTripIds].filter((id) => !knownIds.has(id));
  if (missingApprovedIds.length) {
    const joinedResult = await restSelect<Row[]>(
      "trips",
      `select=*&id=in.(${missingApprovedIds.join(",")})`,
    );
    if (!joinedResult.error) {
      merged = mergeRows(merged, rowsOf(joinedResult.data).map((row) => ({ ...row, relation: "joined" })), []);
    }
  }

  merged = merged.map((row) => {
    const id = text(row, "id");
    if (!approvedTripIds.has(id)) return row;
    return { ...row, __my: true, is_joined: true, relation: text(row, "relation") || "joined" };
  });

  const organizerIds = merged.map((row) => text(row, "organizer_id")).filter(Boolean);
  const profiles = await loadProfileMap(organizerIds);

  const trips = merged
    .map((row) =>
      normalizeTrip(
        row,
        profiles.get(text(row, "organizer_id")),
        user.id,
      ),
    )
    .filter((trip) => Boolean(trip.id))
    .filter((trip) => trip.lifecycle !== "cancelled" && trip.lifecycle !== "completed")
    .filter(
      (trip) =>
        countryScope === GLOBAL_COUNTRY_SCOPE ||
        !trip.country ||
        matchesCountryScope(trip.country, countryScope),
    )
    .sort((a, b) => {
      const aStart = lifecycleTimestamp(a.startDate);
      const bStart = lifecycleTimestamp(b.startDate);
      const aUpcoming = Number.isFinite(aStart) && aStart >= Date.now();
      const bUpcoming = Number.isFinite(bStart) && bStart >= Date.now();
      if (aUpcoming !== bUpcoming) return aUpcoming ? -1 : 1;

      const popularity = b.memberCount - a.memberCount;
      if (popularity) return popularity;

      return (b.createdAt || "").localeCompare(a.createdAt || "");
    });

  return { userId: user.id, trips, error: null };
}

function mergeDetail(rpcValue: unknown, directValue: unknown) {
  const rpc = rowsOf(rpcValue)[0] ?? null;
  const direct = rowsOf(directValue)[0] ?? null;
  if (!rpc && !direct) return null;
  return {
    ...(direct ?? {}),
    ...(rpc ?? {}),
    image_path: text(rpc, "image_path") || text(direct, "image_path"),
  } as Row;
}

async function normalizeMembers(rows: Row[]) {
  const userIds = rows
    .map((row) => text(row, "user_id", "id", "profile_id"))
    .filter(Boolean);
  const profiles = await loadProfileMap(userIds);

  return rows
    .map((row) => {
      const id = text(row, "user_id", "id", "profile_id");
      const profile = profiles.get(id);
      return {
        id,
        name:
          text(row, "display_name", "name") ||
          text(profile, "display_name") ||
          "Melo member",
        photoUrl:
          (() => {
            const direct = text(row, "photo_url");
            if (/^https?:\/\//i.test(direct)) return direct;
            const path = text(row, "photo_path", "profile_image_path");
            return path
              ? publicStorageUrl("profile-photos", path)
              : profilePhoto(profile);
          })(),
        role: text(row, "role", "relation"),
      } satisfies TripMemberWeb;
    })
    .filter((member) => Boolean(member.id));
}

export async function loadTripDetailWeb(id: string) {
  const user = await getCurrentUser();
  if (!user) return { detail: null as TripDetailWeb | null, error: "AUTH_REQUIRED" };

  const [
    rpc,
    direct,
    membersResult,
    stopsResult,
    itineraryResult,
    requestResult,
    pendingRequestsResult,
  ] = await Promise.all([
    rpcRequest<Row[]>("get_trip_detail", { p_trip_id: id }),
    restSelect<Row[]>("trips", `select=*&id=eq.${encodeURIComponent(id)}&limit=1`),
    rpcRequest<Row[]>("get_trip_member_profiles", { p_trip_id: id }),
    restSelect<Row[]>(
      "trip_stops",
      `select=*&trip_id=eq.${encodeURIComponent(id)}&order=position.asc`,
    ),
    restSelect<Row[]>(
      "trip_itinerary",
      `select=*&trip_id=eq.${encodeURIComponent(id)}&order=position.asc`,
    ),
    restSelect<Row[]>(
      "trip_join_requests",
      `select=status&trip_id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(user.id)}&limit=1`,
    ),
    restSelect<Row[]>(
      "trip_join_requests",
      `select=id&trip_id=eq.${encodeURIComponent(id)}&status=eq.pending&limit=500`,
    ),
  ]);

  const row = mergeDetail(rpc.data, direct.data);
  if (!row) {
    return { detail: null as TripDetailWeb | null, error: rpc.error || direct.error || "NOT_FOUND" };
  }

  const organizerId = text(row, "organizer_id");
  const organizerProfiles = await loadProfileMap([organizerId]);
  const base = normalizeTrip(row, organizerProfiles.get(organizerId), user.id);
  const members = await normalizeMembers(rowsOf(membersResult.data));
  const requestStatus = text(rowsOf(requestResult.data)[0], "status");

  const detail: TripDetailWeb = {
    ...base,
    memberCount: Math.max(base.memberCount, members.length),
    startLatitude:
      row.start_latitude == null ? null : num(row, "start_latitude"),
    startLongitude:
      row.start_longitude == null ? null : num(row, "start_longitude"),
    destinationLatitude:
      row.destination_latitude == null ? null : num(row, "destination_latitude"),
    destinationLongitude:
      row.destination_longitude == null ? null : num(row, "destination_longitude"),
    stops: rowsOf(stopsResult.data).map((stop, index) => ({
      id: text(stop, "id") || `${id}-stop-${index}`,
      label: text(stop, "label") || `Stop ${index + 1}`,
      latitude: stop.latitude == null ? null : num(stop, "latitude"),
      longitude: stop.longitude == null ? null : num(stop, "longitude"),
      position: num(stop, "position") || index + 1,
    })),
    itinerary: rowsOf(itineraryResult.data).map((item, index) => ({
      id: text(item, "id") || `${id}-plan-${index}`,
      timeLabel: text(item, "time_label"),
      title: text(item, "title") || `Plan ${index + 1}`,
      description: text(item, "description"),
      position: num(item, "position") || index + 1,
    })),
    members,
    requestStatus:
      requestStatus === "pending" ||
      requestStatus === "approved" ||
      requestStatus === "rejected"
        ? requestStatus
        : null,
    isOwner:
      organizerId === user.id ||
      boolValue(row.is_organizer),
    pendingRequestCount: rowsOf(pendingRequestsResult.data).length,
  };

  return { detail, error: null };
}

function parseDateOnly(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!match) return Number.NaN;
  return new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    0, 0, 0, 0,
  ).getTime();
}

type TripScheduleForRequest = Pick<TripWebRecord, "id" | "startDate" | "endDate">;

export async function assertTripScheduleAvailableWeb(detail: TripScheduleForRequest) {
  const start = parseDateOnly(detail.startDate);
  const end = parseDateOnly(detail.endDate || detail.startDate);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return;

  const result = await rpcRequest<Row[]>("get_my_trips");
  if (result.error) throw new Error(result.error);

  const conflict = rowsOf(result.data).find((row) => {
    if (text(row, "id") === detail.id) return false;
    const lifecycle = deriveLifecycle(row);
    if (lifecycle === "cancelled" || lifecycle === "completed") return false;

    const relation = text(row, "relation").toLowerCase();
    if (relation !== "created" && relation !== "joined") return false;

    const theirStart = parseDateOnly(text(row, "start_date"));
    const theirEnd = parseDateOnly(text(row, "end_date") || text(row, "start_date"));
    return (
      Number.isFinite(theirStart) &&
      Number.isFinite(theirEnd) &&
      start <= theirEnd &&
      theirStart <= end
    );
  });

  if (conflict) {
    throw new Error(
      `Schedule overlaps with “${text(conflict, "title") || "another Trip"}”.`,
    );
  }
}

export async function requestToJoinTripWeb(
  detail: TripScheduleForRequest,
  message: string,
) {
  await assertTripScheduleAvailableWeb(detail);
  const actionStartedAt = new Date().toISOString();

  const result = await rpcRequest("request_to_join_trip", {
    p_trip_id: detail.id,
    p_message: message.trim() || null,
  });
  if (result.error) throw new Error(result.error);

  await invokeEdgeFunction("ensure-trip-join-notification", {
    tripId: detail.id,
    actionStartedAt,
  }).catch(() => undefined);
}

export async function cancelTripJoinRequestWeb(tripId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("AUTH_REQUIRED");

  const result = await restDelete(
    "trip_join_requests",
    `trip_id=eq.${encodeURIComponent(tripId)}&user_id=eq.${encodeURIComponent(user.id)}&status=eq.pending`,
  );
  if (result.error) throw new Error(result.error);
}

export async function leaveTripWeb(tripId: string) {
  const reset = await rpcRequest("melo_leave_activity_reset_attendance_v1", {
    p_activity_type: "trip",
    p_activity_id: tripId,
  });

  if (!reset.error) return;

  const normalized = reset.error.toLowerCase();
  const missing =
    normalized.includes("could not find the function") ||
    normalized.includes("schema cache") ||
    normalized.includes("pgrst202");

  if (!missing) throw new Error(reset.error);

  const fallback = await rpcRequest("leave_trip", { p_trip_id: tripId });
  if (fallback.error) throw new Error(fallback.error);
}
