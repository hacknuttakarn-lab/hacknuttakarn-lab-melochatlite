"use client";

import activityImageFixStyles from "./SafetyActivityImageFix.module.css";

import { loadFriendSnapshot } from "@/components/connect/connectData";
import { loadTripsWeb } from "@/components/trips/tripWebData";
import { loadEventsWeb } from "@/components/events/eventWebData";
import { getCurrentMeloPlace } from "@/components/location/meloLocationWeb";
import {
  getCurrentUser,
  invokeEdgeFunction,
  publicStorageUrl,
  restDelete,
  restSelect,
  restUpsert,
  rpcRequest,
} from "@/lib/supabase/browser";


function ensureSafetyActivityImageFixScope() {
  if (typeof document === "undefined") return;
  document.body.classList.add(activityImageFixStyles.scope);
}

export type SafetyContextType = "trip" | "event";
export type SafetyShareScope = "all_members" | "organizer_only" | "selected_members";

type Row = Record<string, any>;

export type SafetyEmergencyContact = {
  name: string;
  relation: string;
  phone: string;
};

export type SafetyMedicalProfileWeb = {
  userId: string;
  legalFullName: string;
  dateOfBirth: string;
  bloodType: string;
  regularHospital: string;
  medicalConditions: string;
  allergies: string;
  medications: string;
  medicalNotes: string;
  emergencyContacts: SafetyEmergencyContact[];
};

export type SafetyActivityWeb = {
  key: string;
  contextType: SafetyContextType;
  contextId: string;
  title: string;
  imageUrl: string;
  startsAt: string;
  endsAt: string;
  locationLabel: string;
  memberCount: number;
  isOrganizer: boolean;
  checkedInAt: string;
};

export type SafetyLiveSessionWeb = {
  id: string;
  contextType: SafetyContextType;
  contextId: string;
  contextTitle: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  expiresAt: string;
  updatedAt: string;
};

export type SafetyCheckInWeb = {
  id: string;
  contextType: SafetyContextType;
  contextId: string;
  note: string;
  dueAt: string;
  status: "waiting" | "overdue" | "safe" | "cancelled";
  createdAt: string;
};

export type SafetyAlertWeb = {
  id: string;
  contextType: SafetyContextType;
  contextId: string;
  message: string;
  latitude: number;
  longitude: number;
  status: "active" | "resolved";
  createdAt: string;
  resolvedAt: string;
};

export type TrustedLiveTimelinePointWeb = {
  id: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  recordedAt: string;
  label: string;
};

export type TrustedLiveSessionWeb = {
  id: string;
  ownerId: string;
  displayName: string;
  photoUrl: string;
  verified: boolean;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  expiresAt: string;
  updatedAt: string;
  startedAt: string;
  timeline: TrustedLiveTimelinePointWeb[];
  recipientIds: string[];
  recipientNames: string[];
  isOwner: boolean;
  sosActive: boolean;
  sosMessage: string;
  activity: {
    contextType: SafetyContextType;
    contextId: string;
    title: string;
    imageUrl: string;
    startsAt: string;
    endsAt: string;
    locationLabel: string;
    participantCount: number;
  } | null;
};

export type SafetyFriendWeb = {
  userId: string;
  displayName: string;
  city: string;
  country: string;
  photoUrl: string;
};

export type EmergencyShareSettingWeb = {
  contextType: SafetyContextType;
  contextId: string;
  scope: SafetyShareScope;
  selectedUserIds: string[];
  enabled: boolean;
};

export type SafetyDashboardWeb = {
  userId: string;
  displayName: string;
  photoUrl: string;
  nationality: string;
  country: string;
  medical: SafetyMedicalProfileWeb | null;
  shareActivities: SafetyActivityWeb[];
  activities: SafetyActivityWeb[];
  liveLocations: SafetyLiveSessionWeb[];
  checkIns: SafetyCheckInWeb[];
  alerts: SafetyAlertWeb[];
  trustedOwn: TrustedLiveSessionWeb | null;
  trustedReceived: TrustedLiveSessionWeb[];
  activityReceived: TrustedLiveSessionWeb[];
  friends: SafetyFriendWeb[];
  shareSettings: EmergencyShareSettingWeb[];
};

function rows(value: unknown): Row[] {
  if (Array.isArray(value)) return value.filter((item): item is Row => Boolean(item) && typeof item === "object");
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

function numberValue(row: Row | null | undefined, ...keys: string[]) {
  if (!row) return null;
  for (const key of keys) {
    const value = Number(row[key]);
    if (Number.isFinite(value)) return value;
  }
  return null;
}

function booleanValue(row: Row | null | undefined, ...keys: string[]) {
  if (!row) return false;
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "boolean") return value;
    if (value === "true" || value === 1 || value === "1") return true;
    if (value === "false" || value === 0 || value === "0") return false;
  }
  return false;
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? [...new Set(value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map((item) => item.trim()))]
    : [];
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

function activityImage(pathOrUrl: string) {
  const raw = String(pathOrUrl ?? "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  const normalized = raw.replace(/^\/+/, "");
  return normalized.startsWith("activity-images/")
    ? publicStorageUrl("activity-images", normalized.slice("activity-images/".length))
    : publicStorageUrl("activity-images", normalized);
}

function cleanContact(value: unknown): SafetyEmergencyContact | null {
  const row = value && typeof value === "object" ? value as Row : {};
  const contact = {
    name: text(row, "name"),
    relation: text(row, "relation"),
    phone: text(row, "phone"),
  };
  return contact.name || contact.relation || contact.phone ? contact : null;
}

function normalizeMedical(row: Row | null | undefined): SafetyMedicalProfileWeb | null {
  if (!row) return null;
  let contacts = Array.isArray(row.emergency_contacts)
    ? row.emergency_contacts.map(cleanContact).filter((item): item is SafetyEmergencyContact => Boolean(item)).slice(0, 2)
    : [];
  if (!contacts.length) {
    const fallback = cleanContact({
      name: row.emergency_contact_name,
      relation: row.emergency_contact_relation,
      phone: row.emergency_contact_phone,
    });
    if (fallback) contacts = [fallback];
  }
  return {
    userId: text(row, "user_id"),
    legalFullName: text(row, "legal_full_name"),
    dateOfBirth: text(row, "date_of_birth"),
    bloodType: text(row, "blood_type"),
    regularHospital: text(row, "regular_hospital"),
    medicalConditions: text(row, "medical_conditions"),
    allergies: text(row, "allergies"),
    medications: text(row, "medications"),
    medicalNotes: text(row, "medical_notes"),
    emergencyContacts: contacts,
  };
}

function mapLiveSession(row: Row): SafetyLiveSessionWeb | null {
  const id = text(row, "id");
  const contextType = text(row, "context_type") === "event" ? "event" : text(row, "context_type") === "trip" ? "trip" : null;
  if (!id || !contextType) return null;
  return {
    id,
    contextType,
    contextId: text(row, "context_id"),
    contextTitle: text(row, "context_title"),
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    accuracy: numberValue(row, "accuracy"),
    expiresAt: text(row, "expires_at"),
    updatedAt: text(row, "updated_at"),
  };
}

function mapCheckIn(row: Row): SafetyCheckInWeb | null {
  const id = text(row, "id");
  const contextType = text(row, "context_type") === "event" ? "event" : text(row, "context_type") === "trip" ? "trip" : null;
  const status = text(row, "status") as SafetyCheckInWeb["status"];
  if (!id || !contextType) return null;
  return {
    id,
    contextType,
    contextId: text(row, "context_id"),
    note: text(row, "note"),
    dueAt: text(row, "due_at"),
    status: ["waiting", "overdue", "safe", "cancelled"].includes(status) ? status : "waiting",
    createdAt: text(row, "created_at"),
  };
}

function mapAlert(row: Row): SafetyAlertWeb | null {
  const id = text(row, "id");
  const contextType = text(row, "context_type") === "event" ? "event" : text(row, "context_type") === "trip" ? "trip" : null;
  if (!id || !contextType) return null;
  return {
    id,
    contextType,
    contextId: text(row, "context_id"),
    message: text(row, "message"),
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    status: text(row, "status") === "resolved" ? "resolved" : "active",
    createdAt: text(row, "created_at"),
    resolvedAt: text(row, "resolved_at"),
  };
}

function trustedTimeline(row: Row): TrustedLiveTimelinePointWeb[] {
  const raw = row.timeline_points ?? row.timeline ?? row.location_history ?? row.history ?? row.points;
  const points = Array.isArray(raw) ? raw.filter((item): item is Row => Boolean(item) && typeof item === "object") : [];
  const mapped = points.flatMap<TrustedLiveTimelinePointWeb>((point, index) => {
    const latitude = numberValue(point, "latitude", "lat");
    const longitude = numberValue(point, "longitude", "lng", "lon");
    if (latitude == null || longitude == null) return [];
    return [{
      id: text(point, "id") || `${text(point, "recorded_at", "created_at", "updated_at", "captured_at") || index}:${latitude}:${longitude}`,
      latitude,
      longitude,
      accuracy: numberValue(point, "accuracy"),
      recordedAt: text(point, "recorded_at", "captured_at", "created_at", "updated_at", "timestamp", "at"),
      label: text(point, "location_label", "place_name", "address", "label"),
    }];
  });

  const currentLatitude = numberValue(row, "latitude", "lat");
  const currentLongitude = numberValue(row, "longitude", "lng", "lon");
  const currentAt = text(row, "updated_at", "recorded_at");
  if (currentLatitude != null && currentLongitude != null) {
    const duplicate = mapped.some((point) =>
      Math.abs(point.latitude - currentLatitude) < 0.000001
      && Math.abs(point.longitude - currentLongitude) < 0.000001
      && (!currentAt || point.recordedAt === currentAt),
    );
    if (!duplicate) {
      mapped.push({
        id: `latest:${text(row, "id", "session_id") || currentAt}`,
        latitude: currentLatitude,
        longitude: currentLongitude,
        accuracy: numberValue(row, "accuracy"),
        recordedAt: currentAt,
        label: text(row, "location_label", "place_name", "address", "current_location_label"),
      });
    }
  }

  return mapped
    .filter((point) => point.recordedAt || Number.isFinite(point.latitude))
    .sort((a, b) => {
      const aTime = a.recordedAt ? new Date(a.recordedAt).getTime() : 0;
      const bTime = b.recordedAt ? new Date(b.recordedAt).getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, 48);
}

function trustedActivity(row: Row) {
  const source = row.activity && typeof row.activity === "object" ? row.activity as Row : row;
  const contextTypeRaw = text(source, "context_type", "activity_context_type");
  const contextType = contextTypeRaw === "event" ? "event" : contextTypeRaw === "trip" ? "trip" : null;
  const contextId = text(source, "context_id", "activity_context_id");
  if (!contextType || !contextId) return null;
  return {
    contextType: contextType as SafetyContextType,
    contextId,
    title: text(source, "title", "activity_title") || (contextType === "trip" ? "Trip" : "Event"),
    imageUrl: activityImage(text(source, "image_path", "activity_image_path")),
    startsAt: text(source, "starts_at", "activity_starts_at"),
    endsAt: text(source, "ends_at", "activity_ends_at"),
    locationLabel: text(source, "location_label", "activity_location"),
    participantCount: Math.max(0, Number(numberValue(source, "participant_count", "activity_participant_count") ?? 0)),
  };
}

function activityTimestamp(value: string, endOfDay = false) {
  const clean = String(value ?? "").trim();
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

function activityRowIsCurrent(contextType: SafetyContextType, row: Row) {
  const stored = text(row, "lifecycle_status", "status").toLowerCase();
  if (["cancelled", "canceled", "completed", "ended"].includes(stored) || row.archived_at) return false;

  const startRaw = contextType === "trip"
    ? text(row, "start_date", "starts_at")
    : text(row, "start_at", "start_date", "starts_at");
  const endRaw = contextType === "trip"
    ? text(row, "end_date", "ends_at") || startRaw
    : text(row, "end_at", "end_date", "ends_at") || startRaw;
  const start = activityTimestamp(startRaw, false);
  const end = activityTimestamp(endRaw, contextType === "trip");
  const now = Date.now();

  if (Number.isFinite(start) && now < start) return false;
  if (Number.isFinite(end) && now > end) return false;
  if (Number.isFinite(start) || Number.isFinite(end)) return true;
  return stored === "ongoing" || stored === "active";
}

async function ownerHasActivityMembership(
  contextType: SafetyContextType,
  contextId: string,
  ownerId: string,
  activityRow: Row,
  members: Awaited<ReturnType<typeof loadActivityMembersWeb>>,
) {
  if (text(activityRow, "organizer_id", "created_by", "owner_id") === ownerId) return true;
  if (members.some((member) => member.userId === ownerId)) return true;

  const membershipResult = contextType === "trip"
    ? await restSelect<Row[]>(
      "trip_join_requests",
      `select=trip_id,status&trip_id=eq.${encodeURIComponent(contextId)}&user_id=eq.${encodeURIComponent(ownerId)}&status=eq.approved&limit=1`,
    )
    : await restSelect<Row[]>(
      "event_attendees",
      `select=event_id&event_id=eq.${encodeURIComponent(contextId)}&user_id=eq.${encodeURIComponent(ownerId)}&limit=1`,
    );

  if (!membershipResult.error) return rows(membershipResult.data).length > 0;
  return true;
}

async function resolveCurrentSharedActivityWeb(session: TrustedLiveSessionWeb) {
  const attached = session.activity;
  if (!attached?.contextId) {
    return {
      activity: null as TrustedLiveSessionWeb["activity"],
      members: [] as Awaited<ReturnType<typeof loadActivityMembersWeb>>,
    };
  }

  const table = attached.contextType === "trip" ? "trips" : "events";
  const activityResult = await restSelect<Row[]>(
    table,
    `select=*&id=eq.${encodeURIComponent(attached.contextId)}&limit=1`,
  );
  const activityRow = rows(activityResult.data)[0] ?? null;

  if (activityResult.error || !activityRow || !activityRowIsCurrent(attached.contextType, activityRow)) {
    return {
      activity: null as TrustedLiveSessionWeb["activity"],
      members: [] as Awaited<ReturnType<typeof loadActivityMembersWeb>>,
    };
  }

  const members = await loadActivityMembersWeb(attached.contextType, attached.contextId).catch(() => []);
  const ownerIsMember = await ownerHasActivityMembership(
    attached.contextType,
    attached.contextId,
    session.ownerId,
    activityRow,
    members,
  ).catch(() => false);
  if (!ownerIsMember) {
    return {
      activity: null as TrustedLiveSessionWeb["activity"],
      members: [] as Awaited<ReturnType<typeof loadActivityMembersWeb>>,
    };
  }

  const startsAt = attached.contextType === "trip"
    ? text(activityRow, "start_date", "starts_at")
    : text(activityRow, "start_at", "start_date", "starts_at");
  const endsAt = attached.contextType === "trip"
    ? text(activityRow, "end_date", "ends_at") || startsAt
    : text(activityRow, "end_at", "end_date", "ends_at") || startsAt;
  const locationLabel = attached.contextType === "trip"
    ? [text(activityRow, "start_point"), text(activityRow, "destination")].filter(Boolean).join(" → ")
    : [text(activityRow, "venue_name", "location_name"), text(activityRow, "city")].filter(Boolean).join(" · ");
  const imageUrl = activityImage(text(activityRow, "image_url", "cover_image_url", "photo_url", "image_path"));

  return {
    activity: {
      contextType: attached.contextType,
      contextId: attached.contextId,
      title: text(activityRow, "title") || attached.title || (attached.contextType === "trip" ? "Trip" : "Event"),
      imageUrl: imageUrl || attached.imageUrl,
      startsAt: startsAt || attached.startsAt,
      endsAt: endsAt || attached.endsAt,
      locationLabel: locationLabel || attached.locationLabel,
      participantCount: Math.max(
        members.length,
        Number(numberValue(activityRow, "approved_members", "member_count", "current_members", "attendee_count") ?? 0),
        attached.participantCount || 0,
      ),
    } satisfies NonNullable<TrustedLiveSessionWeb["activity"]>,
    members,
  };
}

function mapTrusted(row: Row): TrustedLiveSessionWeb | null {
  const id = text(row, "id", "session_id");
  const ownerId = text(row, "owner_id");
  if (!id || !ownerId) return null;
  const sos = row.sos && typeof row.sos === "object" ? row.sos as Row : {};
  return {
    id,
    ownerId,
    displayName: text(row, "display_name") || "Melo User",
    photoUrl: profilePhoto(row),
    verified: booleanValue(row, "is_verified"),
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    accuracy: numberValue(row, "accuracy"),
    expiresAt: text(row, "expires_at"),
    updatedAt: text(row, "updated_at"),
    startedAt: text(row, "started_at", "shared_at", "created_at") || text(row, "updated_at"),
    timeline: trustedTimeline(row),
    recipientIds: stringArray(row.recipient_ids),
    recipientNames: stringArray(row.recipient_names),
    isOwner: booleanValue(row, "is_owner"),
    sosActive: booleanValue(sos, "active") || booleanValue(row, "sos_active"),
    sosMessage: text(sos, "message") || text(row, "sos_message"),
    activity: trustedActivity(row),
  };
}

async function getAttendanceOverview(contextType: SafetyContextType, contextId: string) {
  const params = {
    p_activity_type: contextType,
    p_activity_id: contextId,
  };

  // Match the current Android Attendance runtime: v4 -> v2 -> legacy.
  const v4 = await rpcRequest<Row | Row[]>("melo_get_attendance_overview_v4", params);
  if (!v4.error) return rows(v4.data)[0] ?? null;

  const v2 = await rpcRequest<Row | Row[]>("melo_get_attendance_overview_v2", params);
  if (!v2.error) return rows(v2.data)[0] ?? null;

  const legacy = await rpcRequest<Row | Row[]>("get_phase26_attendance_overview", params);
  return rows(legacy.data)[0] ?? null;
}

async function getAttendanceMemberState(contextType: SafetyContextType, contextId: string, userId: string) {
  const params = {
    p_activity_type: contextType,
    p_activity_id: contextId,
  };

  // Match Android member lookup compatibility: v4 -> v2 -> legacy.
  let result = await rpcRequest<Row[]>("melo_get_attendance_members_v4", params);
  if (result.error) {
    result = await rpcRequest<Row[]>("melo_get_attendance_members_v2", params);
  }
  if (result.error) {
    result = await rpcRequest<Row[]>("get_phase26_attendance_members", params);
  }
  if (result.error) return null;
  return rows(result.data).find((row) => text(row, "user_id", "profile_id") === userId) ?? null;
}

async function loadSafetyActivities(): Promise<{
  shareActivities: SafetyActivityWeb[];
  checkedInActivities: SafetyActivityWeb[];
}> {
  const [tripResult, eventResult] = await Promise.all([
    loadTripsWeb().catch(() => ({ trips: [] } as any)),
    loadEventsWeb().catch(() => ({ events: [] } as any)),
  ]);

  const shareActivities: SafetyActivityWeb[] = [
    ...(tripResult.trips ?? []).filter((item: any) => item.createdByMe || item.joined).map((item: any) => ({
      key: `trip:${item.id}`,
      contextType: "trip" as const,
      contextId: item.id,
      title: item.title,
      imageUrl: item.imageUrl || "",
      startsAt: item.startDate || "",
      endsAt: item.endDate || item.startDate || "",
      locationLabel: [item.startPoint, item.destination].filter(Boolean).join(" → "),
      memberCount: item.memberCount || 0,
      isOrganizer: Boolean(item.createdByMe),
      checkedInAt: "",
    })),
    ...(eventResult.events ?? []).filter((item: any) => item.createdByMe || item.joined).map((item: any) => ({
      key: `event:${item.id}`,
      contextType: "event" as const,
      contextId: item.id,
      title: item.title,
      imageUrl: item.imageUrl || "",
      startsAt: item.startAt || "",
      endsAt: item.endAt || item.startAt || "",
      locationLabel: [item.venueName, item.city].filter(Boolean).join(" · "),
      memberCount: item.attendeeCount || 0,
      isOrganizer: Boolean(item.createdByMe),
      checkedInAt: "",
    })),
  ].slice(0, 40);

  const currentUser = await getCurrentUser();

  const checkedInResults = await Promise.all(shareActivities.map(async (candidate) => {
    const overview = await getAttendanceOverview(candidate.contextType, candidate.contextId).catch(() => null);
    if (!overview) return null;

    const sessionActive = booleanValue(overview, "session_active");
    let myStatus = text(overview, "my_status", "attendance_status").toLowerCase();
    let checkedInAt = text(overview, "my_checked_in_at");

    // Android parity: the organizer is a participant in their own Trip/Event.
    // Once the organizer opens Attendance, Android treats the organizer as
    // confirmed even when an older runtime still reports "registered" or
    // returns no attendance record for the organizer.
    if (candidate.isOrganizer && sessionActive) {
      myStatus = "confirmed";
    }

    if (
      myStatus !== "checked_in"
      && myStatus !== "confirmed"
      && currentUser?.id
    ) {
      const member = await getAttendanceMemberState(
        candidate.contextType,
        candidate.contextId,
        currentUser.id,
      ).catch(() => null);

      myStatus = text(member, "attendance_status", "status").toLowerCase();
      checkedInAt = checkedInAt || text(member, "checked_in_at", "confirmed_at");

      // Legacy member RPCs can still leave the organizer as registered while
      // the session is open. Normalize it exactly like Android.
      if (candidate.isOrganizer && sessionActive) {
        myStatus = "confirmed";
      }
    }

    if (myStatus !== "checked_in" && myStatus !== "confirmed") return null;

    return {
      ...candidate,
      title: text(overview, "title") || candidate.title,
      startsAt: text(overview, "starts_at") || candidate.startsAt,
      endsAt: text(overview, "ends_at") || candidate.endsAt,
      memberCount: Math.max(candidate.memberCount, Number(numberValue(overview, "member_count") ?? 0)),
      checkedInAt,
    } satisfies SafetyActivityWeb;
  }));

  return {
    shareActivities,
    checkedInActivities: checkedInResults.filter((item): item is SafetyActivityWeb => Boolean(item)),
  };
}

async function loadTrustedOwn() {
  const result = await rpcRequest<Row | Row[]>("get_my_active_trusted_live_location");
  if (result.error) return null;
  const session = rows(result.data).map(mapTrusted).find(Boolean) ?? null;
  if (!session) return null;
  const sosResult = await restSelect<Row[]>("trusted_live_location_sos_states", `select=*&session_id=eq.${encodeURIComponent(session.id)}&active=eq.true&limit=1`);
  const sos = rows(sosResult.data)[0] ?? null;
  return sos ? { ...session, sosActive: booleanValue(sos, "active"), sosMessage: text(sos, "message") } : session;
}

async function loadTrustedReceived() {
  const result = await rpcRequest<Row[]>("list_trusted_live_locations_shared_with_me_v2");
  if (result.error) return [];
  return rows(result.data).map(mapTrusted).filter((item): item is TrustedLiveSessionWeb => Boolean(item));
}

async function loadActivityReceived(activities: SafetyActivityWeb[], currentUserId: string) {
  const groups = await Promise.all(activities.map(async (activity) => {
    const [liveResult, alertResult] = await Promise.all([
      rpcRequest<Row[]>("get_context_live_locations", { p_context_type: activity.contextType, p_context_id: activity.contextId }),
      rpcRequest<Row[]>("get_context_safety_alerts", { p_context_type: activity.contextType, p_context_id: activity.contextId }),
    ]);
    const alerts = rows(alertResult.data).filter((row) => text(row, "status") === "active");
    return rows(liveResult.data).flatMap<TrustedLiveSessionWeb>((row) => {
      const ownerId = text(row, "owner_id");
      if (!ownerId || ownerId === currentUserId || booleanValue(row, "is_me")) return [];
      const ownerAlert = alerts.find((alert) => text(alert, "reporter_id") === ownerId) ?? null;
      return [{
        id: text(row, "id") || `${activity.key}:${ownerId}`,
        ownerId,
        displayName: text(row, "display_name") || "Melo User",
        photoUrl: profilePhoto(row),
        verified: booleanValue(row, "is_verified"),
        latitude: Number(row.latitude),
        longitude: Number(row.longitude),
        accuracy: numberValue(row, "accuracy"),
        expiresAt: text(row, "expires_at"),
        updatedAt: text(row, "updated_at"),
        startedAt: text(row, "started_at", "created_at") || text(row, "updated_at"),
        timeline: trustedTimeline(row),
        recipientIds: [],
        recipientNames: [],
        isOwner: false,
        sosActive: Boolean(ownerAlert),
        sosMessage: text(ownerAlert, "message"),
        activity: {
          contextType: activity.contextType,
          contextId: activity.contextId,
          title: activity.title,
          imageUrl: activity.imageUrl,
          startsAt: activity.startsAt,
          endsAt: activity.endsAt,
          locationLabel: activity.locationLabel,
          participantCount: activity.memberCount,
        },
      }];
    });
  }));
  return groups.flat().sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export type SharedLiveLocationSourceWeb = "friend" | "activity";

export type SharedLiveLocationDetailWeb = {
  session: TrustedLiveSessionWeb;
  members: Awaited<ReturnType<typeof loadActivityMembersWeb>>;
};

export async function loadSharedLiveLocationDetailWeb(
  source: SharedLiveLocationSourceWeb,
  sessionId: string,
): Promise<SharedLiveLocationDetailWeb | null> {
  const user = await getCurrentUser();
  if (!user) throw new Error("AUTH_REQUIRED");

  let sessions: TrustedLiveSessionWeb[] = [];
  if (source === "friend") {
    sessions = await loadTrustedReceived();
  } else {
    const { checkedInActivities } = await loadSafetyActivities();
    sessions = await loadActivityReceived(checkedInActivities, user.id);
  }

  const session = sessions.find((item) => item.id === sessionId) ?? null;
  if (!session) return null;

  const resolvedActivity = await resolveCurrentSharedActivityWeb(session);
  const resolvedSession = {
    ...session,
    activity: resolvedActivity.activity,
  } satisfies TrustedLiveSessionWeb;

  return { session: resolvedSession, members: resolvedActivity.members };
}

export async function loadSafetyCenterWeb(): Promise<SafetyDashboardWeb> {
  ensureSafetyActivityImageFixScope();
  const user = await getCurrentUser();
  if (!user) throw new Error("AUTH_REQUIRED");

  const [profileResult, medicalResult, liveResult, checkInResult, alertResult, trustedOwn, trustedReceived, friendSnapshot, safetyActivities, shareResult] = await Promise.all([
    restSelect<Row[]>("profiles", `select=*&id=eq.${encodeURIComponent(user.id)}&limit=1`),
    restSelect<Row[]>("safety_medical_profiles", `select=*&user_id=eq.${encodeURIComponent(user.id)}&limit=1`),
    rpcRequest<Row[]>("get_my_active_live_locations"),
    rpcRequest<Row[]>("get_my_safety_check_ins"),
    rpcRequest<Row[]>("get_my_active_safety_alerts"),
    loadTrustedOwn(),
    loadTrustedReceived(),
    loadFriendSnapshot().catch(() => ({ candidates: [], requests: [], connections: [] })),
    loadSafetyActivities(),
    restSelect<Row[]>("activity_emergency_shares", "select=context_type,context_id,owner_id,scope,selected_user_ids,enabled,updated_at&enabled=eq.true"),
  ]);
  const activities = safetyActivities.checkedInActivities;
  const activityReceived = await loadActivityReceived(activities, user.id).catch(() => []);

  const profile = rows(profileResult.data)[0] ?? {};
  const medical = normalizeMedical(rows(medicalResult.data)[0] ?? null);
  const liveLocations = rows(liveResult.data).map(mapLiveSession).filter((item): item is SafetyLiveSessionWeb => Boolean(item));
  const checkIns = rows(checkInResult.data).map(mapCheckIn).filter((item): item is SafetyCheckInWeb => Boolean(item));
  const alerts = rows(alertResult.data).map(mapAlert).filter((item): item is SafetyAlertWeb => Boolean(item));
  const friends = (friendSnapshot.connections ?? []).slice(0, 100).map((friend) => ({
    userId: friend.userId,
    displayName: friend.displayName,
    city: friend.city,
    country: friend.country,
    photoUrl: friend.photoUrl,
  }));
  const shareSettings = rows(shareResult.data).flatMap<EmergencyShareSettingWeb>((row) => {
    const contextType = text(row, "context_type") === "event" ? "event" : text(row, "context_type") === "trip" ? "trip" : null;
    const scope = text(row, "scope") as SafetyShareScope;
    if (!contextType || !["all_members", "organizer_only", "selected_members"].includes(scope)) return [];
    return [{
      contextType,
      contextId: text(row, "context_id"),
      scope,
      selectedUserIds: stringArray(row.selected_user_ids),
      enabled: booleanValue(row, "enabled"),
    }];
  });

  return {
    userId: user.id,
    displayName: text(profile, "display_name") || user.email?.split("@")[0] || "Melo User",
    photoUrl: profilePhoto(profile),
    nationality: text(profile, "nationality"),
    country: text(profile, "country"),
    medical,
    shareActivities: safetyActivities.shareActivities,
    activities,
    liveLocations,
    checkIns,
    alerts,
    trustedOwn,
    trustedReceived,
    activityReceived,
    friends,
    shareSettings,
  };
}

export async function saveSafetyMedicalProfileWeb(input: SafetyMedicalProfileWeb) {
  const user = await getCurrentUser();
  if (!user) throw new Error("AUTH_REQUIRED");
  const contacts = input.emergencyContacts.slice(0, 2).filter((contact) => contact.name || contact.relation || contact.phone);
  const primary = contacts[0] ?? { name: "", relation: "", phone: "" };
  const result = await restUpsert<Row[]>("safety_medical_profiles", {
    user_id: user.id,
    legal_full_name: input.legalFullName.trim() || null,
    date_of_birth: input.dateOfBirth.trim() || null,
    blood_type: input.bloodType.trim() || null,
    regular_hospital: input.regularHospital.trim() || null,
    medical_conditions: input.medicalConditions.trim() || null,
    allergies: input.allergies.trim() || null,
    medications: input.medications.trim() || null,
    medical_notes: input.medicalNotes.trim() || null,
    emergency_contacts: contacts.map((contact) => ({
      name: contact.name.trim() || null,
      relation: contact.relation.trim() || null,
      phone: contact.phone.trim() || null,
    })),
    emergency_contact_name: primary.name.trim() || null,
    emergency_contact_relation: primary.relation.trim() || null,
    emergency_contact_phone: primary.phone.trim() || null,
    updated_at: new Date().toISOString(),
  }, "user_id");
  if (result.error) throw new Error(result.error);
}

export async function saveEmergencyShareSettingWeb(
  contextType: SafetyContextType,
  contextId: string,
  scope: SafetyShareScope | null,
  selectedUserIds: string[] = [],
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("AUTH_REQUIRED");
  if (!scope) {
    const result = await restDelete("activity_emergency_shares", `context_type=eq.${contextType}&context_id=eq.${encodeURIComponent(contextId)}&owner_id=eq.${encodeURIComponent(user.id)}`);
    if (result.error) throw new Error(result.error);
    return;
  }
  const compact = scope === "selected_members" ? [...new Set(selectedUserIds.filter((id) => id && id !== user.id))] : [];
  if (scope === "selected_members" && !compact.length) throw new Error("SELECT_MEMBER_REQUIRED");
  const result = await restUpsert("activity_emergency_shares", {
    context_type: contextType,
    context_id: contextId,
    owner_id: user.id,
    scope,
    selected_user_ids: compact,
    enabled: true,
    updated_at: new Date().toISOString(),
  }, "context_type,context_id,owner_id");
  if (result.error) throw new Error(result.error);
}

export async function loadActivityMembersWeb(contextType: SafetyContextType, contextId: string) {
  const result = contextType === "trip"
    ? await rpcRequest<Row[]>("get_trip_member_profiles", { p_trip_id: contextId })
    : await rpcRequest<Row[]>("get_event_attendees", { p_event_id: contextId });
  if (result.error) throw new Error(result.error);
  return rows(result.data).map((row) => ({
    userId: text(row, "user_id", "id"),
    displayName: text(row, "display_name", "name") || "Melo member",
    photoUrl: profilePhoto(row),
    isOrganizer: booleanValue(row, "is_organizer") || text(row, "role") === "organizer",
  })).filter((item) => item.userId);
}

export async function startTrustedLiveLocationWeb(recipientIds: string[], durationMinutes: number, locale: string) {
  const uniqueIds = [...new Set(recipientIds.filter(Boolean))].slice(0, 3);
  if (!uniqueIds.length) throw new Error("SELECT_FRIEND_REQUIRED");
  const place = await getCurrentMeloPlace({ locale, fallbackLabel: "Current location" });
  const result = await rpcRequest<string>("start_trusted_live_location", {
    p_recipient_ids: uniqueIds,
    p_duration_minutes: durationMinutes,
    p_latitude: place.latitude,
    p_longitude: place.longitude,
    p_accuracy: null,
    p_heading: null,
    p_speed: null,
  });
  if (result.error) throw new Error(result.error);
  const sessionId = String(result.data ?? "");
  if (!sessionId) throw new Error("LIVE_LOCATION_START_FAILED");
  await invokeEdgeFunction("ensure-trusted-live-location-share", { sessionId }).catch(() => undefined);
  return sessionId;
}

export async function stopTrustedLiveLocationWeb(sessionId: string) {
  const result = await rpcRequest("stop_trusted_live_location", { p_session_id: sessionId });
  if (result.error) throw new Error(result.error);
}

export async function startActivityLiveLocationWeb(activity: SafetyActivityWeb, durationMinutes: number, locale: string) {
  const place = await getCurrentMeloPlace({ locale, fallbackLabel: "Current location" });
  const result = await rpcRequest<string>("start_live_location", {
    p_context_type: activity.contextType,
    p_context_id: activity.contextId,
    p_duration_minutes: durationMinutes,
    p_latitude: place.latitude,
    p_longitude: place.longitude,
    p_accuracy: null,
    p_heading: null,
    p_speed: null,
  });
  if (result.error) throw new Error(result.error);
  return String(result.data ?? "");
}

export async function stopActivityLiveLocationWeb(sessionId: string) {
  const result = await rpcRequest("stop_live_location", { p_session_id: sessionId });
  if (result.error) throw new Error(result.error);
}

export async function createSafetyCheckInWeb(activity: SafetyActivityWeb, durationMinutes: number, note: string) {
  const result = await rpcRequest<string>("create_safety_check_in", {
    p_context_type: activity.contextType,
    p_context_id: activity.contextId,
    p_duration_minutes: durationMinutes,
    p_note: note.trim() || null,
  });
  if (result.error) throw new Error(result.error);
}

export async function markSafetyCheckInSafeWeb(checkInId: string) {
  const result = await rpcRequest("complete_safety_check_in", { p_check_in_id: checkInId });
  if (result.error) throw new Error(result.error);
}

export async function cancelSafetyCheckInWeb(checkInId: string) {
  const result = await rpcRequest("cancel_safety_check_in", { p_check_in_id: checkInId });
  if (result.error) throw new Error(result.error);
}

export async function updateActiveSafetyLocationsWeb(dashboard: SafetyDashboardWeb, locale: string) {
  if (!dashboard.liveLocations.length && !dashboard.trustedOwn) return;
  const place = await getCurrentMeloPlace({ locale, fallbackLabel: "Current location" });
  await Promise.all([
    ...dashboard.liveLocations.map((session) => rpcRequest("update_live_location", {
      p_session_id: session.id,
      p_latitude: place.latitude,
      p_longitude: place.longitude,
      p_accuracy: null,
      p_heading: null,
      p_speed: null,
    })),
    ...(dashboard.trustedOwn ? [rpcRequest("update_trusted_live_location", {
      p_session_id: dashboard.trustedOwn.id,
      p_latitude: place.latitude,
      p_longitude: place.longitude,
      p_accuracy: null,
      p_heading: null,
      p_speed: null,
    })] : []),
  ]);
}

export async function triggerSafetySosWeb(dashboard: SafetyDashboardWeb, locale: string) {
  const activeAlert = dashboard.alerts.find((alert) => alert.status === "active") ?? null;
  if (activeAlert) return { alreadyActive: true, id: activeAlert.id, source: "activity" as const };

  const live = dashboard.liveLocations[0] ?? null;
  if (live) {
    const result = await rpcRequest<string>("create_safety_alert", {
      p_context_type: live.contextType,
      p_context_id: live.contextId,
      p_latitude: live.latitude,
      p_longitude: live.longitude,
      p_message: "SOS from Safety Center",
    });
    if (result.error) throw new Error(result.error);
    const alertId = String(result.data ?? "");
    await rpcRequest("notify_trusted_live_location_sos_v2", {
      p_alert_id: alertId,
      p_latitude: live.latitude,
      p_longitude: live.longitude,
      p_message: "SOS from Safety Center",
    }).catch(() => undefined);
    return { alreadyActive: false, id: alertId, source: "activity" as const };
  }

  const trusted = dashboard.trustedOwn;
  if (trusted) {
    const result = await rpcRequest<string>("create_trusted_live_location_sos", {
      p_session_id: trusted.id,
      p_latitude: trusted.latitude,
      p_longitude: trusted.longitude,
      p_message: "SOS from trusted Live Location",
    });
    if (result.error) throw new Error(result.error);
    const sosEventId = String(result.data ?? "");
    await invokeEdgeFunction("ensure-trusted-live-sos-notification", {
      sessionId: trusted.id,
      sosEventId,
      latitude: trusted.latitude,
      longitude: trusted.longitude,
      message: "SOS from trusted Live Location",
    }).catch(() => undefined);
    return { alreadyActive: false, id: sosEventId, source: "trusted" as const };
  }

  await getCurrentMeloPlace({ locale, fallbackLabel: "Current location" }).catch(() => null);
  throw new Error("SOS_REQUIRES_LIVE_LOCATION");
}

export async function resolveSafetySosWeb(dashboard: SafetyDashboardWeb) {
  const activeAlert = dashboard.alerts.find((alert) => alert.status === "active") ?? null;
  if (activeAlert) {
    const result = await rpcRequest("resolve_safety_alert", { p_alert_id: activeAlert.id });
    if (result.error) throw new Error(result.error);
    return;
  }
  if (dashboard.trustedOwn?.sosActive) {
    const result = await rpcRequest("resolve_trusted_live_location_sos", { p_session_id: dashboard.trustedOwn.id });
    if (result.error) throw new Error(result.error);
  }
}
