'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useLocale } from './SiteProviders';
import { authCopy } from '@/i18n/authUi';
import { getCurrentUser, getStoredSession, isSupabaseConfigured, publicStorageUrl, restSelect, rpcRequest, signOut } from '@/lib/supabase/browser';
import accountStyles from './HeaderAccount.module.css';
import { loadFriendSnapshot } from '@/components/connect/connectData';
import { loadChatUnreadTotal } from '@/components/chat/chatData';
import ChatDrawer from '@/components/chat/ChatDrawer';
import VerifiedUserAvatar from '@/components/profile/VerifiedUserAvatar';
import { COUNTRY_PICKER_COUNTRIES, GLOBAL_COUNTRY_SCOPE, countryPickerLabel, countryScopeFlag, countryScopeLabel, matchesCountryScope, type CountryScope } from '@/lib/discoveryCountry';
import { switchToPartnerMode } from '@/components/partner/partnerModeWeb';
import { loadTripsWeb } from '@/components/trips/tripWebData';
import { loadEventsWeb } from '@/components/events/eventWebData';

type HeaderUser = {
  id?: string;
  email?: string;
};


type HeaderSearchSuggestion = {
  id: string;
  kind: "person" | "trip" | "event" | "community" | "partner";
  title: string;
  subtitle: string;
  imageUrl: string;
  imageFallbackUrl?: string;
  href: string;
  country: string;
};

type HeaderSearchRow = Record<string, any>;

type HeaderNotification = {
  id: string;
  title: string;
  body: string;
  href: string;
  createdAt: string;
  unread: boolean;
  imageUrl: string;
  avatarLabel: string;
  userId: string;
};


function searchText(row: HeaderSearchRow, ...keys: string[]) {
  for (const key of keys) {
    const value = row?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function searchRows(value: unknown): HeaderSearchRow[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is HeaderSearchRow =>
      Boolean(item) && typeof item === "object" && !Array.isArray(item),
  );
}

function searchActivityImage(row: HeaderSearchRow) {
  const direct = searchText(row, "image_url", "cover_url", "photo_url");
  if (/^https?:\/\//i.test(direct)) return direct;
  const path = searchText(row, "image_path");
  return path ? publicStorageUrl("activity-images", path) : "";
}

function searchCommunityRawImage(row: HeaderSearchRow) {
  let raw = searchText(
    row,
    "image_path",
    "community_image_path",
    "profile_image_path",
    "avatar_path",
    "main_image_path",
    "cover_image_path",
    "cover_path",
    "image_url",
    "community_image_url",
    "profile_image_url",
    "avatar_url",
    "cover_image_url",
    "cover_url",
    "photo_url",
    "thumbnail_url",
  );
  if (!raw) {
    for (const key of ["image_paths", "community_images", "images", "photos"]) {
      const value = row?.[key];
      if (Array.isArray(value)) {
        const first = value.map(String).find((item) => item.trim());
        if (first) { raw = first.trim(); break; }
      }
    }
  }
  return raw;
}

function searchCommunityImage(row: HeaderSearchRow) {
  const raw = searchCommunityRawImage(row);
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  const normalized = raw.replace(/^\/+/, "");
  if (normalized.startsWith("community-images/")) {
    return publicStorageUrl("community-images", normalized.slice("community-images/".length));
  }
  if (normalized.startsWith("activity-images/")) {
    return publicStorageUrl("activity-images", normalized.slice("activity-images/".length));
  }
  // Web/Android community covers are normally stored in activity-images.
  return publicStorageUrl("activity-images", normalized);
}

function searchCommunityImageFallback(row: HeaderSearchRow) {
  const raw = searchCommunityRawImage(row);
  if (!raw || /^https?:\/\//i.test(raw)) return "";
  const normalized = raw.replace(/^\/+/, "");
  if (normalized.startsWith("community-images/")) {
    return publicStorageUrl("activity-images", normalized.slice("community-images/".length));
  }
  if (normalized.startsWith("activity-images/")) {
    return publicStorageUrl("community-images", normalized.slice("activity-images/".length));
  }
  return publicStorageUrl("community-images", normalized);
}

function mergeSearchRows(
  publicValue: unknown,
  directValue: unknown,
  idKeys: string[] = ["id"],
) {
  const map = new Map<string, HeaderSearchRow>();

  for (const row of searchRows(directValue)) {
    const id = searchText(row, ...idKeys);
    if (id) map.set(id, { ...row });
  }

  for (const row of searchRows(publicValue)) {
    const id = searchText(row, ...idKeys);
    if (!id) continue;
    const merged = { ...(map.get(id) ?? {}) } as HeaderSearchRow;
    for (const [key, value] of Object.entries(row)) {
      if (value === null || value === undefined || value === "") continue;
      if (Array.isArray(value) && value.length === 0) continue;
      merged[key] = value;
    }
    map.set(id, merged);
  }

  return [...map.values()];
}

function searchProfileImage(row: HeaderSearchRow) {
  const direct = searchText(row, "photo_url", "avatar_url");
  if (/^https?:\/\//i.test(direct)) return direct;

  const paths = Array.isArray(row.photo_paths)
    ? row.photo_paths.map(String).filter(Boolean)
    : [];
  const path = paths[0] || searchText(row, "photo_path", "profile_image_path");
  return path ? publicStorageUrl("profile-photos", path) : "";
}

function searchBusinessImage(row: HeaderSearchRow) {
  const direct = searchText(row, "image_url", "logo_url", "photo_url");
  if (/^https?:\/\//i.test(direct)) return direct;
  const path = searchText(
    row,
    "profile_image_path",
    "logo_path",
    "image_path",
    "cover_image_path",
  );
  return path ? publicStorageUrl("business-images", path) : "";
}

function notificationMeta(row: HeaderSearchRow) {
  for (const key of ['data', 'payload', 'metadata', 'meta']) {
    const candidate = row?.[key];
    if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) return candidate as HeaderSearchRow;
  }
  return {} as HeaderSearchRow;
}

function notificationUnread(row: HeaderSearchRow) {
  if (row.is_read === false || row.read === false || row.seen === false) return true;
  if (row.read_at === null || row.seen_at === null) {
    if (Object.prototype.hasOwnProperty.call(row, 'read_at') || Object.prototype.hasOwnProperty.call(row, 'seen_at')) return true;
  }
  return false;
}

function notificationHref(row: HeaderSearchRow) {
  const meta = notificationMeta(row);
  const raw = notificationSourceText(row);
  const explicitActivityType = (
    searchText(meta, 'activity_type', 'context_type', 'entity_type') ||
    searchText(row, 'activity_type', 'context_type', 'entity_type')
  ).toLowerCase();

  // Prefer an explicit internal web route when the notification producer
  // already supplied one. Never forward notification data to an external URL.
  const resolvedHref = searchText(row, '_notification_href');
  if (resolvedHref.startsWith('/') && !resolvedHref.startsWith('//')) return resolvedHref;

  const explicitHref = searchText(
    meta,
    'href',
    'web_href',
    'web_path',
    'path',
    'route',
    'target_path',
  ) || searchText(
    row,
    'href',
    'web_href',
    'web_path',
    'path',
    'route',
    'target_path',
  );
  if (explicitHref.startsWith('/') && !explicitHref.startsWith('//')) return explicitHref;

  const tripId = searchText(meta, 'trip_id') || searchText(row, 'trip_id');
  const eventId = searchText(meta, 'event_id') || searchText(row, 'event_id');
  const communityId = searchText(meta, 'community_id') || searchText(row, 'community_id');
  const postId = searchText(meta, 'post_id', 'feed_post_id') || searchText(row, 'post_id', 'feed_post_id');
  const genericActivityId = searchText(meta, 'activity_id', 'context_id', 'entity_id') || searchText(row, 'activity_id', 'context_id', 'entity_id');
  const resolvedTripId = tripId || ((explicitActivityType === 'trip' || raw.includes('trip')) ? genericActivityId : '');
  const resolvedEventId = eventId || ((explicitActivityType === 'event' || raw.includes('event')) ? genericActivityId : '');
  const resolvedCommunityId = communityId || ((explicitActivityType === 'community' || raw.includes('community')) ? genericActivityId : '');
  const resolvedPostId = postId || (raw.includes('post') ? genericActivityId : '');

  // Safety notifications should open Safety Center, not the old Home-page
  // #safety marketing anchor. If a Live Location session id is available,
  // open the exact shared-location detail page.
  if (raw.includes('sos') || raw.includes('live location') || raw.includes('live_location')) {
    const sessionId = searchText(
      meta,
      'session_id',
      'live_session_id',
      'live_location_id',
      'trusted_live_location_id',
      'share_session_id',
    ) || searchText(
      row,
      'session_id',
      'live_session_id',
      'live_location_id',
      'trusted_live_location_id',
      'share_session_id',
    );
    if (sessionId) {
      const sourceRaw = (
        searchText(meta, 'source', 'live_source', 'session_source', 'context_type', 'activity_type') ||
        searchText(row, 'source', 'live_source', 'session_source', 'context_type', 'activity_type')
      ).toLowerCase();
      const source = sourceRaw.includes('activity') || sourceRaw.includes('trip') || sourceRaw.includes('event') ? 'activity' : 'friend';
      return `/safety/live/${source}/${encodeURIComponent(sessionId)}`;
    }
    return '/safety?tab=friends';
  }

  // A trip join-request notification is actionable from the dedicated request
  // screen. Other trip/event/community notifications open their exact entity.
  if ((raw.includes('join') || raw.includes('request')) && raw.includes('trip') && resolvedTripId) {
    return `/trips/${resolvedTripId}/requests`;
  }
  if ((raw.includes('trip') || explicitActivityType === 'trip') && resolvedTripId) return `/trips/${resolvedTripId}`;
  if ((raw.includes('event') || explicitActivityType === 'event') && resolvedEventId) return `/events/${resolvedEventId}`;
  if ((raw.includes('community') || explicitActivityType === 'community') && resolvedCommunityId) return `/community/${resolvedCommunityId}`;

  // Feed notifications belong to the Social Feed. The post id remains in the
  // URL so the feed can use it when/if focused-post handling is available.
  if (raw.includes('post') && resolvedPostId) return `/feed?post=${encodeURIComponent(resolvedPostId)}`;
  if (raw.includes('post')) return '/feed';

  if (raw.includes('friend') || raw.includes('connection') || raw.includes('friend_request')) return '/friends';
  if (raw.includes('match') || raw.includes('love') || raw.includes('dating')) return '/love';
  if (raw.includes('reputation') || raw.includes('review') || raw.includes('rating')) return '/reputation';

  return '/account';
}

function notificationTitle(row: HeaderSearchRow, locale: string) {
  const direct = searchText(row, 'title', 'subject', 'heading') || searchText(notificationMeta(row), 'title', 'subject', 'heading');
  if (direct) return direct;
  const raw = `${searchText(row, 'type', 'notification_type', 'kind', 'event_type')} ${searchText(notificationMeta(row), 'type', 'notification_type', 'kind', 'activity_type', 'entity_type')}`.toLowerCase();
  const labels = {
    th: raw.includes('trip') ? 'การแจ้งเตือนทริป' : raw.includes('community') ? 'การแจ้งเตือนคอมมูนิตี้' : raw.includes('event') || raw.includes('activity') ? 'การแจ้งเตือนอีเวนต์' : 'การแจ้งเตือน',
    en: raw.includes('trip') ? 'Trip update' : raw.includes('community') ? 'Community update' : raw.includes('event') || raw.includes('activity') ? 'Event update' : 'Notification',
    de: raw.includes('trip') ? 'Trip-Update' : raw.includes('community') ? 'Community-Update' : raw.includes('event') || raw.includes('activity') ? 'Event-Update' : 'Benachrichtigung',
    zh: raw.includes('trip') ? '行程通知' : raw.includes('community') ? '社区通知' : raw.includes('event') || raw.includes('activity') ? '活动通知' : '通知',
    ja: raw.includes('trip') ? 'Trip通知' : raw.includes('community') ? 'コミュニティ通知' : raw.includes('event') || raw.includes('activity') ? 'Event通知' : '通知',
    ko: raw.includes('trip') ? '여행 알림' : raw.includes('community') ? '커뮤니티 알림' : raw.includes('event') || raw.includes('activity') ? '이벤트 알림' : '알림',
  } as Record<string, string>;
  return labels[locale] ?? labels.en;
}

function notificationBody(row: HeaderSearchRow) {
  return searchText(row, 'body', 'message', 'text', 'content', 'description') || searchText(notificationMeta(row), 'body', 'message', 'text', 'content', 'description');
}

function notificationSourceText(row: HeaderSearchRow) {
  const meta = notificationMeta(row);
  return [
    searchText(row, 'type', 'notification_type', 'kind', 'event_type'),
    searchText(meta, 'type', 'notification_type', 'kind', 'activity_type', 'entity_type'),
    searchText(row, 'title', 'subject', 'heading'),
    searchText(meta, 'title', 'subject', 'heading'),
    searchText(row, 'body', 'message', 'text', 'content', 'description'),
    searchText(meta, 'body', 'message', 'text', 'content', 'description'),
  ].join(' ').toLowerCase();
}

function notificationActorInlineImage(row: HeaderSearchRow) {
  const meta = notificationMeta(row);
  const direct = searchText(
    row,
    '_notification_actor_photo_url',
    'actor_avatar_url',
    'actor_photo_url',
    'sender_avatar_url',
    'sender_photo_url',
    'requester_avatar_url',
    'requester_photo_url',
    'reporter_avatar_url',
    'reporter_photo_url',
    'attendee_avatar_url',
    'attendee_photo_url',
    'participant_avatar_url',
    'participant_photo_url',
    'member_avatar_url',
    'member_photo_url',
    'liker_avatar_url',
    'liker_photo_url',
    'reviewer_avatar_url',
    'reviewer_photo_url',
  ) || searchText(
    meta,
    '_notification_actor_photo_url',
    'actor_avatar_url',
    'actor_photo_url',
    'sender_avatar_url',
    'sender_photo_url',
    'requester_avatar_url',
    'requester_photo_url',
    'reporter_avatar_url',
    'reporter_photo_url',
    'attendee_avatar_url',
    'attendee_photo_url',
    'participant_avatar_url',
    'participant_photo_url',
    'member_avatar_url',
    'member_photo_url',
    'liker_avatar_url',
    'liker_photo_url',
    'reviewer_avatar_url',
    'reviewer_photo_url',
  );
  if (/^https?:\/\//i.test(direct)) return direct;
  if (direct) return publicStorageUrl('profile-photos', direct.replace(/^\/+/, '').replace(/^profile-photos\//, ''));

  const path = searchText(
    row,
    'actor_photo_path',
    'sender_photo_path',
    'requester_photo_path',
    'reporter_photo_path',
    'attendee_photo_path',
    'participant_photo_path',
    'member_photo_path',
    'liker_photo_path',
    'reviewer_photo_path',
  ) || searchText(
    meta,
    'actor_photo_path',
    'sender_photo_path',
    'requester_photo_path',
    'reporter_photo_path',
    'attendee_photo_path',
    'participant_photo_path',
    'member_photo_path',
    'liker_photo_path',
    'reviewer_photo_path',
  );
  if (!path) return '';
  return publicStorageUrl('profile-photos', path.replace(/^\/+/, '').replace(/^profile-photos\//, ''));
}

function notificationProfileImage(row: HeaderSearchRow) {
  const meta = notificationMeta(row);
  const direct = searchText(
    row,
    '_notification_actor_photo_url',
    'actor_avatar_url',
    'actor_photo_url',
    'sender_avatar_url',
    'sender_photo_url',
    'requester_avatar_url',
    'requester_photo_url',
    'reporter_avatar_url',
    'reporter_photo_url',
    'attendee_avatar_url',
    'attendee_photo_url',
    'member_avatar_url',
    'member_photo_url',
    'avatar_url',
    'photo_url',
    'profile_photo_url',
    'profile_image_url',
  ) || searchText(
    meta,
    '_notification_actor_photo_url',
    'actor_avatar_url',
    'actor_photo_url',
    'sender_avatar_url',
    'sender_photo_url',
    'requester_avatar_url',
    'requester_photo_url',
    'reporter_avatar_url',
    'reporter_photo_url',
    'attendee_avatar_url',
    'attendee_photo_url',
    'member_avatar_url',
    'member_photo_url',
    'avatar_url',
    'photo_url',
    'profile_photo_url',
    'profile_image_url',
  );
  if (/^https?:\/\//i.test(direct)) return direct;
  if (direct) return publicStorageUrl('profile-photos', direct.replace(/^\/+/, '').replace(/^profile-photos\//, ''));

  const path = searchText(
    row,
    'actor_photo_path',
    'sender_photo_path',
    'requester_photo_path',
    'reporter_photo_path',
    'attendee_photo_path',
    'member_photo_path',
    'photo_path',
    'profile_photo_path',
    'profile_image_path',
  ) || searchText(
    meta,
    'actor_photo_path',
    'sender_photo_path',
    'requester_photo_path',
    'reporter_photo_path',
    'attendee_photo_path',
    'member_photo_path',
    'photo_path',
    'profile_photo_path',
    'profile_image_path',
  );
  if (path) return publicStorageUrl('profile-photos', path.replace(/^\/+/, '').replace(/^profile-photos\//, ''));

  for (const source of [row, meta]) {
    const list = Array.isArray(source?.photo_paths)
      ? source.photo_paths.map(String).filter(Boolean)
      : Array.isArray(source?.photos)
        ? source.photos.map(String).filter(Boolean)
        : [];
    if (list[0]) return publicStorageUrl('profile-photos', list[0].replace(/^\/+/, '').replace(/^profile-photos\//, ''));
  }

  return '';
}

function notificationProfileId(row: HeaderSearchRow) {
  const meta = notificationMeta(row);
  const synthetic = searchText(row, '_notification_actor_id') || searchText(meta, '_notification_actor_id');
  if (synthetic) return synthetic;

  const actorKeys = [
    'actor_profile_id',
    'sender_profile_id',
    'requester_profile_id',
    'from_profile_id',
    'reporter_profile_id',
    'attendee_profile_id',
    'participant_profile_id',
    'member_profile_id',
    'liker_profile_id',
    'reviewer_profile_id',
    'actor_id',
    'sender_id',
    'requester_id',
    'from_user_id',
    'reporter_id',
    'attendee_user_id',
    'participant_user_id',
    'member_user_id',
    'joined_user_id',
    'liker_user_id',
    'reviewer_id',
  ];
  const explicit = searchText(meta, ...actorKeys) || searchText(row, ...actorKeys);
  if (explicit) return explicit;

  const kind = notificationKind(row);
  if (kind === 'sos' || kind === 'live_location') {
    return searchText(meta, 'owner_profile_id', 'owner_id') || searchText(row, 'owner_profile_id', 'owner_id');
  }
  return '';
}

function notificationActorName(row: HeaderSearchRow) {
  const meta = notificationMeta(row);
  return searchText(
    row,
    '_notification_actor_name',
    'actor_name',
    'sender_name',
    'requester_name',
    'reporter_name',
    'attendee_name',
    'participant_name',
    'member_name',
    'liker_name',
    'reviewer_name',
  ) || searchText(
    meta,
    '_notification_actor_name',
    'actor_name',
    'sender_name',
    'requester_name',
    'reporter_name',
    'attendee_name',
    'participant_name',
    'member_name',
    'liker_name',
    'reviewer_name',
    'display_name',
    'full_name',
    'name',
    'user_name',
  );
}

function notificationSessionId(row: HeaderSearchRow) {
  const meta = notificationMeta(row);
  return searchText(
    meta,
    'session_id',
    'live_session_id',
    'live_location_id',
    'trusted_live_location_id',
    'share_session_id',
  ) || searchText(
    row,
    'session_id',
    'live_session_id',
    'live_location_id',
    'trusted_live_location_id',
    'share_session_id',
  );
}

function notificationTimestampMs(row: HeaderSearchRow) {
  const value = searchText(row, 'created_at', 'inserted_at', 'updated_at');
  const time = value ? new Date(value).getTime() : Number.NaN;
  return Number.isFinite(time) ? time : Number.NaN;
}

function trustedNotificationSessionTimestampMs(row: HeaderSearchRow) {
  const value = searchText(row, 'updated_at', 'started_at', 'shared_at', 'created_at');
  const time = value ? new Date(value).getTime() : Number.NaN;
  return Number.isFinite(time) ? time : Number.NaN;
}

function trustedNotificationSessionPhoto(row: HeaderSearchRow) {
  const direct = searchText(row, 'photo_url', 'avatar_url', 'profile_image_url');
  if (/^https?:\/\//i.test(direct)) return direct;
  const list = Array.isArray(row.photo_paths) ? row.photo_paths.map(String).filter(Boolean) : [];
  const raw = direct || list[0] || searchText(row, 'photo_path', 'profile_image_path');
  if (!raw) return '';
  const normalized = raw.replace(/^\/+/, '').replace(/^profile-photos\//, '');
  return publicStorageUrl('profile-photos', normalized);
}

function matchTrustedNotificationSession(
  row: HeaderSearchRow,
  sessions: HeaderSearchRow[],
  currentUserId: string,
) {
  if (!sessions.length) return null;
  const wantedSessionId = notificationSessionId(row);
  const explicitActorId = notificationProfileId(row);
  const actorName = notificationActorName(row).toLocaleLowerCase();

  if (wantedSessionId) {
    const exact = sessions.find((session) => searchText(session, 'id', 'session_id') === wantedSessionId);
    if (exact) return exact;
  }

  if (explicitActorId && explicitActorId !== currentUserId) {
    const exactOwner = sessions.find((session) => searchText(session, 'owner_id') === explicitActorId);
    if (exactOwner) return exactOwner;
  }

  if (actorName) {
    const exactName = sessions.find((session) => searchText(session, 'display_name').toLocaleLowerCase() === actorName);
    if (exactName) return exactName;
  }

  const notificationTime = notificationTimestampMs(row);
  const kind = notificationKind(row);
  const candidates = sessions
    .filter((session) => {
      const ownerId = searchText(session, 'owner_id');
      return Boolean(ownerId) && ownerId !== currentUserId;
    })
    .map((session) => {
      const sessionTime = trustedNotificationSessionTimestampMs(session);
      const distance = Number.isFinite(notificationTime) && Number.isFinite(sessionTime)
        ? Math.abs(notificationTime - sessionTime)
        : Number.POSITIVE_INFINITY;
      const sosActive = headerBool(session, 'sos_active') || Boolean(session?.sos && typeof session.sos === 'object' && headerBool(session.sos as HeaderSearchRow, 'active'));
      const sosBias = kind === 'sos' && sosActive ? -12 * 60 * 60 * 1000 : 0;
      return { session, score: distance + sosBias, distance };
    })
    .sort((a, b) => a.score - b.score);

  const best = candidates[0];
  if (!best) return null;
  // Without an explicit actor/session id, only infer the owner when the Live
  // Location timestamp is reasonably close to the notification. This avoids
  // attaching an old notification to the wrong friend.
  if (Number.isFinite(best.distance) && best.distance > 48 * 60 * 60 * 1000) return null;
  return best.session;
}

async function resolveNotificationActors(rows: HeaderSearchRow[], currentUserId: string) {
  const needsTrustedSessions = rows.some((row) => {
    const kind = notificationKind(row);
    return kind === 'sos' || kind === 'live_location';
  });

  let trustedSessions: HeaderSearchRow[] = [];
  if (needsTrustedSessions) {
    const result = await rpcRequest<HeaderSearchRow[]>('list_trusted_live_locations_shared_with_me_v2');
    if (!result.error) trustedSessions = searchRows(result.data);
  }

  return rows.map((row) => {
    let actorId = notificationProfileId(row);
    let actorName = notificationActorName(row);
    let actorPhotoUrl = notificationActorInlineImage(row);
    let href = '';

    // app_notifications.user_id/profile_id identify the recipient in the
    // common notification schema. Treat them as an actor only when they point
    // at somebody other than the signed-in recipient.
    if (!actorId) {
      const meta = notificationMeta(row);
      const genericUserId = searchText(meta, 'profile_id', 'user_id') || searchText(row, 'profile_id', 'user_id');
      if (currentUserId && genericUserId && genericUserId !== currentUserId) actorId = genericUserId;
    }
    if (actorId === currentUserId) actorId = '';

    const kind = notificationKind(row);
    if (kind === 'sos' || kind === 'live_location') {
      const session = matchTrustedNotificationSession(row, trustedSessions, currentUserId);
      if (session) {
        const ownerId = searchText(session, 'owner_id');
        if (ownerId && ownerId !== currentUserId) actorId = ownerId;
        actorName = searchText(session, 'display_name') || actorName;
        actorPhotoUrl = trustedNotificationSessionPhoto(session) || actorPhotoUrl;
        const sessionId = searchText(session, 'id', 'session_id');
        if (sessionId) href = `/safety/live/friend/${encodeURIComponent(sessionId)}`;
      }
    }

    return {
      ...row,
      ...(actorId ? { _notification_actor_id: actorId } : {}),
      ...(actorName ? { _notification_actor_name: actorName } : {}),
      ...(actorPhotoUrl ? { _notification_actor_photo_url: actorPhotoUrl } : {}),
      ...(href ? { _notification_href: href } : {}),
    } as HeaderSearchRow;
  });
}

function notificationKind(row: HeaderSearchRow) {
  const raw = notificationSourceText(row);
  if (raw.includes('sos')) return 'sos';
  if (raw.includes('live location') || raw.includes('live_location')) return 'live_location';
  if (raw.includes('check-in') || raw.includes('checkin') || raw.includes('check_in') || raw.includes('attendance')) return 'attendance';
  if (raw.includes('like') && raw.includes('post')) return 'post_like';
  if ((raw.includes('join') || raw.includes('request')) && raw.includes('trip')) return 'trip_join';
  if ((raw.includes('join') || raw.includes('attendee')) && raw.includes('event')) return 'event_join';
  if ((raw.includes('join') || raw.includes('member')) && raw.includes('community')) return 'community_join';
  if (raw.includes('trip')) return 'trip';
  if (raw.includes('event') || raw.includes('activity')) return 'event';
  if (raw.includes('community')) return 'community';
  return 'generic';
}

function isChatActivityNotification(row: HeaderSearchRow) {
  const raw = notificationSourceText(row);
  return raw.includes('chat') || raw.includes('message') || raw.includes('conversation') || raw.includes('dm');
}

function notificationAvatarLabel(row: HeaderSearchRow) {
  const actor = notificationActorName(row);
  if (actor) return actor.slice(0, 1).toUpperCase();
  switch (notificationKind(row)) {
    case 'trip_join':
    case 'trip':
      return '✈';
    case 'event_join':
    case 'event':
      return '◇';
    case 'community_join':
    case 'community':
      return '◎';
    case 'post_like':
      return '❤';
    case 'live_location':
      return '⌖';
    case 'attendance':
      return '✓';
    case 'sos':
      return 'SOS';
    default:
      return 'M';
  }
}

async function loadNotificationProfiles(rows: HeaderSearchRow[]) {
  const ids = [...new Set(rows.map(notificationProfileId).filter(Boolean))].slice(0, 20);
  if (!ids.length) return new Map<string, HeaderSearchRow>();
  const query = `select=*&or=(${ids.map((id) => `id.eq.${encodeURIComponent(id)}`).join(',')})`;
  const result = await restSelect<HeaderSearchRow[]>('profiles', query);
  const map = new Map<string, HeaderSearchRow>();
  for (const row of searchRows(result.data)) {
    const id = searchText(row, 'id');
    if (id) map.set(id, row);
  }
  return map;
}

function notificationResolvedTitle(row: HeaderSearchRow, locale: string) {
  const direct = searchText(row, 'title', 'subject', 'heading') || searchText(notificationMeta(row), 'title', 'subject', 'heading');
  if (direct) return direct;
  const actor = notificationActorName(row);
  const kind = notificationKind(row);
  if (kind === 'trip_join') return actor ? `${actor} requested to join your trip` : notificationTitle(row, locale);
  if (kind === 'event_join') return actor ? `${actor} joined your event` : notificationTitle(row, locale);
  if (kind === 'community_join') return actor ? `${actor} joined your community` : notificationTitle(row, locale);
  if (kind === 'post_like') return actor ? `${actor} liked your post` : notificationTitle(row, locale);
  if (kind === 'live_location') return actor ? `${actor} shared Live Location with you` : notificationTitle(row, locale);
  if (kind === 'attendance') {
    const labels = { th: 'เปิดให้เช็กอินแล้ว', en: 'Check-in is open', de: 'Check-in ist geöffnet', zh: '签到已开放', ja: 'Check-in受付中', ko: '체크인이 열렸습니다' } as Record<string, string>;
    return labels[locale] ?? labels.en;
  }
  if (kind === 'sos') return actor ? `${actor} sent SOS` : notificationTitle(row, locale);
  return notificationTitle(row, locale);
}

function notificationResolvedBody(row: HeaderSearchRow, locale: string) {
  const direct = notificationBody(row);
  if (direct) return direct;
  const labels = {
    th: { tripJoin: 'เปิดทริปเพื่อดูและอนุมัติคำขอ', eventJoin: 'อีเวนต์ของคุณมีผู้เข้าร่วมใหม่', communityJoin: 'มีสมาชิกใหม่เข้าร่วมคอมมูนิตี้ของคุณ', postLike: 'เปิดโพสต์เพื่อดูความเคลื่อนไหวล่าสุด', liveLocation: 'แตะเพื่อดูตำแหน่งความปลอดภัยล่าสุด', sos: 'เพื่อนของคุณอาจต้องการความช่วยเหลือ และต้องการให้คุณดูตำแหน่งล่าสุด', attendance: 'ใช้แอป Melo บนมือถือเพื่อเช็กอิน เว็บไม่สามารถเช็กอินได้' },
    en: { tripJoin: 'Open the trip to review the request.', eventJoin: 'Your event has a new attendee.', communityJoin: 'A new member joined your community.', postLike: 'Open the post to see the latest activity.', liveLocation: 'Tap to view the live safety location.', sos: 'Your friend may need help. Open Safety Center to see the latest location.', attendance: 'Use the Melo mobile app to check in. Web check-in is not available.' },
    de: { tripJoin: 'Öffne die Reise, um die Anfrage zu prüfen.', eventJoin: 'Dein Event hat einen neuen Teilnehmer.', communityJoin: 'Ein neues Mitglied ist deiner Community beigetreten.', postLike: 'Öffne den Beitrag, um die neuesten Aktivitäten zu sehen.', liveLocation: 'Tippe, um den Live-Sicherheitsstandort zu sehen.', sos: 'Dein Freund braucht möglicherweise Hilfe. Öffne das Safety Center für den letzten Standort.', attendance: 'Check-in ist nur in der Melo-App möglich. Im Web ist kein Check-in verfügbar.' },
    zh: { tripJoin: '打开旅行以查看并处理该请求。', eventJoin: '你的活动有新的参加者。', communityJoin: '你的社区有新成员加入。', postLike: '打开帖子以查看最新动态。', liveLocation: '点击查看实时安全位置。', sos: '你的朋友可能需要帮助。打开安全中心查看最新位置。', attendance: '请使用 Melo 手机 App 签到，网页版不提供签到功能。' },
    ja: { tripJoin: 'Tripを開いて申請内容を確認してください。', eventJoin: 'あなたのEventに新しい参加者がいます。', communityJoin: 'あなたのCommunityに新しいメンバーが参加しました。', postLike: '投稿を開いて最新のアクティビティを確認してください。', liveLocation: 'タップして最新の安全位置情報を確認します。', sos: '友だちが助けを必要としている可能性があります。Safety Centerで最新位置を確認してください。', attendance: 'MeloモバイルアプリからCheck-inしてください。WebではCheck-inできません。' },
    ko: { tripJoin: '여행을 열어 요청을 검토하세요.', eventJoin: '이벤트에 새 참가자가 생겼습니다.', communityJoin: '커뮤니티에 새 멤버가 참여했습니다.', postLike: '게시물을 열어 최신 활동을 확인하세요.', liveLocation: '탭하여 실시간 안전 위치를 확인하세요.', sos: '친구가 도움이 필요할 수 있습니다. 안전 센터에서 최신 위치를 확인하세요.', attendance: 'Melo 모바일 앱에서 체크인하세요. 웹에서는 체크인할 수 없습니다.' },
  } as Record<string, Record<string, string>>;
  const copy = labels[locale] ?? labels.en;
  switch (notificationKind(row)) {
    case 'trip_join':
      return copy.tripJoin;
    case 'event_join':
      return copy.eventJoin;
    case 'community_join':
      return copy.communityJoin;
    case 'post_like':
      return copy.postLike;
    case 'live_location':
      return copy.liveLocation;
    case 'attendance':
      return copy.attendance;
    case 'sos':
      return copy.sos;
    default:
      return '';
  }
}

function notificationTime(value: string, locale: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const tag = locale === 'th' ? 'th-TH' : locale === 'de' ? 'de-DE' : locale === 'zh' ? 'zh-CN' : locale === 'ja' ? 'ja-JP' : locale === 'ko' ? 'ko-KR' : 'en-US';
  return new Intl.DateTimeFormat(tag, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date);
}

function headerBool(row: HeaderSearchRow, ...keys: string[]) {
  for (const key of keys) {
    const value = row?.[key];
    if (value === true || value === 'true' || value === 1 || value === '1') return true;
    if (value === false || value === 'false' || value === 0 || value === '0') return false;
  }
  return false;
}

function attendanceCandidateTimestamp(value: string) {
  if (!value) return Number.POSITIVE_INFINITY;
  const date = new Date(value);
  const time = date.getTime();
  return Number.isFinite(time) ? time : Number.POSITIVE_INFINITY;
}

async function loadOpenAttendanceHeaderNotifications(locale: string): Promise<HeaderNotification[]> {
  const currentUser = await getCurrentUser();
  if (!currentUser) return [];

  // Use the same normalized membership loaders as Trips / Events pages. They
  // include direct membership-table fallbacks, while get_my_trips/get_my_events
  // can briefly omit a newly approved member and made the check-in alert vanish.
  const [tripsResult, eventsResult] = await Promise.all([
    loadTripsWeb().catch(() => ({ userId: '', trips: [], error: 'LOAD_FAILED' })),
    loadEventsWeb().catch(() => ({ events: [], error: 'LOAD_FAILED' })),
  ]);

  const candidates = [
    ...(tripsResult.trips ?? [])
      .filter((item) => (item.joined || item.createdByMe) && item.lifecycle !== 'completed' && item.lifecycle !== 'cancelled')
      .map((item) => ({
        type: 'trip' as const,
        activityId: item.id,
        title: item.title || 'Trip',
        imageUrl: item.imageUrl || '',
        startsAt: item.startDate || '',
        isOrganizer: Boolean(item.createdByMe),
      })),
    ...(eventsResult.events ?? [])
      .filter((item) => (item.joined || item.createdByMe) && item.lifecycle !== 'completed' && item.lifecycle !== 'cancelled')
      .map((item) => ({
        type: 'event' as const,
        activityId: item.id,
        title: item.title || 'Event',
        imageUrl: item.imageUrl || '',
        startsAt: item.startAt || '',
        isOrganizer: Boolean(item.createdByMe),
      })),
  ]
    .filter((item) => Boolean(item.activityId))
    .sort((a, b) => {
      const now = Date.now();
      return Math.abs(attendanceCandidateTimestamp(a.startsAt) - now) - Math.abs(attendanceCandidateTimestamp(b.startsAt) - now);
    })
    .slice(0, 12);

  if (!candidates.length) return [];

  const labels = ({
    th: { title: 'เปิดให้เช็กอินแล้ว', body: 'ใช้แอป Melo บนมือถือเพื่อเช็กอิน เว็บไม่สามารถเช็กอินได้' },
    en: { title: 'Check-in is open', body: 'Use the Melo mobile app to check in. Web check-in is not available.' },
    de: { title: 'Check-in ist geöffnet', body: 'Check-in ist nur in der Melo-App möglich. Im Web ist kein Check-in verfügbar.' },
    zh: { title: '签到已开放', body: '请使用 Melo 手机 App 签到，网页版不提供签到功能。' },
    ja: { title: 'Check-in受付中', body: 'MeloモバイルアプリからCheck-inしてください。WebではCheck-inできません。' },
    ko: { title: '체크인이 열렸습니다', body: 'Melo 모바일 앱에서 체크인하세요. 웹에서는 체크인할 수 없습니다.' },
  } as Record<string, { title: string; body: string }>)[locale] ?? { title: 'Check-in is open', body: 'Use the Melo mobile app to check in. Web check-in is not available.' };

  const results: Array<HeaderNotification | null> = await Promise.all(candidates.map(async (candidate): Promise<HeaderNotification | null> => {
    // The organizer opens the attendance session and is part of the activity.
    // Do not ask the organizer to check in again from the mobile app.
    if (candidate.isOrganizer) return null;
    let overview = await rpcRequest<HeaderSearchRow | HeaderSearchRow[]>('melo_get_attendance_overview_v2', {
      p_activity_type: candidate.type,
      p_activity_id: candidate.activityId,
    });
    if (overview.error) {
      overview = await rpcRequest<HeaderSearchRow | HeaderSearchRow[]>('get_phase26_attendance_overview', {
        p_activity_type: candidate.type,
        p_activity_id: candidate.activityId,
      });
    }
    if (overview.error) return null;

    const over = Array.isArray(overview.data) ? overview.data[0] : overview.data;
    if (!over || !headerBool(over, 'session_active')) return null;

    let myStatus = searchText(over, 'my_status', 'attendance_status').toLowerCase();
    if (!myStatus) {
      let members = await rpcRequest<HeaderSearchRow[]>('melo_get_attendance_members_v2', {
        p_activity_type: candidate.type,
        p_activity_id: candidate.activityId,
      });
      if (members.error) {
        members = await rpcRequest<HeaderSearchRow[]>('get_phase26_attendance_members', {
          p_activity_type: candidate.type,
          p_activity_id: candidate.activityId,
        });
      }
      if (!members.error) {
        const me = searchRows(members.data).find((row) => searchText(row, 'user_id', 'profile_id') === currentUser.id);
        myStatus = searchText(me ?? {}, 'attendance_status', 'status').toLowerCase();
      }
    }

    if (myStatus === 'checked_in' || myStatus === 'confirmed') return null;

    return {
      id: `attendance-open:${candidate.type}:${candidate.activityId}`,
      title: labels.title,
      body: `${candidate.title} · ${labels.body}`,
      href: candidate.type === 'trip' ? `/trips/${candidate.activityId}` : `/events/${candidate.activityId}`,
      createdAt: searchText(over, 'session_started_at', 'updated_at', 'starts_at') || new Date().toISOString(),
      unread: true,
      imageUrl: candidate.imageUrl,
      avatarLabel: '✓',
      userId: '',
    } satisfies HeaderNotification;
  }));

  return results.filter((item): item is HeaderNotification => item !== null);
}

export function Header() {
  const { t, locale, countryScope, setCountryScope, theme, toggleTheme } = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const [menuOpen, setMenuOpen] = useState(false);
  const [memberMenuOpen, setMemberMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<HeaderSearchSuggestion[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [user, setUser] = useState<HeaderUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [chatDrawerOpen, setChatDrawerOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationItems, setNotificationItems] = useState<HeaderNotification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationRefreshTick, setNotificationRefreshTick] = useState(0);
  const accountRef = useRef<HTMLDivElement>(null);
  const memberMenuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const attendanceNotificationCacheRef = useRef<{ at: number; items: HeaderNotification[] }>({ at: 0, items: [] });
  const auth = authCopy[locale];
  const settingsLabel = ({
    th: 'ตั้งค่า',
    en: 'Settings',
    de: 'Einstellungen',
    zh: '设置',
    ja: '設定',
    ko: '설정',
  } as Record<string, string>)[locale] ?? 'Settings';
  const partnerModeLabel = ({
    th: 'พาร์ทเนอร์',
    en: 'Partner mode',
    de: 'Partner-Modus',
    zh: '合作伙伴模式',
    ja: 'Partnerモード',
    ko: '파트너 모드',
  } as Record<string, string>)[locale] ?? 'Partner mode';
  const notificationCopy = ({
    th: { label: 'การแจ้งเตือน', empty: 'ยังไม่มีการแจ้งเตือน', all: 'ดูทั้งหมด', loading: 'กำลังโหลด...' },
    en: { label: 'Notifications', empty: 'No notifications yet', all: 'View all', loading: 'Loading...' },
    de: { label: 'Benachrichtigungen', empty: 'Noch keine Benachrichtigungen', all: 'Alle ansehen', loading: 'Wird geladen...' },
    zh: { label: '通知', empty: '暂无通知', all: '查看全部', loading: '加载中...' },
    ja: { label: '通知', empty: '通知はまだありません', all: 'すべて見る', loading: '読み込み中...' },
    ko: { label: '알림', empty: '알림이 아직 없습니다', all: '전체 보기', loading: '불러오는 중...' },
  } as Record<string, { label: string; empty: string; all: string; loading: string }>)[locale] ?? { label: 'Notifications', empty: 'No notifications yet', all: 'View all', loading: 'Loading...' };
  const safetyCopy = ({
    th: { label: 'ศูนย์ความปลอดภัย' },
    en: { label: 'Safety Center' },
    de: { label: 'Safety Center' },
    zh: { label: '安全中心' },
    ja: { label: 'セーフティセンター' },
    ko: { label: '안전 센터' },
  } as Record<string, { label: string }>)[locale] ?? { label: 'Safety Center' };
  const themeCopy = ({
    th: { label: 'ธีม', light: 'โหมดสว่าง', dark: 'โหมดมืด' },
    en: { label: 'Theme', light: 'Light mode', dark: 'Dark mode' },
    de: { label: 'Design', light: 'Heller Modus', dark: 'Dunkler Modus' },
    zh: { label: '主题', light: '浅色模式', dark: '深色模式' },
    ja: { label: 'テーマ', light: 'ライトモード', dark: 'ダークモード' },
    ko: { label: '테마', light: '라이트 모드', dark: '다크 모드' },
  } as Record<string, { label: string; light: string; dark: string }>)[locale] ?? { label: 'Theme', light: 'Light mode', dark: 'Dark mode' };
  const searchCopy = ({
    th: { placeholder: 'ค้นหาใน Melo...', label: 'ค้นหา' },
    en: { placeholder: 'Search Melo...', label: 'Search' },
    de: { placeholder: 'Melo durchsuchen...', label: 'Suchen' },
    zh: { placeholder: '搜索 Melo...', label: '搜索' },
    ja: { placeholder: 'Meloを検索...', label: '検索' },
    ko: { placeholder: 'Melo 검색...', label: '검색' },
  } as Record<string, { placeholder: string; label: string }>)[locale] ?? { placeholder: 'Search Melo...', label: 'Search' };
  const liveSearchCopy = ({
    th: { results: 'ผลการค้นหา', all: 'ดูผลลัพธ์ทั้งหมด', empty: 'ไม่พบข้อมูลที่ตรงกัน', people: 'ผู้ใช้', trip: 'ทริป', event: 'กิจกรรม', community: 'คอมมูนิตี้', partner: 'พาร์ทเนอร์' },
    en: { results: 'Search results', all: 'View all results', empty: 'No matching results', people: 'People', trip: 'Trip', event: 'Event', community: 'Community', partner: 'Partner' },
    de: { results: 'Suchergebnisse', all: 'Alle Ergebnisse', empty: 'Keine Treffer', people: 'Personen', trip: 'Reise', event: 'Event', community: 'Community', partner: 'Partner' },
    zh: { results: '搜索结果', all: '查看全部结果', empty: '没有匹配结果', people: '用户', trip: '旅行', event: '活动', community: '社区', partner: '合作伙伴' },
    ja: { results: '検索結果', all: 'すべての結果を見る', empty: '一致する結果がありません', people: 'ユーザー', trip: 'Trip', event: 'Event', community: 'Community', partner: 'Partner' },
    ko: { results: '검색 결과', all: '전체 결과 보기', empty: '일치하는 결과가 없습니다', people: '사람', trip: '여행', event: '이벤트', community: '커뮤니티', partner: '파트너' },
  } as Record<string, { results: string; all: string; empty: string; people: string; trip: string; event: string; community: string; partner: string }>)[locale];

  /*
   * Public / Marketing pages
   *
   * หน้า Landing "/" และหน้า Login "/login"
   * ต้องใช้ Header สำหรับแนะนำเว็บไซต์เสมอ
   * แม้ Browser จะยังมี Supabase session เดิมอยู่ก็ตาม
   *
   * หน้าภายใน เช่น /account, /profile, /admin
   * ยังคงใช้ Member Header ตาม signed-in session เดิม
   */
  const isPublicAuthPage =
    pathname === '/' ||
    pathname === '/login' ||
    pathname.startsWith('/login/');

  const signedIn =
    authChecked &&
    Boolean(user) &&
    !isPublicAuthPage;

  const authPending =
    !authChecked &&
    !isPublicAuthPage;

  const memberMain = ({
    th: { menu: 'เมนู', home: 'หน้าหลัก', connect: 'คอนเนค', deals: 'ดีลพิเศษ', partners: 'พาร์ทเนอร์', profile: 'โปรไฟล์', chats: 'แชท', trips: 'ทริป', events: 'กิจกรรม', communities: 'คอมมูนิตี้' },
    en: { menu: 'Menu', home: 'Home', connect: 'Connect', deals: 'Special Deals', partners: 'Partners', profile: 'Profile', chats: 'Chats', trips: 'Trips', events: 'Events', communities: 'Communities' },
    de: { menu: 'Menü', home: 'Startseite', connect: 'Connect', deals: 'Spezialangebote', partners: 'Partner', profile: 'Profil', chats: 'Chats', trips: 'Reisen', events: 'Events', communities: 'Communities' },
    zh: { menu: '菜单', home: '首页', connect: 'Connect', deals: '特别优惠', partners: '合作伙伴', profile: '个人资料', chats: '聊天', trips: '旅行', events: '活动', communities: '社区' },
    ja: { menu: 'メニュー', home: 'ホーム', connect: 'Connect', deals: '特別オファー', partners: 'パートナー', profile: 'プロフィール', chats: 'チャット', trips: 'Trip', events: 'Event', communities: 'Community' },
    ko: { menu: '메뉴', home: '홈', connect: 'Connect', deals: '특별 딜', partners: '파트너', profile: '프로필', chats: '채팅', trips: '여행', events: '이벤트', communities: '커뮤니티' },
  } as Record<string, { menu: string; home: string; connect: string; deals: string; partners: string; profile: string; chats: string; trips: string; events: string; communities: string }>)[locale];

  const close = () => {
    setMenuOpen(false);
    setMemberMenuOpen(false);
    setAccountOpen(false);
    setNotificationOpen(false);
  };

  async function openPartnerMode() {
    close();
    try {
      await switchToPartnerMode();
    } catch (error) {
      console.warn('[Melo Chat] Unable to switch to Partner mode.', error);
    }
    router.push('/partner');
  }

  const notificationUnreadCount = useMemo(() => notificationItems.filter((item) => item.unread).length, [notificationItems]);

  useEffect(() => {
    if (!signedIn) {
      setNotificationItems([]);
      setNotificationsLoading(false);
      attendanceNotificationCacheRef.current = { at: 0, items: [] };
      return;
    }

    let active = true;

    async function loadHeaderNotifications() {
      setNotificationsLoading(true);
      const result = await restSelect<HeaderSearchRow[]>('app_notifications', 'select=*&order=created_at.desc&limit=24');
      if (!active) return;
      const rawRows = searchRows(result.data).filter((row) => !isChatActivityNotification(row));
      const rows = await resolveNotificationActors(rawRows, user?.id ?? '');
      if (!active) return;
      const profiles = await loadNotificationProfiles(rows);
      if (!active) return;
      const backendItems = rows.map((row, index) => {
        const profile = profiles.get(notificationProfileId(row) || '') ?? null;
        const profileImage = profile ? notificationProfileImage(profile) : '';
        const rowImage = notificationActorInlineImage(row);
        return {
          id: searchText(row, 'id') || `notification-${index}`,
          title: notificationResolvedTitle(row, locale),
          body: notificationResolvedBody(row, locale),
          href: notificationHref(row),
          createdAt: searchText(row, 'created_at', 'inserted_at', 'updated_at'),
          unread: notificationUnread(row),
          imageUrl: rowImage || profileImage,
          avatarLabel: notificationAvatarLabel(profile || row),
          userId: notificationProfileId(row),
        } satisfies HeaderNotification;
      });

      const now = Date.now();
      if (now - attendanceNotificationCacheRef.current.at >= 30000) {
        const items = await loadOpenAttendanceHeaderNotifications(locale).catch(() => []);
        if (!active) return;
        attendanceNotificationCacheRef.current = { at: now, items };
      }
      const backendAttendanceHrefs = new Set(rows.filter((row) => notificationKind(row) === 'attendance').map(notificationHref));
      const attendanceItems = attendanceNotificationCacheRef.current.items.filter((item) => !backendAttendanceHrefs.has(item.href));
      setNotificationItems([...attendanceItems, ...backendItems]);
      setNotificationsLoading(false);
    }

    void loadHeaderNotifications();
    const timer = window.setInterval(() => {
      void loadHeaderNotifications();
    }, 30000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [locale, signedIn, notificationRefreshTick, user?.id]);

  useEffect(() => {
    if (countryScope === GLOBAL_COUNTRY_SCOPE) return;
    if (COUNTRY_PICKER_COUNTRIES.some((country) => country.code === countryScope)) return;
    setCountryScope(GLOBAL_COUNTRY_SCOPE);
  }, [countryScope, setCountryScope]);

  useEffect(() => {
    let active = true;

    async function syncAuth() {
      if (!isSupabaseConfigured()) {
        if (active) {
          setUser(null);
          setAuthChecked(true);
        }
        return;
      }

      // Use the locally cached Supabase session as an immediate UI hint.
      // getCurrentUser() still validates/refreshes the session afterwards.
      const cachedSession = getStoredSession();
      if (active && cachedSession?.access_token && cachedSession.user) {
        setUser(cachedSession.user);
        setAuthChecked(true);
      }

      const currentUser = await getCurrentUser();
      if (!active) return;
      setUser(currentUser);
      setAuthChecked(true);
    }

    void syncAuth();

    const onAuthChanged = () => void syncAuth();
    window.addEventListener('melo-auth-changed', onAuthChanged);
    window.addEventListener('storage', onAuthChanged);

    return () => {
      active = false;
      window.removeEventListener('melo-auth-changed', onAuthChanged);
      window.removeEventListener('storage', onAuthChanged);
    };
  }, []);

  useEffect(() => {
    const openChatDrawer = () => setChatDrawerOpen(true);
    window.addEventListener('melo-open-business-chat', openChatDrawer as EventListener);
    window.addEventListener('melo-open-activity-chat', openChatDrawer as EventListener);
    window.addEventListener('melo-open-direct-chat', openChatDrawer as EventListener);
    return () => {
      window.removeEventListener('melo-open-business-chat', openChatDrawer as EventListener);
      window.removeEventListener('melo-open-activity-chat', openChatDrawer as EventListener);
      window.removeEventListener('melo-open-direct-chat', openChatDrawer as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!signedIn) {
      setChatUnreadCount(0);
      return;
    }

    let active = true;
    let loadingUnread = false;

    async function refreshChatUnread() {
      if (loadingUnread) return;
      loadingUnread = true;
      try {
        const total = await loadChatUnreadTotal();
        if (active) setChatUnreadCount(total);
      } finally {
        loadingUnread = false;
      }
    }

    const initialTimer = window.setTimeout(() => void refreshChatUnread(), 250);
    const pollTimer = window.setInterval(() => void refreshChatUnread(), 30000);
    const onFocus = () => void refreshChatUnread();
    const onVisibility = () => {
      if (document.visibilityState === "visible") void refreshChatUnread();
    };
    const onUnreadChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ total?: number }>).detail;
      if (typeof detail?.total === "number" && Number.isFinite(detail.total)) {
        setChatUnreadCount(Math.max(0, detail.total));
        return;
      }
      void refreshChatUnread();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("melo-chat-unread-changed", onUnreadChanged as EventListener);

    return () => {
      active = false;
      window.clearTimeout(initialTimer);
      window.clearInterval(pollTimer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("melo-chat-unread-changed", onUnreadChanged as EventListener);
    };
  }, [signedIn]);

  useEffect(() => {
    if (!accountOpen && !memberMenuOpen && !notificationOpen) return;

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (accountOpen && accountRef.current && !accountRef.current.contains(target)) {
        setAccountOpen(false);
      }
      if (memberMenuOpen && memberMenuRef.current && !memberMenuRef.current.contains(target)) {
        setMemberMenuOpen(false);
      }
      if (notificationOpen && notificationRef.current && !notificationRef.current.contains(target)) {
        setNotificationOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setAccountOpen(false);
        setMemberMenuOpen(false);
        setNotificationOpen(false);
      }
    }

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [accountOpen, memberMenuOpen, notificationOpen]);


  useEffect(() => {
    if (!signedIn) {
      setSearchSuggestions([]);
      setSearchOpen(false);
      return;
    }

    const clean = searchQuery.trim();
    if (clean.length < 2) {
      setSearchSuggestions([]);
      setSearchLoading(false);
      return;
    }

    let active = true;
    const timer = window.setTimeout(() => {
      void (async () => {
        setSearchLoading(true);

        const [
          friendsResult,
          tripsResult,
          eventsResult,
          communitiesResult,
          partnersResult,
          directTripsResult,
          directEventsResult,
          directCommunitiesResult,
          directProfilesResult,
        ] = await Promise.all([
          loadFriendSnapshot().catch(() => ({ candidates: [], requests: [], connections: [] })),
          rpcRequest<HeaderSearchRow[]>("get_public_trips"),
          rpcRequest<HeaderSearchRow[]>("get_public_events"),
          rpcRequest<HeaderSearchRow[]>("get_communities"),
          rpcRequest<HeaderSearchRow[]>("melo_public_businesses"),
          restSelect<HeaderSearchRow[]>("trips", "select=id,title,destination,category,country,image_path&limit=120"),
          restSelect<HeaderSearchRow[]>("events", "select=id,title,venue_name,city,category,country,image_path&limit=120"),
          restSelect<HeaderSearchRow[]>("communities", "select=*&limit=120"),
          restSelect<HeaderSearchRow[]>("profiles", "select=id,display_name,city,country,nationality,photo_paths&limit=120"),
        ]);

        if (!active) return;

        const q = clean.toLocaleLowerCase();

        const friendPeople: HeaderSearchSuggestion[] = friendsResult.candidates.map((person) => ({
          id: person.userId,
          kind: "person",
          title: person.displayName,
          subtitle: [person.city, person.country].filter(Boolean).join(" · "),
          imageUrl: person.photoUrl,
          href: `/users/${person.userId}`,
          country: person.country || person.nationality || "",
        }));

        const profilePeople: HeaderSearchSuggestion[] = searchRows(directProfilesResult.data).map((row) => ({
          id: searchText(row, "id"),
          kind: "person",
          title: searchText(row, "display_name") || "Melo member",
          subtitle: [searchText(row, "city"), searchText(row, "country", "nationality")].filter(Boolean).join(" · "),
          imageUrl: searchProfileImage(row),
          href: `/users/${searchText(row, "id")}`,
          country: searchText(row, "country", "nationality"),
        }));

        const peopleMap = new Map<string, HeaderSearchSuggestion>();
        for (const item of [...profilePeople, ...friendPeople]) {
          if (item.id) peopleMap.set(item.id, item);
        }
        const people = [...peopleMap.values()];

        const mergedTrips = mergeSearchRows(
          tripsResult.data,
          directTripsResult.data,
          ["id", "trip_id"],
        );
        const mergedEvents = mergeSearchRows(
          eventsResult.data,
          directEventsResult.data,
          ["id", "event_id"],
        );
        const mergedCommunities = mergeSearchRows(
          communitiesResult.data,
          directCommunitiesResult.data,
          ["id", "community_id"],
        );

        const trips: HeaderSearchSuggestion[] = mergedTrips.map((row, index) => {
          const id = searchText(row, "id", "trip_id") || `trip-${index}`;
          return {
            id,
            kind: "trip",
            title: searchText(row, "title", "trip_name", "name") || "Trip",
            subtitle: [searchText(row, "destination", "destination_city", "city"), searchText(row, "category")].filter(Boolean).join(" · "),
            imageUrl: searchActivityImage(row),
            href: `/trips/${id}`,
            country: searchText(row, "country", "destination_country", "country_name", "country_code"),
          };
        });

        const events: HeaderSearchSuggestion[] = mergedEvents.map((row, index) => {
          const id = searchText(row, "id", "event_id") || `event-${index}`;
          return {
            id,
            kind: "event",
            title: searchText(row, "title", "event_name", "name") || "Event",
            subtitle: [searchText(row, "venue_name", "venue_city", "city"), searchText(row, "category")].filter(Boolean).join(" · "),
            imageUrl: searchActivityImage(row),
            href: `/events/${id}`,
            country: searchText(row, "country", "country_name", "country_code"),
          };
        });

        const communities: HeaderSearchSuggestion[] = mergedCommunities.map((row, index) => {
          const id = searchText(row, "id", "community_id") || `community-${index}`;
          return {
            id,
            kind: "community",
            title: searchText(row, "title", "community_name", "name") || "Community",
            subtitle: searchText(row, "category", "category_key"),
            imageUrl: searchCommunityImage(row),
            imageFallbackUrl: searchCommunityImageFallback(row),
            href: `/community/${id}`,
            country: searchText(row, "country", "country_name", "country_code"),
          };
        });

        const partners: HeaderSearchSuggestion[] = searchRows(partnersResult.data).map((row, index) => {
          const id = searchText(row, "id", "business_id") || `partner-${index}`;
          return {
            id,
            kind: "partner",
            title: searchText(row, "business_name", "display_name", "name") || "Partner",
            subtitle: [searchText(row, "category_name", "category"), searchText(row, "city")].filter(Boolean).join(" · "),
            imageUrl: searchBusinessImage(row),
            href: `/partners/${id}`,
            country: searchText(row, "country", "country_name", "country_code"),
          };
        });

        const next = [...people, ...trips, ...events, ...communities, ...partners]
          .filter((item) => {
            const haystack = `${item.title} ${item.subtitle} ${item.country}`.toLocaleLowerCase();
            if (!haystack.includes(q)) return false;
            return (
              countryScope === GLOBAL_COUNTRY_SCOPE ||
              !item.country ||
              matchesCountryScope(item.country, countryScope)
            );
          })
          .slice(0, 7);

        setSearchSuggestions(next);
        setSearchLoading(false);
        setSearchOpen(true);
      })();
    }, 240);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [searchQuery, signedIn, countryScope]);

  function searchKindLabel(kind: HeaderSearchSuggestion["kind"]) {
    if (kind === "person") return liveSearchCopy.people;
    if (kind === "trip") return liveSearchCopy.trip;
    if (kind === "event") return liveSearchCopy.event;
    if (kind === "community") return liveSearchCopy.community;
    return liveSearchCopy.partner;
  }


  useEffect(() => {
    if (!searchOpen) return;

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Element | null;
      if (!target?.closest(`.${accountStyles.headerSearchWrap}`)) {
        setSearchOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setSearchOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [searchOpen]);


  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const clean = searchQuery.trim();
    if (!clean) return;
    setSearchOpen(false);
    close();
    router.push(`/search?q=${encodeURIComponent(clean)}`);
  }

  async function logout() {
    await signOut();
    setUser(null);
    close();
    router.push('/');
    router.refresh();
  }

  const email = user?.email ?? '';
  const initial = (email || 'M').slice(0, 1).toUpperCase();
  return (
    <>
    <header className={`siteHeader ${signedIn ? 'memberSiteHeader' : ''}`}>
      <div
        className={`headerInner shell ${signedIn ? accountStyles.memberHeaderInner : ""}`}
        style={
          signedIn
            ? {
                width: "min(1320px, calc(100% - 34px))",
                maxWidth: "none",
                marginInline: "auto",
                paddingInline: 0,
              }
            : undefined
        }
      >
        <Link href={authPending ? "#" : signedIn ? "/account" : "/"} className="brand" onClick={close}>
          <Image src="/melo-logo.png" alt="Melo Chat" width={42} height={42} priority />
          <span>Melo Chat</span>
        </Link>

        <nav className={`desktopNav ${signedIn ? accountStyles.memberNav : ''} ${menuOpen ? 'mobileOpen' : ''}`} aria-label="Primary navigation">
          {authPending ? (
            <div className={accountStyles.authNavSkeleton} aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          ) : signedIn ? (
            <>
              <div className={accountStyles.memberMenuWrap} ref={memberMenuRef}>
                <button
                  type="button"
                  className={`${accountStyles.memberMenuButton} ${memberMenuOpen ? accountStyles.memberMenuButtonOpen : ''}`}
                  onClick={() => {
                    setMemberMenuOpen((open) => !open);
                    setAccountOpen(false);
                  }}
                  aria-expanded={memberMenuOpen}
                  aria-haspopup="menu"
                >
                  <span>☰</span>
                  {memberMain.menu}
                  <b>⌄</b>
                </button>
                {memberMenuOpen && (
                  <div className={accountStyles.memberSubmenu} role="menu">
                    <Link href="/connect" onClick={close} role="menuitem"><span>☺</span>{memberMain.connect}</Link>
                    <Link href="/deals" onClick={close} role="menuitem"><span>%</span>{memberMain.deals}</Link>
                    <Link href="/partners" onClick={close} role="menuitem"><span>⌂</span>{memberMain.partners}</Link>
                    <Link href="/trips" onClick={close} role="menuitem"><span>✈</span>{memberMain.trips}</Link>
                    <Link href="/events" onClick={close} role="menuitem"><span>◇</span>{memberMain.events}</Link>
                    <Link href="/community" onClick={close} role="menuitem"><span>◎</span>{memberMain.communities}</Link>
                  </div>
                )}
              </div>
              <Link href="/account" onClick={close}>{memberMain.home}</Link>
              <Link href="/profile" onClick={close}>{memberMain.profile}</Link>
              <button
                type="button"
                onClick={() => {
                  close();
                  setChatDrawerOpen(true);
                }}
                className={`${accountStyles.chatNavLink} ${accountStyles.chatNavButton}`}
                aria-haspopup="dialog"
                aria-expanded={chatDrawerOpen}
              >
                <span>{memberMain.chats}</span>
                {chatUnreadCount > 0 ? (
                  <b className={accountStyles.chatNavBadge} aria-label={`${chatUnreadCount} ${memberMain.chats}`}>
                    {chatUnreadCount > 99 ? "99+" : chatUnreadCount}
                  </b>
                ) : null}
              </button>
            </>
          ) : (
            <>
              <Link href="/#features" onClick={close}>{t('nav.features')}</Link>
              <Link href="/#safety" onClick={close}>{t('nav.safety')}</Link>
              <Link href="/#partner" onClick={close}>{t('nav.partner')}</Link>
              <Link className="navDownload" href="/#download" onClick={close}>{t('nav.download')}</Link>
            </>
          )}

          {!signedIn && authChecked && (
            <Link className="mobileLoginLink" href="/login" onClick={close}>{auth.login}</Link>
          )}

          {signedIn && (
            <div className={accountStyles.mobileAccountMenu}>
              <form className={accountStyles.mobileSearch} onSubmit={submitSearch} role="search">
                <span>⌕</span>
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder={searchCopy.placeholder}
                  aria-label={searchCopy.label}
                />
              </form>
              <div className={accountStyles.mobileIdentity}>
                <span className={accountStyles.mobileAvatar}>⚙</span>
                <div>
                  <strong>{settingsLabel}</strong>
                  {email && <small>{email}</small>}
                </div>
              </div>
              <button type="button" className={accountStyles.mobilePartnerModeButton} onClick={() => void openPartnerMode()}><span>▣</span>{partnerModeLabel}</button>
              <Link href="/settings" onClick={close}>{settingsLabel}</Link>
              <button
                type="button"
                className={accountStyles.mobileThemeButton}
                onClick={toggleTheme}
              >
                <span>{theme === 'dark' ? '☀' : '☾'}</span>
                <span>{themeCopy.label}</span>
                <small>{theme === 'dark' ? themeCopy.dark : themeCopy.light}</small>
              </button>
              <button type="button" className={accountStyles.mobileLogout} onClick={logout}>{auth.logout}</button>
            </div>
          )}
        </nav>

        <div className={`headerTools ${signedIn ? accountStyles.memberHeaderTools : ""}`}>
          {authPending && (
            <div className={accountStyles.authToolsSkeleton} aria-hidden="true">
              <span className={accountStyles.authSearchSkeleton} />
              <span className={accountStyles.authControlSkeleton} />
              <span className={accountStyles.authIconSkeleton} />
            </div>
          )}
          {signedIn && (
            <div className={accountStyles.headerSearchWrap}>
              <form className={accountStyles.headerSearch} onSubmit={submitSearch} role="search">
                <span aria-hidden="true">⌕</span>
                <input
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    setSearchOpen(true);
                  }}
                  onFocus={() => {
                    if (searchQuery.trim().length >= 2) setSearchOpen(true);
                  }}
                  placeholder={searchCopy.placeholder}
                  aria-label={searchCopy.label}
                  autoComplete="off"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    className={accountStyles.clearSearch}
                    onClick={() => {
                      setSearchQuery("");
                      setSearchSuggestions([]);
                      setSearchOpen(false);
                    }}
                    aria-label="Clear"
                  >
                    ×
                  </button>
                ) : null}
              </form>

              {searchOpen && searchQuery.trim().length >= 2 ? (
                <div className={accountStyles.searchDropdown}>
                  <div className={accountStyles.searchDropdownHead}>
                    <strong>{liveSearchCopy.results}</strong>
                    {searchLoading ? <span className={accountStyles.searchSpinner}>↻</span> : null}
                  </div>

                  {searchSuggestions.length ? (
                    <div className={accountStyles.searchSuggestionList}>
                      {searchSuggestions.map((item) => (
                        <Link
                          href={item.href}
                          className={accountStyles.searchSuggestionRow}
                          key={`${item.kind}-${item.id}`}
                          onClick={() => {
                            setSearchOpen(false);
                            setSearchQuery("");
                            close();
                          }}
                        >
                          {item.kind === "person" ? (
                            <VerifiedUserAvatar userId={item.id} name={item.title} src={item.imageUrl} country={item.country} className={accountStyles.searchSuggestionImage} shape="rounded" badgeSize={15} alt="" />
                          ) : (
                            <span className={accountStyles.searchSuggestionImage}>
                              {item.imageUrl ? (
                                <img
                                  src={item.imageUrl}
                                  alt=""
                                  data-fallback-src={item.imageFallbackUrl || ""}
                                  onError={(event) => {
                                    const target = event.currentTarget;
                                    const fallback = target.dataset.fallbackSrc || "";
                                    if (fallback && target.src !== fallback) {
                                      target.dataset.fallbackSrc = "";
                                      target.src = fallback;
                                    } else {
                                      target.style.display = "none";
                                    }
                                  }}
                                />
                              ) : (
                                <b>◉</b>
                              )}
                            </span>
                          )}
                          <span className={accountStyles.searchSuggestionCopy}>
                            <strong>{item.title}</strong>
                            <small>{item.subtitle || item.country}</small>
                          </span>
                          <em>{searchKindLabel(item.kind)}</em>
                        </Link>
                      ))}
                    </div>
                  ) : !searchLoading ? (
                    <div className={accountStyles.searchEmpty}>{liveSearchCopy.empty}</div>
                  ) : null}

                  <button
                    type="button"
                    className={accountStyles.searchAllButton}
                    onClick={() => {
                      const clean = searchQuery.trim();
                      if (!clean) return;
                      setSearchOpen(false);
                      router.push(`/search?q=${encodeURIComponent(clean)}`);
                    }}
                  >
                    {liveSearchCopy.all} →
                  </button>
                </div>
              ) : null}
            </div>
          )}
          {signedIn && (
            <label className="countrySelect" aria-label={countryPickerLabel(locale)} title={countryPickerLabel(locale)}>
              <span>{countryScopeFlag(countryScope)}</span>
              <select value={countryScope} onChange={(event) => setCountryScope(event.target.value as CountryScope)}>
                <option value={GLOBAL_COUNTRY_SCOPE}>{countryScopeLabel(GLOBAL_COUNTRY_SCOPE, locale)}</option>
                {COUNTRY_PICKER_COUNTRIES.map((country) => (
                  <option value={country.code} key={country.code}>{country.labels[locale]}</option>
                ))}
              </select>
            </label>
          )}

          {!signedIn && authChecked && <Link className="headerLogin" href="/login">{auth.login}</Link>}

          {signedIn && (
            <div className={accountStyles.notificationWrap} ref={notificationRef}>
              <button
                type="button"
                className={accountStyles.notificationButton}
                title={notificationCopy.label}
                aria-label={notificationUnreadCount > 0 ? `${notificationCopy.label} (${notificationUnreadCount})` : notificationCopy.label}
                aria-expanded={notificationOpen}
                aria-haspopup="menu"
                onClick={() => {
                  const opening = !notificationOpen;
                  setNotificationOpen(opening);
                  if (opening) {
                    attendanceNotificationCacheRef.current.at = 0;
                    setNotificationRefreshTick((tick) => tick + 1);
                  }
                  setAccountOpen(false);
                  setMemberMenuOpen(false);
                }}
              >
                <span className={accountStyles.notificationGlyph}>🔔</span>
                {notificationUnreadCount > 0 ? (
                  <b className={accountStyles.notificationBadge}>
                    {notificationUnreadCount > 99 ? '99+' : notificationUnreadCount}
                  </b>
                ) : null}
              </button>

              {notificationOpen ? (
                <div className={accountStyles.notificationDropdown} role="menu">
                  <div className={accountStyles.notificationDropdownHead}>
                    <strong>{notificationCopy.label}</strong>
                    {notificationsLoading ? <span>{notificationCopy.loading}</span> : null}
                  </div>

                  {notificationItems.length ? (
                    <div className={accountStyles.notificationList}>
                      {notificationItems.map((item) => (
                        <Link
                          href={item.href}
                          key={item.id}
                          className={`${accountStyles.notificationRow} ${item.unread ? accountStyles.notificationRowUnread : ''}`}
                          onClick={() => {
                            setNotificationOpen(false);
                            close();
                          }}
                        >
                          {item.userId ? (
                            <VerifiedUserAvatar userId={item.userId} name={item.title} src={item.imageUrl} className={accountStyles.notificationAvatar} shape="rounded" badgeSize={15} alt="" />
                          ) : (
                            <span className={accountStyles.notificationAvatar} aria-hidden="true">{item.imageUrl ? <img src={item.imageUrl} alt="" /> : <b>{item.avatarLabel}</b>}</span>
                          )}
                          <span className={accountStyles.notificationCopy}>
                            <strong>{item.title}</strong>
                            <small>{item.body || item.title}</small>
                            <time>{notificationTime(item.createdAt, locale)}</time>
                          </span>
                          <span className={accountStyles.notificationStatus} aria-hidden="true">{item.unread ? '•' : ''}</span>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className={accountStyles.notificationEmpty}>
                      {notificationsLoading ? notificationCopy.loading : notificationCopy.empty}
                    </div>
                  )}

                  <button
                    type="button"
                    className={accountStyles.notificationFooterButton}
                    onClick={() => {
                      setNotificationOpen(false);
                      router.push('/account');
                    }}
                  >
                    {notificationCopy.all}
                  </button>
                </div>
              ) : null}
            </div>
          )}

          {signedIn && (
            <Link
              href="/safety"
              className={accountStyles.safetyShortcutButton}
              title={safetyCopy.label}
              aria-label={safetyCopy.label}
              onClick={close}
            >
              <span className={accountStyles.safetyShortcutGlyph}>✚</span>
            </Link>
          )}

          {signedIn && (
            <div className={accountStyles.accountMenuWrap} ref={accountRef}>
              <button
                type="button"
                className={`${accountStyles.accountButton} ${accountStyles.accountButtonIcon}`}
                title={settingsLabel}
                aria-label={settingsLabel}
                onClick={() => { setAccountOpen((open) => !open); setMemberMenuOpen(false); }}
                aria-expanded={accountOpen}
                aria-haspopup="menu"
              >
                <span className={accountStyles.avatar}>⚙</span>
              </button>

              {accountOpen && (
                <div className={accountStyles.dropdown} role="menu">
                  <div className={accountStyles.identity}>
                    <span className={accountStyles.avatarLarge}>{initial}</span>
                    <div>
                      <small>{auth.signedInAs}</small>
                      <strong>{email || 'Melo'}</strong>
                    </div>
                  </div>
                  <div className={accountStyles.divider} />
                  <button type="button" className={accountStyles.partnerModeMenuButton} onClick={() => void openPartnerMode()} role="menuitem"><span>▣</span><strong>{partnerModeLabel}</strong></button>
                  <Link href="/settings" onClick={close} role="menuitem"><span>⚙</span>{settingsLabel}</Link>
                  <button
                    type="button"
                    className={accountStyles.themeMenuButton}
                    onClick={toggleTheme}
                    role="menuitem"
                  >
                    <span>{theme === 'dark' ? '☀' : '☾'}</span>
                    <div className={accountStyles.themeMenuCopy}>
                      <strong>{themeCopy.label}</strong>
                      <small>{theme === 'dark' ? themeCopy.dark : themeCopy.light}</small>
                    </div>
                  </button>
                  <div className={accountStyles.divider} />
                  <button type="button" className={accountStyles.logoutButton} onClick={logout} role="menuitem"><span>↪</span>{auth.logout}</button>
                </div>
              )}
            </div>
          )}

          <button
            className={`menuButton ${menuOpen ? 'isOpen' : ''}`}
            onClick={() => {
              setMenuOpen((open) => !open);
              setAccountOpen(false);
              setMemberMenuOpen(false);
            }}
            aria-label="Menu"
            aria-expanded={menuOpen}
          >
            <span /><span /><span />
          </button>
        </div>
      </div>
    </header>
    {signedIn ? <ChatDrawer open={chatDrawerOpen} onClose={() => setChatDrawerOpen(false)} /> : null}
    </>
  );
}
