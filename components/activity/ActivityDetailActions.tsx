"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/components/SiteProviders";
import ShareActivityToChatWeb from "./ShareActivityToChatWeb";
import SocialPostComposerModal from "@/components/feed/SocialPostComposerModal";
import ActivityManagementModal from "./ActivityManagementModal";
import TripSharedToolsModal from "./TripSharedToolsModal";
import { loadManagementState } from "./activityManagementWeb";
import styles from "./ActivityDetailActions.module.css";

export type DetailActionFeature = "trip" | "event" | "community";

const COPY = {
  th: {
    shareLink: "แชร์ลิงก์",
    shareMessage: "แชร์ในแชท",
    createPost: "สร้างโพสต์",
    liveNotice: "ประกาศสด",
    members: "สมาชิก",
    settings: "ตั้งค่า",
    copied: "คัดลอกลิงก์แล้ว",
    shared: "แชร์แล้ว",
    album: "Trip Album",
    expense: "Shared Expense",
    editTrip: "แก้ไขทริป",
    editEvent: "แก้ไขอีเวนต์",
    editCommunity: "แก้ไขคอมมูนิตี้",
    requests: "คำขอเข้าร่วม",
    activityChat: "ห้องแชท",
  },
  en: {
    shareLink: "Share link",
    shareMessage: "Share in chat",
    createPost: "Create post",
    liveNotice: "Live Notice",
    members: "Members",
    settings: "Settings",
    copied: "Link copied",
    shared: "Shared",
    album: "Trip Album",
    expense: "Shared Expense",
    editTrip: "Edit Trip",
    editEvent: "Edit Event",
    editCommunity: "Edit Community",
    requests: "Join requests",
    activityChat: "Activity chat",
  },
  de: {
    shareLink: "Link teilen",
    shareMessage: "Im Chat teilen",
    createPost: "Beitrag erstellen",
    liveNotice: "Live-Ankündigung",
    members: "Mitglieder",
    settings: "Einstellungen",
    copied: "Link kopiert",
    shared: "Geteilt",
    album: "Trip Album",
    expense: "Gemeinsame Ausgaben",
    editTrip: "Reise bearbeiten",
    editEvent: "Event bearbeiten",
    editCommunity: "Community bearbeiten",
    requests: "Teilnahmeanfragen",
    activityChat: "Aktivitätschat",
  },
  zh: {
    shareLink: "分享链接",
    shareMessage: "分享到聊天",
    createPost: "创建帖子",
    liveNotice: "实时公告",
    members: "成员",
    settings: "设置",
    copied: "链接已复制",
    shared: "已分享",
    album: "旅行相册",
    expense: "共享费用",
    editTrip: "编辑旅行",
    editEvent: "编辑活动",
    editCommunity: "编辑社区",
    requests: "加入申请",
    activityChat: "活动聊天",
  },
  ja: {
    shareLink: "リンク共有",
    shareMessage: "チャットに共有",
    createPost: "投稿を作成",
    liveNotice: "ライブ告知",
    members: "メンバー",
    settings: "設定",
    copied: "リンクをコピーしました",
    shared: "共有しました",
    album: "Trip Album",
    expense: "共有費用",
    editTrip: "Tripを編集",
    editEvent: "Eventを編集",
    editCommunity: "Communityを編集",
    requests: "参加申請",
    activityChat: "アクティビティチャット",
  },
  ko: {
    shareLink: "링크 공유",
    shareMessage: "채팅으로 공유",
    createPost: "게시물 만들기",
    liveNotice: "실시간 공지",
    members: "멤버",
    settings: "설정",
    copied: "링크 복사됨",
    shared: "공유됨",
    album: "Trip Album",
    expense: "공동 경비",
    editTrip: "여행 수정",
    editEvent: "이벤트 수정",
    editCommunity: "커뮤니티 수정",
    requests: "참여 요청",
    activityChat: "활동 채팅",
  },
} as const;

export default function ActivityDetailActions({
  feature,
  id,
  title,
  subtitle,
  imagePath = "",
  isOwner,
  isMember,
  onMembers,
  variant = "bar",
  ownerRequestCount = 0,
  onOwnerRequests,
}: {
  feature: DetailActionFeature;
  id: string;
  title: string;
  subtitle: string;
  imagePath?: string;
  isOwner: boolean;
  isMember: boolean;
  onMembers?: () => void;
  variant?: "bar" | "menu";
  ownerRequestCount?: number;
  onOwnerRequests?: () => void;
}) {
  const { locale } = useLocale();
  const t = COPY[locale] ?? COPY.en;
  const [shareOpen, setShareOpen] = useState(false);
  const [postComposerOpen, setPostComposerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [tripTool, setTripTool] = useState<"expense" | "album" | null>(null);
  const [canManageActivity, setCanManageActivity] = useState(isOwner);
  const [notice, setNotice] = useState("");
  const settingsRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    setCanManageActivity(isOwner);
    if (!isOwner && isMember) {
      void loadManagementState(feature, id).then((state) => {
        if (active) setCanManageActivity(state.canManage);
      }).catch(() => undefined);
    }
    return () => { active = false; };
  }, [feature, id, isMember, isOwner]);

  const canonicalPath = feature === "trip" ? `/trips/${id}` : feature === "event" ? `/events/${id}` : `/community/${id}`;

  useEffect(() => {
    if (!settingsOpen && !menuOpen) return;
    function outside(event: PointerEvent) {
      const target = event.target as Node;
      if (settingsOpen && !settingsRef.current?.contains(target)) setSettingsOpen(false);
      if (menuOpen && !menuRef.current?.contains(target)) {
        setMenuOpen(false);
        setSettingsOpen(false);
      }
    }
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [settingsOpen, menuOpen]);

  function currentUrl() {
    if (typeof window === "undefined") return canonicalPath;
    return `${window.location.origin}${canonicalPath}`;
  }

  async function shareLink() {
    const url = currentUrl();
    try {
      if (navigator.share) {
        await navigator.share({ title, text: subtitle || title, url });
        setNotice(t.shared);
      } else {
        await navigator.clipboard.writeText(url);
        setNotice(t.copied);
      }
    } catch (error) {
      if ((error as Error)?.name !== "AbortError") {
        try {
          await navigator.clipboard.writeText(url);
          setNotice(t.copied);
        } catch {}
      }
    }
    window.setTimeout(() => setNotice(""), 1800);
  }

  function createPost() {
    setPostComposerOpen(true);
  }

  function openActivityChat() {
    setMenuOpen(false);
    setSettingsOpen(false);
    window.dispatchEvent(new CustomEvent("melo-open-activity-chat", {
      detail: {
        category: feature,
        id,
        title,
        subtitle,
        avatarUrl: imagePath || "",
      },
    }));
  }

  function editHref() {
    if (feature === "trip") return `/edit-trip/${id}`;
    if (feature === "event") return `/edit-event/${id}`;
    return `/edit-community/${id}`;
  }

  function editLabel() {
    if (feature === "trip") return t.editTrip;
    if (feature === "event") return t.editEvent;
    return t.editCommunity;
  }

  if (variant === "menu") {
    return (
      <>
        <div className={styles.compactMenu} ref={menuRef}>
          {isOwner ? (
            <Link
              href={`/live-notice?type=${feature}&id=${encodeURIComponent(id)}`}
              className={styles.liveNoticeButton}
              onClick={() => {
                setMenuOpen(false);
                setSettingsOpen(false);
              }}
            >
              <span>●</span>
              <strong>{t.liveNotice}</strong>
            </Link>
          ) : null}
          {feature === "trip" && isOwner ? (
            onOwnerRequests ? (
              <button
                type="button"
                className={styles.requestIconLink}
                title={t.requests}
                aria-label={ownerRequestCount > 0 ? `${t.requests} (${ownerRequestCount})` : t.requests}
                onClick={() => {
                  setMenuOpen(false);
                  setSettingsOpen(false);
                  onOwnerRequests();
                }}
              >
                <span>🙋</span>
                {ownerRequestCount > 0 ? <b>{ownerRequestCount > 99 ? '99+' : ownerRequestCount}</b> : null}
              </button>
            ) : (
              <Link
                href={`/trips/${id}/requests`}
                className={styles.requestIconLink}
                title={t.requests}
                aria-label={ownerRequestCount > 0 ? `${t.requests} (${ownerRequestCount})` : t.requests}
                onClick={() => {
                  setMenuOpen(false);
                  setSettingsOpen(false);
                }}
              >
                <span>🙋</span>
                {ownerRequestCount > 0 ? <b>{ownerRequestCount > 99 ? '99+' : ownerRequestCount}</b> : null}
              </Link>
            )
          ) : null}
          <button
            type="button"
            className={styles.ellipsisButton}
            aria-label="More actions"
            aria-expanded={menuOpen}
            onClick={() => {
              setMenuOpen((value) => !value);
              setSettingsOpen(false);
            }}
          >
            •••
          </button>

          {menuOpen ? (
            <div className={styles.ellipsisMenu}>
              <button type="button" onClick={() => { setMenuOpen(false); void shareLink(); }}>
                <span>↗</span><strong>{t.shareLink}</strong>
              </button>

              <button type="button" onClick={() => { setMenuOpen(false); setShareOpen(true); }}>
                <span>💬</span><strong>{t.shareMessage}</strong>
              </button>

              <button type="button" onClick={() => { setMenuOpen(false); createPost(); }}>
                <span>＋</span><strong>{t.createPost}</strong>
              </button>

              <button type="button" onClick={() => { setMenuOpen(false); onMembers?.(); }}>
                <span>👥</span><strong>{t.members}</strong>
              </button>

              {feature === "trip" && isMember ? (
                <>
                  <button type="button" onClick={() => { setMenuOpen(false); setTripTool("expense"); }}>
                    <span>฿</span><strong>{t.expense}</strong>
                  </button>
                  <button type="button" onClick={() => { setMenuOpen(false); setTripTool("album"); }}>
                    <span>▧</span><strong>{t.album}</strong>
                  </button>
                </>
              ) : null}

              {canManageActivity ? (
                <div className={styles.compactSettings}>
                  <button
                    type="button"
                    onClick={() => { setMenuOpen(false); setSettingsOpen(false); setManageOpen(true); }}
                  >
                    <span>⚙</span>
                    <strong>{t.settings}</strong>
                    <em>›</em>
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          {notice ? <div className={styles.compactNotice}>{notice}</div> : null}
        </div>

        <ShareActivityToChatWeb
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          activity={{
            feature,
            id,
            title,
            subtitle,
            url: currentUrl(),
          }}
        />
        <SocialPostComposerModal
          open={postComposerOpen}
          onClose={() => setPostComposerOpen(false)}
          onSaved={() => setPostComposerOpen(false)}
          activity={{ type: feature, id, title, subtitle, imagePath }}
        />
        <ActivityManagementModal open={manageOpen} type={feature} id={id} title={title} locale={locale} onClose={() => setManageOpen(false)} />
        <TripSharedToolsModal mode={feature === "trip" ? tripTool : null} tripId={id} title={title} locale={locale} onClose={() => setTripTool(null)} />
      </>
    );
  }

  return (
    <>
      <section className={styles.actionsWrap}>
        <div className={styles.actions}>
          <button type="button" onClick={() => void shareLink()}>
            <span>↗</span><strong>{t.shareLink}</strong>
          </button>
          <button type="button" onClick={() => setShareOpen(true)}>
            <span>💬</span><strong>{t.shareMessage}</strong>
          </button>
          <button type="button" onClick={createPost}>
            <span>＋</span><strong>{t.createPost}</strong>
          </button>
          <button type="button" onClick={onMembers}>
            <span>👥</span><strong>{t.members}</strong>
          </button>

          {feature === "trip" && isMember ? (
            <>
              <button type="button" onClick={() => setTripTool("expense")}>
                <span>฿</span><strong>{t.expense}</strong>
              </button>
              <button type="button" onClick={() => setTripTool("album")}>
                <span>▧</span><strong>{t.album}</strong>
              </button>
            </>
          ) : null}

          {canManageActivity ? (
            <div className={styles.settings}>
              <button type="button" onClick={() => setManageOpen(true)}>
                <span>⚙</span><strong>{t.settings}</strong>
              </button>
            </div>
          ) : null}
        </div>

        {notice ? <div className={styles.notice}>{notice}</div> : null}
      </section>

      <ShareActivityToChatWeb
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        activity={{
          feature,
          id,
          title,
          subtitle,
          url: currentUrl(),
        }}
      />
        <SocialPostComposerModal
          open={postComposerOpen}
          onClose={() => setPostComposerOpen(false)}
          onSaved={() => setPostComposerOpen(false)}
          activity={{ type: feature, id, title, subtitle, imagePath }}
        />
      <ActivityManagementModal open={manageOpen} type={feature} id={id} title={title} locale={locale} onClose={() => setManageOpen(false)} />
      <TripSharedToolsModal mode={feature === "trip" ? tripTool : null} tripId={id} title={title} locale={locale} onClose={() => setTripTool(null)} />
    </>
  );
}
