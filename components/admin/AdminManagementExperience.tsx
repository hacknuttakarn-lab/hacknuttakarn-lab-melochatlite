'use client';

import Link from 'next/link';
import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import { Header } from '@/components/Header';
import { useLocale } from '@/components/SiteProviders';

import SettingsUtilityExperience
  from '@/components/settings/SettingsUtilityExperience';

import AdminLiveNoticeWorkspace
  from '@/components/admin/AdminLiveNoticeWorkspace';

import AdminAccessWorkspace
  from '@/components/admin/AdminAccessWorkspace';

import {
  loadSettingsAccountSnapshot,
  type SettingsAccountSnapshot,
} from '@/components/settings/settingsWebData';

import {
  adminReviewActionsFor,
  canActOnAdminReviewQueue,
  canViewAdminReviewQueue,
  getAdminReviewAccessWeb,
  getAdminReviewQueueCountsWeb,
  listAdminReviewQueueWeb,
  loadAdminReviewEvidenceWeb,
  resolveAdminReviewItemWeb,
  type AdminReviewAccessWeb,
  type AdminReviewAction,
  type AdminReviewEvidenceWeb,
  type AdminReviewItemWeb,
  type AdminReviewQueueType,
  type AdminReviewStatusFilter,
} from '@/components/admin/adminReviewWebData';

import styles
  from './AdminManagementExperience.module.css';


/* =========================================================
   TYPES
   ========================================================= */

type AdminSection =
  | 'review'
  | 'quest'
  | 'live'
  | 'access';


type AdminCopy = {
  management: string;
  managementEyebrow: string;
  back: string;

  menu: string;
  workspace: string;

  review: string;
  reviewDesc: string;

  quest: string;
  questDesc: string;

  live: string;
  liveDesc: string;

  access: string;
  accessDesc: string;

  checkingAccess: string;
  accessDenied: string;
  accessDeniedDesc: string;

  pendingTotal: string;
  currentQueue: string;
  visibleResults: string;

  refresh: string;
  searchPlaceholder: string;

  pending: string;
  all: string;

  loading: string;
  retry: string;

  empty: string;
  emptySearch: string;

  reviewButton: string;

  submitted: string;
  status: string;
  email: string;

  backToList: string;
  detailTitle: string;
  importantData: string;

  checklist: string;
  complete: string;
  shouldCheck: string;

  evidence: string;
  evidencePrivate: string;
  evidenceLoading: string;
  noEvidence: string;
  openFile: string;

  adminNote: string;
  adminNotePlaceholder: string;

  readOnly: string;

  updated: string;
  requiredNote: string;

  queueReports: string;
  queueVerification: string;
  queueBusiness: string;
  queuePayout: string;
  queueReverification: string;
  queueDeletions: string;
  queueReviewCases: string;

  approve: string;
  reject: string;
  requestInfo: string;
  suspend: string;

  dismiss: string;
  warn: string;
  suspend24h: string;
  suspend7d: string;
  deactivate: string;

  resolve: string;
  hideReview: string;

  acknowledge: string;
  cancelDeletion: string;
};


/* =========================================================
   LANGUAGES
   ========================================================= */

const COPY: Record<string, AdminCopy> = {
  th: {
    management: 'การจัดการของแอดมิน',
    managementEyebrow: 'ADMIN MANAGEMENT',
    back: 'กลับ',

    menu: 'เมนูแอดมิน',
    workspace: 'พื้นที่จัดการ',

    review: 'Admin Review Center',
    reviewDesc:
      'ตรวจสอบบัญชี ผู้ใช้ ร้านค้า เอกสาร รายงาน และรายการที่ต้องพิจารณา',

    quest: 'Manage Quest & Reward',
    questDesc:
      'จัดการ Quest และของรางวัลของ Melo',

    live: 'Live Notice',
    liveDesc:
      'ดูและจัดการประกาศสดของ Melo',

    access: 'จัดการสิทธิ์แอดมิน',
    accessDesc:
      'กำหนดระดับบัญชีและสิทธิ์การดูหรือดำเนินการของผู้ดูแลแต่ละคน',

    checkingAccess:
      'กำลังตรวจสอบสิทธิ์...',

    accessDenied:
      'ไม่มีสิทธิ์เข้าใช้งาน',

    accessDeniedDesc:
      'เมนูนี้แสดงเฉพาะบัญชีที่มีสิทธิ์ดูแลระบบ',

    pendingTotal:
      'รอดำเนินการทั้งหมด',

    currentQueue:
      'คิวปัจจุบัน',

    visibleResults:
      'รายการที่แสดง',

    refresh:
      'รีเฟรช',

    searchPlaceholder:
      'ค้นหาชื่อ อีเมล ร้านค้า หรือข้อมูลที่เกี่ยวข้อง...',

    pending:
      'รอดำเนินการ',

    all:
      'ทั้งหมด',

    loading:
      'กำลังโหลดข้อมูล...',

    retry:
      'ลองใหม่',

    empty:
      'ไม่มีรายการในหมวดนี้',

    emptySearch:
      'ไม่พบรายการที่ตรงกับการค้นหา',

    reviewButton:
      'ตรวจสอบ',

    submitted:
      'ส่งเมื่อ',

    status:
      'สถานะ',

    email:
      'อีเมล',

    backToList:
      'กลับไปรายการ',

    detailTitle:
      'รายละเอียดการตรวจสอบ',

    importantData:
      'ข้อมูลสำคัญสำหรับพิจารณา',

    checklist:
      'Checklist',

    complete:
      'ครบ',

    shouldCheck:
      'ควรตรวจ',

    evidence:
      'เอกสารและหลักฐาน',

    evidencePrivate:
      'ข้อมูลส่วนตัวสำหรับ Admin Review เท่านั้น',

    evidenceLoading:
      'กำลังโหลดเอกสาร...',

    noEvidence:
      'ไม่มีเอกสารหรือหลักฐานแนบ',

    openFile:
      'เปิดไฟล์',

    adminNote:
      'หมายเหตุจากแอดมิน',

    adminNotePlaceholder:
      'ระบุเหตุผล ผลการตรวจ หรือข้อมูลที่ต้องการให้ผู้ใช้ / Partner แก้ไข',

    readOnly:
      'บัญชีนี้ดูข้อมูลได้ แต่ไม่มีสิทธิ์ดำเนินการในหมวดนี้',

    updated:
      'อัปเดตรายการเรียบร้อยแล้ว',

    requiredNote:
      'กรุณาระบุสิ่งที่ต้องแก้ไขหรือข้อมูลที่ต้องส่งเพิ่ม',

    queueReports:
      'รายงานผู้ใช้',

    queueVerification:
      'ยืนยันตัวตน',

    queueBusiness:
      'ยืนยันบริษัท',

    queuePayout:
      'บัญชีรับเงิน',

    queueReverification:
      'ยืนยันใหม่',

    queueDeletions:
      'ลบบัญชี',

    queueReviewCases:
      'ข้อพิพาทรีวิว',

    approve:
      'อนุมัติ',

    reject:
      'ไม่อนุมัติ',

    requestInfo:
      'ขอแก้ไข / ข้อมูลเพิ่ม',

    suspend:
      'ระงับ',

    dismiss:
      'ปิดรายงาน',

    warn:
      'เตือนผู้ใช้',

    suspend24h:
      'ระงับ 24 ชม.',

    suspend7d:
      'ระงับ 7 วัน',

    deactivate:
      'ปิดบัญชี',

    resolve:
      'แก้ไขเรื่องแล้ว',

    hideReview:
      'ซ่อนรีวิว',

    acknowledge:
      'รับทราบคำขอ',

    cancelDeletion:
      'ยกเลิกคำขอลบ',
  },


  en: {
    management: 'Admin management',
    managementEyebrow: 'ADMIN MANAGEMENT',
    back: 'Back',

    menu: 'Admin menu',
    workspace: 'Admin workspace',

    review: 'Admin Review Center',
    reviewDesc:
      'Review accounts, users, businesses, documents, reports and pending cases.',

    quest: 'Manage Quest & Reward',
    questDesc:
      'Manage Melo quests and rewards.',

    live: 'Live Notice',
    liveDesc:
      'View and manage Melo Live Notices.',

    access: 'Admin Access',
    accessDesc:
      'Manage administrator roles and control what each admin can view or manage.',

    checkingAccess:
      'Checking access...',

    accessDenied:
      'Access denied',

    accessDeniedDesc:
      'This menu is available only to accounts with admin access.',

    pendingTotal:
      'Total pending',

    currentQueue:
      'Current queue',

    visibleResults:
      'Visible results',

    refresh:
      'Refresh',

    searchPlaceholder:
      'Search by name, email, business or related information...',

    pending:
      'Pending',

    all:
      'All',

    loading:
      'Loading...',

    retry:
      'Try again',

    empty:
      'No items in this category',

    emptySearch:
      'No items match your search',

    reviewButton:
      'Review',

    submitted:
      'Submitted',

    status:
      'Status',

    email:
      'Email',

    backToList:
      'Back to list',

    detailTitle:
      'Review details',

    importantData:
      'Important review information',

    checklist:
      'Checklist',

    complete:
      'Complete',

    shouldCheck:
      'Check',

    evidence:
      'Documents & evidence',

    evidencePrivate:
      'Private data for Admin Review only',

    evidenceLoading:
      'Loading documents...',

    noEvidence:
      'No documents or evidence attached',

    openFile:
      'Open file',

    adminNote:
      'Admin note',

    adminNotePlaceholder:
      'Enter the review result, reason or information that needs correction.',

    readOnly:
      'This account can view this queue but cannot perform actions.',

    updated:
      'The review item was updated.',

    requiredNote:
      'Please specify what information or documents need correction.',

    queueReports:
      'User reports',

    queueVerification:
      'Identity verification',

    queueBusiness:
      'Business verification',

    queuePayout:
      'Payout account',

    queueReverification:
      'Re-verification',

    queueDeletions:
      'Account deletion',

    queueReviewCases:
      'Review disputes',

    approve:
      'Approve',

    reject:
      'Reject',

    requestInfo:
      'Request changes / info',

    suspend:
      'Suspend',

    dismiss:
      'Dismiss report',

    warn:
      'Warn user',

    suspend24h:
      'Suspend 24h',

    suspend7d:
      'Suspend 7d',

    deactivate:
      'Deactivate account',

    resolve:
      'Resolve',

    hideReview:
      'Hide review',

    acknowledge:
      'Acknowledge',

    cancelDeletion:
      'Cancel deletion',
  },


  de: {
    management: 'Admin-Verwaltung',
    managementEyebrow: 'ADMIN MANAGEMENT',
    back: 'Zurück',

    menu: 'Admin-Menü',
    workspace: 'Admin-Arbeitsbereich',

    review: 'Admin Review Center',
    reviewDesc:
      'Konten, Nutzer, Unternehmen, Dokumente und Meldungen prüfen.',

    quest: 'Quest & Reward verwalten',
    questDesc:
      'Melo-Quests und Belohnungen verwalten.',

    live: 'Live Notice',
    liveDesc:
      'Melo Live Notices verwalten.',

    access: 'Admin-Berechtigungen',
    accessDesc:
      'Administratorrollen sowie Ansichts- und Verwaltungsrechte festlegen.',

    checkingAccess:
      'Berechtigung wird geprüft...',

    accessDenied:
      'Kein Zugriff',

    accessDeniedDesc:
      'Dieses Menü ist nur für Admin-Konten verfügbar.',

    pendingTotal:
      'Offen gesamt',

    currentQueue:
      'Aktuelle Warteschlange',

    visibleResults:
      'Ergebnisse',

    refresh:
      'Aktualisieren',

    searchPlaceholder:
      'Name, E-Mail, Unternehmen oder Informationen suchen...',

    pending:
      'Offen',

    all:
      'Alle',

    loading:
      'Wird geladen...',

    retry:
      'Erneut versuchen',

    empty:
      'Keine Einträge',

    emptySearch:
      'Keine passenden Ergebnisse',

    reviewButton:
      'Prüfen',

    submitted:
      'Eingereicht',

    status:
      'Status',

    email:
      'E-Mail',

    backToList:
      'Zurück zur Liste',

    detailTitle:
      'Prüfdetails',

    importantData:
      'Wichtige Prüfinformationen',

    checklist:
      'Checkliste',

    complete:
      'Vollständig',

    shouldCheck:
      'Prüfen',

    evidence:
      'Dokumente & Nachweise',

    evidencePrivate:
      'Private Admin-Daten',

    evidenceLoading:
      'Dokumente werden geladen...',

    noEvidence:
      'Keine Dokumente vorhanden',

    openFile:
      'Datei öffnen',

    adminNote:
      'Admin-Notiz',

    adminNotePlaceholder:
      'Ergebnis, Grund oder notwendige Änderungen eingeben.',

    readOnly:
      'Nur Leseberechtigung.',

    updated:
      'Eintrag wurde aktualisiert.',

    requiredNote:
      'Bitte notwendige Änderungen angeben.',

    queueReports:
      'Nutzermeldungen',

    queueVerification:
      'Identitätsprüfung',

    queueBusiness:
      'Unternehmensprüfung',

    queuePayout:
      'Auszahlungskonto',

    queueReverification:
      'Erneute Prüfung',

    queueDeletions:
      'Kontolöschung',

    queueReviewCases:
      'Bewertungsfälle',

    approve:
      'Genehmigen',

    reject:
      'Ablehnen',

    requestInfo:
      'Änderungen anfordern',

    suspend:
      'Sperren',

    dismiss:
      'Meldung schließen',

    warn:
      'Warnen',

    suspend24h:
      '24 Std. sperren',

    suspend7d:
      '7 Tage sperren',

    deactivate:
      'Konto deaktivieren',

    resolve:
      'Erledigt',

    hideReview:
      'Bewertung ausblenden',

    acknowledge:
      'Bestätigen',

    cancelDeletion:
      'Löschung abbrechen',
  },


  zh: {
    management: '管理员管理',
    managementEyebrow: 'ADMIN MANAGEMENT',
    back: '返回',

    menu: '管理员菜单',
    workspace: '管理工作区',

    review: '管理员审核中心',
    reviewDesc:
      '审核账户、用户、商家、文件和举报。',

    quest: '管理 Quest 和 Reward',
    questDesc:
      '管理 Melo Quest 和奖励。',

    live: '实时公告',
    liveDesc:
      '查看和管理 Melo 实时公告。',

    access: '管理员权限',
    accessDesc:
      '设置管理员角色以及每个管理员可以查看或处理的数据权限。',

    checkingAccess:
      '正在检查权限...',

    accessDenied:
      '无访问权限',

    accessDeniedDesc:
      '此菜单仅限管理员账户。',

    pendingTotal:
      '待处理总数',

    currentQueue:
      '当前队列',

    visibleResults:
      '显示结果',

    refresh:
      '刷新',

    searchPlaceholder:
      '搜索姓名、邮箱、商家或相关信息...',

    pending:
      '待处理',

    all:
      '全部',

    loading:
      '加载中...',

    retry:
      '重试',

    empty:
      '暂无项目',

    emptySearch:
      '没有匹配结果',

    reviewButton:
      '审核',

    submitted:
      '提交时间',

    status:
      '状态',

    email:
      '邮箱',

    backToList:
      '返回列表',

    detailTitle:
      '审核详情',

    importantData:
      '重要审核信息',

    checklist:
      '检查清单',

    complete:
      '完整',

    shouldCheck:
      '需检查',

    evidence:
      '文件与证据',

    evidencePrivate:
      '仅限管理员审核的私密数据',

    evidenceLoading:
      '正在加载文件...',

    noEvidence:
      '没有附件',

    openFile:
      '打开文件',

    adminNote:
      '管理员备注',

    adminNotePlaceholder:
      '填写审核结果、原因或需要修改的信息。',

    readOnly:
      '仅有查看权限。',

    updated:
      '审核项目已更新。',

    requiredNote:
      '请说明需要修改的信息。',

    queueReports:
      '用户举报',

    queueVerification:
      '身份验证',

    queueBusiness:
      '商家验证',

    queuePayout:
      '收款账户',

    queueReverification:
      '重新验证',

    queueDeletions:
      '账户删除',

    queueReviewCases:
      '评价争议',

    approve:
      '批准',

    reject:
      '拒绝',

    requestInfo:
      '要求修改 / 补充信息',

    suspend:
      '暂停',

    dismiss:
      '关闭举报',

    warn:
      '警告用户',

    suspend24h:
      '暂停 24 小时',

    suspend7d:
      '暂停 7 天',

    deactivate:
      '停用账户',

    resolve:
      '已解决',

    hideReview:
      '隐藏评价',

    acknowledge:
      '确认收到',

    cancelDeletion:
      '取消删除',
  },


  ja: {
    management: '管理者メニュー',
    managementEyebrow: 'ADMIN MANAGEMENT',
    back: '戻る',

    menu: '管理者メニュー',
    workspace: '管理ワークスペース',

    review: '管理者レビューセンター',
    reviewDesc:
      'アカウント、ユーザー、店舗、書類、報告を確認します。',

    quest: 'Quest と Reward を管理',
    questDesc:
      'Melo Quest と Reward を管理します。',

    live: 'ライブ告知',
    liveDesc:
      'Melo Live Notice を管理します。',

    access: '管理者権限',
    accessDesc:
      '管理者ロールと閲覧・操作権限を設定します。',

    checkingAccess:
      '権限を確認中...',

    accessDenied:
      'アクセス権がありません',

    accessDeniedDesc:
      '管理権限が必要です。',

    pendingTotal:
      '保留中の合計',

    currentQueue:
      '現在のキュー',

    visibleResults:
      '表示件数',

    refresh:
      '更新',

    searchPlaceholder:
      '名前、メール、店舗、関連情報を検索...',

    pending:
      '保留中',

    all:
      'すべて',

    loading:
      '読み込み中...',

    retry:
      '再試行',

    empty:
      '項目はありません',

    emptySearch:
      '検索結果がありません',

    reviewButton:
      '確認',

    submitted:
      '送信日時',

    status:
      'ステータス',

    email:
      'メール',

    backToList:
      '一覧へ戻る',

    detailTitle:
      'レビュー詳細',

    importantData:
      '重要な確認情報',

    checklist:
      'チェックリスト',

    complete:
      '完了',

    shouldCheck:
      '要確認',

    evidence:
      '書類・証拠',

    evidencePrivate:
      'Admin Review 専用の非公開データ',

    evidenceLoading:
      '書類を読み込み中...',

    noEvidence:
      '添付書類はありません',

    openFile:
      'ファイルを開く',

    adminNote:
      '管理者メモ',

    adminNotePlaceholder:
      '審査結果、理由、修正内容を入力してください。',

    readOnly:
      '閲覧のみ可能です。',

    updated:
      '項目を更新しました。',

    requiredNote:
      '修正内容を入力してください。',

    queueReports:
      'ユーザー報告',

    queueVerification:
      '本人確認',

    queueBusiness:
      '店舗確認',

    queuePayout:
      '受取口座',

    queueReverification:
      '再確認',

    queueDeletions:
      'アカウント削除',

    queueReviewCases:
      'レビュー異議',

    approve:
      '承認',

    reject:
      '却下',

    requestInfo:
      '修正 / 追加情報を依頼',

    suspend:
      '停止',

    dismiss:
      '報告を閉じる',

    warn:
      '警告',

    suspend24h:
      '24時間停止',

    suspend7d:
      '7日間停止',

    deactivate:
      'アカウント停止',

    resolve:
      '解決済み',

    hideReview:
      'レビューを非表示',

    acknowledge:
      '確認済み',

    cancelDeletion:
      '削除をキャンセル',
  },


  ko: {
    management: '관리자 관리',
    managementEyebrow: 'ADMIN MANAGEMENT',
    back: '뒤로',

    menu: '관리자 메뉴',
    workspace: '관리 작업 공간',

    review: '관리자 검토 센터',
    reviewDesc:
      '계정, 사용자, 비즈니스, 문서 및 신고를 검토합니다.',

    quest: 'Quest 및 Reward 관리',
    questDesc:
      'Melo Quest와 보상을 관리합니다.',

    live: '실시간 공지',
    liveDesc:
      'Melo Live Notice를 관리합니다.',

    access: '관리자 권한',
    accessDesc:
      '관리자 역할과 각 관리자의 조회 및 처리 권한을 설정합니다.',

    checkingAccess:
      '권한 확인 중...',

    accessDenied:
      '접근 권한 없음',

    accessDeniedDesc:
      '관리자 권한이 필요합니다.',

    pendingTotal:
      '전체 대기',

    currentQueue:
      '현재 대기열',

    visibleResults:
      '표시 결과',

    refresh:
      '새로고침',

    searchPlaceholder:
      '이름, 이메일, 비즈니스 또는 관련 정보 검색...',

    pending:
      '대기 중',

    all:
      '전체',

    loading:
      '불러오는 중...',

    retry:
      '다시 시도',

    empty:
      '항목이 없습니다',

    emptySearch:
      '검색 결과가 없습니다',

    reviewButton:
      '검토',

    submitted:
      '제출 시간',

    status:
      '상태',

    email:
      '이메일',

    backToList:
      '목록으로 돌아가기',

    detailTitle:
      '검토 상세',

    importantData:
      '중요 검토 정보',

    checklist:
      '체크리스트',

    complete:
      '완료',

    shouldCheck:
      '확인 필요',

    evidence:
      '문서 및 증거',

    evidencePrivate:
      '관리자 검토 전용 비공개 데이터',

    evidenceLoading:
      '문서 불러오는 중...',

    noEvidence:
      '첨부 문서가 없습니다',

    openFile:
      '파일 열기',

    adminNote:
      '관리자 메모',

    adminNotePlaceholder:
      '검토 결과, 사유 또는 수정 내용을 입력하세요.',

    readOnly:
      '보기 권한만 있습니다.',

    updated:
      '검토 항목을 업데이트했습니다.',

    requiredNote:
      '수정 내용을 입력해 주세요.',

    queueReports:
      '사용자 신고',

    queueVerification:
      '본인 인증',

    queueBusiness:
      '비즈니스 인증',

    queuePayout:
      '정산 계좌',

    queueReverification:
      '재인증',

    queueDeletions:
      '계정 삭제',

    queueReviewCases:
      '리뷰 분쟁',

    approve:
      '승인',

    reject:
      '거절',

    requestInfo:
      '수정 / 추가 정보 요청',

    suspend:
      '정지',

    dismiss:
      '신고 종료',

    warn:
      '사용자 경고',

    suspend24h:
      '24시간 정지',

    suspend7d:
      '7일 정지',

    deactivate:
      '계정 비활성화',

    resolve:
      '해결',

    hideReview:
      '리뷰 숨기기',

    acknowledge:
      '확인',

    cancelDeletion:
      '삭제 취소',
  },
};


/* =========================================================
   HELPERS
   ========================================================= */

function localeTag(
  locale: string,
) {
  const map:
    Record<string, string> = {
      th: 'th-TH',
      en: 'en-US',
      de: 'de-DE',
      zh: 'zh-CN',
      ja: 'ja-JP',
      ko: 'ko-KR',
    };

  return (
    map[locale] ??
    'en-US'
  );
}


function formatDate(
  value: string,
  locale: string,
) {
  if (!value) {
    return '—';
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    localeTag(locale),
    {
      dateStyle: 'medium',
      timeStyle: 'short',
    },
  ).format(date);
}


function valueText(
  value: unknown,
  locale: string,
) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return '—';
  }

  if (
    typeof value === 'boolean'
  ) {
    if (locale === 'th') {
      return value
        ? 'ใช่'
        : 'ไม่ใช่';
    }

    if (locale === 'de') {
      return value
        ? 'Ja'
        : 'Nein';
    }

    if (locale === 'zh') {
      return value
        ? '是'
        : '否';
    }

    if (locale === 'ja') {
      return value
        ? 'はい'
        : 'いいえ';
    }

    if (locale === 'ko') {
      return value
        ? '예'
        : '아니요';
    }

    return value
      ? 'Yes'
      : 'No';
  }

  if (
    Array.isArray(value)
  ) {
    return (
      value
        .map(String)
        .filter(Boolean)
        .join(', ') ||
      '—'
    );
  }

  if (
    typeof value === 'object'
  ) {
    try {
      return JSON.stringify(
        value,
      );
    } catch {
      return '—';
    }
  }

  return String(value);
}


function searchableText(
  item: AdminReviewItemWeb,
) {
  return [
    item.title,
    item.subtitle,
    item.ownerEmail,
    item.status,
    item.id,
    ...Object.values(
      item.details,
    ),
  ]
    .flatMap(
      (value) => {
        if (
          Array.isArray(value)
        ) {
          return value.map(
            String,
          );
        }

        if (
          value &&
          typeof value === 'object'
        ) {
          return Object.values(
            value as Record<
              string,
              unknown
            >,
          ).map(String);
        }

        return [
          String(
            value ?? '',
          ),
        ];
      },
    )
    .join(' ')
    .toLowerCase();
}


function canEnter(
  account:
    SettingsAccountSnapshot |
    null,
) {
  return Boolean(
    account &&
    (
      account.adminHasReviewAccess ||
      account.canQuestRewardAdmin ||
      account.canModerate
    ),
  );
}


/* =========================================================
   FIELD LABELS
   ========================================================= */

const FIELD_LABELS:
Record<
  string,
  Record<string, string>
> = {
  displayName: {
    th: 'ชื่อ',
    en: 'Name',
    de: 'Name',
    zh: '姓名',
    ja: '名前',
    ko: '이름',
  },

  email: {
    th: 'อีเมล',
    en: 'Email',
    de: 'E-Mail',
    zh: '邮箱',
    ja: 'メール',
    ko: '이메일',
  },

  phone: {
    th: 'เบอร์โทรศัพท์',
    en: 'Phone',
    de: 'Telefon',
    zh: '电话',
    ja: '電話',
    ko: '전화',
  },

  legalFirstNameEn: {
    th: 'ชื่อตามเอกสาร',
    en: 'Legal first name',
    de: 'Vorname laut Dokument',
    zh: '证件名字',
    ja: '書類上の名',
    ko: '법적 이름',
  },

  legalLastNameEn: {
    th: 'นามสกุลตามเอกสาร',
    en: 'Legal last name',
    de: 'Nachname laut Dokument',
    zh: '证件姓氏',
    ja: '書類上の姓',
    ko: '법적 성',
  },

  documentType: {
    th: 'ประเภทเอกสาร',
    en: 'Document type',
    de: 'Dokumenttyp',
    zh: '文件类型',
    ja: '書類種別',
    ko: '문서 유형',
  },

  documentNumber: {
    th: 'เลขเอกสาร',
    en: 'Document number',
    de: 'Dokumentnummer',
    zh: '文件号码',
    ja: '書類番号',
    ko: '문서 번호',
  },

  selfieStatus: {
    th: 'สถานะ Selfie',
    en: 'Selfie status',
    de: 'Selfie-Status',
    zh: '自拍状态',
    ja: 'Selfie 状態',
    ko: '셀피 상태',
  },

  identityStatus: {
    th: 'สถานะเอกสารยืนยันตัวตน',
    en: 'Identity status',
    de: 'Identitätsstatus',
    zh: '身份状态',
    ja: '本人確認状態',
    ko: '신원 상태',
  },

  businessDisplayName: {
    th: 'ชื่อร้านค้า',
    en: 'Business name',
    de: 'Unternehmensname',
    zh: '商家名称',
    ja: '店舗名',
    ko: '비즈니스명',
  },

  legalName: {
    th: 'ชื่อจดทะเบียน',
    en: 'Legal name',
    de: 'Firmenname',
    zh: '法定名称',
    ja: '法人名',
    ko: '법적 이름',
  },

  businessType: {
    th: 'ประเภทธุรกิจ',
    en: 'Business type',
    de: 'Unternehmenstyp',
    zh: '商家类型',
    ja: '事業種別',
    ko: '비즈니스 유형',
  },

  entityType: {
    th: 'รูปแบบนิติบุคคล',
    en: 'Entity type',
    de: 'Rechtsform',
    zh: '实体类型',
    ja: '法人形態',
    ko: '법인 유형',
  },

  ownerName: {
    th: 'เจ้าของบัญชี',
    en: 'Owner',
    de: 'Inhaber',
    zh: '所有者',
    ja: 'オーナー',
    ko: '소유자',
  },

  ownerEmail: {
    th: 'อีเมลเจ้าของ',
    en: 'Owner email',
    de: 'Inhaber-E-Mail',
    zh: '所有者邮箱',
    ja: 'オーナーメール',
    ko: '소유자 이메일',
  },

  description: {
    th: 'รายละเอียดร้านค้า',
    en: 'Description',
    de: 'Beschreibung',
    zh: '描述',
    ja: '説明',
    ko: '설명',
  },

  partnershipModes: {
    th: 'รูปแบบความร่วมมือ',
    en: 'Partnership modes',
    de: 'Partnerschaftsarten',
    zh: '合作方式',
    ja: '提携形態',
    ko: '파트너십 방식',
  },

  address: {
    th: 'ที่อยู่',
    en: 'Address',
    de: 'Adresse',
    zh: '地址',
    ja: '住所',
    ko: '주소',
  },

  city: {
    th: 'เมือง',
    en: 'City',
    de: 'Stadt',
    zh: '城市',
    ja: '都市',
    ko: '도시',
  },

  country: {
    th: 'ประเทศ',
    en: 'Country',
    de: 'Land',
    zh: '国家',
    ja: '国',
    ko: '국가',
  },

  coordinates: {
    th: 'พิกัด',
    en: 'Coordinates',
    de: 'Koordinaten',
    zh: '坐标',
    ja: '座標',
    ko: '좌표',
  },

  businessPhone: {
    th: 'เบอร์ร้านค้า',
    en: 'Business phone',
    de: 'Geschäftstelefon',
    zh: '商家电话',
    ja: '店舗電話',
    ko: '비즈니스 전화',
  },

  businessEmail: {
    th: 'อีเมลร้านค้า',
    en: 'Business email',
    de: 'Geschäfts-E-Mail',
    zh: '商家邮箱',
    ja: '店舗メール',
    ko: '비즈니스 이메일',
  },

  registrationNumber: {
    th: 'เลขทะเบียนบริษัท',
    en: 'Registration number',
    de: 'Registrierungsnummer',
    zh: '注册号',
    ja: '登録番号',
    ko: '등록 번호',
  },

  taxId: {
    th: 'เลขประจำตัวผู้เสียภาษี',
    en: 'Tax ID',
    de: 'Steuer-ID',
    zh: '税号',
    ja: '納税者番号',
    ko: '세금 번호',
  },

  contactPersonName: {
    th: 'ผู้ติดต่อ',
    en: 'Contact person',
    de: 'Kontaktperson',
    zh: '联系人',
    ja: '担当者',
    ko: '담당자',
  },

  contactPersonPhone: {
    th: 'เบอร์ติดต่อ',
    en: 'Contact phone',
    de: 'Kontakttelefon',
    zh: '联系电话',
    ja: '連絡先電話',
    ko: '연락처',
  },

  bankName: {
    th: 'ธนาคาร',
    en: 'Bank',
    de: 'Bank',
    zh: '银行',
    ja: '銀行',
    ko: '은행',
  },

  bankCountry: {
    th: 'ประเทศธนาคาร',
    en: 'Bank country',
    de: 'Bankland',
    zh: '银行国家',
    ja: '銀行所在国',
    ko: '은행 국가',
  },

  payoutCurrency: {
    th: 'สกุลเงิน',
    en: 'Currency',
    de: 'Währung',
    zh: '货币',
    ja: '通貨',
    ko: '통화',
  },

  accountHolderName: {
    th: 'ชื่อบัญชี',
    en: 'Account holder',
    de: 'Kontoinhaber',
    zh: '账户持有人',
    ja: '口座名義',
    ko: '예금주',
  },

  accountNumber: {
    th: 'เลขบัญชี',
    en: 'Account / IBAN',
    de: 'Konto / IBAN',
    zh: '账户 / IBAN',
    ja: '口座 / IBAN',
    ko: '계좌 / IBAN',
  },

  reverificationReason: {
    th: 'เหตุผลการยืนยันใหม่',
    en: 'Re-verification reason',
    de: 'Grund der erneuten Prüfung',
    zh: '重新验证原因',
    ja: '再確認理由',
    ko: '재인증 사유',
  },

  documentKind: {
    th: 'เอกสาร',
    en: 'Document',
    de: 'Dokument',
    zh: '文件',
    ja: '書類',
    ko: '문서',
  },

  dueAt: {
    th: 'กำหนดตรวจ',
    en: 'Due',
    de: 'Fällig',
    zh: '截止时间',
    ja: '期限',
    ko: '기한',
  },

  reportedName: {
    th: 'ผู้ถูกรายงาน',
    en: 'Reported user',
    de: 'Gemeldeter Nutzer',
    zh: '被举报用户',
    ja: '報告対象ユーザー',
    ko: '신고 대상',
  },

  reporterName: {
    th: 'ผู้รายงาน',
    en: 'Reporter',
    de: 'Meldender Nutzer',
    zh: '举报人',
    ja: '報告者',
    ko: '신고자',
  },

  reason: {
    th: 'เหตุผล',
    en: 'Reason',
    de: 'Grund',
    zh: '原因',
    ja: '理由',
    ko: '사유',
  },

  details: {
    th: 'รายละเอียด',
    en: 'Details',
    de: 'Details',
    zh: '详情',
    ja: '詳細',
    ko: '상세',
  },

  accountReportCount: {
    th: 'จำนวนรายงานบัญชี',
    en: 'Account reports',
    de: 'Kontomeldungen',
    zh: '账户举报数',
    ja: 'アカウント報告数',
    ko: '계정 신고 수',
  },

  moderationStatus: {
    th: 'สถานะ Moderation',
    en: 'Moderation status',
    de: 'Moderationsstatus',
    zh: '审核状态',
    ja: 'モデレーション状態',
    ko: '관리 상태',
  },

  scheduledFor: {
    th: 'กำหนดลบบัญชี',
    en: 'Scheduled deletion',
    de: 'Geplante Löschung',
    zh: '计划删除',
    ja: '削除予定',
    ko: '삭제 예정',
  },

  caseType: {
    th: 'ประเภทเคส',
    en: 'Case type',
    de: 'Falltyp',
    zh: '案件类型',
    ja: 'ケース種別',
    ko: '케이스 유형',
  },

  reviewComment: {
    th: 'ข้อความรีวิว',
    en: 'Review comment',
    de: 'Bewertungstext',
    zh: '评价内容',
    ja: 'レビュー内容',
    ko: '리뷰 내용',
  },

  rating: {
    th: 'คะแนนรีวิว',
    en: 'Rating',
    de: 'Bewertung',
    zh: '评分',
    ja: '評価',
    ko: '평점',
  },

  reviewerNotes: {
    th: 'หมายเหตุจากการตรวจครั้งก่อน',
    en: 'Previous reviewer note',
    de: 'Vorherige Prüfernotiz',
    zh: '之前的审核备注',
    ja: '前回の審査メモ',
    ko: '이전 검토 메모',
  },
};


function fieldLabel(
  key: string,
  locale: string,
) {
  return (
    FIELD_LABELS[key]?.[locale] ??
    FIELD_LABELS[key]?.en ??
    key
  );
}


/* =========================================================
   IMPORTANT FIELD SETS
   ========================================================= */

function importantFields(
  queue: AdminReviewQueueType,
): string[] {
  if (
    queue === 'verification'
  ) {
    return [
      'displayName',
      'email',
      'phone',
      'legalFirstNameEn',
      'legalLastNameEn',
      'documentType',
      'documentNumber',
      'selfieStatus',
      'identityStatus',
      'reviewerNotes',
    ];
  }

  if (
    queue === 'business'
  ) {
    return [
      'businessDisplayName',
      'legalName',
      'businessType',
      'entityType',
      'ownerName',
      'ownerEmail',
      'description',
      'partnershipModes',
      'address',
      'city',
      'country',
      'coordinates',
      'businessPhone',
      'businessEmail',
      'registrationNumber',
      'taxId',
      'contactPersonName',
      'contactPersonPhone',
      'reviewerNotes',
    ];
  }

  if (
    queue === 'payout'
  ) {
    return [
      'businessDisplayName',
      'legalName',
      'bankCountry',
      'payoutCurrency',
      'bankName',
      'accountHolderName',
      'accountNumber',
      'reviewerNotes',
    ];
  }

  if (
    queue === 'reverification'
  ) {
    return [
      'businessDisplayName',
      'legalName',
      'country',
      'reverificationReason',
      'documentKind',
      'dueAt',
      'reviewerNotes',
    ];
  }

  if (
    queue === 'user_reports'
  ) {
    return [
      'reportedName',
      'reporterName',
      'reason',
      'details',
      'accountReportCount',
      'moderationStatus',
    ];
  }

  if (
    queue === 'account_deletions'
  ) {
    return [
      'displayName',
      'email',
      'reason',
      'scheduledFor',
    ];
  }

  return [
    'caseType',
    'reason',
    'details',
    'rating',
    'reviewComment',
  ];
}


/* =========================================================
   QUEUE DEFINITIONS
   ========================================================= */

function queueDefinitions(
  t: AdminCopy,
) {
  return [
    {
      key:
        'user_reports' as const,

      label:
        t.queueReports,

      icon:
        '!',
    },

    {
      key:
        'verification' as const,

      label:
        t.queueVerification,

      icon:
        '✓',
    },

    {
      key:
        'business' as const,

      label:
        t.queueBusiness,

      icon:
        'B',
    },

    {
      key:
        'payout' as const,

      label:
        t.queuePayout,

      icon:
        '฿',
    },

    {
      key:
        'reverification' as const,

      label:
        t.queueReverification,

      icon:
        '↻',
    },

    {
      key:
        'account_deletions' as const,

      label:
        t.queueDeletions,

      icon:
        '×',
    },

    {
      key:
        'review_cases' as const,

      label:
        t.queueReviewCases,

      icon:
        'R',
    },
  ];
}


function actionLabel(
  action:
    AdminReviewAction,

  t:
    AdminCopy,
) {
  const labels:
    Record<
      AdminReviewAction,
      string
    > = {
      approve:
        t.approve,

      reject:
        t.reject,

      request_info:
        t.requestInfo,

      suspend:
        t.suspend,

      dismiss:
        t.dismiss,

      warn:
        t.warn,

      suspend_24h:
        t.suspend24h,

      suspend_7d:
        t.suspend7d,

      deactivate:
        t.deactivate,

      resolve:
        t.resolve,

      hide_review:
        t.hideReview,

      acknowledge:
        t.acknowledge,

      cancel_deletion:
        t.cancelDeletion,
    };

  return labels[action];
}


/* =========================================================
   CHECKLIST
   ========================================================= */

function businessChecklist(
  item:
    AdminReviewItemWeb,
) {
  const data =
    item.details;

  function has(
    key:
      string,
  ) {
    const value =
      data[key];

    if (
      Array.isArray(value)
    ) {
      return (
        value.length >
        0
      );
    }

    return Boolean(
      String(
        value ?? '',
      ).trim(),
    );
  }

  return [
    {
      label:
        'Business profile',

      ok:
        has(
          'logoPath',
        ),
    },

    {
      label:
        'Business type',

      ok:
        has(
          'businessType',
        ) &&
        has(
          'entityType',
        ),
    },

    {
      label:
        'Business name',

      ok:
        has(
          'businessDisplayName',
        ) &&
        has(
          'legalName',
        ),
    },

    {
      label:
        'Description',

      ok:
        has(
          'description',
        ),
    },

    {
      label:
        'Partnership mode',

      ok:
        has(
          'partnershipModes',
        ),
    },

    {
      label:
        'Address & location',

      ok:
        has(
          'address',
        ) &&
        has(
          'city',
        ) &&
        has(
          'country',
        ),
    },

    {
      label:
        'Phone & email',

      ok:
        has(
          'businessPhone',
        ) &&
        has(
          'businessEmail',
        ),
    },

    {
      label:
        'Review contact',

      ok:
        has(
          'contactPersonName',
        ) &&
        has(
          'contactPersonPhone',
        ),
    },

    {
      label:
        'Business documents',

      ok:
        has(
          'registrationNumber',
        ) ||
        has(
          'registrationDocumentPath',
        ),
    },
  ];
}


function payoutChecklist(
  item:
    AdminReviewItemWeb,
) {
  const data =
    item.details;

  function has(
    key:
      string,
  ) {
    return Boolean(
      String(
        data[key] ??
        '',
      ).trim(),
    );
  }

  return [
    {
      label:
        'Account holder',

      ok:
        has(
          'accountHolderName',
        ),
    },

    {
      label:
        'Bank',

      ok:
        has(
          'bankName',
        ),
    },

    {
      label:
        'Country & currency',

      ok:
        has(
          'bankCountry',
        ) &&
        has(
          'payoutCurrency',
        ),
    },

    {
      label:
        'Account / IBAN',

      ok:
        has(
          'accountNumber',
        ),
    },

    {
      label:
        'Bank evidence',

      ok:
        has(
          'payoutDocumentPath',
        ),
    },
  ];
}


/* =========================================================
   ADMIN MANAGEMENT
   ========================================================= */

export default function AdminManagementExperience() {
  const {
    locale,
  } =
    useLocale();

  const t =
    COPY[locale] ??
    COPY.en;

  const [
    account,
    setAccount,
  ] =
    useState<
      SettingsAccountSnapshot |
      null
    >(null);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    activeSection,
    setActiveSection,
  ] =
    useState<
      AdminSection
    >(
      'review',
    );


  useEffect(
    () => {
      let active =
        true;

      void loadSettingsAccountSnapshot()
        .then(
          (value) => {
            if (
              active
            ) {
              setAccount(
                value,
              );
            }
          },
        )
        .catch(
          () => {
            if (
              active
            ) {
              setAccount(
                null,
              );
            }
          },
        )
        .finally(
          () => {
            if (
              active
            ) {
              setLoading(
                false,
              );
            }
          },
        );

      return () => {
        active =
          false;
      };
    },
    [],
  );


  const sections =
    useMemo(
      () => [
        {
          id:
            'review' as const,

          icon:
            '✓',

          title:
            t.review,

          description:
            t.reviewDesc,

          allowed:
            Boolean(
              account?.adminHasReviewAccess ||
              account?.canModerate,
            ),
        },

        {
          id:
            'quest' as const,

          icon:
            'Q',

          title:
            t.quest,

          description:
            t.questDesc,

          allowed:
            Boolean(
              account?.canQuestRewardAdmin,
            ),
        },

        {
          id:
            'live' as const,

          icon:
            '●',

          title:
            t.live,

          description:
            t.liveDesc,

          allowed:
            Boolean(
              account?.canQuestRewardAdmin,
            ),
        },

        {
          id:
            'access' as const,

          icon:
            'A',

          title:
            t.access,

          description:
            t.accessDesc,

          /*
           * แสดงเมนูให้บัญชีที่เข้าพื้นที่ Admin ได้
           * แล้ว AdminAccessWorkspace จะตรวจ manage_admins
           * จาก Backend อีกชั้นก่อนให้แก้ไขข้อมูลจริง
           */
          allowed:
            Boolean(
              account?.adminHasReviewAccess ||
              account?.canQuestRewardAdmin ||
              account?.canModerate,
            ),
        },
      ],
      [
        account,
        t,
      ],
    );


  const availableSections =
    useMemo(
      () =>
        sections.filter(
          (item) =>
            item.allowed,
        ),
      [
        sections,
      ],
    );


  useEffect(
    () => {
      if (
        loading ||
        !account
      ) {
        return;
      }

      const valid =
        sections.some(
          (item) =>
            item.id ===
              activeSection &&
            item.allowed,
        );

      if (
        !valid
      ) {
        const first =
          sections.find(
            (item) =>
              item.allowed,
          );

        if (
          first
        ) {
          setActiveSection(
            first.id,
          );
        }
      }
    },
    [
      account,
      activeSection,
      loading,
      sections,
    ],
  );


  const activeMeta =
    sections.find(
      (item) =>
        item.id ===
        activeSection,
    ) ??
    availableSections[0];


  return (
    <main
      className={
        styles.page
      }
    >
      <Header />

      <section
        className={
          styles.shell
        }
      >
        <header
          className={
            styles.top
          }
        >
          <Link
            href="/account"
            className={
              styles.back
            }
          >
            ← {t.back}
          </Link>

          <div
            className={
              styles.head
            }
          >
            <small>
              {
                t.managementEyebrow
              }
            </small>

            <h1>
              {
                t.management
              }
            </h1>
          </div>

          <div
            className={
              styles.spacer
            }
            aria-hidden="true"
          />
        </header>

        {loading ? (
          <div
            className={
              styles.pageState
            }
          >
            {
              t.checkingAccess
            }
          </div>
        ) : !canEnter(
            account,
          ) ? (
          <div
            className={
              styles.pageState
            }
          >
            <strong>
              {
                t.accessDenied
              }
            </strong>

            <span>
              {
                t.accessDeniedDesc
              }
            </span>
          </div>
        ) : (
          <section
            className={
              styles.workspace
            }
          >
            <aside
              className={
                styles.sidebar
              }
            >
              <div
                className={
                  styles.sidebarHead
                }
              >
                <small>
                  MELO ADMIN
                </small>

                <strong>
                  {t.menu}
                </strong>
              </div>

              <nav
                className={
                  styles.adminNav
                }
              >
                {sections
                  .filter(
                    (item) =>
                      item.allowed,
                  )
                  .map(
                    (item) => (
                      <button
                        key={
                          item.id
                        }
                        type="button"
                        data-active={
                          activeSection ===
                          item.id
                        }
                        onClick={() =>
                          setActiveSection(
                            item.id,
                          )
                        }
                      >
                        <span
                          className={
                            styles.menuIcon
                          }
                        >
                          {
                            item.icon
                          }
                        </span>

                        <span
                          className={
                            styles.menuCopy
                          }
                        >
                          <strong>
                            {
                              item.title
                            }
                          </strong>

                          <small>
                            {
                              item.description
                            }
                          </small>
                        </span>
                      </button>
                    ),
                  )}
              </nav>
            </aside>

            <section
              className={
                styles.contentPanel
              }
            >
              <header
                className={
                  styles.contentHead
                }
              >
                <small>
                  {
                    t.workspace
                  }
                </small>

                <h2>
                  {
                    activeMeta?.title
                  }
                </h2>

                <p>
                  {
                    activeMeta?.description
                  }
                </p>
              </header>

              <div
                className={
                  styles.contentBody
                }
              >
                {activeSection ===
                'review' ? (
                  <AdminReviewWorkspace
                    locale={
                      locale
                    }
                    t={
                      t
                    }
                  />
                ) : null}

                {activeSection ===
                'quest' ? (
                  <SettingsUtilityExperience
                    mode="quest-admin"
                    embedded
                  />
                ) : null}

                {activeSection ===
                'live' ? (
                  <AdminLiveNoticeWorkspace />
                ) : null}

                {activeSection ===
                'access' ? (
                  <AdminAccessWorkspace />
                ) : null}
              </div>
            </section>
          </section>
        )}
      </section>
    </main>
  );
}


/* =========================================================
   ADMIN REVIEW WORKSPACE
   ========================================================= */

function AdminReviewWorkspace({
  locale,
  t,
}: {
  locale:
    string;

  t:
    AdminCopy;
}) {
  const queueDefs =
    useMemo(
      () =>
        queueDefinitions(
          t,
        ),
      [
        t,
      ],
    );

  const [
    access,
    setAccess,
  ] =
    useState<
      AdminReviewAccessWeb |
      null
    >(null);

  const [
    queue,
    setQueue,
  ] =
    useState<
      AdminReviewQueueType
    >(
      'user_reports',
    );

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<
      AdminReviewStatusFilter
    >(
      'pending',
    );

  const [
    items,
    setItems,
  ] =
    useState<
      AdminReviewItemWeb[]
    >([]);

  const [
    counts,
    setCounts,
  ] =
    useState<
      Partial<
        Record<
          AdminReviewQueueType,
          number
        >
      >
    >({});

  const [
    search,
    setSearch,
  ] =
    useState('');

  const [
    selected,
    setSelected,
  ] =
    useState<
      AdminReviewItemWeb |
      null
    >(null);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState('');

  const [
    success,
    setSuccess,
  ] =
    useState('');

  const [
    note,
    setNote,
  ] =
    useState('');

  const [
    acting,
    setActing,
  ] =
    useState(false);

  const [
    evidence,
    setEvidence,
  ] =
    useState<
      AdminReviewEvidenceWeb[]
    >([]);

  const [
    evidenceLoading,
    setEvidenceLoading,
  ] =
    useState(false);

  const [
    evidenceError,
    setEvidenceError,
  ] =
    useState('');


  useEffect(
    () => {
      let active =
        true;

      async function initialize() {
        setLoading(
          true,
        );

        setError('');

        try {
          const currentAccess =
            await getAdminReviewAccessWeb();

          if (
            !active
          ) {
            return;
          }

          setAccess(
            currentAccess,
          );

          if (
            !currentAccess
              .hasAnyReviewAccess
          ) {
            setItems([]);
            setCounts({});

            return;
          }

          const allowed =
            queueDefs.filter(
              (entry) =>
                canViewAdminReviewQueue(
                  currentAccess,
                  entry.key,
                ),
            );

          const nextQueue =
            allowed.find(
              (entry) =>
                entry.key ===
                queue,
            )?.key ??
            allowed[0]?.key;

          if (
            !nextQueue
          ) {
            setItems([]);
            setCounts({});

            return;
          }

          const [
            nextCounts,
            nextItems,
          ] =
            await Promise.all([
              getAdminReviewQueueCountsWeb(
                currentAccess,
              ),

              listAdminReviewQueueWeb(
                nextQueue,
                statusFilter,
                200,
              ),
            ]);

          if (
            !active
          ) {
            return;
          }

          setQueue(
            nextQueue,
          );

          setCounts(
            nextCounts,
          );

          setItems(
            nextItems,
          );
        } catch (
          cause
        ) {
          if (
            active
          ) {
            setError(
              cause instanceof Error
                ? cause.message
                : String(
                    cause,
                  ),
            );
          }
        } finally {
          if (
            active
          ) {
            setLoading(
              false,
            );
          }
        }
      }

      void initialize();

      return () => {
        active =
          false;
      };
    },
    [
      locale,
    ],
  );


  async function refreshCurrent() {
    setLoading(
      true,
    );

    setError('');

    try {
      const currentAccess =
        access ??
        await getAdminReviewAccessWeb();

      setAccess(
        currentAccess,
      );

      if (
        !currentAccess
          .hasAnyReviewAccess
      ) {
        setItems([]);
        setCounts({});

        return;
      }

      const [
        nextCounts,
        nextItems,
      ] =
        await Promise.all([
          getAdminReviewQueueCountsWeb(
            currentAccess,
          ),

          listAdminReviewQueueWeb(
            queue,
            statusFilter,
            200,
          ),
        ]);

      setCounts(
        nextCounts,
      );

      setItems(
        nextItems,
      );
    } catch (
      cause
    ) {
      setError(
        cause instanceof Error
          ? cause.message
          : String(
              cause,
            ),
      );
    } finally {
      setLoading(
        false,
      );
    }
  }


  async function selectQueue(
    nextQueue:
      AdminReviewQueueType,
  ) {
    if (
      !access ||
      nextQueue ===
        queue
    ) {
      return;
    }

    setQueue(
      nextQueue,
    );

    setSelected(
      null,
    );

    setSearch('');
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const rows =
        await listAdminReviewQueueWeb(
          nextQueue,
          statusFilter,
          200,
        );

      setItems(
        rows,
      );
    } catch (
      cause
    ) {
      setError(
        cause instanceof Error
          ? cause.message
          : String(
              cause,
            ),
      );
    } finally {
      setLoading(
        false,
      );
    }
  }


  async function selectStatus(
    nextStatus:
      AdminReviewStatusFilter,
  ) {
    if (
      !access ||
      nextStatus ===
        statusFilter
    ) {
      return;
    }

    setStatusFilter(
      nextStatus,
    );

    setSelected(
      null,
    );

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const rows =
        await listAdminReviewQueueWeb(
          queue,
          nextStatus,
          200,
        );

      setItems(
        rows,
      );
    } catch (
      cause
    ) {
      setError(
        cause instanceof Error
          ? cause.message
          : String(
              cause,
            ),
      );
    } finally {
      setLoading(
        false,
      );
    }
  }


  const allowedQueues =
    useMemo(
      () =>
        access
          ? queueDefs.filter(
              (entry) =>
                canViewAdminReviewQueue(
                  access,
                  entry.key,
                ),
            )
          : [],
      [
        access,
        queueDefs,
      ],
    );


  const filteredItems =
    useMemo(
      () => {
        const query =
          search
            .trim()
            .toLowerCase();

        if (
          !query
        ) {
          return items;
        }

        return items.filter(
          (item) =>
            searchableText(
              item,
            ).includes(
              query,
            ),
        );
      },
      [
        items,
        search,
      ],
    );


  const pendingTotal =
    useMemo(
      () =>
        Object.values(
          counts,
        ).reduce(
          (
            total,
            value,
          ) =>
            total +
            Number(
              value ?? 0,
            ),
          0,
        ),
      [
        counts,
      ],
    );


  const currentQueueName =
    queueDefs.find(
      (entry) =>
        entry.key ===
        queue,
    )?.label ??
    queue;


  useEffect(
    () => {
      let active =
        true;

      setEvidence([]);
      setEvidenceError('');

      if (
        !selected
      ) {
        setEvidenceLoading(
          false,
        );

        return () => {
          active =
            false;
        };
      }

      setEvidenceLoading(
        true,
      );

      void loadAdminReviewEvidenceWeb(
        selected,
      )
        .then(
          (rows) => {
            if (
              active
            ) {
              setEvidence(
                rows,
              );
            }
          },
        )
        .catch(
          (cause) => {
            if (
              active
            ) {
              setEvidenceError(
                cause instanceof Error
                  ? cause.message
                  : String(
                      cause,
                    ),
              );
            }
          },
        )
        .finally(
          () => {
            if (
              active
            ) {
              setEvidenceLoading(
                false,
              );
            }
          },
        );

      return () => {
        active =
          false;
      };
    },
    [
      selected,
    ],
  );


  async function runAction(
    action:
      AdminReviewAction,
  ) {
    if (
      !selected ||
      !access ||
      acting
    ) {
      return;
    }

    if (
      action ===
        'request_info' &&
      !note.trim()
    ) {
      setError(
        t.requiredNote,
      );

      return;
    }

    const destructive =
      action ===
        'reject' ||
      action ===
        'deactivate' ||
      action ===
        'cancel_deletion';

    if (
      destructive &&
      !window.confirm(
        `${actionLabel(
          action,
          t,
        )}?`,
      )
    ) {
      return;
    }

    setActing(
      true,
    );

    setError('');
    setSuccess('');

    try {
      await resolveAdminReviewItemWeb(
        selected,
        action,
        note,
      );

      setSelected(
        null,
      );

      setNote('');
      setEvidence([]);

      const [
        nextCounts,
        nextItems,
      ] =
        await Promise.all([
          getAdminReviewQueueCountsWeb(
            access,
          ),

          listAdminReviewQueueWeb(
            queue,
            statusFilter,
            200,
          ),
        ]);

      setCounts(
        nextCounts,
      );

      setItems(
        nextItems,
      );

      setSuccess(
        t.updated,
      );

      window.setTimeout(
        () => {
          setSuccess('');
        },
        3500,
      );
    } catch (
      cause
    ) {
      setError(
        cause instanceof Error
          ? cause.message
          : String(
              cause,
            ),
      );
    } finally {
      setActing(
        false,
      );
    }
  }


  if (
    !loading &&
    access &&
    !access.hasAnyReviewAccess
  ) {
    return (
      <div
        className={
          styles.reviewState
        }
      >
        <strong>
          {
            t.accessDenied
          }
        </strong>

        <span>
          {
            t.accessDeniedDesc
          }
        </span>
      </div>
    );
  }


  if (
    selected
  ) {
    return (
      <ReviewDetail
        item={
          selected
        }
        locale={
          locale
        }
        t={
          t
        }
        access={
          access
        }
        note={
          note
        }
        setNote={
          setNote
        }
        acting={
          acting
        }
        evidence={
          evidence
        }
        evidenceLoading={
          evidenceLoading
        }
        evidenceError={
          evidenceError
        }
        error={
          error
        }
        onBack={() => {
          setSelected(
            null,
          );

          setNote('');
          setError('');
          setEvidence([]);
        }}
        onAction={
          runAction
        }
      />
    );
  }


  return (
    <section
      className={
        styles.reviewWorkspace
      }
    >
      <div
        className={
          styles.reviewTopSearch
        }
      >
        <span>
          ⌕
        </span>

        <input
          value={
            search
          }
          onChange={(
            event,
          ) =>
            setSearch(
              event
                .target
                .value,
            )
          }
          placeholder={
            t.searchPlaceholder
          }
        />

        {search ? (
          <button
            type="button"
            onClick={() =>
              setSearch('')
            }
            aria-label="Clear search"
          >
            ×
          </button>
        ) : null}
      </div>

      <div
        className={
          styles.reviewStats
        }
      >
        <div>
          <span>
            {
              t.pendingTotal
            }
          </span>

          <strong>
            {
              pendingTotal
            }
          </strong>
        </div>

        <div>
          <span>
            {
              t.currentQueue
            }
          </span>

          <strong>
            {
              currentQueueName
            }
          </strong>
        </div>

        <div>
          <span>
            {
              t.visibleResults
            }
          </span>

          <strong>
            {
              filteredItems.length
            }
          </strong>
        </div>
      </div>

      <nav
        className={
          styles.queueTabs
        }
      >
        {allowedQueues.map(
          (entry) => {
            const pendingCount =
              counts[
                entry.key
              ] ?? 0;

            return (
              <button
                key={
                  entry.key
                }
                type="button"
                data-active={
                  entry.key ===
                  queue
                }
                data-has-pending={
                  pendingCount >
                  0
                }
                onClick={() =>
                  void selectQueue(
                    entry.key,
                  )
                }
              >
                <span>
                  {
                    entry.icon
                  }
                </span>

                <strong>
                  {
                    entry.label
                  }
                </strong>

                <b>
                  {
                    pendingCount
                  }
                </b>
              </button>
            );
          },
        )}
      </nav>

      <div
        className={
          styles.reviewToolbar
        }
      >
        <div
          className={
            styles.statusFilter
          }
        >
          <button
            type="button"
            data-active={
              statusFilter ===
              'pending'
            }
            onClick={() =>
              void selectStatus(
                'pending',
              )
            }
          >
            {
              t.pending
            }
          </button>

          <button
            type="button"
            data-active={
              statusFilter ===
              'all'
            }
            onClick={() =>
              void selectStatus(
                'all',
              )
            }
          >
            {
              t.all
            }
          </button>
        </div>

        <button
          type="button"
          className={
            styles.refreshButton
          }
          disabled={
            loading
          }
          onClick={() =>
            void refreshCurrent()
          }
        >
          ↻ {t.refresh}
        </button>
      </div>

      {success ? (
        <div
          className={
            styles.reviewSuccess
          }
        >
          ✓ {success}
        </div>
      ) : null}

      {error ? (
        <div
          className={
            styles.reviewError
          }
        >
          <span>
            {
              error
            }
          </span>

          <button
            type="button"
            onClick={() =>
              void refreshCurrent()
            }
          >
            {
              t.retry
            }
          </button>
        </div>
      ) : null}

      {loading ? (
        <div
          className={
            styles.reviewState
          }
        >
          <span
            className={
              styles.spinner
            }
          />

          <strong>
            {
              t.loading
            }
          </strong>
        </div>
      ) : filteredItems.length ? (
        <div
          className={
            styles.reviewList
          }
        >
          {filteredItems.map(
            (item) => (
              <button
                key={`${item.queueType}-${item.id}`}
                type="button"
                className={
                  styles.reviewRow
                }
                onClick={() => {
                  setSelected(
                    item,
                  );

                  setError('');
                  setSuccess('');
                }}
              >
                <ReviewAvatar
                  item={
                    item
                  }
                />

                <div
                  className={
                    styles.reviewRowCopy
                  }
                >
                  <div
                    className={
                      styles.reviewRowTitle
                    }
                  >
                    <strong>
                      {
                        item.title
                      }
                    </strong>

                    <span>
                      {
                        item.status
                      }
                    </span>
                  </div>

                  <p>
                    {
                      item.subtitle
                    }
                  </p>

                  <small>
                    {item.ownerEmail
                      ? `${item.ownerEmail} · `
                      : ''}

                    {formatDate(
                      item.submittedAt,
                      locale,
                    )}
                  </small>
                </div>

                <div
                  className={
                    styles.reviewRowAction
                  }
                >
                  {
                    t.reviewButton
                  } ›
                </div>
              </button>
            ),
          )}
        </div>
      ) : (
        <div
          className={
            styles.reviewEmpty
          }
        >
          <span>
            ⌕
          </span>

          <strong>
            {search.trim()
              ? t.emptySearch
              : t.empty}
          </strong>
        </div>
      )}
    </section>
  );
}


/* =========================================================
   REVIEW DETAIL
   ========================================================= */

function ReviewDetail({
  item,
  locale,
  t,
  access,
  note,
  setNote,
  acting,
  evidence,
  evidenceLoading,
  evidenceError,
  error,
  onBack,
  onAction,
}: {
  item:
    AdminReviewItemWeb;

  locale:
    string;

  t:
    AdminCopy;

  access:
    AdminReviewAccessWeb |
    null;

  note:
    string;

  setNote:
    (
      value:
        string,
    ) => void;

  acting:
    boolean;

  evidence:
    AdminReviewEvidenceWeb[];

  evidenceLoading:
    boolean;

  evidenceError:
    string;

  error:
    string;

  onBack:
    () => void;

  onAction:
    (
      action:
        AdminReviewAction,
    ) => void;
}) {
  const fields =
    importantFields(
      item.queueType,
    );

  const canAct =
    Boolean(
      access &&
      canActOnAdminReviewQueue(
        access,
        item.queueType,
      ),
    );

  const checklist =
    item.queueType ===
      'business'
      ? businessChecklist(
          item,
        )
      : item.queueType ===
          'payout'
        ? payoutChecklist(
            item,
          )
        : [];


  return (
    <section
      className={
        styles.reviewWorkspace
      }
    >
      <div
        className={
          styles.detailToolbar
        }
      >
        <button
          type="button"
          onClick={
            onBack
          }
        >
          ← {t.backToList}
        </button>

        <span>
          {
            item.queueType
          }
        </span>
      </div>

      <header
        className={
          styles.detailHero
        }
      >
        <div
          className={
            styles.detailIdentity
          }
        >
          <ReviewAvatar
            item={
              item
            }
            large
          />

          <div>
            <small>
              {
                t.detailTitle
              }
            </small>

            <h3>
              {
                item.title
              }
            </h3>

            <p>
              {
                item.subtitle
              }
            </p>
          </div>
        </div>

        <div
          className={
            styles.detailStatus
          }
        >
          <span>
            {
              t.status
            }
          </span>

          <strong>
            {
              item.status
            }
          </strong>
        </div>
      </header>

      <div
        className={
          styles.detailSummary
        }
      >
        <div>
          <span>
            {
              t.submitted
            }
          </span>

          <strong>
            {formatDate(
              item.submittedAt,
              locale,
            )}
          </strong>
        </div>

        <div>
          <span>
            {
              t.email
            }
          </span>

          <strong>
            {
              item.ownerEmail ||
              '—'
            }
          </strong>
        </div>

        <div>
          <span>
            ID
          </span>

          <strong
            className={
              styles.mono
            }
          >
            {
              item.id
            }
          </strong>
        </div>
      </div>

      {checklist.length ? (
        <section
          className={
            styles.reviewCard
          }
        >
          <header
            className={
              styles.reviewSectionHead
            }
          >
            <small>
              REVIEW
            </small>

            <h4>
              {
                t.checklist
              }
            </h4>
          </header>

          <div
            className={
              styles.checklistGrid
            }
          >
            {checklist.map(
              (row) => (
                <div
                  key={
                    row.label
                  }
                  data-ok={
                    row.ok
                  }
                >
                  <b>
                    {row.ok
                      ? '✓'
                      : '!'}
                  </b>

                  <span>
                    {
                      row.label
                    }
                  </span>

                  <strong>
                    {row.ok
                      ? t.complete
                      : t.shouldCheck}
                  </strong>
                </div>
              ),
            )}
          </div>
        </section>
      ) : null}

      <section
        className={
          styles.reviewCard
        }
      >
        <header
          className={
            styles.reviewSectionHead
          }
        >
          <small>
            DATA
          </small>

          <h4>
            {
              t.importantData
            }
          </h4>
        </header>

        <div
          className={
            styles.dataGrid
          }
        >
          {fields.map(
            (key) => (
              <div
                className={
                  styles.dataField
                }
                key={
                  key
                }
              >
                <span>
                  {fieldLabel(
                    key,
                    locale,
                  )}
                </span>

                <strong>
                  {valueText(
                    item.details[
                      key
                    ],
                    locale,
                  )}
                </strong>
              </div>
            ),
          )}
        </div>
      </section>

      <section
        className={
          styles.reviewCard
        }
      >
        <header
          className={
            styles.reviewSectionHead
          }
        >
          <small>
            PRIVATE
          </small>

          <h4>
            {
              t.evidence
            }
          </h4>

          <p>
            {
              t.evidencePrivate
            }
          </p>
        </header>

        {evidenceLoading ? (
          <div
            className={
              styles.evidenceState
            }
          >
            <span
              className={
                styles.spinner
              }
            />

            {
              t.evidenceLoading
            }
          </div>
        ) : evidenceError ? (
          <div
            className={
              styles.evidenceError
            }
          >
            {
              evidenceError
            }
          </div>
        ) : evidence.length ? (
          <div
            className={
              styles.evidenceGrid
            }
          >
            {evidence.map(
              (file) => (
                <a
                  key={
                    file.id
                  }
                  href={
                    file.signedUrl
                  }
                  target="_blank"
                  rel="noreferrer"
                  className={
                    styles.evidenceItem
                  }
                >
                  {file.image ? (
                    <img
                      src={
                        file.signedUrl
                      }
                      alt=""
                    />
                  ) : (
                    <div
                      className={
                        styles.fileIcon
                      }
                    >
                      ▤
                    </div>
                  )}

                  <div>
                    <strong>
                      {
                        file.label
                      }
                    </strong>

                    <small>
                      {
                        t.openFile
                      } ↗
                    </small>
                  </div>
                </a>
              ),
            )}
          </div>
        ) : (
          <div
            className={
              styles.evidenceState
            }
          >
            {
              t.noEvidence
            }
          </div>
        )}
      </section>

      {canAct ? (
        <section
          className={
            styles.reviewCard
          }
        >
          <label
            className={
              styles.noteLabel
            }
          >
            {
              t.adminNote
            }
          </label>

          <textarea
            className={
              styles.adminNote
            }
            value={
              note
            }
            onChange={(
              event,
            ) =>
              setNote(
                event
                  .target
                  .value,
              )
            }
            placeholder={
              t.adminNotePlaceholder
            }
            rows={
              4
            }
          />

          <div
            className={
              styles.actionGrid
            }
          >
            {adminReviewActionsFor(
              item.queueType,
            ).map(
              (action) => {
                const kind =
                  action ===
                    'approve' ||
                  action ===
                    'resolve' ||
                  action ===
                    'acknowledge'
                    ? 'positive'
                    : action ===
                        'reject' ||
                      action ===
                        'deactivate' ||
                      action ===
                        'cancel_deletion'
                      ? 'danger'
                      : action ===
                          'request_info' ||
                        action ===
                          'warn' ||
                        action ===
                          'suspend' ||
                        action ===
                          'suspend_24h' ||
                        action ===
                          'suspend_7d'
                        ? 'warning'
                        : 'neutral';

                return (
                  <button
                    key={
                      action
                    }
                    type="button"
                    data-kind={
                      kind
                    }
                    disabled={
                      acting
                    }
                    onClick={() =>
                      onAction(
                        action,
                      )
                    }
                  >
                    {acting
                      ? '…'
                      : actionLabel(
                          action,
                          t,
                        )}
                  </button>
                );
              },
            )}
          </div>
        </section>
      ) : (
        <div
          className={
            styles.readOnly
          }
        >
          {
            t.readOnly
          }
        </div>
      )}

      {error ? (
        <div
          className={
            styles.reviewInlineError
          }
        >
          {
            error
          }
        </div>
      ) : null}
    </section>
  );
}


/* =========================================================
   BUSINESS AVATAR
   Business uses Business logo only.
   Never fall back to owner's user profile photo.
   ========================================================= */

const businessAvatarCache =
  new Map<
    string,
    string
  >();


function ReviewAvatar({
  item,
  large = false,
}: {
  item:
    AdminReviewItemWeb;

  large?:
    boolean;
}) {
  const isBusiness =
    item.queueType ===
    'business';

  const [
    resolvedUrl,
    setResolvedUrl,
  ] =
    useState(
      isBusiness
        ? (
            businessAvatarCache.get(
              item.id,
            ) ??
            ''
          )
        : item.profilePhotoUrl,
    );


  useEffect(
    () => {
      let active =
        true;

      if (
        !isBusiness
      ) {
        setResolvedUrl(
          item.profilePhotoUrl,
        );

        return () => {
          active =
            false;
        };
      }

      const cached =
        businessAvatarCache.get(
          item.id,
        );

      if (
        cached
      ) {
        setResolvedUrl(
          cached,
        );

        return () => {
          active =
            false;
        };
      }

      /*
       * Business intentionally starts empty.
       * Do not use item.profilePhotoUrl because it may be
       * the owner's personal profile photo.
       */
      setResolvedUrl('');

      void loadAdminReviewEvidenceWeb(
        item,
      )
        .then(
          (files) => {
            if (
              !active
            ) {
              return;
            }

            const businessLogo =
              files.find(
                (file) =>
                  file.id ===
                  'logo',
              ) ??
              files.find(
                (file) =>
                  file.label
                    .toLowerCase()
                    .includes(
                      'business profile',
                    ),
              );

            if (
              businessLogo?.signedUrl
            ) {
              businessAvatarCache.set(
                item.id,
                businessLogo.signedUrl,
              );

              setResolvedUrl(
                businessLogo.signedUrl,
              );
            }
          },
        )
        .catch(
          () => {
            if (
              active
            ) {
              setResolvedUrl('');
            }
          },
        );

      return () => {
        active =
          false;
      };
    },
    [
      isBusiness,
      item.id,
      item.profilePhotoUrl,
    ],
  );


  if (
    resolvedUrl
  ) {
    return (
      <img
        src={
          resolvedUrl
        }
        alt=""
        className={
          large
            ? styles.reviewAvatarLarge
            : styles.reviewAvatar
        }
      />
    );
  }

  return (
    <div
      className={
        large
          ? styles.reviewAvatarFallbackLarge
          : styles.reviewAvatarFallback
      }
    >
      {item.title
        .trim()
        .slice(
          0,
          1,
        )
        .toUpperCase() ||
        'M'}
    </div>
  );
}

