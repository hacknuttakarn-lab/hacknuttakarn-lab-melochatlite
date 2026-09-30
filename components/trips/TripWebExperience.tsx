"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
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
  loadTripsWeb,
  requestToJoinTripWeb,
  type TripWebRecord,
} from "./tripWebData";
import styles from "./TripWebExperience.module.css";

const COPY = {
  th: {
    eyebrow: "MELO TRIPS",
    title: "ทริป",
    subtitle: "ค้นหาทริปที่ตรงกับสไตล์การเดินทางของคุณ หรือดูทริปที่กำลังเข้าร่วมอยู่",
    discover: "ค้นหาทริป",
    mine: "ทริปของฉัน",
    create: "สร้างทริป",
    refresh: "รีเฟรช",
    search: "ค้นหาทริป จุดหมาย หรือหมวดหมู่",
    all: "ทั้งหมด",
    featured: "ทริปแนะนำ",
    allTrips: "ทริปทั้งหมด",
    view: "ดูรายละเอียด",
    people: "คน",
    joined: "เข้าร่วมแล้ว",
    owner: "ผู้จัด",
    open: "เปิดรับ",
    closed: "ปิดรับ",
    ongoing: "กำลังเดินทาง",
    upcoming: "กำลังจะมาถึง",
    budget: "งบต่อคน",
    freeBudget: "ไม่ระบุงบ",
    route: "เส้นทาง",
    organizer: "ผู้จัดทริป",
    noTrips: "ยังไม่พบทริปที่ตรงกับเงื่อนไข",
    noMine: "คุณยังไม่มีทริปที่กำลังเข้าร่วม",
    clear: "ล้างตัวกรอง",
    loading: "กำลังโหลดทริป…",
    joinNow: "ขอเข้าร่วม",
    joining: "กำลังส่งคำขอ…",
    joinSent: "ส่งคำขอแล้ว",
    full: "เต็มแล้ว",
    participants: "ผู้เข้าร่วม",
    spotsLeft: "ที่ว่าง",
    viewTrip: "ดูทริป",
    joinError: "ส่งคำขอเข้าร่วมไม่สำเร็จ",
    travelDate: "วันเดินทาง",
    categories: {
      "ROAD TRIP": "Road Trip",
      "CAMPING & OUTDOOR": "แคมป์ปิ้ง & เอาต์ดอร์",
      "HIKING & TREKKING": "เดินป่า & Trekking",
      "BEACH & ISLAND": "ทะเล & เกาะ",
      "WATER ADVENTURE": "กิจกรรมทางน้ำ",
      "SNOW & WINTER TRIP": "หิมะ & ฤดูหนาว",
      "FOOD & CAFE TRIP": "อาหาร & คาเฟ่",
      "CITY & SIGHTSEEING": "เมือง & Sightseeing",
      "NATURE & RELAX": "ธรรมชาติ & พักผ่อน",
      "FESTIVAL & EVENT TRIP": "เทศกาล & Event",
      "PHOTOGRAPHY & CONTENT TRIP": "ถ่ายภาพ & Content",
      "CULTURE & LOCAL EXPERIENCE": "วัฒนธรรม & Local",
      "WELLNESS & RETREAT": "Wellness & Retreat",
      "BACKPACKING & BUDGET TRAVEL": "Backpacking & Budget",
      "OTHER": "อื่น ๆ",
    },
  },
  en: {
    eyebrow: "MELO TRIPS",
    title: "Trips",
    subtitle: "Discover trips that match your travel style or manage the trips you are already joining.",
    discover: "Discover",
    mine: "My Trips",
    create: "Create Trip",
    refresh: "Refresh",
    search: "Search trips, destinations or categories",
    all: "All",
    featured: "Recommended Trips",
    allTrips: "All Trips",
    view: "View details",
    people: "people",
    joined: "Joined",
    owner: "Organizer",
    open: "Open",
    closed: "Closed",
    ongoing: "Ongoing",
    upcoming: "Upcoming",
    budget: "Budget/person",
    freeBudget: "Budget not specified",
    route: "Route",
    organizer: "Organizer",
    noTrips: "No trips match your filters",
    noMine: "You are not currently joining any trips",
    clear: "Clear filters",
    loading: "Loading trips…",
    joinNow: "Join Trip",
    joining: "Sending request…",
    joinSent: "Request sent",
    full: "Full",
    participants: "Participants",
    spotsLeft: "spots left",
    viewTrip: "View Trip",
    joinError: "Could not send join request",
    travelDate: "Travel date",
    categories: {} as Record<string, string>,
  },
  de: {
    eyebrow: "MELO TRIPS",
    title: "Reisen",
    subtitle: "Entdecke Reisen, die zu deinem Stil passen, oder verwalte deine aktuellen Reisen.",
    discover: "Entdecken",
    mine: "Meine Reisen",
    create: "Reise erstellen",
    refresh: "Aktualisieren",
    search: "Reisen, Ziele oder Kategorien suchen",
    all: "Alle",
    featured: "Empfohlene Reisen",
    allTrips: "Alle Reisen",
    view: "Details ansehen",
    people: "Personen",
    joined: "Beigetreten",
    owner: "Organisator",
    open: "Offen",
    closed: "Geschlossen",
    ongoing: "Unterwegs",
    upcoming: "Bevorstehend",
    budget: "Budget/Person",
    freeBudget: "Kein Budget angegeben",
    route: "Route",
    organizer: "Organisator",
    noTrips: "Keine passenden Reisen gefunden",
    noMine: "Du nimmst derzeit an keiner Reise teil",
    clear: "Filter löschen",
    loading: "Reisen werden geladen…",
    joinNow: "Teilnehmen",
    joining: "Anfrage wird gesendet…",
    joinSent: "Anfrage gesendet",
    full: "Voll",
    participants: "Teilnehmer",
    spotsLeft: "Plätze frei",
    viewTrip: "Reise ansehen",
    joinError: "Teilnahmeanfrage fehlgeschlagen",
    travelDate: "Reisedatum",
    categories: {} as Record<string, string>,
  },
  zh: {
    eyebrow: "MELO TRIPS",
    title: "旅行",
    subtitle: "发现符合你旅行风格的行程，或管理你已经参加的旅行。",
    discover: "发现旅行",
    mine: "我的旅行",
    create: "创建旅行",
    refresh: "刷新",
    search: "搜索旅行、目的地或类别",
    all: "全部",
    featured: "推荐旅行",
    allTrips: "全部旅行",
    view: "查看详情",
    people: "人",
    joined: "已加入",
    owner: "组织者",
    open: "开放加入",
    closed: "已关闭",
    ongoing: "进行中",
    upcoming: "即将开始",
    budget: "人均预算",
    freeBudget: "未指定预算",
    route: "路线",
    organizer: "组织者",
    noTrips: "没有符合筛选条件的旅行",
    noMine: "你目前没有参加中的旅行",
    clear: "清除筛选",
    loading: "正在加载旅行…",
    joinNow: "申请加入",
    joining: "正在发送申请…",
    joinSent: "申请已发送",
    full: "已满",
    participants: "参与者",
    spotsLeft: "个名额",
    viewTrip: "查看旅行",
    joinError: "无法发送加入申请",
    travelDate: "旅行日期",
    categories: {} as Record<string, string>,
  },
  ja: {
    eyebrow: "MELO TRIPS",
    title: "Trip",
    subtitle: "あなたの旅スタイルに合うTripを探したり、参加中のTripを管理できます。",
    discover: "Tripを探す",
    mine: "マイTrip",
    create: "Tripを作成",
    refresh: "更新",
    search: "Trip、目的地、カテゴリを検索",
    all: "すべて",
    featured: "おすすめTrip",
    allTrips: "すべてのTrip",
    view: "詳細を見る",
    people: "人",
    joined: "参加中",
    owner: "主催者",
    open: "募集中",
    closed: "募集終了",
    ongoing: "進行中",
    upcoming: "近日開催",
    budget: "1人あたり予算",
    freeBudget: "予算未設定",
    route: "ルート",
    organizer: "主催者",
    noTrips: "条件に合うTripがありません",
    noMine: "参加中のTripはありません",
    clear: "フィルターを解除",
    loading: "Tripを読み込み中…",
    joinNow: "参加申請",
    joining: "申請を送信中…",
    joinSent: "申請済み",
    full: "満員",
    participants: "参加者",
    spotsLeft: "空き",
    viewTrip: "Tripを見る",
    joinError: "参加申請を送信できませんでした",
    travelDate: "旅行日",
    categories: {} as Record<string, string>,
  },
  ko: {
    eyebrow: "MELO TRIPS",
    title: "여행",
    subtitle: "여행 스타일에 맞는 여행을 찾거나 현재 참여 중인 여행을 관리하세요.",
    discover: "여행 찾기",
    mine: "내 여행",
    create: "여행 만들기",
    refresh: "새로고침",
    search: "여행, 목적지 또는 카테고리 검색",
    all: "전체",
    featured: "추천 여행",
    allTrips: "전체 여행",
    view: "상세 보기",
    people: "명",
    joined: "참여 중",
    owner: "주최자",
    open: "모집 중",
    closed: "마감",
    ongoing: "진행 중",
    upcoming: "예정",
    budget: "1인 예산",
    freeBudget: "예산 미지정",
    route: "경로",
    organizer: "주최자",
    noTrips: "조건에 맞는 여행이 없습니다",
    noMine: "현재 참여 중인 여행이 없습니다",
    clear: "필터 초기화",
    loading: "여행 불러오는 중…",
    joinNow: "참여 요청",
    joining: "요청 보내는 중…",
    joinSent: "요청 완료",
    full: "마감",
    participants: "참여자",
    spotsLeft: "자리 남음",
    viewTrip: "여행 보기",
    joinError: "참여 요청을 보낼 수 없습니다",
    travelDate: "여행 날짜",
    categories: {} as Record<string, string>,
  },
} as const;


const CATEGORY_LABELS: Record<string, Record<string, string>> = {
  th: {
    "ROAD TRIP": "โรดทริป",
    "CAMPING & OUTDOOR": "แคมป์ปิ้ง & เอาต์ดอร์",
    "HIKING & TREKKING": "เดินป่า & เทรคกิ้ง",
    "BEACH & ISLAND": "ทะเล & เกาะ",
    "WATER ADVENTURE": "กิจกรรมทางน้ำ",
    "SNOW & WINTER TRIP": "หิมะ & ฤดูหนาว",
    "FOOD & CAFE TRIP": "อาหาร & คาเฟ่",
    "CITY & SIGHTSEEING": "เที่ยวเมือง & ชมวิว",
    "NATURE & RELAX": "ธรรมชาติ & พักผ่อน",
    "FESTIVAL & EVENT TRIP": "เทศกาล & อีเวนต์",
    "PHOTOGRAPHY & CONTENT TRIP": "ถ่ายภาพ & คอนเทนต์",
    "CULTURE & LOCAL EXPERIENCE": "วัฒนธรรม & วิถีท้องถิ่น",
    "WELLNESS & RETREAT": "เวลเนส & รีทรีต",
    "BACKPACKING & BUDGET TRAVEL": "แบ็กแพ็ก & ประหยัด",
    "OTHER": "อื่น ๆ",
  },
  en: {},
  de: {
    "ROAD TRIP": "Roadtrip",
    "CAMPING & OUTDOOR": "Camping & Outdoor",
    "HIKING & TREKKING": "Wandern & Trekking",
    "BEACH & ISLAND": "Strand & Insel",
    "WATER ADVENTURE": "Wasserabenteuer",
    "SNOW & WINTER TRIP": "Schnee & Winter",
    "FOOD & CAFE TRIP": "Essen & Cafés",
    "CITY & SIGHTSEEING": "Stadt & Sightseeing",
    "NATURE & RELAX": "Natur & Erholung",
    "FESTIVAL & EVENT TRIP": "Festival & Event",
    "PHOTOGRAPHY & CONTENT TRIP": "Fotografie & Content",
    "CULTURE & LOCAL EXPERIENCE": "Kultur & Lokales",
    "WELLNESS & RETREAT": "Wellness & Retreat",
    "BACKPACKING & BUDGET TRAVEL": "Backpacking & Budget",
    "OTHER": "Andere",
  },
  zh: {
    "ROAD TRIP": "公路旅行",
    "CAMPING & OUTDOOR": "露营与户外",
    "HIKING & TREKKING": "徒步与登山",
    "BEACH & ISLAND": "海滩与岛屿",
    "WATER ADVENTURE": "水上探险",
    "SNOW & WINTER TRIP": "冰雪与冬季",
    "FOOD & CAFE TRIP": "美食与咖啡",
    "CITY & SIGHTSEEING": "城市与观光",
    "NATURE & RELAX": "自然与放松",
    "FESTIVAL & EVENT TRIP": "节庆与活动",
    "PHOTOGRAPHY & CONTENT TRIP": "摄影与内容创作",
    "CULTURE & LOCAL EXPERIENCE": "文化与当地体验",
    "WELLNESS & RETREAT": "疗愈与静修",
    "BACKPACKING & BUDGET TRAVEL": "背包与预算旅行",
    "OTHER": "其他",
  },
  ja: {
    "ROAD TRIP": "ロードトリップ",
    "CAMPING & OUTDOOR": "キャンプ & アウトドア",
    "HIKING & TREKKING": "ハイキング & トレッキング",
    "BEACH & ISLAND": "ビーチ & 島",
    "WATER ADVENTURE": "ウォーターアドベンチャー",
    "SNOW & WINTER TRIP": "雪 & 冬旅",
    "FOOD & CAFE TRIP": "グルメ & カフェ",
    "CITY & SIGHTSEEING": "街歩き & 観光",
    "NATURE & RELAX": "自然 & リラックス",
    "FESTIVAL & EVENT TRIP": "フェス & イベント",
    "PHOTOGRAPHY & CONTENT TRIP": "写真 & コンテンツ",
    "CULTURE & LOCAL EXPERIENCE": "文化 & ローカル体験",
    "WELLNESS & RETREAT": "ウェルネス & リトリート",
    "BACKPACKING & BUDGET TRAVEL": "バックパック & 節約旅",
    "OTHER": "その他",
  },
  ko: {
    "ROAD TRIP": "로드트립",
    "CAMPING & OUTDOOR": "캠핑 & 아웃도어",
    "HIKING & TREKKING": "하이킹 & 트레킹",
    "BEACH & ISLAND": "해변 & 섬",
    "WATER ADVENTURE": "수상 어드벤처",
    "SNOW & WINTER TRIP": "눈 & 겨울 여행",
    "FOOD & CAFE TRIP": "맛집 & 카페",
    "CITY & SIGHTSEEING": "도시 & 관광",
    "NATURE & RELAX": "자연 & 휴식",
    "FESTIVAL & EVENT TRIP": "축제 & 이벤트",
    "PHOTOGRAPHY & CONTENT TRIP": "사진 & 콘텐츠",
    "CULTURE & LOCAL EXPERIENCE": "문화 & 로컬 체험",
    "WELLNESS & RETREAT": "웰니스 & 리트리트",
    "BACKPACKING & BUDGET TRAVEL": "백패킹 & 가성비 여행",
    "OTHER": "기타",
  },
};

const CATEGORY_ORDER = [
  "ROAD TRIP",
  "CAMPING & OUTDOOR",
  "HIKING & TREKKING",
  "BEACH & ISLAND",
  "WATER ADVENTURE",
  "SNOW & WINTER TRIP",
  "FOOD & CAFE TRIP",
  "CITY & SIGHTSEEING",
  "NATURE & RELAX",
  "FESTIVAL & EVENT TRIP",
  "PHOTOGRAPHY & CONTENT TRIP",
  "CULTURE & LOCAL EXPERIENCE",
  "WELLNESS & RETREAT",
  "BACKPACKING & BUDGET TRAVEL",
  "OTHER",
];

const TRIP_CATEGORY_META: Record<string, { icon: string; accent: string }> = {
  "ROAD TRIP": { icon: "🚗", accent: "#2F8FFF" },
  "CAMPING & OUTDOOR": { icon: "🏕️", accent: "#32B979" },
  "HIKING & TREKKING": { icon: "🥾", accent: "#8B63E8" },
  "BEACH & ISLAND": { icon: "🏝️", accent: "#17A7BE" },
  "WATER ADVENTURE": { icon: "🌊", accent: "#2E9DEB" },
  "SNOW & WINTER TRIP": { icon: "❄️", accent: "#6D9FEF" },
  "FOOD & CAFE TRIP": { icon: "☕", accent: "#FF9E2C" },
  "CITY & SIGHTSEEING": { icon: "🏙️", accent: "#6B7A90" },
  "NATURE & RELAX": { icon: "🌿", accent: "#20B7A6" },
  "FESTIVAL & EVENT TRIP": { icon: "🎉", accent: "#FF4F87" },
  "PHOTOGRAPHY & CONTENT TRIP": { icon: "📸", accent: "#A970FF" },
  "CULTURE & LOCAL EXPERIENCE": { icon: "🏮", accent: "#F25C5C" },
  "WELLNESS & RETREAT": { icon: "🧘", accent: "#20A78F" },
  "BACKPACKING & BUDGET TRAVEL": { icon: "🎒", accent: "#D78A2D" },
  "OTHER": { icon: "•••", accent: "#6B7A90" },
};

type TripFilterCopy = {
  categoriesTitle: string;
  categoriesHint: string;
  searchTitle: string;
  searchHint: string;
  province: string;
  district: string;
  keyword: string;
  allProvince: string;
  allDistrict: string;
  clear: string;
  results: (count: number) => string;
};

const TRIP_FILTER_COPY: Record<"th" | "en" | "de" | "zh" | "ja" | "ko", TripFilterCopy> = {
  th: { categoriesTitle: "ประเภททริป", categoriesHint: "เลือกประเภททริปที่ต้องการ แล้วค้นหาต่อด้วยพื้นที่หรือคำสำคัญ", searchTitle: "ค้นหาในประเภทนี้", searchHint: "กรองจุดหมาย พื้นที่ และคำค้น เพื่อหาทริปที่ตรงกับแผนของคุณ", province: "จังหวัด / รัฐ / จุดหมาย", district: "อำเภอ / เขต / เมือง", keyword: "ค้นหาชื่อทริป สถานที่ หรือคำสำคัญ", allProvince: "ทุกจังหวัด / รัฐ / จุดหมาย", allDistrict: "ทุกอำเภอ / เขต / เมือง", clear: "ล้างตัวกรอง", results: (count) => `พบ ${count} ทริป` },
  en: { categoriesTitle: "Trip types", categoriesHint: "Choose a trip type, then narrow it down by area or keyword.", searchTitle: "Search this trip type", searchHint: "Filter destinations, areas and keywords to find the right trip.", province: "Province / state / destination", district: "District / city", keyword: "Search trip, place or keyword", allProvince: "All provinces / states / destinations", allDistrict: "All districts / cities", clear: "Clear filters", results: (count) => `${count} trips` },
  de: { categoriesTitle: "Reisearten", categoriesHint: "Wähle eine Reiseart und grenze sie nach Region oder Stichwort ein.", searchTitle: "In dieser Reiseart suchen", searchHint: "Ziel, Region und Stichwörter filtern, um passende Reisen zu finden.", province: "Region / Bundesland / Ziel", district: "Bezirk / Stadt", keyword: "Reise, Ort oder Stichwort suchen", allProvince: "Alle Regionen / Ziele", allDistrict: "Alle Bezirke / Städte", clear: "Filter löschen", results: (count) => `${count} Reisen` },
  zh: { categoriesTitle: "旅行类型", categoriesHint: "先选择旅行类型，再按地区或关键词进一步筛选。", searchTitle: "搜索此旅行类型", searchHint: "按目的地、地区和关键词查找更合适的旅行。", province: "省 / 州 / 目的地", district: "区 / 市", keyword: "搜索旅行、地点或关键词", allProvince: "所有省 / 州 / 目的地", allDistrict: "所有区 / 市", clear: "清除筛选", results: (count) => `找到 ${count} 个旅行` },
  ja: { categoriesTitle: "Tripタイプ", categoriesHint: "Tripタイプを選び、エリアやキーワードで絞り込めます。", searchTitle: "このTripタイプから検索", searchHint: "目的地、エリア、キーワードで希望に合うTripを探せます。", province: "都道府県 / 州 / 目的地", district: "市区町村 / 都市", keyword: "Trip・場所・キーワードを検索", allProvince: "すべての都道府県 / 目的地", allDistrict: "すべての市区町村 / 都市", clear: "フィルターを解除", results: (count) => `${count} Trip` },
  ko: { categoriesTitle: "여행 유형", categoriesHint: "여행 유형을 선택한 뒤 지역이나 검색어로 더 좁혀보세요.", searchTitle: "이 여행 유형에서 검색", searchHint: "목적지, 지역, 검색어로 원하는 여행을 찾아보세요.", province: "도 / 주 / 목적지", district: "구 / 시", keyword: "여행, 장소 또는 검색어", allProvince: "모든 도 / 주 / 목적지", allDistrict: "모든 구 / 시", clear: "필터 지우기", results: (count) => `${count}개 여행` },
};

function normalizeTripCategoryValue(value: string) {
  const clean = value.trim().toUpperCase();
  if (clean === "CAMPING") return "CAMPING & OUTDOOR";
  if (clean === "CAFE HOPPING") return "FOOD & CAFE TRIP";
  if (clean === "HIKING") return "HIKING & TREKKING";
  return CATEGORY_ORDER.includes(clean) ? clean : "OTHER";
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

function formatDateRange(start: string, end: string, locale: string) {
  if (!start) return "";
  const tag = localeTag(locale);
  const formatter = new Intl.DateTimeFormat(tag, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const startDate = new Date(start);
  const endDate = end ? new Date(end) : null;
  if (Number.isNaN(startDate.getTime())) return start;

  const startText = formatter.format(startDate);
  if (!endDate || Number.isNaN(endDate.getTime())) return startText;
  const endText = formatter.format(endDate);
  return startText === endText ? startText : `${startText} – ${endText}`;
}

function categoryLabel(category: string, copy: any, locale = "en") {
  const normalized = normalizeTripCategoryValue(category);
  return (
    copy.categories?.[normalized] ||
    CATEGORY_LABELS[locale]?.[normalized] ||
    normalized ||
    "Trip"
  );
}

function statusLabel(trip: TripWebRecord, copy: any) {
  if (!trip.membershipOpen) return copy.closed;
  if (trip.lifecycle === "ongoing") return copy.ongoing;
  return copy.upcoming;
}

export default function TripWebExperience() {
  const router = useRouter();
  const { locale, countryScope } = useLocale();
  const copy = COPY[locale] ?? COPY.en;

  const [trips, setTrips] = useState<TripWebRecord[]>([]);
  const [mode, setMode] = useState<"discover" | "mine">("discover");
  const [category, setCategory] = useState("");
  const [selectedProvince, setSelectedProvince] = useState("");
  const [categoryQuery, setCategoryQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const pullStartRef = useRef<number | null>(null);
  const pullPointerRef = useRef<number | null>(null);
  const pullDistanceRef = useRef(0);
  const [error, setError] = useState("");
  const [joiningTripId, setJoiningTripId] = useState("");
  const [joinSentIds, setJoinSentIds] = useState<Set<string>>(() => new Set());
  const [joinError, setJoinError] = useState("");

  async function load(background = false) {
    background ? setRefreshing(true) : setLoading(true);
    setError("");

    const result = await loadTripsWeb(countryScope);
    if (result.error === "AUTH_REQUIRED") {
      router.replace("/login");
      return;
    }

    if (result.error) setError(result.error);
    setTrips(result.trips);
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    void load();
  }, [countryScope]);

  const modeBase = useMemo(
    () => trips.filter((trip) => mode !== "mine" || trip.joined || trip.createdByMe),
    [mode, trips],
  );

  const categoryBase = useMemo(
    () => modeBase.filter((trip) => !category || normalizeTripCategoryValue(trip.category) === category),
    [category, modeBase],
  );

  // Location Filter V2: dropdowns come from the canonical master location data,
  // never from Trip/Map address strings.
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
      .filter((trip) =>
        matchesMasterLocation(
          {
            country: trip.country,
            province: trip.province,
            district: trip.district,
            city: trip.city,
            destination: trip.destination,
            startPoint: trip.startPoint,
          },
          filterCountryValue,
          selectedProvince,
          "",
        ),
      )
      .filter((trip) => {
        if (!query) return true;
        return [trip.title, trip.description, trip.startPoint, trip.destination, trip.province, trip.district, trip.city, trip.country, trip.organizerName, categoryLabel(trip.category, copy, locale)]
          .join(" ")
          .toLocaleLowerCase()
          .includes(query);
      });
  }, [categoryBase, categoryQuery, copy, filterCountryValue, locale, selectedProvince]);

  const featured = useMemo(
    () =>
      filtered
        .filter((trip) => trip.lifecycle === "upcoming")
        .slice()
        .sort((a, b) => b.memberCount - a.memberCount)
        .slice(0, 3),
    [filtered],
  );

  const regular = useMemo(() => {
    if (mode === "mine") return filtered;
    const featuredIds = new Set(featured.map((trip) => trip.id));
    return filtered.filter((trip) => !featuredIds.has(trip.id));
  }, [featured, filtered, mode]);

  async function quickJoin(trip: TripWebRecord) {
    if (
      joiningTripId ||
      trip.createdByMe ||
      trip.joined ||
      joinSentIds.has(trip.id) ||
      !trip.membershipOpen ||
      (trip.capacity > 0 && trip.memberCount >= trip.capacity)
    ) {
      return;
    }

    setJoiningTripId(trip.id);
    setJoinError("");

    try {
      await requestToJoinTripWeb(trip, "");
      setJoinSentIds((current) => {
        const next = new Set(current);
        next.add(trip.id);
        return next;
      });
      await load(true);
    } catch (cause) {
      setJoinError(
        cause instanceof Error && cause.message
          ? cause.message
          : copy.joinError,
      );
    } finally {
      setJoiningTripId("");
    }
  }

  function selectCategory(nextCategory: string) {
    setCategory(nextCategory);
    setSelectedProvince("");
    setCategoryQuery("");
  }

  function resetFilters() {
    setSelectedProvince("");
    setCategoryQuery("");
  }

  useEffect(() => {
    function isInteractiveTarget(target: EventTarget | null) {
      if (!(target instanceof Element)) return false;
      return Boolean(
        target.closest(
          "a,button,input,textarea,select,label,[role=button],[contenteditable=true]",
        ),
      );
    }

    function onPointerDown(event: PointerEvent) {
      if (event.button !== 0 || window.scrollY > 2 || isInteractiveTarget(event.target)) {
        return;
      }
      pullStartRef.current = event.clientY;
      pullPointerRef.current = event.pointerId;
      setPullDistance(0);
    }

    function onPointerMove(event: PointerEvent) {
      if (
        pullStartRef.current === null ||
        pullPointerRef.current !== event.pointerId ||
        window.scrollY > 2
      ) {
        return;
      }

      const distance = Math.max(0, event.clientY - pullStartRef.current);
      if (!distance) {
        setPullDistance(0);
        return;
      }

      const resisted = Math.min(112, distance * 0.52);
      pullDistanceRef.current = resisted;
      setPullDistance(resisted);

      if (distance > 10) {
        event.preventDefault();
      }
    }

    function finishPull(event?: PointerEvent) {
      if (
        event &&
        pullPointerRef.current !== null &&
        event.pointerId !== pullPointerRef.current
      ) {
        return;
      }

      const shouldRefresh = pullDistanceRef.current >= 72 && !refreshing;
      pullStartRef.current = null;
      pullPointerRef.current = null;
      pullDistanceRef.current = 0;
      setPullDistance(0);

      if (shouldRefresh) {
        void load(true);
      }
    }

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", finishPull);
    window.addEventListener("pointercancel", finishPull);

    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", finishPull);
      window.removeEventListener("pointercancel", finishPull);
    };
  }, [refreshing, countryScope, locale]);

  return (
    <main className={styles.page}>
      <Header />

      {(pullDistance > 0 || refreshing) ? (
        <div
          className={`${styles.pullRefresh} ${
            pullDistance >= 72 ? styles.pullRefreshReady : ""
          } ${refreshing ? styles.pullRefreshLoading : ""}`}
          style={{ transform: `translate(-50%, ${Math.max(-54, pullDistance - 54)}px)` }}
          aria-hidden="true"
        >
          <span>↻</span>
        </div>
      ) : null}

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
              onClick={() => router.push("/create-trip")}
            >
              ＋ {copy.create}
            </button>
          </div>
        </header>

        {joinError ? (
          <div className={styles.inlineJoinError}>{joinError}</div>
        ) : null}

        <section className={styles.categoryBrowser} aria-label={(TRIP_FILTER_COPY[locale] ?? TRIP_FILTER_COPY.en).categoriesTitle}>
          <div className={styles.categoryBrowserHeader}>
            <div>
              <strong>{(TRIP_FILTER_COPY[locale] ?? TRIP_FILTER_COPY.en).categoriesTitle}</strong>
              <p>{(TRIP_FILTER_COPY[locale] ?? TRIP_FILTER_COPY.en).categoriesHint}</p>
            </div>
            <button type="button" className={!category ? styles.categoryAllActive : styles.categoryAllButton} onClick={() => selectCategory("")}>
              {copy.all}
            </button>
          </div>
          <div className={styles.desktopCategoryGrid}>
            {CATEGORY_ORDER.map((item) => (
              <button type="button" key={item} className={`${styles.categoryTile} ${category === item ? styles.categoryTileActive : ""}`} onClick={() => selectCategory(item)}>
                <span className={styles.categoryTileIcon} style={{ background: TRIP_CATEGORY_META[item].accent }}>{TRIP_CATEGORY_META[item].icon}</span>
                <strong>{categoryLabel(item, copy, locale)}</strong>
              </button>
            ))}
          </div>
          <div className={styles.mobileCategoryGrid}>
            {CATEGORY_ORDER.map((item) => (
              <button type="button" key={item} className={`${styles.mobileCategoryButton} ${category === item ? styles.mobileCategoryButtonActive : ""}`} onClick={() => selectCategory(item)}>
                <span className={styles.mobileCategoryIcon} style={{ background: TRIP_CATEGORY_META[item].accent }}>{TRIP_CATEGORY_META[item].icon}</span>
                <strong>{categoryLabel(item, copy, locale)}</strong>
              </button>
            ))}
          </div>
        </section>

        {category ? (() => {
          const filterCopy = TRIP_FILTER_COPY[locale] ?? TRIP_FILTER_COPY.en;
          return (
            <section className={styles.categorySearchPanel}>
              <div className={styles.categorySearchHeading}>
                <span className={styles.categorySearchIcon} style={{ background: TRIP_CATEGORY_META[category]?.accent }}>{TRIP_CATEGORY_META[category]?.icon}</span>
                <div>
                  <small>{filterCopy.searchTitle}</small>
                  <h2>{categoryLabel(category, copy, locale)}</h2>
                  <p>{filterCopy.searchHint}</p>
                </div>
                <strong className={styles.categorySearchCount}>{filterCopy.results(filtered.length)}</strong>
              </div>
              <div className={styles.categorySearchFilters}>
                <label>
                  <span>{filterCopy.province}</span>
                  <select
                    value={selectedProvince}
                    disabled={!provinceOptions.length}
                    onChange={(event) => setSelectedProvince(event.target.value)}
                  >
                    <option value="">{filterCopy.allProvince}</option>
                    {provinceOptions.map((province) => (
                      <option value={province.value} key={province.code}>
                        {getMasterLocationLabel(province, locale)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={styles.categorySearchKeyword}>
                  <span>{filterCopy.keyword}</span>
                  <input value={categoryQuery} onChange={(event) => setCategoryQuery(event.target.value)} placeholder={filterCopy.keyword} />
                </label>
                <button type="button" className={styles.categorySearchClear} disabled={!selectedProvince && !categoryQuery.trim()} onClick={resetFilters}>
                  {filterCopy.clear}
                </button>
              </div>
            </section>
          );
        })() : null}

        {loading ? (
          <div className={styles.state}>{copy.loading}</div>
        ) : error ? (
          <div className={styles.state}>
            <strong>{error}</strong>
            <button type="button" onClick={() => void load()}>{copy.refresh}</button>
          </div>
        ) : !filtered.length ? (
          <div className={styles.state}>
            <strong>{mode === "mine" ? copy.noMine : copy.noTrips}</strong>
            {category ? (
              <button type="button" onClick={() => selectCategory("")}>{copy.clear}</button>
            ) : null}
          </div>
        ) : (
          <>
            {mode === "discover" && featured.length ? (
              <section className={styles.section}>
                <div className={styles.sectionHead}>
                  <h2>{copy.featured}</h2>
                </div>

                <div className={styles.tripGrid}>
                  {featured.map((trip) => (
                    <TripCard
                      key={trip.id}
                      trip={trip}
                      locale={locale}
                      copy={copy}
                      joining={joiningTripId === trip.id}
                      joinSent={joinSentIds.has(trip.id)}
                      onJoin={() => void quickJoin(trip)}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            {(mode === "mine" ? filtered : regular).length ? (
              <section className={styles.section}>
                <div className={styles.sectionHead}>
                  <h2>{mode === "mine" ? copy.mine : copy.allTrips}</h2>
                  <span>{(mode === "mine" ? filtered : regular).length}</span>
                </div>

                <div className={styles.tripGrid}>
                  {(mode === "mine" ? filtered : regular).map((trip) => (
                    <TripCard
                      key={trip.id}
                      trip={trip}
                      locale={locale}
                      copy={copy}
                      joining={joiningTripId === trip.id}
                      joinSent={joinSentIds.has(trip.id)}
                      onJoin={() => void quickJoin(trip)}
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

function participantStatus(trip: TripWebRecord, copy: any) {
  if (trip.createdByMe) return copy.owner;
  if (trip.joined) return copy.joined;
  if (trip.capacity > 0 && trip.memberCount >= trip.capacity) return copy.full;
  return "";
}

function joinButtonLabel({
  trip,
  copy,
  joining,
  joinSent,
}: {
  trip: TripWebRecord;
  copy: any;
  joining: boolean;
  joinSent: boolean;
}) {
  if (trip.createdByMe) return copy.owner;
  if (trip.joined) return copy.joined;
  if (joinSent) return copy.joinSent;
  if (trip.capacity > 0 && trip.memberCount >= trip.capacity) return copy.full;
  if (!trip.membershipOpen) return copy.closed;
  if (joining) return copy.joining;
  return copy.joinNow;
}

function TripCard({
  trip,
  locale,
  copy,
  joining,
  joinSent,
  onJoin,
}: {
  trip: TripWebRecord;
  locale: string;
  copy: any;
  joining: boolean;
  joinSent: boolean;
  onJoin: () => void;
}) {
  const remaining =
    trip.capacity > 0 ? Math.max(0, trip.capacity - trip.memberCount) : null;
  const progress =
    trip.capacity > 0
      ? Math.min(100, Math.round((trip.memberCount / trip.capacity) * 100))
      : 0;
  const joinDisabled =
    joining ||
    joinSent ||
    trip.createdByMe ||
    trip.joined ||
    !trip.membershipOpen ||
    (trip.capacity > 0 && trip.memberCount >= trip.capacity);

  return (
    <article className={styles.tripCard}>
      <Link href={`/trips/${trip.id}`} className={styles.tripMainLink}>
        <div className={styles.tripImage}>
          {trip.imageUrl ? (
            <img src={trip.imageUrl} alt="" />
          ) : (
            <div className={styles.imageFallback}>✈</div>
          )}

          <div className={styles.cardBadges}>
            {trip.category ? <span>{categoryLabel(trip.category, copy, locale)}</span> : null}
            {trip.createdByMe ? (
              <span className={styles.ownerBadge}>{copy.owner}</span>
            ) : trip.joined ? (
              <span className={styles.joinedBadge}>{copy.joined}</span>
            ) : null}
          </div>

          <div className={styles.participantHeroSmall}>
            <strong>{trip.memberCount}{trip.capacity ? `/${trip.capacity}` : ""}</strong>
            <span>{copy.participants}</span>
          </div>
        </div>

        <div className={styles.tripBody}>
          <div className={styles.tripTitleLine}>
            <strong>{trip.title}</strong>
            <span>{statusLabel(trip, copy)}</span>
          </div>

          <div className={styles.routeLine}>
            <span>✈</span>
            <strong>{trip.startPoint || "—"} → {trip.destination || "—"}</strong>
          </div>

          <div className={styles.tripDateHighlight}>
            <span className={styles.tripDateIcon} aria-hidden="true"><i /><b>◷</b></span>
            <div>
              <small>{copy.travelDate}</small>
              <strong>{formatDateRange(trip.startDate, trip.endDate, locale)}</strong>
            </div>
          </div>

          <div className={styles.tripBudgetLine}>
            <span>฿</span>
            <strong>
              {trip.budgetPerPerson != null
                ? `${trip.budgetPerPerson.toLocaleString(localeTag(locale))} THB`
                : copy.freeBudget}
            </strong>
          </div>

          {trip.capacity > 0 ? (
            <div className={styles.participantProgressCompact}>
              <div>
                <span>{copy.participants}</span>
                <strong>{remaining} {copy.spotsLeft}</strong>
              </div>
              <i><b style={{ width: `${progress}%` }} /></i>
            </div>
          ) : null}
        </div>
      </Link>

      <div className={styles.tripCardFooter}>
        <Link href={`/users/${trip.organizerId}`} className={styles.featuredOrganizer}>
          <VerifiedUserAvatar userId={trip.organizerId} name={trip.organizerName} src={trip.organizerPhotoUrl} country={trip.country} badgeSize={15} alt="" />
          <div>
            <small>{copy.organizer}</small>
            <strong>{trip.organizerName}</strong>
          </div>
        </Link>

        <button
          type="button"
          className={styles.quickJoinButton}
          disabled={joinDisabled}
          onClick={onJoin}
        >
          {joinButtonLabel({ trip, copy, joining, joinSent })}
        </button>
      </div>
    </article>
  );
}

