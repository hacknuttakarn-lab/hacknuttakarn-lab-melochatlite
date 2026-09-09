'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import VerifiedUserAvatar from '@/components/profile/VerifiedUserAvatar';
import ActivityDetailActions from '@/components/activity/ActivityDetailActions';
import AttendanceReputationStatus from '@/components/activity/AttendanceReputationStatus';
import { useLocale } from '@/components/SiteProviders';
import { authCopy } from '@/i18n/authUi';
import { activityDetailCopy, type ActivityDetailFeature } from '@/i18n/activityDetailUi';
import { activityChatCopy } from '@/i18n/activityChatUi';
import {
  getCurrentUser,
  invokeEdgeFunction,
  isSupabaseConfigured,
  publicStorageUrl,
  restDelete,
  restSelect,
  rpcRequest,
} from '@/lib/supabase/browser';
import styles from './ActivityDetailExperience.module.css';

type Row = Record<string, unknown>;
type MeloUser = { id: string; email?: string };
type TripRequestStatus = 'pending' | 'approved' | 'rejected' | null;

type RouteData = {
  stops: Row[];
  itinerary: Row[];
};

type DetailState = {
  detail: Row | null;
  members: Row[];
  route: RouteData;
  tripRequestStatus: TripRequestStatus;
};

function rowsOf(value: unknown): Row[] {
  if (Array.isArray(value)) return value.filter((row): row is Row => Boolean(row) && typeof row === 'object');
  if (value && typeof value === 'object') return [value as Row];
  return [];
}

function text(row: Row | null | undefined, ...keys: string[]) {
  if (!row) return '';
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return '';
}

function num(row: Row | null | undefined, ...keys: string[]) {
  if (!row) return 0;
  for (const key of keys) {
    const value = Number(row[key]);
    if (Number.isFinite(value)) return value;
  }
  return 0;
}

function bool(row: Row | null | undefined, ...keys: string[]) {
  if (!row) return false;
  for (const key of keys) {
    if (typeof row[key] === 'boolean') return Boolean(row[key]);
  }
  return false;
}

function mergeDetail(rpcValue: unknown, directValue: unknown) {
  const rpcRow = rowsOf(rpcValue)[0] ?? null;
  const directRow = rowsOf(directValue)[0] ?? null;
  if (!rpcRow && !directRow) return null;
  return { ...(directRow ?? {}), ...(rpcRow ?? {}) } as Row;
}

function localeTag(locale: string) {
  return ({ th: 'th-TH', en: 'en-US', de: 'de-DE', zh: 'zh-CN', ja: 'ja-JP', ko: 'ko-KR' } as Record<string, string>)[locale] ?? 'en-US';
}

function formatDate(value: string, locale: string, includeTime = false) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  try {
    return new Intl.DateTimeFormat(localeTag(locale), includeTime
      ? { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
      : { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
  } catch {
    return value;
  }
}

function formatRange(start: string, end: string, locale: string, includeTime = false) {
  const startText = formatDate(start, locale, includeTime);
  const endText = formatDate(end, locale, includeTime);
  if (!startText) return endText;
  if (!endText || endText === startText) return startText;
  return `${startText} – ${endText}`;
}

function parseDateOnly(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!match) return Number.NaN;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 0, 0, 0, 0).getTime();
}

function inactive(row: Row) {
  const lifecycle = text(row, 'lifecycle_status').toLowerCase();
  const status = text(row, 'status').toLowerCase();
  return Boolean(row.archived_at) || ['cancelled', 'completed'].includes(lifecycle) || ['cancelled', 'completed'].includes(status);
}

async function assertTripScheduleAvailable(detail: Row, tripId: string) {
  const start = parseDateOnly(text(detail, 'start_date'));
  const end = parseDateOnly(text(detail, 'end_date') || text(detail, 'start_date'));
  if (!Number.isFinite(start) || !Number.isFinite(end)) return;
  const result = await rpcRequest<Row[]>('get_my_trips');
  if (result.error) throw new Error(result.error);
  const conflict = rowsOf(result.data).find((row) => {
    if (text(row, 'id') === tripId || inactive(row)) return false;
    const relation = text(row, 'relation').toLowerCase();
    if (relation !== 'created' && relation !== 'joined') return false;
    const theirStart = parseDateOnly(text(row, 'start_date'));
    const theirEnd = parseDateOnly(text(row, 'end_date') || text(row, 'start_date'));
    return Number.isFinite(theirStart) && Number.isFinite(theirEnd) && start <= theirEnd && theirStart <= end;
  });
  if (conflict) throw new Error(`Schedule overlaps with “${text(conflict, 'title') || 'another Trip'}”.`);
}

async function assertEventScheduleAvailable(detail: Row, eventId: string) {
  const start = new Date(text(detail, 'start_at')).getTime();
  let end = new Date(text(detail, 'end_at')).getTime();
  if (!Number.isFinite(end) && Number.isFinite(start)) {
    const fallback = new Date(start);
    fallback.setHours(23, 59, 59, 999);
    end = fallback.getTime();
  }
  if (!Number.isFinite(start) || !Number.isFinite(end)) return;
  const result = await rpcRequest<Row[]>('get_my_events');
  if (result.error) throw new Error(result.error);
  const conflict = rowsOf(result.data).find((row) => {
    if (text(row, 'id') === eventId || inactive(row)) return false;
    const relation = text(row, 'relation').toLowerCase();
    if (relation !== 'created' && relation !== 'joined') return false;
    const theirStart = new Date(text(row, 'start_at')).getTime();
    let theirEnd = new Date(text(row, 'end_at')).getTime();
    if (!Number.isFinite(theirEnd) && Number.isFinite(theirStart)) {
      const fallback = new Date(theirStart);
      fallback.setHours(23, 59, 59, 999);
      theirEnd = fallback.getTime();
    }
    return Number.isFinite(theirStart) && Number.isFinite(theirEnd) && start < theirEnd && theirStart < end;
  });
  if (conflict) throw new Error(`Schedule overlaps with “${text(conflict, 'title') || 'another Event'}”.`);
}

function firstHttpImage(row: Row) {
  for (const key of ['image_url', 'cover_image_url', 'photo_url', 'thumbnail_url']) {
    const value = text(row, key);
    if (/^https?:\/\//i.test(value)) return value;
  }
  return '';
}

function memberName(row: Row) {
  return text(row, 'display_name', 'name', 'sender_name') || 'Melo User';
}

function memberPhoto(row: Row) {
  const http = firstHttpImage(row);
  if (http) return http;
  const path = text(row, 'photo_path', 'profile_image_path');
  if (!path) return '';
  return publicStorageUrl('profile-photos', path);
}

function activityImage(detail: Row) {
  const http = firstHttpImage(detail);
  if (http) return http;
  const path = text(detail, 'image_path');
  return path ? publicStorageUrl('activity-images', path) : '';
}

function activityIcon(feature: ActivityDetailFeature) {
  return feature === 'trip' ? '✈' : feature === 'event' ? '◉' : '◎';
}

function backHref(feature: ActivityDetailFeature) {
  return feature === 'trip' ? '/trips' : feature === 'event' ? '/events' : '/community';
}

async function loadDetail(feature: ActivityDetailFeature, id: string, userId: string): Promise<DetailState> {
  if (feature === 'trip') {
    const [rpc, direct, members, stops, itinerary, request] = await Promise.all([
      rpcRequest<Row[]>('get_trip_detail', { p_trip_id: id }),
      restSelect<Row[]>('trips', `select=*&id=eq.${encodeURIComponent(id)}&limit=1`),
      rpcRequest<Row[]>('get_trip_member_profiles', { p_trip_id: id }),
      restSelect<Row[]>('trip_stops', `select=*&trip_id=eq.${encodeURIComponent(id)}&order=position.asc`),
      restSelect<Row[]>('trip_itinerary', `select=*&trip_id=eq.${encodeURIComponent(id)}&order=position.asc`),
      restSelect<Row[]>('trip_join_requests', `select=status&trip_id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(userId)}&limit=1`),
    ]);
    const detail = mergeDetail(rpc.data, direct.data);
    if (!detail && rpc.error && direct.error) throw new Error(rpc.error || direct.error);
    return {
      detail,
      members: rowsOf(members.data),
      route: { stops: rowsOf(stops.data), itinerary: rowsOf(itinerary.data) },
      tripRequestStatus: (text(rowsOf(request.data)[0], 'status') as TripRequestStatus) || null,
    };
  }

  if (feature === 'event') {
    const [rpc, direct, members] = await Promise.all([
      rpcRequest<Row[]>('get_event_detail', { p_event_id: id }),
      restSelect<Row[]>('events', `select=*&id=eq.${encodeURIComponent(id)}&limit=1`),
      rpcRequest<Row[]>('get_event_attendees', { p_event_id: id }),
    ]);
    const detail = mergeDetail(rpc.data, direct.data);
    if (!detail && rpc.error && direct.error) throw new Error(rpc.error || direct.error);
    return { detail, members: rowsOf(members.data), route: { stops: [], itinerary: [] }, tripRequestStatus: null };
  }

  const [rpc, direct, members] = await Promise.all([
    rpcRequest<Row[]>('get_community_detail', { p_community_id: id }),
    restSelect<Row[]>('communities', `select=*&id=eq.${encodeURIComponent(id)}&limit=1`),
    rpcRequest<Row[]>('get_community_member_profiles', { p_community_id: id }),
  ]);
  const detail = mergeDetail(rpc.data, direct.data);
  if (!detail && rpc.error && direct.error) throw new Error(rpc.error || direct.error);
  return { detail, members: rowsOf(members.data), route: { stops: [], itinerary: [] }, tripRequestStatus: null };
}

async function leaveWithAttendanceReset(feature: 'trip' | 'event', id: string) {
  const reset = await rpcRequest('melo_leave_activity_reset_attendance_v1', {
    p_activity_type: feature,
    p_activity_id: id,
  });
  if (!reset.error) return;
  const normalized = reset.error.toLowerCase();
  const missing = normalized.includes('melo_leave_activity_reset_attendance_v1')
    || normalized.includes('could not find the function')
    || normalized.includes('schema cache')
    || normalized.includes('pgrst202');
  if (!missing) throw new Error(reset.error);
  const fallback = await rpcRequest(feature === 'trip' ? 'leave_trip' : 'leave_event', feature === 'trip' ? { p_trip_id: id } : { p_event_id: id });
  if (fallback.error) throw new Error(fallback.error);
}

export function ActivityDetailExperience({ feature, id }: { feature: ActivityDetailFeature; id: string }) {
  const router = useRouter();
  const { locale } = useLocale();
  const copy = activityDetailCopy[locale];
  const featureCopy = copy.features[feature];
  const auth = authCopy[locale];
  const chatCopy = activityChatCopy[locale];
  const [user, setUser] = useState<MeloUser | null>(null);
  const [state, setState] = useState<DetailState>({ detail: null, members: [], route: { stops: [], itinerary: [] }, tripRequestStatus: null });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [requestMessage, setRequestMessage] = useState('');
  const configured = isSupabaseConfigured();

  const load = useCallback(async (currentUser: MeloUser, quiet = false) => {
    if (!quiet) setLoading(true);
    setError('');
    try {
      const next = await loadDetail(feature, id, currentUser.id);
      setState(next);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : copy.loadFailed);
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [copy.loadFailed, feature, id]);

  useEffect(() => {
    if (!configured) { setLoading(false); return; }
    let active = true;
    getCurrentUser().then((current) => {
      if (!active) return;
      if (!current) { router.replace('/login'); setLoading(false); return; }
      setUser(current);
      void load(current);
    });
    return () => { active = false; };
  }, [configured, load, router]);

  useEffect(() => {
    if (feature !== 'trip' || state.tripRequestStatus !== 'pending' || !user) return undefined;
    const timer = window.setInterval(() => { void load(user, true); }, 4000);
    return () => window.clearInterval(timer);
  }, [feature, load, state.tripRequestStatus, user]);

  const detail = state.detail;
  const ownerId = feature === 'community' ? text(detail, 'owner_id') : text(detail, 'organizer_id');
  const isOwner = Boolean(user && (ownerId === user.id || bool(detail, feature === 'community' ? 'is_owner' : 'is_organizer')));
  const joined = feature === 'trip'
    ? state.tripRequestStatus === 'approved'
    : feature === 'event'
      ? bool(detail, 'is_joined')
      : bool(detail, 'is_member');
  const membershipClosed = Boolean(detail && (detail.membership_open === false || Boolean(detail.archived_at) || ['cancelled', 'completed', 'archived'].includes(text(detail, 'lifecycle_status', 'status').toLowerCase())));
  const capacity = num(detail, 'capacity');
  const currentCount = feature === 'trip'
    ? Math.max(num(detail, 'approved_members'), state.members.length)
    : feature === 'event'
      ? Math.max(num(detail, 'attendee_count'), state.members.length)
      : Math.max(num(detail, 'member_count'), state.members.length);
  const remaining = capacity > 0 ? Math.max(capacity - currentCount, 0) : null;
  const full = Boolean(text(detail, 'status').toLowerCase() === 'full' || (capacity > 0 && remaining === 0));

  const title = feature === 'community' ? text(detail, 'name') : text(detail, 'title');
  const description = text(detail, 'description');
  const category = text(detail, 'category');
  const organizer = feature === 'community' ? text(detail, 'owner_name') : text(detail, 'organizer_name');
  const primaryLanguage = text(detail, 'primary_language').toUpperCase();
  const cover = detail ? activityImage(detail) : '';

  const dateValue = feature === 'trip'
    ? formatRange(text(detail, 'start_date'), text(detail, 'end_date'), locale)
    : feature === 'event'
      ? formatRange(text(detail, 'start_at'), text(detail, 'end_at'), locale, true)
      : formatDate(text(detail, 'created_at'), locale);
  const location = feature === 'trip'
    ? [text(detail, 'start_point'), text(detail, 'destination')].filter(Boolean).join(' → ')
    : feature === 'event'
      ? [text(detail, 'venue_name'), text(detail, 'address'), [text(detail, 'city'), text(detail, 'country')].filter(Boolean).join(', ')].filter(Boolean).join(' · ')
      : text(detail, 'country');

  async function perform(action: () => Promise<void>, successText = '') {
    if (!user || busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
      if (successText) setNotice(successText);
      await load(user, true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : copy.actionFailed);
    } finally {
      setBusy(false);
    }
  }

  function handleTripAction() {
    if (!detail || !user) return;
    if (state.tripRequestStatus === 'pending') {
      void perform(async () => {
        const result = await restDelete('trip_join_requests', `trip_id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(user.id)}&status=eq.pending`);
        if (result.error) throw new Error(result.error);
      }, featureCopy.requestCancelled);
      return;
    }
    if (state.tripRequestStatus === 'approved') {
      if (!window.confirm(copy.confirmLeave)) return;
      void perform(() => leaveWithAttendanceReset('trip', id));
      return;
    }
    if (membershipClosed || full || isOwner) return;
    void perform(async () => {
      await assertTripScheduleAvailable(detail, id);
      const startedAt = new Date().toISOString();
      const result = await rpcRequest('request_to_join_trip', { p_trip_id: id, p_message: requestMessage.trim() || null });
      if (result.error) throw new Error(result.error);
      await invokeEdgeFunction('ensure-trip-join-notification', { tripId: id, actionStartedAt: startedAt }).catch(() => undefined);
      setRequestMessage('');
    }, featureCopy.requestSent);
  }

  function handleEventAction() {
    if (!detail || !user || isOwner) return;
    if (joined) {
      if (!window.confirm(copy.confirmLeave)) return;
      void perform(() => leaveWithAttendanceReset('event', id));
      return;
    }
    if (membershipClosed || full) return;
    void perform(async () => {
      await assertEventScheduleAvailable(detail, id);
      const startedAt = new Date().toISOString();
      const result = await rpcRequest('join_event', { p_event_id: id });
      if (result.error) throw new Error(result.error);
      await invokeEdgeFunction('ensure-activity-join-notification', { kind: 'event', activityId: id, actionStartedAt: startedAt }).catch(() => undefined);
    });
  }

  function handleCommunityAction() {
    if (!detail || !user || isOwner) return;
    if (joined) {
      if (!window.confirm(copy.confirmLeave)) return;
      void perform(async () => {
        const result = await rpcRequest('leave_community', { p_community_id: id });
        if (result.error) throw new Error(result.error);
      });
      return;
    }
    if (membershipClosed) return;
    void perform(async () => {
      const startedAt = new Date().toISOString();
      const result = await rpcRequest('join_community', { p_community_id: id });
      if (result.error) throw new Error(result.error);
      await invokeEdgeFunction('ensure-activity-join-notification', { kind: 'community', activityId: id, actionStartedAt: startedAt }).catch(() => undefined);
    });
  }

  const actionLabel = useMemo(() => {
    if (isOwner) return featureCopy.owner;
    if (feature === 'trip') {
      if (state.tripRequestStatus === 'pending') return featureCopy.cancelRequest || featureCopy.requestPending || featureCopy.join;
      if (state.tripRequestStatus === 'approved') return featureCopy.leave;
      if (membershipClosed) return featureCopy.closed;
      if (full) return featureCopy.full;
      if (state.tripRequestStatus === 'rejected') return featureCopy.requestAgain || featureCopy.join;
      return featureCopy.requestJoin || featureCopy.join;
    }
    if (joined) return featureCopy.leave;
    if (membershipClosed) return featureCopy.closed;
    if (full) return featureCopy.full;
    return featureCopy.join;
  }, [feature, featureCopy, full, isOwner, joined, membershipClosed, state.tripRequestStatus]);

  const actionDisabled = busy || isOwner || ((!joined && feature !== 'trip') && (membershipClosed || full)) || (feature === 'trip' && state.tripRequestStatus !== 'pending' && state.tripRequestStatus !== 'approved' && (membershipClosed || full));
  const canOpenChat = isOwner || joined;

  function openSystemChat() {
    window.dispatchEvent(new CustomEvent('melo-open-activity-chat', {
      detail: { category: feature, id, title: title || featureCopy.title, subtitle: location, avatarUrl: cover },
    }));
  }

  if (!configured) return <main className={styles.page}><Header /><div className={styles.centerState}>{auth.envMissing}</div></main>;

  return (
    <main className={styles.page}>
      <Header />
      <section className={styles.shell}>
        <div className={styles.topbar}>
          <Link href={backHref(feature)} className={styles.backLink}>‹ <span>{featureCopy.back}</span></Link>
          <div className={styles.livePill}><i />{copy.live}</div>
          <button type="button" className={styles.refreshButton} disabled={!user || busy} onClick={() => user && void load(user)}>{copy.refresh}</button>
        </div>

        {loading ? (
          <div className={styles.centerState}><span className={styles.spinner} />{copy.loading}</div>
        ) : error && !detail ? (
          <div className={styles.errorState}><strong>{copy.loadFailed}</strong><p>{error}</p><button type="button" onClick={() => user && void load(user)}>{copy.retry}</button></div>
        ) : !detail ? (
          <div className={styles.centerState}>{copy.notFound}</div>
        ) : (
          <>
            <section className={styles.heroCard}>
              <div className={styles.cover} style={cover ? { backgroundImage: `url(${JSON.stringify(cover).slice(1, -1)})` } : undefined}>
                {!cover && <span className={styles.coverIcon}>{activityIcon(feature)}</span>}
                <div className={styles.coverShade} />
                <div className={styles.heroBadges}>
                  {category && <span>{category}</span>}
                  {joined && !isOwner && <span className={styles.joinedBadge}>{featureCopy.joined}</span>}
                  {isOwner && <span className={styles.ownerBadge}>{featureCopy.owner}</span>}
                </div>
                <div className={styles.heroCopy}>
                  <span>{featureCopy.title}</span>
                  <h1>{title || 'Melo'}</h1>
                  {location && <p>⌖ {location}</p>}
                </div>
              </div>

              <aside className={styles.actionPanel}>
                {(feature === 'event' || feature === 'community') ? (
                  <div className={styles.heroMenu}>
                    <ActivityDetailActions
                      feature={feature}
                      id={id}
                      title={title || (feature === 'event' ? 'Melo Event' : 'Melo Community')}
                      subtitle={location}
                      imagePath={text(detail, 'image_path')}
                      isOwner={isOwner}
                      isMember={Boolean(isOwner || joined)}
                      onMembers={() => document.getElementById('activity-members')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                      variant="menu"
                    />
                  </div>
                ) : null}

                <div className={styles.actionStatus}>
                  <span>{copy.status}</span>
                  <strong>{isOwner ? featureCopy.owner : feature === 'trip' && state.tripRequestStatus === 'pending' ? featureCopy.requestPending : joined ? featureCopy.joined : membershipClosed ? featureCopy.closed : full ? featureCopy.full : copy.open}</strong>
                </div>
                {remaining !== null && <div className={styles.remaining}><span>{copy.remaining}</span><strong>{remaining.toLocaleString(localeTag(locale))} {copy.people}</strong></div>}
                {feature === 'trip' && !isOwner && !joined && state.tripRequestStatus !== 'pending' && !membershipClosed && !full && (
                  <label className={styles.messageField}>
                    <span>{featureCopy.requestMessage}</span>
                    <textarea value={requestMessage} maxLength={240} onChange={(event) => setRequestMessage(event.target.value)} placeholder={featureCopy.requestMessagePlaceholder} />
                    <small>{requestMessage.length}/240</small>
                  </label>
                )}
                <button
                  type="button"
                  className={`${styles.actionButton} ${(joined || state.tripRequestStatus === 'approved' || state.tripRequestStatus === 'pending') && !isOwner ? styles.secondaryAction : ''}`}
                  disabled={actionDisabled}
                  onClick={feature === 'trip' ? handleTripAction : feature === 'event' ? handleEventAction : handleCommunityAction}
                >
                  {busy ? (joined || state.tripRequestStatus === 'approved' ? featureCopy.leaving : featureCopy.joining) : actionLabel}
                </button>
                {canOpenChat && <button type="button" className={styles.chatButton} onClick={openSystemChat}><span>💬</span>{chatCopy.openChat}</button>}
                {notice && <div className={styles.successNotice}>{notice}</div>}
                {error && <div className={styles.inlineError}>{error}</div>}
              </aside>
            </section>

            <div className={styles.contentGrid}>
              <div className={styles.mainColumn}>
                <section className={styles.panel}>
                  <div className={styles.panelHeading}><span>{activityIcon(feature)}</span><div><small>{copy.category}</small><h2>{featureCopy.about}</h2></div></div>
                  <p className={styles.description}>{description || '—'}</p>
                  <div className={styles.infoGrid}>
                    {dateValue && <div><span>{copy.date}</span><strong>{dateValue}</strong></div>}
                    {location && <div><span>{copy.location}</span><strong>{location}</strong></div>}
                    {organizer && <div><span>{copy.organizer}</span><strong>{ownerId ? <Link href={`/users/${ownerId}`} className={styles.userNameLink}>{organizer}</Link> : organizer}</strong></div>}
                    {primaryLanguage && <div><span>{copy.language}</span><strong>{primaryLanguage}</strong></div>}
                    {capacity > 0 && <div><span>{copy.capacity}</span><strong>{capacity.toLocaleString(localeTag(locale))} {copy.people}</strong></div>}
                    {feature === 'trip' && detail.budget_per_person != null && <div><span>{copy.budget}</span><strong>{num(detail, 'budget_per_person').toLocaleString(localeTag(locale))} THB</strong></div>}
                    {feature === 'event' && <div><span>{copy.price}</span><strong>{detail.price_per_person == null ? copy.free : `${num(detail, 'price_per_person').toLocaleString(localeTag(locale))} THB`}</strong></div>}
                    {feature === 'community' && text(detail, 'privacy') && <div><span>{copy.privacy}</span><strong>{text(detail, 'privacy')}</strong></div>}
                  </div>
                </section>

                {feature === 'event' && (isOwner || joined) ? (
                  <AttendanceReputationStatus activityType="event" activityId={id} isOrganizer={isOwner} />
                ) : null}

                {feature === 'trip' && (state.route.stops.length > 0 || location) && (
                  <section className={styles.panel}>
                    <div className={styles.panelHeading}><span>⌖</span><div><small>MELO TRIP</small><h2>{featureCopy.route}</h2></div></div>
                    <div className={styles.routeLine}>
                      <div className={styles.routePoint}><i /><span><small>START</small><strong>{text(detail, 'start_point') || '—'}</strong></span></div>
                      {state.route.stops.map((stop) => <div className={styles.routePoint} key={text(stop, 'id') || text(stop, 'position')}><i /><span><small>STOP {text(stop, 'position')}</small><strong>{text(stop, 'label')}</strong></span></div>)}
                      <div className={styles.routePoint}><i /><span><small>DESTINATION</small><strong>{text(detail, 'destination') || '—'}</strong></span></div>
                    </div>
                  </section>
                )}

                {feature === 'trip' && state.route.itinerary.length > 0 && (
                  <section className={styles.panel}>
                    <div className={styles.panelHeading}><span>◷</span><div><small>MELO PLAN</small><h2>{featureCopy.itinerary}</h2></div></div>
                    <div className={styles.timeline}>
                      {state.route.itinerary.map((item) => (
                        <div className={styles.timelineItem} key={text(item, 'id') || text(item, 'position')}>
                          <time>{text(item, 'time_label') || '—'}</time>
                          <i />
                          <div><strong>{text(item, 'title')}</strong>{text(item, 'description') && <p>{text(item, 'description')}</p>}</div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>

              <aside className={styles.sideColumn}>
                <section className={styles.panel} id="activity-members">
                  <div className={styles.membersHeading}><div><small>{currentCount.toLocaleString(localeTag(locale))}</small><h2>{featureCopy.members}</h2></div><span>◉</span></div>
                  {state.members.length === 0 ? <p className={styles.emptyMembers}>{featureCopy.emptyMembers}</p> : (
                    <div className={styles.memberList}>
                      {state.members.slice(0, 12).map((member, index) => {
                        const photo = memberPhoto(member);
                        const name = memberName(member);
                        const role = bool(member, 'is_organizer') || text(member, 'role') === 'owner' || text(member, 'role') === 'organizer';
                        const userId = text(member, 'user_id', 'id');
                        return userId ? (
                          <Link href={`/users/${userId}`} className={styles.memberRow} key={userId}>
                            <VerifiedUserAvatar userId={userId} name={name} src={photo} country={text(member, 'country')} nationality={text(member, 'nationality')} className={styles.memberAvatar} badgeSize={16} alt="" />
                            <div><strong>{name}</strong><small>{role ? copy.organizer : text(member, 'country', 'primary_language') || 'Melo'}</small></div>
                          </Link>
                        ) : (
                          <div className={styles.memberRow} key={`${name}-${index}`}>
                            <VerifiedUserAvatar userId={userId} name={name} src={photo} country={text(member, 'country')} nationality={text(member, 'nationality')} className={styles.memberAvatar} badgeSize={16} alt="" />
                            <div><strong>{name}</strong><small>{role ? copy.organizer : text(member, 'country', 'primary_language') || 'Melo'}</small></div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              </aside>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
