"use client";

import {
  getCurrentUser,
  invokeEdgeFunction,
  publicStorageUrl,
  restSelect,
  rpcRequest,
} from "@/lib/supabase/browser";
import {
  GLOBAL_COUNTRY_SCOPE,
  matchesCountryScope,
  type CountryScope,
} from "@/lib/discoveryCountry";

type Row = Record<string, any>;

export type EventWebRecord = {
  id: string;
  title: string;
  description: string;
  category: string;
  imageUrl: string;
  venueName: string;
  city: string;
  country: string;
  startAt: string;
  endAt: string;
  capacity: number;
  attendeeCount: number;
  pricePerPerson: number | null;
  primaryLanguage: string;
  organizerId: string;
  organizerName: string;
  organizerPhotoUrl: string;
  createdByMe: boolean;
  joined: boolean;
  membershipOpen: boolean;
  lifecycle: "upcoming" | "ongoing" | "completed" | "cancelled";
  createdAt: string;
};

function rowsOf(value: unknown): Row[] {
  if (Array.isArray(value)) return value.filter((row): row is Row => Boolean(row) && typeof row === "object");
  if (value && typeof value === "object") return [value as Row];
  return [];
}

function text(row: Row | undefined | null, ...keys: string[]) {
  if (!row) return "";
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function num(row: Row | undefined | null, ...keys: string[]) {
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

function eventImage(row: Row) {
  const direct = text(row, "image_url", "cover_image_url", "photo_url");
  if (/^https?:\/\//i.test(direct)) return direct;
  const path = text(row, "image_path");
  return path ? publicStorageUrl("activity-images", path) : "";
}

function deriveLifecycle(row: Row): EventWebRecord["lifecycle"] {
  const stored = text(row, "lifecycle_status", "status").toLowerCase();
  if (stored === "cancelled" || stored === "canceled") return "cancelled";
  if (stored === "completed" || stored === "ended" || row.archived_at) return "completed";

  const start = new Date(text(row, "start_at", "start_date")).getTime();
  const end = new Date(text(row, "end_at", "end_date") || text(row, "start_at", "start_date")).getTime();
  const now = Date.now();

  if (Number.isFinite(end) && end < now) return "completed";
  if (stored === "ongoing") return "ongoing";
  if (Number.isFinite(start) && start <= now) return "ongoing";
  return "upcoming";
}

function mergeRows(directRows: Row[], myRows: Row[], publicRows: Row[]) {
  const map = new Map<string, Row>();

  for (const row of directRows) {
    const id = text(row, "id");
    if (id) map.set(id, { ...row });
  }

  // Merge public discovery data before personal membership data. Otherwise
  // a public row can overwrite relation/is_joined returned by get_my_events.
  for (const row of publicRows) {
    const id = text(row, "id");
    if (!id) continue;
    const current = map.get(id) ?? {};
    map.set(id, {
      ...current,
      ...row,
      image_path: text(row, "image_path") || text(current, "image_path"),
      __my: current.__my === true,
    });
  }

  for (const row of myRows) {
    const id = text(row, "id");
    if (!id) continue;
    const current = map.get(id) ?? {};
    map.set(id, {
      ...current,
      ...row,
      image_path: text(row, "image_path") || text(current, "image_path"),
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

  if (!result.error && Array.isArray(result.data)) {
    for (const row of result.data) map.set(text(row, "id"), row);
  }
  return map;
}

export async function loadEventsWeb(
  countryScope: CountryScope = GLOBAL_COUNTRY_SCOPE,
) {
  const user = await getCurrentUser();
  if (!user) return { events: [] as EventWebRecord[], error: "AUTH_REQUIRED" };

  const [publicResult, myResult, directResult, attendeeMembershipResult] = await Promise.all([
    rpcRequest<Row[]>("get_public_events"),
    rpcRequest<Row[]>("get_my_events"),
    restSelect<Row[]>("events", "select=*&order=created_at.desc&limit=120"),
    // event_attendees is also used by the chat/mobile fallback and remains the
    // reliable membership source if get_my_events has not refreshed yet.
    restSelect<Row[]>(
      "event_attendees",
      `select=event_id&user_id=eq.${encodeURIComponent(user.id)}`,
    ),
  ]);

  if (publicResult.error && myResult.error && directResult.error && attendeeMembershipResult.error) {
    return {
      events: [] as EventWebRecord[],
      error: publicResult.error || myResult.error || directResult.error || attendeeMembershipResult.error,
    };
  }

  let merged = mergeRows(
    rowsOf(directResult.data),
    rowsOf(myResult.data),
    rowsOf(publicResult.data),
  );

  const joinedEventIds = new Set(
    rowsOf(attendeeMembershipResult.data)
      .map((row) => text(row, "event_id"))
      .filter(Boolean),
  );

  const knownIds = new Set(merged.map((row) => text(row, "id")).filter(Boolean));
  const missingJoinedIds = [...joinedEventIds].filter((id) => !knownIds.has(id));
  if (missingJoinedIds.length) {
    const joinedResult = await restSelect<Row[]>(
      "events",
      `select=*&id=in.(${missingJoinedIds.join(",")})`,
    );
    if (!joinedResult.error) {
      merged = mergeRows(merged, rowsOf(joinedResult.data).map((row) => ({ ...row, relation: "joined" })), []);
    }
  }

  merged = merged.map((row) => {
    const id = text(row, "id");
    if (!joinedEventIds.has(id)) return row;
    return { ...row, __my: true, is_joined: true, relation: text(row, "relation") || "joined" };
  });

  const profiles = await loadProfileMap(
    merged.map((row) => text(row, "organizer_id")).filter(Boolean),
  );

  const events = merged
    .map((row) => {
      const organizerId = text(row, "organizer_id");
      const profile = profiles.get(organizerId);
      const relation = text(row, "relation").toLowerCase();
      const lifecycle = deriveLifecycle(row);
      const country = text(row, "country") || text(profile, "country", "nationality");

      return {
        id: text(row, "id"),
        title: text(row, "title") || "Melo Event",
        description: text(row, "description"),
        category: text(row, "category"),
        imageUrl: eventImage(row),
        venueName: text(row, "venue_name"),
        city: text(row, "city"),
        country,
        startAt: text(row, "start_at", "start_date"),
        endAt: text(row, "end_at", "end_date"),
        capacity: Math.max(0, num(row, "capacity")),
        attendeeCount: Math.max(0, num(row, "attendee_count", "member_count", "current_members")),
        pricePerPerson:
          row.price_per_person == null ? null : num(row, "price_per_person"),
        primaryLanguage: text(row, "primary_language"),
        organizerId,
        organizerName:
          text(row, "organizer_name") ||
          text(profile, "display_name") ||
          "Melo member",
        organizerPhotoUrl: profilePhoto(profile),
        createdByMe:
          organizerId === user.id ||
          relation === "created" ||
          boolValue(row.is_organizer),
        joined:
          relation === "joined" ||
          relation === "created" ||
          boolValue(row.is_joined),
        membershipOpen:
          row.membership_open === undefined
            ? true
            : boolValue(row.membership_open, true),
        lifecycle,
        createdAt: text(row, "created_at"),
      } satisfies EventWebRecord;
    })
    .filter((event) => event.id)
    .filter((event) => event.lifecycle !== "cancelled" && event.lifecycle !== "completed")
    .filter(
      (event) =>
        countryScope === GLOBAL_COUNTRY_SCOPE ||
        !event.country ||
        matchesCountryScope(event.country, countryScope),
    )
    .sort((a, b) => {
      const at = new Date(a.startAt).getTime();
      const bt = new Date(b.startAt).getTime();
      const aUpcoming = Number.isFinite(at) && at >= Date.now();
      const bUpcoming = Number.isFinite(bt) && bt >= Date.now();
      if (aUpcoming !== bUpcoming) return aUpcoming ? -1 : 1;
      const popularity = b.attendeeCount - a.attendeeCount;
      if (popularity) return popularity;
      return (b.createdAt || "").localeCompare(a.createdAt || "");
    });

  return { events, error: null };
}

function eventRange(startAt: string, endAt: string) {
  const start = new Date(startAt).getTime();
  let end = endAt ? new Date(endAt).getTime() : Number.NaN;

  if (!Number.isFinite(end) && Number.isFinite(start)) {
    const legacyEnd = new Date(startAt);
    legacyEnd.setHours(23, 59, 59, 999);
    end = legacyEnd.getTime();
  }

  return { start, end };
}

async function assertEventJoinAvailableWeb(event: EventWebRecord) {
  const proposed = eventRange(event.startAt, event.endAt);
  if (
    !Number.isFinite(proposed.start) ||
    !Number.isFinite(proposed.end) ||
    proposed.end <= proposed.start
  ) {
    throw new Error("Invalid Event schedule.");
  }

  const result = await rpcRequest<Row[]>("get_my_events");
  if (result.error) throw new Error(result.error);

  const conflict = rowsOf(result.data).find((row) => {
    if (text(row, "id") === event.id) return false;

    const relation = text(row, "relation").toLowerCase();
    if (relation !== "created" && relation !== "joined") return false;

    const lifecycle = deriveLifecycle(row);
    if (lifecycle === "cancelled" || lifecycle === "completed") return false;

    const their = eventRange(
      text(row, "start_at", "start_date"),
      text(row, "end_at", "end_date"),
    );

    return (
      Number.isFinite(their.start) &&
      Number.isFinite(their.end) &&
      proposed.start < their.end &&
      their.start < proposed.end
    );
  });

  if (conflict) {
    throw new Error(
      `This time overlaps with “${text(conflict, "title") || "another Event"}”.`,
    );
  }
}

export async function joinEventWeb(event: EventWebRecord) {
  await assertEventJoinAvailableWeb(event);

  const actionStartedAt = new Date().toISOString();
  const result = await rpcRequest("join_event", { p_event_id: event.id });
  if (result.error) throw new Error(result.error);

  // Same Edge Function used by Android activityJoinNotificationService.
  await invokeEdgeFunction("ensure-activity-join-notification", {
    kind: "event",
    activityId: event.id,
    actionStartedAt,
  }).catch(() => undefined);
}
