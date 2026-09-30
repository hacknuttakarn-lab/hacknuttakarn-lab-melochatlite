"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/Header";
import VerifiedUserAvatar from "@/components/profile/VerifiedUserAvatar";
import { loadSocialFeedWeb, toggleSocialPostLikeWeb, type SocialFeedPost } from "@/components/feed/socialFeedWebData";
import { useLocale } from "@/components/SiteProviders";
import { createSignedStorageUrl, getCurrentUser, isSupabaseConfigured, restSelect, rpcRequest } from "@/lib/supabase/browser";
import {
  ageFrom,
  arrayOf,
  firstValue,
  formatBirthDate,
  profileCoverUrl,
  profilePhotoUrl,
} from "./profileWebData";
import styles from "./ProfileOverviewExperience.module.css";

type Row = Record<string, any>;

type AppLocale = keyof typeof COPY;

const COPY = {
  th: {
    loading: "กำลังโหลดโปรไฟล์…", signIn: "กรุณาเข้าสู่ระบบเพื่อดูโปรไฟล์สมาชิก", login: "เข้าสู่ระบบ",
    notFound: "ไม่พบโปรไฟล์สมาชิกนี้", back: "ย้อนกลับ", verified: "ยืนยันตัวตนแล้ว", about: "เกี่ยวกับฉัน",
    more: "ดูข้อมูลเพิ่มเติม", less: "ซ่อนข้อมูลเพิ่มเติม", noBio: "ยังไม่ได้เพิ่มข้อมูลเกี่ยวกับตัวเอง", noValue: "ยังไม่ได้ระบุ",
    interests: "ความสนใจ", languages: "ภาษาที่ใช้", gender: "เพศ", birthDate: "วันเดือนปีเกิด", nationality: "สัญชาติ",
    job: "อาชีพ", education: "การศึกษา", height: "ส่วนสูง", reputation: "ชื่อเสียง", reputationScore: "คะแนนชื่อเสียง",
    reputationSummary: "สรุปชื่อเสียง", reviews: "รีวิว", completedTrips: "ทริปที่จบแล้ว", completedEvents: "กิจกรรมที่จบแล้ว",
    openReputation: "ดู Reputation", passport: "พาสปอร์ต & เหรียญตรา", openPassport: "เปิดพาสปอร์ต", profileInfo: "ข้อมูลเพิ่มเติม",
    posts: "โพสต์", postCount: "โพสต์ของสมาชิก", noPosts: "ยังไม่มีโพสต์", likes: "ถูกใจ", comments: "ความคิดเห็น", shares: "แชร์",
    public: "สาธารณะ", friends: "เพื่อน", tripMembers: "สมาชิกทริป", eventParticipants: "ผู้เข้าร่วมกิจกรรม",
    communityMembers: "สมาชิกคอมมูนิตี้", onlyMe: "เฉพาะฉัน", error: "โหลดข้อมูลโปรไฟล์ไม่สำเร็จ",
  },
  en: {
    loading: "Loading profile…", signIn: "Sign in to view member profiles", login: "Sign in", notFound: "This member profile was not found",
    back: "Back", verified: "Verified", about: "About me", more: "View more details", less: "Hide details",
    noBio: "No bio added yet", noValue: "Not specified", interests: "Interests", languages: "Languages", gender: "Gender",
    birthDate: "Date of birth", nationality: "Nationality", job: "Job", education: "Education", height: "Height",
    reputation: "Reputation", reputationScore: "Reputation score", reputationSummary: "Reputation summary", reviews: "Reviews",
    completedTrips: "Completed trips", completedEvents: "Completed events", openReputation: "View Reputation", passport: "Passport & Badges",
    openPassport: "Open passport", profileInfo: "More profile details", posts: "Posts", postCount: "Member posts", noPosts: "No posts yet",
    likes: "Likes", comments: "Comments", shares: "Shares", public: "Public", friends: "Friends", tripMembers: "Trip members",
    eventParticipants: "Event participants", communityMembers: "Community members", onlyMe: "Only me", error: "Unable to load profile",
  },
  de: {
    loading: "Profil wird geladen…", signIn: "Bitte anmelden, um Profile zu sehen", login: "Anmelden", notFound: "Dieses Profil wurde nicht gefunden",
    back: "Zurück", verified: "Verifiziert", about: "Über mich", more: "Mehr Details", less: "Details ausblenden", noBio: "Noch keine Beschreibung",
    noValue: "Nicht angegeben", interests: "Interessen", languages: "Sprachen", gender: "Geschlecht", birthDate: "Geburtsdatum",
    nationality: "Nationalität", job: "Beruf", education: "Ausbildung", height: "Größe", reputation: "Reputation",
    reputationScore: "Reputationswert", reputationSummary: "Reputationsübersicht", reviews: "Bewertungen", completedTrips: "Abgeschlossene Reisen",
    completedEvents: "Abgeschlossene Events", openReputation: "Reputation ansehen", passport: "Reisepass & Abzeichen", openPassport: "Reisepass öffnen",
    profileInfo: "Weitere Profildetails", posts: "Beiträge", postCount: "Beiträge des Mitglieds", noPosts: "Noch keine Beiträge",
    likes: "Gefällt mir", comments: "Kommentare", shares: "Geteilt", public: "Öffentlich", friends: "Freunde", tripMembers: "Reisemitglieder",
    eventParticipants: "Event-Teilnehmer", communityMembers: "Community-Mitglieder", onlyMe: "Nur ich", error: "Profil konnte nicht geladen werden",
  },
  zh: {
    loading: "正在加载资料…", signIn: "请登录后查看成员资料", login: "登录", notFound: "找不到该成员资料", back: "返回", verified: "已认证",
    about: "关于我", more: "查看更多资料", less: "收起资料", noBio: "尚未填写简介", noValue: "未填写", interests: "兴趣",
    languages: "使用语言", gender: "性别", birthDate: "出生日期", nationality: "国籍", job: "职业", education: "教育", height: "身高",
    reputation: "信誉", reputationScore: "信誉评分", reputationSummary: "信誉概览", reviews: "评价", completedTrips: "已完成旅行",
    completedEvents: "已完成活动", openReputation: "查看信誉", passport: "护照与徽章", openPassport: "打开护照", profileInfo: "更多资料",
    posts: "帖子", postCount: "成员帖子", noPosts: "暂无帖子", likes: "赞", comments: "评论", shares: "分享", public: "公开",
    friends: "好友", tripMembers: "旅行成员", eventParticipants: "活动参与者", communityMembers: "社区成员", onlyMe: "仅自己", error: "无法加载资料",
  },
  ja: {
    loading: "プロフィールを読み込み中…", signIn: "プロフィールを見るにはログインしてください", login: "ログイン", notFound: "プロフィールが見つかりません",
    back: "戻る", verified: "認証済み", about: "自己紹介", more: "詳細を見る", less: "詳細を隠す", noBio: "自己紹介はまだありません",
    noValue: "未設定", interests: "興味", languages: "使用言語", gender: "性別", birthDate: "生年月日", nationality: "国籍", job: "職業",
    education: "学歴", height: "身長", reputation: "評判", reputationScore: "評判スコア", reputationSummary: "評判の概要",
    reviews: "レビュー", completedTrips: "完了した旅行", completedEvents: "完了したイベント", openReputation: "評判を見る",
    passport: "パスポート & バッジ", openPassport: "パスポートを開く", profileInfo: "プロフィール詳細", posts: "投稿", postCount: "メンバーの投稿",
    noPosts: "まだ投稿はありません", likes: "いいね", comments: "コメント", shares: "シェア", public: "公開", friends: "友達",
    tripMembers: "Tripメンバー", eventParticipants: "Event参加者", communityMembers: "Communityメンバー", onlyMe: "自分のみ", error: "プロフィールを読み込めません",
  },
  ko: {
    loading: "프로필 불러오는 중…", signIn: "회원 프로필을 보려면 로그인하세요", login: "로그인", notFound: "회원 프로필을 찾을 수 없습니다",
    back: "뒤로", verified: "인증됨", about: "소개", more: "상세 정보 보기", less: "상세 정보 숨기기", noBio: "소개가 없습니다",
    noValue: "미입력", interests: "관심사", languages: "사용 언어", gender: "성별", birthDate: "생년월일", nationality: "국적", job: "직업",
    education: "학력", height: "키", reputation: "평판", reputationScore: "평판 점수", reputationSummary: "평판 요약", reviews: "리뷰",
    completedTrips: "완료한 여행", completedEvents: "완료한 이벤트", openReputation: "평판 보기", passport: "패스포트 & 배지",
    openPassport: "패스포트 열기", profileInfo: "프로필 상세 정보", posts: "게시물", postCount: "회원 게시물", noPosts: "아직 게시물이 없습니다",
    likes: "좋아요", comments: "댓글", shares: "공유", public: "공개", friends: "친구", tripMembers: "여행 멤버",
    eventParticipants: "이벤트 참가자", communityMembers: "커뮤니티 멤버", onlyMe: "나만 보기", error: "프로필을 불러올 수 없습니다",
  },
} as const;

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

function nice(value: unknown) {
  return String(value || "").replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function PublicProfileExperience() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { locale } = useLocale();
  const activeLocale = (locale in COPY ? locale : "en") as AppLocale;
  const t = COPY[activeLocale];
  const userId = String(params?.id || "");

  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [profile, setProfile] = useState<Row | null>(null);
  const [reputation, setReputation] = useState<Row | null>(null);
  const [verified, setVerified] = useState(false);
  const [publicCoverUrl, setPublicCoverUrl] = useState("");
  const [posts, setPosts] = useState<SocialFeedPost[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      if (!isSupabaseConfigured() || !userId) {
        setLoading(false);
        return;
      }

      const currentUser = await getCurrentUser();
      if (!active) return;
      if (!currentUser) {
        setSignedIn(false);
        setLoading(false);
        return;
      }
      setSignedIn(true);

      if (currentUser.id === userId) {
        router.replace("/profile");
        return;
      }

      const [profileResult, reputationResult, verificationResult, postsResult] = await Promise.all([
        restSelect<Row[]>("profiles", `select=*&id=eq.${encodeURIComponent(userId)}&limit=1`),
        rpcRequest<Row[] | Row>("get_reputation_summary", { p_user_id: userId }),
        rpcRequest<boolean>("get_public_identity_verification", { p_user_id: userId }),
        loadSocialFeedWeb({ limit: 30, offset: 0, authorId: userId }).catch(() => [] as SocialFeedPost[]),
      ]);

      if (!active) return;
      const profileRows = Array.isArray(profileResult.data) ? profileResult.data : [];
      const publicProfile = profileRows[0] || null;
      setProfile(publicProfile);
      const rep = reputationResult.data;
      setReputation(Array.isArray(rep) ? rep[0] || null : rep || null);
      // The public verification RPC is the single source of truth for the check mark.
      setVerified(!verificationResult.error && verificationResult.data === true);

      // Cover is stored on profiles.cover_path. Resolve it with an authenticated
      // signed URL so this also works when the profile-photos bucket is private.
      const coverPath = String(firstValue(publicProfile, ["cover_path", "cover_url", "cover_image_url", "profile_cover_url"]) || "").trim();
      if (coverPath) {
        if (/^https?:\/\//i.test(coverPath)) {
          setPublicCoverUrl(coverPath);
        } else {
          const signedCover = await createSignedStorageUrl("profile-photos", coverPath, 3600);
          if (!active) return;
          setPublicCoverUrl(!signedCover.error && signedCover.data ? signedCover.data : profileCoverUrl(publicProfile, null));
        }
      } else {
        setPublicCoverUrl(profileCoverUrl(publicProfile, null));
      }
      setPosts(Array.isArray(postsResult) ? postsResult : []);

      const errors = [profileResult.error, reputationResult.error].filter(Boolean);
      if (!profileRows.length && errors.length) setError(errors[0] || t.error);
      setLoading(false);
    }

    void load();
    return () => { active = false; };
  }, [router, t.error, userId]);

  const displayName = String(firstValue(profile, ["display_name", "first_name", "full_name", "name", "username"]) || firstValue(reputation, ["display_name"]) || "Melo User");
  const age = ageFrom(firstValue(profile, ["date_of_birth", "birth_date", "birthday"]));
  const city = String(firstValue(profile, ["city", "province", "location_city"]) || "");
  const country = String(firstValue(profile, ["country", "country_name", "nationality"]) || "");
  const nationality = String(firstValue(profile, ["nationality"]) || "");
  const bio = String(firstValue(profile, ["bio", "about_me", "about"]) || "");
  const avatar = profilePhotoUrl(profile, 0) || profilePhotoUrl({ photo_paths: [firstValue(reputation, ["photo_path"])] }, 0);
  const cover = publicCoverUrl || profileCoverUrl(profile, null);
    const rating = Number(firstValue(reputation, ["average_rating", "reputation_score"]) || 0);
  const reviewCount = Number(firstValue(reputation, ["review_count"]) || 0);
  const completedTrips = Number(firstValue(reputation, ["completed_trips"]) || 0);
  const completedEvents = Number(firstValue(reputation, ["completed_events"]) || 0);
  const interests = arrayOf(firstValue(profile, ["interests", "interest_tags"]));
  const primaryLanguage = String(firstValue(profile, ["primary_language", "language"]) || "");
  const languages = [...new Set([primaryLanguage, ...arrayOf(firstValue(profile, ["languages", "spoken_languages"]))].filter(Boolean))];
  const gender = nice(firstValue(profile, ["gender"])) || t.noValue;
  const birthDate = firstValue(profile, ["date_of_birth", "birth_date", "birthday"]);
  const job = String(firstValue(profile, ["job_title", "job"]) || "");
  const education = String(firstValue(profile, ["education"]) || "");
  const height = Number(firstValue(profile, ["height_cm", "height"]) || 0);

  const detailRows = useMemo(() => [
    { label: t.gender, value: gender },
    { label: t.birthDate, value: formatBirthDate(birthDate, dateLocale(activeLocale)) || t.noValue },
    { label: t.nationality, value: nationality || t.noValue },
    { label: t.job, value: job || t.noValue },
    { label: t.education, value: education || t.noValue },
    { label: t.height, value: height > 0 ? `${height} cm` : t.noValue },
  ], [activeLocale, birthDate, education, gender, height, job, nationality, t]);

  async function likePost(post: SocialFeedPost) {
    try {
      const result = await toggleSocialPostLikeWeb(post.id);
      setPosts((current) => current.map((item) => item.id === post.id ? { ...item, isLiked: result.isLiked, likeCount: result.likeCount } : item));
    } catch (likeError) {
      console.warn("[Melo Web] Unable to toggle member profile post like", likeError);
    }
  }

  if (loading) return <main className={styles.page}><Header /><div className={styles.state}>{t.loading}</div></main>;

  if (!signedIn) {
    return <main className={styles.page}><Header /><div className={styles.state}><strong>{t.signIn}</strong><Link href="/login">{t.login}</Link></div></main>;
  }

  if (!profile && !reputation) {
    return <main className={styles.page}><Header /><div className={styles.state}><strong>{t.notFound}</strong><button type="button" onClick={() => router.back()}>{t.back}</button>{error ? <p>{error}</p> : null}</div></main>;
  }

  return (
    <main className={styles.page}>
      <Header />
      <section className={styles.shell}>
        {error ? <div className={styles.error}>{error}</div> : null}

        <section className={styles.heroCard}>
          <div className={styles.cover}>
            {cover ? <img src={cover} alt="" /> : <div className={styles.coverFallback} />}
            <div className={styles.coverShade} />
          </div>

          <div className={styles.heroBody}>
            <div className={styles.identityRow}>
              <div className={styles.identityCluster}>
                <VerifiedUserAvatar
                  userId={userId}
                  name={displayName}
                  src={avatar}
                  country={country}
                  nationality={nationality}
                  verified={verified}
                  className={styles.avatarWrap}
                  badgeSize={23}
                  alt={displayName}
                />
                <div className={styles.identity}>
                  <div className={styles.nameLine}>
                    <h1>{displayName}{age !== null ? `, ${age}` : ""}</h1>
                    {verified ? <span className={styles.verifiedPill}>✓ {t.verified}</span> : null}
                  </div>
                  <p>{[city, country].filter(Boolean).join(", ") || t.noValue}</p>
                </div>
              </div>
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
            </section>
          </div>
        </section>

        <div className={styles.contentGrid}>
          <section className={styles.mainColumn}>
            <section className={styles.postsSection}>
              <header className={styles.postsHead}>
                <div><span>{t.postCount}</span><h2>{t.posts}</h2></div>
                <b>{posts.length}</b>
              </header>

              {posts.length ? (
                <div className={styles.postList}>
                  {posts.map((post) => (
                    <PublicProfilePostCard
                      key={post.id}
                      post={post}
                      avatar={avatar}
                      name={displayName}
                      userId={userId}
                      country={country}
                      nationality={nationality}
                      verified={verified}
                      locale={activeLocale}
                      t={t}
                      onLike={() => void likePost(post)}
                    />
                  ))}
                </div>
              ) : (
                <div className={styles.emptyPosts}><span>◌</span><strong>{t.noPosts}</strong></div>
              )}
            </section>
          </section>

          <aside className={styles.sideColumn}>
            <section className={styles.sideCard} id="reputation">
              <div className={styles.sideCardHead}>
                <span className={`${styles.sideIcon} ${styles.reputationIcon}`}>★</span>
                <div><strong>{t.reputation}</strong><small>{t.reputationSummary}</small></div>
              </div>
              <div className={styles.ratingRow}><strong>{rating > 0 ? rating.toFixed(1) : "—"}</strong><span>{t.reputationScore}</span></div>
              <div className={styles.statsGrid}>
                <div><strong>{reviewCount}</strong><span>{t.reviews}</span></div>
                <div><strong>{completedTrips}</strong><span>{t.completedTrips}</span></div>
                <div><strong>{completedEvents}</strong><span>{t.completedEvents}</span></div>
              </div>
              <Link href={`/reputation/${userId}`} className={styles.reputationTextLink}>{t.openReputation} <span>→</span></Link>
            </section>

            <Link href={`/passport/${userId}`} className={`${styles.sideCard} ${styles.passportCard}`}>
              <div className={styles.sideCardHead}>
                <span className={styles.sideIcon}>◎</span>
                <div><strong>{t.passport}</strong><small>{completedTrips} {t.completedTrips} · {completedEvents} {t.completedEvents}</small></div>
              </div>
              <span className={styles.sideLink}>{t.openPassport} →</span>
            </Link>

            <section className={`${styles.sideCard} ${styles.profileDetailsCard}`}>
              <div className={styles.sideCardHead}>
                <span className={styles.sideIcon}>◉</span>
                <div><strong>{t.profileInfo}</strong></div>
              </div>
              <div className={styles.profileQuickGrid}>
                <div><span>{t.languages}</span><strong>{languages.slice(0, 3).join(" · ") || t.noValue}</strong></div>
                <div><span>{t.nationality}</span><strong>{nationality || t.noValue}</strong></div>
                <div><span>{t.job}</span><strong>{job || t.noValue}</strong></div>
              </div>

              {expanded ? (
                <div className={styles.expandedProfileDetails}>
                  <section className={styles.infoSection}>
                    <h3>{t.interests}</h3>
                    <div className={styles.chips}>
                      {interests.length ? interests.map((value) => <b key={value}>{value}</b>) : <span>{t.noValue}</span>}
                    </div>
                  </section>
                  <div className={styles.detailTable}>
                    {detailRows.filter((detail) => detail.label !== t.nationality && detail.label !== t.job).map((detail) => (
                      <div className={styles.detailRow} key={detail.label}><span>{detail.label}</span><strong>{detail.value}</strong></div>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}

function PublicProfilePostCard({
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
}) {
  const [imageIndex, setImageIndex] = useState(0);
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
          <small>{post.createdAt ? new Date(post.createdAt).toLocaleString(dateLocale(locale)) : ""}{post.locationName ? ` · ${post.locationName}` : ""}</small>
        </div>
        <span className={styles.visibilityPill}>{visibilityLabel(post.visibility, t)}</span>
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
          <span className={styles.activityThumb}>{post.activityImageUrl ? <img src={post.activityImageUrl} alt="" /> : <b>◎</b>}</span>
          <div><strong>{post.activityTitle || post.activityType}</strong><small>{post.activitySubtitle}</small></div>
          <span>›</span>
        </Link>
      ) : null}

      <footer className={styles.postFooter}>
        <button type="button" className={post.isLiked ? styles.postActionActive : undefined} onClick={onLike}><span>{post.isLiked ? "♥" : "♡"}</span><span>{post.likeCount} {t.likes}</span></button>
        <button type="button"><span>◯</span><span>{post.commentCount} {t.comments}</span></button>
        <button type="button"><span>↗</span><span>{post.shareCount} {t.shares}</span></button>
      </footer>
    </article>
  );
}
