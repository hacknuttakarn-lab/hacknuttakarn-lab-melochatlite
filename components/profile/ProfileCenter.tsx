"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { meloWebSupabase } from "@/lib/meloWebSupabase";
import styles from "./ProfileCenter.module.css";
import VerifiedUserAvatar from "@/components/profile/VerifiedUserAvatar";

type Locale = "th" | "en" | "de" | "zh" | "ja" | "ko";
type AnyRecord = Record<string, any>;

const copy: Record<Locale, Record<string, string>> = {
  th: {
    eyebrow: "MELO PROFILE",
    title: "โปรไฟล์ของฉัน",
    subtitle: "ข้อมูลตัวตน ไลฟ์สไตล์ การยืนยันบัญชี และชื่อเสียงจากกิจกรรมใน Melo",
    refresh: "รีเฟรช",
    account: "บัญชีของฉัน",
    notSignedIn: "กรุณาเข้าสู่ระบบเพื่อดูโปรไฟล์",
    login: "เข้าสู่ระบบ",
    loading: "กำลังโหลดโปรไฟล์…",
    overview: "ภาพรวม",
    about: "เกี่ยวกับฉัน",
    lifestyle: "ไลฟ์สไตล์และความสนใจ",
    verification: "การยืนยันบัญชี",
    reputation: "ชื่อเสียง",
    reviews: "รีวิวล่าสุด",
    language: "ภาษาหลัก",
    languages: "ภาษาที่ใช้",
    city: "เมือง",
    country: "ประเทศ",
    age: "อายุ",
    zodiac: "ราศี",
    interests: "ความสนใจ",
    relationship: "เป้าหมายความสัมพันธ์",
    friendGoal: "เป้าหมายการหาเพื่อน",
    verified: "ยืนยันแล้ว",
    pending: "กำลังตรวจสอบ",
    notVerified: "ยังไม่ยืนยัน",
    email: "อีเมล",
    phone: "โทรศัพท์",
    identity: "เอกสารยืนยันตัวตน",
    selfie: "รูปยืนยันตัวตน",
    rating: "คะแนนชื่อเสียง",
    reviewCount: "รีวิว",
    completedTrips: "ทริปที่จบแล้ว",
    completedEvents: "กิจกรรมที่จบแล้ว",
    noReviews: "ยังไม่มีรีวิวจากสมาชิก",
    noBio: "ยังไม่ได้เพิ่มข้อมูลเกี่ยวกับตัวเอง",
    noInterests: "ยังไม่ได้เพิ่มความสนใจ",
    discover: "ไปยัง Melo Connect",
    trips: "ทริป",
    events: "กิจกรรม",
    community: "คอมมูนิตี้",
    quests: "ภารกิจ", passport: "พาสปอร์ต & เหรียญตรา",
    error: "โหลดข้อมูลไม่สำเร็จ",
    years: "ปี",
    reviewer: "สมาชิก Melo",
    verifiedUser: "บัญชียืนยันแล้ว",
  },
  en: {
    eyebrow: "MELO PROFILE", title: "My profile",
    subtitle: "Identity, lifestyle, verification and reputation from your Melo activities",
    refresh: "Refresh", account: "My account", notSignedIn: "Sign in to view your profile",
    login: "Sign in", loading: "Loading profile…", overview: "Overview", about: "About me",
    lifestyle: "Lifestyle & interests", verification: "Account verification", reputation: "Reputation",
    reviews: "Recent reviews", language: "Primary language", languages: "Languages", city: "City",
    country: "Country", age: "Age", zodiac: "Zodiac", interests: "Interests",
    relationship: "Relationship goal", friendGoal: "Friend goal", verified: "Verified",
    pending: "Under review", notVerified: "Not verified", email: "Email", phone: "Phone",
    identity: "Identity document", selfie: "Verification selfie", rating: "Reputation score",
    reviewCount: "Reviews", completedTrips: "Completed trips", completedEvents: "Completed events",
    noReviews: "No member reviews yet", noBio: "No bio added yet", noInterests: "No interests added yet",
    discover: "Open Melo Connect", trips: "Trips", events: "Events", community: "Community",
    quests: "Quests", passport: "Passport & Badges", error: "Unable to load profile", years: "years", reviewer: "Melo member",
    verifiedUser: "Verified account",
  },
  de: {
    eyebrow: "MELO PROFIL", title: "Mein Profil",
    subtitle: "Identität, Lifestyle, Verifizierung und Reputation aus deinen Melo-Aktivitäten",
    refresh: "Aktualisieren", account: "Mein Konto", notSignedIn: "Bitte anmelden, um dein Profil zu sehen",
    login: "Anmelden", loading: "Profil wird geladen…", overview: "Übersicht", about: "Über mich",
    lifestyle: "Lifestyle & Interessen", verification: "Kontoverifizierung", reputation: "Reputation",
    reviews: "Neueste Bewertungen", language: "Hauptsprache", languages: "Sprachen", city: "Stadt",
    country: "Land", age: "Alter", zodiac: "Sternzeichen", interests: "Interessen",
    relationship: "Beziehungsziel", friendGoal: "Freundschaftsziel", verified: "Verifiziert",
    pending: "In Prüfung", notVerified: "Nicht verifiziert", email: "E-Mail", phone: "Telefon",
    identity: "Identitätsdokument", selfie: "Verifizierungs-Selfie", rating: "Reputationswert",
    reviewCount: "Bewertungen", completedTrips: "Abgeschlossene Reisen", completedEvents: "Abgeschlossene Events",
    noReviews: "Noch keine Bewertungen", noBio: "Noch keine Beschreibung", noInterests: "Noch keine Interessen",
    discover: "Melo Connect öffnen", trips: "Reisen", events: "Events", community: "Community",
    quests: "Missionen", passport: "Reisepass & Abzeichen", error: "Profil konnte nicht geladen werden", years: "Jahre",
    reviewer: "Melo-Mitglied", verifiedUser: "Verifiziertes Konto",
  },
  zh: {
    eyebrow: "MELO 个人资料", title: "我的个人资料",
    subtitle: "查看你在 Melo 的身份、生活方式、认证状态与活动信誉",
    refresh: "刷新", account: "我的账户", notSignedIn: "请先登录以查看个人资料", login: "登录",
    loading: "正在加载个人资料…", overview: "概览", about: "关于我", lifestyle: "生活方式与兴趣",
    verification: "账户认证", reputation: "信誉", reviews: "最近评价", language: "主要语言",
    languages: "使用语言", city: "城市", country: "国家", age: "年龄", zodiac: "星座",
    interests: "兴趣", relationship: "关系目标", friendGoal: "交友目标", verified: "已认证",
    pending: "审核中", notVerified: "未认证", email: "邮箱", phone: "电话", identity: "身份证明",
    selfie: "认证自拍", rating: "信誉评分", reviewCount: "评价", completedTrips: "已完成旅行",
    completedEvents: "已完成活动", noReviews: "暂无成员评价", noBio: "尚未填写简介",
    noInterests: "尚未添加兴趣", discover: "打开 Melo Connect", trips: "旅行", events: "活动",
    community: "社区", quests: "任务", passport: "护照与徽章", error: "无法加载个人资料", years: "岁",
    reviewer: "Melo 成员", verifiedUser: "已认证账户",
  },
  ja: {
    eyebrow: "MELO PROFILE", title: "マイプロフィール",
    subtitle: "Meloでの本人情報、ライフスタイル、認証、アクティビティの評判を確認できます",
    refresh: "更新", account: "マイアカウント", notSignedIn: "プロフィールを見るにはログインしてください",
    login: "ログイン", loading: "プロフィールを読み込み中…", overview: "概要", about: "自己紹介",
    lifestyle: "ライフスタイル・興味", verification: "アカウント認証", reputation: "評判",
    reviews: "最近のレビュー", language: "メイン言語", languages: "使用言語", city: "都市",
    country: "国", age: "年齢", zodiac: "星座", interests: "興味", relationship: "恋愛の目的",
    friendGoal: "友達探しの目的", verified: "認証済み", pending: "確認中", notVerified: "未認証",
    email: "メール", phone: "電話", identity: "本人確認書類", selfie: "本人確認セルフィー",
    rating: "評判スコア", reviewCount: "レビュー", completedTrips: "完了した旅行",
    completedEvents: "完了したイベント", noReviews: "まだレビューはありません",
    noBio: "自己紹介はまだありません", noInterests: "興味はまだ登録されていません",
    discover: "Melo Connectへ", trips: "旅行", events: "イベント", community: "コミュニティ",
    quests: "クエスト", passport: "パスポート & バッジ", error: "プロフィールを読み込めません", years: "歳",
    reviewer: "Meloメンバー", verifiedUser: "認証済みアカウント",
  },
  ko: {
    eyebrow: "MELO PROFILE", title: "내 프로필",
    subtitle: "Melo의 신원, 라이프스타일, 인증 상태와 활동 평판을 확인하세요",
    refresh: "새로고침", account: "내 계정", notSignedIn: "프로필을 보려면 로그인하세요",
    login: "로그인", loading: "프로필 불러오는 중…", overview: "개요", about: "소개",
    lifestyle: "라이프스타일 & 관심사", verification: "계정 인증", reputation: "평판",
    reviews: "최근 리뷰", language: "기본 언어", languages: "사용 언어", city: "도시",
    country: "국가", age: "나이", zodiac: "별자리", interests: "관심사", relationship: "관계 목표",
    friendGoal: "친구 찾기 목표", verified: "인증됨", pending: "검토 중", notVerified: "미인증",
    email: "이메일", phone: "전화", identity: "신분증", selfie: "인증 셀피",
    rating: "평판 점수", reviewCount: "리뷰", completedTrips: "완료한 여행",
    completedEvents: "완료한 이벤트", noReviews: "아직 리뷰가 없습니다", noBio: "소개가 없습니다",
    noInterests: "관심사가 없습니다", discover: "Melo Connect 열기", trips: "여행",
    events: "이벤트", community: "커뮤니티", quests: "퀘스트", passport: "패스포트 & 배지", error: "프로필을 불러올 수 없습니다",
    years: "세", reviewer: "Melo 회원", verifiedUser: "인증 계정",
  },
};

function currentLocale(): Locale {
  if (typeof document === "undefined") return "th";
  const lang = (document.documentElement.lang || navigator.language || "th").toLowerCase();
  if (lang.startsWith("de")) return "de";
  if (lang.startsWith("zh")) return "zh";
  if (lang.startsWith("ja")) return "ja";
  if (lang.startsWith("ko")) return "ko";
  if (lang.startsWith("en")) return "en";
  return "th";
}

function arrayOf(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item : item?.name ?? item?.label ?? ""))
      .filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    if (value.includes(",")) return value.split(",").map((v) => v.trim()).filter(Boolean);
    return [value.trim()];
  }
  return [];
}

function firstValue(record: AnyRecord | null, keys: string[]): any {
  if (!record) return null;
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") return value;
  }
  return null;
}

function ageFrom(value: unknown): number | null {
  if (!value) return null;
  const birth = new Date(String(value));
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const beforeBirthday =
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate());
  if (beforeBirthday) age -= 1;
  return age >= 0 && age < 120 ? age : null;
}

function verificationText(t: Record<string, string>, value: unknown) {
  const status = String(value || "").toLowerCase();
  if (status === "approved" || status === "true") return t.verified;
  if (status === "pending") return t.pending;
  return t.notVerified;
}

export default function ProfileCenter() {
  const [locale, setLocale] = useState<Locale>("th");
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [currentUserId, setCurrentUserId] = useState("");
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<AnyRecord | null>(null);
  const [verification, setVerification] = useState<AnyRecord | null>(null);
  const [reputation, setReputation] = useState<AnyRecord | null>(null);
  const [reviews, setReviews] = useState<AnyRecord[]>([]);

  const t = copy[locale];

  useEffect(() => {
    const sync = () => setLocale(currentLocale());
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    return () => observer.disconnect();
  }, []);

  const load = useCallback(async () => {
    if (!meloWebSupabase) {
      setError("Supabase environment is not configured.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { data: sessionData } = await meloWebSupabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) {
        setSignedIn(false);
        setLoading(false);
        return;
      }

      setSignedIn(true);
      setCurrentUserId(user.id);

      const [profileResult, verificationResult, reputationResult, reviewResult] =
        await Promise.allSettled([
          meloWebSupabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
          meloWebSupabase.rpc("get_my_verification"),
          meloWebSupabase.rpc("get_reputation_summary", { p_user_id: user.id }),
          meloWebSupabase.rpc("get_reputation_reviews", { p_user_id: user.id }),
        ]);

      if (profileResult.status === "fulfilled" && !profileResult.value.error) {
        setProfile(profileResult.value.data ?? {});
      }

      if (verificationResult.status === "fulfilled" && !verificationResult.value.error) {
        const data = verificationResult.value.data;
        setVerification(Array.isArray(data) ? data[0] ?? null : data ?? null);
      }

      if (reputationResult.status === "fulfilled" && !reputationResult.value.error) {
        const data = reputationResult.value.data;
        setReputation(Array.isArray(data) ? data[0] ?? null : data ?? null);
      }

      if (reviewResult.status === "fulfilled" && !reviewResult.value.error) {
        setReviews(Array.isArray(reviewResult.value.data) ? reviewResult.value.data : []);
      }
    } catch (err: any) {
      setError(err?.message || t.error);
    } finally {
      setLoading(false);
    }
  }, [t.error]);

  useEffect(() => {
    load();
  }, [load]);

  const displayName = String(
    firstValue(profile, ["display_name", "full_name", "name", "username"]) || "Melo User"
  );
  const bio = String(firstValue(profile, ["bio", "about_me", "about"]) || "");
  const city = String(firstValue(profile, ["city", "location_city"]) || "—");
  const country = String(
    firstValue(profile, ["country_name", "country", "country_code", "nationality"]) || "—"
  );
  const primaryLanguage = String(
    firstValue(profile, ["primary_language", "language"]) || "—"
  );
  const languages = arrayOf(firstValue(profile, ["languages", "spoken_languages"]));
  const interests = arrayOf(firstValue(profile, ["interests", "interest_tags"]));
  const relationshipGoal = String(
    firstValue(profile, ["relationship_goal", "dating_goal", "looking_for"]) || "—"
  );
  const friendGoal = String(
    firstValue(profile, ["friend_goal", "friendship_goal", "friend_mode_goal"]) || "—"
  );
  const zodiac = String(firstValue(profile, ["zodiac_sign", "zodiac"]) || "—");
  const age = ageFrom(firstValue(profile, ["birth_date", "date_of_birth", "birthday"]));
  const photoPaths = arrayOf(firstValue(profile, ["photo_paths", "photos"]));
  const avatar = String(firstValue(profile, ["avatar_url", "photo_url", "profile_image"]) || photoPaths[0] || "");
  const avatarIsHttp = /^https?:\/\//i.test(avatar);

  const rating = Number(firstValue(reputation, ["average_rating", "reputation_score"]) || 0);
  const reviewCount = Number(firstValue(reputation, ["review_count"]) || reviews.length || 0);
  const completedTrips = Number(firstValue(reputation, ["completed_trips"]) || 0);
  const completedEvents = Number(firstValue(reputation, ["completed_events"]) || 0);
  const topTags = arrayOf(firstValue(reputation, ["top_tags"]));

  const verificationCards = useMemo(
    () => [
      {
        label: t.email,
        status:
          verification?.email_verified === true ? t.verified : t.notVerified,
        good: verification?.email_verified === true,
      },
      {
        label: t.phone,
        status:
          verification?.phone_verified === true ? t.verified : t.notVerified,
        good: verification?.phone_verified === true,
      },
      {
        label: t.identity,
        status: verificationText(t, verification?.identity_status),
        good: verification?.identity_status === "approved",
      },
      {
        label: t.selfie,
        status: verificationText(t, verification?.selfie_status),
        good: verification?.selfie_status === "approved",
      },
    ],
    [t, verification]
  );

  if (loading) {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <div className={styles.loadingCard}>{t.loading}</div>
        </div>
      </main>
    );
  }

  if (!signedIn) {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <section className={styles.signInCard}>
            <div className={styles.profileMark}>👤</div>
            <h1>{t.notSignedIn}</h1>
            <Link className={styles.primaryButton} href="/login">
              {t.login}
            </Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.hero}>
          <div>
            <div className={styles.eyebrow}>{t.eyebrow}</div>
            <h1>{t.title}</h1>
            <p>{t.subtitle}</p>
          </div>
          <div className={styles.heroActions}>
            <Link className={styles.secondaryButton} href="/account">
              {t.account}
            </Link>
            <button className={styles.primaryButton} onClick={load}>
              {t.refresh}
            </button>
          </div>
        </section>

        {error ? <div className={styles.errorBox}>{error}</div> : null}

        <section className={styles.profileCard}>
          <div className={styles.avatarWrap}>
            <VerifiedUserAvatar userId={currentUserId} name={displayName} src={avatarIsHttp ? avatar : ""} country={country} verified={Boolean(verification?.is_verified)} className={styles.avatar} badgeSize={20} alt={displayName} />
          </div>

          <div className={styles.identity}>
            <div className={styles.nameRow}>
              <h2>{displayName}</h2>
              {verification?.is_verified ? (
                <span className={styles.verifiedBadge}>✓ {t.verifiedUser}</span>
              ) : null}
            </div>
            <div className={styles.locationLine}>
              {city} · {country}
              {age !== null ? ` · ${age} ${t.years}` : ""}
            </div>
            <p className={styles.bio}>{bio || t.noBio}</p>
            <div className={styles.quickTags}>
              {topTags.slice(0, 5).map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          </div>

          <div className={styles.ratingBlock}>
            <strong>{rating > 0 ? rating.toFixed(1) : "—"}</strong>
            <span>★ {t.rating}</span>
            <small>{reviewCount} {t.reviewCount}</small>
          </div>
        </section>

        <section className={styles.statsGrid}>
          <article>
            <strong>{completedTrips}</strong>
            <span>{t.completedTrips}</span>
          </article>
          <article>
            <strong>{completedEvents}</strong>
            <span>{t.completedEvents}</span>
          </article>
          <article>
            <strong>{reviewCount}</strong>
            <span>{t.reviewCount}</span>
          </article>
          <article>
            <strong>{rating > 0 ? rating.toFixed(1) : "—"}</strong>
            <span>{t.rating}</span>
          </article>
        </section>

        <div className={styles.twoColumn}>
          <section className={styles.infoCard}>
            <div className={styles.sectionHead}>
              <span className={styles.sectionIcon}>◎</span>
              <h2>{t.about}</h2>
            </div>
            <div className={styles.infoRows}>
              <div><span>{t.city}</span><strong>{city}</strong></div>
              <div><span>{t.country}</span><strong>{country}</strong></div>
              <div><span>{t.age}</span><strong>{age !== null ? `${age} ${t.years}` : "—"}</strong></div>
              <div><span>{t.zodiac}</span><strong>{zodiac}</strong></div>
              <div><span>{t.language}</span><strong>{primaryLanguage}</strong></div>
              <div><span>{t.languages}</span><strong>{languages.length ? languages.join(" · ") : "—"}</strong></div>
            </div>
          </section>

          <section className={styles.infoCard}>
            <div className={styles.sectionHead}>
              <span className={styles.sectionIcon}>✦</span>
              <h2>{t.lifestyle}</h2>
            </div>
            <div className={styles.fieldLabel}>{t.interests}</div>
            <div className={styles.chips}>
              {interests.length ? (
                interests.map((interest) => <span key={interest}>{interest}</span>)
              ) : (
                <span className={styles.mutedChip}>{t.noInterests}</span>
              )}
            </div>
            <div className={styles.goalGrid}>
              <div>
                <span>{t.friendGoal}</span>
                <strong>{friendGoal}</strong>
              </div>
              <div>
                <span>{t.relationship}</span>
                <strong>{relationshipGoal}</strong>
              </div>
            </div>
          </section>
        </div>

        <section className={styles.infoCard}>
          <div className={styles.sectionHead}>
            <span className={styles.sectionIcon}>✓</span>
            <h2>{t.verification}</h2>
          </div>
          <div className={styles.verificationGrid}>
            {verificationCards.map((item) => (
              <article key={item.label} className={item.good ? styles.verifyGood : ""}>
                <span>{item.good ? "✓" : "○"}</span>
                <div>
                  <strong>{item.label}</strong>
                  <small>{item.status}</small>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="reputation" className={styles.infoCard}>
          <div className={styles.sectionHead}>
            <span className={styles.sectionIcon}>★</span>
            <div>
              <h2>{t.reputation}</h2>
              <p>{reviewCount} {t.reviewCount}</p>
            </div>
          </div>

          {reviews.length ? (
            <div className={styles.reviewList}>
              {reviews.slice(0, 8).map((review) => (
                <article className={styles.reviewCard} key={review.id || `${review.reviewer_id}-${review.created_at}`}>
                  <div className={styles.reviewTop}>
                    <div>
                      <strong>{review.reviewer_name || t.reviewer}</strong>
                      {review.reviewer_verified ? (
                        <span className={styles.miniVerified}>✓</span>
                      ) : null}
                    </div>
                    <div className={styles.stars}>
                      {"★".repeat(Math.max(0, Math.min(5, Number(review.rating || 0))))}
                    </div>
                  </div>
                  <div className={styles.reviewTags}>
                    {arrayOf(review.tags).map((tag) => <span key={tag}>{tag}</span>)}
                  </div>
                  {review.comment ? <p>{review.comment}</p> : null}
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.emptyReviews}>{t.noReviews}</div>
          )}
        </section>

        <section className={styles.launcher}>
          <Link href="/friends">🤝 {t.discover}</Link>
          <Link href="/trips">🧭 {t.trips}</Link>
          <Link href="/events">🎟️ {t.events}</Link>
          <Link href="/community">💬 {t.community}</Link>
          <Link href="/passport">🛂 {t.passport}</Link>
          <Link href="/quests">🏆 {t.quests}</Link>
        </section>
      </div>
    </main>
  );
}
