"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import VerifiedUserAvatar from "@/components/profile/VerifiedUserAvatar";
import { meloWebSupabase } from "@/lib/meloWebSupabase";
import styles from "./PassportJourneyCenter.module.css";

type Locale = "th" | "en" | "de" | "zh" | "ja" | "ko";
type AnyRecord = Record<string, any>;
type TimelineItem = {
  id: string;
  kind: "trip" | "event";
  title: string;
  city: string;
  country: string;
  date: string;
  status: string;
  completed: boolean;
};

const copy: Record<Locale, Record<string, string>> = {
  th: {
    eyebrow: "MELO TRAVEL PASSPORT",
    title: "พาสปอร์ต & เหรียญตรา",
    subtitle: "บันทึกเส้นทาง ประสบการณ์ และความสำเร็จจาก Trip / Event ของคุณใน Melo",
    refresh: "รีเฟรช",
    profile: "โปรไฟล์",
    account: "บัญชีของฉัน",
    loginRequired: "กรุณาเข้าสู่ระบบเพื่อดูพาสปอร์ตของคุณ",
    login: "เข้าสู่ระบบ",
    loading: "กำลังสร้างพาสปอร์ตของคุณ…",
    passport: "พาสปอร์ตของฉัน",
    timeline: "Journey Timeline",
    badges: "เหรียญตรา",
    countries: "ประเทศที่เดินทาง",
    cities: "เมืองที่ไป",
    trips: "ทริปที่จบแล้ว",
    events: "กิจกรรมที่จบแล้ว",
    reputation: "ชื่อเสียง",
    stamps: "ตราประทับการเดินทาง",
    noStamps: "ยังไม่มีตราประทับ — เมื่อจบทริปหรือกิจกรรม ประสบการณ์จะเริ่มสะสมที่นี่",
    recentJourney: "เส้นทางล่าสุด",
    noJourney: "ยังไม่มีประวัติการเดินทางหรือกิจกรรม",
    trip: "ทริป",
    event: "กิจกรรม",
    completed: "สำเร็จ",
    upcoming: "กำลังจะมาถึง",
    ongoing: "กำลังดำเนินการ",
    firstTrip: "เริ่มออกเดินทาง",
    firstTripDesc: "จบทริปแรกใน Melo",
    explorer: "นักสำรวจ",
    explorerDesc: "เดินทางครบ 3 ประเทศ",
    worldTraveler: "นักเดินทางโลก",
    worldTravelerDesc: "เดินทางครบ 5 ประเทศ",
    tripVeteran: "Trip Veteran",
    tripVeteranDesc: "จบทริปครบ 5 ทริป",
    eventStarter: "Event Starter",
    eventStarterDesc: "ร่วมกิจกรรมแรกสำเร็จ",
    socialExplorer: "Social Explorer",
    socialExplorerDesc: "ร่วมกิจกรรมครบ 5 ครั้ง",
    verifiedTraveler: "Verified Traveler",
    verifiedTravelerDesc: "ยืนยันตัวตน Melo สำเร็จ",
    trustedMember: "Trusted Member",
    trustedMemberDesc: "ชื่อเสียง 4.5+ และมีรีวิวอย่างน้อย 3 รายการ",
    unlocked: "ได้รับแล้ว",
    locked: "ยังไม่ปลดล็อก",
    progress: "ความคืบหน้า",
    discoverTrips: "ค้นหาทริป",
    discoverEvents: "ค้นหากิจกรรม",
    quests: "ภารกิจ & รางวัล",
    error: "โหลดข้อมูลพาสปอร์ตไม่สำเร็จ",
    world: "ทั่วโลก",
  },
  en: {
    eyebrow: "MELO TRAVEL PASSPORT", title: "Passport & Badges",
    subtitle: "Your Melo travel history, experiences and achievements from Trips and Events",
    refresh: "Refresh", profile: "Profile", account: "My account",
    loginRequired: "Sign in to view your travel passport", login: "Sign in",
    loading: "Building your passport…", passport: "My passport", timeline: "Journey Timeline",
    badges: "Badges", countries: "Countries visited", cities: "Cities visited",
    trips: "Completed trips", events: "Completed events", reputation: "Reputation",
    stamps: "Travel stamps", noStamps: "No stamps yet — completed Trips and Events will appear here",
    recentJourney: "Recent journey", noJourney: "No travel or event history yet",
    trip: "Trip", event: "Event", completed: "Completed", upcoming: "Upcoming", ongoing: "Ongoing",
    firstTrip: "First Journey", firstTripDesc: "Complete your first Melo Trip",
    explorer: "Explorer", explorerDesc: "Visit 3 countries", worldTraveler: "World Traveler",
    worldTravelerDesc: "Visit 5 countries", tripVeteran: "Trip Veteran",
    tripVeteranDesc: "Complete 5 Trips", eventStarter: "Event Starter",
    eventStarterDesc: "Complete your first Event", socialExplorer: "Social Explorer",
    socialExplorerDesc: "Complete 5 Events", verifiedTraveler: "Verified Traveler",
    verifiedTravelerDesc: "Complete Melo identity verification", trustedMember: "Trusted Member",
    trustedMemberDesc: "Reach 4.5+ reputation with at least 3 reviews", unlocked: "Unlocked",
    locked: "Locked", progress: "Progress", discoverTrips: "Discover Trips",
    discoverEvents: "Discover Events", quests: "Quests & Rewards", error: "Unable to load passport",
    world: "Worldwide",
  },
  de: {
    eyebrow: "MELO REISEPASS", title: "Reisepass & Abzeichen",
    subtitle: "Deine Melo-Reisen, Erlebnisse und Erfolge aus Trips und Events",
    refresh: "Aktualisieren", profile: "Profil", account: "Mein Konto",
    loginRequired: "Bitte anmelden, um deinen Reisepass zu sehen", login: "Anmelden",
    loading: "Reisepass wird erstellt…", passport: "Mein Reisepass", timeline: "Journey Timeline",
    badges: "Abzeichen", countries: "Besuchte Länder", cities: "Besuchte Städte",
    trips: "Abgeschlossene Reisen", events: "Abgeschlossene Events", reputation: "Reputation",
    stamps: "Reisestempel", noStamps: "Noch keine Stempel — abgeschlossene Trips und Events erscheinen hier",
    recentJourney: "Letzte Reisen", noJourney: "Noch keine Reise- oder Eventhistorie",
    trip: "Reise", event: "Event", completed: "Abgeschlossen", upcoming: "Demnächst", ongoing: "Läuft",
    firstTrip: "Erste Reise", firstTripDesc: "Schließe deine erste Melo-Reise ab",
    explorer: "Entdecker", explorerDesc: "Besuche 3 Länder", worldTraveler: "Weltreisender",
    worldTravelerDesc: "Besuche 5 Länder", tripVeteran: "Trip Veteran",
    tripVeteranDesc: "Schließe 5 Reisen ab", eventStarter: "Event Starter",
    eventStarterDesc: "Schließe dein erstes Event ab", socialExplorer: "Social Explorer",
    socialExplorerDesc: "Schließe 5 Events ab", verifiedTraveler: "Verified Traveler",
    verifiedTravelerDesc: "Schließe die Melo-Identitätsprüfung ab", trustedMember: "Trusted Member",
    trustedMemberDesc: "Erreiche 4,5+ Reputation mit mindestens 3 Bewertungen", unlocked: "Freigeschaltet",
    locked: "Gesperrt", progress: "Fortschritt", discoverTrips: "Reisen entdecken",
    discoverEvents: "Events entdecken", quests: "Missionen & Belohnungen", error: "Reisepass konnte nicht geladen werden",
    world: "Weltweit",
  },
  zh: {
    eyebrow: "MELO 旅行护照", title: "护照与徽章",
    subtitle: "记录你在 Melo Trip / Event 中的旅程、体验与成就",
    refresh: "刷新", profile: "个人资料", account: "我的账户", loginRequired: "请登录后查看旅行护照",
    login: "登录", loading: "正在生成你的旅行护照…", passport: "我的护照", timeline: "旅程时间线",
    badges: "徽章", countries: "已到访国家", cities: "已到访城市", trips: "已完成旅行",
    events: "已完成活动", reputation: "信誉", stamps: "旅行印章",
    noStamps: "暂无印章 — 完成旅行或活动后会自动记录在这里", recentJourney: "最近旅程",
    noJourney: "暂无旅行或活动记录", trip: "旅行", event: "活动", completed: "已完成",
    upcoming: "即将开始", ongoing: "进行中", firstTrip: "初次出发", firstTripDesc: "完成第一次 Melo 旅行",
    explorer: "探索者", explorerDesc: "到访 3 个国家", worldTraveler: "世界旅行者",
    worldTravelerDesc: "到访 5 个国家", tripVeteran: "Trip Veteran", tripVeteranDesc: "完成 5 次旅行",
    eventStarter: "Event Starter", eventStarterDesc: "完成第一次活动", socialExplorer: "Social Explorer",
    socialExplorerDesc: "完成 5 次活动", verifiedTraveler: "Verified Traveler",
    verifiedTravelerDesc: "完成 Melo 身份认证", trustedMember: "Trusted Member",
    trustedMemberDesc: "信誉 4.5+ 且至少获得 3 条评价", unlocked: "已获得", locked: "未解锁",
    progress: "进度", discoverTrips: "发现旅行", discoverEvents: "发现活动", quests: "任务与奖励",
    error: "无法加载旅行护照", world: "全球",
  },
  ja: {
    eyebrow: "MELO TRAVEL PASSPORT", title: "パスポート & バッジ",
    subtitle: "MeloのTrip / Eventで積み重ねた旅、体験、実績を記録します",
    refresh: "更新", profile: "プロフィール", account: "マイアカウント",
    loginRequired: "トラベルパスポートを見るにはログインしてください", login: "ログイン",
    loading: "パスポートを作成中…", passport: "マイパスポート", timeline: "Journey Timeline",
    badges: "バッジ", countries: "訪問国", cities: "訪問都市", trips: "完了した旅行",
    events: "完了したイベント", reputation: "評判", stamps: "トラベルスタンプ",
    noStamps: "まだスタンプはありません。Trip / Eventを完了すると記録されます",
    recentJourney: "最近の旅", noJourney: "旅行・イベント履歴はまだありません",
    trip: "旅行", event: "イベント", completed: "完了", upcoming: "予定", ongoing: "進行中",
    firstTrip: "First Journey", firstTripDesc: "最初のMelo Tripを完了",
    explorer: "Explorer", explorerDesc: "3か国を訪問", worldTraveler: "World Traveler",
    worldTravelerDesc: "5か国を訪問", tripVeteran: "Trip Veteran", tripVeteranDesc: "5回のTripを完了",
    eventStarter: "Event Starter", eventStarterDesc: "最初のEventを完了", socialExplorer: "Social Explorer",
    socialExplorerDesc: "5回のEventを完了", verifiedTraveler: "Verified Traveler",
    verifiedTravelerDesc: "Melo本人確認を完了", trustedMember: "Trusted Member",
    trustedMemberDesc: "評判4.5+、レビュー3件以上", unlocked: "獲得済み", locked: "未解除",
    progress: "進捗", discoverTrips: "Tripを探す", discoverEvents: "Eventを探す",
    quests: "クエスト & リワード", error: "パスポートを読み込めません", world: "世界",
  },
  ko: {
    eyebrow: "MELO TRAVEL PASSPORT", title: "패스포트 & 배지",
    subtitle: "Melo Trip / Event에서 쌓은 여행, 경험, 성취를 기록합니다",
    refresh: "새로고침", profile: "프로필", account: "내 계정",
    loginRequired: "여행 패스포트를 보려면 로그인하세요", login: "로그인",
    loading: "패스포트 만드는 중…", passport: "내 패스포트", timeline: "Journey Timeline",
    badges: "배지", countries: "방문 국가", cities: "방문 도시", trips: "완료한 여행",
    events: "완료한 이벤트", reputation: "평판", stamps: "여행 스탬프",
    noStamps: "아직 스탬프가 없습니다 — Trip / Event를 완료하면 이곳에 기록됩니다",
    recentJourney: "최근 여정", noJourney: "여행 또는 이벤트 기록이 없습니다",
    trip: "여행", event: "이벤트", completed: "완료", upcoming: "예정", ongoing: "진행 중",
    firstTrip: "First Journey", firstTripDesc: "첫 Melo Trip 완료", explorer: "Explorer",
    explorerDesc: "3개 국가 방문", worldTraveler: "World Traveler", worldTravelerDesc: "5개 국가 방문",
    tripVeteran: "Trip Veteran", tripVeteranDesc: "Trip 5회 완료", eventStarter: "Event Starter",
    eventStarterDesc: "첫 Event 완료", socialExplorer: "Social Explorer", socialExplorerDesc: "Event 5회 완료",
    verifiedTraveler: "Verified Traveler", verifiedTravelerDesc: "Melo 본인 인증 완료",
    trustedMember: "Trusted Member", trustedMemberDesc: "평판 4.5+ 및 리뷰 3개 이상",
    unlocked: "획득", locked: "잠김", progress: "진행률", discoverTrips: "Trip 찾기",
    discoverEvents: "Event 찾기", quests: "퀘스트 & 리워드", error: "패스포트를 불러올 수 없습니다",
    world: "전 세계",
  },
};

function localeNow(): Locale {
  if (typeof document === "undefined") return "th";
  const raw = (document.documentElement.lang || navigator.language || "th").toLowerCase();
  if (raw.startsWith("de")) return "de";
  if (raw.startsWith("zh")) return "zh";
  if (raw.startsWith("ja")) return "ja";
  if (raw.startsWith("ko")) return "ko";
  if (raw.startsWith("en")) return "en";
  return "th";
}

function firstValue(record: AnyRecord | null | undefined, keys: string[]) {
  if (!record) return null;
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") return value;
  }
  return null;
}

function isoDate(value: unknown) {
  if (!value) return "";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString();
}

function isCompleted(kind: "trip" | "event", row: AnyRecord) {
  const status = String(row.status || "").toLowerCase();
  if (status === "completed") return true;
  const now = new Date();
  const candidate =
    kind === "trip"
      ? firstValue(row, ["end_date", "start_date"])
      : firstValue(row, ["end_at", "start_at", "date"]);
  const date = candidate ? new Date(String(candidate)) : null;
  return !!date && !Number.isNaN(date.getTime()) && date < now;
}

function timelineItem(kind: "trip" | "event", row: AnyRecord): TimelineItem {
  return {
    id: String(row.id || crypto.randomUUID()),
    kind,
    title: String(
      firstValue(row, kind === "trip"
        ? ["title", "name", "trip_name", "destination"]
        : ["title", "name", "event_name"]) || (kind === "trip" ? "Melo Trip" : "Melo Event")
    ),
    city: String(firstValue(row, ["city", "destination_city", "location_city", "venue_city"]) || ""),
    country: String(firstValue(row, ["country_name", "country", "destination_country", "country_code"]) || ""),
    date: isoDate(
      firstValue(row, kind === "trip"
        ? ["start_date", "created_at"]
        : ["start_at", "date", "created_at"])
    ),
    status: String(row.status || ""),
    completed: isCompleted(kind, row),
  };
}

async function loadMemberTrips(userId: string): Promise<AnyRecord[]> {
  if (!meloWebSupabase) return [];
  const [owned, joined] = await Promise.all([
    meloWebSupabase.from("trips").select("*").eq("organizer_id", userId),
    meloWebSupabase.from("trip_join_requests").select("trip_id,status").eq("user_id", userId).eq("status", "approved"),
  ]);
  const rows: AnyRecord[] = [...(owned.data || [])];
  const ids = (joined.data || []).map((r: any) => r.trip_id).filter(Boolean);
  if (ids.length) {
    const joinedTrips = await meloWebSupabase.from("trips").select("*").in("id", ids);
    rows.push(...(joinedTrips.data || []));
  }
  return Array.from(new Map(rows.map((row) => [row.id, row])).values());
}

async function loadMemberEvents(userId: string): Promise<AnyRecord[]> {
  if (!meloWebSupabase) return [];
  const [owned, joined] = await Promise.all([
    meloWebSupabase.from("events").select("*").eq("organizer_id", userId),
    meloWebSupabase.from("event_attendees").select("event_id").eq("user_id", userId),
  ]);
  const rows: AnyRecord[] = [...(owned.data || [])];
  const ids = (joined.data || []).map((r: any) => r.event_id).filter(Boolean);
  if (ids.length) {
    const joinedEvents = await meloWebSupabase.from("events").select("*").in("id", ids);
    rows.push(...(joinedEvents.data || []));
  }
  return Array.from(new Map(rows.map((row) => [row.id, row])).values());
}

export default function PassportJourneyCenter() {
  const [locale, setLocale] = useState<Locale>("th");
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [currentUserId, setCurrentUserId] = useState("");
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<AnyRecord | null>(null);
  const [reputation, setReputation] = useState<AnyRecord | null>(null);
  const [trips, setTrips] = useState<AnyRecord[]>([]);
  const [events, setEvents] = useState<AnyRecord[]>([]);
  const [activeTab, setActiveTab] = useState<"passport" | "timeline" | "badges">("passport");

  const t = copy[locale];

  useEffect(() => {
    const sync = () => setLocale(localeNow());
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    return () => observer.disconnect();
  }, []);

  const load = useCallback(async () => {
    if (!meloWebSupabase) {
      setError("Supabase environment is not configured.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { data: sessionData } = await meloWebSupabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) {
        setSignedIn(false);
        setLoading(false);
        return;
      }
      setSignedIn(true);
      setCurrentUserId(user.id);

      const [profileResult, reputationResult, tripResult, eventResult] = await Promise.allSettled([
        meloWebSupabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        meloWebSupabase.rpc("get_reputation_summary", { p_user_id: user.id }),
        loadMemberTrips(user.id),
        loadMemberEvents(user.id),
      ]);

      if (profileResult.status === "fulfilled" && !profileResult.value.error) {
        setProfile(profileResult.value.data || {});
      }
      if (reputationResult.status === "fulfilled" && !reputationResult.value.error) {
        const data = reputationResult.value.data;
        setReputation(Array.isArray(data) ? data[0] || null : data || null);
      }
      if (tripResult.status === "fulfilled") setTrips(tripResult.value);
      if (eventResult.status === "fulfilled") setEvents(eventResult.value);
    } catch (err: any) {
      setError(err?.message || t.error);
    } finally {
      setLoading(false);
    }
  }, [t.error]);

  useEffect(() => {
    load();
  }, [load]);

  const timeline = useMemo(() => {
    return [
      ...trips.map((row) => timelineItem("trip", row)),
      ...events.map((row) => timelineItem("event", row)),
    ].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [trips, events]);

  const completedTrips = timeline.filter((item) => item.kind === "trip" && item.completed);
  const completedEvents = timeline.filter((item) => item.kind === "event" && item.completed);
  const completed = timeline.filter((item) => item.completed);

  const countrySet = useMemo(
    () => new Set(completed.map((item) => item.country.trim()).filter(Boolean)),
    [completed]
  );
  const citySet = useMemo(
    () => new Set(completed.map((item) => item.city.trim()).filter(Boolean)),
    [completed]
  );

  const rating = Number(firstValue(reputation, ["average_rating", "reputation_score"]) || 0);
  const reviewCount = Number(firstValue(reputation, ["review_count"]) || 0);
  const verified = Boolean(firstValue(reputation, ["is_verified"]));
  const displayName = String(firstValue(profile, ["display_name", "full_name", "name", "username"]) || "Melo User");
  const photoPaths = Array.isArray(profile?.photo_paths) ? profile?.photo_paths : [];
  const avatar = String(firstValue(profile, ["avatar_url", "photo_url", "profile_image"]) || photoPaths?.[0] || "");
  const avatarHttp = /^https?:\/\//i.test(avatar);
  const profileCountry = String(firstValue(profile, ["country", "country_name", "nationality"]) || "");
  const profileNationality = String(firstValue(profile, ["nationality"]) || "");

  const badges = [
    { icon: "🧭", title: t.firstTrip, desc: t.firstTripDesc, unlocked: completedTrips.length >= 1, current: completedTrips.length, target: 1 },
    { icon: "🌏", title: t.explorer, desc: t.explorerDesc, unlocked: countrySet.size >= 3, current: countrySet.size, target: 3 },
    { icon: "🌐", title: t.worldTraveler, desc: t.worldTravelerDesc, unlocked: countrySet.size >= 5, current: countrySet.size, target: 5 },
    { icon: "🎒", title: t.tripVeteran, desc: t.tripVeteranDesc, unlocked: completedTrips.length >= 5, current: completedTrips.length, target: 5 },
    { icon: "🎟️", title: t.eventStarter, desc: t.eventStarterDesc, unlocked: completedEvents.length >= 1, current: completedEvents.length, target: 1 },
    { icon: "✨", title: t.socialExplorer, desc: t.socialExplorerDesc, unlocked: completedEvents.length >= 5, current: completedEvents.length, target: 5 },
    { icon: "✓", title: t.verifiedTraveler, desc: t.verifiedTravelerDesc, unlocked: verified, current: verified ? 1 : 0, target: 1 },
    { icon: "★", title: t.trustedMember, desc: t.trustedMemberDesc, unlocked: rating >= 4.5 && reviewCount >= 3, current: reviewCount, target: 3 },
  ];

  if (loading) {
    return <main className={styles.page}><Header /><div className={styles.shell}><div className={styles.loading}>{t.loading}</div></div></main>;
  }

  if (!signedIn) {
    return (
      <main className={styles.page}>
        <Header />
        <div className={styles.shell}>
          <section className={styles.signIn}>
            <div className={styles.passportIcon}>🛂</div>
            <h1>{t.loginRequired}</h1>
            <Link href="/login" className={styles.primary}>{t.login}</Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <Header />
      <div className={styles.shell}>
        <section className={styles.hero}>
          <div>
            <div className={styles.eyebrow}>{t.eyebrow}</div>
            <h1>{t.title}</h1>
            <p>{t.subtitle}</p>
          </div>
          <div className={styles.actions}>
            <Link href="/profile" className={styles.secondary}>{t.profile}</Link>
            <button className={styles.primary} onClick={load}>{t.refresh}</button>
          </div>
        </section>

        {error ? <div className={styles.error}>{error}</div> : null}

        <div className={styles.tabs}>
          <button className={activeTab === "passport" ? styles.activeTab : ""} onClick={() => setActiveTab("passport")}>🛂 {t.passport}</button>
          <button className={activeTab === "timeline" ? styles.activeTab : ""} onClick={() => setActiveTab("timeline")}>🧭 {t.timeline}</button>
          <button className={activeTab === "badges" ? styles.activeTab : ""} onClick={() => setActiveTab("badges")}>🏅 {t.badges}</button>
        </div>

        {activeTab === "passport" ? (
          <>
            <section className={styles.passport}>
              <div className={styles.passportTop}>
                <div className={styles.identity}>
                  <VerifiedUserAvatar userId={currentUserId} name={displayName} src={avatarHttp ? avatar : ""} country={profileCountry} nationality={profileNationality} verified={verified} className={styles.avatar} badgeSize={18} alt={displayName} />
                  <div>
                    <span>MELO CHAT</span>
                    <h2>{displayName}</h2>
                    <small>{verified ? "✓ Melo Verified" : "Melo Member"}</small>
                  </div>
                </div>
                <div className={styles.passportMark}>M</div>
              </div>

              <div className={styles.statGrid}>
                <article><strong>{countrySet.size}</strong><span>{t.countries}</span></article>
                <article><strong>{citySet.size}</strong><span>{t.cities}</span></article>
                <article><strong>{completedTrips.length}</strong><span>{t.trips}</span></article>
                <article><strong>{completedEvents.length}</strong><span>{t.events}</span></article>
                <article><strong>{rating > 0 ? rating.toFixed(1) : "—"}</strong><span>{t.reputation}</span></article>
              </div>
            </section>

            <section className={styles.sectionCard}>
              <div className={styles.sectionHead}>
                <div><span className={styles.sectionIcon}>✈</span><h2>{t.stamps}</h2></div>
                <span>{completed.length}</span>
              </div>
              {completed.length ? (
                <div className={styles.stampGrid}>
                  {completed.slice(0, 12).map((item) => (
                    <article className={styles.stamp} key={`${item.kind}-${item.id}`}>
                      <div className={styles.stampIcon}>{item.kind === "trip" ? "🧭" : "🎟️"}</div>
                      <div>
                        <strong>{item.country || item.city || t.world}</strong>
                        <span>{item.city || item.title}</span>
                        <small>{item.date ? new Date(item.date).toLocaleDateString() : "—"}</small>
                      </div>
                    </article>
                  ))}
                </div>
              ) : <div className={styles.empty}>{t.noStamps}</div>}
            </section>

            <section className={styles.sectionCard}>
              <div className={styles.sectionHead}>
                <div><span className={styles.sectionIcon}>🧭</span><h2>{t.recentJourney}</h2></div>
                <button onClick={() => setActiveTab("timeline")}>{t.timeline} →</button>
              </div>
              {timeline.length ? (
                <div className={styles.compactTimeline}>
                  {timeline.slice(0, 5).map((item) => (
                    <article key={`${item.kind}-${item.id}`}>
                      <div className={styles.dot}>{item.kind === "trip" ? "T" : "E"}</div>
                      <div className={styles.timelineInfo}>
                        <strong>{item.title}</strong>
                        <span>{[item.city, item.country].filter(Boolean).join(" · ") || t.world}</span>
                      </div>
                      <small>{item.date ? new Date(item.date).toLocaleDateString() : "—"}</small>
                    </article>
                  ))}
                </div>
              ) : <div className={styles.empty}>{t.noJourney}</div>}
            </section>
          </>
        ) : null}

        {activeTab === "timeline" ? (
          <section className={styles.sectionCard}>
            <div className={styles.sectionHead}>
              <div><span className={styles.sectionIcon}>⌁</span><h2>{t.timeline}</h2></div>
              <span>{timeline.length}</span>
            </div>
            {timeline.length ? (
              <div className={styles.fullTimeline}>
                {timeline.map((item) => (
                  <article key={`${item.kind}-${item.id}`}>
                    <div className={styles.timelineRail}>
                      <span>{item.kind === "trip" ? "🧭" : "🎟️"}</span>
                    </div>
                    <div className={styles.timelineCard}>
                      <div className={styles.timelineCardTop}>
                        <span className={item.completed ? styles.doneStatus : styles.liveStatus}>
                          {item.completed ? t.completed : t.upcoming}
                        </span>
                        <small>{item.date ? new Date(item.date).toLocaleDateString() : "—"}</small>
                      </div>
                      <h3>{item.title}</h3>
                      <p>{[item.city, item.country].filter(Boolean).join(" · ") || t.world}</p>
                      <Link href={item.kind === "trip" ? `/trips/${item.id}` : `/events/${item.id}`}>
                        {item.kind === "trip" ? t.trip : t.event} →
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            ) : <div className={styles.empty}>{t.noJourney}</div>}
          </section>
        ) : null}

        {activeTab === "badges" ? (
          <section className={styles.sectionCard}>
            <div className={styles.sectionHead}>
              <div><span className={styles.sectionIcon}>🏅</span><h2>{t.badges}</h2></div>
              <span>{badges.filter((b) => b.unlocked).length}/{badges.length}</span>
            </div>
            <div className={styles.badgeGrid}>
              {badges.map((badge) => {
                const pct = Math.min(100, Math.round((badge.current / badge.target) * 100));
                return (
                  <article className={`${styles.badgeCard} ${badge.unlocked ? styles.unlocked : ""}`} key={badge.title}>
                    <div className={styles.badgeIcon}>{badge.icon}</div>
                    <div className={styles.badgeState}>{badge.unlocked ? t.unlocked : t.locked}</div>
                    <h3>{badge.title}</h3>
                    <p>{badge.desc}</p>
                    <div className={styles.progressMeta}><span>{t.progress}</span><strong>{Math.min(badge.current, badge.target)}/{badge.target}</strong></div>
                    <div className={styles.progress}><span style={{ width: `${pct}%` }} /></div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}

        <section className={styles.launcher}>
          <Link href="/trips">🧭 {t.discoverTrips}</Link>
          <Link href="/events">🎟️ {t.discoverEvents}</Link>
          <Link href="/quests">🏆 {t.quests}</Link>
          <Link href="/profile">👤 {t.profile}</Link>
        </section>
      </div>
    </main>
  );
}
