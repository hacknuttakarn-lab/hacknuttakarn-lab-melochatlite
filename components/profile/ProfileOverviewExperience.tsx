"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/Header";
import VerifiedUserAvatar from "@/components/profile/VerifiedUserAvatar";
import SocialPostComposerModal from "@/components/feed/SocialPostComposerModal";
import ShareSocialPostModal from "@/components/feed/ShareSocialPostModal";
import { useLocale } from "@/components/SiteProviders";
import {
  createSocialPostCommentWeb,
  loadSocialFeedWeb,
  loadSocialPostCommentsWeb,
  toggleSocialPostLikeWeb,
  type SocialFeedPost,
  type SocialPostComment,
} from "@/components/feed/socialFeedWebData";
import {
  ageFrom,
  arrayOf,
  firstValue,
  formatBirthDate,
  loadOwnProfile,
  profileCoverUrl,
  profileMediaPosition,
  profilePhotoUrl,
  type OwnProfileSnapshot,
} from "./profileWebData";
import styles from "./ProfileOverviewExperience.module.css";

const COPY = {
  th: {
    edit: "แก้ไขโปรไฟล์", about: "เกี่ยวกับฉัน", more: "ดูข้อมูลเพิ่มเติม", less: "ซ่อนข้อมูลเพิ่มเติม",
    verified: "ยืนยันตัวตนแล้ว", interests: "ความสนใจ", languages: "ภาษาที่ใช้", moreDetails: "รายละเอียดเพิ่มเติม",
    gender: "เพศ", birthDate: "วันเดือนปีเกิด", nationality: "สัญชาติ", job: "อาชีพ", education: "การศึกษา", height: "ส่วนสูง",
    noBio: "ยังไม่ได้เพิ่มข้อมูลเกี่ยวกับตัวเอง", noValue: "ยังไม่ได้ระบุ",
    reputation: "ชื่อเสียง", reputationScore: "คะแนนชื่อเสียง", reviews: "รีวิว",
    passport: "พาสปอร์ต & เหรียญตรา", completedTrips: "ทริปที่จบแล้ว", completedEvents: "กิจกรรมที่จบแล้ว",
    composer: "คุณกำลังคิดอะไรอยู่...", createPost: "สร้างโพสต์",
    posts: "โพสต์", postCount: "โพสต์ของคุณ", noPosts: "ยังไม่มีโพสต์",
    likes: "ถูกใจ", comments: "ความคิดเห็น", shares: "แชร์", commentPlaceholder: "เขียนความคิดเห็น...", send: "ส่ง", noComments: "ยังไม่มีความคิดเห็น",
    public: "สาธารณะ", friends: "เพื่อน", tripMembers: "สมาชิกทริป", eventParticipants: "ผู้เข้าร่วมกิจกรรม",
    communityMembers: "สมาชิกคอมมูนิตี้", onlyMe: "เฉพาะฉัน", location: "ตำแหน่ง",
    profileInfo: "ข้อมูลเพิ่มเติม", openPassport: "เปิดพาสปอร์ต", reputationSummary: "สรุปชื่อเสียง", openReputation: "ดู Reputation",
    loading: "กำลังโหลดโปรไฟล์…", login: "กรุณาเข้าสู่ระบบเพื่อดูโปรไฟล์", loginButton: "เข้าสู่ระบบ",
    error: "โหลดข้อมูลโปรไฟล์ไม่สำเร็จ", viewPost: "ดูโพสต์", editPost: "แก้ไขโพสต์", sharePost: "แชร์โพสต์",
  },
  en: {
    edit: "Edit profile", about: "About me", more: "View more details", less: "Hide details",
    verified: "Verified", interests: "Interests", languages: "Languages", moreDetails: "More details",
    gender: "Gender", birthDate: "Date of birth", nationality: "Nationality", job: "Job", education: "Education", height: "Height",
    noBio: "No bio added yet", noValue: "Not specified",
    reputation: "Reputation", reputationScore: "Reputation score", reviews: "Reviews",
    passport: "Passport & Badges", completedTrips: "Completed trips", completedEvents: "Completed events",
    composer: "What are you thinking about?", createPost: "Create post",
    posts: "Posts", postCount: "Your posts", noPosts: "No posts yet",
    likes: "Likes", comments: "Comments", shares: "Shares", commentPlaceholder: "Write a comment...", send: "Send", noComments: "No comments yet",
    public: "Public", friends: "Friends", tripMembers: "Trip members", eventParticipants: "Event participants",
    communityMembers: "Community members", onlyMe: "Only me", location: "Location",
    profileInfo: "More profile details", openPassport: "Open passport", reputationSummary: "Reputation summary", openReputation: "View Reputation",
    loading: "Loading profile…", login: "Sign in to view your profile", loginButton: "Sign in",
    error: "Unable to load profile", viewPost: "View post", editPost: "Edit post", sharePost: "Share post",
  },
  de: {
    edit: "Profil bearbeiten", about: "Über mich", more: "Mehr Details", less: "Details ausblenden",
    verified: "Verifiziert", interests: "Interessen", languages: "Sprachen", moreDetails: "Weitere Details",
    gender: "Geschlecht", birthDate: "Geburtsdatum", nationality: "Nationalität", job: "Beruf", education: "Ausbildung", height: "Größe",
    noBio: "Noch keine Beschreibung", noValue: "Nicht angegeben",
    reputation: "Reputation", reputationScore: "Reputationswert", reviews: "Bewertungen",
    passport: "Reisepass & Abzeichen", completedTrips: "Abgeschlossene Reisen", completedEvents: "Abgeschlossene Events",
    composer: "Woran denkst du gerade?", createPost: "Beitrag erstellen",
    posts: "Beiträge", postCount: "Deine Beiträge", noPosts: "Noch keine Beiträge",
    likes: "Gefällt mir", comments: "Kommentare", shares: "Geteilt", commentPlaceholder: "Kommentar schreiben...", send: "Senden", noComments: "Noch keine Kommentare",
    public: "Öffentlich", friends: "Freunde", tripMembers: "Reisemitglieder", eventParticipants: "Event-Teilnehmer",
    communityMembers: "Community-Mitglieder", onlyMe: "Nur ich", location: "Standort",
    profileInfo: "Weitere Profildetails", openPassport: "Reisepass öffnen", reputationSummary: "Reputationsübersicht", openReputation: "Reputation ansehen",
    loading: "Profil wird geladen…", login: "Bitte anmelden, um dein Profil zu sehen", loginButton: "Anmelden",
    error: "Profil konnte nicht geladen werden", viewPost: "Beitrag ansehen", editPost: "Beitrag bearbeiten", sharePost: "Beitrag teilen",
  },
  zh: {
    edit: "编辑资料", about: "关于我", more: "查看更多资料", less: "收起资料",
    verified: "已认证", interests: "兴趣", languages: "使用语言", moreDetails: "更多资料",
    gender: "性别", birthDate: "出生日期", nationality: "国籍", job: "职业", education: "教育", height: "身高",
    noBio: "尚未填写简介", noValue: "未填写",
    reputation: "信誉", reputationScore: "信誉评分", reviews: "评价",
    passport: "护照与徽章", completedTrips: "已完成旅行", completedEvents: "已完成活动",
    composer: "你在想什么？", createPost: "创建帖子",
    posts: "帖子", postCount: "你的帖子", noPosts: "暂无帖子",
    likes: "赞", comments: "评论", shares: "分享", commentPlaceholder: "写一条评论...", send: "发送", noComments: "暂无评论",
    public: "公开", friends: "好友", tripMembers: "旅行成员", eventParticipants: "活动参与者",
    communityMembers: "社区成员", onlyMe: "仅自己", location: "位置",
    profileInfo: "更多资料", openPassport: "打开护照", reputationSummary: "信誉概览", openReputation: "查看信誉",
    loading: "正在加载资料…", login: "请登录后查看个人资料", loginButton: "登录",
    error: "无法加载资料", viewPost: "查看帖子", editPost: "编辑帖子", sharePost: "分享帖子",
  },
  ja: {
    edit: "プロフィールを編集", about: "自己紹介", more: "詳細を見る", less: "詳細を隠す",
    verified: "認証済み", interests: "興味", languages: "使用言語", moreDetails: "詳細情報",
    gender: "性別", birthDate: "生年月日", nationality: "国籍", job: "職業", education: "学歴", height: "身長",
    noBio: "自己紹介はまだありません", noValue: "未設定",
    reputation: "評判", reputationScore: "評判スコア", reviews: "レビュー",
    passport: "パスポート & バッジ", completedTrips: "完了した旅行", completedEvents: "完了したイベント",
    composer: "今、何を考えていますか？", createPost: "投稿を作成",
    posts: "投稿", postCount: "あなたの投稿", noPosts: "まだ投稿はありません",
    likes: "いいね", comments: "コメント", shares: "シェア", commentPlaceholder: "コメントを書く...", send: "送信", noComments: "まだコメントはありません",
    public: "公開", friends: "友達", tripMembers: "Tripメンバー", eventParticipants: "Event参加者",
    communityMembers: "Communityメンバー", onlyMe: "自分のみ", location: "場所",
    profileInfo: "プロフィール詳細", openPassport: "パスポートを開く", reputationSummary: "評判の概要", openReputation: "評判を見る",
    loading: "プロフィールを読み込み中…", login: "プロフィールを見るにはログインしてください", loginButton: "ログイン",
    error: "プロフィールを読み込めません", viewPost: "投稿を見る", editPost: "投稿を編集", sharePost: "投稿を共有",
  },
  ko: {
    edit: "프로필 수정", about: "소개", more: "상세 정보 보기", less: "상세 정보 숨기기",
    verified: "인증됨", interests: "관심사", languages: "사용 언어", moreDetails: "추가 정보",
    gender: "성별", birthDate: "생년월일", nationality: "국적", job: "직업", education: "학력", height: "키",
    noBio: "소개가 없습니다", noValue: "미입력",
    reputation: "평판", reputationScore: "평판 점수", reviews: "리뷰",
    passport: "패스포트 & 배지", completedTrips: "완료한 여행", completedEvents: "완료한 이벤트",
    composer: "무슨 생각을 하고 있나요?", createPost: "게시물 만들기",
    posts: "게시물", postCount: "내 게시물", noPosts: "아직 게시물이 없습니다",
    likes: "좋아요", comments: "댓글", shares: "공유", commentPlaceholder: "댓글 작성...", send: "보내기", noComments: "아직 댓글이 없습니다",
    public: "공개", friends: "친구", tripMembers: "여행 멤버", eventParticipants: "이벤트 참가자",
    communityMembers: "커뮤니티 멤버", onlyMe: "나만 보기", location: "위치",
    profileInfo: "프로필 상세 정보", openPassport: "패스포트 열기", reputationSummary: "평판 요약", openReputation: "평판 보기",
    loading: "프로필 불러오는 중…", login: "프로필을 보려면 로그인하세요", loginButton: "로그인",
    error: "프로필을 불러올 수 없습니다", viewPost: "게시물 보기", editPost: "게시물 수정", sharePost: "게시물 공유",
  },
} as const;

type AppLocale = keyof typeof COPY;

function dateLocale(locale: AppLocale) {
  return ({ th: "th-TH", en: "en-US", de: "de-DE", zh: "zh-CN", ja: "ja-JP", ko: "ko-KR" } as const)[locale];
}

function visibilityLabel(value: SocialFeedPost["visibility"], t: (typeof COPY)[AppLocale]) {
  if (value === "friends") return t.friends;
  if (value === "trip_members") return t.tripMembers;
  if (value === "event_participants") return t.eventParticipants;
  if (value === "community_members") return t.communityMembers;
  if (value === "only_me") return t.onlyMe;
  return t.public;
}

function activityHref(post: SocialFeedPost) {
  if (!post.activityType || !post.activityId) return "";
  if (post.activityType === "trip") return `/trips/${post.activityId}`;
  if (post.activityType === "event") return `/events/${post.activityId}`;
  return `/community/${post.activityId}`;
}

const INTEREST_LABELS: Record<AppLocale, Record<string, string>> = {
  th: { Travel: "ท่องเที่ยว", Coffee: "กาแฟ", Technology: "เทคโนโลยี", Music: "ดนตรี", Business: "ธุรกิจ", Food: "อาหาร", Fitness: "ออกกำลังกาย", Movies: "ภาพยนตร์" },
  en: { Travel: "Travel", Coffee: "Coffee", Technology: "Technology", Music: "Music", Business: "Business", Food: "Food", Fitness: "Fitness", Movies: "Movies" },
  de: { Travel: "Reisen", Coffee: "Kaffee", Technology: "Technologie", Music: "Musik", Business: "Business", Food: "Essen", Fitness: "Fitness", Movies: "Filme" },
  zh: { Travel: "旅行", Coffee: "咖啡", Technology: "科技", Music: "音乐", Business: "商业", Food: "美食", Fitness: "健身", Movies: "电影" },
  ja: { Travel: "旅行", Coffee: "コーヒー", Technology: "テクノロジー", Music: "音楽", Business: "ビジネス", Food: "グルメ", Fitness: "フィットネス", Movies: "映画" },
  ko: { Travel: "여행", Coffee: "커피", Technology: "기술", Music: "음악", Business: "비즈니스", Food: "음식", Fitness: "운동", Movies: "영화" },
};

const LANGUAGE_NATIVE_NAMES: Record<string, string> = { th: "ไทย", en: "English", de: "Deutsch", zh: "中文", ja: "日本語", ko: "한국어" };
function interestLabel(value: string, locale: AppLocale) { return INTEREST_LABELS[locale][value] || value; }
function languageLabel(value: string) { return LANGUAGE_NATIVE_NAMES[value.toLowerCase()] || value; }

export default function ProfileOverviewExperience() {
  const { locale } = useLocale();
  const activeLocale = (locale in COPY ? locale : "en") as AppLocale;
  const t = COPY[activeLocale];

  const [snapshot, setSnapshot] = useState<OwnProfileSnapshot | null>(null);
  const [posts, setPosts] = useState<SocialFeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<SocialFeedPost | null>(null);
  const [sharingPost, setSharingPost] = useState<SocialFeedPost | null>(null);
  const [commentsPost, setCommentsPost] = useState<SocialFeedPost | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const result = await loadOwnProfile();
      if (!active) return;

      if (result.error === "AUTH_REQUIRED" || !result.data) {
        setAuthRequired(true);
        setLoading(false);
        return;
      }

      setSnapshot(result.data);
      setError(result.error || "");

      try {
        const ownPosts = await loadSocialFeedWeb({
          limit: 30,
          offset: 0,
          authorId: result.data.userId,
        });
        if (active) setPosts(ownPosts);
      } catch (postError) {
        console.warn("[Melo Web] Unable to load profile posts", postError);
      }

      if (active) setLoading(false);
    })();

    return () => { active = false; };
  }, []);

  const profile = snapshot?.profile || {};
  const verification = snapshot?.verification || {};
  const reputation = snapshot?.reputation || {};

  const name = String(firstValue(profile, ["display_name", "full_name", "name", "username"]) || "Melo User");
  const age = ageFrom(firstValue(profile, ["date_of_birth", "birth_date", "birthday"]));
  const city = String(firstValue(profile, ["city", "province", "location_city"]) || "");
  const country = String(firstValue(profile, ["country", "country_name", "nationality"]) || "");
  const bio = String(firstValue(profile, ["bio", "about_me", "about"]) || "");
  const avatar = profilePhotoUrl(profile, 0);
  const cover = profileCoverUrl(profile, snapshot?.userMetadata);
  const avatarPosition = profileMediaPosition(snapshot?.userMetadata, "avatar");
  const coverPosition = profileMediaPosition(snapshot?.userMetadata, "cover");
  const interests = arrayOf(firstValue(profile, ["interests", "interest_tags"]));
  const languages = arrayOf(firstValue(profile, ["languages", "spoken_languages"]));
  const primaryLanguage = String(firstValue(profile, ["primary_language", "language"]) || "");
  const genderRaw = String(firstValue(profile, ["gender"]) || "");
  const birthDate = firstValue(profile, ["date_of_birth", "birth_date", "birthday"]);
  const nationality = String(firstValue(profile, ["nationality"]) || "");
  const job = String(firstValue(profile, ["job_title", "job"]) || "");
  const education = String(firstValue(profile, ["education"]) || "");
  const height = Number(firstValue(profile, ["height_cm", "height"]) || 0);

  const verified = Boolean(verification?.is_verified || reputation?.is_verified);
  const rating = Number(firstValue(reputation, ["average_rating", "reputation_score"]) || 0);
  const reviewCount = Number(firstValue(reputation, ["review_count"]) || snapshot?.reviews?.length || 0);
  const completedTrips = Number(firstValue(reputation, ["completed_trips"]) || 0);
  const completedEvents = Number(firstValue(reputation, ["completed_events"]) || 0);

  const languageValues = [...new Set([primaryLanguage, ...languages].filter(Boolean))].map(languageLabel);
  const interestValues = interests.map((value) => interestLabel(value, activeLocale));

  const genderLabel = useMemo(() => {
    const labels = {
      th: { female: "ผู้หญิง", male: "ผู้ชาย", lgbtq: "LGBTQ+" },
      en: { female: "Woman", male: "Man", lgbtq: "LGBTQ+" },
      de: { female: "Frau", male: "Mann", lgbtq: "LGBTQ+" },
      zh: { female: "女性", male: "男性", lgbtq: "LGBTQ+" },
      ja: { female: "女性", male: "男性", lgbtq: "LGBTQ+" },
      ko: { female: "여성", male: "남성", lgbtq: "LGBTQ+" },
    } as const;
    return (labels[activeLocale] as Record<string, string>)[genderRaw] || genderRaw || t.noValue;
  }, [activeLocale, genderRaw, t.noValue]);

  const detailRows = useMemo(() => [
    { label: t.gender, value: genderLabel },
    { label: t.birthDate, value: formatBirthDate(birthDate, dateLocale(activeLocale)) || t.noValue },
    { label: t.nationality, value: nationality || t.noValue },
    { label: t.job, value: job || t.noValue },
    { label: t.education, value: education || t.noValue },
    { label: t.height, value: height > 0 ? `${height} cm` : t.noValue },
  ], [activeLocale, birthDate, education, genderLabel, height, job, nationality, t]);

  async function likePost(post: SocialFeedPost) {
    try {
      const result = await toggleSocialPostLikeWeb(post.id);
      setPosts((current) => current.map((item) =>
        item.id === post.id ? { ...item, isLiked: result.isLiked, likeCount: result.likeCount } : item,
      ));
      setCommentsPost((current) => current?.id === post.id ? { ...current, isLiked: result.isLiked, likeCount: result.likeCount } : current);
    } catch (likeError) {
      console.warn("[Melo Web] Unable to toggle profile post like", likeError);
    }
  }

  if (loading) {
    return <main className={styles.page}><Header /><div className={styles.state}>{t.loading}</div></main>;
  }

  if (authRequired) {
    return (
      <main className={styles.page}>
        <Header />
        <div className={styles.state}>
          <strong>{t.login}</strong>
          <Link href="/login">{t.loginButton}</Link>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <Header />

      <section className={styles.shell}>
        {error ? <div className={styles.error}>{error || t.error}</div> : null}

        <section className={styles.heroCard}>
          <div className={styles.cover}>
            {cover ? <img src={cover} alt="" style={{ objectPosition: `${coverPosition.x}% ${coverPosition.y}%` }} /> : <div className={styles.coverFallback} />}
            <div className={styles.coverShade} />
          </div>

          <div className={styles.heroBody}>
            <div className={styles.identityRow}>
              <div className={styles.identityCluster}>
                <VerifiedUserAvatar userId={snapshot?.userId} name={name} src={avatar} country={country} nationality={nationality} verified={verified} className={styles.avatarWrap} badgeSize={23} objectPosition={`${avatarPosition.x}% ${avatarPosition.y}%`} alt={name} />

                <div className={styles.identity}>
                  <div className={styles.nameLine}>
                    <h1>{name}{age !== null ? `, ${age}` : ""}</h1>
                    {verified ? <span className={styles.verifiedPill}>✓ {t.verified}</span> : null}
                  </div>
                  <p>{[city, country].filter(Boolean).join(", ") || t.noValue}</p>
                </div>
              </div>

              <Link className={styles.editButton} href="/edit-profile">
                ✎ <span>{t.edit}</span>
              </Link>
            </div>

            <div className={styles.divider} />

            <section className={styles.aboutBlock}>
              <div className={styles.aboutHeader}>
                <h2>{t.about}</h2>
                <button type="button" className={styles.moreButton} onClick={() => setExpanded((value) => !value)}>
                  {expanded ? t.less : t.more} <span>{expanded ? "▲" : "▼"}</span>
                </button>
              </div>
              <p className={expanded ? styles.aboutExpanded : undefined}>{bio || t.noBio}</p>

              <div className={styles.mobileProfileActions}>
                {snapshot?.userId ? (
                  <Link href={`/reputation/${snapshot.userId}`} className={styles.mobileProfileAction}>
                    <span>★</span><strong>{t.reputation}</strong>
                  </Link>
                ) : (
                  <span className={`${styles.mobileProfileAction} ${styles.mobileProfileActionDisabled}`}>
                    <span>★</span><strong>{t.reputation}</strong>
                  </span>
                )}
                <Link href="/passport" className={styles.mobileProfileAction}>
                  <span>◎</span><strong>{t.passport}</strong>
                </Link>
              </div>

              {expanded ? (
                <section className={styles.mobileProfileDetails}>
                  <div className={styles.mobileProfileDetailsHead}>
                    <span>◉</span><strong>{t.profileInfo}</strong>
                  </div>

                  <div className={styles.profileQuickGrid}>
                    <div><span>{t.languages}</span><strong>{languageValues.slice(0, 3).join(" · ") || t.noValue}</strong></div>
                    <div><span>{t.nationality}</span><strong>{nationality || t.noValue}</strong></div>
                    <div><span>{t.job}</span><strong>{job || t.noValue}</strong></div>
                  </div>

                  <div className={styles.expandedProfileDetails}>
                    <section className={styles.infoSection}>
                      <h3>{t.interests}</h3>
                      <div className={styles.chips}>
                        {interestValues.length
                          ? interestValues.map((value) => <b key={value}>{value}</b>)
                          : <span className={styles.emptyDetail}>{t.noValue}</span>}
                      </div>
                    </section>

                    <div className={styles.detailTable}>
                      {detailRows
                        .filter((detail) => detail.label !== t.nationality && detail.label !== t.job)
                        .map((detail) => (
                          <div className={styles.detailRow} key={detail.label}>
                            <span>{detail.label}</span>
                            <strong>{detail.value}</strong>
                          </div>
                        ))}
                    </div>
                  </div>
                </section>
              ) : null}
            </section>
          </div>
        </section>

        <div className={styles.contentGrid}>
          <section className={styles.mainColumn}>
            <section className={styles.composerCard}>
              <VerifiedUserAvatar userId={snapshot?.userId} name={name} src={avatar} country={country} nationality={nationality} verified={verified} className={styles.composerAvatar} badgeSize={17} objectPosition={`${avatarPosition.x}% ${avatarPosition.y}%`} alt="" />
              <button type="button" onClick={() => setComposerOpen(true)}>{t.composer}</button>
            </section>

            <section className={styles.postsSection}>
              <header className={styles.postsHead}>
                <div>
                  <span>{t.postCount}</span>
                  <h2>{t.posts}</h2>
                </div>
                <b>{posts.length}</b>
              </header>

              {posts.length ? (
                <div className={styles.postList}>
                  {posts.map((post) => (
                    <ProfilePostCard
                      key={post.id}
                      post={post}
                      avatar={avatar}
                      name={name}
                      userId={snapshot?.userId || ""}
                      country={country}
                      nationality={nationality}
                      verified={verified}
                      locale={activeLocale}
                      t={t}
                      onLike={() => void likePost(post)}
                      onComment={() => setCommentsPost(post)}
                      onEdit={() => setEditingPost(post)}
                      onShare={() => setSharingPost(post)}
                    />
                  ))}
                </div>
              ) : (
                <div className={styles.emptyPosts}>
                  <span>◌</span>
                  <strong>{t.noPosts}</strong>
                  <button type="button" className={styles.emptyCreatePostButton} onClick={() => setComposerOpen(true)}>＋ {t.createPost}</button>
                </div>
              )}
            </section>
          </section>

          <aside className={styles.sideColumn}>
            <section className={styles.sideCard} id="reputation">
              <div className={styles.sideCardHead}>
                <span className={`${styles.sideIcon} ${styles.reputationIcon}`}>★</span>
                <div>
                  <strong>{t.reputation}</strong>
                  <small>{t.reputationSummary}</small>
                </div>
              </div>

              <div className={styles.ratingRow}>
                <strong>{rating > 0 ? rating.toFixed(1) : "—"}</strong>
                <span>{t.reputationScore}</span>
              </div>

              <div className={styles.statsGrid}>
                <div><strong>{reviewCount}</strong><span>{t.reviews}</span></div>
                <div><strong>{completedTrips}</strong><span>{t.completedTrips}</span></div>
                <div><strong>{completedEvents}</strong><span>{t.completedEvents}</span></div>
              </div>

              {snapshot?.userId ? (
                <Link href={`/reputation/${snapshot.userId}`} className={styles.reputationTextLink}>
                  {t.openReputation} <span>→</span>
                </Link>
              ) : null}
            </section>

            <Link href="/passport" className={`${styles.sideCard} ${styles.passportCard}`}>
              <div className={styles.sideCardHead}>
                <span className={styles.sideIcon}>◎</span>
                <div>
                  <strong>{t.passport}</strong>
                  <small>{completedTrips} {t.completedTrips} · {completedEvents} {t.completedEvents}</small>
                </div>
              </div>
              <span className={styles.sideLink}>{t.openPassport} →</span>
            </Link>

            <section className={`${styles.sideCard} ${styles.mobileDetailSummary} ${styles.profileDetailsCard}`}>
              <div className={styles.sideCardHead}>
                <span className={styles.sideIcon}>◉</span>
                <div><strong>{t.profileInfo}</strong></div>
              </div>

              <div className={styles.profileQuickGrid}>
                <div><span>{t.languages}</span><strong>{languageValues.slice(0, 3).join(" · ") || t.noValue}</strong></div>
                <div><span>{t.nationality}</span><strong>{nationality || t.noValue}</strong></div>
                <div><span>{t.job}</span><strong>{job || t.noValue}</strong></div>
              </div>

              {expanded ? (
                <div className={styles.expandedProfileDetails}>
                  <section className={styles.infoSection}>
                    <h3>{t.interests}</h3>
                    <div className={styles.chips}>
                      {interestValues.length
                        ? interestValues.map((value) => <b key={value}>{value}</b>)
                        : <span className={styles.emptyDetail}>{t.noValue}</span>}
                    </div>
                  </section>

                  <div className={styles.detailTable}>
                    {detailRows
                      .filter((detail) => detail.label !== t.nationality && detail.label !== t.job)
                      .map((detail) => (
                        <div className={styles.detailRow} key={detail.label}>
                          <span>{detail.label}</span>
                          <strong>{detail.value}</strong>
                        </div>
                      ))}
                  </div>
                </div>
              ) : null}
            </section>
          </aside>
        </div>
      </section>

      <SocialPostComposerModal
        open={composerOpen || Boolean(editingPost)}
        post={editingPost}
        onClose={() => { setComposerOpen(false); setEditingPost(null); }}
        onSaved={async () => {
          setComposerOpen(false); setEditingPost(null);
          if (!snapshot?.userId) return;
          try {
            const ownPosts = await loadSocialFeedWeb({ limit: 30, offset: 0, authorId: snapshot.userId });
            setPosts(ownPosts);
          } catch {}
        }}
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
        <ProfileCommentsDrawer
          post={commentsPost}
          locale={activeLocale}
          t={t}
          onClose={() => setCommentsPost(null)}
          onCount={(commentCount) => {
            setPosts((current) => current.map((item) => item.id === commentsPost.id ? { ...item, commentCount } : item));
            setCommentsPost((current) => current ? { ...current, commentCount } : current);
          }}
        />
      ) : null}
    </main>
  );
}

function ProfilePostCard({
  post,
  avatar,
  name,
  userId,
  country,
  nationality,
  verified,
  locale,
  t,
  onLike,
  onComment,
  onEdit,
  onShare,
}: {
  post: SocialFeedPost;
  avatar: string;
  name: string;
  userId: string;
  country: string;
  nationality: string;
  verified: boolean;
  locale: AppLocale;
  t: (typeof COPY)[AppLocale];
  onLike: () => void;
  onComment: () => void;
  onEdit: () => void;
  onShare: () => void;
}) {
  const [imageIndex, setImageIndex] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const image = post.images[imageIndex];
  const activityUrl = activityHref(post);

  return (
    <article className={styles.postCard}>
      <header className={styles.postHeader}>
        <Link href={`/users/${userId}`} className={styles.postAuthorAvatar}>
          <VerifiedUserAvatar userId={userId} name={name} src={avatar} country={country} nationality={nationality} verified={verified} badgeSize={16} alt="" />
        </Link>
        <div className={styles.postAuthor}>
          <strong><Link href={`/users/${userId}`}>{name}</Link></strong>
          <small>
            {post.createdAt ? new Date(post.createdAt).toLocaleString(dateLocale(locale)) : ""}
            {post.locationName ? ` · ${post.locationName}` : ""}
          </small>
        </div>
        <div className={styles.postHeaderActions}>
          <span className={styles.visibilityPill}>{visibilityLabel(post.visibility, t)}</span>
          <div className={styles.postMenu}>
            <button type="button" className={styles.postMenuButton} onClick={() => setMenuOpen((value) => !value)}>•••</button>
            {menuOpen ? <div className={styles.postMenuDropdown}>
              <button type="button" onClick={() => { setMenuOpen(false); onEdit(); }}>✎ {t.editPost}</button>
              <button type="button" onClick={() => { setMenuOpen(false); onShare(); }}>↗ {t.sharePost}</button>
            </div> : null}
          </div>
        </div>
      </header>

      {post.title ? <h3 className={styles.postTitle}>{post.title}</h3> : null}
      {post.body ? <p className={styles.postBody}>{post.body}</p> : null}

      {image ? (
        <div className={styles.postMedia}>
          <img src={image.url} alt={post.title || name} />
          {post.images.length > 1 ? (
            <>
              <button className={`${styles.mediaNav} ${styles.mediaPrev}`} type="button" onClick={() => setImageIndex((value) => value <= 0 ? post.images.length - 1 : value - 1)}>‹</button>
              <button className={`${styles.mediaNav} ${styles.mediaNext}`} type="button" onClick={() => setImageIndex((value) => (value + 1) % post.images.length)}>›</button>
              <span className={styles.mediaCounter}>{imageIndex + 1}/{post.images.length}</span>
            </>
          ) : null}
        </div>
      ) : null}

      {activityUrl ? (
        <Link href={activityUrl} className={styles.activityCard}>
          <span className={styles.activityThumb}>
            {post.activityImageUrl ? <img src={post.activityImageUrl} alt="" /> : <b>◎</b>}
          </span>
          <div>
            <strong>{post.activityTitle || post.activityType}</strong>
            <small>{post.activitySubtitle}</small>
          </div>
          <span>›</span>
        </Link>
      ) : null}

      <footer className={styles.postFooter}>
        <button type="button" className={post.isLiked ? styles.postActionActive : undefined} onClick={onLike}>
          <span aria-hidden="true">{post.isLiked ? "♥" : "♡"}</span>
          <span>{post.likeCount} {t.likes}</span>
        </button>
        <button type="button" onClick={onComment}>
          <span aria-hidden="true">◯</span>
          <span>{post.commentCount} {t.comments}</span>
        </button>
        <button type="button" onClick={onShare}>
          <span aria-hidden="true">↗</span>
          <span>{post.shareCount} {t.shares}</span>
        </button>
      </footer>
    </article>
  );
}

function ProfileCommentsDrawer({
  post,
  locale,
  t,
  onClose,
  onCount,
}: {
  post: SocialFeedPost;
  locale: AppLocale;
  t: (typeof COPY)[AppLocale];
  onClose: () => void;
  onCount: (count: number) => void;
}) {
  const [comments, setComments] = useState<SocialPostComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  async function loadComments() {
    setLoading(true);
    try {
      const rows = await loadSocialPostCommentsWeb(post.id);
      setComments(rows);
      onCount(rows.length);
    } catch (commentError) {
      console.warn("[Melo Web] Unable to load profile post comments", commentError);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadComments();
  }, [post.id]);

  async function sendComment() {
    const value = body.trim();
    if (!value || sending) return;
    setSending(true);
    try {
      await createSocialPostCommentWeb(post.id, value);
      setBody("");
      await loadComments();
    } catch (commentError) {
      console.warn("[Melo Web] Unable to create profile post comment", commentError);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={styles.commentBackdrop} onMouseDown={onClose}>
      <aside className={styles.commentDrawer} onMouseDown={(event) => event.stopPropagation()}>
        <header className={styles.commentDrawerHead}>
          <div>
            <h3>{t.comments}</h3>
            <small>{post.authorName || "Melo"}</small>
          </div>
          <button type="button" onClick={onClose} aria-label="Close">×</button>
        </header>

        <div className={styles.commentList}>
          {loading ? (
            <div className={styles.commentState}>…</div>
          ) : comments.length ? (
            comments.map((comment) => (
              <article className={styles.commentItem} key={comment.id}>
                <Link href={`/users/${comment.authorId}`} className={styles.commentAvatar}>
                  <VerifiedUserAvatar userId={comment.authorId} name={comment.authorName} src={comment.authorPhotoUrl} badgeSize={15} alt="" />
                </Link>
                <div>
                  <strong><Link href={`/users/${comment.authorId}`}>{comment.authorName}</Link></strong>
                  <p>{comment.body}</p>
                  <small>{comment.createdAt ? new Date(comment.createdAt).toLocaleString(dateLocale(locale)) : ""}</small>
                </div>
              </article>
            ))
          ) : (
            <div className={styles.commentState}>{t.noComments}</div>
          )}
        </div>

        <div className={styles.commentComposer}>
          <textarea
            rows={2}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder={t.commentPlaceholder}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void sendComment();
              }
            }}
          />
          <button type="button" onClick={() => void sendComment()} disabled={!body.trim() || sending}>{t.send}</button>
        </div>
      </aside>
    </div>
  );
}

