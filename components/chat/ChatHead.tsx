"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocale } from "@/components/SiteProviders";
import { loadChatSnapshot, type ChatCategory, type ChatRoom, type ChatSnapshot } from "./chatData";
import styles from "./ChatHead.module.css";
import VerifiedUserAvatar from "@/components/profile/VerifiedUserAvatar";

const EMPTY: ChatSnapshot = {
  rooms: { direct: [], trip: [], event: [], community: [] },
  counts: { direct: 0, trip: 0, event: 0, community: 0 },
  totalUnread: 0,
};

const COPY = {
  th: { chat: "แชท", choose: "เลือกประเภทแชท", direct: "ข้อความ", trip: "ทริป", event: "อีเวนต์", community: "คอมมูนิตี้", back: "ประเภทแชท", empty: "ยังไม่มีห้องแชทในหมวดนี้", all: "เปิดศูนย์แชท", unread: "ข้อความที่ยังไม่ได้อ่าน" },
  en: { chat: "Chat", choose: "Choose chat type", direct: "Messages", trip: "Trips", event: "Events", community: "Community", back: "Chat types", empty: "No chats in this category yet", all: "Open Chat Center", unread: "unread messages" },
  de: { chat: "Chat", choose: "Chat-Typ wählen", direct: "Nachrichten", trip: "Reisen", event: "Events", community: "Community", back: "Chat-Typen", empty: "Noch keine Chats in dieser Kategorie", all: "Chat Center öffnen", unread: "ungelesene Nachrichten" },
  zh: { chat: "聊天", choose: "选择聊天类型", direct: "消息", trip: "旅行", event: "活动", community: "社区", back: "聊天类型", empty: "此分类暂无聊天", all: "打开聊天中心", unread: "条未读消息" },
  ja: { chat: "チャット", choose: "チャットの種類を選択", direct: "メッセージ", trip: "旅行", event: "イベント", community: "コミュニティ", back: "チャット種類", empty: "このカテゴリにはまだチャットがありません", all: "チャットセンターを開く", unread: "件の未読" },
  ko: { chat: "채팅", choose: "채팅 유형 선택", direct: "메시지", trip: "여행", event: "이벤트", community: "커뮤니티", back: "채팅 유형", empty: "이 카테고리에 채팅이 없습니다", all: "채팅 센터 열기", unread: "개의 읽지 않은 메시지" },
} as const;

const ICON: Record<ChatCategory, string> = { direct: "✉", trip: "🧭", event: "🎟", community: "◎" };

function formatTime(value: string, locale: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" }).format(date);
}

export function ChatHead() {
  const router = useRouter();
  const { locale } = useLocale();
  const t = COPY[locale] ?? COPY.en;
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<ChatCategory | null>(null);
  const [snapshot, setSnapshot] = useState<ChatSnapshot>(EMPTY);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  async function refresh(silent = false) {
    if (!silent) setLoading(true);
    try {
      setSnapshot(await loadChatSnapshot());
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    void refresh(true);
    const timer = window.setInterval(() => void refresh(true), 15000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!open) return;
    setCategory(null);
    void refresh();

    const close = (event: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", key);

    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", key);
    };
  }, [open]);

  const categories: ChatCategory[] = ["direct", "trip", "event", "community"];
  const roomList: ChatRoom[] = category ? snapshot.rooms[category] : [];

  const content = useMemo(() => (
    <div className={styles.wrap} ref={wrapRef}>
      <button
        type="button"
        className={`${styles.headButton} ${open ? styles.headButtonOpen : ""}`}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={t.chat}
        title={t.chat}
      >
        <span className={styles.bubbleIcon} aria-hidden="true">
          <svg viewBox="0 0 24 24" role="presentation">
            <path d="M4.2 5.8C4.2 4.25 5.46 3 7 3h10c1.54 0 2.8 1.25 2.8 2.8v7.45c0 1.55-1.26 2.8-2.8 2.8h-5.28l-4.66 3.44c-.72.53-1.74.02-1.74-.88v-2.74A2.79 2.79 0 0 1 4.2 13.25V5.8Z" />
            <circle cx="8.2" cy="9.7" r="1.05" />
            <circle cx="12" cy="9.7" r="1.05" />
            <circle cx="15.8" cy="9.7" r="1.05" />
          </svg>
        </span>
        <span className={styles.headLabel}>{t.chat}</span>
        {snapshot.totalUnread > 0 ? (
          <span className={styles.totalBadge}>{snapshot.totalUnread > 99 ? "99+" : snapshot.totalUnread}</span>
        ) : null}
      </button>

      {open ? (
        <div className={styles.panel}>
          <div className={styles.panelTop}>
            {category ? (
              <button type="button" className={styles.backButton} onClick={() => setCategory(null)}>
                ‹ {t.back}
              </button>
            ) : (
              <span>{t.choose}</span>
            )}
            {loading ? <i className={styles.spinner} /> : null}
          </div>

          {!category ? (
            <div className={styles.categoryGrid}>
              {categories.map((item) => (
                <button type="button" className={styles.categoryCard} key={item} onClick={() => setCategory(item)}>
                  <span className={styles.categoryIcon}>{ICON[item]}</span>
                  <span className={styles.categoryCopy}>
                    <strong>{t[item]}</strong>
                    <small>
                      {snapshot.counts[item]} {t.unread}
                    </small>
                  </span>
                  {snapshot.counts[item] > 0 ? (
                    <b>{snapshot.counts[item] > 99 ? "99+" : snapshot.counts[item]}</b>
                  ) : (
                    <b className={styles.zeroBadge}>0</b>
                  )}
                </button>
              ))}
            </div>
          ) : roomList.length ? (
            <div className={styles.roomList}>
              {roomList.map((room) => (
                <div
                  className={styles.roomRow}
                  key={`${room.category}-${room.id}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => { setOpen(false); router.push(room.href); }}
                  onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setOpen(false); router.push(room.href); } }}
                >
                  {room.category === "direct" && room.userId && !room.businessId ? (
                    <VerifiedUserAvatar userId={room.userId} name={room.title} src={room.avatarUrl} country={room.country} nationality={room.nationality} className={styles.verifiedRoomAvatar} shape="rounded" badgeSize={15} alt="" />
                  ) : (
                    <div className={styles.roomAvatar}>{room.avatarUrl ? <img src={room.avatarUrl} alt="" /> : <span>{ICON[room.category]}</span>}</div>
                  )}
                  <div className={styles.roomCopy}>
                    <div>
                      {room.category === "direct" && room.userId && !room.businessId ? (
                        <strong><Link href={`/users/${room.userId}`} className={styles.profileNameLink} onClick={(event) => { event.stopPropagation(); setOpen(false); }}>{room.title}</Link></strong>
                      ) : <strong>{room.title}</strong>}
                      <time>{formatTime(room.lastMessageAt, locale)}</time>
                    </div>
                    <p>{room.lastMessage || room.subtitle || t[room.category]}</p>
                  </div>
                  {room.unreadCount > 0 ? (
                    <span className={styles.roomBadge}>{room.unreadCount > 99 ? "99+" : room.unreadCount}</span>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.empty}>{t.empty}</div>
          )}

          <Link href={category ? `/chat?type=${category}` : "/chat"} className={styles.openCenter} onClick={() => setOpen(false)}>
            {t.all} →
          </Link>
        </div>
      ) : null}
    </div>
  ), [category, loading, locale, open, roomList, snapshot, t]);

  if (!mounted) return null;
  return createPortal(content, document.body);
}
