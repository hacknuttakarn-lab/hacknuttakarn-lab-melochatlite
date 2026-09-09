"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/Header";
import VerifiedUserAvatar from "@/components/profile/VerifiedUserAvatar";
import { useLocale } from "@/components/SiteProviders";
import {
  loadTravelPassportWeb,
  passportPhotoUrl,
  refreshMyTravelPassportWeb,
  saveTravelPassportPreferencesWeb,
  type TravelBadge,
  type TravelPassportSummary,
  type TravelStamp,
} from "./travelPassportWebData";
import styles from "./TravelPassportExperience.module.css";

type LocaleKey = "th" | "en" | "de" | "zh" | "ja" | "ko";

type TravelerLevel = {
  name: string;
  minXp: number;
  nextXp: number | null;
};

const LEVELS: TravelerLevel[] = [
  { name: "Traveler", minXp: 0, nextXp: 500 },
  { name: "Explorer", minXp: 500, nextXp: 1200 },
  { name: "Adventurer", minXp: 1200, nextXp: 2200 },
  { name: "Voyager", minXp: 2200, nextXp: 3600 },
  { name: "Globetrotter", minXp: 3600, nextXp: 5500 },
  { name: "World Explorer", minXp: 5500, nextXp: null },
];

const COPY = {
  th: {
    passport: "พาสปอร์ต & เหรียญตรา",
    travelPassport: "TRAVEL PASSPORT",
    holder: "ผู้ถือพาสปอร์ต",
    stamps: "ตราประทับ",
    countries: "ประเทศ",
    badges: "เหรียญ",
    level: "ระดับนักเดินทาง",
    xp: "Travel XP",
    nextLevel: "ระดับถัดไป",
    maxLevel: "ระดับสูงสุดแล้ว",
    destinations: "แผนที่การเดินทาง",
    destinationsSub: "ประเทศและเมืองที่บันทึกจากตราประทับของคุณ",
    noDestinations: "จุดหมายจะปรากฏเมื่อมีตราประทับการเดินทาง",
    completedTrips: "Trips ที่จบ",
    completedEvents: "Events ที่จบ",
    cities: "เมือง / พื้นที่",
    organizer: "ครั้งที่เป็นผู้จัด",
    passportStamps: "ตราประทับ Passport",
    passportStampsSub: "สร้างอัตโนมัติจาก Trip และ Event ที่จบแล้ว",
    noStamps: "ยังไม่มีตราประทับ",
    noStampsSub: "เมื่อ Trip หรือ Event ที่คุณเข้าร่วมจบลง ตราประทับจะปรากฏที่นี่",
    trip: "ทริป",
    event: "อีเวนต์",
    organizerRole: "ผู้จัด",
    participantRole: "ผู้เข้าร่วม",
    locationUnknown: "ไม่ระบุสถานที่",
    viewActivity: "ดูรายละเอียด",
    myBadges: "เหรียญตรา & Achievement",
    myBadgesSub: "สะสม Achievement จากประสบการณ์การเดินทางจริง",
    unlocked: "ปลดล็อกแล้ว",
    locked: "กำลังสะสม",
    noBadges: "ยังไม่มีเหรียญตรา",
    noBadgesSub: "Achievement จะปรากฏเมื่อระบบมีเงื่อนไขที่ตรงกับกิจกรรมของคุณ",
    nextAchievement: "Achievement ถัดไป",
    allUnlocked: "ปลดล็อกเหรียญปัจจุบันครบแล้ว",
    allUnlockedSub: "ออกเดินทางต่อเพื่อรอ Achievement ใหม่จาก Melo",
    remaining: "เหลืออีก",
    progress: "ความคืบหน้า",
    firstStamp: "ตราแรก",
    latestStamp: "ตราล่าสุด",
    privacy: "ความเป็นส่วนตัว",
    privacyTitle: "ตั้งค่าพาสปอร์ต",
    privacySub: "ควบคุมว่าผู้อื่นจะเห็นพาสปอร์ตและชื่อกิจกรรมได้หรือไม่",
    publicPassport: "แสดงพาสปอร์ตแบบสาธารณะ",
    publicPassportSub: "สมาชิกที่เข้าสู่ระบบสามารถดูสถิติ ตรา และเหรียญได้",
    showTitles: "แสดงชื่อ Trip และ Event",
    showTitlesSub: "เมื่อปิด ผู้ชมจะเห็นเฉพาะสถานที่และประเภทกิจกรรม",
    close: "ปิด",
    saving: "กำลังบันทึก...",
    refresh: "รีเฟรชพาสปอร์ต",
    refreshing: "กำลังอัปเดต...",
    preparing: "กำลังประทับตราพาสปอร์ต...",
    privateTitle: "พาสปอร์ตนี้เป็นส่วนตัว",
    privateSub: "เจ้าของพาสปอร์ตยังไม่ได้เปิดให้สมาชิกคนอื่นดู",
    unavailable: "เปิดพาสปอร์ตไม่ได้",
    retry: "ลองใหม่",
    backProfile: "กลับโปรไฟล์",
    passportNo: "PASSPORT NO.",
    statusPublic: "Public",
    statusPrivate: "Private",
  },
  en: {
    passport: "Passport & Badges", travelPassport: "TRAVEL PASSPORT", holder: "PASSPORT HOLDER",
    stamps: "Stamps", countries: "Countries", badges: "Badges", level: "Traveler level", xp: "Travel XP",
    nextLevel: "Next level", maxLevel: "Maximum level", destinations: "Travel map",
    destinationsSub: "Countries and cities collected from your passport stamps", noDestinations: "Destinations appear when you earn travel stamps.",
    completedTrips: "Completed Trips", completedEvents: "Completed Events", cities: "Cities / Areas", organizer: "Organizer roles",
    passportStamps: "Passport stamps", passportStampsSub: "Created automatically from completed Trips and Events.",
    noStamps: "No stamps yet", noStampsSub: "Stamps appear after a Trip or Event you joined is completed.",
    trip: "Trip", event: "Event", organizerRole: "Organizer", participantRole: "Participant", locationUnknown: "Location not provided", viewActivity: "View details",
    myBadges: "Badges & Achievements", myBadgesSub: "Collect achievements from real travel activity.", unlocked: "Unlocked", locked: "In progress",
    noBadges: "No badges yet", noBadgesSub: "Achievements appear when your activity meets a badge condition.",
    nextAchievement: "Next achievement", allUnlocked: "All current badges unlocked", allUnlockedSub: "Keep exploring and wait for new Melo achievements.",
    remaining: "Remaining", progress: "Progress", firstStamp: "First stamp", latestStamp: "Latest stamp",
    privacy: "Privacy", privacyTitle: "Passport settings", privacySub: "Control who can see your passport and activity titles.",
    publicPassport: "Public passport", publicPassportSub: "Signed-in members can see stats, stamps and badges.",
    showTitles: "Show Trip and Event titles", showTitlesSub: "When off, viewers see only locations and activity types.",
    close: "Close", saving: "Saving...", refresh: "Refresh passport", refreshing: "Updating...", preparing: "Preparing your passport...",
    privateTitle: "This passport is private", privateSub: "The passport owner has not made it visible to other members.", unavailable: "Passport unavailable", retry: "Try again", backProfile: "Back to profile",
    passportNo: "PASSPORT NO.", statusPublic: "Public", statusPrivate: "Private",
  },
  de: {
    passport: "Reisepass & Abzeichen", travelPassport: "TRAVEL PASSPORT", holder: "PASSINHABER",
    stamps: "Stempel", countries: "Länder", badges: "Abzeichen", level: "Reiselevel", xp: "Travel XP",
    nextLevel: "Nächstes Level", maxLevel: "Höchstes Level", destinations: "Reisekarte", destinationsSub: "Länder und Städte aus deinen Reisestempeln", noDestinations: "Reiseziele erscheinen, sobald du Stempel sammelst.",
    completedTrips: "Abgeschlossene Trips", completedEvents: "Abgeschlossene Events", cities: "Städte / Regionen", organizer: "Als Organisator",
    passportStamps: "Reisepass-Stempel", passportStampsSub: "Automatisch aus abgeschlossenen Trips und Events erstellt.", noStamps: "Noch keine Stempel", noStampsSub: "Nach einem abgeschlossenen Trip oder Event erscheint hier ein Stempel.",
    trip: "Trip", event: "Event", organizerRole: "Organisator", participantRole: "Teilnehmer", locationUnknown: "Kein Ort angegeben", viewActivity: "Details ansehen",
    myBadges: "Abzeichen & Erfolge", myBadgesSub: "Sammle Erfolge durch echte Reiseaktivitäten.", unlocked: "Freigeschaltet", locked: "In Arbeit", noBadges: "Noch keine Abzeichen", noBadgesSub: "Erfolge erscheinen, sobald deine Aktivität eine Bedingung erfüllt.",
    nextAchievement: "Nächster Erfolg", allUnlocked: "Alle aktuellen Abzeichen freigeschaltet", allUnlockedSub: "Entdecke weiter und warte auf neue Melo-Erfolge.", remaining: "Noch", progress: "Fortschritt", firstStamp: "Erster Stempel", latestStamp: "Letzter Stempel",
    privacy: "Privatsphäre", privacyTitle: "Reisepass-Einstellungen", privacySub: "Bestimme, wer deinen Reisepass und Aktivitätstitel sehen kann.", publicPassport: "Öffentlicher Reisepass", publicPassportSub: "Angemeldete Mitglieder können Statistiken, Stempel und Abzeichen sehen.", showTitles: "Trip- und Eventtitel anzeigen", showTitlesSub: "Wenn deaktiviert, sehen andere nur Ort und Aktivitätstyp.",
    close: "Schließen", saving: "Wird gespeichert...", refresh: "Reisepass aktualisieren", refreshing: "Wird aktualisiert...", preparing: "Reisepass wird vorbereitet...", privateTitle: "Dieser Reisepass ist privat", privateSub: "Der Besitzer hat den Reisepass noch nicht für andere freigegeben.", unavailable: "Reisepass nicht verfügbar", retry: "Erneut versuchen", backProfile: "Zurück zum Profil", passportNo: "PASSNUMMER", statusPublic: "Öffentlich", statusPrivate: "Privat",
  },
  zh: {
    passport: "护照与徽章", travelPassport: "TRAVEL PASSPORT", holder: "护照持有人", stamps: "印章", countries: "国家", badges: "徽章",
    level: "旅行等级", xp: "旅行 XP", nextLevel: "下一等级", maxLevel: "最高等级", destinations: "旅行地图", destinationsSub: "从护照印章中收集的国家与城市", noDestinations: "获得旅行印章后，目的地会显示在这里。",
    completedTrips: "已完成旅行", completedEvents: "已完成活动", cities: "城市 / 地区", organizer: "组织者次数",
    passportStamps: "护照印章", passportStampsSub: "由已完成的旅行和活动自动生成。", noStamps: "暂无印章", noStampsSub: "完成参加的旅行或活动后，印章会显示在这里。",
    trip: "旅行", event: "活动", organizerRole: "组织者", participantRole: "参与者", locationUnknown: "未提供地点", viewActivity: "查看详情",
    myBadges: "徽章与成就", myBadgesSub: "通过真实旅行活动收集成就。", unlocked: "已解锁", locked: "进行中", noBadges: "暂无徽章", noBadgesSub: "当活动满足条件时，成就会显示在这里。",
    nextAchievement: "下一个成就", allUnlocked: "当前徽章已全部解锁", allUnlockedSub: "继续探索，等待 Melo 的新成就。", remaining: "还差", progress: "进度", firstStamp: "第一枚印章", latestStamp: "最新印章",
    privacy: "隐私", privacyTitle: "护照设置", privacySub: "控制谁可以查看你的护照和活动名称。", publicPassport: "公开护照", publicPassportSub: "已登录成员可以查看统计、印章和徽章。", showTitles: "显示旅行和活动名称", showTitlesSub: "关闭后，其他人只能看到地点和活动类型。",
    close: "关闭", saving: "正在保存...", refresh: "刷新护照", refreshing: "正在更新...", preparing: "正在准备护照...", privateTitle: "此护照为私密", privateSub: "护照持有人尚未允许其他成员查看。", unavailable: "护照不可用", retry: "重试", backProfile: "返回资料", passportNo: "护照号码", statusPublic: "公开", statusPrivate: "私密",
  },
  ja: {
    passport: "パスポート & バッジ", travelPassport: "TRAVEL PASSPORT", holder: "パスポート所有者", stamps: "スタンプ", countries: "国", badges: "バッジ",
    level: "Traveler Level", xp: "Travel XP", nextLevel: "次のレベル", maxLevel: "最高レベル", destinations: "トラベルマップ", destinationsSub: "パスポートスタンプから集めた国と都市", noDestinations: "旅行スタンプを獲得すると目的地が表示されます。",
    completedTrips: "完了したTrip", completedEvents: "完了したEvent", cities: "都市 / エリア", organizer: "主催回数",
    passportStamps: "パスポートスタンプ", passportStampsSub: "完了したTripとEventから自動作成されます。", noStamps: "まだスタンプがありません", noStampsSub: "参加したTripまたはEventが終了するとスタンプが表示されます。",
    trip: "Trip", event: "Event", organizerRole: "主催者", participantRole: "参加者", locationUnknown: "場所未設定", viewActivity: "詳細を見る",
    myBadges: "バッジ & Achievement", myBadgesSub: "実際の旅行体験からAchievementを集めよう。", unlocked: "解除済み", locked: "進行中", noBadges: "まだバッジがありません", noBadgesSub: "条件を満たすとAchievementが表示されます。",
    nextAchievement: "次のAchievement", allUnlocked: "現在のバッジをすべて解除しました", allUnlockedSub: "旅を続けて新しいMelo Achievementを待ちましょう。", remaining: "あと", progress: "進捗", firstStamp: "最初のスタンプ", latestStamp: "最新スタンプ",
    privacy: "プライバシー", privacyTitle: "パスポート設定", privacySub: "パスポートとアクティビティ名の公開範囲を管理します。", publicPassport: "パスポートを公開", publicPassportSub: "ログイン中のメンバーが統計・スタンプ・バッジを閲覧できます。", showTitles: "Trip / Event名を表示", showTitlesSub: "オフの場合、場所とアクティビティ種別だけを表示します。",
    close: "閉じる", saving: "保存中...", refresh: "パスポートを更新", refreshing: "更新中...", preparing: "パスポートを準備中...", privateTitle: "このパスポートは非公開です", privateSub: "所有者はまだ他のメンバーに公開していません。", unavailable: "パスポートを開けません", retry: "再試行", backProfile: "プロフィールへ戻る", passportNo: "PASSPORT NO.", statusPublic: "公開", statusPrivate: "非公開",
  },
  ko: {
    passport: "패스포트 & 배지", travelPassport: "TRAVEL PASSPORT", holder: "패스포트 소유자", stamps: "스탬프", countries: "국가", badges: "배지",
    level: "여행자 레벨", xp: "Travel XP", nextLevel: "다음 레벨", maxLevel: "최고 레벨", destinations: "여행 지도", destinationsSub: "패스포트 스탬프로 기록된 국가와 도시", noDestinations: "여행 스탬프를 획득하면 목적지가 표시됩니다.",
    completedTrips: "완료한 여행", completedEvents: "완료한 이벤트", cities: "도시 / 지역", organizer: "주최 횟수",
    passportStamps: "패스포트 스탬프", passportStampsSub: "완료된 여행과 이벤트에서 자동으로 생성됩니다.", noStamps: "아직 스탬프가 없습니다", noStampsSub: "참여한 여행 또는 이벤트가 종료되면 스탬프가 표시됩니다.",
    trip: "여행", event: "이벤트", organizerRole: "주최자", participantRole: "참가자", locationUnknown: "위치 정보 없음", viewActivity: "상세 보기",
    myBadges: "배지 & Achievement", myBadgesSub: "실제 여행 활동으로 Achievement를 모아보세요.", unlocked: "잠금 해제", locked: "진행 중", noBadges: "아직 배지가 없습니다", noBadgesSub: "활동이 조건을 충족하면 Achievement가 표시됩니다.",
    nextAchievement: "다음 Achievement", allUnlocked: "현재 배지를 모두 잠금 해제했습니다", allUnlockedSub: "계속 여행하며 새로운 Melo Achievement를 기다려보세요.", remaining: "남음", progress: "진행률", firstStamp: "첫 스탬프", latestStamp: "최근 스탬프",
    privacy: "개인정보", privacyTitle: "패스포트 설정", privacySub: "패스포트와 활동 제목 공개 범위를 설정합니다.", publicPassport: "패스포트 공개", publicPassportSub: "로그인한 회원이 통계, 스탬프와 배지를 볼 수 있습니다.", showTitles: "여행 및 이벤트 제목 표시", showTitlesSub: "끄면 다른 사람에게 위치와 활동 유형만 표시됩니다.",
    close: "닫기", saving: "저장 중...", refresh: "패스포트 새로고침", refreshing: "업데이트 중...", preparing: "패스포트 준비 중...", privateTitle: "이 패스포트는 비공개입니다", privateSub: "소유자가 다른 회원에게 아직 공개하지 않았습니다.", unavailable: "패스포트를 열 수 없습니다", retry: "다시 시도", backProfile: "프로필로 돌아가기", passportNo: "PASSPORT NO.", statusPublic: "공개", statusPrivate: "비공개",
  },
} as const;

function travelerProgress(summary: TravelPassportSummary) {
  const xp = Math.max(
    0,
    summary.total_stamps * 100 +
      summary.city_count * 40 +
      summary.country_count * 200 +
      summary.unlocked_badges * 150,
  );

  let index = 0;
  LEVELS.forEach((level, levelIndex) => {
    if (xp >= level.minXp) index = levelIndex;
  });

  const level = LEVELS[index] ?? LEVELS[0];
  const progress =
    level.nextXp == null
      ? 1
      : Math.max(
          0,
          Math.min(1, (xp - level.minXp) / Math.max(1, level.nextXp - level.minXp)),
        );

  return {
    xp,
    level,
    levelNumber: index + 1,
    nextLevel: LEVELS[index + 1] ?? null,
    progress,
  };
}

function passportNumber(userId: string) {
  const compact = userId.replace(/-/g, "").toUpperCase();
  return compact ? `MELO-${compact.slice(0, 8)}` : "MELO-PASSPORT";
}

function unique(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const output: string[] = [];
  values.forEach((value) => {
    const clean = String(value ?? "").trim();
    if (!clean) return;
    const key = clean.toLocaleLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    output.push(clean);
  });
  return output;
}

function badgeText(badge: TravelBadge, locale: LocaleKey) {
  // Android currently stores dynamic badge copy in Thai + English only.
  // Keep that contract: Thai gets TH; all other app languages fall back to EN.
  if (locale === "th") {
    return { name: badge.name_th, description: badge.description_th };
  }
  return { name: badge.name_en, description: badge.description_en };
}

function dateLabel(value: string | null | undefined, locale: string) {
  if (!value) return "—";
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default function TravelPassportExperience({
  requestedUserId,
}: {
  requestedUserId?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const { locale } = useLocale();
  const lang = (locale in COPY ? locale : "en") as LocaleKey;
  const t = COPY[lang];
  const queryUserId = params.get("userId") || "";
  const targetUserId = requestedUserId || queryUserId || undefined;

  const [summary, setSummary] = useState<TravelPassportSummary | null>(null);
  const [stamps, setStamps] = useState<TravelStamp[]>([]);
  const [badges, setBadges] = useState<TravelBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fatalError, setFatalError] = useState("");
  const [toast, setToast] = useState("");
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [savingPrivacy, setSavingPrivacy] = useState(false);

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setFatalError("");

    try {
      const snapshot = await loadTravelPassportWeb(targetUserId);
      setSummary(snapshot.summary);
      setStamps(snapshot.stamps);
      setBadges(snapshot.badges);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      if (message === "AUTH_REQUIRED") {
        router.replace("/login");
        return;
      }
      setFatalError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void load();
  }, [targetUserId]);

  const unlockedBadges = useMemo(
    () => badges.filter((badge) => badge.unlocked),
    [badges],
  );
  const countries = useMemo(() => unique(stamps.map((stamp) => stamp.country)), [stamps]);
  const cities = useMemo(() => unique(stamps.map((stamp) => stamp.city)), [stamps]);
  const travelLevel = useMemo(() => (summary ? travelerProgress(summary) : null), [summary]);
  const nextBadge = useMemo(() => {
    const locked = badges.filter((badge) => !badge.unlocked);
    return [...locked].sort((a, b) => {
      const aProgress = a.target_value > 0 ? a.progress_value / a.target_value : 0;
      const bProgress = b.target_value > 0 ? b.progress_value / b.target_value : 0;
      if (bProgress !== aProgress) return bProgress - aProgress;
      return a.sort_order - b.sort_order;
    })[0] ?? null;
  }, [badges]);

  async function refreshPassport() {
    if (!summary?.is_owner || refreshing) return;
    setRefreshing(true);
    setToast("");
    try {
      const snapshot = await loadTravelPassportWeb(summary.user_id);
      setSummary(snapshot.summary);
      setStamps(snapshot.stamps);
      setBadges(snapshot.badges);
    } catch (cause) {
      setToast(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setRefreshing(false);
    }
  }

  async function setPreference(next: Partial<Pick<TravelPassportSummary, "is_public" | "show_activity_titles">>) {
    if (!summary?.is_owner || savingPrivacy) return;
    const previous = summary;
    const isPublic = next.is_public ?? summary.is_public;
    const showTitles = next.show_activity_titles ?? summary.show_activity_titles;
    setSummary({ ...summary, is_public: isPublic, show_activity_titles: showTitles });
    setSavingPrivacy(true);

    try {
      await saveTravelPassportPreferencesWeb({
        isPublic,
        showActivityTitles: showTitles,
      });
    } catch (cause) {
      setSummary(previous);
      setToast(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSavingPrivacy(false);
    }
  }

  if (loading) {
    return (
      <main className={styles.page}>
        <Header />
        <div className={styles.loadingState}>
          <span className={styles.spinner} />
          <strong>{t.preparing}</strong>
        </div>
      </main>
    );
  }

  if (!summary || fatalError) {
    return (
      <main className={styles.page}>
        <Header />
        <section className={styles.unavailable}>
          <div className={styles.unavailableIcon}>◎</div>
          <h1>{fatalError ? t.unavailable : t.privateTitle}</h1>
          <p>{fatalError || t.privateSub}</p>
          <div className={styles.unavailableActions}>
            <button type="button" onClick={() => void load()}>{t.retry}</button>
            <Link href="/profile">{t.backProfile}</Link>
          </div>
        </section>
      </main>
    );
  }

  const photo = passportPhotoUrl(summary.photo_path);
  const profileHref = summary.is_owner ? "/profile" : `/users/${summary.user_id}`;

  return (
    <main className={styles.page}>
      <Header />
      {toast ? <div className={styles.toast}>{toast}</div> : null}

      <section className={styles.shell}>
        <div className={styles.topActions}>
          <Link href={profileHref}>← {t.backProfile}</Link>
          <div>
            {summary.is_owner ? (
              <button type="button" className={styles.secondaryButton} onClick={() => setPrivacyOpen(true)}>
                ◉ {t.privacy}
              </button>
            ) : null}
            {summary.is_owner ? (
              <button type="button" className={styles.primaryButton} onClick={() => void refreshPassport()} disabled={refreshing}>
                ↻ {refreshing ? t.refreshing : t.refresh}
              </button>
            ) : null}
          </div>
        </div>

        <section className={styles.heroGrid}>
          <article className={styles.passportCover}>
            <div className={styles.glowA} />
            <div className={styles.glowB} />
            <header className={styles.passportBrand}>
              <div>
                <span>MELO CHAT</span>
                <strong>{t.travelPassport}</strong>
              </div>
              <div className={styles.globe}>◎</div>
            </header>

            <div className={styles.identity}>
              <Link href={profileHref} className={styles.avatarWrap}>
                <VerifiedUserAvatar userId={summary.user_id} name={summary.display_name} src={photo} className={styles.passportVerifiedAvatar} badgeSize={20} alt="" />
              </Link>
              <div>
                <small>{t.holder}</small>
                <h1>{summary.display_name}</h1>
                <p><b>{t.passportNo}</b> {passportNumber(summary.user_id)}</p>
                {travelLevel ? <em>{travelLevel.level.name} · LV.{travelLevel.levelNumber}</em> : null}
              </div>
              <span className={`${styles.publicPill} ${summary.is_public ? styles.public : styles.private}`}>
                {summary.is_public ? t.statusPublic : t.statusPrivate}
              </span>
            </div>

            <div className={styles.coverStats}>
              <CoverStat value={summary.total_stamps} label={t.stamps} />
              <CoverStat value={summary.country_count} label={t.countries} />
              <CoverStat value={summary.unlocked_badges} label={t.badges} />
            </div>
          </article>

          <aside className={styles.heroSide}>
            {travelLevel ? (
              <article className={styles.levelCard}>
                <header>
                  <div className={styles.levelIcon}>✦</div>
                  <div><small>{t.level}</small><h2>{travelLevel.level.name}</h2></div>
                  <b>LV.{travelLevel.levelNumber}</b>
                </header>
                <div className={styles.levelMetric}><span>{t.xp}</span><strong>{travelLevel.xp.toLocaleString()}</strong></div>
                <div className={styles.progressTrack}><span style={{ width: `${Math.round(travelLevel.progress * 100)}%` }} /></div>
                <footer>
                  <span>{Math.round(travelLevel.progress * 100)}%</span>
                  <span>{travelLevel.nextLevel ? `${t.nextLevel}: ${travelLevel.nextLevel.name}` : t.maxLevel}</span>
                </footer>
              </article>
            ) : null}

            <NextAchievement badge={nextBadge} locale={lang} copy={t} />
          </aside>
        </section>

        <section className={styles.summaryGrid}>
          <SummaryStat symbol="✈" value={summary.trip_count} label={t.completedTrips} />
          <SummaryStat symbol="◇" value={summary.event_count} label={t.completedEvents} />
          <SummaryStat symbol="⌖" value={summary.city_count} label={t.cities} />
          <SummaryStat symbol="◎" value={summary.country_count} label={t.countries} />
          <SummaryStat symbol="★" value={summary.organizer_count} label={t.organizer} />
        </section>

        <section className={styles.mapCard}>
          <div className={styles.mapVisual} aria-hidden="true">
            <span className={styles.mapOrbitA} />
            <span className={styles.mapOrbitB} />
            <b>MELO</b>
          </div>
          <div className={styles.mapCopy}>
            <div className={styles.sectionHeadCompact}>
              <div><h2>{t.destinations}</h2><p>{t.destinationsSub}</p></div>
              <span>{countries.length} · {cities.length}</span>
            </div>
            {countries.length || cities.length ? (
              <div className={styles.destinationGroups}>
                <div className={styles.destinationGroup}>
                  {countries.slice(0, 12).map((country) => <span key={`country-${country}`}>◎ {country}</span>)}
                </div>
                <div className={`${styles.destinationGroup} ${styles.cityGroup}`}>
                  {cities.slice(0, 12).map((city) => <span key={`city-${city}`}>⌖ {city}</span>)}
                </div>
              </div>
            ) : <div className={styles.mapEmpty}>{t.noDestinations}</div>}
          </div>
        </section>

        <section className={styles.contentGrid}>
          <div className={styles.mainColumn}>
            <section className={styles.panel}>
              <SectionHead title={t.passportStamps} subtitle={t.passportStampsSub} count={stamps.length} />
              {stamps.length ? (
                <div className={styles.stampList}>
                  {stamps.map((stamp) => <StampCard key={stamp.id} stamp={stamp} locale={lang} copy={t} />)}
                </div>
              ) : (
                <Empty symbol="◎" title={t.noStamps} body={t.noStampsSub} />
              )}
            </section>
          </div>

          <aside className={styles.sideColumn}>
            <section className={styles.panel}>
              <SectionHead title={t.myBadges} subtitle={t.myBadgesSub} count={`${unlockedBadges.length}/${badges.length}`} />
              {badges.length ? (
                <div className={styles.badgeGrid}>
                  {badges.map((badge) => <BadgeCard key={badge.code} badge={badge} locale={lang} copy={t} />)}
                </div>
              ) : (
                <Empty symbol="☆" title={t.noBadges} body={t.noBadgesSub} />
              )}
            </section>

            <section className={styles.timelineSummary}>
              <div><small>{t.firstStamp}</small><strong>{dateLabel(summary.first_stamp_on, lang)}</strong></div>
              <div><small>{t.latestStamp}</small><strong>{dateLabel(summary.latest_stamp_on, lang)}</strong></div>
            </section>
          </aside>
        </section>
      </section>

      {privacyOpen ? (
        <div className={styles.modalBackdrop} onMouseDown={() => setPrivacyOpen(false)}>
          <section className={styles.privacyModal} onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <div><span>◉</span><div><h2>{t.privacyTitle}</h2><p>{t.privacySub}</p></div></div>
              <button type="button" onClick={() => setPrivacyOpen(false)}>×</button>
            </header>

            <PreferenceRow
              title={t.publicPassport}
              subtitle={t.publicPassportSub}
              checked={summary.is_public}
              disabled={savingPrivacy}
              onChange={(checked) => void setPreference({ is_public: checked })}
            />
            <PreferenceRow
              title={t.showTitles}
              subtitle={t.showTitlesSub}
              checked={summary.show_activity_titles}
              disabled={savingPrivacy || !summary.is_public}
              onChange={(checked) => void setPreference({ show_activity_titles: checked })}
            />

            <footer>
              <span>{savingPrivacy ? t.saving : ""}</span>
              <button type="button" onClick={() => setPrivacyOpen(false)}>{t.close}</button>
            </footer>
          </section>
        </div>
      ) : null}
    </main>
  );
}

function CoverStat({ value, label }: { value: number; label: string }) {
  return <div><strong>{value}</strong><span>{label}</span></div>;
}

function SummaryStat({ symbol, value, label }: { symbol: string; value: number; label: string }) {
  return <article className={styles.summaryStat}><span>{symbol}</span><div><strong>{value}</strong><small>{label}</small></div></article>;
}

function SectionHead({ title, subtitle, count }: { title: string; subtitle: string; count: string | number }) {
  return <header className={styles.sectionHead}><div><h2>{title}</h2><p>{subtitle}</p></div><span>{count}</span></header>;
}

function StampCard({ stamp, locale, copy }: { stamp: TravelStamp; locale: LocaleKey; copy: any }) {
  const isTrip = stamp.source_type === "trip";
  const href = isTrip ? `/trips/${stamp.source_id}` : `/events/${stamp.source_id}`;
  const location = [stamp.place_label, stamp.city, stamp.country].filter(Boolean).join(" · ") || copy.locationUnknown;
  return (
    <Link href={href} className={styles.stampCard}>
      <div className={`${styles.stampSeal} ${isTrip ? styles.tripSeal : styles.eventSeal}`}>
        <b>{isTrip ? "✈" : "◇"}</b><small>{isTrip ? "TRIP" : "EVENT"}</small>
      </div>
      <div className={styles.stampCopy}>
        <div className={styles.stampTop}><strong>{stamp.title || (isTrip ? copy.trip : copy.event)}</strong><time>{dateLabel(stamp.visited_on, locale)}</time></div>
        <p>{location}</p>
        <div className={styles.stampMeta}><span>{stamp.category || (isTrip ? copy.trip : copy.event)}</span><b>{stamp.role === "organizer" ? copy.organizerRole : copy.participantRole}</b></div>
      </div>
      <span className={styles.stampArrow}>{copy.viewActivity} ›</span>
    </Link>
  );
}

function BadgeCard({ badge, locale, copy }: { badge: TravelBadge; locale: LocaleKey; copy: any }) {
  const progress = Math.min(1, badge.target_value > 0 ? badge.progress_value / badge.target_value : 0);
  const content = badgeText(badge, locale);
  return (
    <article className={`${styles.badgeCard} ${badge.unlocked ? styles.badgeUnlocked : ""}`}>
      <div className={styles.badgeIcon}>{badge.icon || "☆"}{badge.unlocked ? <i>✓</i> : null}</div>
      <strong>{content.name}</strong>
      <p>{content.description}</p>
      <div className={styles.badgeProgress}><span style={{ width: `${Math.round(progress * 100)}%` }} /></div>
      <footer><span>{badge.unlocked ? copy.unlocked : copy.locked}</span><b>{badge.unlocked ? "100%" : `${Math.min(badge.progress_value, badge.target_value)}/${badge.target_value}`}</b></footer>
    </article>
  );
}

function NextAchievement({ badge, locale, copy }: { badge: TravelBadge | null; locale: LocaleKey; copy: any }) {
  if (!badge) {
    return <article className={styles.nextCard}><div className={styles.nextIcon}>★</div><div><small>{copy.nextAchievement}</small><h3>{copy.allUnlocked}</h3><p>{copy.allUnlockedSub}</p></div></article>;
  }
  const content = badgeText(badge, locale);
  const progress = Math.min(1, badge.target_value > 0 ? badge.progress_value / badge.target_value : 0);
  const remaining = Math.max(0, badge.target_value - badge.progress_value);
  return (
    <article className={styles.nextCard}>
      <div className={styles.nextIcon}>{badge.icon || "☆"}</div>
      <div className={styles.nextCopy}>
        <small>{copy.nextAchievement}</small>
        <h3>{content.name}</h3>
        <p>{content.description}</p>
        <div className={styles.nextProgress}><span style={{ width: `${Math.round(progress * 100)}%` }} /></div>
        <footer><span>{copy.remaining}: {remaining}</span><b>{Math.min(badge.progress_value, badge.target_value)}/{badge.target_value}</b></footer>
      </div>
    </article>
  );
}

function PreferenceRow({ title, subtitle, checked, disabled, onChange }: { title: string; subtitle: string; checked: boolean; disabled?: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className={`${styles.preferenceRow} ${disabled ? styles.preferenceDisabled : ""}`}>
      <div><strong>{title}</strong><small>{subtitle}</small></div>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
      <span className={styles.switch}><i /></span>
    </label>
  );
}

function Empty({ symbol, title, body }: { symbol: string; title: string; body: string }) {
  return <div className={styles.empty}><span>{symbol}</span><strong>{title}</strong><p>{body}</p></div>;
}
