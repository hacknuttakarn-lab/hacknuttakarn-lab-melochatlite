'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { useLocale } from '@/components/SiteProviders';
import { authCopy } from '@/i18n/authUi';
import { exploreCopy, type ExploreFeature } from '@/i18n/exploreUi';
import { getCurrentUser, invokeEdgeFunction, isSupabaseConfigured, publicStorageUrl, restSelect, rpcRequest } from '@/lib/supabase/browser';
import styles from './ExploreExperience.module.css';
import { GLOBAL_COUNTRY_SCOPE, matchesCountryScope } from '@/lib/discoveryCountry';

type Row = Record<string, unknown>;
type MeloUser = { id: string; email?: string };

const COMMUNITY_CREATE_LABEL: Record<string, string> = {
  th: "+ สร้างคอมมูนิตี้",
  en: "+ Create Community",
  de: "+ Community erstellen",
  zh: "+ 创建社区",
  ja: "+ Communityを作成",
  ko: "+ 커뮤니티 만들기",
};

const COMMUNITY_MY_LABEL: Record<string, string> = {
  th: "คอมมูนิตี้ของฉัน",
  en: "My Community",
  de: "Meine Community",
  zh: "我的社区",
  ja: "マイコミュニティ",
  ko: "내 커뮤니티",
};

const COMMUNITY_JOIN_LABEL: Record<string, string> = {
  th: "เข้าร่วมกลุ่ม",
  en: "Join",
  de: "Beitreten",
  zh: "加入",
  ja: "参加",
  ko: "가입",
};

const COMMUNITY_JOINING_LABEL: Record<string, string> = {
  th: "กำลังเข้าร่วม…",
  en: "Joining…",
  de: "Beitritt…",
  zh: "正在加入…",
  ja: "参加中…",
  ko: "가입 중…",
};

type ExploreItem = {
  id: string;
  title: string;
  description: string;
  category: string;
  image: string;
  location: string;
  date: string;
  secondaryDate: string;
  organizer: string;
  status: string;
  price: string;
  badge: string;
  memberCount: number;
  progress: number;
  progressTarget: number;
  rewardPoints: number;
  mine: boolean;
  joined: boolean;
  recommended: boolean;
  memberOnly: boolean;
  raw: Row;
};

type Loaded = {
  items: ExploreItem[];
  points?: number;
};

function rowsOf(value: unknown): Row[] {
  if (Array.isArray(value)) return value.filter((row): row is Row => Boolean(row) && typeof row === 'object');
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

function num(row: Row, ...keys: string[]) {
  for (const key of keys) {
    const value = Number(row[key]);
    if (Number.isFinite(value)) return value;
  }
  return 0;
}

function bool(row: Row, ...keys: string[]) {
  for (const key of keys) {
    if (typeof row[key] === 'boolean') return row[key] as boolean;
  }
  return false;
}

function firstImage(row: Row) {
  for (const key of ['image_url', 'cover_image_url', 'profile_image_url', 'logo_url', 'photo_url', 'thumbnail_url']) {
    const value = row[key];
    if (typeof value === 'string' && /^https?:\/\//i.test(value)) return value;
  }
  for (const key of ['image_urls', 'images', 'photo_urls']) {
    const value = row[key];
    if (Array.isArray(value)) {
      const first = value.find((item) => typeof item === 'string' && /^https?:\/\//i.test(item));
      if (typeof first === 'string') return first;
    }
  }
  return '';
}

function communityImage(row: Row) {
  const raw = text(
    row,
    'image_path',
    'cover_image_path',
    'cover_path',
    'image_url',
    'cover_url',
    'photo_url',
    'thumbnail_url',
  );
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  const normalized = raw.replace(/^\/+/, '');
  if (normalized.startsWith('activity-images/')) {
    return publicStorageUrl('activity-images', normalized.slice('activity-images/'.length));
  }
  if (normalized.startsWith('community-images/')) {
    return publicStorageUrl('community-images', normalized.slice('community-images/'.length));
  }
  return publicStorageUrl('activity-images', normalized);
}

function formatDate(value: string, localeTag: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  try {
    return new Intl.DateTimeFormat(localeTag, { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
  } catch {
    return value;
  }
}

function mergeScoped(publicRows: Row[], mineRows: Row[], idKeys: string[]) {
  const map = new Map<string, Row>();
  const keyOf = (row: Row) => idKeys.map((key) => text(row, key)).find(Boolean) || '';
  for (const row of publicRows) {
    const id = keyOf(row);
    if (id) map.set(id, { ...row, __mine: false });
  }
  for (const row of mineRows) {
    const id = keyOf(row);
    if (id) map.set(id, { ...(map.get(id) ?? {}), ...row, __mine: true });
  }
  return [...map.values()];
}

function makeItem(row: Row, feature: ExploreFeature, localeTag: string, index: number): ExploreItem {
  const status = text(row, 'lifecycle_status', 'status', 'progress_status');
  const progress = num(row, 'progress_current', 'progress', 'current_progress');
  const progressTarget = num(row, 'progress_target', 'target', 'goal');
  const rawPrice = row.price_from ?? row.price ?? row.sale_price;
  const priceNumber = Number(rawPrice);
  const price = Number.isFinite(priceNumber) && rawPrice !== null && rawPrice !== ''
    ? `${priceNumber.toLocaleString(localeTag)} ${text(row, 'currency') || 'THB'}`
    : text(row, 'price_label');

  const common = {
    id: text(row, 'id', 'quest_id', 'business_id') || `${feature}-${index}`,
    title: text(row, 'title', 'name', 'display_name', 'legal_name', 'title_en', 'title_th') || 'Melo',
    description: text(row, 'description', 'description_en', 'description_th', 'short_description', 'bio'),
    category: text(row, 'category', 'business_type', 'detail_type', 'quest_category'),
    image:
      feature === 'community'
        ? communityImage(row)
        : (feature === 'trips' || feature === 'events') && text(row, 'image_path')
          ? publicStorageUrl('activity-images', text(row, 'image_path'))
          : firstImage(row),
    location: [text(row, 'venue_name', 'city', 'start_point'), text(row, 'country', 'destination')].filter(Boolean).join(' · '),
    date: formatDate(text(row, 'start_date', 'start_at', 'starts_at', 'created_at'), localeTag),
    secondaryDate: formatDate(text(row, 'end_date', 'end_at', 'ends_at'), localeTag),
    organizer: text(row, 'organizer_name', 'creator_name', 'owner_name', 'display_name'),
    status,
    price,
    badge: '',
    memberCount: num(row, 'member_count', 'current_members', 'attendee_count', 'participants_count'),
    progress,
    progressTarget,
    rewardPoints: num(row, 'reward_points', 'points'),
    mine: row.__mine === true,
    joined: bool(row, 'is_member', 'is_joined', 'joined') || row.__mine === true,
    recommended: bool(row, 'is_recommended', 'recommended', 'is_featured') || index < 6,
    memberOnly: bool(row, 'melo_member_only', 'member_only'),
    raw: row,
  } satisfies ExploreItem;

  if (feature === 'deals') {
    common.organizer = text(row, '__partner_name', 'partner_name', 'business_name');
    common.location = [text(row, '__partner_city'), text(row, '__partner_country')].filter(Boolean).join(' · ');
    const original = Number(row.original_price);
    const current = Number(row.price_from ?? row.price);
    const discounted = Number.isFinite(original) && Number.isFinite(current) && original > current;
    common.badge = common.memberOnly ? 'Melo Member' : (discounted ? 'Deal' : text(row, 'detail_type') || 'Partner');
  } else if (feature === 'partners') {
    common.badge = bool(row, 'is_verified', 'verified') ? 'Verified' : text(row, 'status');
  } else if (feature === 'quests') {
    common.badge = status || text(row, 'verification_level');
  } else if (common.mine || common.joined) {
    common.badge = 'Joined';
  } else {
    common.badge = status;
  }

  return common;
}

async function loadTrips(localeTag: string): Promise<Loaded> {
  const [publicResult, myResult] = await Promise.all([rpcRequest<Row[]>('get_public_trips'), rpcRequest<Row[]>('get_my_trips')]);
  if (publicResult.error && myResult.error) throw new Error(publicResult.error || myResult.error || 'Unable to load trips');
  const rows = mergeScoped(rowsOf(publicResult.data), rowsOf(myResult.data), ['id']);
  return { items: rows.map((row, index) => makeItem(row, 'trips', localeTag, index)) };
}

async function loadEvents(localeTag: string): Promise<Loaded> {
  const [publicResult, myResult] = await Promise.all([rpcRequest<Row[]>('get_public_events'), rpcRequest<Row[]>('get_my_events')]);
  if (publicResult.error && myResult.error) throw new Error(publicResult.error || myResult.error || 'Unable to load events');
  const rows = mergeScoped(rowsOf(publicResult.data), rowsOf(myResult.data), ['id']);
  return { items: rows.map((row, index) => makeItem(row, 'events', localeTag, index)) };
}

async function loadCommunity(localeTag: string, userId: string): Promise<Loaded> {
  const [publicResult, myResult, membershipResult, ownedResult] = await Promise.all([
    rpcRequest<Row[]>('get_communities'),
    rpcRequest<Row[]>('get_my_communities'),
    // Direct membership fallback keeps My Community correct even when the RPC
    // is stale or omits a newly joined/private community.
    restSelect<Row[]>('community_members', `select=community_id&user_id=eq.${encodeURIComponent(userId)}`),
    restSelect<Row[]>('communities', `select=*&owner_id=eq.${encodeURIComponent(userId)}&order=updated_at.desc`),
  ]);
  if (publicResult.error && myResult.error && membershipResult.error && ownedResult.error) {
    throw new Error(publicResult.error || myResult.error || membershipResult.error || ownedResult.error || 'Unable to load communities');
  }

  const memberIds = [...new Set(
    rowsOf(membershipResult.data).map((row) => text(row, 'community_id')).filter(Boolean),
  )];
  let joinedRows: Row[] = [];
  if (memberIds.length) {
    const joinedResult = await restSelect<Row[]>('communities', `select=*&id=in.(${memberIds.join(',')})`);
    if (!joinedResult.error) joinedRows = rowsOf(joinedResult.data);
  }

  const publicRows = rowsOf(publicResult.data);
  const myRows = [
    ...rowsOf(myResult.data),
    ...rowsOf(ownedResult.data),
    ...joinedRows,
  ];

  // The community RPCs do not consistently expose image_path. Enrich every
  // visible community from the source table so cover images created by the
  // mobile/web creator are not lost in the list view.
  const visibleIds = [...new Set(
    [...publicRows, ...myRows].map((row) => text(row, 'id', 'community_id')).filter(Boolean),
  )];
  let directRows: Row[] = [];
  if (visibleIds.length) {
    const directResult = await restSelect<Row[]>('communities', `select=*&id=in.(${visibleIds.join(',')})`);
    if (!directResult.error) directRows = rowsOf(directResult.data);
  }
  const directById = new Map(directRows.map((row) => [text(row, 'id', 'community_id'), row]));

  const rows = mergeScoped(publicRows, myRows, ['id']).map((row) => {
    const direct = directById.get(text(row, 'id', 'community_id'));
    if (!direct) return row;
    return {
      ...direct,
      ...row,
      image_path: text(direct, 'image_path') || text(row, 'image_path'),
      cover_image_path: text(direct, 'cover_image_path') || text(row, 'cover_image_path'),
      cover_path: text(direct, 'cover_path') || text(row, 'cover_path'),
    };
  });
  return { items: rows.map((row, index) => makeItem(row, 'community', localeTag, index)) };
}

async function loadPartners(localeTag: string): Promise<Loaded> {
  const result = await rpcRequest<Row[]>('melo_public_businesses');
  if (result.error) throw new Error(result.error);
  return { items: rowsOf(result.data).map((row, index) => makeItem(row, 'partners', localeTag, index)) };
}

function isActiveDealService(row: Row) {
  if (row.is_active === false) return false;
  const validUntil = text(row, 'valid_until');
  if (!validUntil) return true;
  const end = new Date(`${validUntil}T23:59:59`);
  return Number.isNaN(end.getTime()) || end.getTime() >= Date.now();
}

function dealPriority(row: Row) {
  const detailType = text(row, 'detail_type').toLowerCase();
  const original = Number(row.original_price);
  const current = Number(row.price_from ?? row.price);
  const discounted = Number.isFinite(original) && Number.isFinite(current) && original > current;
  const title = `${text(row, 'title')} ${text(row, 'description')} ${text(row, 'category')}`.toLowerCase();
  let score = 0;
  if (bool(row, 'melo_member_only')) score += 90;
  if (detailType === 'coupon') score += 80;
  if (detailType === 'promotion') score += 70;
  if (detailType === 'package') score += 60;
  if (discounted) score += 55;
  if (['discount', 'promotion', 'promo', 'deal', 'special', 'sale', 'ส่วนลด', 'โปรโมชั่น', 'คูปอง'].some((keyword) => title.includes(keyword))) score += 40;
  const updated = new Date(text(row, 'updated_at', 'created_at')).getTime();
  if (Number.isFinite(updated)) score += Math.min(9, Math.max(0, updated / 1_000_000_000_000));
  return score;
}

async function loadDeals(localeTag: string): Promise<Loaded> {
  const partners = await rpcRequest<Row[]>('melo_public_businesses');
  if (partners.error) throw new Error(partners.error);
  const partnerRows = rowsOf(partners.data);
  const ids = partnerRows.map((row) => text(row, 'id')).filter(Boolean);
  if (!ids.length) return { items: [] };
  const services = await rpcRequest<Row[]>('melo_public_business_service_summaries', { p_business_ids: ids, p_limit: Math.max(36, Math.min(120, ids.length * 10)) });
  if (services.error) throw new Error(services.error);
  const partnerMeta = new Map(partnerRows.map((row) => [text(row, 'id'), {
    name: text(row, 'display_name', 'legal_name'),
    city: text(row, 'city'),
    country: text(row, 'country'),
  }]));
  // Match Melo mobile Hot Deals: keep every active public Partner service in the pool.
  // Promotion/coupon/package/member/discounted items are ranked first instead of being
  // the only records allowed through. The previous web-only filter caused valid Deals
  // to disappear when a Partner service used detail_type = "standard".
  const rows = rowsOf(services.data)
    .filter(isActiveDealService)
    .map((row) => {
      const partner = partnerMeta.get(text(row, 'business_id'));
      return {
        ...row,
        __partner_name: partner?.name || '',
        __partner_city: partner?.city || '',
        __partner_country: partner?.country || '',
      };
    })
    .sort((left, right) => dealPriority(right) - dealPriority(left));
  return { items: rows.map((row, index) => makeItem(row, 'deals', localeTag, index)) };
}

async function loadQuests(localeTag: string, locale: string): Promise<Loaded> {
  const [summaryResult, questResult, progressResult] = await Promise.all([
    rpcRequest<Row>('get_my_melo_quest_summary_v1'),
    restSelect<Row[]>('melo_quests_v1', 'select=id,slug,category,title_th,title_en,description_th,description_en,reward_points,verification_level,progress_target,is_sponsored,starts_at,ends_at,sort_order&is_active=eq.true&order=sort_order.asc'),
    restSelect<Row[]>('melo_user_quest_progress_v1', 'select=quest_id,status,progress_current'),
  ]);
  if (questResult.error) throw new Error(questResult.error);
  const progressMap = new Map(rowsOf(progressResult.data).map((row) => [text(row, 'quest_id'), row]));
  const rows = rowsOf(questResult.data).map((quest) => {
    const progress = progressMap.get(text(quest, 'id')) ?? {};
    const localized = locale === 'th'
      ? { title: text(quest, 'title_th', 'title_en'), description: text(quest, 'description_th', 'description_en') }
      : { title: text(quest, 'title_en', 'title_th'), description: text(quest, 'description_en', 'description_th') };
    return { ...quest, ...progress, title: localized.title, description: localized.description };
  });
  const summary = rowsOf(summaryResult.data)[0] ?? {};
  return { items: rows.map((row, index) => makeItem(row, 'quests', localeTag, index)), points: num(summary, 'points_balance', 'total_points', 'points') };
}

function iconFor(feature: ExploreFeature) {
  return { trips: '✈', events: '◉', community: '◎', deals: '％', partners: '◇', quests: '◆' }[feature];
}

function percentage(item: ExploreItem) {
  if (!item.progressTarget) return item.status.toLowerCase() === 'completed' ? 100 : 0;
  return Math.max(0, Math.min(100, Math.round((item.progress / item.progressTarget) * 100)));
}

export function ExploreExperience({ feature }: { feature: ExploreFeature }) {
  const router = useRouter();
  const { locale, countryScope } = useLocale();
  const copy = exploreCopy[locale];
  const featureCopy = copy.features[feature];
  const auth = authCopy[locale];
  const localeTag = useMemo(() => ({ th: 'th-TH', en: 'en-US', de: 'de-DE', zh: 'zh-CN', ja: 'ja-JP', ko: 'ko-KR' }[locale]), [locale]);
  const [user, setUser] = useState<MeloUser | null>(null);
  const [data, setData] = useState<Loaded>({ items: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState(0);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [selected, setSelected] = useState<ExploreItem | null>(null);
  const [joiningCommunityId, setJoiningCommunityId] = useState('');
  const [communityActionError, setCommunityActionError] = useState('');
  const configured = isSupabaseConfigured();

  async function load(currentUser: MeloUser, background = false) {
    if (background) setRefreshing(true); else setLoading(true);
    setError('');
    try {
      let next: Loaded;
      if (feature === 'trips') next = await loadTrips(localeTag);
      else if (feature === 'events') next = await loadEvents(localeTag);
      else if (feature === 'community') next = await loadCommunity(localeTag, currentUser.id);
      else if (feature === 'partners') next = await loadPartners(localeTag);
      else if (feature === 'deals') next = await loadDeals(localeTag);
      else next = await loadQuests(localeTag, locale);
      setData(next);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : copy.loadFailed);
      setData({ items: [] });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function joinCommunity(item: ExploreItem) {
    if (!user || feature !== 'community' || item.mine || item.joined || joiningCommunityId) return;
    setJoiningCommunityId(item.id);
    setCommunityActionError('');
    try {
      const startedAt = new Date().toISOString();
      const result = await rpcRequest('join_community', { p_community_id: item.id });
      if (result.error) throw new Error(result.error);
      await invokeEdgeFunction('ensure-activity-join-notification', {
        kind: 'community',
        activityId: item.id,
        actionStartedAt: startedAt,
      }).catch(() => undefined);
      await load(user, true);
    } catch (cause) {
      setCommunityActionError(cause instanceof Error ? cause.message : copy.loadFailed);
    } finally {
      setJoiningCommunityId('');
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
  }, [configured, feature, locale, router]);

  const categories = useMemo(() => [...new Set(data.items.map((item) => item.category).filter(Boolean))].slice(0, 12), [data.items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    return data.items.filter((item) => {
      if (category && item.category !== category) return false;
      if (feature !== 'quests' && countryScope !== GLOBAL_COUNTRY_SCOPE) {
        const itemCountry = feature === 'deals'
          ? text(item.raw, '__partner_country', 'country')
          : text(item.raw, 'country');
        if (!matchesCountryScope(itemCountry, countryScope)) return false;
      }
      if (q && ![item.title, item.description, item.category, item.location, item.organizer].join(' ').toLocaleLowerCase().includes(q)) return false;
      if ((feature === 'trips' || feature === 'events' || feature === 'community') && tab === 1 && !item.mine && !item.joined) return false;
      if (feature === 'deals' && tab === 1 && !item.memberOnly) return false;
      if (feature === 'partners' && tab === 1 && !item.recommended) return false;
      if (feature === 'quests' && tab === 1 && !(item.progress > 0 && item.status.toLowerCase() !== 'completed')) return false;
      if (feature === 'quests' && tab === 2 && item.status.toLowerCase() !== 'completed') return false;
      return true;
    });
  }, [category, countryScope, data.items, feature, query, tab]);

  const stats = useMemo(() => {
    if (feature === 'quests') return [
      { value: String(data.points ?? 0), label: copy.points },
      { value: String(data.items.filter((item) => item.progress > 0 && item.status.toLowerCase() !== 'completed').length), label: featureCopy.tabs[1] },
      { value: String(data.items.filter((item) => item.status.toLowerCase() === 'completed').length), label: featureCopy.tabs[2] },
    ];
    if (feature === 'community') return [
      { value: String(data.items.length), label: copy.all },
      { value: String(data.items.filter((item) => item.mine || item.joined).length), label: copy.joined },
      { value: String(data.items.reduce((sum, item) => sum + item.memberCount, 0)), label: copy.members },
    ];
    if (feature === 'deals') return [
      { value: String(data.items.length), label: copy.all },
      { value: String(data.items.filter((item) => item.memberOnly).length), label: copy.memberOnly },
      { value: String(categories.length), label: copy.categories },
    ];
    if (feature === 'partners') return [
      { value: String(data.items.length), label: copy.all },
      { value: String(data.items.filter((item) => item.recommended).length), label: featureCopy.tabs[1] },
      { value: String(categories.length), label: copy.categories },
    ];
    const mineCount = data.items.filter((item) => item.mine || item.joined).length;
    const upcomingCount = data.items.filter((item) => {
      const rawDate = text(item.raw, 'start_date', 'start_at');
      const date = rawDate ? new Date(rawDate) : null;
      return Boolean(date && !Number.isNaN(date.getTime()) && date.getTime() >= Date.now());
    }).length;
    return [
      { value: String(data.items.length), label: copy.all },
      { value: String(mineCount), label: copy.mine },
      { value: String(upcomingCount), label: copy.upcoming },
    ];
  }, [categories.length, copy, data.items, data.points, feature, featureCopy.tabs]);

  if (!configured) {
    return <main className={styles.page}><Header /><div className={styles.centerState}>{auth.envMissing}</div></main>;
  }

  return (
    <main className={styles.page}>
      <Header />
      <section className={styles.shell}>
        <div className={styles.hero}>
          <div className={styles.heroCopy}>
            <span className={styles.kicker}>{copy.portal}</span>
            <div className={styles.titleLine}><span className={styles.featureIcon}>{iconFor(feature)}</span><h1>{featureCopy.title}</h1></div>
            <p>{featureCopy.subtitle}</p>
            <div className={styles.livePill}><i />{copy.live}</div>
          </div>
          <div className={styles.heroActions}>
            {feature === 'community' ? (
              <>
                <div className={styles.communityModeTabs}>
                  <button type="button" className={tab === 0 ? styles.communityActiveTab : ''} onClick={() => setTab(0)}>{featureCopy.tabs[0]}</button>
                  <button type="button" className={tab === 1 ? styles.communityActiveTab : ''} onClick={() => setTab(1)}>{COMMUNITY_MY_LABEL[locale] || COMMUNITY_MY_LABEL.en}</button>
                </div>
                <Link href="/create-community" className={styles.communityCreateButton}>{COMMUNITY_CREATE_LABEL[locale] || COMMUNITY_CREATE_LABEL.en}</Link>
              </>
            ) : (
              <>
                <Link href="/account" className={styles.secondaryButton}>{auth.myAccount}</Link>
                <button type="button" className={styles.primaryButton} disabled={!user || refreshing} onClick={() => user && void load(user, true)}>{refreshing ? copy.refreshing : copy.refresh}</button>
              </>
            )}
          </div>
        </div>

        {feature !== 'trips' && feature !== 'events' && feature !== 'community' ? (
          <div className={styles.statGrid}>
            {stats.map((stat) => (
              <article key={stat.label}>
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </article>
            ))}
          </div>
        ) : null}

        {feature === 'community' ? (
          <div className={styles.communityCategoryRail}>
            <button type="button" className={!category ? styles.communityCategoryActive : ''} onClick={() => setCategory('')}>{copy.all}</button>
            {categories.map((item) => <button type="button" key={item} className={category === item ? styles.communityCategoryActive : ''} onClick={() => setCategory(item)}>{item}</button>)}
          </div>
        ) : (
          <div className={styles.controlPanel}>
            <div className={styles.tabs}>
              {featureCopy.tabs.map((label, index) => <button key={label} type="button" className={tab === index ? styles.activeTab : ''} onClick={() => setTab(index)}>{label}</button>)}
            </div>
            <div className={styles.searchRow}>
              <label className={styles.searchBox}><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={featureCopy.search} /></label>
              <span className={styles.resultCount}>{filtered.length} {copy.results}</span>
            </div>
            {categories.length > 0 && <div className={styles.chips}><button type="button" className={!category ? styles.activeChip : ''} onClick={() => setCategory('')}>{copy.all}</button>{categories.map((item) => <button type="button" key={item} className={category === item ? styles.activeChip : ''} onClick={() => setCategory(item)}>{item}</button>)}</div>}
          </div>
        )}

        {feature === 'community' && communityActionError ? (
          <div className={styles.inlineActionError}>{communityActionError}</div>
        ) : null}

        {loading ? (
          <div className={styles.centerState}><span className={styles.spinner} />{copy.loading}</div>
        ) : error ? (
          <div className={styles.errorState}><strong>{copy.loadFailed}</strong><p>{error}</p><button type="button" onClick={() => user && void load(user)}>{copy.retry}</button></div>
        ) : filtered.length === 0 ? (
          <div className={styles.emptyState}><div>{iconFor(feature)}</div><strong>{featureCopy.empty}</strong><p>{copy.note}</p></div>
        ) : (
          <div className={`${styles.grid} ${feature === 'deals' || feature === 'partners' ? styles.commerceGrid : ''}`}>
            {filtered.map((item) => {
              const pct = percentage(item);
              return (
                <article className={`${styles.card} ${feature === 'community' ? styles.communityCard : ''}`} key={item.id}>
                  <button type="button" className={styles.cardButton} onClick={() => {
                      if (feature === 'trips' || feature === 'events' || feature === 'community') {
                        router.push(`/${feature}/${item.id}`);
                        return;
                      }
                      if (feature === 'partners') {
                        router.push(`/partners/${item.id}`);
                        return;
                      }
                      if (feature === 'deals') {
                        const businessId = text(item.raw, 'business_id');
                        router.push(`/deals/${item.id}${businessId ? `?business=${encodeURIComponent(businessId)}` : ''}`);
                        return;
                      }
                      setSelected(item);
                    }} aria-label={`${copy.details}: ${item.title}`}>
                    <div className={styles.cover} style={item.image ? { backgroundImage: `url(${JSON.stringify(item.image).slice(1, -1)})` } : undefined}>
                      {!item.image && <span>{iconFor(feature)}</span>}
                      <div className={styles.coverShade} />
                      <div className={styles.coverBadges}>
                        {item.badge && <em>{item.badge === 'Verified' ? copy.verified : item.badge === 'Joined' ? copy.joined : item.badge}</em>}
                        {item.memberOnly && <em className={styles.memberBadge}>{copy.memberOnly}</em>}
                      </div>
                    </div>
                    <div className={styles.cardBody}>
                      {item.category && <small>{item.category}</small>}
                      <h2>{item.title}</h2>
                      {item.description && <p>{item.description}</p>}
                      <div className={styles.metaRows}>
                        {item.location && <span><b>⌖</b>{item.location}</span>}
                        {item.date && <span><b>◷</b>{item.secondaryDate ? `${item.date} – ${item.secondaryDate}` : item.date}</span>}
                        {item.organizer && feature !== 'partners' && <span><b>◉</b>{item.organizer}</span>}
                      </div>
                      {feature === 'quests' && <div className={styles.questProgress}><div><span>{copy.progress}</span><strong>{pct}%</strong></div><i><b style={{ width: `${pct}%` }} /></i></div>}
                      <div className={styles.cardFooter}>
                        <div>
                          {item.price && <strong>{item.price}</strong>}
                          {item.rewardPoints > 0 && <strong>+{item.rewardPoints} {copy.points}</strong>}
                          {item.memberCount > 0 && <span>{item.memberCount.toLocaleString(localeTag)} {copy.members}</span>}
                        </div>
                        {feature !== 'community' && <span className={styles.detailLink}>{copy.details} →</span>}
                      </div>
                    </div>
                  </button>
                  {feature === 'community' && (
                    <div className={styles.communityCardActions}>
                      {!item.mine && !item.joined ? (
                        <button
                          type="button"
                          className={styles.communityJoinButton}
                          disabled={Boolean(joiningCommunityId)}
                          onClick={() => void joinCommunity(item)}
                        >
                          {joiningCommunityId === item.id
                            ? (COMMUNITY_JOINING_LABEL[locale] || COMMUNITY_JOINING_LABEL.en)
                            : (COMMUNITY_JOIN_LABEL[locale] || COMMUNITY_JOIN_LABEL.en)}
                        </button>
                      ) : (
                        <span className={styles.communityJoinedStatus}>{item.mine ? copy.mine : copy.joined}</span>
                      )}
                      <button type="button" className={styles.communityDetailsButton} onClick={() => router.push(`/community/${item.id}`)}>
                        {copy.details} →
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        <div className={styles.note}>{copy.note}</div>
      </section>

      {selected && (
        <div className={styles.modalBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
          <section className={styles.modal} role="dialog" aria-modal="true" aria-label={selected.title}>
            <div className={styles.modalCover} style={selected.image ? { backgroundImage: `url(${JSON.stringify(selected.image).slice(1, -1)})` } : undefined}>
              {!selected.image && <span>{iconFor(feature)}</span>}
              <div className={styles.modalShade} />
              <button type="button" className={styles.closeButton} onClick={() => setSelected(null)}>×</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.modalTopline}>{selected.category && <span>{selected.category}</span>}{selected.badge && <em>{selected.badge}</em>}</div>
              <h2>{selected.title}</h2>
              {selected.description && <p className={styles.modalDescription}>{selected.description}</p>}
              <div className={styles.detailGrid}>
                {selected.date && <div><span>{copy.date}</span><strong>{selected.secondaryDate ? `${selected.date} – ${selected.secondaryDate}` : selected.date}</strong></div>}
                {selected.location && <div><span>{copy.location}</span><strong>{selected.location}</strong></div>}
                {selected.organizer && <div><span>{copy.organizer}</span><strong>{selected.organizer}</strong></div>}
                {selected.memberCount > 0 && <div><span>{copy.members}</span><strong>{selected.memberCount.toLocaleString(localeTag)}</strong></div>}
                {selected.price && <div><span>{copy.price}</span><strong>{selected.price}</strong></div>}
                {selected.rewardPoints > 0 && <div><span>{copy.points}</span><strong>+{selected.rewardPoints}</strong></div>}
                {selected.status && <div><span>{copy.status}</span><strong>{selected.status.replaceAll('_', ' ')}</strong></div>}
                {feature === 'quests' && <div><span>{copy.progress}</span><strong>{percentage(selected)}%</strong></div>}
              </div>
              <div className={styles.modalHint}>{copy.note}</div>
              <button type="button" className={styles.modalDone} onClick={() => setSelected(null)}>{copy.close}</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
