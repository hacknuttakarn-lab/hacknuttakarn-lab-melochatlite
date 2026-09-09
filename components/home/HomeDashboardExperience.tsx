"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import VerifiedUserAvatar from "@/components/profile/VerifiedUserAvatar";
import LiveNoticeRail from "@/components/live-notice/LiveNoticeRail";
import { useLocale } from "@/components/SiteProviders";
import { loadFriendSnapshot, type FriendCandidateWeb } from "@/components/connect/connectData";
import { getCurrentUser, isSupabaseConfigured, publicStorageUrl, restSelect, rpcRequest } from "@/lib/supabase/browser";
import { GLOBAL_COUNTRY_SCOPE, matchesCountryScope } from "@/lib/discoveryCountry";
import styles from "./HomeDashboardExperience.module.css";

type Row = Record<string, any>;
type HomeFeature = "friends" | "love" | "deals" | "partners" | "trips" | "events" | "community" | "quests";

type DiscoverItem = {
  id: string;
  title: string;
  description: string;
  city: string;
  country: string;
  category: string;
  imageUrl: string;
  memberCount: number;
  startDate: string;
};

const COPY = {
  th: {
    hello: "สวัสดี",
    home: "หน้าหลัก",
    homeBody: "ค้นหาคน ทริป กิจกรรม คอมมูนิตี้ และสิ่งที่น่าสนใจใน Melo",
    search: "ค้นหาคน ทริป กิจกรรม คอมมูนิตี้ หรือดีล",
    recommendedFriends: "เพื่อนแนะนำ",
    recommendedTrips: "ทริปที่แนะนำ",
    recommendedEvents: "กิจกรรมแนะนำ",
    popularCommunity: "คอมมูนิตี้ยอดนิยม",
    seeAll: "ดูทั้งหมด",
    findMore: "ค้นหาเพิ่ม",
    findTrips: "ค้นหาทริป",
    findEvents: "ค้นหากิจกรรม",
    noFriends: "ยังไม่มีเพื่อนแนะนำในตอนนี้",
    noTrips: "ยังไม่มีทริปที่เปิดให้เข้าร่วม",
    noEvents: "ยังไม่มีกิจกรรมที่กำลังจะมาถึง",
    noCommunity: "ยังไม่มีคอมมูนิตี้แนะนำ",
    members: "สมาชิก",
    matching: "เข้ากันได้",
    open: "เปิดดู",
    searchResults: "ผลการค้นหา",
    noSearch: "ไม่พบรายการที่ตรงกับคำค้นหา",
    loading: "กำลังโหลดหน้าหลัก…",
    envMissing: "ยังไม่ได้ตั้งค่า Supabase สำหรับ Melo Web",
  },
  en: {
    hello: "Hello", home: "Home",
    homeBody: "Discover people, Trips, Events, Communities and more on Melo",
    search: "Search people, Trips, Events, Communities or deals",
    recommendedFriends: "Recommended friends", recommendedTrips: "Recommended Trips",
    recommendedEvents: "Recommended Events", popularCommunity: "Popular Communities",
    seeAll: "See all", findMore: "Find more", findTrips: "Find Trips", findEvents: "Find Events",
    noFriends: "No friend recommendations right now", noTrips: "No open Trips right now",
    noEvents: "No upcoming Events right now", noCommunity: "No Community recommendations yet",
    members: "members", matching: "match", open: "Open", searchResults: "Search results",
    noSearch: "No results match your search", loading: "Loading Home…",
    envMissing: "Supabase is not configured for Melo Web",
  },
  de: {
    hello: "Hallo", home: "Startseite",
    homeBody: "Entdecke Menschen, Reisen, Events, Communities und mehr auf Melo",
    search: "Menschen, Reisen, Events, Communities oder Deals suchen",
    recommendedFriends: "Empfohlene Freunde", recommendedTrips: "Empfohlene Reisen",
    recommendedEvents: "Empfohlene Events", popularCommunity: "Beliebte Communities",
    seeAll: "Alle ansehen", findMore: "Mehr finden", findTrips: "Reisen finden", findEvents: "Events finden",
    noFriends: "Zurzeit keine Freundesempfehlungen", noTrips: "Zurzeit keine offenen Reisen",
    noEvents: "Zurzeit keine kommenden Events", noCommunity: "Noch keine Community-Empfehlungen",
    members: "Mitglieder", matching: "Match", open: "Öffnen", searchResults: "Suchergebnisse",
    noSearch: "Keine passenden Ergebnisse", loading: "Startseite wird geladen…",
    envMissing: "Supabase ist für Melo Web nicht konfiguriert",
  },
  zh: {
    hello: "你好", home: "首页", homeBody: "发现 Melo 上的人、旅行、活动、社区与更多内容",
    search: "搜索用户、旅行、活动、社区或优惠", recommendedFriends: "推荐好友",
    recommendedTrips: "推荐旅行", recommendedEvents: "推荐活动", popularCommunity: "热门社区",
    seeAll: "查看全部", findMore: "查看更多", findTrips: "寻找旅行", findEvents: "寻找活动",
    noFriends: "目前没有好友推荐", noTrips: "目前没有开放旅行", noEvents: "目前没有即将开始的活动",
    noCommunity: "暂无社区推荐", members: "成员", matching: "匹配", open: "打开",
    searchResults: "搜索结果", noSearch: "没有符合搜索的内容", loading: "正在加载首页…",
    envMissing: "Melo Web 尚未配置 Supabase",
  },
  ja: {
    hello: "こんにちは", home: "ホーム", homeBody: "Meloで人、Trip、Event、Communityなどを見つけよう",
    search: "人、Trip、Event、Community、Dealを検索", recommendedFriends: "おすすめの友達",
    recommendedTrips: "おすすめTrip", recommendedEvents: "おすすめEvent", popularCommunity: "人気Community",
    seeAll: "すべて見る", findMore: "もっと探す", findTrips: "Tripを探す", findEvents: "Eventを探す",
    noFriends: "現在おすすめの友達はいません", noTrips: "現在参加可能なTripはありません",
    noEvents: "現在予定されているEventはありません", noCommunity: "おすすめCommunityはまだありません",
    members: "メンバー", matching: "マッチ", open: "開く", searchResults: "検索結果",
    noSearch: "検索に一致する項目はありません", loading: "ホームを読み込み中…",
    envMissing: "Melo WebにSupabaseが設定されていません",
  },
  ko: {
    hello: "안녕하세요", home: "홈", homeBody: "Melo에서 사람, 여행, 이벤트, 커뮤니티 등을 찾아보세요",
    search: "사람, 여행, 이벤트, 커뮤니티 또는 딜 검색", recommendedFriends: "추천 친구",
    recommendedTrips: "추천 여행", recommendedEvents: "추천 이벤트", popularCommunity: "인기 커뮤니티",
    seeAll: "전체 보기", findMore: "더 찾기", findTrips: "여행 찾기", findEvents: "이벤트 찾기",
    noFriends: "현재 추천 친구가 없습니다", noTrips: "현재 참여 가능한 여행이 없습니다",
    noEvents: "예정된 이벤트가 없습니다", noCommunity: "추천 커뮤니티가 없습니다",
    members: "멤버", matching: "매치", open: "열기", searchResults: "검색 결과",
    noSearch: "검색과 일치하는 항목이 없습니다", loading: "홈 불러오는 중…",
    envMissing: "Melo Web에 Supabase가 설정되지 않았습니다",
  },
} as const;

const FEATURE_COPY: Record<string, Record<HomeFeature, string>> = {
  th: { friends: "หาเพื่อน", love: "หาคู่", deals: "ดีลพิเศษ", partners: "พาร์ทเนอร์", trips: "ทริป", events: "กิจกรรม", community: "คอมมูนิตี้", quests: "ภารกิจผู้ใช้" },
  en: { friends: "Friends", love: "Love", deals: "Deals", partners: "Partners", trips: "Trips", events: "Events", community: "Community", quests: "Quests" },
  de: { friends: "Freunde", love: "Love", deals: "Deals", partners: "Partner", trips: "Reisen", events: "Events", community: "Community", quests: "Missionen" },
  zh: { friends: "交友", love: "恋爱", deals: "优惠", partners: "合作伙伴", trips: "旅行", events: "活动", community: "社区", quests: "任务" },
  ja: { friends: "友達", love: "恋愛", deals: "Deal", partners: "Partner", trips: "Trip", events: "Event", community: "Community", quests: "Quest" },
  ko: { friends: "친구", love: "연애", deals: "딜", partners: "파트너", trips: "여행", events: "이벤트", community: "커뮤니티", quests: "퀘스트" },
};

const FEATURE_META: Record<HomeFeature, { href: string; icon: string; tone: string }> = {
  friends: { href: "/friends", icon: "●●", tone: "blue" },
  love: { href: "/love", icon: "♥", tone: "pink" },
  deals: { href: "/deals", icon: "%", tone: "red" },
  partners: { href: "/partners", icon: "▦", tone: "teal" },
  trips: { href: "/trips", icon: "✈", tone: "orange" },
  events: { href: "/events", icon: "◇", tone: "green" },
  community: { href: "/community", icon: "◎", tone: "purple" },
  quests: { href: "/quests", icon: "✦", tone: "indigo" },
};

function rowsOf(value: unknown): Row[] {
  if (Array.isArray(value)) return value.filter((item): item is Row => Boolean(item) && typeof item === "object");
  if (value && typeof value === "object") return [value as Row];
  return [];
}

function text(row: Row, ...keys: string[]) {
  for (const key of keys) {
    const value = row?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function numberValue(row: Row, ...keys: string[]) {
  for (const key of keys) {
    const value = Number(row?.[key]);
    if (Number.isFinite(value)) return value;
  }
  return 0;
}

function absoluteImage(row: Row, _kind: "trip" | "event" | "community") {
  // Melo Android stores Trip / Event / Community covers in one public bucket:
  // activity-images, with the database field image_path.
  const raw = text(
    row,
    "image_path",
    "cover_url",
    "image_url",
    "photo_url",
    "cover_image_url",
    "thumbnail_url",
    "image",
  );
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return publicStorageUrl("activity-images", raw);
}

function makeDiscoverItem(row: Row, kind: "trip" | "event" | "community", index: number): DiscoverItem {
  const startDate = text(row, "start_date", "start_at", "starts_at", "date");
  return {
    id: text(row, "id") || `${kind}-${index}`,
    title: text(row, "title", "name", "trip_name", "event_name", "community_name") || "Melo",
    description: text(row, "description", "bio", "short_description"),
    city: text(row, "city", "destination_city", "venue_city", "location_city"),
    country: text(row, "country", "country_name", "destination_country", "country_code"),
    category: text(row, "category", "trip_category", "event_category"),
    imageUrl: absoluteImage(row, kind),
    memberCount: numberValue(row, "member_count", "members_count", "attendee_count", "participant_count", "participants_count"),
    startDate,
  };
}

function upcoming(item: DiscoverItem) {
  if (!item.startDate) return true;
  const date = new Date(item.startDate);
  if (Number.isNaN(date.getTime())) return true;
  return date.getTime() >= Date.now() - 24 * 60 * 60 * 1000;
}

function searchText(values: Array<string | number | null | undefined>) {
  return values.filter(Boolean).join(" ").toLocaleLowerCase();
}

function localeDate(value: string, locale: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export default function HomeDashboardExperience() {
  const router = useRouter();
  const { locale, countryScope } = useLocale();
  const t = COPY[locale] ?? COPY.en;
  const labels = FEATURE_COPY[locale] ?? FEATURE_COPY.en;
  const configured = isSupabaseConfigured();

  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState("Melo");
  const [friends, setFriends] = useState<FriendCandidateWeb[]>([]);
  const [trips, setTrips] = useState<DiscoverItem[]>([]);
  const [events, setEvents] = useState<DiscoverItem[]>([]);
  const [communities, setCommunities] = useState<DiscoverItem[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }

    let active = true;

    (async () => {
      const user = await getCurrentUser();
      if (!active) return;

      if (!user) {
        router.replace("/login");
        return;
      }

      const profilePromise = restSelect<Row[]>(
        "profiles",
        `select=display_name&id=eq.${encodeURIComponent(user.id)}&limit=1`,
      );

      const friendPromise = loadFriendSnapshot();

      const tripPromise = Promise.all([
        rpcRequest<Row[]>("get_public_trips"),
        rpcRequest<Row[]>("get_my_trips"),
      ]);

      const eventPromise = Promise.all([
        rpcRequest<Row[]>("get_public_events"),
        rpcRequest<Row[]>("get_my_events"),
      ]);

      const communityPromise = Promise.all([
        rpcRequest<Row[]>("get_communities"),
        rpcRequest<Row[]>("get_my_communities"),
      ]);

      const [profileResult, friendResult, tripResult, eventResult, communityResult] =
        await Promise.allSettled([
          profilePromise,
          friendPromise,
          tripPromise,
          eventPromise,
          communityPromise,
        ]);

      if (!active) return;

      if (profileResult.status === "fulfilled" && !profileResult.value.error) {
        const row = rowsOf(profileResult.value.data)[0];
        setDisplayName(text(row, "display_name") || user.email?.split("@")[0] || "Melo");
      } else {
        setDisplayName(user.email?.split("@")[0] || "Melo");
      }

      if (friendResult.status === "fulfilled") {
        setFriends(friendResult.value.candidates.slice(0, 12));
      }

      if (tripResult.status === "fulfilled") {
        const merged = [
          ...rowsOf(tripResult.value[0].data),
          ...rowsOf(tripResult.value[1].data),
        ];
        const unique = Array.from(new Map(merged.map((row) => [text(row, "id"), row])).values());
        setTrips(unique.map((row, index) => makeDiscoverItem(row, "trip", index)));
      }

      if (eventResult.status === "fulfilled") {
        const merged = [
          ...rowsOf(eventResult.value[0].data),
          ...rowsOf(eventResult.value[1].data),
        ];
        const unique = Array.from(new Map(merged.map((row) => [text(row, "id"), row])).values());
        setEvents(unique.map((row, index) => makeDiscoverItem(row, "event", index)));
      }

      if (communityResult.status === "fulfilled") {
        const merged = [
          ...rowsOf(communityResult.value[0].data),
          ...rowsOf(communityResult.value[1].data),
        ];
        const unique = Array.from(new Map(merged.map((row) => [text(row, "id"), row])).values());
        setCommunities(unique.map((row, index) => makeDiscoverItem(row, "community", index)));
      }

      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [configured, router]);

  const scopedTrips = useMemo(
    () =>
      trips
        .filter((item) => countryScope === GLOBAL_COUNTRY_SCOPE || matchesCountryScope(item.country, countryScope))
        .filter(upcoming),
    [countryScope, trips],
  );

  const scopedEvents = useMemo(
    () =>
      events
        .filter((item) => countryScope === GLOBAL_COUNTRY_SCOPE || matchesCountryScope(item.country, countryScope))
        .filter(upcoming),
    [countryScope, events],
  );

  const scopedCommunities = useMemo(
    () =>
      communities
        .filter((item) => countryScope === GLOBAL_COUNTRY_SCOPE || matchesCountryScope(item.country, countryScope))
        .sort((a, b) => b.memberCount - a.memberCount),
    [communities, countryScope],
  );

  const scopedFriends = useMemo(
    () =>
      friends.filter(
        (item) =>
          countryScope === GLOBAL_COUNTRY_SCOPE ||
          matchesCountryScope(item.country || item.nationality, countryScope),
      ),
    [countryScope, friends],
  );

  const marqueeFriends = useMemo(() => scopedFriends.slice(0, 8), [scopedFriends]);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    if (!q) return null;

    return {
      friends: scopedFriends
        .filter((item) =>
          searchText([item.displayName, item.city, item.country, item.bio, ...item.interests]).includes(q),
        )
        .slice(0, 4),
      trips: scopedTrips
        .filter((item) =>
          searchText([item.title, item.description, item.city, item.country, item.category]).includes(q),
        )
        .slice(0, 4),
      events: scopedEvents
        .filter((item) =>
          searchText([item.title, item.description, item.city, item.country, item.category]).includes(q),
        )
        .slice(0, 4),
      communities: scopedCommunities
        .filter((item) =>
          searchText([item.title, item.description, item.city, item.country, item.category]).includes(q),
        )
        .slice(0, 4),
    };
  }, [query, scopedCommunities, scopedEvents, scopedFriends, scopedTrips]);

  const searchCount = filtered
    ? filtered.friends.length + filtered.trips.length + filtered.events.length + filtered.communities.length
    : 0;

  if (!configured) {
    return (
      <main className={styles.page}>
        <Header />
        <div className={styles.state}>{t.envMissing}</div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <Header />

      <section className={styles.shell}>
        <LiveNoticeRail />
        <section className={styles.blueHero}>
          <div className={styles.welcome}>
            <span className={styles.brandSmall}>MELO CHAT</span>
            <h1>{t.home}</h1>
            <p>{t.hello} <strong>{displayName}</strong></p>
            <small>{t.homeBody}</small>
          </div>

          <div className={styles.quickMenu}>
            {(Object.keys(FEATURE_META) as HomeFeature[]).map((key) => {
              const meta = FEATURE_META[key];
              return (
                <Link href={meta.href} className={styles.quickItem} key={key}>
                  <span className={`${styles.quickIcon} ${styles[meta.tone]}`}>{meta.icon}</span>
                  <strong>{labels[key]}</strong>
                </Link>
              );
            })}
          </div>
        </section>

        <label className={styles.searchBar}>
          <span>⌕</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t.search}
          />
          {query ? (
            <button type="button" onClick={() => setQuery("")}>×</button>
          ) : null}
        </label>

        {query ? (
          <section className={styles.searchPanel}>
            <div className={styles.sectionHeading}>
              <div>
                <i />
                <h2>{t.searchResults}</h2>
              </div>
              <span>{searchCount}</span>
            </div>

            {searchCount ? (
              <div className={styles.searchGrid}>
                {filtered?.friends.map((item) => (
                  <Link href={`/users/${item.userId}`} className={styles.searchResult} key={`f-${item.userId}`}>
                    <VerifiedUserAvatar userId={item.userId} name={item.displayName} src={item.photoUrl} country={item.country} badgeSize={16} alt="" />
                    <div><strong>{item.displayName}</strong><small>{labels.friends}</small></div>
                  </Link>
                ))}
                {filtered?.trips.map((item) => (
                  <Link href={`/trips/${item.id}`} className={styles.searchResult} key={`t-${item.id}`}>
                    <span>✈</span><div><strong>{item.title}</strong><small>{labels.trips}</small></div>
                  </Link>
                ))}
                {filtered?.events.map((item) => (
                  <Link href={`/events/${item.id}`} className={styles.searchResult} key={`e-${item.id}`}>
                    <span>◇</span><div><strong>{item.title}</strong><small>{labels.events}</small></div>
                  </Link>
                ))}
                {filtered?.communities.map((item) => (
                  <Link href={`/community/${item.id}`} className={styles.searchResult} key={`c-${item.id}`}>
                    <span>◎</span><div><strong>{item.title}</strong><small>{labels.community}</small></div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className={styles.emptySearch}>{t.noSearch}</div>
            )}
          </section>
        ) : null}

        {loading ? (
          <div className={styles.state}>{t.loading}</div>
        ) : (
          <>
            <section className={styles.section}>
              <div className={styles.sectionHeading}>
                <div><i /><h2>{t.recommendedFriends}</h2></div>
                <Link href="/friends">{t.seeAll} ›</Link>
              </div>

              {marqueeFriends.length ? (
                <div className={styles.friendMarquee}>
                  <div className={`${styles.friendTrack} ${marqueeFriends.length > 1 ? styles.friendTrackAnimated : ""}`}>
                    <div className={styles.friendSet}>
                      {marqueeFriends.map((friend) => (
                        <FriendRecommendationCard friend={friend} key={`primary-${friend.userId}`} />
                      ))}
                    </div>
                    {marqueeFriends.length > 1 ? (
                      <div className={styles.friendSet} aria-hidden="true">
                        {marqueeFriends.map((friend) => (
                          <FriendRecommendationCard friend={friend} duplicate key={`duplicate-${friend.userId}`} />
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : (
                <EmptyCard icon="●●" text={t.noFriends} href="/friends" link={t.findMore} />
              )}
            </section>

            <div className={styles.dualSections}>
              <section className={styles.section}>
                <div className={styles.sectionHeading}>
                  <div><i /><h2>{t.recommendedTrips}</h2></div>
                  <Link href="/trips">{t.seeAll} ›</Link>
                </div>
                {scopedTrips.length ? (
                  <div className={styles.activityList}>
                    {scopedTrips.slice(0, 2).map((item) => (
                      <ActivityCard key={item.id} item={item} kind="trip" locale={locale} members={t.members} />
                    ))}
                  </div>
                ) : (
                  <EmptyCard icon="✈" text={t.noTrips} href="/trips" link={t.findTrips} />
                )}
              </section>

              <section className={styles.section}>
                <div className={styles.sectionHeading}>
                  <div><i /><h2>{t.recommendedEvents}</h2></div>
                  <Link href="/events">{t.findMore} ›</Link>
                </div>
                {scopedEvents.length ? (
                  <div className={styles.activityList}>
                    {scopedEvents.slice(0, 2).map((item) => (
                      <ActivityCard key={item.id} item={item} kind="event" locale={locale} members={t.members} />
                    ))}
                  </div>
                ) : (
                  <EmptyCard icon="◇" text={t.noEvents} href="/events" link={t.findEvents} />
                )}
              </section>
            </div>

            <section className={styles.section}>
              <div className={styles.sectionHeading}>
                <div><i /><h2>{t.popularCommunity}</h2></div>
                <Link href="/community">{t.findMore} ›</Link>
              </div>

              {scopedCommunities.length ? (
                <div className={styles.communityGrid}>
                  {scopedCommunities.slice(0, 3).map((item, index) => (
                    <Link href={`/community/${item.id}`} className={styles.communityCard} key={item.id}>
                      <div className={styles.communityImage}>
                        {item.imageUrl ? <img src={item.imageUrl} alt="" /> : <span>◎</span>}
                      </div>
                      <div className={styles.communityCopy}>
                        <h3>{item.title}</h3>
                        <p>{item.memberCount > 0 ? `${item.memberCount} ${t.members}` : item.category}</p>
                      </div>
                      {index < 3 ? <b>HIT</b> : null}
                      <span className={styles.arrow}>›</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyCard icon="◎" text={t.noCommunity} href="/community" link={t.findMore} />
              )}
            </section>
          </>
        )}
      </section>
    </main>
  );
}

function FriendRecommendationCard({
  friend,
  duplicate = false,
}: {
  friend: FriendCandidateWeb;
  duplicate?: boolean;
}) {
  return (
    <Link
      href={`/users/${friend.userId}`}
      className={styles.friendCard}
      tabIndex={duplicate ? -1 : undefined}
      aria-hidden={duplicate || undefined}
    >
      <div className={styles.friendAvatar}>
        <VerifiedUserAvatar userId={friend.userId} name={friend.displayName} src={friend.photoUrl} country={friend.country} nationality={friend.nationality} className={styles.friendAvatarIdentity} badgeSize={18} alt={duplicate ? "" : friend.displayName} />
        {friend.matchScore > 0 ? <b>{Math.round(friend.matchScore)}%</b> : null}
      </div>
      <div className={styles.friendBody}>
        <h3>{friend.displayName}{friend.age ? `, ${friend.age}` : ""}</h3>
        <p>{[friend.city, friend.country].filter(Boolean).join(" · ") || friend.primaryLanguage.toUpperCase()}</p>
        <div className={styles.friendTags}>
          {(friend.sharedInterests.length ? friend.sharedInterests : friend.interests)
            .slice(0,3)
            .map((tag) => <span key={tag}>{tag}</span>)}
        </div>
      </div>
    </Link>
  );
}

function EmptyCard({ icon, text, href, link }: { icon: string; text: string; href: string; link: string }) {
  return (
    <Link href={href} className={styles.emptyCard}>
      <span>{icon}</span>
      <div><strong>{text}</strong><small>{link}</small></div>
      <b>›</b>
    </Link>
  );
}

function ActivityCard({
  item,
  kind,
  locale,
  members,
}: {
  item: DiscoverItem;
  kind: "trip" | "event";
  locale: string;
  members: string;
}) {
  const href = kind === "trip" ? `/trips/${item.id}` : `/events/${item.id}`;
  return (
    <Link href={href} className={styles.activityCard}>
      <div className={styles.activityImage}>
        {item.imageUrl ? <img src={item.imageUrl} alt="" /> : <span>{kind === "trip" ? "✈" : "◇"}</span>}
      </div>
      <div className={styles.activityCopy}>
        <small>{item.category || (kind === "trip" ? "Trip" : "Event")}</small>
        <h3>{item.title}</h3>
        <p>{[item.city, item.country].filter(Boolean).join(" · ") || localeDate(item.startDate, locale)}</p>
        <div>
          {item.startDate ? <span>{localeDate(item.startDate, locale)}</span> : null}
          {item.memberCount > 0 ? <span>{item.memberCount} {members}</span> : null}
        </div>
      </div>
      <span className={styles.arrow}>›</span>
    </Link>
  );
}
