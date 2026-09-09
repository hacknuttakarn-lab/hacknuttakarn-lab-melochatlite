"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { useLocale } from "@/components/SiteProviders";
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
  const [category, setCategory] = useState("");
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

  const categories = useMemo(
    () => [...new Set(events.map((event) => event.category).filter(Boolean))],
    [events],
  );

  const filtered = useMemo(
    () =>
      events.filter((event) => {
        if (mode === "mine" && !event.joined && !event.createdByMe) return false;
        if (category && event.category !== category) return false;
        return true;
      }),
    [category, events, mode],
  );

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

        <div className={styles.categoryRail}>
          <button
            type="button"
            className={!category ? styles.categoryActive : ""}
            onClick={() => setCategory("")}
          >
            {copy.all}
          </button>
          {categories.map((item) => (
            <button
              type="button"
              key={item}
              className={category === item ? styles.categoryActive : ""}
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>

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
          {event.imageUrl ? <img src={event.imageUrl} alt="" /> : <div className={styles.fallback}>◉</div>}
          <div className={styles.badges}>
            {event.category ? <span>{event.category}</span> : null}
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
