'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { useLocale } from '@/components/SiteProviders';
import { authCopy } from '@/i18n/authUi';
import { activityChatCopy, type ActivityChatFeature } from '@/i18n/activityChatUi';
import {
  getCurrentUser,
  invokeEdgeFunction,
  isSupabaseConfigured,
  publicStorageUrl,
  restSelect,
  rpcRequest,
} from '@/lib/supabase/browser';
import styles from './ActivityChatExperience.module.css';

type Row = Record<string, unknown>;
type MeloUser = { id: string; email?: string };
type MessageType = 'text' | 'image' | 'location' | 'sticker';

type ChatMessage = {
  id: string;
  senderId: string;
  senderName: string;
  originalText: string;
  sourceLanguage: string;
  translations: Record<string, string>;
  createdAt: string;
  messageType: MessageType;
  mediaPath: string | null;
  latitude: number | null;
  longitude: number | null;
  locationLabel: string | null;
  stickerCode: string | null;
};

type Announcement = {
  id: string;
  authorName: string;
  message: string;
  isPinned: boolean;
  createdAt: string;
};

type Lifecycle = {
  canWrite: boolean;
  status: string;
  chatMode: string;
};

type RoomState = {
  title: string;
  allowed: boolean;
  messages: ChatMessage[];
  announcements: Announcement[];
  canPublish: boolean;
  lifecycle: Lifecycle;
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

function bool(row: Row | null | undefined, ...keys: string[]) {
  if (!row) return false;
  for (const key of keys) {
    const value = row[key];
    if (value === true || value === 'true' || value === 1 || value === '1') return true;
  }
  return false;
}

function isMissingRpc(message: string | null | undefined) {
  const normalized = String(message ?? '').toLowerCase();
  return normalized.includes('could not find the function') || normalized.includes('schema cache') || normalized.includes('pgrst202');
}

function detailRpc(feature: ActivityChatFeature) {
  if (feature === 'trip') return { name: 'get_trip_detail', params: (id: string) => ({ p_trip_id: id }) };
  if (feature === 'event') return { name: 'get_event_detail', params: (id: string) => ({ p_event_id: id }) };
  return { name: 'get_community_detail', params: (id: string) => ({ p_community_id: id }) };
}

function detailTable(feature: ActivityChatFeature) {
  return feature === 'trip' ? 'trips' : feature === 'event' ? 'events' : 'communities';
}

function detailTitle(feature: ActivityChatFeature, row: Row | null) {
  return feature === 'community' ? text(row, 'name') : text(row, 'title');
}

function detailHref(feature: ActivityChatFeature, id: string) {
  return feature === 'community' ? `/community/${id}` : `/${feature}s/${id}`;
}

function mapMessage(row: Row): ChatMessage {
  const translations = row.translations && typeof row.translations === 'object' && !Array.isArray(row.translations)
    ? row.translations as Record<string, string>
    : {};
  return {
    id: text(row, 'id'),
    senderId: text(row, 'sender_id'),
    senderName: text(row, 'sender_name') || 'Melo member',
    originalText: text(row, 'original_text'),
    sourceLanguage: text(row, 'source_language') || 'en',
    translations,
    createdAt: text(row, 'created_at'),
    messageType: (text(row, 'message_type') as MessageType) || 'text',
    mediaPath: text(row, 'media_path') || null,
    latitude: row.latitude == null ? null : Number(row.latitude),
    longitude: row.longitude == null ? null : Number(row.longitude),
    locationLabel: text(row, 'location_label') || null,
    stickerCode: text(row, 'sticker_code') || null,
  };
}

function mapAnnouncement(row: Row): Announcement {
  return {
    id: text(row, 'id'),
    authorName: text(row, 'author_name') || 'Melo Organizer',
    message: text(row, 'message'),
    isPinned: bool(row, 'is_pinned'),
    createdAt: text(row, 'created_at'),
  };
}

async function loadDetail(feature: ActivityChatFeature, id: string): Promise<Row | null> {
  const rpc = detailRpc(feature);
  const [rpcResult, directResult] = await Promise.all([
    rpcRequest<unknown>(rpc.name, rpc.params(id)),
    restSelect<Row[]>(detailTable(feature), `select=*&id=eq.${encodeURIComponent(id)}&limit=1`),
  ]);
  const rpcRow = rowsOf(rpcResult.data)[0] ?? null;
  const directRow = rowsOf(directResult.data)[0] ?? null;
  if (!rpcRow && !directRow && rpcResult.error && directResult.error) throw new Error(rpcResult.error || directResult.error);
  return rpcRow || directRow ? { ...(directRow ?? {}), ...(rpcRow ?? {}) } : null;
}

async function canAccess(feature: ActivityChatFeature, id: string, userId: string, detail: Row | null) {
  if (feature === 'trip') {
    const rpc = await rpcRequest<boolean>('can_access_trip_chat', { p_trip_id: id });
    if (!rpc.error && rpc.data === true) return true;
    const [trip, request] = await Promise.all([
      restSelect<Row[]>('trips', `select=organizer_id&id=eq.${encodeURIComponent(id)}&limit=1`),
      restSelect<Row[]>('trip_join_requests', `select=status&trip_id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(userId)}&limit=1`),
    ]);
    if (text(rowsOf(trip.data)[0], 'organizer_id') === userId) return true;
    if (text(rowsOf(request.data)[0], 'status').toLowerCase() === 'approved') return true;
    if (rpc.error && !isMissingRpc(rpc.error)) throw new Error(rpc.error);
    return false;
  }

  if (feature === 'event') {
    const rpc = await rpcRequest<boolean>('can_access_event_chat', { p_event_id: id });
    if (!rpc.error) return Boolean(rpc.data);
    if (!isMissingRpc(rpc.error)) throw new Error(rpc.error);
    return text(detail, 'organizer_id') === userId || bool(detail, 'is_organizer', 'is_joined');
  }

  return text(detail, 'owner_id') === userId || bool(detail, 'is_owner', 'is_member');
}

async function loadMessages(feature: ActivityChatFeature, id: string) {
  if (feature === 'trip') {
    const result = await rpcRequest<Row[]>('get_trip_chat_messages', { p_trip_id: id });
    if (result.error) throw new Error(result.error);
    return rowsOf(result.data).map(mapMessage);
  }
  if (feature === 'event') {
    const result = await rpcRequest<Row[]>('get_event_chat_messages', { p_event_id: id });
    if (result.error) throw new Error(result.error);
    return rowsOf(result.data).map(mapMessage);
  }
  const v2 = await rpcRequest<Row[]>('get_community_messages_v2', { p_community_id: id });
  if (!v2.error) return rowsOf(v2.data).map(mapMessage);
  if (!isMissingRpc(v2.error)) throw new Error(v2.error);
  const legacy = await rpcRequest<Row[]>('get_community_messages', { p_community_id: id });
  if (legacy.error) throw new Error(legacy.error);
  return rowsOf(legacy.data).map(mapMessage);
}

async function loadAnnouncements(feature: ActivityChatFeature, id: string) {
  const result = await rpcRequest<Row[]>('get_activity_chat_announcements', {
    p_activity_type: feature,
    p_activity_id: id,
    p_limit: 50,
  });
  if (result.error) {
    if (isMissingRpc(result.error)) return [];
    throw new Error(result.error);
  }
  return rowsOf(result.data).map(mapAnnouncement).filter((item) => item.id);
}

async function loadCanPublish(feature: ActivityChatFeature, id: string) {
  const result = await rpcRequest<boolean>('can_publish_activity_chat_announcement', {
    p_activity_type: feature,
    p_activity_id: id,
  });
  if (result.error) {
    if (isMissingRpc(result.error)) return false;
    throw new Error(result.error);
  }
  return Boolean(result.data);
}

async function loadLifecycle(feature: ActivityChatFeature, id: string, detail: Row | null): Promise<Lifecycle> {
  if (feature === 'community') return { canWrite: true, status: 'active', chatMode: 'group' };
  const result = await rpcRequest<Row | Row[]>('get_activity_chat_lifecycle', {
    p_activity_type: feature,
    p_activity_id: id,
  });
  if (!result.error) {
    const row = rowsOf(result.data)[0];
    if (row) return {
      canWrite: bool(row, 'can_write'),
      status: text(row, 'chat_status') || 'active',
      chatMode: text(row, 'chat_mode') || 'group',
    };
  }
  if (result.error && !isMissingRpc(result.error)) throw new Error(result.error);
  const status = text(detail, 'lifecycle_status', 'status').toLowerCase();
  const closed = Boolean(detail?.archived_at) || ['archived', 'cancelled'].includes(status);
  return { canWrite: !closed, status: closed ? 'archived' : 'active', chatMode: 'group' };
}

async function sendTextMessage(feature: ActivityChatFeature, id: string, body: string, locale: string) {
  const common = {
    p_original_text: body,
    p_source_language: locale,
    p_translations: { [locale]: body },
  };
  let result;
  if (feature === 'trip') {
    result = await rpcRequest<Row | Row[]>('send_trip_chat_message', {
      p_trip_id: id, ...common, p_message_type: 'text', p_media_path: null, p_latitude: null, p_longitude: null, p_location_label: null, p_sticker_code: null,
    });
  } else if (feature === 'event') {
    result = await rpcRequest<Row | Row[]>('send_event_chat_message', {
      p_event_id: id, ...common, p_message_type: 'text', p_media_path: null, p_latitude: null, p_longitude: null, p_location_label: null, p_sticker_code: null,
    });
  } else {
    result = await rpcRequest<Row | Row[]>('send_community_message_v2', {
      p_community_id: id, ...common, p_message_type: 'text', p_media_path: null, p_latitude: null, p_longitude: null, p_location_label: null, p_sticker_code: null,
    });
    if (result.error && isMissingRpc(result.error)) {
      result = await rpcRequest<Row | Row[]>('send_community_message', { p_community_id: id, ...common });
    }
  }
  if (result.error) throw new Error(result.error);
  const row = rowsOf(result.data)[0];
  if (!row) throw new Error('Unable to save message.');
  return mapMessage(row);
}

async function publishAnnouncement(feature: ActivityChatFeature, id: string, message: string) {
  const result = await rpcRequest<string>('create_activity_chat_announcement', {
    p_activity_type: feature,
    p_activity_id: id,
    p_message: message,
  });
  if (result.error) throw new Error(result.error);
}

function localeTag(locale: string) {
  return ({ th: 'th-TH', en: 'en-US', de: 'de-DE', zh: 'zh-CN', ja: 'ja-JP', ko: 'ko-KR' } as Record<string, string>)[locale] ?? 'en-US';
}

function formatTime(value: string, locale: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(localeTag(locale), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date);
}

function translatedBody(message: ChatMessage, locale: string) {
  const translated = message.translations?.[locale]?.trim();
  if (translated) return { body: translated, translated: translated !== message.originalText && message.sourceLanguage !== locale };
  return { body: message.originalText, translated: false };
}

function lifecycleText(lifecycle: Lifecycle, copy: (typeof activityChatCopy)[keyof typeof activityChatCopy]) {
  if (lifecycle.chatMode === 'announcement_only') return copy.announcementOnly;
  if (lifecycle.status === 'archived' || lifecycle.status === 'cancelled' || lifecycle.status === 'disabled') return copy.archived;
  if (lifecycle.status === 'post_activity') return copy.postActivity;
  if (!lifecycle.canWrite) return copy.chatClosed;
  return copy.active;
}

export function ActivityChatExperience({ feature, id }: { feature: ActivityChatFeature; id: string }) {
  const router = useRouter();
  const { locale } = useLocale();
  const copy = activityChatCopy[locale];
  const auth = authCopy[locale];
  const featureCopy = copy.features[feature];
  const configured = isSupabaseConfigured();
  const [user, setUser] = useState<MeloUser | null>(null);
  const [state, setState] = useState<RoomState>({ title: '', allowed: false, messages: [], announcements: [], canPublish: false, lifecycle: { canWrite: true, status: 'active', chatMode: 'group' } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [announcementDraft, setAnnouncementDraft] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [showAnnouncementComposer, setShowAnnouncementComposer] = useState(false);
  const [showAnnouncementHistory, setShowAnnouncementHistory] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async (currentUser: MeloUser, quiet = false) => {
    if (!quiet) setLoading(true);
    setError('');
    try {
      const detail = await loadDetail(feature, id);
      const allowed = await canAccess(feature, id, currentUser.id, detail);
      const [announcements, canPublish, lifecycle] = await Promise.all([
        loadAnnouncements(feature, id),
        loadCanPublish(feature, id),
        loadLifecycle(feature, id, detail),
      ]);
      const messages = allowed ? await loadMessages(feature, id) : [];
      setState({ title: detailTitle(feature, detail) || featureCopy.title, allowed, messages, announcements, canPublish, lifecycle });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : copy.loadFailed);
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [copy.loadFailed, feature, featureCopy.title, id]);

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
    if (!user || !state.allowed) return undefined;
    const timer = window.setInterval(() => void load(user, true), 3000);
    return () => window.clearInterval(timer);
  }, [load, state.allowed, user]);

  useEffect(() => {
    if (state.messages.length) endRef.current?.scrollIntoView({ block: 'end' });
  }, [state.messages.length]);

  const latestAnnouncement = useMemo(() => state.announcements.find((item) => item.isPinned) ?? state.announcements[0] ?? null, [state.announcements]);
  const canSend = state.allowed && state.lifecycle.canWrite && state.lifecycle.chatMode !== 'announcement_only';

  async function handleSend() {
    const body = draft.trim();
    if (!body || !user || !canSend || sending) return;
    setSending(true);
    setError('');
    try {
      const message = await sendTextMessage(feature, id, body, locale);
      setDraft('');
      setState((current) => ({ ...current, messages: [...current.messages.filter((item) => item.id !== message.id), message] }));
      void invokeEdgeFunction('notify-chat-message', { kind: feature, entityId: id, messageId: message.id, preview: body.slice(0, 180) }).catch(() => undefined);
      window.setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 30);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : copy.sendFailed);
    } finally {
      setSending(false);
    }
  }

  async function handlePublish() {
    const body = announcementDraft.trim();
    if (!body || !state.canPublish || publishing) return;
    setPublishing(true);
    setError('');
    try {
      await publishAnnouncement(feature, id, body);
      setAnnouncementDraft('');
      setShowAnnouncementComposer(false);
      if (user) await load(user, true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : copy.publishFailed);
    } finally {
      setPublishing(false);
    }
  }

  if (!configured) return <main className={styles.page}><Header /><div className={styles.centerState}>{auth.envMissing}</div></main>;

  return (
    <main className={styles.page}>
      <Header />
      <section className={styles.shell}>
        <div className={styles.topbar}>
          <Link className={styles.backLink} href={detailHref(feature, id)}>‹ <span>{featureCopy.backLabel}</span></Link>
          <div className={styles.livePill}><i />{copy.live}</div>
          <button type="button" className={styles.refreshButton} disabled={!user || loading} onClick={() => user && void load(user)}>{copy.refresh}</button>
        </div>

        <header className={styles.roomHeader}>
          <div className={styles.roomMark}>💬</div>
          <div><span>{copy.eyebrow} · {featureCopy.title}</span><h1>{state.title || featureCopy.title}</h1><p>{copy.room}</p></div>
        </header>

        {loading ? (
          <div className={styles.centerState}><span className={styles.spinner} />{copy.loading}</div>
        ) : error && !state.title ? (
          <div className={styles.errorState}><strong>{copy.loadFailed}</strong><p>{error}</p><button type="button" onClick={() => user && void load(user)}>{copy.retry}</button></div>
        ) : !state.allowed ? (
          <div className={styles.accessCard}><span>🔒</span><div><h2>{copy.accessDenied}</h2><p>{copy.accessDeniedBody}</p><Link href={detailHref(feature, id)}>{featureCopy.backLabel}</Link></div></div>
        ) : (
          <div className={styles.layout}>
            <section className={styles.chatColumn}>
              <div className={`${styles.lifecycleBanner} ${canSend ? styles.lifecycleOpen : styles.lifecycleClosed}`}>
                <span>{canSend ? '●' : '◉'}</span><p>{lifecycleText(state.lifecycle, copy)}</p>
              </div>

              {(latestAnnouncement || state.canPublish) && (
                <section className={styles.announcementPanel}>
                  <div className={styles.panelHeading}>
                    <div><span>📢</span><div><small>{copy.announcement}</small><h2>{copy.latestAnnouncement}</h2></div></div>
                    <div className={styles.headingActions}>
                      {state.announcements.length > 1 && <button type="button" onClick={() => setShowAnnouncementHistory((value) => !value)}>{showAnnouncementHistory ? copy.hideHistory : copy.showAll}</button>}
                      {state.canPublish && <button type="button" className={styles.publishMini} onClick={() => setShowAnnouncementComposer((value) => !value)}>{copy.publishAnnouncement}</button>}
                    </div>
                  </div>

                  {latestAnnouncement ? (
                    <article className={styles.latestAnnouncement}><p>{latestAnnouncement.message}</p><small>{copy.announcementBy} {latestAnnouncement.authorName} · {formatTime(latestAnnouncement.createdAt, locale)}</small></article>
                  ) : <div className={styles.noAnnouncement}>{copy.noAnnouncements}</div>}

                  {showAnnouncementComposer && state.canPublish && (
                    <div className={styles.announcementComposer}>
                      <textarea maxLength={1200} value={announcementDraft} onChange={(event) => setAnnouncementDraft(event.target.value)} placeholder={copy.announcementPlaceholder} />
                      <div><small>{announcementDraft.length}/1200 {copy.chars}</small><button type="button" disabled={!announcementDraft.trim() || publishing} onClick={() => void handlePublish()}>{publishing ? copy.publishing : copy.publish}</button></div>
                    </div>
                  )}

                  {showAnnouncementHistory && state.announcements.length > 0 && (
                    <div className={styles.announcementHistory}>{state.announcements.map((item) => <article key={item.id}><p>{item.message}</p><small>{copy.announcementBy} {item.authorName} · {formatTime(item.createdAt, locale)}</small></article>)}</div>
                  )}
                </section>
              )}

              <section className={styles.messagesPanel}>
                <div className={styles.messagesTitle}><div><small>MELO LIVE</small><h2>{copy.messages}</h2></div><span>{state.messages.length}</span></div>
                <div className={styles.messageScroll}>
                  {state.messages.length === 0 ? <div className={styles.emptyMessages}><span>✦</span><p>{copy.noMessages}</p></div> : state.messages.map((message) => {
                    const own = message.senderId === user?.id;
                    const translated = translatedBody(message, locale);
                    const mediaUrl = message.mediaPath ? publicStorageUrl('chat-media', message.mediaPath) : '';
                    const validLocation = Number.isFinite(message.latitude) && Number.isFinite(message.longitude);
                    return (
                      <article key={message.id} className={`${styles.messageRow} ${own ? styles.ownRow : ''}`}>
                        {!own && <div className={styles.avatar}>{message.senderName.slice(0, 1).toUpperCase()}</div>}
                        <div className={styles.messageBody}>
                          {!own && <strong className={styles.sender}>{message.senderName}</strong>}
                          <div className={`${styles.bubble} ${own ? styles.ownBubble : ''}`}>
                            {message.messageType === 'image' && mediaUrl ? <><img src={mediaUrl} alt={copy.photo} className={styles.chatImage} />{message.originalText && <p>{translated.body}</p>}</> : null}
                            {message.messageType === 'location' && validLocation ? <div className={styles.locationCard}><span>⌖</span><div><strong>{message.locationLabel || copy.location}</strong><a target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${message.latitude},${message.longitude}`}>{copy.openMap} ↗</a></div></div> : null}
                            {message.messageType === 'sticker' ? <div className={styles.sticker}>{message.stickerCode || '✨'}</div> : null}
                            {message.messageType === 'text' ? <p>{translated.body}</p> : null}
                          </div>
                          <div className={`${styles.messageMeta} ${own ? styles.ownMeta : ''}`}><span>{formatTime(message.createdAt, locale)}</span>{translated.translated && <span>· {copy.translated}</span>}</div>
                        </div>
                      </article>
                    );
                  })}
                  <div ref={endRef} />
                </div>

                <div className={`${styles.composer} ${!canSend ? styles.composerDisabled : ''}`}>
                  <textarea
                    rows={1}
                    maxLength={2000}
                    disabled={!canSend || sending}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void handleSend(); }
                    }}
                    placeholder={canSend ? copy.composerPlaceholder : (state.lifecycle.chatMode === 'announcement_only' ? copy.announcementOnly : copy.chatClosed)}
                  />
                  <button type="button" disabled={!canSend || !draft.trim() || sending} onClick={() => void handleSend()}>{sending ? copy.sending : copy.send}</button>
                </div>
                {error && <div className={styles.inlineError}>{error}</div>}
              </section>
            </section>

            <aside className={styles.sideColumn}>
              <div className={styles.sideCard}><span>✦</span><h3>{featureCopy.title}</h3><p>{state.title}</p><Link href={detailHref(feature, id)}>{featureCopy.backLabel} →</Link></div>
              <div className={styles.sideCard}><span>📢</span><h3>{copy.announcements}</h3><strong>{state.announcements.length}</strong><p>{copy.live}</p></div>
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}
