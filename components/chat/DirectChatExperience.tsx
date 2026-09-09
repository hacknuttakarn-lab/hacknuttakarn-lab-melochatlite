"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { useLocale } from "@/components/SiteProviders";
import { getCurrentUser, invokeEdgeFunction, isSupabaseConfigured } from "@/lib/supabase/browser";
import { loadDirectMessages, markDirectRead, sendDirectText, type DirectMessage } from "./chatData";
import styles from "./DirectChatExperience.module.css";

const COPY = {
  th: { title: "ข้อความ", back: "กลับรายการแชท", loading: "กำลังโหลดข้อความ…", empty: "ยังไม่มีข้อความ เริ่มบทสนทนาได้เลย", placeholder: "พิมพ์ข้อความ…", send: "ส่ง", failed: "ส่งข้อความไม่สำเร็จ", env: "ยังไม่ได้ตั้งค่า Supabase", login: "กรุณาเข้าสู่ระบบ" },
  en: { title: "Messages", back: "Back to chats", loading: "Loading messages…", empty: "No messages yet. Start the conversation", placeholder: "Type a message…", send: "Send", failed: "Unable to send message", env: "Supabase is not configured", login: "Please sign in" },
  de: { title: "Nachrichten", back: "Zurück zu Chats", loading: "Nachrichten werden geladen…", empty: "Noch keine Nachrichten", placeholder: "Nachricht schreiben…", send: "Senden", failed: "Nachricht konnte nicht gesendet werden", env: "Supabase ist nicht konfiguriert", login: "Bitte anmelden" },
  zh: { title: "消息", back: "返回聊天列表", loading: "正在加载消息…", empty: "暂无消息，开始聊天吧", placeholder: "输入消息…", send: "发送", failed: "发送失败", env: "尚未配置 Supabase", login: "请登录" },
  ja: { title: "メッセージ", back: "チャット一覧へ", loading: "メッセージを読み込み中…", empty: "まだメッセージはありません", placeholder: "メッセージを入力…", send: "送信", failed: "送信できません", env: "Supabaseが設定されていません", login: "ログインしてください" },
  ko: { title: "메시지", back: "채팅 목록으로", loading: "메시지 불러오는 중…", empty: "아직 메시지가 없습니다", placeholder: "메시지 입력…", send: "보내기", failed: "메시지를 보낼 수 없습니다", env: "Supabase가 설정되지 않았습니다", login: "로그인하세요" },
} as const;

function localeTag(locale: string) { return ({ th: "th-TH", en: "en-US", de: "de-DE", zh: "zh-CN", ja: "ja-JP", ko: "ko-KR" } as Record<string,string>)[locale] || "en-US"; }
function time(value: string, locale: string) { const d = new Date(value); return Number.isNaN(d.getTime()) ? "" : new Intl.DateTimeFormat(localeTag(locale), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(d); }
function body(message: DirectMessage, locale: string) { return message.translations?.[locale]?.trim() || message.body; }

export default function DirectChatExperience() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id || "");
  const router = useRouter();
  const { locale } = useLocale();
  const t = COPY[locale] ?? COPY.en;
  const [userId, setUserId] = useState("");
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  async function load(background = false) {
    if (!background) setLoading(true);
    setError("");
    try {
      const user = await getCurrentUser();
      if (!user) { router.replace("/login"); return; }
      setUserId(user.id);
      setMessages(await loadDirectMessages(id));
      void markDirectRead(id);
    } catch (cause) { setError(cause instanceof Error ? cause.message : t.failed); }
    finally { if (!background) setLoading(false); }
  }

  useEffect(() => {
    if (!isSupabaseConfigured()) { setLoading(false); return; }
    void load();
    const timer = window.setInterval(() => void load(true), 3500);
    return () => window.clearInterval(timer);
  }, [id]);

  useEffect(() => { window.setTimeout(() => endRef.current?.scrollIntoView({ block: "end" }), 20); }, [messages.length]);

  async function send() {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true); setError("");
    try {
      const saved = await sendDirectText(id, text, locale);
      setDraft("");
      if (saved) setMessages((old) => [...old.filter((m) => m.id !== saved.id), saved]);
      void invokeEdgeFunction("notify-chat-message", { kind: "direct", conversationId: id, messageId: saved?.id || null, preview: text.slice(0,180) }).catch(() => undefined);
      window.setTimeout(() => void load(true), 250);
    } catch (cause) { setError(cause instanceof Error ? cause.message : t.failed); }
    finally { setSending(false); }
  }

  if (!isSupabaseConfigured()) return <main className={styles.page}><Header /><div className={styles.state}>{t.env}</div></main>;

  return (
    <main className={styles.page}>
      <Header />
      <section className={styles.shell}>
        <div className={styles.topbar}><Link href="/chat?type=direct">‹ {t.back}</Link><span>{t.title}</span></div>
        <section className={styles.chatCard}>
          <header className={styles.chatHeader}><div className={styles.roomMark}>✉</div><div><small>MELO CHAT</small><h1>{t.title}</h1></div></header>
          <div className={styles.messages}>
            {loading ? <div className={styles.state}>{t.loading}</div> : messages.length ? messages.map((message) => {
              const mine = message.senderId === userId;
              return <article key={message.id} className={mine ? styles.mineRow : styles.otherRow}>
                <div className={mine ? styles.mineBubble : styles.otherBubble}>
                  {!mine ? <strong><Link href={`/users/${message.senderId}`} className={styles.profileNameLink}>{message.senderName}</Link></strong> : null}
                  <p>{body(message, locale)}</p>
                  <time>{time(message.createdAt, locale)}</time>
                </div>
              </article>;
            }) : <div className={styles.state}>{t.empty}</div>}
            <div ref={endRef} />
          </div>
          {error ? <div className={styles.error}>{error}</div> : null}
          <div className={styles.composer}>
            <textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={t.placeholder} rows={1} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(); } }} />
            <button type="button" onClick={() => void send()} disabled={!draft.trim() || sending}>{t.send}</button>
          </div>
        </section>
      </section>
    </main>
  );
}
