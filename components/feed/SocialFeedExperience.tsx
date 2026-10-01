"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import VerifiedUserAvatar from "@/components/profile/VerifiedUserAvatar";
import SocialPostComposerModal from "./SocialPostComposerModal";
import ShareSocialPostModal from "./ShareSocialPostModal";
import LiveNoticeRail from "@/components/live-notice/LiveNoticeRail";
import { useLocale } from "@/components/SiteProviders";
import { loadFriendSnapshot, loadLoveSnapshot, type DatingProfileWeb, type FriendCandidateWeb } from "@/components/connect/connectData";
import { publicStorageUrl, restSelect, rpcRequest } from "@/lib/supabase/browser";
import { GLOBAL_COUNTRY_SCOPE, matchesCountryScope } from "@/lib/discoveryCountry";
import {
  deleteSocialPostWeb,
  loadFeedViewer,
  loadSocialFeedWeb,
  loadSocialPostCommentsWeb,
  createSocialPostCommentWeb,
  reportSocialPostWeb,
  toggleSocialPostLikeWeb,
  toggleSocialPostSaveWeb,
  type FeedViewer,
  type SocialFeedPost,
  type SocialPostComment,
} from "./socialFeedWebData";
import styles from "./SocialFeedExperience.module.css";

type CommunitySuggestion = {
  id: string;
  title: string;
  category: string;
  imageUrl: string;
  memberCount: number;
};

type ActivitySuggestion = {
  id: string;
  title: string;
  subtitle: string;
  dateValue: string;
  imageUrl: string;
  href: string;
  country: string;
};

const COPY = {
  th: {
    kicker: "MELO SOCIAL", title: "ฟีดสังคม",
    subtitle: "เรื่องราว ประสบการณ์ และโพสต์ล่าสุดจากสมาชิก Melo",
    forYou: "สำหรับคุณ", latest: "ล่าสุด", saved: "บันทึกไว้",
    composer: "คุณกำลังคิดอะไรอยู่...", create: "สร้างโพสต์", refresh: "รีเฟรช",
    like: "ถูกใจ", comment: "ความคิดเห็น", save: "บันทึก", savedDone: "บันทึกแล้ว", share: "แชร์",
    comments: "ความคิดเห็น", commentPlaceholder: "เขียนความคิดเห็น...", send: "ส่ง", noComments: "ยังไม่มีความคิดเห็น",
    empty: "ยังไม่มีโพสต์ในฟีด", emptySaved: "ยังไม่มีโพสต์ที่บันทึกไว้",
    suggestedFriends: "เพื่อนแนะนำ", suggestedLove: "คู่รักแนะนำ", suggestedCommunities: "คอมมูนิตี้แนะนำ", suggestedTrips: "ทริปแนะนำ", suggestedEvents: "กิจกรรมแนะนำ", seeAll: "ดูทั้งหมด",
    home: "หน้าหลัก", profile: "โปรไฟล์", trips: "ทริป", events: "กิจกรรม", communities: "คอมมูนิตี้", passport: "พาสปอร์ต & เหรียญตรา",
    public: "สาธารณะ", friends: "เพื่อน", love: "คู่รัก", onlyMe: "เฉพาะฉัน", previous: "ก่อนหน้า", next: "ถัดไป",
    member: "สมาชิก", noSuggestions: "ยังไม่มีคำแนะนำ", copied: "คัดลอกลิงก์แล้ว",
    report: "รายงานโพสต์", editPost: "แก้ไขโพสต์", delete: "ลบโพสต์", cancel: "ยกเลิก",
    reportDone: "ส่งรายงานแล้ว", deleted: "ลบโพสต์แล้ว",
    actionFailed: "ดำเนินการไม่สำเร็จ", loading: "กำลังโหลดฟีด…",
  },
  en: {
    kicker: "MELO SOCIAL", title: "Social Feed",
    subtitle: "Stories, experiences and latest posts from the Melo community",
    forYou: "For you", latest: "Latest", saved: "Saved",
    composer: "What are you thinking about?", create: "Create post", refresh: "Refresh",
    like: "Like", comment: "Comment", save: "Save", savedDone: "Saved", share: "Share",
    comments: "Comments", commentPlaceholder: "Write a comment...", send: "Send", noComments: "No comments yet",
    empty: "No posts in your feed yet", emptySaved: "No saved posts yet",
    suggestedFriends: "Suggested friends", suggestedLove: "Suggested matches", suggestedCommunities: "Suggested communities", suggestedTrips: "Suggested trips", suggestedEvents: "Suggested events", seeAll: "See all",
    home: "Home", profile: "Profile", trips: "Trips", events: "Events", communities: "Communities", passport: "Passport & Badges",
    public: "Public", friends: "Friends", love: "Love", onlyMe: "Only me", previous: "Previous", next: "Next",
    member: "members", noSuggestions: "No suggestions yet", copied: "Link copied",
    report: "Report post", editPost: "Edit post", delete: "Delete post", cancel: "Cancel",
    reportDone: "Report sent", deleted: "Post deleted",
    actionFailed: "Action failed", loading: "Loading feed…",
  },
  de: {
    kicker: "MELO SOCIAL", title: "Social Feed",
    subtitle: "Geschichten, Erfahrungen und neue Beiträge aus der Melo-Community",
    forYou: "Für dich", latest: "Neueste", saved: "Gespeichert",
    composer: "Woran denkst du gerade?", create: "Beitrag erstellen", refresh: "Aktualisieren",
    like: "Gefällt mir", comment: "Kommentar", save: "Speichern", savedDone: "Gespeichert", share: "Teilen",
    comments: "Kommentare", commentPlaceholder: "Kommentar schreiben...", send: "Senden", noComments: "Noch keine Kommentare",
    empty: "Noch keine Beiträge", emptySaved: "Noch keine gespeicherten Beiträge",
    suggestedFriends: "Empfohlene Freunde", suggestedLove: "Empfohlene Partner", suggestedCommunities: "Empfohlene Communities", suggestedTrips: "Empfohlene Reisen", suggestedEvents: "Empfohlene Events", seeAll: "Alle ansehen",
    home: "Startseite", profile: "Profil", trips: "Reisen", events: "Events", communities: "Communities", passport: "Reisepass & Abzeichen",
    public: "Öffentlich", friends: "Freunde", love: "Liebe", onlyMe: "Nur ich", previous: "Zurück", next: "Weiter",
    member: "Mitglieder", noSuggestions: "Noch keine Empfehlungen", copied: "Link kopiert",
    report: "Beitrag melden", editPost: "Beitrag bearbeiten", delete: "Beitrag löschen", cancel: "Abbrechen",
    reportDone: "Meldung gesendet", deleted: "Beitrag gelöscht",
    actionFailed: "Aktion fehlgeschlagen", loading: "Feed wird geladen…",
  },
  zh: {
    kicker: "MELO SOCIAL", title: "社交动态",
    subtitle: "来自 Melo 社区的故事、体验与最新帖子",
    forYou: "为你推荐", latest: "最新", saved: "已保存",
    composer: "你在想什么？", create: "创建帖子", refresh: "刷新",
    like: "赞", comment: "评论", save: "保存", savedDone: "已保存", share: "分享",
    comments: "评论", commentPlaceholder: "写一条评论...", send: "发送", noComments: "暂无评论",
    empty: "动态中暂无帖子", emptySaved: "暂无已保存帖子",
    suggestedFriends: "推荐好友", suggestedLove: "推荐配对", suggestedCommunities: "推荐社区", suggestedTrips: "推荐旅行", suggestedEvents: "推荐活动", seeAll: "查看全部",
    home: "首页", profile: "个人资料", trips: "旅行", events: "活动", communities: "社区", passport: "护照与徽章",
    public: "公开", friends: "好友", love: "恋爱", onlyMe: "仅自己", previous: "上一张", next: "下一张",
    member: "成员", noSuggestions: "暂无推荐", copied: "链接已复制",
    report: "举报帖子", editPost: "编辑帖子", delete: "删除帖子", cancel: "取消",
    reportDone: "举报已发送", deleted: "帖子已删除",
    actionFailed: "操作失败", loading: "正在加载动态…",
  },
  ja: {
    kicker: "MELO SOCIAL", title: "ソーシャルフィード",
    subtitle: "Meloコミュニティのストーリー、体験、最新投稿",
    forYou: "おすすめ", latest: "最新", saved: "保存済み",
    composer: "今、何を考えていますか？", create: "投稿を作成", refresh: "更新",
    like: "いいね", comment: "コメント", save: "保存", savedDone: "保存済み", share: "シェア",
    comments: "コメント", commentPlaceholder: "コメントを書く...", send: "送信", noComments: "まだコメントはありません",
    empty: "フィードに投稿がありません", emptySaved: "保存済み投稿はありません",
    suggestedFriends: "おすすめの友達", suggestedLove: "おすすめの相手", suggestedCommunities: "おすすめCommunity", suggestedTrips: "おすすめTrip", suggestedEvents: "おすすめEvent", seeAll: "すべて見る",
    home: "ホーム", profile: "プロフィール", trips: "Trip", events: "Event", communities: "Community", passport: "パスポート & バッジ",
    public: "公開", friends: "友達", love: "恋愛", onlyMe: "自分のみ", previous: "前へ", next: "次へ",
    member: "メンバー", noSuggestions: "おすすめはまだありません", copied: "リンクをコピーしました",
    report: "投稿を報告", editPost: "投稿を編集", delete: "投稿を削除", cancel: "キャンセル",
    reportDone: "報告しました", deleted: "投稿を削除しました",
    actionFailed: "操作に失敗しました", loading: "フィードを読み込み中…",
  },
  ko: {
    kicker: "MELO SOCIAL", title: "소셜 피드",
    subtitle: "Melo 커뮤니티의 이야기, 경험과 최신 게시물",
    forYou: "추천", latest: "최신", saved: "저장됨",
    composer: "무슨 생각을 하고 있나요?", create: "게시물 만들기", refresh: "새로고침",
    like: "좋아요", comment: "댓글", save: "저장", savedDone: "저장됨", share: "공유",
    comments: "댓글", commentPlaceholder: "댓글 작성...", send: "보내기", noComments: "아직 댓글이 없습니다",
    empty: "피드에 게시물이 없습니다", emptySaved: "저장한 게시물이 없습니다",
    suggestedFriends: "추천 친구", suggestedLove: "추천 인연", suggestedCommunities: "추천 커뮤니티", suggestedTrips: "추천 여행", suggestedEvents: "추천 이벤트", seeAll: "전체 보기",
    home: "홈", profile: "프로필", trips: "여행", events: "이벤트", communities: "커뮤니티", passport: "패스포트 & 배지",
    public: "공개", friends: "친구", love: "연애", onlyMe: "나만 보기", previous: "이전", next: "다음",
    member: "멤버", noSuggestions: "추천이 없습니다", copied: "링크가 복사되었습니다",
    report: "게시물 신고", editPost: "게시물 수정", delete: "게시물 삭제", cancel: "취소",
    reportDone: "신고되었습니다", deleted: "게시물이 삭제되었습니다",
    actionFailed: "작업에 실패했습니다", loading: "피드 불러오는 중…",
  },
} as const;

function rowsOf(value: unknown): Record<string, any>[] {
  if (Array.isArray(value)) return value.filter((item) => item && typeof item === "object");
  if (value && typeof value === "object") return [value as Record<string, any>];
  return [];
}

function text(row: Record<string, any>, ...keys: string[]) {
  for (const key of keys) {
    const value = row?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function numberValue(row: Record<string, any>, ...keys: string[]) {
  for (const key of keys) {
    const value = Number(row?.[key]);
    if (Number.isFinite(value)) return value;
  }
  return 0;
}

function communityImage(row: Record<string, any>) {
  const raw = text(
    row,
    "image_path",
    "cover_image_path",
    "cover_path",
    "image_url",
    "cover_url",
    "photo_url",
    "thumbnail_url",
  );
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;

  // Keep compatibility with rows that already include a storage bucket prefix.
  const normalized = raw.replace(/^\/+/, "");
  if (normalized.startsWith("activity-images/")) {
    return publicStorageUrl("activity-images", normalized.slice("activity-images/".length));
  }
  if (normalized.startsWith("community-images/")) {
    return publicStorageUrl("community-images", normalized.slice("community-images/".length));
  }
  return publicStorageUrl("activity-images", normalized);
}

function mergeCommunityRows(rows: Record<string, any>[]) {
  const merged = new Map<string, Record<string, any>>();

  for (const row of rows) {
    const id = text(row, "id", "community_id");
    if (!id) continue;

    // get_my_communities can return a smaller projection than get_communities.
    // Merge only meaningful values so null/empty membership fields never erase
    // the public community cover, title, category or location fields.
    const next = { ...(merged.get(id) || {}) };
    for (const [key, value] of Object.entries(row)) {
      if (value === null || value === undefined || value === "") continue;
      next[key] = value;
    }
    merged.set(id, next);
  }

  return [...merged.values()];
}

async function loadCommunitySuggestions(countryScope: string): Promise<CommunitySuggestion[]> {
  const results = await Promise.all([
    rpcRequest<Record<string, any>[]>("get_communities"),
    rpcRequest<Record<string, any>[]>("get_my_communities"),
  ]);

  const rpcRows = [
    ...rowsOf(results[0].data),
    ...rowsOf(results[1].data),
  ];

  // Community list RPCs can omit image_path on some projections. Enrich only
  // the communities already returned by those RPCs from the base table, which
  // is the same source used by the Community detail page. select=* avoids a
  // whole request failing when optional columns differ between deployments.
  const ids = [...new Set(
    rpcRows
      .map((row) => text(row, "id", "community_id"))
      .filter(Boolean),
  )];
  let directRows: Record<string, any>[] = [];

  if (ids.length) {
    const quotedIds = ids
      .map((id) => `"${id.replace(/"/g, "")}"`)
      .join(",");
    const direct = await restSelect<Record<string, any>[]>(
      "communities",
      `select=*&id=in.(${encodeURIComponent(quotedIds)})`,
    );
    directRows = rowsOf(direct.data);
  }

  // Base-table rows go first, then RPC rows add live member/status values.
  // mergeCommunityRows ignores null/empty values, so a valid image_path from
  // the base table cannot be erased by a smaller RPC projection.
  const unique = mergeCommunityRows([
    ...directRows,
    ...rpcRows,
  ]);

  return unique
    .filter((row) => {
      const country = text(row, "country", "country_name", "country_code");
      return countryScope === GLOBAL_COUNTRY_SCOPE || !country || matchesCountryScope(country, countryScope as any);
    })
    .sort((a, b) => numberValue(b, "member_count", "members_count") - numberValue(a, "member_count", "members_count"))
    .slice(0, 4)
    .map((row) => ({
      id: text(row, "id", "community_id"),
      title: text(row, "title", "name", "community_name") || "Melo Community",
      category: text(row, "category", "category_key"),
      imageUrl: communityImage(row),
      memberCount: numberValue(row, "member_count", "members_count"),
    }))
    .filter((item) => item.id);
}


function activitySuggestionImage(row: Record<string, any>) {
  const raw = text(
    row,
    "image_path",
    "cover_image_path",
    "cover_url",
    "image_url",
    "thumbnail_path",
    "photo_path",
  );
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return publicStorageUrl("activity-images", raw);
}

function activitySuggestionDate(row: Record<string, any>) {
  return text(
    row,
    "start_date",
    "event_date",
    "departure_date",
    "date",
    "starts_at",
    "start_at",
    "start_time",
  );
}

function activitySuggestionDateLabel(value: string, locale: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(date);
}

function mergeActivityRows(
  directRows: Record<string, any>[],
  rpcRows: Record<string, any>[],
  kind: "trip" | "event",
) {
  const idKey = kind === "trip" ? "trip_id" : "event_id";
  const byId = new Map<string, Record<string, any>>();

  for (const row of [...directRows, ...rpcRows]) {
    const id = text(row, "id", idKey);
    if (!id) continue;
    const current = byId.get(id) ?? {};
    byId.set(id, { ...current, ...row });
  }

  return [...byId.values()];
}

async function attachActivityImages(
  table: "trips" | "events",
  rows: Record<string, any>[],
) {
  if (!rows.length) return rows;

  const ids = [...new Set(rows.map((row) => text(row, "id")).filter(Boolean))];
  if (!ids.length) return rows;

  const result = await restSelect<Record<string, any>[]>(
    table,
    `select=id,image_path,lifecycle_status,membership_open,archived_at,updated_at&id=in.(${ids.join(",")})`,
  );

  if (result.error || !Array.isArray(result.data)) return rows;

  const metadataMap = new Map(
    result.data.map((row) => [text(row, "id"), row] as const),
  );

  return rows.map((row) => {
    const id = text(row, "id");
    const metadata = metadataMap.get(id);
    if (!metadata) return row;

    return {
      ...row,
      image_path: text(metadata, "image_path") || text(row, "image_path"),
      lifecycle_status:
        text(metadata, "lifecycle_status") || text(row, "lifecycle_status"),
      membership_open:
        metadata.membership_open ?? row.membership_open ?? true,
      archived_at:
        metadata.archived_at ?? row.archived_at ?? null,
      updated_at:
        metadata.updated_at ?? row.updated_at ?? null,
    };
  });
}

async function loadActivitySuggestions(countryScope: string) {
  // Android does not rely on get_public_* alone for images.
  // It merges the RLS-visible base table and then re-attaches image_path from
  // trips/events because older RPC versions can omit image_path.
  const [tripResult, eventResult, tripDirect, eventDirect] = await Promise.all([
    rpcRequest<Record<string, any>[]>("get_public_trips"),
    rpcRequest<Record<string, any>[]>("get_public_events"),
    restSelect<Record<string, any>[]>(
      "trips",
      "select=*&order=created_at.desc&limit=80",
    ),
    restSelect<Record<string, any>[]>(
      "events",
      "select=*&order=created_at.desc&limit=80",
    ),
  ]);

  const mergedTrips = mergeActivityRows(
    rowsOf(tripDirect.data),
    rowsOf(tripResult.data),
    "trip",
  );
  const mergedEvents = mergeActivityRows(
    rowsOf(eventDirect.data),
    rowsOf(eventResult.data),
    "event",
  );

  const [tripRows, eventRows] = await Promise.all([
    attachActivityImages("trips", mergedTrips),
    attachActivityImages("events", mergedEvents),
  ]);

  function normalize(rows: Record<string, any>[], kind: "trip" | "event"): ActivitySuggestion[] {
    return rows
      .filter((row) => {
        const country = text(row, "country", "country_name", "destination_country", "country_code");
        const status = text(row, "status").toLowerCase();
        const lifecycle = text(row, "lifecycle_status").toLowerCase();
        const archived = Boolean(row.archived_at);
        const active =
          !archived &&
          !["closed", "cancelled", "canceled", "ended", "archived", "completed"].includes(status) &&
          !["cancelled", "canceled", "completed", "archived"].includes(lifecycle);
        const countryOk =
          countryScope === GLOBAL_COUNTRY_SCOPE ||
          !country ||
          matchesCountryScope(country, countryScope as any);
        return active && countryOk;
      })
      .map((row, index) => {
        const id = text(row, "id", kind === "trip" ? "trip_id" : "event_id") || `${kind}-${index}`;
        const country = text(row, "country", "country_name", "destination_country", "country_code");
        const place = text(
          row,
          kind === "trip" ? "destination_city" : "venue_city",
          "city",
          "province",
          "location_name",
          "destination",
          "venue_name",
        );
        const category = text(
          row,
          "category",
          kind === "trip" ? "trip_category" : "event_category",
        );

        return {
          id,
          title:
            text(row, "title", "name", kind === "trip" ? "trip_name" : "event_name") ||
            (kind === "trip" ? "Trip" : "Event"),
          subtitle: [place, category].filter(Boolean).join(" · "),
          dateValue: activitySuggestionDate(row),
          imageUrl: activitySuggestionImage(row),
          href: kind === "trip" ? `/trips/${id}` : `/events/${id}`,
          country,
        };
      })
      .sort((a, b) => {
        const at = a.dateValue ? new Date(a.dateValue).getTime() : Number.MAX_SAFE_INTEGER;
        const bt = b.dateValue ? new Date(b.dateValue).getTime() : Number.MAX_SAFE_INTEGER;
        return at - bt;
      })
      .slice(0, 3);
  }

  return {
    trips: normalize(tripRows, "trip"),
    events: normalize(eventRows, "event"),
  };
}

function timeText(value: string, locale: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale, {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(date);
}

function visibilityText(post: SocialFeedPost, copy: any) {
  if (post.visibility === "friends") return copy.friends;
  if (post.visibility === "only_me") return copy.onlyMe;
  return copy.public;
}

export default function SocialFeedExperience() {
  const { locale, countryScope } = useLocale();
  const copy = COPY[locale] ?? COPY.en;
  const router = useRouter();
  const [viewer, setViewer] = useState<FeedViewer | null>(null);
  const [mode, setMode] = useState<"foryou" | "saved">("foryou");
  const [posts, setPosts] = useState<SocialFeedPost[]>([]);
  const [friends, setFriends] = useState<FriendCandidateWeb[]>([]);
  const [loveSuggestions, setLoveSuggestions] = useState<DatingProfileWeb[]>([]);
  const [peopleSuggestionMode, setPeopleSuggestionMode] = useState<"friends" | "love">("friends");
  const loveSliderRef = useRef<HTMLDivElement | null>(null);
  const [communities, setCommunities] = useState<CommunitySuggestion[]>([]);
  const [tripSuggestions, setTripSuggestions] = useState<ActivitySuggestion[]>([]);
  const [eventSuggestions, setEventSuggestions] = useState<ActivitySuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentsPost, setCommentsPost] = useState<SocialFeedPost | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<SocialFeedPost | null>(null);
  const [sharingPost, setSharingPost] = useState<SocialFeedPost | null>(null);
  const [toast, setToast] = useState("");

  async function refresh(nextMode = mode) {
    setLoading(true);
    try {
      // Start the independent requests together. The old flow waited for the
      // viewer request first, then started every feed/sidebar request, adding
      // an unnecessary network round-trip before the page could render.
      const viewerPromise = loadFeedViewer();
      const feedPromise = loadSocialFeedWeb({
        limit: 50,
        savedOnly: nextMode === "saved",
        countryScope,
      });
      const friendPromise = loadFriendSnapshot().catch(() => ({ candidates: [], requests: [], connections: [] }));
      const communityPromise = loadCommunitySuggestions(countryScope).catch(() => [] as CommunitySuggestion[]);
      const activityPromise = loadActivitySuggestions(countryScope).catch(() => ({ trips: [], events: [] }));

      const currentViewer = await viewerPromise;
      if (!currentViewer) {
        router.replace("/login");
        return;
      }
      setViewer(currentViewer);

      const lovePromise = loadLoveSnapshot(currentViewer.id).catch(() => null);

      // The center feed is the primary content. Show it as soon as it is ready
      // instead of keeping the whole page in a loading state until every
      // recommendation sidebar request has finished.
      const feed = await feedPromise;
      setPosts(feed);
      setLoading(false);

      const [friendSnapshot, loveSnapshot, communityRows, activitySuggestions] = await Promise.all([
        friendPromise,
        lovePromise,
        communityPromise,
        activityPromise,
      ]);

      setFriends(friendSnapshot.candidates.slice(0, 4));
      setLoveSuggestions(loveSnapshot?.recommended.slice(0, 6) ?? []);
      setCommunities(communityRows);
      setTripSuggestions(activitySuggestions.trips);
      setEventSuggestions(activitySuggestions.events);
    } catch (error) {
      flash(error instanceof Error ? error.message : copy.actionFailed);
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh(mode);
  }, [countryScope, mode]);

  useEffect(() => {
    const handleFeedUpdated = () => { void refresh(mode); };
    window.addEventListener("melo-feed-updated", handleFeedUpdated);
    return () => window.removeEventListener("melo-feed-updated", handleFeedUpdated);
  }, [countryScope, mode]);

  function flash(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  }

  async function like(post: SocialFeedPost) {
    try {
      const result = await toggleSocialPostLikeWeb(post.id);
      setPosts((current) => current.map((item) =>
        item.id === post.id ? { ...item, isLiked: result.isLiked, likeCount: result.likeCount } : item,
      ));
    } catch (error) {
      flash(error instanceof Error ? error.message : copy.actionFailed);
    }
  }

  async function save(post: SocialFeedPost) {
    try {
      const saved = await toggleSocialPostSaveWeb(post.id);
      setPosts((current) =>
        mode === "saved" && !saved
          ? current.filter((item) => item.id !== post.id)
          : current.map((item) => item.id === post.id ? { ...item, isSaved: saved } : item),
      );
    } catch (error) {
      flash(error instanceof Error ? error.message : copy.actionFailed);
    }
  }

  async function remove(post: SocialFeedPost) {
    if (!window.confirm(copy.delete)) return;
    try {
      await deleteSocialPostWeb(post.id);
      setPosts((current) => current.filter((item) => item.id !== post.id));
      flash(copy.deleted);
    } catch (error) {
      flash(error instanceof Error ? error.message : copy.actionFailed);
    }
  }

  async function report(post: SocialFeedPost) {
    if (!window.confirm(copy.report)) return;
    try {
      await reportSocialPostWeb(post.id);
      flash(copy.reportDone);
    } catch (error) {
      flash(error instanceof Error ? error.message : copy.actionFailed);
    }
  }

  const loopingFriends = friends.length > 1 ? [...friends, ...friends] : friends;
  const friendTickerDuration = `${Math.max(14, friends.length * 3.4)}s`;

  function slideLove(direction: -1 | 1) {
    const slider = loveSliderRef.current;
    if (!slider) return;
    slider.scrollBy({ left: direction * slider.clientWidth, behavior: "smooth" });
  }

  return (
    <main className={styles.page}>
      <Header />
      {toast ? <div className={styles.toast}>{toast}</div> : null}

      <section className={styles.shell}>
        <LiveNoticeRail />
        <div className={styles.layout}>
          <aside className={styles.leftRail}>
            {viewer ? (
              <Link href="/profile" className={styles.profileCard}>
                <Avatar src={viewer.avatarUrl} name={viewer.name} userId={viewer.id} country={viewer.country} />
                <div className={styles.profileCardCopy}>
                  <strong>{viewer.name}</strong>
                  <small>{[viewer.city, viewer.country].filter(Boolean).join(" · ")}</small>
                </div>
              </Link>
            ) : null}

            <Suggestion title={copy.suggestedTrips} href="/trips" seeAll={copy.seeAll}>
              <ActivitySuggestionList items={tripSuggestions} locale={locale} empty={copy.noSuggestions} />
            </Suggestion>

            <Suggestion title={copy.suggestedEvents} href="/events" seeAll={copy.seeAll}>
              <ActivitySuggestionList items={eventSuggestions} locale={locale} empty={copy.noSuggestions} />
            </Suggestion>
          </aside>

          <section className={styles.center}>
            <section className={styles.composer}>
              <Avatar src={viewer?.avatarUrl || ""} name={viewer?.name || "M"} userId={viewer?.id} country={viewer?.country} />
              <button type="button" className={styles.composerInput} onClick={() => setComposerOpen(true)}>
                {copy.composer}
              </button>
            </section>

            <nav className={styles.tabs}>
              <button className={mode === "foryou" ? styles.activeTab : ""} onClick={() => setMode("foryou")}>{copy.forYou}</button>
              <button className={mode === "saved" ? styles.activeTab : ""} onClick={() => setMode("saved")}>{copy.saved}</button>
            </nav>

            {loading ? (
              <div className={styles.state}>{copy.loading}</div>
            ) : posts.length ? (
              <div className={styles.feed}>
                {posts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    locale={locale}
                    copy={copy}
                    onLike={() => like(post)}
                    onComment={() => setCommentsPost(post)}
                    onSave={() => save(post)}
                    onShare={() => setSharingPost(post)}
                    onEdit={() => setEditingPost(post)}
                    onDelete={() => remove(post)}
                    onReport={() => report(post)}
                  />
                ))}
              </div>
            ) : (
              <div className={styles.state}>{mode === "saved" ? copy.emptySaved : copy.empty}</div>
            )}
          </section>

          <aside className={styles.rightRail}>
            <section className={`${styles.suggestionCard} ${styles.peopleSuggestionCard}`}>
              <header className={styles.peopleSuggestionHeader}>
                <div className={styles.peopleSuggestionTabs} role="tablist" aria-label={`${copy.suggestedFriends} / ${copy.suggestedLove}`}>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={peopleSuggestionMode === "friends"}
                    className={peopleSuggestionMode === "friends" ? styles.peopleSuggestionTabActive : ""}
                    onClick={() => setPeopleSuggestionMode("friends")}
                  >
                    {copy.friends}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={peopleSuggestionMode === "love"}
                    className={peopleSuggestionMode === "love" ? styles.peopleSuggestionTabActive : ""}
                    onClick={() => setPeopleSuggestionMode("love")}
                  >
                    {copy.love}
                  </button>
                </div>
                <Link href={peopleSuggestionMode === "friends" ? "/friends" : "/love"}>{copy.seeAll}</Link>
              </header>

              {peopleSuggestionMode === "friends" ? (
                friends.length ? (
                  <div className={styles.friendTickerViewport} style={{ ["--ticker-duration" as any]: friendTickerDuration }}>
                    <div className={`${styles.friendTickerTrack} ${friends.length > 1 ? styles.friendTickerAnimated : ""}`}>
                      {loopingFriends.map((friend, index) => (
                        <Link href={`/users/${friend.userId}`} className={`${styles.suggestRow} ${styles.friendTickerRow}`} key={`${friend.userId}-${index}`}>
                          <Avatar src={friend.photoUrl} name={friend.displayName} userId={friend.userId} country={friend.country} />
                          <div>
                            <strong>{friend.displayName}{friend.age ? `, ${friend.age}` : ""}</strong>
                            <small>{[friend.city, friend.country].filter(Boolean).join(" · ")}</small>
                          </div>
                          {friend.matchScore ? <b>{Math.round(friend.matchScore)}%</b> : null}
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : <div className={styles.miniEmpty}>{copy.noSuggestions}</div>
              ) : (
                loveSuggestions.length ? (
                  <div className={styles.loveSuggestionSliderWrap}>
                    <div ref={loveSliderRef} className={styles.loveSuggestionSlider}>
                      {loveSuggestions.map((profile) => {
                        const meta = [profile.city, profile.country].filter(Boolean).join(" · ");
                        return (
                          <Link href={`/users/${profile.id}`} className={styles.loveSuggestionCard} key={profile.id} aria-label={`${profile.name}${profile.age ? `, ${profile.age}` : ""}`}>
                            <VerifiedUserAvatar
                              userId={profile.id}
                              name={profile.name}
                              src={profile.photoUrls[0] || ""}
                              country={profile.country}
                              nationality={profile.nationality}
                              className={styles.loveSuggestionAvatar}
                              shape="rounded"
                              badgeSize={20}
                            />
                            <span className={styles.loveSuggestionShade} />
                            <span className={styles.loveSuggestionInfo}>
                              <strong>{profile.name}{profile.age ? `, ${profile.age}` : ""}</strong>
                              {meta ? <small>{meta}</small> : null}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                    {loveSuggestions.length > 1 ? (
                      <>
                        <button type="button" className={`${styles.loveSliderButton} ${styles.loveSliderPrevious}`} aria-label={copy.previous} onClick={() => slideLove(-1)}>‹</button>
                        <button type="button" className={`${styles.loveSliderButton} ${styles.loveSliderNext}`} aria-label={copy.next} onClick={() => slideLove(1)}>›</button>
                      </>
                    ) : null}
                  </div>
                ) : <div className={styles.miniEmpty}>{copy.noSuggestions}</div>
              )}
            </section>

            <Suggestion title={copy.suggestedCommunities} href="/community" seeAll={copy.seeAll}>
              {communities.length ? communities.map((item) => (
                <Link href={`/community/${item.id}`} className={`${styles.suggestRow} ${styles.communityRow}`} key={item.id}>
                  <span className={styles.hitBadge}>Hit</span>
                  <Avatar src={item.imageUrl} name={item.title} square />
                  <div>
                    <strong>{item.title}</strong>
                    <small>{item.memberCount ? `${item.memberCount} ${copy.member}` : item.category}</small>
                  </div>
                </Link>
              )) : <div className={styles.miniEmpty}>{copy.noSuggestions}</div>}
            </Suggestion>
          </aside>
        </div>
      </section>

      <SocialPostComposerModal
        open={composerOpen || Boolean(editingPost)}
        post={editingPost}
        onClose={() => { setComposerOpen(false); setEditingPost(null); }}
        onSaved={async () => { setComposerOpen(false); setEditingPost(null); await refresh(mode); }}
      />

      <ShareSocialPostModal
        open={Boolean(sharingPost)}
        post={sharingPost}
        onClose={() => setSharingPost(null)}
        onShared={(shareCount) => {
          if (!sharingPost) return;
          setPosts((current) => current.map((item) => item.id === sharingPost.id ? { ...item, shareCount } : item));
        }}
      />

      {commentsPost ? (
        <CommentsDrawer
          post={commentsPost}
          locale={locale}
          copy={copy}
          onClose={() => setCommentsPost(null)}
          onCount={(count) => setPosts((current) => current.map((item) =>
            item.id === commentsPost.id ? { ...item, commentCount: count } : item,
          ))}
        />
      ) : null}
    </main>
  );
}

function Avatar({ src, name, square = false, userId, country, nationality }: { src: string; name: string; square?: boolean; userId?: string | null; country?: string | null; nationality?: string | null }) {
  if (userId) {
    return <VerifiedUserAvatar userId={userId} src={src} name={name} country={country} nationality={nationality} className={`${styles.avatar} ${square ? styles.squareAvatar : ""}`} shape={square ? "rounded" : "circle"} />;
  }
  return (
    <span className={`${styles.avatar} ${square ? styles.squareAvatar : ""}`}>
      {src ? <img src={src} alt="" /> : <b>{name.slice(0, 1).toUpperCase()}</b>}
    </span>
  );
}


function ActivitySuggestionList({
  items,
  locale,
  empty,
}: {
  items: ActivitySuggestion[];
  locale: string;
  empty: string;
}) {
  if (!items.length) return <div className={styles.miniEmpty}>{empty}</div>;

  return (
    <div className={styles.activitySuggestionList}>
      {items.map((item) => (
        <Link href={item.href} className={styles.activitySuggestionRow} key={item.id}>
          <Avatar src={item.imageUrl} name={item.title} square />
          <div>
            <strong>{item.title}</strong>
            <small>{[activitySuggestionDateLabel(item.dateValue, locale), item.subtitle].filter(Boolean).join(" · ")}</small>
          </div>
          <span>›</span>
        </Link>
      ))}
    </div>
  );
}

function Suggestion({ title, href, seeAll, children }: { title: string; href: string; seeAll: string; children: ReactNode }) {
  return (
    <section className={styles.suggestionCard}>
      <header><h3>{title}</h3><Link href={href}>{seeAll}</Link></header>
      {children}
    </section>
  );
}

function PostCard({
  post, locale, copy, onLike, onComment, onSave, onShare, onEdit, onDelete, onReport,
}: {
  post: SocialFeedPost; locale: string; copy: any;
  onLike: () => void; onComment: () => void; onSave: () => void; onShare: () => void;
  onEdit: () => void; onDelete: () => void; onReport: () => void;
}) {
  const [index, setIndex] = useState(0);
  const image = post.images[index];

  return (
    <article className={styles.post} id={`feed-post-${post.id}`}>
      <header className={styles.postHead}>
        <Link href={`/users/${post.authorId}`}><Avatar src={post.authorPhotoUrl} name={post.authorName} userId={post.authorId} country={post.authorCountry} /></Link>
        <div className={styles.author}>
          <div className={styles.authorNameRow}>
            <Link href={`/users/${post.authorId}`}>{post.authorName}</Link>
            <span className={styles.visibility}>{visibilityText(post, copy)}</span>
          </div>
          <small>{timeText(post.createdAt, locale)}{post.authorCity || post.authorCountry ? ` · ${[post.authorCity, post.authorCountry].filter(Boolean).join(", ")}` : ""}</small>
        </div>
        <details className={styles.postMenu}>
          <summary>•••</summary>
          <div>
            {post.canManage ? (
              <>
                <button type="button" onClick={onEdit}>{copy.editPost}</button>
                <button type="button" onClick={onDelete}>{copy.delete}</button>
              </>
            ) : <button type="button" onClick={onReport}>{copy.report}</button>}
          </div>
        </details>
      </header>

      {post.title ? <h2>{post.title}</h2> : null}
      {post.body ? <p className={styles.body}>{post.body}</p> : null}

      {post.locationName || (post.latitude != null && post.longitude != null) ? (
        <div className={styles.location}>
          📍 {post.locationName || `${post.latitude!.toFixed(5)}, ${post.longitude!.toFixed(5)}`}
        </div>
      ) : null}

      {image ? (
        <div className={styles.media}>
          <img src={image.url} alt={post.title || post.authorName} />
          {post.images.length > 1 ? (
            <>
              <button type="button" className={styles.prev} onClick={() => setIndex(index <= 0 ? post.images.length - 1 : index - 1)}>‹</button>
              <button type="button" className={styles.next} onClick={() => setIndex((index + 1) % post.images.length)}>›</button>
              <span className={styles.counter}>{index + 1}/{post.images.length}</span>
            </>
          ) : null}
        </div>
      ) : null}

      {post.activityType && post.activityId ? (
        <Link href={`/${post.activityType === "community" ? "community" : `${post.activityType}s`}/${post.activityId}`} className={styles.activityCard}>
          <Avatar src={post.activityImageUrl} name={post.activityTitle || post.activityType} square />
          <div>
            <strong>{post.activityTitle || post.activityType}</strong>
            <small>{post.activitySubtitle}</small>
          </div>
          <span>›</span>
        </Link>
      ) : null}

      <div className={styles.summary}>
        <span>{post.likeCount ? `♥ ${post.likeCount}` : ""}</span>
        <span>{post.commentCount ? `${post.commentCount} ${copy.comments}` : ""}{post.shareCount ? ` · ${post.shareCount} ${copy.share}` : ""}</span>
      </div>

      <footer className={styles.actions}>
        <button className={post.isLiked ? styles.liked : ""} onClick={onLike}>{post.isLiked ? "♥" : "♡"} {copy.like}</button>
        <button onClick={onComment}>◯ {copy.comment}</button>
        <button className={post.isSaved ? styles.saved : ""} onClick={onSave}>{post.isSaved ? "◆" : "◇"} {post.isSaved ? copy.savedDone : copy.save}</button>
        <button onClick={onShare}>↗ {copy.share}</button>
      </footer>
    </article>
  );
}

export function CommentsDrawer({
  post, locale, copy, onClose, onCount,
}: {
  post: SocialFeedPost; locale: string; copy: any; onClose: () => void; onCount: (count: number) => void;
}) {
  const [comments, setComments] = useState<SocialPostComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const commentTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const textarea = commentTextareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    const style = window.getComputedStyle(textarea);
    const lineHeight = Number.parseFloat(style.lineHeight) || 21;
    const padding = (Number.parseFloat(style.paddingTop) || 0) + (Number.parseFloat(style.paddingBottom) || 0);
    const border = (Number.parseFloat(style.borderTopWidth) || 0) + (Number.parseFloat(style.borderBottomWidth) || 0);
    const maxHeight = (lineHeight * 7) + padding + border;
    const nextHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [body]);

  async function load() {
    setLoading(true);
    try {
      const rows = await loadSocialPostCommentsWeb(post.id);
      setComments(rows);
      onCount(rows.length);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [post.id]);

  async function send() {
    if (!body.trim() || sending) return;
    setSending(true);
    try {
      await createSocialPostCommentWeb(post.id, body);
      setBody("");
      await load();
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={styles.drawerBackdrop} onMouseDown={onClose}>
      <aside className={styles.drawer} onMouseDown={(event) => event.stopPropagation()}>
        <header className={styles.drawerHead}>
          <div><h3>{copy.comments}</h3><small>{post.authorName}</small></div>
          <button onClick={onClose}>×</button>
        </header>
        <div className={styles.commentList}>
          {loading ? <div className={styles.commentState}>…</div> : comments.length ? comments.map((comment) => (
            <article className={styles.comment} key={comment.id}>
              <Link href={`/users/${comment.authorId}`}><Avatar src={comment.authorPhotoUrl} name={comment.authorName} userId={comment.authorId} /></Link>
              <div>
                <strong><Link href={`/users/${comment.authorId}`}>{comment.authorName}</Link></strong>
                <p>{comment.body}</p>
                <small>{timeText(comment.createdAt, locale)}</small>
              </div>
            </article>
          )) : <div className={styles.commentState}>{copy.noComments}</div>}
        </div>
        <div className={styles.commentComposer}>
          <textarea ref={commentTextareaRef} rows={1} value={body} onChange={(event) => setBody(event.target.value)} placeholder={copy.commentPlaceholder} />
          <button onClick={send} disabled={!body.trim() || sending}>{copy.send}</button>
        </div>
      </aside>
    </div>
  );
}
