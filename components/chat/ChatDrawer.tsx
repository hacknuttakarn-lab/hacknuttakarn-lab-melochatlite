"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLocale } from "@/components/SiteProviders";
import { ChatConversationPane } from "./ChatConversationPane";
import { ensureBusinessChatRoom, ensureDirectChatRoom, loadChatSnapshot, loadPartnerBusinessChatRooms, type ChatCategory, type ChatRoom, type ChatSnapshot } from "./chatData";
import styles from "./ChatDrawer.module.css";
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
    list: "รายการแชท",
    empty: "ยังไม่มีแชทในหมวดนี้",
    loading: "กำลังโหลดรายการแชท…",
    refresh: "รีเฟรช",
    close: "ปิดแชท",
    back: "กลับไปรายการแชท",
    translation: "แปลข้อความ",
    translationOn: "เปิด",
    translationOff: "ปิด",
    partnerTitle: "แชทร้านค้า",
    customer: "ลูกค้า Melo",
    searchCustomers: "ค้นหาชื่อลูกค้าที่เคยแชท",
  },
  en: {
    title: "Chats",
    direct: "Messages",
    trip: "Trips",
    event: "Events",
    community: "Community",
    list: "Chat list",
    empty: "No chats in this category yet",
    loading: "Loading chats…",
    refresh: "Refresh",
    close: "Close chats",
    back: "Back to chat list",
    translation: "Translation",
    translationOn: "On",
    translationOff: "Off",
    partnerTitle: "Partner chat",
    customer: "Melo customer",
    searchCustomers: "Search customer chats",
  },
  de: {
    title: "Chats",
    direct: "Nachrichten",
    trip: "Reisen",
    event: "Events",
    community: "Community",
    list: "Chatliste",
    empty: "Noch keine Chats in dieser Kategorie",
    loading: "Chats werden geladen…",
    refresh: "Aktualisieren",
    close: "Chats schließen",
    back: "Zurück zur Chatliste",
    translation: "Übersetzung",
    translationOn: "Ein",
    translationOff: "Aus",
    partnerTitle: "Partner-Chat",
    customer: "Melo-Kunde",
    searchCustomers: "Kundenchats durchsuchen",
  },
  zh: {
    title: "聊天",
    direct: "消息",
    trip: "旅行",
    event: "活动",
    community: "社区",
    list: "聊天列表",
    empty: "此分类暂无聊天",
    loading: "正在加载聊天…",
    refresh: "刷新",
    close: "关闭聊天",
    back: "返回聊天列表",
    translation: "翻译",
    translationOn: "开启",
    translationOff: "关闭",
    partnerTitle: "商家聊天",
    customer: "Melo 客户",
    searchCustomers: "搜索客户聊天",
  },
  ja: {
    title: "チャット",
    direct: "メッセージ",
    trip: "旅行",
    event: "イベント",
    community: "コミュニティ",
    list: "チャット一覧",
    empty: "このカテゴリにはまだチャットがありません",
    loading: "チャットを読み込み中…",
    refresh: "更新",
    close: "チャットを閉じる",
    back: "チャット一覧に戻る",
    translation: "翻訳",
    translationOn: "オン",
    translationOff: "オフ",
    partnerTitle: "Partnerチャット",
    customer: "Meloユーザー",
    searchCustomers: "顧客チャットを検索",
  },
  ko: {
    title: "채팅",
    direct: "메시지",
    trip: "여행",
    event: "이벤트",
    community: "커뮤니티",
    list: "채팅 목록",
    empty: "이 카테고리에 채팅이 없습니다",
    loading: "채팅 불러오는 중…",
    refresh: "새로고침",
    close: "채팅 닫기",
    back: "채팅 목록으로 돌아가기",
    translation: "번역",
    translationOn: "켜짐",
    translationOff: "꺼짐",
    partnerTitle: "파트너 채팅",
    customer: "Melo 고객",
    searchCustomers: "고객 채팅 검색",
  },
} as const;

function localeTag(locale: string) {
  return ({ th: "th-TH", en: "en-US", de: "de-DE", zh: "zh-CN", ja: "ja-JP", ko: "ko-KR" } as Record<string, string>)[locale] || "en-US";
}

function formatTime(value: string, locale: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(localeTag(locale), { hour: "2-digit", minute: "2-digit" }).format(date);
}

export default function ChatDrawer({ open, onClose, partnerBusinessId = "" }: { open: boolean; onClose: () => void; partnerBusinessId?: string }) {
  const { locale } = useLocale();
  const t = COPY[locale] ?? COPY.en;
  const partnerMode = Boolean(partnerBusinessId);
  const [category, setCategory] = useState<ChatCategory>("direct");
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [snapshot, setSnapshot] = useState<ChatSnapshot>(EMPTY);
  const [partnerRooms, setPartnerRooms] = useState<ChatRoom[]>([]);
  const [partnerSearch, setPartnerSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [translationEnabled, setTranslationEnabled] = useState(true);
  const [pendingBusinessId, setPendingBusinessId] = useState("");
  const [pendingDirectChat, setPendingDirectChat] = useState<{ userId: string; title: string; subtitle: string; avatarUrl: string; country: string; nationality: string } | null>(null);
  const [pendingActivityChat, setPendingActivityChat] = useState<{ category: Exclude<ChatCategory, "direct">; id: string; title: string; subtitle: string; avatarUrl: string } | null>(null);
  const [externalRoom, setExternalRoom] = useState<ChatRoom | null>(null);

  const categories: ChatCategory[] = partnerMode ? ["direct"] : ["direct", "trip", "event", "community"];
  const rooms = partnerMode ? partnerRooms : snapshot.rooms[category];
  const visibleRooms = useMemo(() => {
    if (!partnerMode) return rooms;
    const query = partnerSearch.trim().toLocaleLowerCase();
    if (!query) return rooms;
    return rooms.filter((room) => `${room.title} ${room.subtitle}`.toLocaleLowerCase().includes(query));
  }, [partnerMode, partnerSearch, rooms]);
  const selectedRoom = useMemo<ChatRoom | null>(
    () => rooms.find((room) => room.id === selectedRoomId)
      ?? (externalRoom?.id === selectedRoomId && externalRoom.category === category ? externalRoom : null),
    [rooms, selectedRoomId, externalRoom, category],
  );

  async function load() {
    setLoading(true);
    try {
      const next = await loadChatSnapshot();
      setSnapshot(next);
      if (!partnerMode) {
        window.dispatchEvent(new CustomEvent("melo-chat-unread-changed", { detail: { total: next.totalUnread } }));
      }
      return next;
    } finally {
      setLoading(false);
    }
  }

  async function loadPartner() {
    if (!partnerBusinessId) {
      setPartnerRooms([]);
      return [] as ChatRoom[];
    }
    setLoading(true);
    try {
      const next = await loadPartnerBusinessChatRooms(partnerBusinessId, t.customer);
      setPartnerRooms(next);
      const total = next.reduce((sum, room) => sum + Math.max(0, Number(room.unreadCount) || 0), 0);
      window.dispatchEvent(new CustomEvent("melo-partner-chat-unread-changed", { detail: { businessId: partnerBusinessId, total } }));
      return next;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const saved = window.localStorage.getItem(TRANSLATION_STORAGE_KEY);
    setTranslationEnabled(saved !== "off");
  }, []);

  useEffect(() => {
    setPartnerRooms([]);
    setPartnerSearch("");
    setSelectedRoomId("");
    setExternalRoom(null);
  }, [partnerBusinessId]);

  useEffect(() => {
    const onOpenBusinessChat = (event: Event) => {
      const detail = (event as CustomEvent<{ businessId?: string }>).detail;
      const businessId = String(detail?.businessId || "").trim();
      if (!businessId) return;
      setCategory("direct");
      setSelectedRoomId("");
      setExternalRoom(null);
      setPendingDirectChat(null);
      setPendingActivityChat(null);
      setPendingBusinessId(businessId);
    };
    const onOpenDirectChat = (event: Event) => {
      const detail = (event as CustomEvent<{ userId?: string; title?: string; subtitle?: string; avatarUrl?: string; country?: string; nationality?: string }>).detail;
      const userId = String(detail?.userId || "").trim();
      if (!userId) return;
      setCategory("direct");
      setSelectedRoomId("");
      setExternalRoom(null);
      setPendingBusinessId("");
      setPendingActivityChat(null);
      setPendingDirectChat({
        userId,
        title: String(detail?.title || "").trim(),
        subtitle: String(detail?.subtitle || "").trim(),
        avatarUrl: String(detail?.avatarUrl || "").trim(),
        country: String(detail?.country || "").trim(),
        nationality: String(detail?.nationality || "").trim(),
      });
    };
    const onOpenActivityChat = (event: Event) => {
      const detail = (event as CustomEvent<{ category?: string; id?: string; title?: string; subtitle?: string; avatarUrl?: string }>).detail;
      const category = detail?.category;
      const id = String(detail?.id || "").trim();
      if ((category !== "trip" && category !== "event" && category !== "community") || !id) return;
      setCategory(category);
      setSelectedRoomId("");
      setExternalRoom(null);
      setPendingBusinessId("");
      setPendingDirectChat(null);
      setPendingActivityChat({
        category,
        id,
        title: String(detail?.title || "").trim(),
        subtitle: String(detail?.subtitle || "").trim(),
        avatarUrl: String(detail?.avatarUrl || "").trim(),
      });
    };
    window.addEventListener("melo-open-business-chat", onOpenBusinessChat as EventListener);
    window.addEventListener("melo-open-direct-chat", onOpenDirectChat as EventListener);
    window.addEventListener("melo-open-activity-chat", onOpenActivityChat as EventListener);
    return () => {
      window.removeEventListener("melo-open-business-chat", onOpenBusinessChat as EventListener);
      window.removeEventListener("melo-open-direct-chat", onOpenDirectChat as EventListener);
      window.removeEventListener("melo-open-activity-chat", onOpenActivityChat as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!open) {
      setSelectedRoomId("");
      setExternalRoom(null);
      return;
    }

    if (partnerMode) void loadPartner();
    else void load();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const poll = window.setInterval(() => {
      if (partnerMode) void loadPartner();
      else void load();
    }, 15000);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const onUnreadChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ total?: number }>).detail;
      // A detail.total event is emitted by this drawer after its own snapshot load.
      // Only reload after a conversation marked something read.
      if (typeof detail?.total !== "number") {
        window.setTimeout(() => {
          if (partnerMode) void loadPartner();
          else void load();
        }, 120);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("melo-chat-unread-changed", onUnreadChanged as EventListener);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.clearInterval(poll);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("melo-chat-unread-changed", onUnreadChanged as EventListener);
    };
  }, [open, partnerMode, partnerBusinessId]);

  useEffect(() => {
    if (partnerMode || !open || !pendingDirectChat) return;
    let active = true;
    void (async () => {
      const target = pendingDirectChat;
      const next = await load();
      if (!active) return;

      let match = next.rooms.direct.find((room) => room.userId === target.userId) ?? null;
      if (!match) {
        match = await ensureDirectChatRoom(target);
        if (!active) return;
      }

      setCategory("direct");
      setExternalRoom(match && !next.rooms.direct.some((room) => room.id === match?.id) ? match : null);
      setSelectedRoomId(match?.id || "");
      setPendingDirectChat(null);
    })();
    return () => { active = false; };
  }, [open, pendingDirectChat, partnerMode]);

  useEffect(() => {
    if (partnerMode || !open || !pendingBusinessId) return;
    let active = true;
    void (async () => {
      const ensured = await ensureBusinessChatRoom(pendingBusinessId);
      const next = await load();
      if (!active) return;
      const match = next.rooms.direct.find((room) =>
        room.businessId === pendingBusinessId || (ensured ? room.id === ensured.id : false),
      );
      if (match) {
        setExternalRoom(null);
        setSelectedRoomId(match.id);
      }
      setPendingBusinessId("");
    })();
    return () => { active = false; };
  }, [open, pendingBusinessId, partnerMode]);

  useEffect(() => {
    if (partnerMode || !open || !pendingActivityChat) return;
    let active = true;
    void (async () => {
      const next = await load();
      if (!active) return;
      const match = next.rooms[pendingActivityChat.category].find((room) => room.id === pendingActivityChat.id);
      const room: ChatRoom = match ?? {
        id: pendingActivityChat.id,
        category: pendingActivityChat.category,
        title: pendingActivityChat.title || t[pendingActivityChat.category],
        subtitle: pendingActivityChat.subtitle,
        avatarUrl: pendingActivityChat.avatarUrl,
        lastMessage: "",
        lastMessageAt: "",
        unreadCount: 0,
        href: `/chat?type=${pendingActivityChat.category}&room=${encodeURIComponent(pendingActivityChat.id)}`,
      };
      setCategory(pendingActivityChat.category);
      setExternalRoom(match ? null : room);
      setSelectedRoomId(room.id);
      setPendingActivityChat(null);
    })();
    return () => { active = false; };
  }, [open, pendingActivityChat, partnerMode]);

  function toggleTranslation() {
    setTranslationEnabled((current) => {
      const next = !current;
      window.localStorage.setItem(TRANSLATION_STORAGE_KEY, next ? "on" : "off");
      return next;
    });
  }

  function chooseCategory(next: ChatCategory) {
    setCategory(next);
    setSelectedRoomId("");
    setExternalRoom(null);
  }

  function chooseRoom(room: ChatRoom) {
    setExternalRoom(null);
    setSelectedRoomId(room.id);
  }

  return (
    <div className={`${styles.layer} ${open ? styles.layerOpen : ""}`} aria-hidden={!open}>
      <button className={styles.backdrop} type="button" onClick={onClose} aria-label={t.close} tabIndex={open ? 0 : -1} />
      <aside className={`${styles.drawer} ${selectedRoom ? styles.drawerConversation : ""}`} role="dialog" aria-modal="true" aria-label={t.title}>
        {!selectedRoom ? (
          <>
            <header className={styles.drawerHeader}>
              <div>
                <span>MELO</span>
                <strong>{partnerMode ? t.partnerTitle : t.title}</strong>
              </div>
              <div className={styles.headerActions}>
                <button
                  type="button"
                  className={`${styles.translationTopToggle} ${translationEnabled ? styles.translationTopToggleOn : ""}`}
                  onClick={toggleTranslation}
                  aria-pressed={translationEnabled}
                  aria-label={t.translation}
                  title={`${t.translation}: ${translationEnabled ? t.translationOn : t.translationOff}`}
                >
                  <span>🌐</span>
                  <strong>{t.translation}</strong>
                  <b>{translationEnabled ? t.translationOn : t.translationOff}</b>
                </button>
                <button type="button" className={styles.closeButton} onClick={onClose} aria-label={t.close}>×</button>
              </div>
            </header>

            {partnerMode ? (
              <div className={styles.partnerChatSearch}>
                <span aria-hidden="true">⌕</span>
                <input
                  type="search"
                  value={partnerSearch}
                  onChange={(event) => setPartnerSearch(event.target.value)}
                  placeholder={t.searchCustomers}
                  aria-label={t.searchCustomers}
                />
                {partnerSearch ? <button type="button" onClick={() => setPartnerSearch("")} aria-label={t.close}>×</button> : null}
              </div>
            ) : (
              <nav className={styles.folderTabs} aria-label={t.title}>
                {categories.map((item) => (
                  <button
                    type="button"
                    key={item}
                    className={category === item ? styles.folderActive : ""}
                    onClick={() => chooseCategory(item)}
                  >
                    <strong>{t[item]}</strong>
                    {snapshot.counts[item] > 0 ? <b>{snapshot.counts[item] > 99 ? "99+" : snapshot.counts[item]}</b> : null}
                  </button>
                ))}
              </nav>
            )}

            <div className={styles.listHeader}>
              <div>
                <span>{t.list}</span>
                <strong>{t[category]}</strong>
              </div>
              <button type="button" onClick={() => void (partnerMode ? loadPartner() : load())} disabled={loading} aria-label={t.refresh} title={t.refresh}>↻</button>
            </div>

            <div className={styles.roomList}>
              {loading ? (
                <div className={styles.roomState}>{t.loading}</div>
              ) : visibleRooms.length ? (
                visibleRooms.map((room) => (
                  <div
                    className={styles.roomRow}
                    key={`${room.category}-${room.id}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => chooseRoom(room)}
                    onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); chooseRoom(room); } }}
                  >
                    {room.category === "direct" && room.userId && (partnerMode || !room.businessId) ? (
                      <VerifiedUserAvatar userId={room.userId} name={room.title} src={room.avatarUrl} country={room.country} nationality={room.nationality} className={styles.avatar} shape="rounded" badgeSize={15} alt="" />
                    ) : (
                      <span className={styles.avatar}>{room.avatarUrl ? <img src={room.avatarUrl} alt="" /> : <b>{ICON[room.category]}</b>}</span>
                    )}
                    <span className={styles.roomCopy}>
                      <span>
                        {room.category === "direct" && room.userId && (partnerMode || !room.businessId) ? (
                          <strong><Link href={`/users/${room.userId}`} className={styles.profileNameLink} onClick={(event) => event.stopPropagation()}>{room.title}</Link></strong>
                        ) : <strong>{room.title}</strong>}
                        <time>{formatTime(room.lastMessageAt, locale)}</time>
                      </span>
                      <small>{room.lastMessage || room.subtitle || t[room.category]}</small>
                    </span>
                    {room.unreadCount > 0 ? <b className={styles.unreadBadge}>{room.unreadCount > 99 ? "99+" : room.unreadCount}</b> : null}
                    <span className={styles.chevron}>›</span>
                  </div>
                ))
              ) : (
                <div className={styles.roomState}>{t.empty}</div>
              )}
            </div>

          </>
        ) : (
          <div className={styles.conversationWrap}>
            <div className={styles.conversationCloseRow}>
              <button type="button" onClick={() => { setSelectedRoomId(""); setExternalRoom(null); }} aria-label={t.back}>‹</button>
              <span>{t[category]}</span>
              <button
                type="button"
                className={`${styles.conversationTranslationToggle} ${translationEnabled ? styles.conversationTranslationToggleOn : ""}`}
                onClick={toggleTranslation}
                aria-pressed={translationEnabled}
                aria-label={t.translation}
                title={`${t.translation}: ${translationEnabled ? t.translationOn : t.translationOff}`}
              >
                🌐
              </button>
              <button type="button" onClick={onClose} aria-label={t.close}>×</button>
            </div>
            <div className={styles.conversationBody}>
              <ChatConversationPane room={selectedRoom} translationEnabled={translationEnabled} drawerMode />
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
