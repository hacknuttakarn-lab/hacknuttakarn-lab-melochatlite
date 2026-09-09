"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { useLocale } from "@/components/SiteProviders";
import VerifiedUserAvatar from "@/components/profile/VerifiedUserAvatar";
import {
  loadSharedLiveLocationDetailWeb,
  type SharedLiveLocationDetailWeb,
  type SharedLiveLocationSourceWeb,
  type TrustedLiveTimelinePointWeb,
} from "./safetyWebData";
import styles from "./SafetyLiveLocationExperience.module.css";

const COPY = {
  en: {
    title: "Live Location", subtitle: "Shared for safety", live: "LIVE", sos: "SOS", stale: "LOCATION OLD",
    sharingSince: "Sharing since", updated: "Updated", expires: "Ends", currentLocation: "Current location",
    openMaps: "Open in Google Maps", activity: "Shared activity", trip: "Trip", event: "Event", dateTime: "Date & time",
    route: "Location / route", participants: "Participants", safetyInfo: "Safety sharing information", viewTrip: "View Trip details",
    viewEvent: "View Event details", timeline: "Travel timeline", timelineHint: "Location checkpoints saved by the live-sharing service.",
    points: "points", latest: "Latest", coordinate: "Coordinates", noTimeline: "No earlier location checkpoints are available yet.",
    realtimeTitle: "Realtime vs Timeline works together", realtimeText: "The current position refreshes while this page is open. Timeline shows checkpoints returned by the live-location service, so you can understand recent movement without treating every update as an emergency signal.",
    loading: "Loading Live Location…", error: "Live Location could not be loaded", retry: "Retry", notFound: "This Live Location is no longer available or is not shared with you.", backSafety: "Back to Safety Center",
  },
  th: {
    title: "Live สถานที่", subtitle: "แชร์เพื่อความปลอดภัย", live: "LIVE", sos: "SOS", stale: "ตำแหน่งเก่า",
    sharingSince: "เริ่มแชร์", updated: "อัปเดตล่าสุด", expires: "สิ้นสุด", currentLocation: "ตำแหน่งปัจจุบัน",
    openMaps: "เปิดใน Google Maps", activity: "กิจกรรมที่กำลังแชร์", trip: "Trip", event: "Event", dateTime: "วันที่และเวลา",
    route: "สถานที่ / เส้นทาง", participants: "ผู้เข้าร่วม", safetyInfo: "ข้อมูลสัมพันธ์เพื่อความปลอดภัย", viewTrip: "ดูรายละเอียด Trip",
    viewEvent: "ดูรายละเอียด Event", timeline: "ไทม์ไลน์การเดินทาง", timelineHint: "จุดตำแหน่งที่ระบบ Live Location บันทึกไว้ระหว่างการแชร์",
    points: "จุด", latest: "ล่าสุด", coordinate: "พิกัด", noTimeline: "ยังไม่มีจุดตำแหน่งย้อนหลังเพิ่มเติม",
    realtimeTitle: "Realtime กับ Timeline ทำงานคนละแบบ", realtimeText: "ตำแหน่งปัจจุบันจะรีเฟรชขณะเปิดหน้านี้ ส่วน Timeline จะแสดงจุดที่บริการ Live Location ส่งกลับมา เพื่อให้ดูการเคลื่อนไหวย้อนหลังได้โดยไม่ตีความทุกการอัปเดตว่าเป็นเหตุฉุกเฉิน",
    loading: "กำลังโหลด Live Location…", error: "ไม่สามารถโหลด Live Location ได้", retry: "ลองอีกครั้ง", notFound: "Live Location นี้สิ้นสุดแล้ว หรือไม่ได้แชร์ให้คุณอีกต่อไป", backSafety: "กลับไป Safety Center",
  },
  de: {
    title: "Live-Standort", subtitle: "Für die Sicherheit geteilt", live: "LIVE", sos: "SOS", stale: "ALTER STANDORT",
    sharingSince: "Geteilt seit", updated: "Aktualisiert", expires: "Endet", currentLocation: "Aktueller Standort",
    openMaps: "In Google Maps öffnen", activity: "Geteilte Aktivität", trip: "Reise", event: "Event", dateTime: "Datum & Uhrzeit",
    route: "Ort / Route", participants: "Teilnehmer", safetyInfo: "Sicherheitsfreigabe", viewTrip: "Reisedetails ansehen",
    viewEvent: "Eventdetails ansehen", timeline: "Reiseverlauf", timelineHint: "Vom Live-Location-Dienst gespeicherte Standortpunkte.",
    points: "Punkte", latest: "Neueste", coordinate: "Koordinaten", noTimeline: "Noch keine früheren Standortpunkte verfügbar.",
    realtimeTitle: "Realtime und Timeline ergänzen sich", realtimeText: "Der aktuelle Standort wird aktualisiert, solange diese Seite geöffnet ist. Die Timeline zeigt vom Live-Location-Dienst gelieferte Punkte und hilft, die letzte Bewegung einzuordnen.",
    loading: "Live-Standort wird geladen…", error: "Live-Standort konnte nicht geladen werden", retry: "Erneut versuchen", notFound: "Dieser Live-Standort ist nicht mehr verfügbar oder wird nicht mehr mit dir geteilt.", backSafety: "Zurück zum Safety Center",
  },
  zh: {
    title: "实时位置", subtitle: "为安全而共享", live: "实时", sos: "SOS", stale: "位置较旧",
    sharingSince: "开始共享", updated: "更新时间", expires: "结束", currentLocation: "当前位置",
    openMaps: "在 Google Maps 中打开", activity: "共享中的活动", trip: "旅行", event: "活动", dateTime: "日期和时间",
    route: "地点 / 路线", participants: "参与者", safetyInfo: "安全共享信息", viewTrip: "查看旅行详情",
    viewEvent: "查看活动详情", timeline: "行程时间线", timelineHint: "实时位置服务保存的位置检查点。",
    points: "个位置点", latest: "最新", coordinate: "坐标", noTimeline: "暂时没有更早的位置记录。",
    realtimeTitle: "实时位置与时间线协同工作", realtimeText: "页面打开时会刷新当前位置；时间线显示实时位置服务返回的位置点，帮助了解最近的移动情况。",
    loading: "正在加载实时位置…", error: "无法加载实时位置", retry: "重试", notFound: "此实时位置已结束，或不再与你共享。", backSafety: "返回安全中心",
  },
  ja: {
    title: "Live Location", subtitle: "安全のために共有", live: "LIVE", sos: "SOS", stale: "古い位置",
    sharingSince: "共有開始", updated: "更新", expires: "終了", currentLocation: "現在地",
    openMaps: "Google Mapsで開く", activity: "共有中のアクティビティ", trip: "Trip", event: "Event", dateTime: "日時",
    route: "場所 / ルート", participants: "参加者", safetyInfo: "安全共有情報", viewTrip: "Tripの詳細を見る",
    viewEvent: "Eventの詳細を見る", timeline: "移動タイムライン", timelineHint: "Live Locationサービスが保存した位置チェックポイントです。",
    points: "地点", latest: "最新", coordinate: "座標", noTimeline: "過去の位置チェックポイントはまだありません。",
    realtimeTitle: "RealtimeとTimelineを組み合わせて確認", realtimeText: "このページを開いている間は現在地を更新します。TimelineにはLive Locationサービスから返されたチェックポイントを表示し、直近の移動を確認できます。",
    loading: "Live Locationを読み込み中…", error: "Live Locationを読み込めません", retry: "再試行", notFound: "このLive Locationは終了したか、あなたへの共有が停止されています。", backSafety: "Safety Centerへ戻る",
  },
  ko: {
    title: "Live Location", subtitle: "안전을 위한 위치 공유", live: "LIVE", sos: "SOS", stale: "오래된 위치",
    sharingSince: "공유 시작", updated: "업데이트", expires: "종료", currentLocation: "현재 위치",
    openMaps: "Google Maps에서 열기", activity: "공유 중인 활동", trip: "Trip", event: "Event", dateTime: "날짜 및 시간",
    route: "장소 / 경로", participants: "참가자", safetyInfo: "안전 공유 정보", viewTrip: "Trip 상세 보기",
    viewEvent: "Event 상세 보기", timeline: "이동 타임라인", timelineHint: "Live Location 서비스가 저장한 위치 체크포인트입니다.",
    points: "개 위치", latest: "최신", coordinate: "좌표", noTimeline: "이전 위치 체크포인트가 아직 없습니다.",
    realtimeTitle: "Realtime과 Timeline을 함께 확인", realtimeText: "이 페이지를 열어 둔 동안 현재 위치를 새로고침합니다. Timeline은 Live Location 서비스가 반환한 체크포인트를 보여 주어 최근 이동을 확인할 수 있게 합니다.",
    loading: "Live Location 불러오는 중…", error: "Live Location을 불러올 수 없습니다", retry: "다시 시도", notFound: "이 Live Location은 종료되었거나 더 이상 공유되지 않습니다.", backSafety: "Safety Center로 돌아가기",
  },
} as const;

type LocaleKey = keyof typeof COPY;

function copyFor(locale: string) {
  return COPY[(locale in COPY ? locale : "en") as LocaleKey];
}

function localeTag(locale: string) {
  return locale === "th" ? "th-TH" : locale === "de" ? "de-DE" : locale === "zh" ? "zh-CN" : locale === "ja" ? "ja-JP" : locale === "ko" ? "ko-KR" : "en-US";
}

function formatDateTime(value: string, locale: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(localeTag(locale), { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function formatTime(value: string, locale: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(localeTag(locale), { hour: "2-digit", minute: "2-digit" }).format(date);
}

function coordinateLabel(point: Pick<TrustedLiveTimelinePointWeb, "latitude" | "longitude">) {
  return `${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}`;
}

export default function SafetyLiveLocationExperience({ source, sessionId }: { source: SharedLiveLocationSourceWeb; sessionId: string }) {
  const router = useRouter();
  const { locale } = useLocale();
  const copy = copyFor(locale);
  const [detail, setDetail] = useState<SharedLiveLocationDetailWeb | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loadedOnce, setLoadedOnce] = useState(false);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const next = await loadSharedLiveLocationDetailWeb(source, sessionId);
      setDetail(next);
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : copy.error);
    } finally {
      if (!quiet) setLoading(false);
      setLoadedOnce(true);
    }
  }, [copy.error, sessionId, source]);

  useEffect(() => {
    void load(false);
    const timer = window.setInterval(() => void load(true), 5000);
    return () => window.clearInterval(timer);
  }, [load]);

  const stale = detail ? Date.now() - new Date(detail.session.updatedAt).getTime() > 10 * 60 * 1000 : false;
  const status = detail?.session.sosActive ? copy.sos : stale ? copy.stale : copy.live;
  const mapUrl = detail ? `https://maps.google.com/maps?q=${encodeURIComponent(`${detail.session.latitude},${detail.session.longitude}`)}&z=15&output=embed` : "";
  const externalMapUrl = detail ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${detail.session.latitude},${detail.session.longitude}`)}` : "#";
  const timeline = useMemo(() => detail?.session.timeline ?? [], [detail]);

  if (loading && !detail) {
    return <main className={styles.page}><Header/><div className={styles.state}>{copy.loading}</div></main>;
  }

  if (error && !detail) {
    return <main className={styles.page}><Header/><div className={styles.state}><strong>{copy.error}</strong><p>{error}</p><button onClick={() => void load(false)}>{copy.retry}</button><Link href="/safety?tab=friends">{copy.backSafety}</Link></div></main>;
  }

  if (loadedOnce && !detail) {
    return <main className={styles.page}><Header/><div className={styles.state}><strong>{copy.notFound}</strong><Link href="/safety?tab=friends">{copy.backSafety}</Link></div></main>;
  }

  if (!detail) return null;
  const { session, members } = detail;
  const activity = session.activity;
  const activityHref = activity ? (activity.contextType === "trip" ? `/trips/${activity.contextId}` : `/events/${activity.contextId}`) : "";

  return <main className={styles.page}>
    <Header/>
    <section className={styles.shell}>
      <header className={styles.pageHeader}>
        <button className={styles.backButton} onClick={() => router.back()} aria-label={copy.backSafety}>‹</button>
        <div><h1>{copy.title}</h1><p>{copy.subtitle}</p></div>
        <span className={styles.livePill} data-status={session.sosActive ? "sos" : stale ? "stale" : "live"}>{status}</span>
      </header>

      {error ? <div className={styles.inlineWarning}>{copy.error} · {error}</div> : null}

      <div className={styles.heroGrid}>
        <section className={styles.mapCard}>
          <div className={styles.mapTopline}><div><small>{copy.currentLocation}</small><strong>{session.displayName}</strong></div><a href={externalMapUrl} target="_blank" rel="noreferrer">{copy.openMaps} ↗</a></div>
          <div className={styles.mapFrame}><iframe key={`${session.latitude}:${session.longitude}`} title={`${copy.currentLocation} · ${session.displayName}`} src={mapUrl} loading="lazy" referrerPolicy="no-referrer-when-downgrade"/></div>
          <div className={styles.coordinateStrip}><span>⌖</span><div><small>{copy.coordinate}</small><strong>{session.latitude.toFixed(5)}, {session.longitude.toFixed(5)}</strong></div>{session.accuracy != null ? <b>±{Math.round(session.accuracy)} m</b> : null}</div>
        </section>

        <aside className={styles.sideColumn}>
          <section className={styles.profileCard} data-sos={session.sosActive}>
            <div className={styles.profileTop}><VerifiedUserAvatar userId={session.ownerId} name={session.displayName} src={session.photoUrl} size={72}/><div><h2>{session.displayName}</h2><span className={styles.statusDot} data-status={session.sosActive ? "sos" : stale ? "stale" : "live"}>● {status}</span></div></div>
            <div className={styles.metaGrid}><Meta label={copy.sharingSince} value={formatDateTime(session.startedAt, locale)}/><Meta label={copy.updated} value={formatDateTime(session.updatedAt, locale)}/><Meta label={copy.expires} value={formatDateTime(session.expiresAt, locale)}/></div>
            {session.sosActive && session.sosMessage ? <div className={styles.sosMessage}>SOS · {session.sosMessage}</div> : null}
          </section>

          {activity ? <section className={styles.activityCard}>
            <div className={styles.activityHead}>{activity.imageUrl ? <img src={activity.imageUrl} alt=""/> : <span>{activity.contextType === "trip" ? "✈" : "◎"}</span>}<div><small>{copy.activity} · {activity.contextType === "trip" ? copy.trip : copy.event}</small><h3>{activity.title}</h3></div></div>
            <div className={styles.activityInfo}><Meta label={copy.dateTime} value={[formatDateTime(activity.startsAt, locale), activity.endsAt && activity.endsAt !== activity.startsAt ? formatDateTime(activity.endsAt, locale) : ""].filter(Boolean).join(" → ")}/><Meta label={copy.route} value={activity.locationLabel || "—"}/></div>
            <div className={styles.membersBlock}><div className={styles.membersLabel}><strong>{copy.participants} {members.length || activity.participantCount || ""}</strong><small>{copy.safetyInfo}</small></div>{members.length ? <div className={styles.memberList}>{members.slice(0, 8).map((member) => <div className={styles.member} key={member.userId}><VerifiedUserAvatar userId={member.userId} name={member.displayName} src={member.photoUrl} size={38}/><span>{member.displayName}</span></div>)}</div> : <div className={styles.memberCountOnly}>{activity.participantCount || 0}</div>}</div>
            <Link className={styles.activityLink} href={activityHref}>{activity.contextType === "trip" ? copy.viewTrip : copy.viewEvent} ›</Link>
          </section> : null}
        </aside>
      </div>

      <section className={styles.timelineSection}>
        <div className={styles.sectionHeading}><div><h2>{copy.timeline}</h2><p>{copy.timelineHint}</p></div><b>{timeline.length} {copy.points}</b></div>
        <div className={styles.timelineCard}>{timeline.length ? timeline.map((point, index) => <TimelineRow key={point.id} point={point} index={index} locale={locale} latest={copy.latest} coordinate={copy.coordinate}/>) : <div className={styles.timelineEmpty}>{copy.noTimeline}</div>}</div>
      </section>

      <section className={styles.infoCard}><span>i</span><div><strong>{copy.realtimeTitle}</strong><p>{copy.realtimeText}</p></div></section>
    </section>
  </main>;
}

function Meta({ label, value }: { label: string; value: string }) {
  return <div className={styles.meta}><small>{label}</small><strong>{value || "—"}</strong></div>;
}

function TimelineRow({ point, index, locale, latest, coordinate }: { point: TrustedLiveTimelinePointWeb; index: number; locale: string; latest: string; coordinate: string }) {
  return <div className={styles.timelineRow}>
    <div className={styles.timelineRail}><span data-latest={index === 0}/>{index < 47 ? <i/> : null}</div>
    <div className={styles.timelineTime}><strong>{formatTime(point.recordedAt, locale)}</strong>{index === 0 ? <b>{latest}</b> : null}<small>{formatDateTime(point.recordedAt, locale)}</small></div>
    <div className={styles.timelinePlace}><strong>{point.label || coordinate}</strong><p>{point.label ? coordinateLabel(point) : coordinateLabel(point)}{point.accuracy != null ? ` · ±${Math.round(point.accuracy)} m` : ""}</p></div>
    <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${point.latitude},${point.longitude}`)}`} target="_blank" rel="noreferrer" aria-label="Google Maps">↗</a>
  </div>;
}
