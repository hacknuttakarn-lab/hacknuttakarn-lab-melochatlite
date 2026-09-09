'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { useLocale } from '@/components/SiteProviders';
import { authCopy } from '@/i18n/authUi';
import { memberCopy, type MemberFeature } from '@/i18n/memberUi';
import { getCurrentUser, isSupabaseConfigured, restSelect, rpcRequest } from '@/lib/supabase/browser';
import styles from './MemberFeaturePage.module.css';

type Row = Record<string, unknown>;
type MeloUser = { id: string; email?: string };
type ViewItem = {
  id: string;
  title: string;
  description?: string;
  eyebrow?: string;
  meta1?: string;
  meta2?: string;
  badge?: string;
  score?: number;
  metric?: string;
  metricLabel?: string;
};

type LoadedFeature = {
  items: ViewItem[];
  stats?: Array<{ label: string; value: string }>;
};

function rowsOf(value: unknown): Row[] {
  if (Array.isArray(value)) return value.filter((item): item is Row => Boolean(item) && typeof item === 'object');
  if (value && typeof value === 'object') return [value as Row];
  return [];
}

function text(row: Row, ...keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return '';
}

function numberValue(row: Row, ...keys: string[]) {
  for (const key of keys) {
    const value = Number(row[key]);
    if (Number.isFinite(value)) return value;
  }
  return 0;
}

function listText(value: unknown) {
  if (!Array.isArray(value)) return '';
  return value.map(String).filter(Boolean).slice(0, 4).join(' · ');
}

function mergeById(...groups: Row[][]) {
  const map = new Map<string, Row>();
  for (const group of groups) {
    for (const row of group) {
      const id = text(row, 'id', 'user_id', 'quest_id');
      if (!id) continue;
      map.set(id, { ...(map.get(id) ?? {}), ...row });
    }
  }
  return [...map.values()];
}

function dateLabel(value: string, locale: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  try {
    return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
  } catch {
    return value;
  }
}

async function loadFriends(): Promise<LoadedFeature> {
  let result = await rpcRequest<Row[]>('get_friend_match_candidates_v2', { p_limit: 36 });
  if (result.error) result = await rpcRequest<Row[]>('get_friend_match_candidates', { p_limit: 36 });
  if (result.error) throw new Error(result.error);
  const items = rowsOf(result.data).map((row, index) => ({
    id: text(row, 'user_id') || `friend-${index}`,
    title: text(row, 'display_name') || 'Melo User',
    description: text(row, 'bio') || listText(row.shared_interests) || listText(row.interests),
    eyebrow: listText(row.shared_interests) || listText(row.shared_languages),
    meta1: [text(row, 'city'), text(row, 'country')].filter(Boolean).join(', '),
    meta2: text(row, 'primary_language'),
    badge: text(row, 'request_status'),
    score: Math.max(0, Math.min(100, numberValue(row, 'match_score'))),
  }));
  return { items };
}

async function loadLove(userId: string, copy: ReturnType<typeof useMemberCopy>): Promise<LoadedFeature> {
  const encoded = encodeURIComponent(userId);
  const [outgoing, incoming, favorites, matchesA, matchesB] = await Promise.all([
    restSelect<Row[]>('profile_likes', `select=liked_user_id,created_at&liker_id=eq.${encoded}&order=created_at.desc`),
    restSelect<Row[]>('profile_likes', `select=liker_id,created_at&liked_user_id=eq.${encoded}&order=created_at.desc`),
    restSelect<Row[]>('profile_favorites', `select=favorite_user_id,created_at&owner_id=eq.${encoded}&order=created_at.desc`),
    restSelect<Row[]>('profile_matches', `select=id,user_a_id,user_b_id,matched_at&user_a_id=eq.${encoded}&order=matched_at.desc`),
    restSelect<Row[]>('profile_matches', `select=id,user_a_id,user_b_id,matched_at&user_b_id=eq.${encoded}&order=matched_at.desc`),
  ]);
  const firstError = outgoing.error || incoming.error || favorites.error || matchesA.error || matchesB.error;
  if (firstError) throw new Error(firstError);
  const counts = [
    { id: 'liked', title: copy.liked, count: rowsOf(outgoing.data).length, symbol: '♡' },
    { id: 'likes-you', title: copy.likesYou, count: rowsOf(incoming.data).length, symbol: '♥' },
    { id: 'saved', title: copy.saved, count: rowsOf(favorites.data).length, symbol: '☆' },
    { id: 'matched', title: copy.matched, count: mergeById(rowsOf(matchesA.data), rowsOf(matchesB.data)).length, symbol: '∞' },
  ];
  return {
    items: counts.map((item) => ({ id: item.id, title: item.title, metric: String(item.count), metricLabel: item.symbol })),
    stats: counts.map((item) => ({ label: item.title, value: String(item.count) })),
  };
}

async function loadPartners(): Promise<LoadedFeature> {
  const result = await rpcRequest<Row[]>('melo_public_businesses');
  if (result.error) throw new Error(result.error);
  return {
    items: rowsOf(result.data).map((row, index) => ({
      id: text(row, 'id') || `partner-${index}`,
      title: text(row, 'display_name', 'legal_name') || 'Melo Partner',
      description: text(row, 'description'),
      eyebrow: text(row, 'business_type', 'category'),
      meta1: [text(row, 'city'), text(row, 'country')].filter(Boolean).join(', '),
      meta2: text(row, 'primary_language'),
      badge: text(row, 'status'),
    })),
  };
}

async function loadDeals(): Promise<LoadedFeature> {
  const partners = await rpcRequest<Row[]>('melo_public_businesses');
  if (partners.error) throw new Error(partners.error);
  const partnerRows = rowsOf(partners.data);
  const ids = partnerRows.map((row) => text(row, 'id')).filter(Boolean);
  if (!ids.length) return { items: [] };
  const services = await rpcRequest<Row[]>('melo_public_business_service_summaries', {
    p_business_ids: ids,
    p_limit: Math.max(24, Math.min(96, ids.length * 8)),
  });
  if (services.error) throw new Error(services.error);
  const names = new Map(partnerRows.map((row) => [text(row, 'id'), text(row, 'display_name', 'legal_name')]));
  const rows = rowsOf(services.data).filter((row) => ['promotion', 'coupon', 'package'].includes(text(row, 'detail_type')));
  return {
    items: rows.map((row, index) => {
      const price = row.price_from == null ? '' : `${Number(row.price_from).toLocaleString()} ${text(row, 'currency') || 'THB'}`;
      return {
        id: text(row, 'id') || `deal-${index}`,
        title: text(row, 'title') || 'Melo Deal',
        description: text(row, 'description'),
        eyebrow: names.get(text(row, 'business_id')) || text(row, 'category'),
        meta1: text(row, 'detail_type'),
        meta2: price,
        badge: row.melo_member_only === true ? 'Melo Member' : '',
      };
    }),
  };
}

async function loadTrips(locale: string): Promise<LoadedFeature> {
  const [publicResult, myResult] = await Promise.all([
    rpcRequest<Row[]>('get_public_trips'),
    rpcRequest<Row[]>('get_my_trips'),
  ]);
  if (publicResult.error && myResult.error) throw new Error(publicResult.error);
  const rows = mergeById(rowsOf(publicResult.data), rowsOf(myResult.data));
  return {
    items: rows.map((row, index) => ({
      id: text(row, 'id') || `trip-${index}`,
      title: text(row, 'title') || 'Melo Trip',
      description: text(row, 'description'),
      eyebrow: text(row, 'category'),
      meta1: [text(row, 'start_point'), text(row, 'destination')].filter(Boolean).join(' → '),
      meta2: dateLabel(text(row, 'start_date'), locale),
      badge: text(row, 'lifecycle_status', 'status'),
    })),
  };
}

async function loadEvents(locale: string): Promise<LoadedFeature> {
  const [publicResult, myResult] = await Promise.all([
    rpcRequest<Row[]>('get_public_events'),
    rpcRequest<Row[]>('get_my_events'),
  ]);
  if (publicResult.error && myResult.error) throw new Error(publicResult.error);
  const rows = mergeById(rowsOf(publicResult.data), rowsOf(myResult.data));
  return {
    items: rows.map((row, index) => ({
      id: text(row, 'id') || `event-${index}`,
      title: text(row, 'title') || 'Melo Event',
      description: text(row, 'description'),
      eyebrow: text(row, 'category'),
      meta1: text(row, 'venue_name', 'city'),
      meta2: dateLabel(text(row, 'start_at'), locale),
      badge: text(row, 'lifecycle_status', 'status'),
    })),
  };
}

async function loadCommunity(): Promise<LoadedFeature> {
  const [publicResult, myResult] = await Promise.all([
    rpcRequest<Row[]>('get_communities'),
    rpcRequest<Row[]>('get_my_communities'),
  ]);
  if (publicResult.error && myResult.error) throw new Error(publicResult.error);
  const rows = mergeById(rowsOf(publicResult.data), rowsOf(myResult.data));
  return {
    items: rows.map((row, index) => ({
      id: text(row, 'id') || `community-${index}`,
      title: text(row, 'name') || 'Melo Community',
      description: text(row, 'description'),
      eyebrow: text(row, 'category'),
      meta1: [text(row, 'country'), text(row, 'privacy')].filter(Boolean).join(' · '),
      meta2: `${numberValue(row, 'member_count')} members`,
      badge: row.is_member === true ? 'Joined' : '',
    })),
  };
}

async function loadQuests(locale: string): Promise<LoadedFeature> {
  const [summaryResult, questResult, progressResult] = await Promise.all([
    rpcRequest<Row>('get_my_melo_quest_summary_v1'),
    restSelect<Row[]>('melo_quests_v1', 'select=id,slug,category,title_th,title_en,description_th,description_en,reward_points,verification_level,progress_target,is_sponsored,starts_at,ends_at,sort_order&is_active=eq.true&order=sort_order.asc'),
    restSelect<Row[]>('melo_user_quest_progress_v1', 'select=quest_id,status,progress_current'),
  ]);
  if (questResult.error) throw new Error(questResult.error);
  const progress = new Map(rowsOf(progressResult.data).map((row) => [text(row, 'quest_id'), row]));
  const preferThai = locale.toLowerCase().startsWith('th');
  const items = rowsOf(questResult.data).map((row, index) => {
    const current = progress.get(text(row, 'id'));
    const currentValue = current ? numberValue(current, 'progress_current') : 0;
    const target = Math.max(1, numberValue(row, 'progress_target'));
    return {
      id: text(row, 'id') || `quest-${index}`,
      title: preferThai ? text(row, 'title_th', 'title_en') : text(row, 'title_en', 'title_th'),
      description: preferThai ? text(row, 'description_th', 'description_en') : text(row, 'description_en', 'description_th'),
      eyebrow: text(row, 'category'),
      meta1: `${currentValue}/${target}`,
      meta2: `+${numberValue(row, 'reward_points')} pts`,
      badge: current ? text(current, 'status') : 'not_started',
      score: Math.max(0, Math.min(100, Math.round((currentValue / target) * 100))),
    };
  });
  const summary = rowsOf(summaryResult.data)[0] ?? (summaryResult.data && typeof summaryResult.data === 'object' ? summaryResult.data as Row : {});
  return {
    items,
    stats: [
      { label: 'Melo Points', value: String(numberValue(summary, 'points')) },
      { label: 'Active', value: String(numberValue(summary, 'active_count')) },
      { label: 'Completed', value: String(numberValue(summary, 'completed_count')) },
    ],
  };
}

function useMemberCopy() {
  const { locale } = useLocale();
  return memberCopy[locale];
}

export function MemberFeaturePage({ feature }: { feature: MemberFeature }) {
  const { locale } = useLocale();
  const copy = useMemberCopy();
  const auth = authCopy[locale];
  const featureCopy = copy.features[feature];
  const router = useRouter();
  const [user, setUser] = useState<MeloUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<LoadedFeature>({ items: [] });
  const [error, setError] = useState('');
  const configured = isSupabaseConfigured();

  const localeTag = useMemo(() => ({ th: 'th-TH', en: 'en-US', de: 'de-DE', zh: 'zh-CN', ja: 'ja-JP', ko: 'ko-KR' }[locale]), [locale]);

  async function load(currentUser: MeloUser, background = false) {
    if (background) setRefreshing(true); else setLoading(true);
    setError('');
    try {
      let next: LoadedFeature;
      switch (feature) {
        case 'friends': next = await loadFriends(); break;
        case 'love': next = await loadLove(currentUser.id, copy); break;
        case 'deals': next = await loadDeals(); break;
        case 'partners': next = await loadPartners(); break;
        case 'trips': next = await loadTrips(localeTag); break;
        case 'events': next = await loadEvents(localeTag); break;
        case 'community': next = await loadCommunity(); break;
        case 'quests': next = await loadQuests(localeTag); break;
      }
      setData(next);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : copy.loadFailed);
      setData({ items: [] });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feature, locale, configured, router]);

  if (!configured) {
    return <main className={styles.page}><Header /><div className={styles.centerState}>{auth.envMissing}</div></main>;
  }

  return (
    <main className={styles.page}>
      <Header />
      <section className={styles.shell}>
        <div className={styles.hero}>
          <div>
            <span className={styles.kicker}>{copy.portal}</span>
            <h1>{featureCopy.title}</h1>
            <p>{featureCopy.subtitle}</p>
            <div className={styles.livePill}><i />{copy.liveData}</div>
          </div>
          <div className={styles.heroActions}>
            <Link href="/account" className={styles.secondaryButton}>{auth.myAccount}</Link>
            <button type="button" className={styles.primaryButton} disabled={!user || refreshing} onClick={() => user && void load(user, true)}>{refreshing ? copy.refreshing : copy.refresh}</button>
          </div>
        </div>

        {data.stats && data.stats.length > 0 && (
          <div className={styles.statGrid}>
            {data.stats.map((stat) => <article key={stat.label}><strong>{stat.value}</strong><span>{stat.label}</span></article>)}
          </div>
        )}

        <div className={styles.toolbar}>
          <strong>{featureCopy.title}</strong>
          <span>{data.items.length} {copy.results}</span>
        </div>

        {loading ? (
          <div className={styles.centerState}><span className={styles.spinner} />{copy.loading}</div>
        ) : error ? (
          <div className={styles.errorState}><strong>{copy.loadFailed}</strong><p>{error}</p><button type="button" onClick={() => user && void load(user)}>{copy.retry}</button></div>
        ) : data.items.length === 0 ? (
          <div className={styles.emptyState}><div>◌</div><strong>{featureCopy.empty}</strong><p>{copy.webNote}</p></div>
        ) : (
          <div className={`${styles.grid} ${feature === 'love' ? styles.metricGrid : ''}`}>
            {data.items.map((item) => (
              <article className={`${styles.card} ${item.metric ? styles.metricCard : ''}`} key={item.id}>
                {item.metric ? (
                  <>
                    <span className={styles.metricSymbol}>{item.metricLabel}</span>
                    <strong className={styles.metricValue}>{item.metric}</strong>
                    <h3>{item.title}</h3>
                  </>
                ) : (
                  <>
                    <div className={styles.cardTop}>
                      <span className={styles.cardIcon}>{item.title.slice(0, 1).toUpperCase()}</span>
                      {item.badge && <span className={styles.badge}>{item.badge.replaceAll('_', ' ')}</span>}
                    </div>
                    {item.eyebrow && <small className={styles.eyebrow}>{item.eyebrow}</small>}
                    <h3>{item.title}</h3>
                    {item.description && <p>{item.description}</p>}
                    {(item.meta1 || item.meta2) && <div className={styles.meta}>{item.meta1 && <span>{item.meta1}</span>}{item.meta2 && <span>{item.meta2}</span>}</div>}
                    {typeof item.score === 'number' && item.score > 0 && <div className={styles.progress}><span style={{ width: `${item.score}%` }} /></div>}
                  </>
                )}
              </article>
            ))}
          </div>
        )}

        <div className={styles.note}>{copy.webNote}</div>
      </section>
    </main>
  );
}
