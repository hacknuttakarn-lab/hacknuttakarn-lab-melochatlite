"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { useLocale } from "@/components/SiteProviders";
import { liveNoticeComposerCopy } from "@/i18n/liveNoticeComposerUi";
import {
  getCurrentUser,
  isSupabaseConfigured,
  restSelect,
  rpcRequest,
} from "@/lib/supabase/browser";
import styles from "./LiveNoticeComposerWeb.module.css";

export type LiveNoticeObjectType = "trip" | "event" | "community";

type Row = Record<string, unknown>;

type ComposerState = {
  planCode: "free" | "premium" | "ultimate";
  dailyLimit: number;
  dailyUsed: number;
  remainingToday: number;
  isOwner: boolean;
  objectOpen: boolean;
  activeNoticeId: string | null;
  activeObjectId: string | null;
  activeExpiresAt: string | null;
  sameObjectNextAt: string | null;
  dailyResetAt: string | null;
  canPost: boolean;
  reason: string;
};

type NoticeHistory = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  expiresAt: string;
  isActive: boolean;
};

const EMOJIS = ["🧳", "✈️", "☕", "📸", "🎉", "🎵", "🏕️", "🤝", "🚗", "🏖️", "🏔️", "🍜", "🚲", "🎪", "❤️", "🐶", "🐱", "🌅", "🛶", "🎯", "🍃"];

function rowsOf(value: unknown): Row[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is Row => Boolean(item) && typeof item === "object" && !Array.isArray(item));
  }
  if (value && typeof value === "object") return [value as Row];
  return [];
}

function text(row: Row | null | undefined, key: string, fallback = "") {
  const value = row?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function numberValue(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function booleanValue(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function nullableText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function charCount(value: string) {
  return Array.from(value).length;
}

function limitChars(value: string, max: number) {
  return Array.from(value).slice(0, max).join("");
}

function cleanSingleLine(value: string, max: number) {
  return limitChars(value.replace(/\s*\n+\s*/g, " "), max);
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

function formatDateTime(value: string | null | undefined, locale: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(localeTag(locale), {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function targetHref(type: LiveNoticeObjectType, id: string) {
  if (type === "community") return `/community/${id}`;
  return `/${type}s/${id}`;
}

type ComposerCopy = (typeof liveNoticeComposerCopy)[keyof typeof liveNoticeComposerCopy];

function typeLabel(type: LiveNoticeObjectType, copy: ComposerCopy) {
  if (type === "event") return copy.typeEvent;
  if (type === "community") return copy.typeCommunity;
  return copy.typeTrip;
}

function mapComposerState(value: unknown): ComposerState {
  const row = rowsOf(value)[0] ?? {};
  const plan = text(row, "plan_code", "free").toLowerCase();
  return {
    planCode: plan === "premium" || plan === "ultimate" ? plan : "free",
    dailyLimit: numberValue(row.daily_limit, 3),
    dailyUsed: numberValue(row.daily_used, 0),
    remainingToday: numberValue(row.remaining_today, 0),
    isOwner: booleanValue(row.is_owner),
    objectOpen: booleanValue(row.object_open),
    activeNoticeId: nullableText(row.active_notice_id),
    activeObjectId: nullableText(row.active_object_id),
    activeExpiresAt: nullableText(row.active_expires_at),
    sameObjectNextAt: nullableText(row.same_object_next_at),
    dailyResetAt: nullableText(row.daily_reset_at),
    canPost: booleanValue(row.can_post),
    reason: text(row, "reason", "ok"),
  };
}

function mapHistory(value: unknown): NoticeHistory[] {
  return rowsOf(value).slice(0, 10).map((row) => ({
    id: text(row, "id"),
    title: text(row, "title"),
    body: text(row, "body"),
    createdAt: text(row, "created_at"),
    expiresAt: text(row, "expires_at"),
    isActive: booleanValue(row.is_active, false),
  })).filter((notice) => Boolean(notice.id && notice.title));
}

async function loadTargetTitle(type: LiveNoticeObjectType, id: string) {
  const table = type === "trip" ? "trips" : type === "event" ? "events" : "communities";
  const titleColumn = type === "community" ? "name" : "title";
  const result = await restSelect<Row[]>(
    table,
    `select=id,${titleColumn}&id=eq.${encodeURIComponent(id)}&limit=1`,
  );
  if (result.error) throw new Error(result.error);
  const row = rowsOf(result.data)[0];
  return text(row, titleColumn);
}

function replaceTokens(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (current, [key, value]) => current.replace(`{${key}}`, String(value)),
    template,
  );
}

export default function LiveNoticeComposerWeb({
  objectType,
  objectId,
}: {
  objectType: LiveNoticeObjectType;
  objectId: string;
}) {
  const router = useRouter();
  const { locale } = useLocale();
  const copy = liveNoticeComposerCopy[locale];
  const [targetTitle, setTargetTitle] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [activeField, setActiveField] = useState<"title" | "body">("title");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [state, setState] = useState<ComposerState | null>(null);
  const [history, setHistory] = useState<NoticeHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    if (!objectId) {
      setError(copy.missingTarget);
      setLoading(false);
      return;
    }
    if (!isSupabaseConfigured()) {
      setError(copy.loadFailed);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const user = await getCurrentUser();
      if (!user) {
        router.replace("/login");
        return;
      }

      const [titleResult, stateResult, historyResult] = await Promise.all([
        loadTargetTitle(objectType, objectId),
        rpcRequest<unknown>("get_melo_live_notice_composer_state", {
          p_object_type: objectType,
          p_object_id: objectId,
          p_client_tz_offset_minutes: -new Date().getTimezoneOffset(),
        }),
        rpcRequest<unknown>("list_my_melo_live_notice_history", {
          p_object_type: objectType,
          p_object_id: objectId,
          p_limit: 10,
        }),
      ]);

      if (stateResult.error) throw new Error(stateResult.error);
      if (historyResult.error) throw new Error(historyResult.error);

      setTargetTitle(titleResult || typeLabel(objectType, copy));
      setState(mapComposerState(stateResult.data));
      setHistory(mapHistory(historyResult.data));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : copy.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [copy, objectId, objectType, router]);

  useEffect(() => {
    void load();
  }, [load]);

  const helperMessage = useMemo(() => {
    if (!state) return "";
    if (state.reason === "not_owner") return copy.stateNotOwner;
    if (state.reason === "object_closed") return copy.stateClosed;
    if (state.reason === "object_cooldown") {
      return replaceTokens(copy.stateCooldown, {
        time: formatDateTime(state.sameObjectNextAt, locale),
      });
    }
    if (state.reason === "daily_limit") {
      return replaceTokens(copy.stateDailyLimit, {
        limit: state.dailyLimit,
        time: formatDateTime(state.dailyResetAt, locale),
      });
    }
    if (state.activeNoticeId && state.activeObjectId) return copy.stateReplaceActive;
    return copy.stateReady;
  }, [copy, locale, state]);

  function addEmoji(emoji: string) {
    if (activeField === "body") setBody((current) => limitChars(`${current}${emoji}`, 100));
    else setTitle((current) => limitChars(`${current}${emoji}`, 45));
  }

  function reuseHistoryNotice(notice: NoticeHistory) {
    setTitle(limitChars(notice.title, 45));
    setBody(limitChars(notice.body, 100));
    setActiveField("title");
    setEmojiOpen(false);
    document.getElementById("live-notice-composer")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function translatedError(message: string) {
    if (message.includes("LIVE_NOTICE_TITLE_REQUIRED")) return copy.titleRequired;
    if (message.includes("LIVE_NOTICE_BLOCKED:not_owner")) return copy.stateNotOwner;
    if (message.includes("LIVE_NOTICE_BLOCKED:object_closed")) return copy.stateClosed;
    if (message.includes("LIVE_NOTICE_BLOCKED:object_cooldown")) return copy.stateCooldown.replace("{time}", formatDateTime(state?.sameObjectNextAt, locale));
    if (message.includes("LIVE_NOTICE_BLOCKED:daily_limit")) return copy.stateDailyLimit
      .replace("{limit}", String(state?.dailyLimit ?? ""))
      .replace("{time}", formatDateTime(state?.dailyResetAt, locale));
    return message.replace("LIVE_NOTICE_BLOCKED:", "");
  }

  async function publish() {
    if (posting || !state?.canPost) return;
    const cleanTitle = title.trim();
    const cleanBody = body.trim();
    if (!cleanTitle) {
      setError(copy.titleRequired);
      return;
    }

    setPosting(true);
    setError("");
    setSuccess("");
    try {
      const result = await rpcRequest<unknown>("create_melo_live_notice", {
        p_object_type: objectType,
        p_object_id: objectId,
        p_title: cleanTitle,
        p_body: cleanBody,
        p_client_tz_offset_minutes: -new Date().getTimezoneOffset(),
      });
      if (result.error) throw new Error(result.error);

      setTitle("");
      setBody("");
      setEmojiOpen(false);
      setSuccess(`${copy.publishedTitle} — ${copy.publishedBody}`);
      await load();
      window.setTimeout(() => setSuccess(""), 4800);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : copy.publishFailed;
      const localizedMessage = translatedError(message);
      await load().catch(() => undefined);
      setError(localizedMessage);
    } finally {
      setPosting(false);
    }
  }

  const planLabel = state?.planCode === "premium"
    ? "PREMIUM"
    : state?.planCode === "ultimate"
      ? "ULTIMATE"
      : "FREE";
  const fallbackTarget = typeLabel(objectType, copy);

  return (
    <main className={styles.page}>
      <Header />
      <section className={styles.shell}>
        <div className={styles.topline}>
          <Link href={targetHref(objectType, objectId)} className={styles.backLink}>‹ {copy.back}</Link>
          <div className={styles.livePill}><i /> LIVE</div>
        </div>

        <header className={styles.pageHead}>
          <div>
            <span>{copy.subtitle}</span>
            <h1>{copy.liveNotice}</h1>
          </div>
        </header>

        {loading ? (
          <div className={styles.centerState}><span className={styles.spinner} />{copy.loading}</div>
        ) : error && !state ? (
          <div className={styles.errorState}>
            <strong>{copy.loadFailed}</strong>
            <p>{error}</p>
            <button type="button" onClick={() => void load()}>{copy.retry}</button>
          </div>
        ) : (
          <div className={styles.layout}>
            <div className={styles.mainColumn}>
              <section className={styles.targetCard}>
                <div className={styles.targetMeta}>
                  <span className={styles.targetType}>{typeLabel(objectType, copy).toUpperCase()}</span>
                  <span className={styles.targetLive}>● LIVE</span>
                </div>
                <h2>{targetTitle || fallbackTarget}</h2>
                <p>{copy.targetHint}</p>
              </section>

              <section id="live-notice-composer" className={styles.formCard}>
                <div className={styles.fieldHead}>
                  <label htmlFor="live-notice-title">{copy.titleLabel}</label>
                  <span>{charCount(title)}/45</span>
                </div>
                <textarea
                  id="live-notice-title"
                  rows={2}
                  value={title}
                  onFocus={() => setActiveField("title")}
                  onChange={(event) => setTitle(cleanSingleLine(event.target.value, 45))}
                  placeholder={copy.titlePlaceholder}
                  disabled={!state?.canPost || posting}
                />

                <div className={styles.fieldHead}>
                  <label htmlFor="live-notice-body">{copy.bodyLabel}</label>
                  <span>{charCount(body)}/100</span>
                </div>
                <textarea
                  id="live-notice-body"
                  rows={3}
                  value={body}
                  onFocus={() => setActiveField("body")}
                  onChange={(event) => setBody(cleanSingleLine(event.target.value, 100))}
                  placeholder={copy.bodyPlaceholder}
                  disabled={!state?.canPost || posting}
                />

                <div className={styles.composerActions}>
                  <button
                    type="button"
                    className={styles.emojiButton}
                    onClick={() => setEmojiOpen((current) => !current)}
                    disabled={!state?.canPost || posting}
                    aria-expanded={emojiOpen}
                    aria-label="Emoji"
                  >
                    ☺
                  </button>
                  <button
                    type="button"
                    className={styles.publishButton}
                    disabled={posting || !state?.canPost || !title.trim()}
                    onClick={() => void publish()}
                  >
                    {posting ? copy.publishing : copy.publish}
                  </button>
                </div>

                {emojiOpen ? (
                  <div className={styles.emojiGrid}>
                    {EMOJIS.map((emoji) => (
                      <button key={emoji} type="button" onClick={() => addEmoji(emoji)}>{emoji}</button>
                    ))}
                  </div>
                ) : null}
              </section>

              {success ? <div className={styles.success}>{success}</div> : null}
              {error && state ? <div className={styles.inlineError}>{error}</div> : null}

              <section className={styles.historySection}>
                <div className={styles.sectionHead}>
                  <h2>{copy.historyTitle}</h2>
                  <span>{copy.historyHint}</span>
                </div>
                <div className={styles.historyList}>
                  {history.length ? history.map((notice) => (
                    <article key={notice.id} className={styles.historyCard}>
                      <div className={styles.historyTop}>
                        <span className={notice.isActive ? styles.activeBadge : styles.expiredBadge}>
                          {notice.isActive ? copy.active : copy.expired}
                        </span>
                        <time>{formatDateTime(notice.createdAt, locale)}</time>
                      </div>
                      <h3>{notice.title}</h3>
                      {notice.body ? <p>{notice.body}</p> : null}
                      {notice.isActive ? <small>{copy.showUntil} {formatDateTime(notice.expiresAt, locale)}</small> : null}
                      <button type="button" onClick={() => reuseHistoryNotice(notice)}>
                        ↥ {copy.reuse}
                      </button>
                    </article>
                  )) : <div className={styles.emptyHistory}>{copy.emptyHistory}</div>}
                </div>
              </section>
            </div>

            <aside className={styles.sideColumn}>
              <section className={styles.quotaCard}>
                <div><span>{copy.package}</span><strong>{planLabel}</strong></div>
                <div><span>{copy.today}</span><strong>{state?.dailyUsed ?? 0}/{state?.dailyLimit ?? 3}</strong></div>
                <div><span>{copy.remaining}</span><strong>{state?.remainingToday ?? 0}</strong></div>
              </section>

              <section className={`${styles.statusCard} ${state?.canPost ? styles.statusGood : styles.statusBlocked}`}>
                <i />
                <p>{helperMessage}</p>
              </section>

              <section className={styles.rulesCard}>
                <h2>{copy.rulesTitle}</h2>
                <ul>
                  <li>{copy.ruleActive}</li>
                  <li>{copy.ruleCooldown}</li>
                  <li>{copy.ruleQuota}</li>
                  <li>{copy.ruleClosed}</li>
                </ul>
              </section>
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}
