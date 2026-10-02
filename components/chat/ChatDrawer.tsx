"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLocale } from "@/components/SiteProviders";
import { ChatConversationPane } from "./ChatConversationPane";
import { canCurrentUserUseChat, ensureBusinessChatRoom, ensureDirectChatRoom, loadChatSnapshot, loadPartnerBusinessChatRooms, loadPinnedConversationIds, setConversationPinned, type ChatCategory, type ChatRoom, type ChatSnapshot } from "./chatData";
import styles from "./ChatDrawer.module.css";
import VerifiedUserAvatar from "@/components/profile/VerifiedUserAvatar";
import AdminSupportChat from "@/components/support/AdminSupportChat";
import { loadLoveSnapshot, type DatingProfileWeb } from "@/components/connect/connectData";
import { getCurrentUser } from "@/lib/supabase/browser";
import { bindMobileVisualViewport } from "@/lib/mobileVisualViewport";
import {
  loadSettingsAccountSnapshot,
  saveAutoTranslationEnabled,
} from "@/components/settings/settingsWebData";

const TRANSLATION_STORAGE_KEY = "melo-chat-translation-enabled";
const TRANSLATION_SETTING_EVENT = "melo-chat-translation-setting-changed";
/* MELO_DRAWER_ACCOUNT_TRANSLATION_V2 */

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
    matches: "คนที่แมตช์",
    noMatches: "ยังไม่มีคนที่แมตช์",
    lockedTitle: "แชทสำหรับสมาชิก Premium",
    lockedBody: "แพ็กเกจ Free รับการแจ้งเตือนได้เมื่อมีข้อความใหม่ แต่ไม่สามารถเปิดอ่านข้อความหรือใช้งานแชทได้",
    upgrade: "ดูแพ็กเกจ Premium",
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
    matches: "Matches",
    noMatches: "No matches yet",
    lockedTitle: "Chat is a Premium feature",
    lockedBody: "Free members can receive a new-message alert, but cannot open message content or use chat.",
    upgrade: "View Premium plans",
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
    matches: "Matches",
    noMatches: "Noch keine Matches",
    lockedTitle: "Chat ist eine Premium-Funktion",
    lockedBody: "Free-Mitglieder erhalten Hinweise auf neue Nachrichten, können den Inhalt aber nicht öffnen oder den Chat nutzen.",
    upgrade: "Premium-Pakete ansehen",
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
    matches: "匹配",
    noMatches: "暂无匹配",
    lockedTitle: "聊天为 Premium 功能",
    lockedBody: "Free 用户可收到新消息提醒，但无法查看消息内容或使用聊天。",
    upgrade: "查看 Premium 套餐",
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
    matches: "マッチ",
    noMatches: "まだマッチがありません",
    lockedTitle: "チャットは Premium 機能です",
    lockedBody: "Free 会員は新着メッセージ通知を受け取れますが、内容の閲覧やチャット利用はできません。",
    upgrade: "Premium プランを見る",
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
    matches: "매치",
    noMatches: "아직 매치가 없습니다",
    lockedTitle: "채팅은 Premium 기능입니다",
    lockedBody: "Free 회원은 새 메시지 알림은 받을 수 있지만 내용 확인이나 채팅 사용은 할 수 없습니다.",
    upgrade: "Premium 플랜 보기",
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

function UserChatDrawer({ open, onClose, partnerBusinessId = "" }: { open: boolean; onClose: () => void; partnerBusinessId?: string }) {
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
  const [primaryChatLanguage, setPrimaryChatLanguage] = useState("th");
  const [translationUserId, setTranslationUserId] = useState("");
  const [pendingBusinessId, setPendingBusinessId] = useState("");
  const [pendingDirectChat, setPendingDirectChat] = useState<{ userId: string; title: string; subtitle: string; avatarUrl: string; country: string; nationality: string } | null>(null);
  const [pendingActivityChat, setPendingActivityChat] = useState<{ category: Exclude<ChatCategory, "direct">; id: string; title: string; subtitle: string; avatarUrl: string } | null>(null);
  const [externalRoom, setExternalRoom] = useState<ChatRoom | null>(null);
  const [matchedProfiles, setMatchedProfiles] = useState<DatingProfileWeb[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [pinnedConversationIds, setPinnedConversationIds] = useState<string[]>([]);
  const [pinningProfileId, setPinningProfileId] = useState("");
  const [chatAllowed, setChatAllowed] = useState<boolean | null>(partnerMode ? true : null);

  /* MELO_CHAT_ROOM_PAGINATION_V2 */
  const CHAT_ROOM_PAGE_SIZE = 15;
  const [roomVisibleCount, setRoomVisibleCount] = useState(CHAT_ROOM_PAGE_SIZE);
  const [matchVisibleCount, setMatchVisibleCount] = useState(CHAT_ROOM_PAGE_SIZE);

  // Melo Chat Lite uses the drawer for direct member messages only.
  const categories: ChatCategory[] = ["direct"];
  const rooms = partnerMode ? partnerRooms : snapshot.rooms[category];
  const visibleRooms = useMemo(() => {
    if (!partnerMode) return rooms;
    const query = partnerSearch.trim().toLocaleLowerCase();
    if (!query) return rooms;
    return rooms.filter((room) => `${room.title} ${room.subtitle}`.toLocaleLowerCase().includes(query));
  }, [partnerMode, partnerSearch, rooms]);
  const pagedVisibleRooms = useMemo(() => visibleRooms.slice(0, roomVisibleCount), [visibleRooms, roomVisibleCount]);
  const sortedMatchedProfiles = useMemo(() => {
    const pinIndex = new Map(pinnedConversationIds.map((id, index) => [id, index]));
    return [...matchedProfiles].sort((a, b) => {
      const aRoom = snapshot.rooms.direct.find((room) => room.userId === a.id);
      const bRoom = snapshot.rooms.direct.find((room) => room.userId === b.id);
      const ai = aRoom ? pinIndex.get(aRoom.id) : undefined;
      const bi = bRoom ? pinIndex.get(bRoom.id) : undefined;
      if (ai != null && bi != null) return ai - bi;
      if (ai != null) return -1;
      if (bi != null) return 1;
      return 0;
    });
  }, [matchedProfiles, pinnedConversationIds, snapshot.rooms.direct]);
  const pagedMatchedProfiles = useMemo(() => sortedMatchedProfiles.slice(0, matchVisibleCount), [sortedMatchedProfiles, matchVisibleCount]);
  const loadMoreRooms = () => setRoomVisibleCount((current) => Math.min(visibleRooms.length, current + CHAT_ROOM_PAGE_SIZE));
  const loadMoreMatches = () => setMatchVisibleCount((current) => Math.min(sortedMatchedProfiles.length, current + CHAT_ROOM_PAGE_SIZE));

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

  async function loadMatches() {
    if (partnerMode) return [] as DatingProfileWeb[];
    setMatchesLoading(true);
    try {
      const user = await getCurrentUser();
      const userId = String(user?.id || "").trim();
      if (!userId) {
        setMatchedProfiles([]);
        return [];
      }
      const [love, pins] = await Promise.all([loadLoveSnapshot(userId), loadPinnedConversationIds()]);
      setPinnedConversationIds(pins);
      setMatchedProfiles(love.matched);
      setMatchVisibleCount(CHAT_ROOM_PAGE_SIZE);
      return love.matched;
    } catch {
      setMatchedProfiles([]);
      return [];
    } finally {
      setMatchesLoading(false);
    }
  }

  async function openMatchedProfile(profile: DatingProfileWeb) {
    const room = await ensureDirectChatRoom({
      userId: profile.id,
      title: profile.name,
      subtitle: [profile.age ? `${profile.age}` : "", profile.country].filter(Boolean).join(" · "),
      avatarUrl: profile.photoUrls?.[0] || "",
      country: profile.country,
      nationality: profile.nationality,
    });
    if (!room) return;
    setCategory("direct");
    setExternalRoom(room);
    setSelectedRoomId(room.id);
  }

  async function togglePin(profile: DatingProfileWeb, existingRoom?: ChatRoom) {
    if (pinningProfileId === profile.id) return;

    setPinningProfileId(profile.id);

    try {
      let targetRoom = existingRoom;

      if (!targetRoom) {
        targetRoom =
          (await ensureDirectChatRoom({
            userId: profile.id,
            title: profile.name,
            subtitle: [profile.age ? `${profile.age}` : "", profile.country]
              .filter(Boolean)
              .join(" · "),
            avatarUrl: profile.photoUrls?.[0] || "",
            country: profile.country,
            nationality: profile.nationality,
          })) || undefined;
      }

      if (!targetRoom?.id) {
        throw new Error("Unable to create or find this chat conversation.");
      }

      const conversationId = targetRoom.id;
      const isPinned = pinnedConversationIds.includes(conversationId);

      await setConversationPinned(conversationId, !isPinned);

      setPinnedConversationIds((current) =>
        isPinned
          ? current.filter((id) => id !== conversationId)
          : [conversationId, ...current.filter((id) => id !== conversationId)],
      );

      if (!existingRoom) {
        setExternalRoom(targetRoom);
        const nextSnapshot = await load();
        if (nextSnapshot) {
          const refreshedPins = await loadPinnedConversationIds();
          setPinnedConversationIds(refreshedPins);
        }
      }
    } catch (cause) {
      const message =
        cause instanceof Error && cause.message
          ? cause.message
          : "Unable to update pinned chat.";

      console.error("[Melo Chat] Pin chat failed:", cause);
      window.alert(message);
    } finally {
      setPinningProfileId("");
    }
  }

  function handleRoomListScroll(event: React.UIEvent<HTMLDivElement>) {
    const node = event.currentTarget;
    if (node.scrollHeight - node.scrollTop - node.clientHeight > 80) return;
    if (partnerMode) loadMoreRooms(); else loadMoreMatches();
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
    let active = true;

    const cached =
      window.localStorage.getItem(
        TRANSLATION_STORAGE_KEY,
      );

    if (cached) {
      setTranslationEnabled(
        cached !== "off",
      );
    }

    void loadSettingsAccountSnapshot()
      .then((settings) => {
        if (!active) return;

        setTranslationUserId(
          settings.userId,
        );

        setPrimaryChatLanguage(
          settings.primaryLanguage ||
            "th",
        );

        setTranslationEnabled(
          settings.autoTranslationEnabled,
        );

        window.localStorage.setItem(
          TRANSLATION_STORAGE_KEY,
          settings.autoTranslationEnabled
            ? "on"
            : "off",
        );
      })
      .catch(() => undefined);

    const onTranslationSettingChanged =
      (event: Event) => {
        const detail =
          (
            event as CustomEvent<{
              enabled?: boolean;
              primaryLanguage?: string;
            }>
          ).detail;

        if (
          typeof detail?.enabled ===
          "boolean"
        ) {
          setTranslationEnabled(
            detail.enabled,
          );

          window.localStorage.setItem(
            TRANSLATION_STORAGE_KEY,
            detail.enabled
              ? "on"
              : "off",
          );
        }

        if (
          detail?.primaryLanguage
        ) {
          setPrimaryChatLanguage(
            detail.primaryLanguage,
          );
        }
      };

    const onStorage =
      (event: StorageEvent) => {
        if (
          event.key !==
          TRANSLATION_STORAGE_KEY
        ) {
          return;
        }

        setTranslationEnabled(
          event.newValue !== "off",
        );
      };

    window.addEventListener(
      TRANSLATION_SETTING_EVENT,
      onTranslationSettingChanged as EventListener,
    );

    window.addEventListener(
      "storage",
      onStorage,
    );

    return () => {
      active = false;

      window.removeEventListener(
        TRANSLATION_SETTING_EVENT,
        onTranslationSettingChanged as EventListener,
      );

      window.removeEventListener(
        "storage",
        onStorage,
      );
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    return bindMobileVisualViewport("melo-chat");
  }, [open]);

  useEffect(() => {
    let active = true;
    if (!open) return () => { active = false; };
    if (partnerMode) {
      setChatAllowed(true);
      return () => { active = false; };
    }

    setChatAllowed(null);
    void canCurrentUserUseChat(true).then((allowed) => {
      if (active) setChatAllowed(allowed);
    });

    return () => { active = false; };
  }, [open, partnerMode]);

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
    else if (chatAllowed) { void load(); void loadMatches(); }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const poll = window.setInterval(() => {
      if (partnerMode) void loadPartner();
      else if (chatAllowed) void load();
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
          else if (chatAllowed) void load();
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
  }, [open, partnerMode, partnerBusinessId, chatAllowed]);

  useEffect(() => {
    if (partnerMode || !open || chatAllowed !== true || !pendingDirectChat) return;
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
  }, [open, pendingDirectChat, partnerMode, chatAllowed]);

  useEffect(() => {
    if (partnerMode || !open || chatAllowed !== true || !pendingBusinessId) return;
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
  }, [open, pendingBusinessId, partnerMode, chatAllowed]);

  useEffect(() => {
    if (partnerMode || !open || chatAllowed !== true || !pendingActivityChat) return;
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
  }, [open, pendingActivityChat, partnerMode, chatAllowed]);

  function toggleTranslation() {
    const next =
      !translationEnabled;

    setTranslationEnabled(next);

    window.localStorage.setItem(
      TRANSLATION_STORAGE_KEY,
      next ? "on" : "off",
    );

    window.dispatchEvent(
      new CustomEvent(
        TRANSLATION_SETTING_EVENT,
        {
          detail: {
            enabled: next,
            primaryLanguage:
              primaryChatLanguage,
          },
        },
      ),
    );

    if (translationUserId) {
      void saveAutoTranslationEnabled(
        translationUserId,
        next,
      ).catch(() => {
        setTranslationEnabled(
          !next,
        );

        window.localStorage.setItem(
          TRANSLATION_STORAGE_KEY,
          !next ? "on" : "off",
        );
      });
    }
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
        {!partnerMode && chatAllowed !== true ? (
          <>
            <header className={styles.drawerHeader}>
              <div><span>MELO</span><strong>{t.title}</strong></div>
              <button type="button" className={styles.closeButton} onClick={onClose} aria-label={t.close}>×</button>
            </header>
            {chatAllowed === null ? (
              <div className={styles.roomState}>{t.loading}</div>
            ) : (
              <div className={styles.chatLocked}>
                <span aria-hidden="true">✉</span>
                <strong>{t.lockedTitle}</strong>
                <p>{t.lockedBody}</p>
                <Link href="/premium" onClick={onClose}>{t.upgrade}</Link>
              </div>
            )}
          </>
        ) : !selectedRoom ? (
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
            ) : null}

            <div className={styles.listHeader}>
              <div>
                <span>{t.list}</span>
                <strong>{partnerMode ? t[category] : t.matches}</strong>
              </div>
              <button type="button" onClick={() => void (partnerMode ? loadPartner() : load())} disabled={loading} aria-label={t.refresh} title={t.refresh}>↻</button>
            </div>

            <div className={styles.roomList} onScroll={handleRoomListScroll}>
              {!partnerMode ? (
                matchesLoading ? (
                  <div className={styles.roomState}>{t.loading}</div>
                ) : matchedProfiles.length ? (
                  pagedMatchedProfiles.map((profile) => {
                    const existingRoom = snapshot.rooms.direct.find((room) => room.userId === profile.id);
                    return (
                      <div
                        className={styles.roomRow}
                        key={profile.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => void openMatchedProfile(profile)}
                        onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); void openMatchedProfile(profile); } }}
                      >
                        <VerifiedUserAvatar userId={profile.id} name={profile.name} src={profile.photoUrls?.[0] || ""} country={profile.country} nationality={profile.nationality} className={styles.avatar} shape="rounded" badgeSize={15} alt="" />
                        <span className={styles.roomCopy}>
                          <span>
                            <strong>{profile.name}{profile.age ? `, ${profile.age}` : ""}</strong>
                            {existingRoom?.lastMessageAt ? <time>{formatTime(existingRoom.lastMessageAt, locale)}</time> : null}
                          </span>
                          <small>{profile.country || profile.nationality || t.matches}</small>
                        </span>
                        {(() => {
                          const isPinned = Boolean(
                            existingRoom &&
                              pinnedConversationIds.includes(existingRoom.id),
                          );
                          const isPinning = pinningProfileId === profile.id;

                          return (
                            <button
                              type="button"
                              aria-label={isPinned ? "Unpin chat" : "Pin chat"}
                              aria-pressed={isPinned}
                              title={isPinned ? "Unpin chat" : "Pin chat"}
                              disabled={isPinning}
                              onPointerDown={(event) => event.stopPropagation()}
                              onMouseDown={(event) => event.stopPropagation()}
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                void togglePin(profile, existingRoom);
                              }}
                              onKeyDown={(event) => {
                                event.stopPropagation();
                              }}
                              style={{
                                position: "relative",
                                zIndex: 3,
                                display: "inline-grid",
                                placeItems: "center",
                                width: 38,
                                height: 38,
                                border: isPinned
                                  ? "1px solid rgba(74, 163, 255, .55)"
                                  : "1px solid transparent",
                                borderRadius: 12,
                                background: isPinned
                                  ? "rgba(47, 127, 240, .16)"
                                  : "transparent",
                                cursor: isPinning ? "wait" : "pointer",
                                padding: 0,
                                fontSize: 18,
                                lineHeight: 1,
                                opacity: isPinning ? 0.55 : isPinned ? 1 : 0.72,
                                pointerEvents: "auto",
                              }}
                            >
                              {isPinning ? "…" : "📌"}
                            </button>
                          );
                        })()}
                        {existingRoom && existingRoom.unreadCount > 0 ? <b className={styles.unreadBadge}>{existingRoom.unreadCount > 99 ? "99+" : existingRoom.unreadCount}</b> : null}
                        <span className={styles.chevron}>›</span>
                      </div>
                    );
                  })
                ) : (
                  <div className={styles.roomState}>{t.noMatches}</div>
                )
              ) : loading ? (
                <div className={styles.roomState}>{t.loading}</div>
              ) : visibleRooms.length ? (
                pagedVisibleRooms.map((room) => (
                  <div className={styles.roomRow} key={`${room.category}-${room.id}`} role="button" tabIndex={0} onClick={() => chooseRoom(room)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); chooseRoom(room); } }}>
                    <span className={styles.avatar}>{room.avatarUrl ? <img src={room.avatarUrl} alt="" /> : <b>{ICON[room.category]}</b>}</span>
                    <span className={styles.roomCopy}><span><strong>{room.title}</strong><time>{formatTime(room.lastMessageAt, locale)}</time></span><small>{room.lastMessage || room.subtitle || t[room.category]}</small></span>
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




export default function ChatDrawer({ open, onClose, partnerBusinessId = "", adminMode = false }: { open: boolean; onClose: () => void; partnerBusinessId?: string; adminMode?: boolean }) {
  if (adminMode) return open ? <AdminSupportChat onClose={onClose} /> : null;
  return <UserChatDrawer open={open} onClose={onClose} partnerBusinessId={partnerBusinessId} />;
}
