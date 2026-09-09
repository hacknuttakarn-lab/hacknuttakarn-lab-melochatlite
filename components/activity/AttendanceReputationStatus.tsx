"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLocale } from "@/components/SiteProviders";
import { loadAttendanceStatusWeb, type AttendanceStatusWeb } from "@/components/activity/activityManagementWeb";
import styles from "./AttendanceReputationStatus.module.css";

type ActivityType = "trip" | "event";

type AttendanceCopy = {
  kicker: string; title: string; open: string; closed: string; checked: string; confirmed: string; registered: string;
  mobileOnly: string; waiting: string; organizerOpen: string; organizerWaiting: string; attendance: string; total: string;
  checkedCount: string; reputation: string; reviews: string; viewReputation: string; loading: string; unavailable: string;
};

const COPY = {
  th: {
    kicker: "ATTENDANCE & REPUTATION",
    title: "การเข้าร่วมและชื่อเสียง",
    open: "เปิดให้เช็กอินแล้ว",
    closed: "ยังไม่เปิดให้เช็กอิน",
    checked: "เช็กอินแล้ว",
    confirmed: "ยืนยันการเข้าร่วมแล้ว",
    registered: "เข้าร่วมกิจกรรมแล้ว",
    mobileOnly: "การเช็กอินทำได้ผ่านแอป Melo บนมือถือเท่านั้น เว็บไม่สามารถเช็กอินได้",
    waiting: "เมื่อผู้จัดเปิดให้เช็กอิน สถานะจะแสดงที่นี่และจะแจ้งเตือนใน Notifications",
    organizerOpen: "สมาชิกสามารถเช็กอินผ่านแอป Melo บนมือถือได้แล้ว",
    organizerWaiting: "ยังไม่มีเซสชันเช็กอินที่เปิดอยู่",
    attendance: "สถานะของคุณ",
    total: "ผู้เข้าร่วม",
    checkedCount: "เช็กอินแล้ว",
    reputation: "ชื่อเสียง",
    reviews: "รีวิว",
    viewReputation: "ดูชื่อเสียง",
    loading: "กำลังตรวจสอบสถานะ…",
    unavailable: "ยังไม่สามารถโหลดข้อมูล Attendance ได้",
  },
  en: {
    kicker: "ATTENDANCE & REPUTATION",
    title: "Attendance & Reputation",
    open: "Check-in is open",
    closed: "Check-in is not open yet",
    checked: "Checked in",
    confirmed: "Attendance confirmed",
    registered: "Joined",
    mobileOnly: "Check-in is available only in the Melo mobile app. Check-in is not available on the web.",
    waiting: "When the organizer opens check-in, the status will appear here and in Notifications.",
    organizerOpen: "Members can now check in using the Melo mobile app.",
    organizerWaiting: "There is no active check-in session yet.",
    attendance: "Your status",
    total: "Participants",
    checkedCount: "Checked in",
    reputation: "Reputation",
    reviews: "reviews",
    viewReputation: "View reputation",
    loading: "Checking attendance status…",
    unavailable: "Attendance information is currently unavailable.",
  },
  de: {
    kicker: "ANWESENHEIT & REPUTATION",
    title: "Teilnahme & Reputation",
    open: "Check-in ist geöffnet",
    closed: "Check-in ist noch nicht geöffnet",
    checked: "Eingecheckt",
    confirmed: "Teilnahme bestätigt",
    registered: "Beigetreten",
    mobileOnly: "Der Check-in ist nur in der Melo-App auf dem Smartphone möglich. Im Web ist kein Check-in verfügbar.",
    waiting: "Sobald der Organisator den Check-in öffnet, erscheint der Status hier und in den Benachrichtigungen.",
    organizerOpen: "Mitglieder können jetzt über die Melo-App einchecken.",
    organizerWaiting: "Derzeit ist keine Check-in-Sitzung aktiv.",
    attendance: "Dein Status",
    total: "Teilnehmer",
    checkedCount: "Eingecheckt",
    reputation: "Reputation",
    reviews: "Bewertungen",
    viewReputation: "Reputation ansehen",
    loading: "Check-in-Status wird geprüft…",
    unavailable: "Teilnahmeinformationen sind derzeit nicht verfügbar.",
  },
  zh: {
    kicker: "出席与信誉",
    title: "出席与信誉",
    open: "签到已开放",
    closed: "签到尚未开放",
    checked: "已签到",
    confirmed: "已确认出席",
    registered: "已参加",
    mobileOnly: "签到只能在 Melo 手机 App 中完成，网页版不提供签到功能。",
    waiting: "组织者开放签到后，状态会显示在这里并出现在通知中。",
    organizerOpen: "成员现在可以通过 Melo 手机 App 签到。",
    organizerWaiting: "目前没有开放中的签到时段。",
    attendance: "你的状态",
    total: "参与者",
    checkedCount: "已签到",
    reputation: "信誉",
    reviews: "评价",
    viewReputation: "查看信誉",
    loading: "正在检查签到状态…",
    unavailable: "暂时无法加载出席信息。",
  },
  ja: {
    kicker: "出席 & 評判",
    title: "Attendance & Reputation",
    open: "Check-in受付中",
    closed: "Check-inはまだ開始されていません",
    checked: "Check-in済み",
    confirmed: "参加確認済み",
    registered: "参加中",
    mobileOnly: "Check-inはMeloモバイルアプリからのみ行えます。WebではCheck-inできません。",
    waiting: "主催者がCheck-inを開始すると、ここにステータスが表示され、通知にも届きます。",
    organizerOpen: "メンバーはMeloモバイルアプリからCheck-inできます。",
    organizerWaiting: "現在有効なCheck-inセッションはありません。",
    attendance: "あなたの状態",
    total: "参加者",
    checkedCount: "Check-in済み",
    reputation: "評判",
    reviews: "レビュー",
    viewReputation: "評判を見る",
    loading: "Check-in状況を確認中…",
    unavailable: "Attendance情報を読み込めません。",
  },
  ko: {
    kicker: "참석 & 평판",
    title: "Attendance & Reputation",
    open: "체크인이 열렸습니다",
    closed: "아직 체크인이 열리지 않았습니다",
    checked: "체크인 완료",
    confirmed: "참석 확인 완료",
    registered: "참여 중",
    mobileOnly: "체크인은 Melo 모바일 앱에서만 가능합니다. 웹에서는 체크인할 수 없습니다.",
    waiting: "주최자가 체크인을 열면 이곳과 Notifications에 상태가 표시됩니다.",
    organizerOpen: "멤버가 Melo 모바일 앱에서 체크인할 수 있습니다.",
    organizerWaiting: "현재 활성화된 체크인 세션이 없습니다.",
    attendance: "내 상태",
    total: "참가자",
    checkedCount: "체크인 완료",
    reputation: "평판",
    reviews: "리뷰",
    viewReputation: "평판 보기",
    loading: "체크인 상태 확인 중…",
    unavailable: "참석 정보를 불러올 수 없습니다.",
  },
} as const;

function statusLabel(status: string, copy: AttendanceCopy) {
  if (status === "checked_in") return copy.checked;
  if (status === "confirmed") return copy.confirmed;
  return copy.registered;
}

export default function AttendanceReputationStatus({
  activityType,
  activityId,
  isOrganizer = false,
}: {
  activityType: ActivityType;
  activityId: string;
  isOrganizer?: boolean;
}) {
  const { locale } = useLocale();
  const copy = (COPY as unknown as Record<string, AttendanceCopy>)[locale] ?? COPY.en;
  const [data, setData] = useState<AttendanceStatusWeb | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    let loadingNow = false;

    async function refresh(quiet = false) {
      if (loadingNow) return;
      loadingNow = true;
      if (!quiet) setLoading(true);
      try {
        const next = await loadAttendanceStatusWeb(activityType, activityId);
        if (!active) return;
        setData(next);
        setError(false);
      } catch {
        if (active) setError(true);
      } finally {
        loadingNow = false;
        if (active && !quiet) setLoading(false);
      }
    }

    void refresh(false);
    const timer = window.setInterval(() => void refresh(true), 20000);
    const onFocus = () => void refresh(true);
    window.addEventListener("focus", onFocus);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [activityId, activityType]);

  const open = Boolean(data?.overview.sessionActive);
  const checked = data?.myStatus === "checked_in" || data?.myStatus === "confirmed";
  const status = useMemo(() => statusLabel(data?.myStatus ?? "registered", copy), [copy, data?.myStatus]);
  const reputationText = data && data.reputation > 0 ? data.reputation.toFixed(1) : "—";

  return (
    <section className={styles.card} aria-live="polite">
      <div className={styles.heading}>
        <span className={styles.icon}>✓</span>
        <div>
          <small>{copy.kicker}</small>
          <h2>{copy.title}</h2>
        </div>
        <strong className={`${styles.sessionBadge} ${open ? styles.sessionOpen : ""}`}>{open ? copy.open : copy.closed}</strong>
      </div>

      {loading && !data ? <p className={styles.stateText}>{copy.loading}</p> : error && !data ? <p className={styles.stateText}>{copy.unavailable}</p> : data ? (
        <>
          <div className={styles.metrics}>
            <div><span>{copy.attendance}</span><strong>{isOrganizer ? (open ? copy.open : copy.closed) : status}</strong></div>
            <div><span>{copy.checkedCount}</span><strong>{data.overview.checkedIn}</strong></div>
            <div><span>{copy.total}</span><strong>{data.overview.memberCount}</strong></div>
            <div><span>{copy.reputation}</span><strong>★ {reputationText}</strong><small>{data.reviews} {copy.reviews}</small></div>
          </div>

          <div className={`${styles.notice} ${open ? styles.noticeOpen : ""}`}>
            <span>{open ? "●" : "○"}</span>
            <div>
              <strong>{open ? copy.open : copy.closed}</strong>
              <p>{isOrganizer ? (open ? copy.organizerOpen : copy.organizerWaiting) : checked ? copy.checked : open ? copy.mobileOnly : copy.waiting}</p>
            </div>
            {!isOrganizer ? <Link href="/reputation">{copy.viewReputation} →</Link> : null}
          </div>
        </>
      ) : null}
    </section>
  );
}
