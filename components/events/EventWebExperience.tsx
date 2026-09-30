"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { useLocale } from "@/components/SiteProviders";
import { GLOBAL_COUNTRY_SCOPE } from "@/lib/discoveryCountry";
import {
  getMasterLocationLabel,
  getMasterProvinceOptions,
  matchesMasterLocation,
} from "@/lib/masterLocationFilter";
import VerifiedUserAvatar from "@/components/profile/VerifiedUserAvatar";
import {
  joinEventWeb,
  loadEventsWeb,
  type EventWebRecord,
} from "./eventWebData";
import styles from "./EventWebExperience.module.css";

const COPY = {
  th: {
    eyebrow: "MELO EVENTS",
    title: "อีเวนต์",
    subtitle: "ค้นหากิจกรรมที่น่าสนใจ พบผู้คนใหม่ ๆ และเข้าร่วมอีเวนต์กับชาว Melo",
    discover: "Discover",
    mine: "My Events",
    create: "สร้างอีเวนต์",
    all: "ทั้งหมด",
    recommended: "อีเวนต์แนะนำ",
    allEvents: "อีเวนต์ทั้งหมด",
    date: "วันและเวลา",
    participants: "ผู้เข้าร่วม",
    spotsLeft: "ที่ว่าง",
    organizer: "ผู้จัด",
    joined: "เข้าร่วมแล้ว",
    owner: "ผู้จัด",
    open: "เปิดรับ",
    ongoing: "กำลังจัดงาน",
    closed: "ปิดรับ",
    full: "เต็มแล้ว",
    join: "เข้าร่วมอีเวนต์",
    joining: "กำลังเข้าร่วม…",
    joinSent: "เข้าร่วมแล้ว",
    price: "ค่าเข้าร่วม",
    free: "ฟรี",
    people: "คน",
    noEvents: "ยังไม่มีอีเวนต์ในประเภทนี้",
    noMine: "คุณยังไม่มีอีเวนต์ที่กำลังเข้าร่วม",
    loading: "กำลังโหลดอีเวนต์…",
  },
  en: {
    eyebrow: "MELO EVENTS",
    title: "Events",
    subtitle: "Discover interesting activities, meet new people and join Melo Events.",
    discover: "Discover",
    mine: "My Events",
    create: "Create Event",
    all: "All",
    recommended: "Recommended Events",
    allEvents: "All Events",
    date: "Date & time",
    participants: "Participants",
    spotsLeft: "spots left",
    organizer: "Organizer",
    joined: "Joined",
    owner: "Organizer",
    open: "Open",
    ongoing: "Ongoing",
    closed: "Closed",
    full: "Full",
    join: "Join Event",
    joining: "Joining…",
    joinSent: "Joined",
    price: "Price",
    free: "Free",
    people: "people",
    noEvents: "No events in this category yet",
    noMine: "You are not joining any Events yet",
    loading: "Loading Events…",
  },
  de: {
    eyebrow: "MELO EVENTS",
    title: "Events",
    subtitle: "Entdecke interessante Aktivitäten, lerne neue Leute kennen und nimm an Melo Events teil.",
    discover: "Entdecken",
    mine: "Meine Events",
    create: "Event erstellen",
    all: "Alle",
    recommended: "Empfohlene Events",
    allEvents: "Alle Events",
    date: "Datum & Zeit",
    participants: "Teilnehmer",
    spotsLeft: "Plätze frei",
    organizer: "Organisator",
    joined: "Beigetreten",
    owner: "Organisator",
    open: "Offen",
    ongoing: "Läuft",
    closed: "Geschlossen",
    full: "Voll",
    join: "Event beitreten",
    joining: "Beitritt…",
    joinSent: "Beigetreten",
    price: "Preis",
    free: "Kostenlos",
    people: "Personen",
    noEvents: "Noch keine Events in dieser Kategorie",
    noMine: "Du nimmst noch an keinem Event teil",
    loading: "Events werden geladen…",
  },
  zh: {
    eyebrow: "MELO EVENTS",
    title: "活动",
    subtitle: "发现有趣的活动，认识新朋友并参加 Melo 活动。",
    discover: "发现",
    mine: "我的活动",
    create: "创建活动",
    all: "全部",
    recommended: "推荐活动",
    allEvents: "全部活动",
    date: "日期与时间",
    participants: "参与者",
    spotsLeft: "个名额",
    organizer: "组织者",
    joined: "已加入",
    owner: "组织者",
    open: "开放",
    ongoing: "进行中",
    closed: "已关闭",
    full: "已满",
    join: "参加活动",
    joining: "正在加入…",
    joinSent: "已加入",
    price: "费用",
    free: "免费",
    people: "人",
    noEvents: "此类别暂无活动",
    noMine: "你还没有参加任何活动",
    loading: "正在加载活动…",
  },
  ja: {
    eyebrow: "MELO EVENTS",
    title: "Event",
    subtitle: "気になるアクティビティを見つけ、新しい人と出会い、Melo Eventに参加しましょう。",
    discover: "探す",
    mine: "My Events",
    create: "Eventを作成",
    all: "すべて",
    recommended: "おすすめEvent",
    allEvents: "すべてのEvent",
    date: "日時",
    participants: "参加者",
    spotsLeft: "空き",
    organizer: "主催者",
    joined: "参加中",
    owner: "主催者",
    open: "募集中",
    ongoing: "開催中",
    closed: "募集終了",
    full: "満員",
    join: "Eventに参加",
    joining: "参加中…",
    joinSent: "参加済み",
    price: "参加費",
    free: "無料",
    people: "人",
    noEvents: "このカテゴリにはまだEventがありません",
    noMine: "参加中のEventはありません",
    loading: "Eventを読み込み中…",
  },
  ko: {
    eyebrow: "MELO EVENTS",
    title: "이벤트",
    subtitle: "흥미로운 활동을 찾고 새로운 사람들을 만나 Melo 이벤트에 참여하세요.",
    discover: "둘러보기",
    mine: "내 이벤트",
    create: "이벤트 만들기",
    all: "전체",
    recommended: "추천 이벤트",
    allEvents: "전체 이벤트",
    date: "날짜 및 시간",
    participants: "참여자",
    spotsLeft: "자리 남음",
    organizer: "주최자",
    joined: "참여 중",
    owner: "주최자",
    open: "모집 중",
    ongoing: "진행 중",
    closed: "마감",
    full: "마감",
    join: "이벤트 참여",
    joining: "참여 중…",
    joinSent: "참여 완료",
    price: "참가비",
    free: "무료",
    people: "명",
    noEvents: "이 카테고리에 이벤트가 없습니다",
    noMine: "참여 중인 이벤트가 없습니다",
    loading: "이벤트 불러오는 중…",
  },
} as const;

type EventCategoryKey =
  | "friends_social"
  | "pets_animals"
  | "food_cafe"
  | "sports_fitness"
  | "music_entertainment"
  | "travel_outdoor"
  | "learning_workshop"
  | "business_networking"
  | "volunteer_charity"
  | "other";

const EVENT_CATEGORY_ORDER: EventCategoryKey[] = [
  "friends_social",
  "pets_animals",
  "food_cafe",
  "sports_fitness",
  "music_entertainment",
  "travel_outdoor",
  "learning_workshop",
  "business_networking",
  "volunteer_charity",
  "other",
];

const EVENT_CATEGORY_META: Record<EventCategoryKey, { icon: string; accent: string }> = {
  friends_social: { icon: "🫶", accent: "#2F8FFF" },
  pets_animals: { icon: "🐾", accent: "#FF9E2C" },
  food_cafe: { icon: "☕", accent: "#E27858" },
  sports_fitness: { icon: "🏃", accent: "#32B979" },
  music_entertainment: { icon: "🎵", accent: "#8B63E8" },
  travel_outdoor: { icon: "🏕️", accent: "#17A7BE" },
  learning_workshop: { icon: "📚", accent: "#A970FF" },
  business_networking: { icon: "💼", accent: "#2E9DEB" },
  volunteer_charity: { icon: "🤝", accent: "#20B7A6" },
  other: { icon: "•••", accent: "#6B7A90" },
};

const EVENT_CATEGORY_LABELS: Record<string, Record<EventCategoryKey, string>> = {
  th: { friends_social: "เพื่อน & สังคม", pets_animals: "สัตว์เลี้ยง", food_cafe: "อาหาร & คาเฟ่", sports_fitness: "กีฬา & ฟิตเนส", music_entertainment: "ดนตรี & บันเทิง", travel_outdoor: "ท่องเที่ยว & Outdoor", learning_workshop: "เรียนรู้ & Workshop", business_networking: "ธุรกิจ & Networking", volunteer_charity: "อาสา & การกุศล", other: "อื่น ๆ" },
  en: { friends_social: "Friends & Social", pets_animals: "Pets & Animals", food_cafe: "Food & Cafe", sports_fitness: "Sports & Fitness", music_entertainment: "Music & Entertainment", travel_outdoor: "Travel & Outdoor", learning_workshop: "Learning & Workshop", business_networking: "Business & Networking", volunteer_charity: "Volunteer & Charity", other: "Other" },
  de: { friends_social: "Freunde & Soziales", pets_animals: "Haustiere & Tiere", food_cafe: "Essen & Café", sports_fitness: "Sport & Fitness", music_entertainment: "Musik & Unterhaltung", travel_outdoor: "Reisen & Outdoor", learning_workshop: "Lernen & Workshop", business_networking: "Business & Networking", volunteer_charity: "Ehrenamt & Wohltätigkeit", other: "Sonstiges" },
  zh: { friends_social: "朋友与社交", pets_animals: "宠物与动物", food_cafe: "美食与咖啡", sports_fitness: "运动与健身", music_entertainment: "音乐与娱乐", travel_outdoor: "旅行与户外", learning_workshop: "学习与工作坊", business_networking: "商务与社交", volunteer_charity: "志愿与公益", other: "其他" },
  ja: { friends_social: "友達 & ソーシャル", pets_animals: "ペット & 動物", food_cafe: "フード & カフェ", sports_fitness: "スポーツ & フィットネス", music_entertainment: "音楽 & エンタメ", travel_outdoor: "旅行 & Outdoor", learning_workshop: "学び & Workshop", business_networking: "ビジネス & Networking", volunteer_charity: "ボランティア & チャリティ", other: "その他" },
  ko: { friends_social: "친구 & 소셜", pets_animals: "반려동물 & 동물", food_cafe: "음식 & 카페", sports_fitness: "스포츠 & 피트니스", music_entertainment: "음악 & 엔터테인먼트", travel_outdoor: "여행 & 아웃도어", learning_workshop: "배움 & 워크숍", business_networking: "비즈니스 & 네트워킹", volunteer_charity: "봉사 & 기부", other: "기타" },
};

type EventFilterCopy = { categoriesTitle: string; categoriesHint: string; searchTitle: string; searchHint: string; province: string; district: string; keyword: string; allProvince: string; allDistrict: string; clear: string; results: (count: number) => string };
const EVENT_FILTER_COPY: Record<"th" | "en" | "de" | "zh" | "ja" | "ko", EventFilterCopy> = {
  th: { categoriesTitle: "ประเภทอีเวนต์", categoriesHint: "ประเภทอีเวนต์ใช้ชุดเดียวกับหน้าสร้างอีเวนต์", searchTitle: "ค้นหาในประเภทนี้", searchHint: "เลือกพื้นที่และใส่คำค้นเพื่อหาอีเวนต์ที่ตรงกับความสนใจ", province: "จังหวัด / รัฐ / เมือง", district: "อำเภอ / เขต / พื้นที่", keyword: "ค้นหาชื่ออีเวนต์ สถานที่ หรือคำสำคัญ", allProvince: "ทุกจังหวัด / รัฐ / เมือง", allDistrict: "ทุกอำเภอ / เขต / พื้นที่", clear: "ล้างตัวกรอง", results: (count) => `พบ ${count} อีเวนต์` },
  en: { categoriesTitle: "Event types", categoriesHint: "These are the same fixed types used when creating an Event.", searchTitle: "Search this event type", searchHint: "Choose an area and add keywords to find relevant Events.", province: "Province / state / city", district: "District / area", keyword: "Search event, venue or keyword", allProvince: "All provinces / states / cities", allDistrict: "All districts / areas", clear: "Clear filters", results: (count) => `${count} events` },
  de: { categoriesTitle: "Event-Arten", categoriesHint: "Dies sind dieselben festen Kategorien wie beim Erstellen eines Events.", searchTitle: "In dieser Event-Art suchen", searchHint: "Region und Stichwörter auswählen, um passende Events zu finden.", province: "Region / Bundesland / Stadt", district: "Bezirk / Gebiet", keyword: "Event, Ort oder Stichwort suchen", allProvince: "Alle Regionen / Städte", allDistrict: "Alle Bezirke / Gebiete", clear: "Filter löschen", results: (count) => `${count} Events` },
  zh: { categoriesTitle: "活动类型", categoriesHint: "这里使用与创建活动时相同的固定分类。", searchTitle: "搜索此活动类型", searchHint: "选择地区并输入关键词，查找更相关的活动。", province: "省 / 州 / 城市", district: "区 / 地区", keyword: "搜索活动、地点或关键词", allProvince: "所有省 / 州 / 城市", allDistrict: "所有区 / 地区", clear: "清除筛选", results: (count) => `找到 ${count} 个活动` },
  ja: { categoriesTitle: "Eventタイプ", categoriesHint: "Event作成時と同じ固定カテゴリを使用します。", searchTitle: "このEventタイプから検索", searchHint: "エリアとキーワードを指定してEventを探せます。", province: "都道府県 / 州 / 都市", district: "市区町村 / エリア", keyword: "Event・会場・キーワードを検索", allProvince: "すべての都道府県 / 都市", allDistrict: "すべての市区町村 / エリア", clear: "フィルターを解除", results: (count) => `${count} Event` },
  ko: { categoriesTitle: "이벤트 유형", categoriesHint: "이벤트 만들기와 동일한 고정 카테고리를 사용합니다.", searchTitle: "이 이벤트 유형에서 검색", searchHint: "지역과 검색어를 선택해 원하는 이벤트를 찾아보세요.", province: "도 / 주 / 도시", district: "구 / 지역", keyword: "이벤트, 장소 또는 검색어", allProvince: "모든 도 / 주 / 도시", allDistrict: "모든 구 / 지역", clear: "필터 지우기", results: (count) => `${count}개 이벤트` },
};

function normalizeCategoryText(value: string) {
  return value.trim().toLocaleLowerCase().replace(/[&+]/g, " ").replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function resolveEventCategory(value: string): EventCategoryKey {
  const normalized = normalizeCategoryText(value);
  const direct = EVENT_CATEGORY_ORDER.find((key) => normalizeCategoryText(key) === normalized);
  if (direct) return direct;
  for (const labels of Object.values(EVENT_CATEGORY_LABELS)) {
    const match = EVENT_CATEGORY_ORDER.find((key) => normalizeCategoryText(labels[key]) === normalized);
    if (match) return match;
  }
  const aliases: Record<string, EventCategoryKey> = {
    "social": "friends_social", "friends social": "friends_social", "pet": "pets_animals", "pets": "pets_animals", "food cafe": "food_cafe", "food": "food_cafe", "sports": "sports_fitness", "fitness": "sports_fitness", "music": "music_entertainment", "entertainment": "music_entertainment", "travel": "travel_outdoor", "outdoor": "travel_outdoor", "workshop": "learning_workshop", "learning": "learning_workshop", "business": "business_networking", "networking": "business_networking", "volunteer": "volunteer_charity", "charity": "volunteer_charity"
  };
  return aliases[normalized] ?? "other";
}

function eventCategoryLabel(value: string, locale: string) {
  const key = resolveEventCategory(value);
  return (EVENT_CATEGORY_LABELS[locale] ?? EVENT_CATEGORY_LABELS.en)[key];
}

function localeTag(locale: string) {
  return ({
    th: "th-TH",
    en: "en-US",
    de: "de-DE",
    zh: "zh-CN",
    ja: "ja-JP",
    ko: "ko-KR",
  } as Record<string, string>)[locale] ?? "en-US";
}

function formatDate(start: string, end: string, locale: string) {
  if (!start) return "";
  const formatter = new Intl.DateTimeFormat(localeTag(locale), {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const startDate = new Date(start);
  if (Number.isNaN(startDate.getTime())) return start;
  const startText = formatter.format(startDate);
  if (!end) return startText;
  const endDate = new Date(end);
  if (Number.isNaN(endDate.getTime())) return startText;
  return `${startText} – ${formatter.format(endDate)}`;
}

function statusLabel(event: EventWebRecord, copy: any) {
  if (event.capacity > 0 && event.attendeeCount >= event.capacity) return copy.full;
  if (!event.membershipOpen) return copy.closed;
  if (event.lifecycle === "ongoing") return copy.ongoing;
  return copy.open;
}

export default function EventWebExperience() {
  const router = useRouter();
  const { locale, countryScope } = useLocale();
  const copy = COPY[locale] ?? COPY.en;

  const [events, setEvents] = useState<EventWebRecord[]>([]);
  const [mode, setMode] = useState<"discover" | "mine">("discover");
  const [category, setCategory] = useState<EventCategoryKey | "">("");
  const [selectedProvince, setSelectedProvince] = useState("");
  const [categoryQuery, setCategoryQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState("");
  const [joinError, setJoinError] = useState("");

  async function load() {
    setLoading(true);
    const result = await loadEventsWeb(countryScope);
    if (result.error === "AUTH_REQUIRED") {
      router.replace("/login");
      return;
    }
    setEvents(result.events);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, [countryScope]);

  const modeBase = useMemo(
    () => events.filter((event) => mode !== "mine" || event.joined || event.createdByMe),
    [events, mode],
  );
  const categoryBase = useMemo(
    () => modeBase.filter((event) => !category || resolveEventCategory(event.category) === category),
    [category, modeBase],
  );
  // Location Filter V2: the dropdown is driven by master country/region/city data,
  // while raw Google/Map address strings are used only to match records.
  const filterCountryValue = countryScope === GLOBAL_COUNTRY_SCOPE ? "" : countryScope;
  const provinceOptions = useMemo(
    () => getMasterProvinceOptions(filterCountryValue),
    [filterCountryValue],
  );

  // Location Filter V2: province belongs to the active country scope.
  useEffect(() => {
    setSelectedProvince("");
  }, [filterCountryValue]);
  const filtered = useMemo(() => {
    const query = categoryQuery.trim().toLocaleLowerCase();
    return categoryBase
      .filter((event) =>
        matchesMasterLocation(
          {
            country: event.country,
            province: event.province,
            district: event.district,
            city: event.city,
            address: event.address,
            venue: event.venueName,
          },
          filterCountryValue,
          selectedProvince,
          "",
        ),
      )
      .filter((event) => {
        if (!query) return true;
        return [event.title, event.description, event.venueName, event.address, event.city, event.province, event.district, event.country, event.organizerName, eventCategoryLabel(event.category, locale)]
          .join(" ").toLocaleLowerCase().includes(query);
      });
  }, [categoryBase, categoryQuery, filterCountryValue, locale, selectedProvince]);

  const recommended = useMemo(
    () =>
      filtered
        .filter((event) => event.lifecycle === "upcoming")
        .slice()
        .sort((a, b) => b.attendeeCount - a.attendeeCount)
        .slice(0, 3),
    [filtered],
  );

  const list = useMemo(() => {
    if (mode === "mine") return filtered;
    const ids = new Set(recommended.map((event) => event.id));
    return filtered.filter((event) => !ids.has(event.id));
  }, [filtered, mode, recommended]);

  function selectCategory(next: EventCategoryKey | "") {
    setCategory(next);
    setSelectedProvince("");
    setCategoryQuery("");
  }

  function clearCategoryFilters() {
    setSelectedProvince("");
    setCategoryQuery("");
  }

  async function join(event: EventWebRecord) {
    if (
      joiningId ||
      event.joined ||
      event.createdByMe ||
      !event.membershipOpen ||
      (event.capacity > 0 && event.attendeeCount >= event.capacity)
    ) {
      return;
    }

    setJoiningId(event.id);
    setJoinError("");
    try {
      await joinEventWeb(event);
      await load();
    } catch (error) {
      setJoinError(error instanceof Error ? error.message : "Join failed");
    } finally {
      setJoiningId("");
    }
  }

  return (
    <main className={styles.page}>
      <Header />

      <section className={styles.shell}>
        <header className={styles.pageHead}>
          <div>
            <span className={styles.eyebrow}>{copy.eyebrow}</span>
            <h1>{copy.title}</h1>
            <p>{copy.subtitle}</p>
          </div>

          <div className={styles.headActions}>
            <div className={styles.modeTabs}>
              <button
                type="button"
                className={mode === "discover" ? styles.activeTab : ""}
                onClick={() => setMode("discover")}
              >
                {copy.discover}
              </button>
              <button
                type="button"
                className={mode === "mine" ? styles.activeTab : ""}
                onClick={() => setMode("mine")}
              >
                {copy.mine}
              </button>
            </div>

            <button
              type="button"
              className={styles.createButton}
              onClick={() => router.push("/create-event")}
            >
              ＋ {copy.create}
            </button>
          </div>
        </header>

        {joinError ? <div className={styles.inlineError}>{joinError}</div> : null}

        <section className={styles.categoryBrowser} aria-label={(EVENT_FILTER_COPY[locale] ?? EVENT_FILTER_COPY.en).categoriesTitle}>
          <div className={styles.categoryBrowserHeader}>
            <div>
              <strong>{(EVENT_FILTER_COPY[locale] ?? EVENT_FILTER_COPY.en).categoriesTitle}</strong>
              <p>{(EVENT_FILTER_COPY[locale] ?? EVENT_FILTER_COPY.en).categoriesHint}</p>
            </div>
            <button type="button" className={!category ? styles.categoryAllActive : styles.categoryAllButton} onClick={() => selectCategory("")}>{copy.all}</button>
          </div>
          <div className={styles.desktopCategoryGrid}>
            {EVENT_CATEGORY_ORDER.map((item) => (
              <button type="button" key={item} className={`${styles.categoryTile} ${category === item ? styles.categoryTileActive : ""}`} onClick={() => selectCategory(item)}>
                <span className={styles.categoryTileIcon} style={{ background: EVENT_CATEGORY_META[item].accent }}>{EVENT_CATEGORY_META[item].icon}</span>
                <strong>{eventCategoryLabel(item, locale)}</strong>
              </button>
            ))}
          </div>
          <div className={styles.mobileCategoryGrid}>
            {EVENT_CATEGORY_ORDER.map((item) => (
              <button type="button" key={item} className={`${styles.mobileCategoryButton} ${category === item ? styles.mobileCategoryButtonActive : ""}`} onClick={() => selectCategory(item)}>
                <span className={styles.mobileCategoryIcon} style={{ background: EVENT_CATEGORY_META[item].accent }}>{EVENT_CATEGORY_META[item].icon}</span>
                <strong>{eventCategoryLabel(item, locale)}</strong>
              </button>
            ))}
          </div>
        </section>

        {category ? (() => {
          const filterCopy = EVENT_FILTER_COPY[locale] ?? EVENT_FILTER_COPY.en;
          return (
            <section className={styles.categorySearchPanel}>
              <div className={styles.categorySearchHeading}>
                <span className={styles.categorySearchIcon} style={{ background: EVENT_CATEGORY_META[category].accent }}>{EVENT_CATEGORY_META[category].icon}</span>
                <div><small>{filterCopy.searchTitle}</small><h2>{eventCategoryLabel(category, locale)}</h2><p>{filterCopy.searchHint}</p></div>
                <strong className={styles.categorySearchCount}>{filterCopy.results(filtered.length)}</strong>
              </div>
              <div className={styles.categorySearchFilters}>
                <label><span>{filterCopy.province}</span><select value={selectedProvince} disabled={!provinceOptions.length} onChange={(event) => setSelectedProvince(event.target.value)}><option value="">{filterCopy.allProvince}</option>{provinceOptions.map((province) => <option value={province.value} key={province.code}>{getMasterLocationLabel(province, locale)}</option>)}</select></label>
                <label className={styles.categorySearchKeyword}><span>{filterCopy.keyword}</span><input value={categoryQuery} onChange={(event) => setCategoryQuery(event.target.value)} placeholder={filterCopy.keyword} /></label>
                <button type="button" className={styles.categorySearchClear} disabled={!selectedProvince && !categoryQuery.trim()} onClick={clearCategoryFilters}>{filterCopy.clear}</button>
              </div>
            </section>
          );
        })() : null}

        {loading ? (
          <div className={styles.state}>{copy.loading}</div>
        ) : !filtered.length ? (
          <div className={styles.state}>
            <strong>{mode === "mine" ? copy.noMine : copy.noEvents}</strong>
          </div>
        ) : (
          <>
            {mode === "discover" && recommended.length ? (
              <section className={styles.section}>
                <h2>{copy.recommended}</h2>
                <div className={styles.eventGrid}>
                  {recommended.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      locale={locale}
                      copy={copy}
                      joining={joiningId === event.id}
                      onJoin={() => void join(event)}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            {list.length ? (
              <section className={styles.section}>
                <div className={styles.sectionHead}>
                  <h2>{mode === "mine" ? copy.mine : copy.allEvents}</h2>
                  <span>{list.length}</span>
                </div>
                <div className={styles.eventGrid}>
                  {list.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      locale={locale}
                      copy={copy}
                      joining={joiningId === event.id}
                      onJoin={() => void join(event)}
                    />
                  ))}
                </div>
              </section>
            ) : null}
          </>
        )}
      </section>
    </main>
  );
}

function EventCard({
  event,
  locale,
  copy,
  joining,
  onJoin,
}: {
  event: EventWebRecord;
  locale: string;
  copy: any;
  joining: boolean;
  onJoin: () => void;
}) {
  const remaining =
    event.capacity > 0 ? Math.max(0, event.capacity - event.attendeeCount) : null;
  const progress =
    event.capacity > 0
      ? Math.min(100, Math.round((event.attendeeCount / event.capacity) * 100))
      : 0;
  const disabled =
    joining ||
    event.joined ||
    event.createdByMe ||
    !event.membershipOpen ||
    (event.capacity > 0 && event.attendeeCount >= event.capacity);

  const buttonText = event.createdByMe
    ? copy.owner
    : event.joined
      ? copy.joined
      : event.capacity > 0 && event.attendeeCount >= event.capacity
        ? copy.full
        : !event.membershipOpen
          ? copy.closed
          : joining
            ? copy.joining
            : copy.join;

  return (
    <article className={styles.eventCard}>
      <Link href={`/events/${event.id}`} className={styles.eventMainLink}>
        <div className={styles.image}>
          {event.imageUrl ? <img src={event.imageUrl} alt="" /> : <div className={styles.fallback}>{EVENT_CATEGORY_META[resolveEventCategory(event.category)].icon}</div>}
          <div className={styles.badges}>
            {event.category ? <span>{eventCategoryLabel(event.category, locale)}</span> : null}
            <span>{statusLabel(event, copy)}</span>
          </div>
          <div className={styles.participants}>
            <strong>{event.attendeeCount}{event.capacity ? `/${event.capacity}` : ""}</strong>
            <span>{copy.participants}</span>
          </div>
        </div>

        <div className={styles.body}>
          <div className={styles.titleLine}>
            <strong>{event.title}</strong>
            <span>{statusLabel(event, copy)}</span>
          </div>

          <div className={styles.venue}>
            <span>⌖</span>
            <strong>{[event.venueName, event.city].filter(Boolean).join(" · ") || "—"}</strong>
          </div>

          <div className={styles.dateCard}>
            <span className={styles.dateIcon}><i /><b>◷</b></span>
            <div>
              <small>{copy.date}</small>
              <strong>{formatDate(event.startAt, event.endAt, locale)}</strong>
            </div>
          </div>

          <div className={styles.priceLine}>
            <span>฿</span>
            <strong>
              {event.pricePerPerson != null
                ? `${event.pricePerPerson.toLocaleString(localeTag(locale))} THB`
                : copy.free}
            </strong>
          </div>

          {event.capacity > 0 ? (
            <div className={styles.progress}>
              <div>
                <span>{copy.participants}</span>
                <strong>{remaining} {copy.spotsLeft}</strong>
              </div>
              <i><b style={{ width: `${progress}%` }} /></i>
            </div>
          ) : null}
        </div>
      </Link>

      <div className={styles.footer}>
        <Link href={`/users/${event.organizerId}`} className={styles.organizer}>
          <VerifiedUserAvatar userId={event.organizerId} name={event.organizerName} src={event.organizerPhotoUrl} country={event.country} badgeSize={15} alt="" />
          <div>
            <small>{copy.organizer}</small>
            <strong>{event.organizerName}</strong>
          </div>
        </Link>

        <button type="button" disabled={disabled} onClick={onJoin}>
          {buttonText}
        </button>
      </div>
    </article>
  );
}
