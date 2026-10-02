"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/Header";
import { useLocale } from "@/components/SiteProviders";
import { ChatConversationPane } from "./ChatConversationPane";
import { canCurrentUserUseChat, loadChatSnapshot, type ChatCategory, type ChatRoom, type ChatSnapshot } from "./chatData";
import styles from "./ChatCenter.module.css";
import VerifiedUserAvatar from "@/components/profile/VerifiedUserAvatar";

const TRANSLATION_STORAGE_KEY = "melo-chat-translation-enabled";

const EMPTY: ChatSnapshot = {
  rooms: { direct: [], trip: [], event: [], community: [] },
  counts: { direct: 0, trip: 0, event: 0, community: 0 },
  totalUnread: 0,
};

const ICON: Record<ChatCategory, string> = {
  direct: "✉",
  trip: "🧭",
  event: "🎟",
  community: "◎",
};

const COPY = {
  th: {
    title: "แชท",
    direct: "ข้อความ",
    trip: "ทริป",
    event: "อีเวนต์",
    community: "คอมมูนิตี้",
    rooms: "รายการแชท",
    unread: "ยังไม่ได้อ่าน",
    empty: "ยังไม่มีแชทในหมวดนี้",
    refresh: "รีเฟรช",
    loading: "กำลังโหลดรายการแชท…",
    translation: "แปลข้อความ",
    translationOn: "เปิด",
    translationOff: "ปิด",
    lockedTitle: "แชทสำหรับสมาชิก Premium",
    lockedBody: "แพ็กเกจ Free รับได้เฉพาะการแจ้งเตือนว่ามีข้อความใหม่ แต่ไม่สามารถเปิดอ่านข้อความหรือใช้งานแชทได้",
    upgrade: "ดูแพ็กเกจ Premium",
  },
  en: {
    title: "Chats",
    direct: "Messages",
    trip: "Trips",
    event: "Events",
    community: "Community",
    rooms: "Chat list",
    unread: "unread",
    empty: "No chats in this category yet",
    refresh: "Refresh",
    loading: "Loading chats…",
    translation: "Translation",
    translationOn: "On",
    translationOff: "Off",
    lockedTitle: "Chat is a Premium feature",
    lockedBody: "Free members only receive a generic new-message alert and cannot open message content or use chat.",
    upgrade: "View Premium plans",
  },
  de: {
    title: "Chats",
    direct: "Nachrichten",
    trip: "Reisen",
    event: "Events",
    community: "Community",
    rooms: "Chatliste",
    unread: "ungelesen",
    empty: "Noch keine Chats in dieser Kategorie",
    refresh: "Aktualisieren",
    loading: "Chats werden geladen…",
    translation: "Übersetzung",
    translationOn: "Ein",
    translationOff: "Aus",
    lockedTitle: "Chat ist eine Premium-Funktion",
    lockedBody: "Free-Mitglieder erhalten nur einen allgemeinen Hinweis auf neue Nachrichten und können weder Inhalte öffnen noch den Chat nutzen.",
    upgrade: "Premium-Pakete ansehen",
  },
  zh: {
    title: "聊天",
    direct: "消息",
    trip: "旅行",
    event: "活动",
    community: "社区",
    rooms: "聊天列表",
    unread: "未读",
    empty: "此分类暂无聊天",
    refresh: "刷新",
    loading: "正在加载聊天…",
    translation: "翻译",
    translationOn: "开启",
    translationOff: "关闭",
    lockedTitle: "聊天为 Premium 功能",
    lockedBody: "Free 用户只能收到新消息提醒，无法查看消息内容或使用聊天。",
    upgrade: "查看 Premium 套餐",
  },
  ja: {
    title: "チャット",
    direct: "メッセージ",
    trip: "旅行",
    event: "イベント",
    community: "コミュニティ",
    rooms: "チャット一覧",
    unread: "未読",
    empty: "このカテゴリにはまだチャットがありません",
    refresh: "更新",
    loading: "チャットを読み込み中…",
    translation: "翻訳",
    translationOn: "オン",
    translationOff: "オフ",
    lockedTitle: "チャットは Premium 機能です",
    lockedBody: "Free 会員は新着通知のみ受け取れ、メッセージ内容の閲覧やチャット利用はできません。",
    upgrade: "Premium プランを見る",
  },
  ko: {
    title: "채팅",
    direct: "메시지",
    trip: "여행",
    event: "이벤트",
    community: "커뮤니티",
    rooms: "채팅 목록",
    unread: "읽지 않음",
    empty: "이 카테고리에 채팅이 없습니다",
    refresh: "새로고침",
    loading: "채팅 불러오는 중…",
    translation: "번역",
    translationOn: "켜짐",
    translationOff: "꺼짐",
    lockedTitle: "채팅은 Premium 기능입니다",
    lockedBody: "Free 회원은 새 메시지 알림만 받을 수 있으며 메시지 내용 확인이나 채팅 이용은 할 수 없습니다.",
    upgrade: "Premium 플랜 보기",
  },
} as const;

function validType(value: string | null): ChatCategory {
  return value === "trip" || value === "event" || value === "community" ? value : "direct";
}

function formatTime(value: string, locale: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(date);
}

function setChatUrl(category: ChatCategory, roomId = "") {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.set("type", category);
  if (roomId) url.searchParams.set("room", roomId);
  else url.searchParams.delete("room");
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}`);
}

export default function ChatCenter() {
  const { locale } = useLocale();
  const t = COPY[locale] ?? COPY.en;
  const params = useSearchParams();
  const initialCategory = validType(params.get("type"));
  const initialRoom = params.get("room") || "";
  const [category, setCategory] = useState<ChatCategory>(initialCategory);
  const [selectedRoomId, setSelectedRoomId] = useState(initialRoom);
  const [snapshot, setSnapshot] = useState<ChatSnapshot>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [translationEnabled, setTranslationEnabled] = useState(true);
  const [chatAllowed, setChatAllowed] = useState<boolean | null>(null);

  async function load() {
    setLoading(true);
    try {
      const next = await loadChatSnapshot();
      setSnapshot(next);
      window.dispatchEvent(new CustomEvent("melo-chat-unread-changed", { detail: { total: next.totalUnread } }));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    void canCurrentUserUseChat(true).then((allowed) => {
      if (!active) return;
      setChatAllowed(allowed);
      if (allowed) void load();
      else setLoading(false);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const saved = window.localStorage.getItem(TRANSLATION_STORAGE_KEY);
    if (saved === "off") setTranslationEnabled(false);
  }, []);

  function toggleTranslation() {
    setTranslationEnabled((current) => {
      const next = !current;
      window.localStorage.setItem(TRANSLATION_STORAGE_KEY, next ? "on" : "off");
      return next;
    });
  }

  const categories: ChatCategory[] = ["direct", "trip", "event", "community"];
  const rooms = snapshot.rooms[category];
  const selectedRoom = useMemo<ChatRoom | null>(
    () => rooms.find((room) => room.id === selectedRoomId) ?? null,
    [rooms, selectedRoomId],
  );

  useEffect(() => {
    if (!selectedRoomId || loading) return;
    const exists = rooms.some((room) => room.id === selectedRoomId);
    if (!exists) {
      setSelectedRoomId("");
      setChatUrl(category);
    }
  }, [category, loading, rooms, selectedRoomId]);

  function chooseCategory(next: ChatCategory) {
    setCategory(next);
    setSelectedRoomId("");
    setChatUrl(next);
  }

  function chooseRoom(room: ChatRoom) {
    setSelectedRoomId(room.id);
    setChatUrl(category, room.id);
  }

  return (
    <main className={styles.page}>
      <Header />
      <section className={styles.shell}>
        {chatAllowed !== true ? (
          <div className={styles.planLocked}>
            {chatAllowed === null ? (
              <span>{t.loading}</span>
            ) : (
              <>
                <div aria-hidden="true">✉</div>
                <strong>{t.lockedTitle}</strong>
                <p>{t.lockedBody}</p>
                <Link href="/premium">{t.upgrade}</Link>
              </>
            )}
          </div>
        ) : (
        <div className={styles.workspace}>
          <aside className={styles.categoryRail} aria-label={t.title}>
            <div className={styles.railTitle}>
              <span>MELO</span>
              <strong>{t.title}</strong>
            </div>
            <nav className={styles.categoryNav}>
              {categories.map((item) => (
                <button
                  type="button"
                  key={item}
                  className={category === item ? styles.categoryActive : ""}
                  onClick={() => chooseCategory(item)}
                >
                  <span>{ICON[item]}</span>
                  <strong>{t[item]}</strong>
                  {snapshot.counts[item] > 0 ? <b>{snapshot.counts[item] > 99 ? "99+" : snapshot.counts[item]}</b> : null}
                </button>
              ))}
            </nav>
            <div className={styles.railFooter}>
              <button
                type="button"
                className={`${styles.railTranslationToggle} ${translationEnabled ? styles.railTranslationToggleOn : ""}`}
                onClick={toggleTranslation}
                aria-pressed={translationEnabled}
                title={t.translation}
              >
                <span aria-hidden="true">🌐</span>
                <span>{t.translation}</span>
                <b>{translationEnabled ? t.translationOn : t.translationOff}</b>
              </button>
            </div>
          </aside>

          <section className={styles.roomPane}>
            <header className={styles.roomPaneHeader}>
              <div>
                <span>{t.rooms}</span>
                <strong>{t[category]}</strong>
              </div>
              <button type="button" onClick={() => void load()} disabled={loading} title={t.refresh} aria-label={t.refresh}>↻</button>
            </header>

            <div className={styles.roomList}>
              {loading ? (
                <div className={styles.roomState}>{t.loading}</div>
              ) : rooms.length ? (
                rooms.map((room) => (
                  <div
                    className={`${styles.roomRow} ${selectedRoomId === room.id ? styles.roomRowActive : ""}`}
                    key={`${room.category}-${room.id}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => chooseRoom(room)}
                    onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); chooseRoom(room); } }}
                  >
                    {room.category === "direct" && room.userId && !room.businessId ? (
                      <VerifiedUserAvatar userId={room.userId} name={room.title} src={room.avatarUrl} country={room.country} nationality={room.nationality} className={styles.avatar} shape="rounded" badgeSize={15} alt="" />
                    ) : (
                      <span className={styles.avatar}>{room.avatarUrl ? <img src={room.avatarUrl} alt="" /> : <b>{ICON[room.category]}</b>}</span>
                    )}
                    <span className={styles.roomCopy}>
                      <span>
                        {room.category === "direct" && room.userId && !room.businessId ? (
                          <strong><Link href={`/users/${room.userId}`} className={styles.profileNameLink} onClick={(event) => event.stopPropagation()}>{room.title}</Link></strong>
                        ) : <strong>{room.title}</strong>}
                        <time>{formatTime(room.lastMessageAt, locale)}</time>
                      </span>
                      <small>{room.lastMessage || room.subtitle || t[room.category]}</small>
                    </span>
                    {room.unreadCount > 0 ? <b className={styles.unreadBadge}>{room.unreadCount > 99 ? "99+" : room.unreadCount}</b> : null}
                  </div>
                ))
              ) : (
                <div className={styles.roomState}>{t.empty}</div>
              )}
            </div>
          </section>

          <ChatConversationPane room={selectedRoom} translationEnabled={translationEnabled} />
        </div>
        )}
      </section>
    </main>
  );
}
