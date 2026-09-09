"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "@/components/SiteProviders";
import VerifiedUserAvatar from "@/components/profile/VerifiedUserAvatar";
import {
  loadChatSnapshot,
  sendDirectText,
  type ChatCategory,
  type ChatRoom,
  type ChatSnapshot,
} from "@/components/chat/chatData";
import { invokeEdgeFunction, rpcRequest } from "@/lib/supabase/browser";
import styles from "./ShareActivityToChatWeb.module.css";

const EMPTY: ChatSnapshot = {
  rooms: { direct: [], trip: [], event: [], community: [] },
  counts: { direct: 0, trip: 0, event: 0, community: 0 },
  totalUnread: 0,
};

const COPY = {
  th: { title:"แชร์ไปข้อความ", direct:"ข้อความ", trip:"ทริป", event:"อีเวนต์", community:"คอมมูนิตี้", loading:"กำลังโหลดแชท…", empty:"ยังไม่มีแชทในหมวดนี้", send:"ส่ง", sending:"กำลังส่ง…", sent:"ส่งแล้ว", failed:"ส่งไม่สำเร็จ", close:"ปิด" },
  en: { title:"Share to messages", direct:"Messages", trip:"Trips", event:"Events", community:"Community", loading:"Loading chats…", empty:"No chats in this category", send:"Send", sending:"Sending…", sent:"Sent", failed:"Unable to send", close:"Close" },
  de: { title:"Im Chat teilen", direct:"Nachrichten", trip:"Reisen", event:"Events", community:"Community", loading:"Chats werden geladen…", empty:"Keine Chats", send:"Senden", sending:"Wird gesendet…", sent:"Gesendet", failed:"Senden fehlgeschlagen", close:"Schließen" },
  zh: { title:"分享到聊天", direct:"消息", trip:"旅行", event:"活动", community:"社区", loading:"正在加载聊天…", empty:"此分类暂无聊天", send:"发送", sending:"正在发送…", sent:"已发送", failed:"发送失败", close:"关闭" },
  ja: { title:"チャットに共有", direct:"メッセージ", trip:"Trip", event:"Event", community:"Community", loading:"チャットを読み込み中…", empty:"チャットがありません", send:"送信", sending:"送信中…", sent:"送信済み", failed:"送信できませんでした", close:"閉じる" },
  ko: { title:"채팅으로 공유", direct:"메시지", trip:"여행", event:"이벤트", community:"커뮤니티", loading:"채팅 불러오는 중…", empty:"채팅이 없습니다", send:"보내기", sending:"보내는 중…", sent:"전송됨", failed:"전송 실패", close:"닫기" },
} as const;

function missingRpc(error: string | null | undefined) {
  const text = String(error || "").toLowerCase();
  return text.includes("could not find the function") || text.includes("pgrst202") || text.includes("schema cache");
}

async function sendActivityRoomText(category: Exclude<ChatCategory,"direct">, roomId: string, body: string, locale: string) {
  const common = {
    p_original_text: body,
    p_source_language: locale,
    p_translations: { [locale]: body },
    p_message_type: "text",
    p_media_path: null,
    p_latitude: null,
    p_longitude: null,
    p_location_label: null,
    p_sticker_code: null,
  };

  let result;
  if (category === "trip") {
    result = await rpcRequest<Record<string,unknown> | Record<string,unknown>[]>("send_trip_chat_message", { p_trip_id: roomId, ...common });
  } else if (category === "event") {
    result = await rpcRequest<Record<string,unknown> | Record<string,unknown>[]>("send_event_chat_message", { p_event_id: roomId, ...common });
  } else {
    result = await rpcRequest<Record<string,unknown> | Record<string,unknown>[]>("send_community_message_v2", { p_community_id: roomId, ...common });
    if (result.error && missingRpc(result.error)) {
      result = await rpcRequest<Record<string,unknown> | Record<string,unknown>[]>("send_community_message", {
        p_community_id: roomId,
        p_original_text: body,
        p_source_language: locale,
        p_translations: { [locale]: body },
      });
    }
  }
  if (result.error) throw new Error(result.error);

  const rows = Array.isArray(result.data) ? result.data : result.data ? [result.data] : [];
  const messageId = String((rows[0] as any)?.id || "");
  void invokeEdgeFunction("notify-chat-message", {
    kind: category,
    entityId: roomId,
    messageId,
    preview: body.slice(0, 180),
  }).catch(() => undefined);
}

export default function ShareActivityToChatWeb({
  open,
  onClose,
  activity,
}: {
  open: boolean;
  onClose: () => void;
  activity: {
    feature: "trip" | "event" | "community";
    id: string;
    title: string;
    subtitle: string;
    url: string;
  };
}) {
  const { locale } = useLocale();
  const t = COPY[locale] ?? COPY.en;
  const [snapshot, setSnapshot] = useState<ChatSnapshot>(EMPTY);
  const [category, setCategory] = useState<ChatCategory>("direct");
  const [loading, setLoading] = useState(false);
  const [sendingId, setSendingId] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true); setError(""); setNotice("");
    loadChatSnapshot()
      .then((next) => { if (active) setSnapshot(next); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : t.failed); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [open]);

  const rooms = snapshot.rooms[category];
  const body = useMemo(
    () => [
      activity.feature === "trip" ? "Melo Trip" : activity.feature === "event" ? "Melo Event" : "Melo Community",
      activity.title,
      activity.subtitle,
      activity.url,
    ].filter(Boolean).join("\n"),
    [activity],
  );

  async function send(room: ChatRoom) {
    if (sendingId) return;
    setSendingId(`${room.category}:${room.id}`);
    setError(""); setNotice("");
    try {
      if (room.category === "direct") {
        await sendDirectText(room.id, body, locale);
      } else {
        await sendActivityRoomText(room.category, room.id, body, locale);
      }
      setNotice(t.sent);
      window.setTimeout(onClose, 650);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t.failed);
    } finally {
      setSendingId("");
    }
  }

  if (!open) return null;

  const tabs: ChatCategory[] = ["direct","trip","event","community"];

  return (
    <div className={styles.backdrop} onMouseDown={onClose}>
      <section className={styles.modal} onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <div><strong>{t.title}</strong><small>{activity.title}</small></div>
          <button type="button" onClick={onClose}>×</button>
        </header>

        <nav>
          {tabs.map((item) => (
            <button type="button" key={item} className={category === item ? styles.active : ""} onClick={() => setCategory(item)}>
              {t[item]} <b>{snapshot.rooms[item].length}</b>
            </button>
          ))}
        </nav>

        <div className={styles.list}>
          {loading ? <div className={styles.state}>{t.loading}</div> :
           rooms.length ? rooms.map((room) => {
             const key = `${room.category}:${room.id}`;
             return (
               <button type="button" className={styles.room} key={key} onClick={() => void send(room)} disabled={Boolean(sendingId)}>
                 {room.category === "direct" && room.userId && !room.businessId ? <VerifiedUserAvatar userId={room.userId} name={room.title} src={room.avatarUrl} country={room.country} nationality={room.nationality} className={styles.userAvatar} shape="rounded" badgeSize={15} alt="" /> : <span className={styles.avatar}>{room.avatarUrl ? <img src={room.avatarUrl} alt="" /> : "💬"}</span>}
                 <span className={styles.roomCopy}><strong>{room.title}</strong><small>{room.subtitle || room.lastMessage}</small></span>
                 <em>{sendingId === key ? t.sending : t.send}</em>
               </button>
             );
           }) : <div className={styles.state}>{t.empty}</div>}
        </div>

        {notice ? <div className={styles.success}>{notice}</div> : null}
        {error ? <div className={styles.error}>{error}</div> : null}
      </section>
    </div>
  );
}
