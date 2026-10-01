"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { useLocale } from "@/components/SiteProviders";
import { boostMyDatingProfile, loadDatingProfileById, loadLoveSnapshot, setLoveLike, loadFollowedProfileIds, setProfileFollow, setProfilePass, type DatingProfileWeb } from "@/components/connect/connectData";
import { getCurrentUser, isSupabaseConfigured } from "@/lib/supabase/browser";
import { countryFlagEmoji } from "@/lib/countryFlag";
import styles from "./HomeDashboardExperience.module.css";

const COPY = {
  th: { title: "สำหรับคุณ", subtitle: "ค้นพบคนใหม่ที่อาจเข้ากับคุณ", loading: "กำลังค้นหาคนที่เหมาะกับคุณ…", empty: "ยังไม่มีโปรไฟล์แนะนำในตอนนี้", error: "ยังโหลดโปรไฟล์แนะนำไม่ได้", retry: "ลองอีกครั้ง", env: "ยังไม่ได้ตั้งค่า Supabase สำหรับ Melo Chat Lite", boost: "Boost Profile", boostTitle: "บูทโปรไฟล์", boostHint: "ดันโปรไฟล์ของคุณกลับขึ้นมาแนะนำในลำดับต้น ๆ ของหน้า Home", boostNow: "Boost Profile", boosting: "กำลังบูท…", boosted: "บูทโปรไฟล์สำเร็จ", boostedDetail: "โปรไฟล์ของคุณถูกดันกลับขึ้นมาในลำดับแนะนำแล้ว", boostError: "ไม่สามารถบูทโปรไฟล์ได้ กรุณาลองอีกครั้ง", close: "ปิด" },
  en: { title: "For you", subtitle: "Discover people who may be a great match", loading: "Finding people for you…", empty: "No recommended profiles yet", error: "Recommended profiles could not be loaded yet", retry: "Try again", env: "Supabase is not configured for Melo Chat Lite", boost: "Boost Profile", boostTitle: "Boost your profile", boostHint: "Move your profile back toward the top of Home recommendations", boostNow: "Boost Profile", boosting: "Boosting…", boosted: "Profile boosted", boostedDetail: "Your profile has been moved back toward the top of recommendations.", boostError: "Your profile could not be boosted. Please try again.", close: "Close" },
  de: { title: "Für dich", subtitle: "Entdecke Menschen, die gut zu dir passen könnten", loading: "Passende Profile werden gesucht…", empty: "Noch keine empfohlenen Profile", error: "Empfohlene Profile konnten noch nicht geladen werden", retry: "Erneut versuchen", env: "Supabase ist für Melo Chat Lite nicht konfiguriert", boost: "Profil boosten", boostTitle: "Profil boosten", boostHint: "Verschiebe dein Profil wieder weiter nach oben in den Home-Empfehlungen", boostNow: "Profil boosten", boosting: "Wird geboostet…", boosted: "Profil geboostet", boostedDetail: "Dein Profil wurde wieder weiter nach oben in den Empfehlungen verschoben.", boostError: "Das Profil konnte nicht geboostet werden. Bitte versuche es erneut.", close: "Schließen" },
} as const;

type LiteLocale = keyof typeof COPY;

function nationalityLabel(profile: DatingProfileWeb) {
  return profile.nationality || profile.country || "—";
}

export default function HomeDashboardExperience() {
  const router = useRouter();
  const { locale } = useLocale();
  const t = COPY[(locale in COPY ? locale : "en") as LiteLocale];
  const configured = isSupabaseConfigured();
  const [profiles, setProfiles] = useState<DatingProfileWeb[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [lifestyle, setLifestyle] = useState("All");
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [interestedIds, setInterestedIds] = useState<string[]>([]);
  const [followedIds, setFollowedIds] = useState<string[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [profileLimit, setProfileLimit] = useState(15);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [selfProfile, setSelfProfile] = useState<DatingProfileWeb | null>(null);
  const [boostOpen, setBoostOpen] = useState(false);
  const [boostBusy, setBoostBusy] = useState(false);
  const [boostNotice, setBoostNotice] = useState<"success" | "error" | "">("");

  useEffect(() => {
    let active = true;
    if (!configured) {
      setProfiles([]);
      setError(t.env);
      setLoading(false);
      return () => { active = false; };
    }

    (async () => {
      setLoading(true);
      setError("");
      try {
        const user = await getCurrentUser();
        if (!active) return;
        if (!user) {
          router.replace("/login");
          return;
        }
        setCurrentUserId(user.id);
        const [snapshot, ownProfile] = await Promise.all([
          loadLoveSnapshot(user.id),
          loadDatingProfileById(user.id),
        ]);
        if (!active) return;
        setSelfProfile(ownProfile);
        setProfiles(snapshot.recommended);
        setInterestedIds(snapshot.likedIds || []);
        setFollowedIds(await loadFollowedProfileIds());
        setDismissedIds([]);
      } catch {
        if (!active) return;
        // Melo Chat Lite is being rebuilt on a fresh Supabase project.
        // Missing dating tables/RPCs must render as an empty/friendly state,
        // not as a Next.js development error overlay.
        setProfiles([]);
        setError(t.error);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => { active = false; };
  }, [configured, reloadKey, router, t.env, t.error]);

  const handleDismiss = async (profileId: string) => {
    const previous = dismissedIds;
    setDismissedIds((current) => current.includes(profileId) ? current : [...current, profileId]);
    setInterestedIds((current) => current.filter((id) => id !== profileId));
    try {
      await setProfilePass(profileId);
      window.dispatchEvent(new CustomEvent("melo-connect-updated"));
    } catch (error) {
      setDismissedIds(previous);
      console.error("Unable to pass profile", error);
    }
  };

  const handleFollow = async (profileId: string) => {
    const nextFollowed = !followedIds.includes(profileId);
    setFollowedIds((current) => nextFollowed ? Array.from(new Set([...current, profileId])) : current.filter((id) => id !== profileId));
    try {
      await setProfileFollow(profileId, nextFollowed);
      window.dispatchEvent(new CustomEvent("melo-following-updated"));
    } catch (error) {
      setFollowedIds((current) => nextFollowed ? current.filter((id) => id !== profileId) : Array.from(new Set([...current, profileId])));
      console.error("Unable to update follow status", error);
    }
  };

  const handleInterested = async (profileId: string) => {
    const nextLiked = !interestedIds.includes(profileId);
    // Optimistic UI so the button responds immediately.
    setInterestedIds((current) => nextLiked ? Array.from(new Set([...current, profileId])) : current.filter((id) => id !== profileId));
    try {
      await setLoveLike(profileId, nextLiked);
      window.dispatchEvent(new CustomEvent("melo-connect-updated"));
    } catch (error) {
      // Roll back if Supabase rejects the action.
      setInterestedIds((current) => nextLiked ? current.filter((id) => id !== profileId) : Array.from(new Set([...current, profileId])));
      console.error("Unable to update interested status", error);
    }
  };

  const handleBoostProfile = async () => {
    if (boostBusy) return;
    setBoostBusy(true);
    setBoostNotice("");
    try {
      const boostedAt = await boostMyDatingProfile();
      setSelfProfile((current) => current ? { ...current, profileBoostedAt: boostedAt } : current);
      setBoostNotice("success");
      window.dispatchEvent(new CustomEvent("melo-profile-boosted", { detail: { userId: currentUserId, boostedAt } }));
    } catch (error) {
      console.error("Unable to boost profile", error);
      setBoostNotice("error");
    } finally {
      setBoostBusy(false);
    }
  };

  const lifestyleOptions = ["All","Coffee","Travel","Fitness","Foodie","Music","Pets","Art","Beach"];
  const visibleProfiles = useMemo(() => {
    const available = profiles.filter((profile) => profile.id !== currentUserId && !dismissedIds.includes(profile.id));
    return lifestyle === "All" ? available : available.filter((profile) => ((profile as DatingProfileWeb & { lifestyleTags?: string[] }).lifestyleTags || []).includes(lifestyle));
  }, [profiles, lifestyle, dismissedIds, currentUserId]);

  const pagedProfiles = useMemo(() => visibleProfiles.slice(0, profileLimit), [visibleProfiles, profileLimit]);

  useEffect(() => {
    setProfileLimit(15);
  }, [lifestyle]);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || profileLimit >= visibleProfiles.length) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setProfileLimit((current) => Math.min(current + 15, visibleProfiles.length));
      }
    }, { rootMargin: "240px 0px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [profileLimit, visibleProfiles.length]);

  return (
    <main className={styles.page}>
      <Header />
      <section className={styles.shell}>
        <div className={styles.headingRow}>
          <div>
            <h1>{t.title}</h1>
            <p>{t.subtitle}</p>
          </div>
          <button type="button" className={styles.boostLauncher} onClick={() => { setBoostNotice(""); setBoostOpen(true); }}>
            <span>⚡</span>{t.boost}
          </button>
        </div>
        <div className={styles.lifestyleFilters} aria-label="Lifestyle filters">
          {lifestyleOptions.map((tag) => <button type="button" key={tag} className={lifestyle === tag ? styles.filterActive : ""} onClick={() => setLifestyle(tag)}>{tag === "All" ? "All" : `#${tag}`}</button>)}
        </div>

        {loading ? <div className={styles.stateCard}>{t.loading}</div> : null}

        {!loading && error ? (
          <div className={styles.stateCard}>
            <p>{error}</p>
            <button type="button" onClick={() => setReloadKey((value) => value + 1)}>{t.retry}</button>
          </div>
        ) : null}

        {!loading && !error && visibleProfiles.length === 0 ? (
          <div className={styles.stateCard}>{t.empty}</div>
        ) : null}

        {!loading && !error && visibleProfiles.length > 0 ? (
          <div className={styles.grid}>
            {pagedProfiles.map((profile) => {
              const photo = profile.photoUrls[0] || "";
              const nationality = nationalityLabel(profile);
              const flag = countryFlagEmoji(nationality);
              return (
                <article className={styles.profileCard} key={profile.id} role="link" tabIndex={0} onClick={() => router.push(`/users/${profile.id}`)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); router.push(`/users/${profile.id}`); } }}>
                  <div className={styles.photoWrap}>
                    {photo ? <img src={photo} alt={profile.name} className={styles.photo} /> : <div className={styles.photoFallback}>{profile.name?.slice(0, 1).toUpperCase() || "M"}</div>}
                    {profile.isOnline ? <span className={styles.onlineDot} title="Online" /> : null}
                  </div>
                  <div className={styles.cardBody}>
                    <div className={styles.nameLine}>
                      <strong>{profile.name || "Melo"}</strong>
                      {profile.age ? <span>, {profile.age}</span> : null}
                    </div>
                    <div className={styles.nationalityLine}>
                      {flag ? <span className={styles.flag}>{flag}</span> : null}
                      <span>{nationality}</span>
                    </div>
                    <div className={styles.cardTags}>{((profile as DatingProfileWeb & { lifestyleTags?: string[] }).lifestyleTags || []).map((tag) => <span key={tag}>#{tag}</span>)}</div>
                    <div className={styles.cardActions}>
                      <button type="button" className={styles.passAction} aria-label="Not interested" title="Not interested" onClick={(event) => { event.preventDefault(); event.stopPropagation(); void handleDismiss(profile.id); }}>×</button>
                      <button type="button" className={`${styles.followAction} ${followedIds.includes(profile.id) ? styles.followActionActive : ""}`} aria-label={followedIds.includes(profile.id) ? "Following" : "Follow"} title={followedIds.includes(profile.id) ? "Following" : "Follow"} onClick={(event) => { event.preventDefault(); event.stopPropagation(); void handleFollow(profile.id); }}>{followedIds.includes(profile.id) ? "✓" : "+"}</button>
                      <button type="button" className={`${styles.connectAction} ${interestedIds.includes(profile.id) ? styles.connectActionActive : ""}`} aria-label="Connect" title="Connect" onClick={(event) => { event.preventDefault(); event.stopPropagation(); void handleInterested(profile.id); }}>♥</button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
        {!loading && !error && profileLimit < visibleProfiles.length ? <div ref={loadMoreRef} aria-hidden="true" style={{ height: 1 }} /> : null}

        {boostOpen ? (
          <div className={styles.boostBackdrop} role="presentation" onMouseDown={() => setBoostOpen(false)}>
            <section className={styles.boostModal} role="dialog" aria-modal="true" aria-labelledby="boost-profile-title" onMouseDown={(event) => event.stopPropagation()}>
              <div className={styles.boostModalHead}>
                <div><span className={styles.boostEyebrow}>MELO BOOST</span><h2 id="boost-profile-title">{t.boostTitle}</h2><p>{t.boostHint}</p></div>
                <button type="button" className={styles.boostClose} aria-label={t.close} onClick={() => setBoostOpen(false)}>×</button>
              </div>
              {selfProfile ? (() => {
                const photo = selfProfile.photoUrls[0] || "";
                const nationality = nationalityLabel(selfProfile);
                const flag = countryFlagEmoji(nationality);
                return (
                  <article className={`${styles.profileCard} ${styles.boostPreviewCard}`}>
                    <div className={styles.photoWrap}>
                      {photo ? <img src={photo} alt={selfProfile.name} className={styles.photo} /> : <div className={styles.photoFallback}>{selfProfile.name?.slice(0, 1).toUpperCase() || "M"}</div>}
                      {selfProfile.isOnline ? <span className={styles.onlineDot} title="Online" /> : null}
                    </div>
                    <div className={styles.cardBody}>
                      <div className={styles.nameLine}><strong>{selfProfile.name || "Melo"}</strong>{selfProfile.age ? <span>, {selfProfile.age}</span> : null}</div>
                      <div className={styles.nationalityLine}>{flag ? <span className={styles.flag}>{flag}</span> : null}<span>{nationality}</span></div>
                      <div className={styles.cardTags}>{selfProfile.lifestyleTags.map((tag) => <span key={tag}>#{tag}</span>)}</div>
                      <div className={styles.boostCardAction}>
                        <button type="button" disabled={boostBusy} onClick={() => void handleBoostProfile()}><span>⚡</span>{boostBusy ? t.boosting : t.boostNow}</button>
                      </div>
                    </div>
                  </article>
                );
              })() : <div className={styles.boostEmpty}>{t.loading}</div>}
              {boostNotice ? <div className={`${styles.boostNotice} ${boostNotice === "success" ? styles.boostNoticeSuccess : styles.boostNoticeError}`}><strong>{boostNotice === "success" ? t.boosted : t.boostError}</strong>{boostNotice === "success" ? <span>{t.boostedDetail}</span> : null}</div> : null}
            </section>
          </div>
        ) : null}
      </section>
    </main>
  );
}
