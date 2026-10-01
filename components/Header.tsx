'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useLocale } from './SiteProviders';
import { authCopy } from '@/i18n/authUi';
import { selectableLocales } from '@/i18n/dictionaries';
import { getCurrentUser, getStoredSession, isSupabaseConfigured, publicStorageUrl, restSelect, rpcRequest, signOut } from '@/lib/supabase/browser';
import accountStyles from './HeaderAccount.module.css';
import { loadFriendSnapshot } from '@/components/connect/connectData';
import { loadChatUnreadTotal } from '@/components/chat/chatData';
import ChatDrawer from '@/components/chat/ChatDrawer';
import VerifiedUserAvatar from '@/components/profile/VerifiedUserAvatar';
import PublicLanguageSwitcher from '@/components/public/PublicLanguageSwitcher';
import { COUNTRY_PICKER_COUNTRIES, GLOBAL_COUNTRY_SCOPE, countryPickerLabel, countryScopeFlag, countryScopeLabel, matchesCountryScope, type CountryScope } from '@/lib/discoveryCountry';
import { switchToPartnerMode } from '@/components/partner/partnerModeWeb';
import { loadTripsWeb } from '@/components/trips/tripWebData';
import { loadEventsWeb } from '@/components/events/eventWebData';
import { loadSettingsAccountSnapshot } from '@/components/settings/settingsWebData';
import { loadSocialFeedWeb } from "@/components/feed/socialFeedWebData";
import { subscribeSupportMessages } from '@/lib/supabase/realtime';
import { prepareMeloWebPush } from '@/lib/notificationsWebPush';

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
  isChat: boolean;
  systemSourceKey?: string;
  systemKind?: 'support' | 'verification';
  supportThreadId?: string;
  adminNotice?: { id:string; level:string; subject:string; message:string; createdAt:string; readAt:string };
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

// MELO_CHAT_NOTIFICATION_DRAWER_V1
function isDirectChatNotification(item: HeaderNotification) {
  const href =
    String(
      item.href || "",
    ).toLowerCase();

  const title =
    String(
      item.title || "",
    ).toLowerCase();

  const body =
    String(
      item.body || "",
    ).toLowerCase();

  const combined =
    `${href} ${title} ${body}`;

  return Boolean(
    item.userId &&
      (
        href === "/chat" ||
        href.startsWith("/chat?") ||
        href.startsWith("/chat/") ||
        combined.includes("message") ||
        combined.includes("ข้อความ") ||
        combined.includes("nachricht")
      ),
  );
}

/* MELO_NOTIFICATION_POST_ID_HELPER_V4 */
function notificationResolvedPostId(row: HeaderSearchRow) {
  const meta = notificationMeta(row);

  const directPostId = searchText(
    row,
    "post_id",
    "feed_post_id",
  );

  if (directPostId) {
    return directPostId;
  }

  const metadataPostId = searchText(
    meta,
    "post_id",
    "feed_post_id",
  );

  if (metadataPostId) {
    return metadataPostId;
  }

  const kind = notificationKind(row);

  if (kind === "post_like" || kind === "post_comment") {
    return (
      searchText(
        row,
        "entity_id",
        "activity_id",
        "context_id",
      ) ||
      searchText(
        meta,
        "entity_id",
        "activity_id",
        "context_id",
      )
    );
  }

  return "";
}

/* MELO_FOLLOW_NOTIFICATION_PROFILE_V5 */
function notificationFollowProfileHref(row: HeaderSearchRow) {
  const kind = notificationKind(row);

  const raw = [
    searchText(
      row,
      "type",
      "notification_type",
      "kind",
      "event_type",
      "title",
      "body",
      "message",
    ),
    searchText(
      notificationMeta(row),
      "type",
      "notification_type",
      "kind",
      "activity_type",
      "title",
      "body",
      "message",
    ),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const isFollow =
    kind === "follow" ||
    raw.includes("follow") ||
    raw.includes("ติดตาม");

  if (!isFollow) {
    return "";
  }

  // notificationProfileId represents the actor/profile associated
  // with this notification, i.e. the member who followed you.
  const actorId = notificationProfileId(row);

  if (!actorId) {
    return "";
  }

  return `/users/${encodeURIComponent(actorId)}`;
}

function notificationHref(row: HeaderSearchRow) {
  // Follow notification -> profile of the member who followed you.
  const followProfileHref = notificationFollowProfileHref(row);

  if (followProfileHref) {
    return followProfileHref;
  }

  const meta = notificationMeta(row);
  const raw = notificationSourceText(row);

  // MELO_NOTIFICATION_ROUTING_LITE_V1
  // Melo Chat Lite Connect routes.
  const kind = notificationKind(row);

  if (kind === 'match') {
    return '/connect?tab=connected';
  }

  if (kind === 'likes_you') {
    return '/connect?tab=incoming';
  }

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

  // Melo Chat Lite: likes/comments must open the exact Feed post.
  if (kind === 'post_like' || kind === 'post_comment') {
    return resolvedPostId
      ? `/feed?post=${encodeURIComponent(resolvedPostId)}`
      : '/feed';
  }

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
  if (raw.includes('match') || raw.includes('love') || raw.includes('dating')) return '/connect?tab=connected';
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
  // MELO_NOTIFICATION_SCHEMA_V2
  //
  // New public.notifications schema uses:
  // type, actor_id, post_id, entity_id, metadata, is_read.

  const explicitType = searchText(
    row,
    'type',
    'notification_type',
    'kind',
    'event_type',
  )
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

  const aliases: Record<string, string> = {
    post_like: 'post_like',
    like_post: 'post_like',
    post_liked: 'post_like',

    post_comment: 'post_comment',
    comment_post: 'post_comment',
    post_commented: 'post_comment',
    comment: 'post_comment',

    follow: 'follow',
    profile_follow: 'follow',
    followed: 'follow',

    profile_like: 'likes_you',
    likes_you: 'likes_you',
    like_you: 'likes_you',
    interested: 'likes_you',
    profile_interested: 'likes_you',

    match: 'match',
    matched: 'match',
    profile_match: 'match',

    verification_approved: 'verification_approved',
    identity_approved: 'verification_approved',
    document_approved: 'verification_approved',
    admin_approved: 'verification_approved',

    verification_rejected: 'verification_rejected',
    identity_rejected: 'verification_rejected',
    document_rejected: 'verification_rejected',
    admin_rejected: 'verification_rejected',

    verification_needs_info: 'verification_needs_info',
    verification_more_info: 'verification_needs_info',
    document_needs_info: 'verification_needs_info',
    admin_needs_info: 'verification_needs_info',

    sos: 'sos',
    live_location: 'live_location',
    attendance: 'attendance',
    trip_join: 'trip_join',
    event_join: 'event_join',
    community_join: 'community_join',
    trip: 'trip',
    event: 'event',
    community: 'community',
  };

  if (explicitType && aliases[explicitType]) {
    return aliases[explicitType];
  }

  const raw = notificationSourceText(row);

  if (raw.includes('sos')) return 'sos';

  if (
    raw.includes('live location') ||
    raw.includes('live_location')
  ) {
    return 'live_location';
  }

  if (
    raw.includes('check-in') ||
    raw.includes('checkin') ||
    raw.includes('check_in') ||
    raw.includes('attendance')
  ) {
    return 'attendance';
  }

  if (
    raw.includes('comment') &&
    raw.includes('post')
  ) {
    return 'post_comment';
  }

  if (
    raw.includes('like') &&
    raw.includes('post')
  ) {
    return 'post_like';
  }

  if (
    raw.includes('match') ||
    raw.includes('matched')
  ) {
    return 'match';
  }

  if (
    raw.includes('likes_you') ||
    raw.includes('like you') ||
    raw.includes('profile_like')
  ) {
    return 'likes_you';
  }

  if (
    raw.includes('follow')
  ) {
    return 'follow';
  }

  if (
    (raw.includes('join') || raw.includes('request')) &&
    raw.includes('trip')
  ) {
    return 'trip_join';
  }

  if (
    (raw.includes('join') || raw.includes('attendee')) &&
    raw.includes('event')
  ) {
    return 'event_join';
  }

  if (
    (raw.includes('join') || raw.includes('member')) &&
    raw.includes('community')
  ) {
    return 'community_join';
  }

  if (raw.includes('trip')) return 'trip';

  if (
    raw.includes('event') ||
    raw.includes('activity')
  ) {
    return 'event';
  }

  if (raw.includes('community')) {
    return 'community';
  }

  return explicitType || 'generic';
}

function isSupportNotification(row: HeaderSearchRow) {
  const raw = notificationSourceText(row);
  return raw.includes('support_message_admin') || raw.includes('support_message_user') || raw.includes('support_context');
}

function isChatActivityNotification(row: HeaderSearchRow) {
  if (isSupportNotification(row)) return false;
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

    case 'post_comment':
      return '💬';

    case 'follow':
      return '👤';

    case 'likes_you':
      return '♥';

    case 'match':
      return '♥';

    case 'verification_approved':
      return '✓';

    case 'verification_rejected':
      return '!';

    case 'verification_needs_info':
      return '!';
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
  const direct =
    searchText(
      row,
      'title',
      'subject',
      'heading',
    ) ||
    searchText(
      notificationMeta(row),
      'title',
      'subject',
      'heading',
    );

  if (direct) return direct;

  const actor =
    notificationActorName(row);

  const kind =
    notificationKind(row);

  const names = {
    th: {
      someone: 'มีคน',
    },

    en: {
      someone: 'Someone',
    },

    de: {
      someone: 'Jemand',
    },
  } as Record<
    string,
    {
      someone: string;
    }
  >;

  const language =
    names[locale] ??
    names.en;

  const who =
    actor ||
    language.someone;

  const labels = {
    th: {
      post_like: `${who} ถูกใจโพสต์ของคุณ`,
      post_comment: `${who} แสดงความคิดเห็นในโพสต์ของคุณ`,
      follow: `${who} เริ่มติดตามคุณ`,
      likes_you: `${who} สนใจคุณ`,
      match: actor
        ? `คุณและ ${actor} แมตช์กันแล้ว`
        : 'คุณมี Match ใหม่',
      verification_approved:
        'การยืนยันตัวตนได้รับการอนุมัติแล้ว',
      verification_rejected:
        'การยืนยันตัวตนไม่ได้รับการอนุมัติ',
      verification_needs_info:
        'แอดมินต้องการข้อมูลเพิ่มเติม',
    },

    en: {
      post_like: `${who} liked your post`,
      post_comment: `${who} commented on your post`,
      follow: `${who} followed you`,
      likes_you: `${who} likes you`,
      match: actor
        ? `You matched with ${actor}`
        : 'You have a new match',
      verification_approved:
        'Your verification was approved',
      verification_rejected:
        'Your verification was rejected',
      verification_needs_info:
        'More verification information is required',
    },

    de: {
      post_like: `${who} gefällt dein Beitrag`,
      post_comment: `${who} hat deinen Beitrag kommentiert`,
      follow: `${who} folgt dir jetzt`,
      likes_you: `${who} interessiert sich für dich`,
      match: actor
        ? `Du hast ein Match mit ${actor}`
        : 'Du hast ein neues Match',
      verification_approved:
        'Deine Verifizierung wurde genehmigt',
      verification_rejected:
        'Deine Verifizierung wurde abgelehnt',
      verification_needs_info:
        'Weitere Verifizierungsdaten werden benötigt',
    },
  } as Record<
    string,
    Record<string, string>
  >;

  const copy =
    labels[locale] ??
    labels.en;

  if (copy[kind]) {
    return copy[kind];
  }

  if (kind === 'trip_join') {
    return actor
      ? `${actor} requested to join your trip`
      : notificationTitle(row, locale);
  }

  if (kind === 'event_join') {
    return actor
      ? `${actor} joined your event`
      : notificationTitle(row, locale);
  }

  if (kind === 'community_join') {
    return actor
      ? `${actor} joined your community`
      : notificationTitle(row, locale);
  }

  if (kind === 'live_location') {
    return actor
      ? `${actor} shared Live Location with you`
      : notificationTitle(row, locale);
  }

  if (kind === 'attendance') {
    const attendanceLabels = {
      th: 'เปิดให้เช็กอินแล้ว',
      en: 'Check-in is open',
      de: 'Check-in ist geöffnet',
    } as Record<string, string>;

    return (
      attendanceLabels[locale] ??
      attendanceLabels.en
    );
  }

  if (kind === 'sos') {
    return actor
      ? `${actor} sent SOS`
      : notificationTitle(row, locale);
  }

  return notificationTitle(
    row,
    locale,
  );
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

  const modernKind =
    notificationKind(row);

  const modernLabels = {
    th: {
      post_comment:
        'เปิดโพสต์เพื่อดูความคิดเห็นล่าสุด',
      follow:
        'เปิดโปรไฟล์เพื่อดูข้อมูลสมาชิก',
      likes_you:
        'เปิด Connect เพื่อดูคนที่สนใจคุณ',
      match:
        'คุณสามารถเริ่มแชทกับ Match นี้ได้แล้ว',
      verification_approved:
        'แอดมินตรวจสอบข้อมูลและอนุมัติการยืนยันของคุณแล้ว',
      verification_rejected:
        'เปิดรายละเอียดเพื่อดูสถานะการตรวจสอบจากแอดมิน',
      verification_needs_info:
        'กรุณาตรวจสอบข้อมูลหรือเอกสารที่ต้องส่งเพิ่มเติม',
    },

    en: {
      post_comment:
        'Open the post to view the latest comment.',
      follow:
        'Open the profile to view this member.',
      likes_you:
        'Open Connect to see who likes you.',
      match:
        'You can now start chatting with this match.',
      verification_approved:
        'Admin has reviewed and approved your verification.',
      verification_rejected:
        'Open the details to review the admin decision.',
      verification_needs_info:
        'Please review the information or documents requested by admin.',
    },

    de: {
      post_comment:
        'Öffne den Beitrag, um den neuesten Kommentar zu sehen.',
      follow:
        'Öffne das Profil, um dieses Mitglied anzusehen.',
      likes_you:
        'Öffne Connect, um zu sehen, wer dich mag.',
      match:
        'Du kannst jetzt mit diesem Match chatten.',
      verification_approved:
        'Die Administration hat deine Verifizierung genehmigt.',
      verification_rejected:
        'Öffne die Details, um die Entscheidung zu sehen.',
      verification_needs_info:
        'Bitte prüfe die zusätzlich angeforderten Informationen oder Dokumente.',
    },
  } as Record<
    string,
    Record<string, string>
  >;

  const modernCopy =
    modernLabels[locale] ??
    modernLabels.en;

  if (modernCopy[modernKind]) {
    return modernCopy[modernKind];
  }

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
      isChat: false,
    } satisfies HeaderNotification;
  }));

  return results.filter((item): item is HeaderNotification => item !== null);
}

async function loadDirectSupportReplyNotifications(
  locale: string,
  userId: string,
): Promise<HeaderNotification[]> {
  if (!userId) return [];

  const threadResult = await restSelect<HeaderSearchRow[]>(
    'support_threads',
    `select=id,user_id,status,updated_at&user_id=eq.${encodeURIComponent(userId)}&status=eq.open&order=updated_at.desc&limit=1`,
  ).catch(() => ({ data: null, error: 'support_thread_unavailable' }));

  const thread = searchRows(threadResult.data)[0];
  const threadId = searchText(thread, 'id');
  if (!threadId) return [];

  const messagesResult = await restSelect<HeaderSearchRow[]>(
    'support_messages',
    `select=id,thread_id,sender_role,body,created_at,read_at&thread_id=eq.${encodeURIComponent(threadId)}&sender_role=eq.admin&order=created_at.desc&limit=24`,
  ).catch(() => ({ data: null, error: 'support_messages_unavailable' }));

  const copy = locale === 'th'
    ? { title: 'มีการตอบกลับจาก Melo Chat Support', body: 'ทีมสนับสนุนตอบกลับข้อความของคุณ กดเพื่ออ่าน' }
    : locale === 'de'
      ? { title: 'Antwort von Melo Chat Support', body: 'Das Support-Team hat geantwortet. Tippe hier, um die Nachricht zu lesen.' }
      : { title: 'Reply from Melo Chat Support', body: 'The support team replied to your message. Tap to read it.' };

  return searchRows(messagesResult.data).map((row, index) => ({
    id: `support-direct-${searchText(row, 'id') || `${threadId}-${index}`}`,
    title: copy.title,
    body: copy.body,
    href: '/support/chat',
    createdAt: searchText(row, 'created_at'),
    unread: row.read_at === null || !searchText(row, 'read_at'),
    imageUrl: '/melo-support-logo.png',
    avatarLabel: 'M',
    userId: '',
    isChat: false,
    systemKind: 'support',
    supportThreadId: threadId,
  } satisfies HeaderNotification));
}

export function Header() {
  const { t, locale, setLocale, localeLabels, supportedLocales, countryScope, setCountryScope, theme, toggleTheme } = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const adminArea = pathname.startsWith('/admin');

  const [menuOpen, setMenuOpen] = useState(false);
  const [memberMenuOpen, setMemberMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<HeaderSearchSuggestion[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [user, setUser] = useState<HeaderUser | null>(null);
  const [headerProfileAvatar, setHeaderProfileAvatar] = useState("");
  const [adminReviewAllowed, setAdminReviewAllowed] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [chatDrawerOpen, setChatDrawerOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationItems, setNotificationItems] = useState<HeaderNotification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationRefreshTick, setNotificationRefreshTick] = useState(0);
  const [adminNoticeOpen, setAdminNoticeOpen] = useState<HeaderNotification['adminNotice'] | null>(null);
  const [adminActivityPopup, setAdminActivityPopup] = useState<HeaderNotification | null>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  const memberMenuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const attendanceNotificationCacheRef = useRef<{ at: number; items: HeaderNotification[] }>({ at: 0, items: [] });
  const adminPopupKnownIdsRef = useRef<Set<string>>(new Set());
  const adminPopupReadyRef = useRef(false);

  // MELO_HEADER_ACTIVITY_SOUND_V1
  const notificationKnownIdsRef = useRef<Set<string>>(new Set());
  const notificationSoundReadyRef = useRef(false);
  const auth = authCopy[locale];
  const settingsLabel = ({
    th: 'ตั้งค่า',
    en: 'Settings',
    de: 'Einstellungen',
    zh: '设置',
    ja: '設定',
    ko: '설정',
  } as Record<string, string>)[locale] ?? 'Settings';
  const verifyLabel = ({
    th: 'ยืนยันตัวตน', en: 'Verify', de: 'Verifizieren', zh: 'Verify', ja: 'Verify', ko: 'Verify',
  } as Record<string, string>)[locale] ?? 'Verify';
  const premiumLabel = ({
    th: 'Premium', en: 'Premium', de: 'Premium', zh: 'Premium', ja: 'Premium', ko: 'Premium',
  } as Record<string, string>)[locale] ?? 'Premium';
  const adminReviewLabel = ({
    th: 'Admin Center', en: 'Admin Center', de: 'Admin Center', zh: 'Admin Center', ja: 'Admin Center', ko: 'Admin Center',
  } as Record<string, string>)[locale] ?? 'Admin Review Center';
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
    th: { menu: 'เมนู', home: 'หน้าหลัก', feed: 'ฟีด', connect: 'คอนเนค', deals: 'ดีลพิเศษ', partners: 'พาร์ทเนอร์', profile: 'โปรไฟล์', chats: 'แชท', messenger: 'ข้อความ', trips: 'ทริป', events: 'กิจกรรม', communities: 'คอมมูนิตี้' },
    en: { menu: 'Menu', home: 'Home', feed: 'Feed', connect: 'Connect', deals: 'Special Deals', partners: 'Partners', profile: 'Profile', chats: 'Chats', messenger: 'Messenger', trips: 'Trips', events: 'Events', communities: 'Communities' },
    de: { menu: 'Menü', home: 'Startseite', feed: 'Feed', connect: 'Connect', deals: 'Spezialangebote', partners: 'Partner', profile: 'Profil', chats: 'Chats', messenger: 'Nachrichten', trips: 'Reisen', events: 'Events', communities: 'Communities' },
    zh: { menu: '菜单', home: '首页', feed: '动态', connect: 'Connect', deals: '特别优惠', partners: '合作伙伴', profile: '个人资料', chats: '聊天', messenger: '消息', trips: '旅行', events: '活动', communities: '社区' },
    ja: { menu: 'メニュー', home: 'ホーム', feed: 'フィード', connect: 'Connect', deals: '特別オファー', partners: 'パートナー', profile: 'プロフィール', chats: 'チャット', messenger: 'メッセージ', trips: 'Trip', events: 'Event', communities: 'Community' },
    ko: { menu: '메뉴', home: '홈', feed: '피드', connect: 'Connect', deals: '특별 딜', partners: '파트너', profile: '프로필', chats: '채팅', messenger: '메시지', trips: '여행', events: '이벤트', communities: '커뮤니티' },
  } as Record<string, { menu: string; home: string; feed: string; connect: string; deals: string; partners: string; profile: string; chats: string; messenger: string; trips: string; events: string; communities: string }>)[locale];

  // Partner discovery and Special Deals are temporarily Thailand-only.
  const showThailandDeals = countryScope === 'TH';

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

  const visibleNotificationItems = useMemo(() => {
    if (!adminArea) return notificationItems.filter((item) => !item.href?.startsWith('/admin'));
    return notificationItems.filter((item) => item.href?.startsWith('/admin') || item.adminNotice);
  }, [adminArea, notificationItems]);
  const notificationUnreadCount = useMemo(() => visibleNotificationItems.filter((item) => item.unread).length, [visibleNotificationItems]);

  useEffect(() => {
    if (!signedIn) {
      document.body.classList.remove('meloMemberBottomNavVisible');
      return;
    }

    document.body.classList.add('meloMemberBottomNavVisible');
    return () => {
      document.body.classList.remove('meloMemberBottomNavVisible');
    };
  }, [signedIn]);

  useEffect(() => {
    if (!signedIn) return;
    prepareMeloWebPush();
  }, [signedIn]);

  useEffect(() => {
    if (!signedIn || !adminArea) {
      adminPopupReadyRef.current = false;
      adminPopupKnownIdsRef.current = new Set();
      setAdminActivityPopup(null);
      return;
    }
    const candidates = visibleNotificationItems.filter((item) => item.unread && item.href?.startsWith('/admin'));
    const ids = new Set(candidates.map((item) => item.id));
    if (!adminPopupReadyRef.current) {
      adminPopupReadyRef.current = true;
      adminPopupKnownIdsRef.current = ids;
      return;
    }
    const newest = candidates.find((item) => !adminPopupKnownIdsRef.current.has(item.id));
    adminPopupKnownIdsRef.current = ids;
    if (newest) {
      window.dispatchEvent(new CustomEvent('melo-admin-activity-changed'));
      setAdminActivityPopup(newest);
      window.setTimeout(() => setAdminActivityPopup((current) => current?.id === newest.id ? null : current), 6500);
    }
  }, [signedIn, adminArea, visibleNotificationItems]);

  useEffect(() => {
    if (!signedIn || !adminArea) return undefined;
    const seen = new Set<string>();
    const stop = subscribeSupportMessages((row) => {
      const id = String(row.id || '');
      const role = String(row.sender_role || '');
      if (!id || role !== 'member' || seen.has(id)) return;
      seen.add(id);
      try { void new Audio('/sounds/melo_chat_short_clear_v5.wav').play().catch(() => undefined); } catch {}
      window.dispatchEvent(new CustomEvent('melo-support-unread-changed'));
      setNotificationRefreshTick((v) => v + 1);
    });
    return () => { stop(); };
  }, [signedIn, adminArea]);

  useEffect(() => {
    if (!signedIn || adminArea) return undefined;
    const seen = new Set<string>();
    const stop = subscribeSupportMessages((row) => {
      const id = String(row.id || '');
      const role = String(row.sender_role || '');
      if (!id || role !== 'admin' || seen.has(id)) return;
      seen.add(id);
      try { void new Audio('/sounds/melo_chat_short_clear_v5.wav').play().catch(() => undefined); } catch {}
      window.dispatchEvent(new CustomEvent('melo-support-unread-changed'));
      setNotificationRefreshTick((v) => v + 1);
    });
    return () => { stop(); };
  }, [signedIn, adminArea]);

  useEffect(() => {
    if (!signedIn || !adminArea || typeof window === 'undefined') return;
    const threadId = new URLSearchParams(window.location.search).get('support_thread');
    if (!threadId) return;
    window.sessionStorage.setItem('melo-support-thread', threadId);
    setChatDrawerOpen(true);
  }, [signedIn, adminArea, pathname]);

  useEffect(() => {
    const mobileCompactListingPages = new Set(['/deals', '/partners', '/trips', '/events', '/community']);
    if (signedIn && mobileCompactListingPages.has(pathname)) {
      document.body.setAttribute('data-melo-mobile-listing-page', pathname.slice(1));
    } else {
      document.body.removeAttribute('data-melo-mobile-listing-page');
    }

    return () => {
      document.body.removeAttribute('data-melo-mobile-listing-page');
    };
  }, [pathname, signedIn]);

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
      const result = await restSelect<HeaderSearchRow[]>('notifications', 'select=*&order=created_at.desc&limit=24');
      if (!active) return;
      const rawRows = searchRows(result.data).filter((row) => !isChatActivityNotification(row));
      const rows = await resolveNotificationActors(rawRows, user?.id ?? '');
      if (!active) return;
      const profiles = await loadNotificationProfiles(rows);
      if (!active) return;
      // MELO_PROFILE_POST_NOTIFICATION_ROUTING_V4
      // Resolve the real owner of Like/Comment posts before building hrefs.
      const postNotificationRows = rows
        .map((row) => {
          const kind = notificationKind(row);

          if (kind !== 'post_like' && kind !== 'post_comment') {
            return null;
          }

          const postId = notificationResolvedPostId(row);

          return postId
            ? { row, postId }
            : null;
        })
        .filter(
          (
            item,
          ): item is {
            row: HeaderSearchRow;
            postId: string;
          } => Boolean(item),
        );

      const uniqueNotificationPostIds = [
        ...new Set(postNotificationRows.map((item) => item.postId)),
      ];

      const notificationPostOwnerMap = new Map<string, string>();

      await Promise.all(
        uniqueNotificationPostIds.map(async (postId) => {
          try {
            const posts = await loadSocialFeedWeb({
              postId,
              limit: 1,
            });

            const post = posts.find(
              (item) => String(item.id) === String(postId),
            ) ?? posts[0];

            if (post?.id && post?.authorId) {
              notificationPostOwnerMap.set(
                String(post.id),
                String(post.authorId),
              );
            }
          } catch {
            // Keep normal notification fallback when the post cannot be resolved.
          }
        }),
      );

      if (!active) return;

      const backendItems = rows.map((row, index) => {
        const profile = profiles.get(notificationProfileId(row) || '') ?? null;
        const profileImage = profile ? notificationProfileImage(profile) : '';
        const rowImage = notificationActorInlineImage(row);

        const kind = notificationKind(row);
        const postId =
          kind === 'post_like' || kind === 'post_comment'
            ? notificationResolvedPostId(row)
            : '';

        const postOwnerId = postId
          ? notificationPostOwnerMap.get(postId) || ''
          : '';

        const profilePostHref =
          postId && postOwnerId
            ? postOwnerId === user?.id
              ? `/profile?post=${encodeURIComponent(postId)}`
              : `/users/${encodeURIComponent(postOwnerId)}?post=${encodeURIComponent(postId)}`
            : '';

        return {
          id: searchText(row, 'id') || `notification-${index}`,
          title: notificationResolvedTitle(row, locale),
          body: notificationResolvedBody(row, locale),

          // Like/Comment always opens the post on its owner's Profile.
          href:
            kind === 'post_like' || kind === 'post_comment'
              ? profilePostHref || notificationHref(row)
              : notificationHref(row),

          createdAt: searchText(row, 'created_at', 'inserted_at', 'updated_at'),
          unread: notificationUnread(row),
          imageUrl: rowImage || profileImage,
          avatarLabel: notificationAvatarLabel(profile || row),
          userId: notificationProfileId(row),

          // MELO_CHAT_NOTIFICATION_DRAWER_V2
          // Detect chat from the original notification payload.
          isChat: isChatActivityNotification(row),
        } satisfies HeaderNotification;
      });

      const directSupportItems = !adminArea && user?.id
        ? await loadDirectSupportReplyNotifications(locale, user.id)
        : [];
      if (!active) return;

      const userSystemItems: HeaderNotification[] = [];
      let userSystemFeedAvailable = false;

      if (!adminArea && user?.id) {
        const sourceResult = await rpcRequest<HeaderSearchRow[]>(
          'get_my_system_notification_feed',
          { p_limit: 24 },
        ).catch(() => ({ data: null, error: 'unavailable' }));

        if (!active) return;

        if (!sourceResult.error && Array.isArray(sourceResult.data)) {
          userSystemFeedAvailable = true;

          for (const row of searchRows(sourceResult.data)) {
            const sourceKey = searchText(row, 'source_key');
            const sourceKind = searchText(row, 'source_kind').toLowerCase();
            const createdAt = searchText(row, 'created_at');
            const unread = row.unread === true;

            if (!sourceKey) continue;

            if (sourceKind === 'support_reply') {
              const supportCopy = locale === 'th'
                ? { title: 'มีการตอบกลับจาก Melo Chat Support', body: 'ทีมสนับสนุนตอบกลับข้อความของคุณ กดเพื่ออ่าน' }
                : locale === 'de'
                  ? { title: 'Antwort von Melo Chat Support', body: 'Das Support-Team hat geantwortet. Tippe hier, um die Nachricht zu lesen.' }
                  : { title: 'Reply from Melo Chat Support', body: 'The support team replied to your message. Tap to read it.' };

              userSystemItems.push({
                id: `system-${sourceKey}`,
                title: supportCopy.title,
                body: supportCopy.body,
                href: '/support/chat',
                createdAt,
                unread,
                imageUrl: '/melo-support-logo.png',
                avatarLabel: 'M',
                userId: '',
                isChat: false,
                systemSourceKey: sourceKey,
                systemKind: 'support',
              });
              continue;
            }

            if (['verification_approved','verification_rejected','verification_needs_info'].includes(sourceKind)) {
              const copyByKind = {
                th: {
                  verification_approved: { title: 'ยืนยันตัวตนสำเร็จ', body: 'Melo Chat อนุมัติเอกสารยืนยันตัวตนของคุณแล้ว' },
                  verification_rejected: { title: 'เอกสารยืนยันตัวตนไม่ได้รับการอนุมัติ', body: 'กรุณาตรวจสอบสถานะและส่งเอกสารใหม่อีกครั้ง' },
                  verification_needs_info: { title: 'ต้องการข้อมูลยืนยันตัวตนเพิ่มเติม', body: 'กรุณาตรวจสอบข้อมูลหรือเอกสารที่แอดมินขอเพิ่มเติม' },
                },
                en: {
                  verification_approved: { title: 'Verification approved', body: 'Melo Chat approved your identity verification documents.' },
                  verification_rejected: { title: 'Verification rejected', body: 'Please review the decision and submit your documents again.' },
                  verification_needs_info: { title: 'More verification information required', body: 'Please review the additional information or documents requested by admin.' },
                },
                de: {
                  verification_approved: { title: 'Verifizierung genehmigt', body: 'Melo Chat hat deine Verifizierungsdokumente genehmigt.' },
                  verification_rejected: { title: 'Verifizierung abgelehnt', body: 'Bitte prüfe die Entscheidung und reiche deine Dokumente erneut ein.' },
                  verification_needs_info: { title: 'Weitere Verifizierungsdaten erforderlich', body: 'Bitte prüfe die zusätzlich angeforderten Informationen oder Dokumente.' },
                },
              } as const;

              const language = locale === 'th' || locale === 'de' ? locale : 'en';
              const kind = sourceKind as keyof typeof copyByKind.en;
              const verificationCopy = copyByKind[language][kind];

              userSystemItems.push({
                id: `system-${sourceKey}`,
                title: verificationCopy.title,
                body: verificationCopy.body,
                href: '/verify',
                createdAt,
                unread,
                imageUrl: '/melo-logo.png',
                avatarLabel: '✓',
                userId: '',
                isChat: false,
                systemSourceKey: sourceKey,
                systemKind: 'verification',
              });
            }
          }
        }
      }

      const backendItemsForDisplay = (userSystemFeedAvailable || directSupportItems.length > 0)
        ? backendItems.filter((_item, index) => {
            const kind = notificationKind(rows[index]);
            const shouldHideSupport = directSupportItems.length > 0 || userSystemFeedAvailable;
            return (!shouldHideSupport || kind !== 'support_message_user')
              && (!userSystemFeedAvailable || kind !== 'verification_approved')
              && (!userSystemFeedAvailable || kind !== 'verification_rejected')
              && (!userSystemFeedAvailable || kind !== 'verification_needs_info');
          })
        : backendItems;

      // Direct support rows are the reliable source for the user Support inbox.
      // If V6 RPC also returns support rows, prefer the direct rows to avoid duplicates.
      const userSystemItemsForDisplay = directSupportItems.length > 0
        ? userSystemItems.filter((item) => item.systemKind !== 'support')
        : userSystemItems;

      const adminPendingItems: HeaderNotification[] = [];
      if (adminArea) {
        const [verificationQueue, reportQueue] = await Promise.all([
          rpcRequest<HeaderSearchRow[]>('get_admin_verification_queue', { p_status: 'pending', p_limit: 10 }).catch(() => ({ data: null, error: 'unavailable' })),
          rpcRequest<HeaderSearchRow[]>('admin_center_list_reports', {}).catch(() => ({ data: null, error: 'unavailable' })),
        ]);
        if (!active) return;
        for (const row of searchRows(verificationQueue.data).slice(0, 10)) {
          const id = searchText(row, 'id');
          if (!id) continue;
          const email = searchText(row, 'user_email', 'email');
          adminPendingItems.push({
            id: `admin-pending-verify-${id}`,
            title: locale === 'th' ? 'มีคำขอยืนยันตัวตนรอตรวจสอบ' : locale === 'de' ? 'Verifizierung wartet auf Prüfung' : 'Verification waiting for review',
            body: email || (locale === 'th' ? 'เปิดรายการอนุมัติเอกสารเพื่อตรวจสอบ' : 'Open verification review to inspect the request.'),
            href: '/admin?tab=review',
            createdAt: searchText(row, 'submitted_at', 'created_at'),
            unread: true,
            imageUrl: '', avatarLabel: '✓', userId: searchText(row, 'user_id'), isChat: false,
          });
        }
        for (const row of searchRows(reportQueue.data).filter((row) => ['new','pending','open'].includes((searchText(row,'status') || 'new').toLowerCase())).slice(0, 10)) {
          const id = searchText(row, 'id');
          if (!id) continue;
          adminPendingItems.push({
            id: `admin-pending-report-${id}`,
            title: locale === 'th' ? 'มีรายงานผู้ใช้รอตรวจสอบ' : locale === 'de' ? 'Nutzermeldung wartet auf Prüfung' : 'User report waiting for review',
            body: searchText(row, 'reported_name', 'reason') || (locale === 'th' ? 'เปิดรายงานผู้ใช้เพื่อตรวจสอบ' : 'Open user reports to review.'),
            href: '/admin?tab=reports',
            createdAt: searchText(row, 'created_at'),
            unread: true,
            imageUrl: '', avatarLabel: '!', userId: searchText(row, 'reported_user_id'), isChat: false,
          });
        }
      }

      const noticeResult = await restSelect<HeaderSearchRow[]>('admin_user_notices', 'select=id,level,subject,message,created_at,read_at&order=created_at.desc&limit=24');
      if (!active) return;
      const adminNoticeItems: HeaderNotification[] = searchRows(noticeResult.data).map((row,index)=>({
        id:`admin-notice-${searchText(row,'id')||index}`,
        title: searchText(row,'subject') || (locale==='th'?'ประกาศจากทีมงาน Melo Chat':'Message from Melo Chat'),
        body: locale==='th'?'ข้อความจากทีมงาน Melo Chat — กดเพื่อดูรายละเอียด':'Message from the Melo Chat team — open for details',
        href:'#',
        createdAt:searchText(row,'created_at'),
        unread:!searchText(row,'read_at'),
        imageUrl:'',
        avatarLabel:'M',
        userId:'',
        isChat:false,
        adminNotice:{id:searchText(row,'id'),level:searchText(row,'level'),subject:searchText(row,'subject'),message:searchText(row,'message'),createdAt:searchText(row,'created_at'),readAt:searchText(row,'read_at')}
      }));
      // MELO_HEADER_ACTIVITY_SOUND_V1
      const currentNotificationIds = new Set(
        [...adminPendingItems, ...adminNoticeItems, ...directSupportItems, ...userSystemItemsForDisplay, ...backendItemsForDisplay].map((item) => item.id).filter(Boolean),
      );

      if (!notificationSoundReadyRef.current) {
        // First load establishes the baseline only.
        notificationKnownIdsRef.current = currentNotificationIds;
        notificationSoundReadyRef.current = true;
      } else {
        const hasNewActivityNotification = [...adminPendingItems, ...adminNoticeItems, ...directSupportItems, ...userSystemItemsForDisplay, ...backendItemsForDisplay].some(
          (item) =>
            item.unread &&
            (!('systemKind' in item) || item.systemKind !== 'support') &&
            !backendItemsForDisplay.some((candidate) => candidate.id === item.id && rows.some((row) => (searchText(row,'id') || '').trim() === item.id && isSupportNotification(row))) &&
            Boolean(item.id) &&
            !notificationKnownIdsRef.current.has(item.id),
        );

        if (hasNewActivityNotification) {
          try {
            const audio = new Audio(
              '/sounds/melo_activity_fun_onebeat_v2.wav',
            );

            audio.preload = 'auto';
            audio.volume = 0.92;

            void audio.play().catch(() => {
              // Browser may require user interaction before audio playback.
            });
          } catch {
            // Notification rendering continues even if audio is unavailable.
          }
        }

        notificationKnownIdsRef.current = currentNotificationIds;
      }

      const now = Date.now();
      if (now - attendanceNotificationCacheRef.current.at >= 30000) {
        const items = await loadOpenAttendanceHeaderNotifications(locale).catch(() => []);
        if (!active) return;
        attendanceNotificationCacheRef.current = { at: now, items };
      }
      const backendAttendanceHrefs = new Set(rows.filter((row) => notificationKind(row) === 'attendance').map(notificationHref));
      const attendanceItems = attendanceNotificationCacheRef.current.items.filter((item) => !backendAttendanceHrefs.has(item.href));
      setNotificationItems([...adminPendingItems, ...adminNoticeItems, ...directSupportItems, ...userSystemItemsForDisplay, ...attendanceItems, ...backendItemsForDisplay]);
      setNotificationsLoading(false);
    }

    void loadHeaderNotifications();
    const timer = window.setInterval(() => {
      void loadHeaderNotifications();
    }, 5000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [locale, signedIn, notificationRefreshTick, user?.id]);

  useEffect(() => {
    let active = true;
    async function syncAdminReviewAccess() {
      if (!signedIn) {
        if (active) setAdminReviewAllowed(false);
        return;
      }
      try {
        const account = await loadSettingsAccountSnapshot();
        if (active) setAdminReviewAllowed(Boolean(account.adminHasReviewAccess || account.canModerate));
      } catch {
        if (active) setAdminReviewAllowed(false);
      }
    }
    void syncAdminReviewAccess();
    const onAuthChanged = () => void syncAdminReviewAccess();
    window.addEventListener('melo-auth-changed', onAuthChanged);
    return () => {
      active = false;
      window.removeEventListener('melo-auth-changed', onAuthChanged);
    };
  }, [signedIn]);

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
    let active = true;
    async function syncHeaderProfileAvatar() {
      if (!signedIn || !user?.id) { if (active) setHeaderProfileAvatar(""); return; }
      const result = await restSelect<HeaderSearchRow[]>("profiles", `select=photo_paths&id=eq.${encodeURIComponent(user.id)}&limit=1`);
      if (!active) return;
      const row = Array.isArray(result.data) ? result.data[0] : null;
      setHeaderProfileAvatar(row ? searchProfileImage(row) : "");
    }
    void syncHeaderProfileAvatar();
    const onProfileUpdated = (event: Event) => {
      const avatarUrl = String((event as CustomEvent<{avatarUrl?:string}>).detail?.avatarUrl || "");
      if (avatarUrl) setHeaderProfileAvatar(avatarUrl); else void syncHeaderProfileAvatar();
    };
    window.addEventListener("melo-profile-updated", onProfileUpdated as EventListener);
    return () => { active = false; window.removeEventListener("melo-profile-updated", onProfileUpdated as EventListener); };
  }, [signedIn, user?.id]);

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
        const total = adminArea ? Number((await rpcRequest<number>('support_admin_unread_total')).data || 0) : await loadChatUnreadTotal();
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
    window.addEventListener("melo-support-unread-changed", onUnreadChanged as EventListener);

    return () => {
      active = false;
      window.clearTimeout(initialTimer);
      window.clearInterval(pollTimer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("melo-chat-unread-changed", onUnreadChanged as EventListener);
      window.removeEventListener("melo-support-unread-changed", onUnreadChanged as EventListener);
    };
  }, [signedIn, adminArea]);

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
  const mobilePathActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
    <header className={`siteHeader ${signedIn ? 'memberSiteHeader' : ''} ${isPublicAuthPage ? 'publicAuthSiteHeader' : ''}`}>
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
        <Link href={authPending ? "#" : signedIn ? (adminArea ? "/admin" : "/account") : "/"} className="brand" onClick={close}>
          <Image src="/melo-logo.png" alt="Melo Chat" width={42} height={42} priority />
          <span>Melo Chat</span>
        </Link>

        {signedIn ? (
          <button
            type="button"
            className={`memberMobileMenuTrigger ${menuOpen ? 'isOpen' : ''}`}
            onClick={() => {
              setMenuOpen((open) => !open);
              setAccountOpen(false);
              setMemberMenuOpen(false);
            }}
            aria-label={memberMain.menu}
            aria-expanded={menuOpen}
          >
            <span /><span /><span />
          </button>
        ) : null}

        <nav className={`desktopNav ${signedIn ? accountStyles.memberNav : ''} ${menuOpen ? 'mobileOpen' : ''}`} aria-label="Primary navigation">
          {authPending ? (
            <div className={accountStyles.authNavSkeleton} aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          ) : signedIn ? (
            <>
              <div className="memberDesktopNavContent">
                {adminArea ? (
                  <>
                    <Link href="/admin" onClick={close}>{adminReviewLabel}</Link>
                    <button type="button" onClick={() => { close(); setChatDrawerOpen(true); }} className={`${accountStyles.chatNavLink} ${accountStyles.chatNavButton}`} aria-haspopup="dialog" aria-expanded={chatDrawerOpen}>
                      <span>{locale === 'th' ? 'แชท Support' : locale === 'de' ? 'Support-Chat' : 'Support chat'}</span>
                      {chatUnreadCount > 0 ? <b className={accountStyles.chatNavBadge}>{chatUnreadCount > 99 ? '99+' : chatUnreadCount}</b> : null}
                    </button>
                  </>
                ) : (
                  <>
                    <Link href="/account" onClick={close}>{memberMain.home}</Link>
                    <Link href="/feed" onClick={close}>{memberMain.feed}</Link>
                    <Link href="/connect" onClick={close}>{memberMain.connect}</Link>
                    <Link href="/profile" onClick={close}>{memberMain.profile}</Link>
                    <button type="button" onClick={() => { close(); setChatDrawerOpen(true); }} className={`${accountStyles.chatNavLink} ${accountStyles.chatNavButton}`} aria-haspopup="dialog" aria-expanded={chatDrawerOpen}>
                      <span>{memberMain.chats}</span>
                      {chatUnreadCount > 0 ? <b className={accountStyles.chatNavBadge}>{chatUnreadCount > 99 ? '99+' : chatUnreadCount}</b> : null}
                    </button>
                  </>
                )}
              </div>

              <div className="memberMobileNavContent">
                <div className="memberMobileDrawerTitle"><strong>{memberMain.menu}</strong><small>{email || 'Melo Chat'}</small></div>
                <form className="memberMobileDrawerSearch" onSubmit={submitSearch} role="search">
                  <span aria-hidden="true">⌕</span>
                  <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder={searchCopy.placeholder} aria-label={searchCopy.label} />
                </form>

                <div className="memberMobileDrawerLinks">
                  {adminArea ? (
                    <>
                      <Link href="/admin?tab=review" onClick={close}><span>✓</span>{locale === 'th' ? 'อนุมัติเอกสาร' : locale === 'de' ? 'Dokumentenprüfung' : 'Document approval'}</Link>
                      <Link href="/admin?tab=users" onClick={close}><span>○</span>{locale === 'th' ? 'ผู้ใช้งานทั้งหมด' : locale === 'de' ? 'Benutzer' : 'All users'}</Link>
                      <Link href="/admin?tab=reports" onClick={close}><span>⚑</span>{locale === 'th' ? 'รายงานผู้ใช้' : locale === 'de' ? 'Nutzermeldungen' : 'User reports'}</Link>
                      <Link href="/admin?tab=sales" onClick={close}><span>▤</span>{locale === 'th' ? 'รายงานแพ็กเกต' : locale === 'de' ? 'Paketberichte' : 'Package reports'}</Link>
                      <Link href="/admin?tab=plans" onClick={close}><span>▣</span>{locale === 'th' ? 'แพ็กเกตการใช้งานระบบ' : locale === 'de' ? 'Pakete' : 'System packages'}</Link>
                      <Link href="/admin?tab=permissions" onClick={close}><span>⚙</span>{locale === 'th' ? 'จัดการสิทธิ์แอดมิน' : locale === 'de' ? 'Admin-Berechtigungen' : 'Admin permissions'}</Link>
                      <Link href="/admin?tab=audit" onClick={close}><span>◷</span>{locale === 'th' ? 'ประวัติการจัดการ' : locale === 'de' ? 'Audit-Protokoll' : 'Audit log'}</Link>
                    </>
                  ) : (
                    <>
                      <Link className={mobilePathActive('/account') ? 'isActive' : ''} href="/account" onClick={close}><span>⌂</span>{memberMain.home}</Link>
                      <Link className={mobilePathActive('/feed') ? 'isActive' : ''} href="/feed" onClick={close}><span>▤</span>{memberMain.feed}</Link>
                      <Link className={mobilePathActive('/connect') ? 'isActive' : ''} href="/connect" onClick={close}><span>♡</span>{memberMain.connect}</Link>
                      <Link className={mobilePathActive('/profile') ? 'isActive' : ''} href="/profile" onClick={close}><span>○</span>{memberMain.profile}</Link>
                      <button type="button" className={chatDrawerOpen ? 'isActive' : ''} onClick={() => { close(); setChatDrawerOpen(true); }}><span>◌</span>{memberMain.chats}</button>
                    </>
                  )}
                </div>

                <div className="memberMobileDrawerUtility">
                  {adminArea ? (
                    <>
                      <Link href="/account" onClick={close}><span>↩</span>{locale === 'th' ? 'กลับ User Area' : locale === 'de' ? 'Zurück zum User-Bereich' : 'Back to User Area'}</Link>
                    </>
                  ) : (
                    <>
                      <Link href="/premium" onClick={close}><span>✦</span>Premium</Link>
                      <Link href="/settings" onClick={close}><span>⚙</span>{settingsLabel}</Link>
                      <Link href="/verify" onClick={close}><span>✓</span>{verifyLabel}</Link>
                      {adminReviewAllowed ? <Link href="/admin" onClick={close}><span>▣</span>{adminReviewLabel}</Link> : null}
                    </>
                  )}
                </div>

                <div className="memberMobileDrawerControls">
                  <label htmlFor="melo-member-mobile-language"><span>🌐</span><strong>{t('common.language')}</strong><select id="melo-member-mobile-language" aria-label={t('common.language')} value={locale} onChange={(event) => setLocale(event.target.value as typeof locale)}>{selectableLocales.filter((item) => item === 'th' || item === 'en' || item === 'de').map((item) => <option value={item} key={item}>{localeLabels[item]}</option>)}</select></label>
                  <button type="button" onClick={toggleTheme}><span>{theme === 'dark' ? '☀' : '☾'}</span><span className="memberMobileDrawerControlCopy"><strong>{themeCopy.label}</strong><small>{theme === 'dark' ? themeCopy.dark : themeCopy.light}</small></span></button>
                </div>

                <button type="button" className="memberMobileDrawerLogout" onClick={logout}><span>↪</span>{auth.logout}</button>
              </div>
            </>
          ) : (
            <>
              {pathname === '/' ? (
                <div className="publicHeaderControls">
                  <PublicLanguageSwitcher placement="header" />
                  <button
                    type="button"
                    className="themeButton publicThemeButton"
                    onClick={toggleTheme}
                    title={theme === 'dark' ? themeCopy.light : themeCopy.dark}
                    aria-label={theme === 'dark' ? themeCopy.light : themeCopy.dark}
                  >
                    <span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span>
                  </button>
                </div>
              ) : (
                <Link className="navDownload" href="/#download" onClick={close}>{t('nav.download')}</Link>
              )}
            </>
          )}

          {!signedIn && authChecked && (
            <Link className="mobileLoginLink" href="/login" onClick={close}>{auth.login}</Link>
          )}

          {!signedIn && isPublicAuthPage && (
            <div className="publicMobileDrawerControls">
              <label className="publicMobileLanguageControl" htmlFor="melo-public-mobile-language">
                <span className="publicMobileControlIcon" aria-hidden="true">🌐</span>
                <span className="publicMobileControlCopy">
                  <strong>{t('common.language')}</strong>
                </span>
                <select
                  id="melo-public-mobile-language"
                  aria-label={t('common.language')}
                  value={locale}
                  onChange={(event) => setLocale(event.target.value as typeof locale)}
                >
                  {selectableLocales.filter((item) => item === 'th' || item === 'en' || item === 'de').map((item) => (
                    <option value={item} key={item}>{localeLabels[item]}</option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                className="publicMobileThemeControl"
                onClick={toggleTheme}
                aria-label={`${t('common.theme')}: ${theme === 'dark' ? themeCopy.dark : themeCopy.light}`}
              >
                <span className="publicMobileControlIcon" aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span>
                <span className="publicMobileControlCopy">
                  <strong>{t('common.theme')}</strong>
                  <small>{theme === 'dark' ? themeCopy.dark : themeCopy.light}</small>
                </span>
              </button>
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
          {signedIn && adminArea ? (
            <button
              type="button"
              className="adminMobileSupportTop"
              onClick={() => { close(); setChatDrawerOpen(true); }}
              aria-label={locale === 'th' ? 'แชท Support' : locale === 'de' ? 'Support-Chat' : 'Support chat'}
              aria-haspopup="dialog"
              aria-expanded={chatDrawerOpen}
            >
              <span aria-hidden="true">💬</span>
              <strong>{locale === 'th' ? 'แชท Support' : locale === 'de' ? 'Support-Chat' : 'Support chat'}</strong>
              {chatUnreadCount > 0 ? <b>{chatUnreadCount > 99 ? '99+' : chatUnreadCount}</b> : null}
            </button>
          ) : null}
          {signedIn && (
            <label className={`countrySelect ${adminArea ? 'adminTopLanguage' : ''}`} aria-label={t('common.language')} title={t('common.language')}>
              <span>🌐</span>
              <select value={locale} onChange={(event) => setLocale(event.target.value as typeof locale)}>
                {selectableLocales.filter((item) => item === 'th' || item === 'en' || item === 'de').map((item) => (
                  <option value={item} key={item}>{localeLabels[item]}</option>
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

                  {visibleNotificationItems.length ? (
                    <div className={accountStyles.notificationList}>
                      {visibleNotificationItems.map((item) => (
                        <Link
                          href={item.isChat ? "#" : item.href}
                          key={item.id}
                          className={`${accountStyles.notificationRow} ${item.unread ? accountStyles.notificationRowUnread : ''}`}
                          onClick={(event) => {
                            if (item.adminNotice) {
                              event.preventDefault();
                              event.stopPropagation();
                              setAdminNoticeOpen(item.adminNotice);
                              setNotificationOpen(false);
                              if (!item.adminNotice.readAt) {
                                void rpcRequest('mark_admin_user_notice_read',{p_notice_id:item.adminNotice.id}).then(()=>setNotificationRefreshTick(t=>t+1));
                              }
                              return;
                            }
                            if (item.supportThreadId) {
                              void rpcRequest('support_mark_my_thread_read', {
                                p_thread_id: item.supportThreadId,
                              }).then(() => {
                                setNotificationRefreshTick((tick) => tick + 1);
                                window.dispatchEvent(new CustomEvent('melo-support-unread-changed'));
                              });
                            }
                            if (item.systemSourceKey) {
                              void rpcRequest('mark_my_system_notification_read', {
                                p_source_key: item.systemSourceKey,
                              }).then(() => {
                                setNotificationRefreshTick((tick) => tick + 1);
                                window.dispatchEvent(new CustomEvent('melo-support-unread-changed'));
                              });
                            }

                            if (item.isChat) {
                              event.preventDefault();
                              event.stopPropagation();

                              setNotificationOpen(false);
                              setMenuOpen(false);
                              setMemberMenuOpen(false);
                              setAccountOpen(false);

                              window.dispatchEvent(
                                new CustomEvent(
                                  "melo-open-direct-chat",
                                  {
                                    detail: {
                                      userId: item.userId,
                                      title: item.title,
                                      subtitle: item.body,
                                      avatarUrl: item.imageUrl,
                                    },
                                  },
                                ),
                              );

                              return;
                            }

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
                <span className={`${accountStyles.avatar} ${headerProfileAvatar ? accountStyles.avatarPhoto : ""}`}>{headerProfileAvatar ? <img src={headerProfileAvatar} alt="" /> : "⚙"}</span>
              </button>

              {accountOpen && (
                <div className={accountStyles.dropdown} role="menu">
                  <div className={accountStyles.identity}>
                    <span className={`${accountStyles.avatarLarge} ${headerProfileAvatar ? accountStyles.avatarPhoto : ""}`}>{headerProfileAvatar ? <img src={headerProfileAvatar} alt="" /> : initial}</span>
                    <div>
                      <small>{auth.signedInAs}</small>
                      <strong>{email || 'Melo'}</strong>
                    </div>
                  </div>
                  <div className={accountStyles.divider} />
                  {adminArea ? (
                    <>
                      <Link href="/account" onClick={close} role="menuitem"><span aria-hidden="true">↩</span>{locale === 'th' ? 'กลับ User Area' : locale === 'de' ? 'Zurück zum User-Bereich' : 'Back to User Area'}</Link>
                    </>
                  ) : (
                    <>
                      <Link href="/settings" onClick={close} role="menuitem"><span>⚙</span>{settingsLabel}</Link>
                      <Link href="/premium" onClick={close} role="menuitem"><span aria-hidden="true">✦</span>{premiumLabel}</Link>
                      <Link href="/verify" onClick={close} role="menuitem"><span aria-hidden="true">✓</span>{verifyLabel}</Link>
                      {adminReviewAllowed ? <Link href="/admin" onClick={close} role="menuitem"><span aria-hidden="true">▣</span>{adminReviewLabel}</Link> : null}
                    </>
                  )}
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
    {!signedIn && isPublicAuthPage && menuOpen ? (
      <button type="button" className="publicMenuBackdrop" onClick={close} aria-label="Close menu" />
    ) : null}

    {signedIn && menuOpen ? (
      <button type="button" className="memberMobileMenuBackdrop" onClick={close} aria-label="Close menu" />
    ) : null}

    {signedIn && !adminArea ? (
      <nav className="meloMobileBottomNav" aria-label="Mobile primary navigation">
        <Link className={mobilePathActive('/account') ? 'isActive' : ''} href="/account" onClick={close}><span aria-hidden="true">⌂</span><small>{memberMain.home}</small></Link>
        <Link className={mobilePathActive('/feed') ? 'isActive' : ''} href="/feed" onClick={close}><span aria-hidden="true">▤</span><small>{memberMain.feed}</small></Link>
        <Link className={mobilePathActive('/connect') ? 'isActive' : ''} href="/connect" onClick={close}><span aria-hidden="true">♡</span><small>{memberMain.connect}</small></Link>
        <button type="button" className={chatDrawerOpen || pathname.startsWith('/chat') ? 'isActive' : ''} onClick={() => { close(); setChatDrawerOpen(true); }} aria-haspopup="dialog" aria-expanded={chatDrawerOpen}>
          <span aria-hidden="true">✉</span><small>{memberMain.chats}</small>{chatUnreadCount > 0 ? <b>{chatUnreadCount > 99 ? '99+' : chatUnreadCount}</b> : null}
        </button>
        <Link className={mobilePathActive('/profile') ? 'isActive' : ''} href="/profile" onClick={close}><span aria-hidden="true">○</span><small>{memberMain.profile}</small></Link>
      </nav>
    ) : null}

    {adminActivityPopup ? (
      <button type="button" className={accountStyles.adminActivityPopup} onClick={() => { const href=adminActivityPopup.href; setAdminActivityPopup(null); if(href) router.push(href); }}>
        <span className={accountStyles.adminActivityPopupIcon}>{adminActivityPopup.avatarLabel || 'M'}</span>
        <span className={accountStyles.adminActivityPopupText}><small>{locale==='th'?'กิจกรรมใหม่ใน Admin Center':locale==='de'?'Neue Admin-Aktivität':'New Admin Center activity'}</small><strong>{adminActivityPopup.title}</strong><em>{adminActivityPopup.body}</em></span>
        <span className={accountStyles.adminActivityPopupClose} onClick={(event)=>{event.stopPropagation();setAdminActivityPopup(null)}}>×</span>
      </button>
    ) : null}

    {adminNoticeOpen ? (
      <div className={accountStyles.adminNoticeBackdrop} role="presentation" onMouseDown={()=>setAdminNoticeOpen(null)}>
        <section className={accountStyles.adminNoticeModal} role="dialog" aria-modal="true" onMouseDown={(event)=>event.stopPropagation()}>
          <button type="button" className={accountStyles.adminNoticeClose} onClick={()=>setAdminNoticeOpen(null)}>×</button>
          <small>{adminNoticeOpen.level==='action_required'?(locale==='th'?'ต้องดำเนินการแก้ไข':'ACTION REQUIRED'):adminNoticeOpen.level==='notice'?(locale==='th'?'แจ้งให้ทราบ':'NOTICE'):(locale==='th'?'คำเตือน':'WARNING')}</small>
          <h2>{adminNoticeOpen.subject}</h2>
          <time>{notificationTime(adminNoticeOpen.createdAt, locale)}</time>
          <div className={accountStyles.adminNoticeMessage}>{adminNoticeOpen.message}</div>
          <button type="button" className={accountStyles.adminNoticeAcknowledge} onClick={()=>setAdminNoticeOpen(null)}>{locale==='th'?'รับทราบ':'Acknowledge'}</button>
        </section>
      </div>
    ) : null}

    {signedIn ? <ChatDrawer open={chatDrawerOpen} onClose={() => setChatDrawerOpen(false)} adminMode={adminArea} /> : null}
    </>
  );
}




