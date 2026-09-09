'use client';

import Link from 'next/link';
import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import { Header } from '@/components/Header';
import { useLocale } from '@/components/SiteProviders';

import {
  cancelAccountDeletionWeb,
  clearPrelaunchTestDataWeb,
  exportMyMeloDataWeb,
  getPrivacyStatusWeb,
  listAdminQuestsWeb,
  listAdminRewardsWeb,
  loadAdminReviewHomeWeb,
  loadAdminReviewQueueCountsWeb,
  loadBlockedUsersWeb,
  loadPackageCatalog,
  loadPrelaunchCountsWeb,
  loadProductionHealthWeb,
  loadQuestRewardAdminStatsWeb,
  scheduleAccountDeletionWeb,
  setAdminQuestActiveWeb,
  setAdminRewardActiveWeb,
  unblockUserWeb,
  type AdminQuestRowWeb,
  type AdminRewardRowWeb,
  type BlockedUserWeb,
  type PackageProduct,
  type PrelaunchCountsWeb,
  type PrivacyStatusWeb,
  type QuestRewardAdminStatsWeb,
} from './settingsWebData';

import styles from './SettingsUtilityExperience.module.css';

export type SettingsUtilityMode =
  | 'premium'
  | 'privacy'
  | 'blocked'
  | 'support'
  | 'diagnostics'
  | 'cleanup'
  | 'quest-admin'
  | 'review-admin';

type LocaleKey =
  | 'th'
  | 'en'
  | 'de'
  | 'zh'
  | 'ja'
  | 'ko';

type Dict = {
  back: string;
  loading: string;
  retry: string;
  empty: string;
  active: string;
  inactive: string;
  unblock: string;
  export: string;
  delete: string;
  cancelDelete: string;
  deleteHint: string;
  reason: string;
  confirm: string;
  supportBody: string;
  email: string;
  refresh: string;
  total: string;
  pending: string;
  manage: string;
  mobilePurchase: string;
};

type UtilityCopy = {
  blockedIntro: string;
  blockedSearch: string;
  blockedCount: string;
  blockedEmpty: string;
  blockedEmptySearch: string;
  blockedSince: string;
  blockedReason: string;
  unblockConfirmTitle: string;
  unblockConfirmBody: string;
  unblockBusy: string;

  privacyIntro: string;

  exportTitle: string;
  exportBody: string;
  exportIncludes: string;
  exportProfile: string;
  exportAccount: string;
  exportActivity: string;
  exportPrivacy: string;
  exportBusy: string;

  accountManagement: string;
  accountManagementBody: string;

  deleteTitle: string;
  deleteBody: string;
  deleteWarningTitle: string;
  deleteWarningBody: string;
  deleteConfirmLabel: string;
  deleteReasonLabel: string;
  deleteBusy: string;

  deletionStatus: string;
  statusPending: string;
  statusProcessing: string;
  statusFailed: string;
  statusCancelled: string;
  statusCompleted: string;
  statusNone: string;

  requestedAt: string;
  scheduledFor: string;
  failureReason: string;
  cancelBusy: string;

  supportIntro: string;
  contactTitle: string;
  contactBody: string;
  supportEmail: string;
  sendEmail: string;
  copyEmail: string;
  copied: string;

  includeTitle: string;
  includePage: string;
  includeSteps: string;
  includeScreenshot: string;
  includeTime: string;

  quickTitle: string;
  quickRefresh: string;
  quickSignin: string;
  quickPermission: string;
  quickBrowser: string;

  safetyTitle: string;
  safetyBody: string;
  safetyButton: string;
  settingsButton: string;
};

const DICT: Record<LocaleKey, Dict> = {
  th: {
    back: 'กลับไปตั้งค่า',
    loading: 'กำลังโหลด...',
    retry: 'ลองอีกครั้ง',
    empty: 'ยังไม่มีข้อมูล',
    active: 'เปิดใช้งาน',
    inactive: 'ปิดใช้งาน',
    unblock: 'ยกเลิกการบล็อก',
    export: 'ดาวน์โหลดข้อมูลของฉัน',
    delete: 'ขอลบบัญชี',
    cancelDelete: 'ยกเลิกคำขอลบบัญชี',
    deleteHint:
      'พิมพ์ DELETE และระบุเหตุผลเพื่อกำหนดลบบัญชีตามระบบ 7 วัน',
    reason: 'เหตุผล',
    confirm: 'ยืนยัน',
    supportBody:
      'หากพบปัญหาการใช้งาน ให้ส่งรายละเอียด หน้าที่เกิดปัญหา และภาพหน้าจอให้ทีม Melo Chat',
    email: 'อีเมลสนับสนุน',
    refresh: 'รีเฟรช',
    total: 'ทั้งหมด',
    pending: 'รอดำเนินการ',
    manage: 'จัดการ',
    mobilePurchase:
      'การชำระเงินแพ็กเกจใช้ระบบ Store ของแอป Android/iOS ตามระบบปัจจุบัน',
  },

  en: {
    back: 'Back to settings',
    loading: 'Loading...',
    retry: 'Try again',
    empty: 'No data yet',
    active: 'Active',
    inactive: 'Inactive',
    unblock: 'Unblock',
    export: 'Download my data',
    delete: 'Request account deletion',
    cancelDelete: 'Cancel deletion request',
    deleteHint:
      'Type DELETE and provide a reason to schedule deletion using the 7-day account deletion flow.',
    reason: 'Reason',
    confirm: 'Confirm',
    supportBody:
      'If something is not working, send the page name, what happened, and a screenshot to the Melo Chat team.',
    email: 'Support email',
    refresh: 'Refresh',
    total: 'Total',
    pending: 'Pending',
    manage: 'Manage',
    mobilePurchase:
      'Package payments currently use the Android/iOS app store purchase flow.',
  },

  de: {
    back: 'Zurück zu Einstellungen',
    loading: 'Wird geladen...',
    retry: 'Erneut versuchen',
    empty: 'Noch keine Daten',
    active: 'Aktiv',
    inactive: 'Inaktiv',
    unblock: 'Blockierung aufheben',
    export: 'Meine Daten herunterladen',
    delete: 'Kontolöschung anfordern',
    cancelDelete: 'Löschanfrage abbrechen',
    deleteHint:
      'DELETE eingeben und einen Grund angeben. Die Kontolöschung nutzt den 7-Tage-Ablauf.',
    reason: 'Grund',
    confirm: 'Bestätigen',
    supportBody:
      'Bei Problemen bitte Seite, Verhalten und Screenshot an das Melo-Chat-Team senden.',
    email: 'Support-E-Mail',
    refresh: 'Aktualisieren',
    total: 'Gesamt',
    pending: 'Ausstehend',
    manage: 'Verwalten',
    mobilePurchase:
      'Paketkäufe laufen aktuell über die Android/iOS-App-Stores.',
  },

  zh: {
    back: '返回设置',
    loading: '加载中...',
    retry: '重试',
    empty: '暂无数据',
    active: '已启用',
    inactive: '已停用',
    unblock: '取消屏蔽',
    export: '下载我的数据',
    delete: '申请删除账户',
    cancelDelete: '取消删除申请',
    deleteHint:
      '输入 DELETE 并填写原因，将按 7 天账户删除流程处理。',
    reason: '原因',
    confirm: '确认',
    supportBody:
      '如遇问题，请将页面名称、问题描述和截图发送给 Melo Chat 团队。',
    email: '支持邮箱',
    refresh: '刷新',
    total: '总计',
    pending: '待处理',
    manage: '管理',
    mobilePurchase:
      '套餐支付目前使用 Android/iOS 应用商店购买流程。',
  },

  ja: {
    back: '設定へ戻る',
    loading: '読み込み中...',
    retry: '再試行',
    empty: 'データはまだありません',
    active: '有効',
    inactive: '無効',
    unblock: 'ブロック解除',
    export: '自分のデータをダウンロード',
    delete: 'アカウント削除を申請',
    cancelDelete: '削除申請をキャンセル',
    deleteHint:
      'DELETE と理由を入力すると、7日間の削除フローで処理されます。',
    reason: '理由',
    confirm: '確認',
    supportBody:
      '問題がある場合は、ページ名・状況・スクリーンショットをMelo Chatチームへ送ってください。',
    email: 'サポートメール',
    refresh: '更新',
    total: '合計',
    pending: '保留中',
    manage: '管理',
    mobilePurchase:
      'パッケージの支払いは現在 Android/iOS のストア購入フローを利用します。',
  },

  ko: {
    back: '설정으로 돌아가기',
    loading: '불러오는 중...',
    retry: '다시 시도',
    empty: '데이터가 없습니다',
    active: '사용 중',
    inactive: '사용 안 함',
    unblock: '차단 해제',
    export: '내 데이터 다운로드',
    delete: '계정 삭제 요청',
    cancelDelete: '삭제 요청 취소',
    deleteHint:
      'DELETE와 이유를 입력하면 7일 계정 삭제 절차로 진행됩니다.',
    reason: '이유',
    confirm: '확인',
    supportBody:
      '문제가 있다면 페이지 이름, 발생 내용, 스크린샷을 Melo Chat 팀에 보내주세요.',
    email: '지원 이메일',
    refresh: '새로고침',
    total: '전체',
    pending: '대기 중',
    manage: '관리',
    mobilePurchase:
      '패키지 결제는 현재 Android/iOS 앱 스토어 구매 절차를 사용합니다.',
  },
};

const UTILITY_COPY: Record<LocaleKey, UtilityCopy> = {
  th: {
    blockedIntro:
      'จัดการสมาชิกที่คุณบล็อกไว้จากที่เดียว สมาชิกที่ถูกบล็อกจะไม่สามารถจับคู่หรือส่งข้อความหาคุณได้',
    blockedSearch: 'ค้นหาชื่อผู้ใช้ที่บล็อก...',
    blockedCount: 'ผู้ใช้ที่บล็อก',
    blockedEmpty: 'ตอนนี้คุณยังไม่ได้บล็อกผู้ใช้คนใด',
    blockedEmptySearch: 'ไม่พบผู้ใช้ที่ตรงกับการค้นหา',
    blockedSince: 'บล็อกเมื่อ',
    blockedReason: 'เหตุผล',
    unblockConfirmTitle: 'ยกเลิกการบล็อกผู้ใช้นี้?',
    unblockConfirmBody:
      'หลังยกเลิกการบล็อก ผู้ใช้รายนี้อาจกลับมาปรากฏในพื้นที่ค้นพบ และสามารถเชื่อมต่อกับคุณได้อีกตามเงื่อนไขของ Melo',
    unblockBusy: 'กำลังยกเลิกบล็อก...',

    privacyIntro:
      'จัดการข้อมูลส่วนบุคคล ดาวน์โหลดสำเนาข้อมูล และควบคุมการลบบัญชี Melo ของคุณ',

    exportTitle: 'ดาวน์โหลดสำเนาข้อมูลของคุณ',
    exportBody:
      'ขอสำเนาข้อมูลที่เชื่อมโยงกับบัญชี Melo ของคุณในรูปแบบ JSON เพื่อเก็บไว้ใช้อ้างอิงส่วนตัว',
    exportIncludes: 'ข้อมูลที่อาจรวมอยู่ในไฟล์',
    exportProfile: 'ข้อมูลโปรไฟล์และการตั้งค่าบัญชี',
    exportAccount: 'ข้อมูลบัญชีและสถานะการใช้งาน',
    exportActivity: 'ข้อมูลกิจกรรมที่เกี่ยวข้องกับบัญชีของคุณ',
    exportPrivacy: 'ข้อมูลการตั้งค่าความเป็นส่วนตัวที่ระบบรองรับ',
    exportBusy: 'กำลังเตรียมข้อมูล...',

    accountManagement: 'การจัดการบัญชี',
    accountManagementBody:
      'คุณสามารถขอลบบัญชีได้จากเว็บไซต์ โดยระบบจะใช้ขั้นตอนลบบัญชีแบบเดียวกับ Melo',

    deleteTitle: 'ลบบัญชี Melo',
    deleteBody:
      'เมื่อส่งคำขอลบ ระบบจะกำหนดช่วงเวลารอ 7 วัน ก่อนดำเนินการลบบัญชีตามขั้นตอนของ Melo',
    deleteWarningTitle: 'การลบบัญชีเป็นการดำเนินการที่สำคัญ',
    deleteWarningBody:
      'หลังพ้นช่วงเวลาที่กำหนด ข้อมูลและการเข้าถึงที่เกี่ยวข้องกับบัญชีอาจไม่สามารถกู้คืนได้',
    deleteConfirmLabel:
      'พิมพ์ DELETE ในช่องด้านล่างเพื่อยืนยัน',
    deleteReasonLabel: 'ระบุเหตุผลที่ต้องการลบบัญชี',
    deleteBusy: 'กำลังส่งคำขอ...',

    deletionStatus: 'สถานะคำขอลบบัญชี',
    statusPending: 'รอดำเนินการ',
    statusProcessing: 'กำลังดำเนินการ',
    statusFailed: 'ดำเนินการไม่สำเร็จ',
    statusCancelled: 'ยกเลิกแล้ว',
    statusCompleted: 'ดำเนินการแล้ว',
    statusNone: 'ไม่มีคำขอลบบัญชี',

    requestedAt: 'ส่งคำขอเมื่อ',
    scheduledFor: 'กำหนดดำเนินการ',
    failureReason: 'รายละเอียดปัญหา',
    cancelBusy: 'กำลังยกเลิก...',

    supportIntro:
      'ศูนย์ช่วยเหลือสำหรับการใช้งาน Melo บนเว็บ หากพบปัญหา คุณสามารถติดต่อทีมสนับสนุนและตรวจสอบวิธีแก้เบื้องต้นได้จากหน้านี้',
    contactTitle: 'ติดต่อทีม Melo Support',
    contactBody:
      'หากพบข้อผิดพลาดหรือไม่สามารถใช้งานบางฟังก์ชันได้ กรุณาส่งรายละเอียดให้ทีมงานเพื่อช่วยตรวจสอบ',
    supportEmail: 'อีเมลฝ่ายสนับสนุน',
    sendEmail: 'ส่งอีเมล',
    copyEmail: 'คัดลอกอีเมล',
    copied: 'คัดลอกแล้ว',

    includeTitle: 'ข้อมูลที่ควรแนบเมื่อแจ้งปัญหา',
    includePage: 'ชื่อหน้าหรือลิงก์หน้าที่เกิดปัญหา',
    includeSteps: 'อธิบายสิ่งที่ทำก่อนเกิดปัญหา',
    includeScreenshot: 'ภาพหน้าจอของปัญหา หากมี',
    includeTime: 'เวลาประมาณที่เกิดปัญหา',

    quickTitle: 'ลองตรวจสอบเบื้องต้น',
    quickRefresh:
      'รีเฟรชหน้าเว็บหนึ่งครั้ง แล้วลองทำรายการใหม่',
    quickSignin:
      'หากข้อมูลไม่อัปเดต ลองออกจากระบบแล้วเข้าสู่ระบบอีกครั้ง',
    quickPermission:
      'ฟังก์ชันตำแหน่งและการแจ้งเตือนอาจต้องอนุญาต Permission ในเบราว์เซอร์',
    quickBrowser:
      'แนะนำให้ใช้เบราว์เซอร์เวอร์ชันล่าสุดเพื่อการทำงานที่สมบูรณ์',

    safetyTitle: 'เรื่องความปลอดภัย',
    safetyBody:
      'หากเป็นเรื่อง Live Location, Safety Check-in, คนที่ไว้ใจ หรือ SOS สามารถเปิด Safety Center ได้โดยตรง',
    safetyButton: 'เปิด Safety Center',
    settingsButton: 'กลับไปหน้า Settings',
  },

  en: {
    blockedIntro:
      'Manage people you have blocked in one place. Blocked users cannot match or message you while the block is active.',
    blockedSearch: 'Search blocked users...',
    blockedCount: 'Blocked users',
    blockedEmpty: 'You have not blocked anyone yet.',
    blockedEmptySearch: 'No blocked users match your search.',
    blockedSince: 'Blocked',
    blockedReason: 'Reason',
    unblockConfirmTitle: 'Unblock this user?',
    unblockConfirmBody:
      'After unblocking, this person may appear in discovery again and may be able to connect with you according to Melo matching rules.',
    unblockBusy: 'Unblocking...',

    privacyIntro:
      'Manage your personal data, download a copy of your information, and control deletion of your Melo account.',

    exportTitle: 'Download a copy of your data',
    exportBody:
      'Request a JSON copy of information associated with your Melo account for your personal records.',
    exportIncludes: 'The export may include',
    exportProfile: 'Profile information and account preferences',
    exportAccount: 'Account information and service status',
    exportActivity: 'Activity associated with your account',
    exportPrivacy: 'Supported privacy settings',
    exportBusy: 'Preparing data...',

    accountManagement: 'Account management',
    accountManagementBody:
      'You can request account deletion from the web using the same Melo deletion flow.',

    deleteTitle: 'Delete your Melo account',
    deleteBody:
      'After you submit the request, Melo uses a 7-day waiting period before the account deletion process continues.',
    deleteWarningTitle: 'Account deletion is an important action',
    deleteWarningBody:
      'After the scheduled period, account-related data and access may no longer be recoverable.',
    deleteConfirmLabel:
      'Type DELETE in the field below to confirm',
    deleteReasonLabel:
      'Tell us why you want to delete your account',
    deleteBusy: 'Submitting request...',

    deletionStatus: 'Account deletion status',
    statusPending: 'Pending',
    statusProcessing: 'Processing',
    statusFailed: 'Failed',
    statusCancelled: 'Cancelled',
    statusCompleted: 'Completed',
    statusNone: 'No deletion request',

    requestedAt: 'Requested',
    scheduledFor: 'Scheduled for',
    failureReason: 'Problem details',
    cancelBusy: 'Cancelling...',

    supportIntro:
      'Help for using Melo on the web. Contact support or try common troubleshooting steps from this page.',
    contactTitle: 'Contact Melo Support',
    contactBody:
      'If something is not working or a feature cannot be used, send the details to our support team so we can investigate.',
    supportEmail: 'Support email',
    sendEmail: 'Send email',
    copyEmail: 'Copy email',
    copied: 'Copied',

    includeTitle: 'What to include in your report',
    includePage: 'The page name or URL where the problem happened',
    includeSteps: 'What you were doing before the problem occurred',
    includeScreenshot: 'A screenshot of the problem, if available',
    includeTime: 'The approximate time the problem occurred',

    quickTitle: 'Quick checks',
    quickRefresh:
      'Refresh the web page once and try the action again.',
    quickSignin:
      'If information does not update, try signing out and signing back in.',
    quickPermission:
      'Location and notification features may require browser permissions.',
    quickBrowser:
      'Use the latest version of your browser for the best compatibility.',

    safetyTitle: 'Safety-related help',
    safetyBody:
      'For Live Location, Safety Check-in, trusted contacts, or SOS, you can open Safety Center directly.',
    safetyButton: 'Open Safety Center',
    settingsButton: 'Back to Settings',
  },

  de: {
    blockedIntro:
      'Verwalte blockierte Personen an einem Ort. Blockierte Nutzer können dich während der Blockierung nicht matchen oder anschreiben.',
    blockedSearch: 'Blockierte Nutzer suchen...',
    blockedCount: 'Blockierte Nutzer',
    blockedEmpty: 'Du hast derzeit niemanden blockiert.',
    blockedEmptySearch:
      'Keine blockierten Nutzer entsprechen der Suche.',
    blockedSince: 'Blockiert',
    blockedReason: 'Grund',
    unblockConfirmTitle: 'Blockierung aufheben?',
    unblockConfirmBody:
      'Nach dem Aufheben kann diese Person wieder in Discovery erscheinen und dich gemäß den Melo-Regeln erneut kontaktieren.',
    unblockBusy: 'Wird aufgehoben...',

    privacyIntro:
      'Verwalte persönliche Daten, lade eine Kopie deiner Informationen herunter und steuere die Löschung deines Melo-Kontos.',

    exportTitle: 'Kopie deiner Daten herunterladen',
    exportBody:
      'Fordere eine JSON-Kopie der mit deinem Melo-Konto verbundenen Informationen für deine Unterlagen an.',
    exportIncludes: 'Der Export kann enthalten',
    exportProfile: 'Profilinformationen und Kontoeinstellungen',
    exportAccount: 'Kontoinformationen und Servicestatus',
    exportActivity: 'Mit deinem Konto verbundene Aktivitäten',
    exportPrivacy: 'Unterstützte Datenschutzeinstellungen',
    exportBusy: 'Daten werden vorbereitet...',

    accountManagement: 'Kontoverwaltung',
    accountManagementBody:
      'Du kannst die Kontolöschung im Web über denselben Melo-Löschprozess anfordern.',

    deleteTitle: 'Melo-Konto löschen',
    deleteBody:
      'Nach der Anfrage gilt eine Wartezeit von 7 Tagen, bevor der Löschprozess fortgesetzt wird.',
    deleteWarningTitle: 'Die Kontolöschung ist ein wichtiger Vorgang',
    deleteWarningBody:
      'Nach Ablauf des geplanten Zeitraums können Kontodaten und Zugriff möglicherweise nicht wiederhergestellt werden.',
    deleteConfirmLabel:
      'Gib DELETE in das Feld unten ein, um zu bestätigen',
    deleteReasonLabel:
      'Warum möchtest du dein Konto löschen?',
    deleteBusy: 'Anfrage wird gesendet...',

    deletionStatus: 'Status der Kontolöschung',
    statusPending: 'Ausstehend',
    statusProcessing: 'In Bearbeitung',
    statusFailed: 'Fehlgeschlagen',
    statusCancelled: 'Abgebrochen',
    statusCompleted: 'Abgeschlossen',
    statusNone: 'Keine Löschanfrage',

    requestedAt: 'Angefordert',
    scheduledFor: 'Geplant für',
    failureReason: 'Problemdetails',
    cancelBusy: 'Wird abgebrochen...',

    supportIntro:
      'Hilfe zur Nutzung von Melo im Web. Kontaktiere den Support oder probiere häufige Lösungsschritte.',
    contactTitle: 'Melo Support kontaktieren',
    contactBody:
      'Wenn etwas nicht funktioniert, sende die Details an unser Support-Team, damit wir das Problem prüfen können.',
    supportEmail: 'Support-E-Mail',
    sendEmail: 'E-Mail senden',
    copyEmail: 'E-Mail kopieren',
    copied: 'Kopiert',

    includeTitle: 'Diese Informationen helfen uns',
    includePage: 'Name oder URL der betroffenen Seite',
    includeSteps: 'Was du vor dem Problem gemacht hast',
    includeScreenshot: 'Screenshot des Problems, falls vorhanden',
    includeTime: 'Ungefähre Uhrzeit des Problems',

    quickTitle: 'Schnelle Überprüfung',
    quickRefresh:
      'Lade die Webseite neu und versuche die Aktion erneut.',
    quickSignin:
      'Wenn Daten nicht aktualisiert werden, melde dich ab und wieder an.',
    quickPermission:
      'Standort und Benachrichtigungen benötigen möglicherweise Browser-Berechtigungen.',
    quickBrowser:
      'Nutze für beste Kompatibilität eine aktuelle Browser-Version.',

    safetyTitle: 'Hilfe zur Sicherheit',
    safetyBody:
      'Für Live Location, Safety Check-in, Vertrauenskontakte oder SOS kannst du direkt das Safety Center öffnen.',
    safetyButton: 'Safety Center öffnen',
    settingsButton: 'Zurück zu Einstellungen',
  },

  zh: {
    blockedIntro:
      '在这里统一管理你已屏蔽的用户。屏蔽期间，对方无法与你匹配或向你发送消息。',
    blockedSearch: '搜索已屏蔽用户...',
    blockedCount: '已屏蔽用户',
    blockedEmpty: '你目前没有屏蔽任何用户。',
    blockedEmptySearch: '未找到符合搜索条件的已屏蔽用户。',
    blockedSince: '屏蔽时间',
    blockedReason: '原因',
    unblockConfirmTitle: '取消屏蔽此用户？',
    unblockConfirmBody:
      '取消屏蔽后，此用户可能重新出现在发现页面，并可根据 Melo 的匹配规则再次与你建立连接。',
    unblockBusy: '正在取消屏蔽...',

    privacyIntro:
      '管理个人数据、下载信息副本，以及控制你的 Melo 账户删除请求。',

    exportTitle: '下载你的数据副本',
    exportBody:
      '以 JSON 格式获取与你的 Melo 账户相关的信息副本，方便个人保存。',
    exportIncludes: '导出文件可能包含',
    exportProfile: '个人资料和账户设置',
    exportAccount: '账户信息和服务状态',
    exportActivity: '与你账户相关的活动信息',
    exportPrivacy: '系统支持的隐私设置',
    exportBusy: '正在准备数据...',

    accountManagement: '账户管理',
    accountManagementBody:
      '你可以直接通过网页版使用与 Melo 相同的流程申请删除账户。',

    deleteTitle: '删除 Melo 账户',
    deleteBody:
      '提交删除请求后，Melo 会进入 7 天等待期，然后继续账户删除流程。',
    deleteWarningTitle: '删除账户是一项重要操作',
    deleteWarningBody:
      '超过计划时间后，与账户相关的数据和访问权限可能无法恢复。',
    deleteConfirmLabel: '在下方输入 DELETE 以确认',
    deleteReasonLabel: '请说明删除账户的原因',
    deleteBusy: '正在提交请求...',

    deletionStatus: '账户删除状态',
    statusPending: '待处理',
    statusProcessing: '处理中',
    statusFailed: '失败',
    statusCancelled: '已取消',
    statusCompleted: '已完成',
    statusNone: '没有删除请求',

    requestedAt: '申请时间',
    scheduledFor: '计划执行时间',
    failureReason: '问题详情',
    cancelBusy: '正在取消...',

    supportIntro:
      'Melo 网页版帮助中心。你可以联系支持团队，或先尝试常见的问题排查方法。',
    contactTitle: '联系 Melo 支持团队',
    contactBody:
      '如果功能无法使用或出现错误，请将相关详情发送给支持团队以便排查。',
    supportEmail: '支持邮箱',
    sendEmail: '发送邮件',
    copyEmail: '复制邮箱',
    copied: '已复制',

    includeTitle: '报告问题时建议提供',
    includePage: '出现问题的页面名称或网址',
    includeSteps: '问题出现前你进行了哪些操作',
    includeScreenshot: '问题截图（如有）',
    includeTime: '问题发生的大致时间',

    quickTitle: '快速排查',
    quickRefresh: '刷新网页后重新尝试操作。',
    quickSignin: '如果数据没有更新，请尝试退出并重新登录。',
    quickPermission:
      '定位和通知功能可能需要浏览器权限。',
    quickBrowser:
      '建议使用最新版本的浏览器以获得最佳兼容性。',

    safetyTitle: '安全相关帮助',
    safetyBody:
      '关于 Live Location、安全签到、可信联系人或 SOS，可直接打开 Safety Center。',
    safetyButton: '打开 Safety Center',
    settingsButton: '返回设置',
  },

  ja: {
    blockedIntro:
      'ブロックしたユーザーをまとめて管理できます。ブロック中は相手からマッチやメッセージを送ることができません。',
    blockedSearch: 'ブロックしたユーザーを検索...',
    blockedCount: 'ブロック中',
    blockedEmpty: '現在ブロックしているユーザーはいません。',
    blockedEmptySearch:
      '検索条件に一致するユーザーはいません。',
    blockedSince: 'ブロック日時',
    blockedReason: '理由',
    unblockConfirmTitle: 'このユーザーのブロックを解除しますか？',
    unblockConfirmBody:
      '解除すると、このユーザーが再びDiscoveryに表示され、Meloの条件に基づいて再度つながることができる場合があります。',
    unblockBusy: '解除中...',

    privacyIntro:
      '個人データの管理、情報コピーのダウンロード、Meloアカウント削除を管理できます。',

    exportTitle: 'データのコピーをダウンロード',
    exportBody:
      'Meloアカウントに関連する情報をJSON形式で取得して保存できます。',
    exportIncludes: 'エクスポートに含まれる可能性がある情報',
    exportProfile: 'プロフィール情報とアカウント設定',
    exportAccount: 'アカウント情報とサービス状態',
    exportActivity: 'アカウントに関連するアクティビティ',
    exportPrivacy: '対応しているプライバシー設定',
    exportBusy: 'データを準備中...',

    accountManagement: 'アカウント管理',
    accountManagementBody:
      'WebからもMeloと同じフローでアカウント削除を申請できます。',

    deleteTitle: 'Meloアカウントを削除',
    deleteBody:
      '申請後、7日間の待機期間を経てアカウント削除処理が進みます。',
    deleteWarningTitle: 'アカウント削除は重要な操作です',
    deleteWarningBody:
      '予定期間を過ぎると、アカウント関連データやアクセスを復元できない場合があります。',
    deleteConfirmLabel:
      '確認のため下の欄に DELETE と入力してください',
    deleteReasonLabel: 'アカウントを削除する理由',
    deleteBusy: '申請中...',

    deletionStatus: 'アカウント削除状況',
    statusPending: '保留中',
    statusProcessing: '処理中',
    statusFailed: '失敗',
    statusCancelled: 'キャンセル済み',
    statusCompleted: '完了',
    statusNone: '削除申請なし',

    requestedAt: '申請日時',
    scheduledFor: '削除予定',
    failureReason: 'エラー詳細',
    cancelBusy: 'キャンセル中...',

    supportIntro:
      'Melo Web版のヘルプセンターです。サポートへの問い合わせや基本的なトラブルシューティングを確認できます。',
    contactTitle: 'Melo Supportへ連絡',
    contactBody:
      '機能が利用できない場合やエラーがある場合は、詳細をサポートチームへ送信してください。',
    supportEmail: 'サポートメール',
    sendEmail: 'メールを送る',
    copyEmail: 'メールをコピー',
    copied: 'コピーしました',

    includeTitle: '問い合わせに含める情報',
    includePage: '問題が発生したページ名またはURL',
    includeSteps: '問題発生前に行った操作',
    includeScreenshot: '問題のスクリーンショット（ある場合）',
    includeTime: '問題が発生したおおよその時間',

    quickTitle: 'まず確認すること',
    quickRefresh:
      'ページを再読み込みして、もう一度操作してください。',
    quickSignin:
      '情報が更新されない場合は、一度ログアウトして再ログインしてください。',
    quickPermission:
      '位置情報や通知にはブラウザの権限が必要な場合があります。',
    quickBrowser:
      '最新バージョンのブラウザを使用することをおすすめします。',

    safetyTitle: '安全に関するサポート',
    safetyBody:
      'Live Location、安全チェックイン、信頼できる連絡先、SOSについてはSafety Centerを直接開けます。',
    safetyButton: 'Safety Centerを開く',
    settingsButton: '設定へ戻る',
  },

  ko: {
    blockedIntro:
      '차단한 사용자를 한 곳에서 관리할 수 있습니다. 차단 중에는 상대방이 매칭하거나 메시지를 보낼 수 없습니다.',
    blockedSearch: '차단한 사용자 검색...',
    blockedCount: '차단한 사용자',
    blockedEmpty: '현재 차단한 사용자가 없습니다.',
    blockedEmptySearch:
      '검색 조건에 맞는 차단 사용자가 없습니다.',
    blockedSince: '차단한 날짜',
    blockedReason: '이유',
    unblockConfirmTitle: '이 사용자의 차단을 해제할까요?',
    unblockConfirmBody:
      '차단을 해제하면 이 사용자가 다시 Discovery에 표시되고 Melo 조건에 따라 다시 연결될 수 있습니다.',
    unblockBusy: '차단 해제 중...',

    privacyIntro:
      '개인 데이터를 관리하고 정보 사본을 다운로드하며 Melo 계정 삭제를 관리할 수 있습니다.',

    exportTitle: '내 데이터 사본 다운로드',
    exportBody:
      'Melo 계정과 연결된 정보를 JSON 형식으로 받아 개인 보관용으로 저장할 수 있습니다.',
    exportIncludes: '내보내기에 포함될 수 있는 정보',
    exportProfile: '프로필 정보 및 계정 설정',
    exportAccount: '계정 정보 및 서비스 상태',
    exportActivity: '계정과 관련된 활동 정보',
    exportPrivacy: '지원되는 개인정보 설정',
    exportBusy: '데이터 준비 중...',

    accountManagement: '계정 관리',
    accountManagementBody:
      '웹에서도 Melo와 동일한 절차를 통해 계정 삭제를 요청할 수 있습니다.',

    deleteTitle: 'Melo 계정 삭제',
    deleteBody:
      '삭제 요청 후 7일의 대기 기간이 적용되고 이후 계정 삭제 절차가 진행됩니다.',
    deleteWarningTitle: '계정 삭제는 중요한 작업입니다',
    deleteWarningBody:
      '예약된 기간 이후에는 계정 데이터와 접근 권한을 복구하지 못할 수 있습니다.',
    deleteConfirmLabel:
      '확인하려면 아래 입력란에 DELETE를 입력하세요',
    deleteReasonLabel: '계정을 삭제하려는 이유',
    deleteBusy: '요청 전송 중...',

    deletionStatus: '계정 삭제 상태',
    statusPending: '대기 중',
    statusProcessing: '처리 중',
    statusFailed: '실패',
    statusCancelled: '취소됨',
    statusCompleted: '완료됨',
    statusNone: '삭제 요청 없음',

    requestedAt: '요청 시간',
    scheduledFor: '예정 시간',
    failureReason: '문제 세부정보',
    cancelBusy: '취소 중...',

    supportIntro:
      'Melo 웹 사용을 위한 도움말 센터입니다. 지원팀에 문의하거나 기본 문제 해결 방법을 확인할 수 있습니다.',
    contactTitle: 'Melo Support 문의',
    contactBody:
      '기능이 작동하지 않거나 오류가 발생하면 지원팀에 세부정보를 보내주세요.',
    supportEmail: '지원 이메일',
    sendEmail: '이메일 보내기',
    copyEmail: '이메일 복사',
    copied: '복사됨',

    includeTitle: '문의할 때 포함하면 좋은 정보',
    includePage: '문제가 발생한 페이지 이름 또는 URL',
    includeSteps: '문제가 발생하기 전에 수행한 작업',
    includeScreenshot: '문제 화면 스크린샷',
    includeTime: '문제가 발생한 대략적인 시간',

    quickTitle: '빠른 확인',
    quickRefresh:
      '웹페이지를 새로고침한 후 다시 시도하세요.',
    quickSignin:
      '정보가 업데이트되지 않으면 로그아웃 후 다시 로그인해 보세요.',
    quickPermission:
      '위치 및 알림 기능은 브라우저 권한이 필요할 수 있습니다.',
    quickBrowser:
      '최신 버전의 브라우저 사용을 권장합니다.',

    safetyTitle: '안전 관련 도움말',
    safetyBody:
      'Live Location, 안전 체크인, 신뢰 연락처 또는 SOS는 Safety Center에서 바로 확인할 수 있습니다.',
    safetyButton: 'Safety Center 열기',
    settingsButton: 'Settings로 돌아가기',
  },
};

const TITLES: Record<
  SettingsUtilityMode,
  Record<LocaleKey, string>
> = {
  premium: {
    th: 'แพ็กเกจ Melo',
    en: 'Melo packages',
    de: 'Melo-Pakete',
    zh: 'Melo 套餐',
    ja: 'Melo パッケージ',
    ko: 'Melo 패키지',
  },

  privacy: {
    th: 'ความเป็นส่วนตัวและข้อมูลส่วนบุคคล',
    en: 'Privacy & personal data',
    de: 'Datenschutz & persönliche Daten',
    zh: '隐私和个人数据',
    ja: 'プライバシーと個人データ',
    ko: '개인정보 및 개인 데이터',
  },

  blocked: {
    th: 'ผู้ใช้ที่บล็อก',
    en: 'Blocked users',
    de: 'Blockierte Nutzer',
    zh: '已屏蔽用户',
    ja: 'ブロックしたユーザー',
    ko: '차단한 사용자',
  },

support: {
  th: 'ช่วยเหลือและติดต่อเรา',
  en: 'Help & contact us',
  de: 'Hilfe & Kontakt',
  zh: '帮助与联系我们',
  ja: 'ヘルプ・お問い合わせ',
  ko: '도움말 및 문의',
},

  diagnostics: {
    th: 'Production diagnostics',
    en: 'Production diagnostics',
    de: 'Produktionsdiagnose',
    zh: '生产诊断',
    ja: '本番診断',
    ko: '프로덕션 진단',
  },

  cleanup: {
    th: 'ล้างข้อมูลทดสอบก่อนเปิดใช้งานจริง',
    en: 'Pre-launch test data cleanup',
    de: 'Testdaten vor Launch löschen',
    zh: '上线前测试数据清理',
    ja: 'リリース前テストデータ削除',
    ko: '출시 전 테스트 데이터 정리',
  },

  'quest-admin': {
    th: 'Quest & Reward Admin',
    en: 'Quest & Reward Admin',
    de: 'Quest & Reward Admin',
    zh: 'Quest & Reward Admin',
    ja: 'Quest & Reward Admin',
    ko: 'Quest & Reward Admin',
  },

  'review-admin': {
    th: 'Admin Review Center',
    en: 'Admin Review Center',
    de: 'Admin Review Center',
    zh: 'Admin Review Center',
    ja: 'Admin Review Center',
    ko: 'Admin Review Center',
  },
};

function safeLocale(
  value: string,
): LocaleKey {
  if (
    value === 'th' ||
    value === 'en' ||
    value === 'de' ||
    value === 'zh' ||
    value === 'ja' ||
    value === 'ko'
  ) {
    return value;
  }

  return 'en';
}

function localeTag(
  locale: string,
) {
  const tags: Record<
    LocaleKey,
    string
  > = {
    th: 'th-TH',
    en: 'en-US',
    de: 'de-DE',
    zh: 'zh-CN',
    ja: 'ja-JP',
    ko: 'ko-KR',
  };

  return tags[safeLocale(locale)];
}

function formatMoney(
  satang: number,
  currency: string,
  locale: string,
) {
  const amount = satang / 100;

  try {
    return new Intl.NumberFormat(
      localeTag(locale),
      {
        style: 'currency',
        currency,
        maximumFractionDigits:
          amount % 1 ? 2 : 0,
      },
    ).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

function formatDate(
  value: string,
  locale: string,
) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  try {
    return new Intl.DateTimeFormat(
      localeTag(locale),
      {
        dateStyle: 'medium',
        timeStyle: 'short',
      },
    ).format(date);
  } catch {
    return value;
  }
}

function downloadJson(
  data: unknown,
) {
  const blob = new Blob(
    [
      JSON.stringify(
        data,
        null,
        2,
      ),
    ],
    {
      type: 'application/json',
    },
  );

  const url =
    URL.createObjectURL(blob);

  const anchor =
    document.createElement('a');

  anchor.href = url;
  anchor.download =
    `melo-data-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;

  document.body.appendChild(anchor);

  anchor.click();
  anchor.remove();

  window.setTimeout(
    () =>
      URL.revokeObjectURL(url),
    500,
  );
}

function deletionStatusLabel(
  status: string,
  copy: UtilityCopy,
) {
  switch (
    String(status || '')
      .trim()
      .toLowerCase()
  ) {
    case 'pending':
      return copy.statusPending;

    case 'processing':
      return copy.statusProcessing;

    case 'failed':
      return copy.statusFailed;

    case 'cancelled':
    case 'canceled':
      return copy.statusCancelled;

    case 'completed':
    case 'deleted':
      return copy.statusCompleted;

    default:
      return copy.statusNone;
  }
}

export default function SettingsUtilityExperience({
  mode,
  embedded = false,
}: {
  mode: SettingsUtilityMode;
  embedded?: boolean;
}) {
  const { locale } =
    useLocale();

  const language =
    safeLocale(locale);

  const t =
    DICT[language];

  const copy =
    UTILITY_COPY[language];

  const title =
    TITLES[mode][language];

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState('');

  const [
    packages,
    setPackages,
  ] = useState<
    PackageProduct[]
  >([]);

  const [
    blocked,
    setBlocked,
  ] = useState<
    BlockedUserWeb[]
  >([]);

  const [
    privacy,
    setPrivacy,
  ] = useState<
    PrivacyStatusWeb | null
  >(null);

  const [
    health,
    setHealth,
  ] = useState<unknown>(
    null,
  );

  const [
    cleanup,
    setCleanup,
  ] = useState<
    PrelaunchCountsWeb | null
  >(null);

  const [
    stats,
    setStats,
  ] = useState<
    QuestRewardAdminStatsWeb | null
  >(null);

  const [
    quests,
    setQuests,
  ] = useState<
    AdminQuestRowWeb[]
  >([]);

  const [
    rewards,
    setRewards,
  ] = useState<
    AdminRewardRowWeb[]
  >([]);

  const [
    reviewHome,
    setReviewHome,
  ] = useState<{
    hasAccess: boolean;
    pendingCount: number;
  } | null>(null);

  const [
    reviewCounts,
    setReviewCounts,
  ] = useState<
    Record<string, number>
  >({});

  const [
    busy,
    setBusy,
  ] = useState('');

  const [
    confirmText,
    setConfirmText,
  ] = useState('');

  const [
    reason,
    setReason,
  ] = useState('');

  async function load() {
    setLoading(true);
    setError('');

    try {
      if (
        mode ===
        'premium'
      ) {
        setPackages(
          await loadPackageCatalog(),
        );
      }

      if (
        mode ===
        'blocked'
      ) {
        setBlocked(
          await loadBlockedUsersWeb(),
        );
      }

      if (
        mode ===
        'privacy'
      ) {
        setPrivacy(
          await getPrivacyStatusWeb(),
        );
      }

      if (
        mode ===
        'diagnostics'
      ) {
        setHealth(
          await loadProductionHealthWeb(),
        );
      }

      if (
        mode ===
        'cleanup'
      ) {
        setCleanup(
          await loadPrelaunchCountsWeb(),
        );
      }

      if (
        mode ===
        'quest-admin'
      ) {
        const [
          nextStats,
          nextQuests,
          nextRewards,
        ] =
          await Promise.all(
            [
              loadQuestRewardAdminStatsWeb(),
              listAdminQuestsWeb(),
              listAdminRewardsWeb(),
            ],
          );

        setStats(
          nextStats,
        );

        setQuests(
          nextQuests,
        );

        setRewards(
          nextRewards,
        );
      }

      if (
        mode ===
        'review-admin'
      ) {
        const [
          home,
          counts,
        ] =
          await Promise.all(
            [
              loadAdminReviewHomeWeb(),
              loadAdminReviewQueueCountsWeb(),
            ],
          );

        setReviewHome(
          home,
        );

        setReviewCounts(
          counts,
        );
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : String(
              cause,
            ),
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [mode]);

  const cleanupTotal =
    useMemo(
      () =>
        cleanup
          ? cleanup.trips +
            cleanup.socialPosts +
            cleanup.events +
            cleanup.communities +
            cleanup.businessServices
          : 0,
      [cleanup],
    );

  async function doUnblock(
    id: string,
  ) {
    setBusy(id);

    try {
      await unblockUserWeb(
        id,
      );

      setBlocked(
        (
          rows,
        ) =>
          rows.filter(
            (
              item,
            ) =>
              item.userId !==
              id,
          ),
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : String(
              cause,
            ),
      );
    } finally {
      setBusy('');
    }
  }

  async function exportData() {
    setBusy('export');

    try {
      const data =
        await exportMyMeloDataWeb();

      downloadJson(
        data,
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : String(
              cause,
            ),
      );
    } finally {
      setBusy('');
    }
  }

  async function deleteAccount() {
    if (
      confirmText.trim() !==
        'DELETE' ||
      !reason.trim()
    ) {
      return;
    }

    setBusy('delete');

    try {
      const status =
        await scheduleAccountDeletionWeb(
          reason,
        );

      setPrivacy(
        status,
      );

      setConfirmText('');
      setReason('');
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : String(
              cause,
            ),
      );
    } finally {
      setBusy('');
    }
  }

  async function cancelDelete() {
    setBusy('cancel');

    try {
      const status =
        await cancelAccountDeletionWeb();

      setPrivacy(
        status,
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : String(
              cause,
            ),
      );
    } finally {
      setBusy('');
    }
  }

  async function clearData() {
    if (
      confirmText.trim() !==
      'DELETE TEST DATA'
    ) {
      return;
    }

    setBusy('cleanup');

    try {
      const next =
        await clearPrelaunchTestDataWeb(
          'DELETE TEST DATA',
        );

      setCleanup(
        next,
      );

      setConfirmText('');
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : String(
              cause,
            ),
      );
    } finally {
      setBusy('');
    }
  }

  async function toggleQuest(
    item: AdminQuestRowWeb,
  ) {
    setBusy(item.id);

    try {
      await setAdminQuestActiveWeb(
        item.id,
        !item.active,
      );

      setQuests(
        (
          rows,
        ) =>
          rows.map(
            (
              current,
            ) =>
              current.id ===
              item.id
                ? {
                    ...current,
                    active:
                      !current.active,
                  }
                : current,
          ),
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : String(
              cause,
            ),
      );
    } finally {
      setBusy('');
    }
  }

  async function toggleReward(
    item: AdminRewardRowWeb,
  ) {
    setBusy(item.id);

    try {
      await setAdminRewardActiveWeb(
        item.id,
        !item.active,
      );

      setRewards(
        (
          rows,
        ) =>
          rows.map(
            (
              current,
            ) =>
              current.id ===
              item.id
                ? {
                    ...current,
                    active:
                      !current.active,
                  }
                : current,
          ),
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : String(
              cause,
            ),
      );
    } finally {
      setBusy('');
    }
  }

  const content =
    loading ? (
      <div
        className={
          styles.state
        }
      >
        {t.loading}
      </div>
    ) : error ? (
      <div
        className={
          styles.state
        }
      >
        <strong>
          {error}
        </strong>

        <button
          type="button"
          onClick={() =>
            void load()
          }
        >
          {t.retry}
        </button>
      </div>
    ) : (
      <div
        className={
          styles.body
        }
      >
        {mode ===
        'premium' ? (
          <Premium
            packages={
              packages
            }
            locale={
              language
            }
            t={t}
          />
        ) : null}

        {mode ===
        'blocked' ? (
          <Blocked
            rows={
              blocked
            }
            locale={
              language
            }
            t={t}
            copy={
              copy
            }
            busy={
              busy
            }
            onUnblock={
              doUnblock
            }
          />
        ) : null}

        {mode ===
        'privacy' ? (
          <Privacy
            status={
              privacy
            }
            locale={
              language
            }
            t={t}
            copy={
              copy
            }
            busy={
              busy
            }
            confirmText={
              confirmText
            }
            setConfirmText={
              setConfirmText
            }
            reason={
              reason
            }
            setReason={
              setReason
            }
            onExport={
              exportData
            }
            onDelete={
              deleteAccount
            }
            onCancel={
              cancelDelete
            }
          />
        ) : null}

        {mode ===
        'support' ? (
          <Support
            copy={
              copy
            }
          />
        ) : null}

        {mode ===
        'diagnostics' ? (
          <Diagnostics
            data={
              health
            }
            t={t}
            onRefresh={
              load
            }
          />
        ) : null}

        {mode ===
        'cleanup' ? (
          <Cleanup
            data={
              cleanup
            }
            total={
              cleanupTotal
            }
            t={t}
            busy={
              busy
            }
            confirmText={
              confirmText
            }
            setConfirmText={
              setConfirmText
            }
            onClear={
              clearData
            }
          />
        ) : null}

        {mode ===
        'quest-admin' ? (
          <QuestAdmin
            stats={
              stats
            }
            quests={
              quests
            }
            rewards={
              rewards
            }
            t={t}
            busy={
              busy
            }
            toggleQuest={
              toggleQuest
            }
            toggleReward={
              toggleReward
            }
          />
        ) : null}

        {mode ===
        'review-admin' ? (
          <ReviewAdmin
            home={
              reviewHome
            }
            counts={
              reviewCounts
            }
            t={t}
            onRefresh={
              load
            }
          />
        ) : null}
      </div>
    );

  if (embedded) {
    return (
      <section
        className={
          styles.embedded
        }
      >
        {content}
      </section>
    );
  }

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
          <div>
            <small>
              MELO SETTINGS
            </small>

            <h1>
              {title}
            </h1>
          </div>

          <Link href="/settings">
            ← {t.back}
          </Link>
        </header>

        {content}
      </section>
    </main>
  );
}

function Premium({
  packages,
  locale,
  t,
}: {
  packages: PackageProduct[];
  locale: string;
  t: Dict;
}) {
  return (
    <>
      <p
        className={
          styles.lead
        }
      >
        {t.mobilePurchase}
      </p>

      <div
        className={
          styles.cardGrid
        }
      >
        {packages.length ? (
          packages.map(
            (
              product,
            ) => (
              <article
                className={
                  styles.card
                }
                key={
                  product.code
                }
              >
                <header>
                  <span>
                    {product.badgeTh ||
                      product.badgeEn ||
                      product.productType}
                  </span>

                  <h2>
                    {locale ===
                    'th'
                      ? product.titleTh ||
                        product.titleEn
                      : product.titleEn ||
                        product.titleTh}
                  </h2>
                </header>

                <p>
                  {locale ===
                  'th'
                    ? product.descriptionTh ||
                      product.descriptionEn
                    : product.descriptionEn ||
                      product.descriptionTh}
                </p>

                <strong
                  className={
                    styles.price
                  }
                >
                  {formatMoney(
                    product.priceSatang,
                    product.currency,
                    locale,
                  )}
                </strong>

                {product.translationCredits >
                0 ? (
                  <small>
                    {product.translationCredits.toLocaleString()}{' '}
                    translation
                    credits
                  </small>
                ) : null}

                <ul>
                  {(locale ===
                  'th'
                    ? product.featuresTh
                    : product.featuresEn
                  ).map(
                    (
                      item,
                    ) => (
                      <li
                        key={
                          item
                        }
                      >
                        ✓{' '}
                        {item}
                      </li>
                    ),
                  )}
                </ul>
              </article>
            ),
          )
        ) : (
          <div
            className={
              styles.empty
            }
          >
            {t.empty}
          </div>
        )}
      </div>
    </>
  );
}

function Blocked({
  rows,
  locale,
  t,
  copy,
  busy,
  onUnblock,
}: {
  rows: BlockedUserWeb[];
  locale: string;
  t: Dict;
  copy: UtilityCopy;
  busy: string;
  onUnblock: (
    id: string,
  ) => void;
}) {
  const [
    search,
    setSearch,
  ] = useState('');

  const filtered =
    useMemo(() => {
      const keyword =
        search
          .trim()
          .toLocaleLowerCase();

      if (!keyword) {
        return rows;
      }

      return rows.filter(
        (
          item,
        ) =>
          [
            item.displayName,
            item.reason,
          ]
            .join(' ')
            .toLocaleLowerCase()
            .includes(
              keyword,
            ),
      );
    }, [
      rows,
      search,
    ]);

  function confirmUnblock(
    user: BlockedUserWeb,
  ) {
    const accepted =
      window.confirm(
        `${copy.unblockConfirmTitle}\n\n${user.displayName}\n\n${copy.unblockConfirmBody}`,
      );

    if (
      accepted
    ) {
      onUnblock(
        user.userId,
      );
    }
  }

  return (
    <div
      className={
        styles.utilityStack
      }
    >
      <section
        className={
          styles.sectionHero
        }
      >
        <div
          className={
            styles.heroIcon
          }
          aria-hidden="true"
        >
          ⛔
        </div>

        <div
          className={
            styles.heroCopy
          }
        >
          <strong>
            {copy.blockedCount}
          </strong>

          <p>
            {copy.blockedIntro}
          </p>
        </div>

        <div
          className={
            styles.heroStat
          }
        >
          <strong>
            {rows.length}
          </strong>

          <span>
            {copy.blockedCount}
          </span>
        </div>
      </section>

      {rows.length ? (
        <div
          className={
            styles.toolbar
          }
        >
          <label
            className={
              styles.searchBox
            }
          >
            <span
              aria-hidden="true"
            >
              ⌕
            </span>

            <input
              type="search"
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
                copy.blockedSearch
              }
            />
          </label>

          <span
            className={
              styles.countBadge
            }
          >
            {
              filtered.length
            }
            {' / '}
            {rows.length}
          </span>
        </div>
      ) : null}

      {filtered.length ? (
        <div
          className={
            styles.list
          }
        >
          {filtered.map(
            (
              user,
            ) => (
              <article
                className={
                  styles.personRow
                }
                key={
                  user.userId
                }
              >
                <span
                  className={
                    styles.personAvatar
                  }
                >
                  {user.photoUrl ? (
                    <img
                      src={
                        user.photoUrl
                      }
                      alt=""
                    />
                  ) : (
                    <b>
                      {user.displayName
                        .slice(
                          0,
                          1,
                        )
                        .toUpperCase()}
                    </b>
                  )}
                </span>

                <div
                  className={
                    styles.personMain
                  }
                >
                  <strong>
                    {
                      user.displayName
                    }
                  </strong>

                  <small>
                    {
                      copy.blockedSince
                    }
                    {' · '}
                    {formatDate(
                      user.blockedAt,
                      locale,
                    )}
                  </small>

                  {user.reason ? (
                    <span
                      className={
                        styles.reasonChip
                      }
                    >
                      {
                        copy.blockedReason
                      }
                      :{' '}
                      {
                        user.reason
                      }
                    </span>
                  ) : null}
                </div>

                <button
                  type="button"
                  className={
                    styles.secondaryButton
                  }
                  disabled={
                    busy ===
                    user.userId
                  }
                  onClick={() =>
                    confirmUnblock(
                      user,
                    )
                  }
                >
                  {busy ===
                  user.userId
                    ? copy.unblockBusy
                    : t.unblock}
                </button>
              </article>
            ),
          )}
        </div>
      ) : (
        <div
          className={
            styles.emptyState
          }
        >
          <span
            aria-hidden="true"
          >
            {rows.length
              ? '⌕'
              : '✓'}
          </span>

          <strong>
            {rows.length
              ? copy.blockedEmptySearch
              : copy.blockedEmpty}
          </strong>
        </div>
      )}
    </div>
  );
}

const ANDROID_PRIVACY_COPY: Record<
  LocaleKey,
  {
    subtitle: string;

    dataSection: string;
    downloadTitle: string;
    downloadBody: string;
    downloadButton: string;

    legalSection: string;
    privacyPolicy: string;
    terms: string;

    deleteSection: string;
    deleteTitle: string;
    deleteBody: string;
    deleteButton: string;

    confirmTitle: string;
    confirmBody: string;
    confirmType: string;
    confirmReason: string;
    confirmButton: string;
    cancel: string;

    deletionStatus: string;
    requestedAt: string;
    scheduledFor: string;
    cancelDeletion: string;
    cancelling: string;
  }
> = {
  th: {
    subtitle:
      'จัดการข้อมูล เอกสารทางกฎหมาย และการลบบัญชีของคุณ',

    dataSection:
      'ข้อมูลของคุณ',

    downloadTitle:
      'ดาวน์โหลดข้อมูลส่วนตัว',

    downloadBody:
      'สร้างสำเนา JSON ของโปรไฟล์ กิจกรรม ข้อความ และข้อมูลอื่นที่เชื่อมกับบัญชี',

    downloadButton:
      'สร้างไฟล์ข้อมูล',

    legalSection:
      'กฎหมายและความโปร่งใส',

    privacyPolicy:
      'นโยบายความเป็นส่วนตัว',

    terms:
      'ข้อกำหนดการใช้งาน',

    deleteSection:
      'ลบบัญชี',

    deleteTitle:
      'ลบบัญชี Melo Chat อย่างถาวร',

    deleteBody:
      'ระบบจะกำหนดลบบัญชีหลังระยะผ่อนผัน 7 วัน และสามารถยกเลิกได้ก่อนเริ่มดำเนินการ ข้อมูลบางส่วนอาจเก็บไว้เฉพาะเมื่อจำเป็นด้านความปลอดภัย ป้องกันการทุจริต หรือกฎหมาย',

    deleteButton:
      'เริ่มนับถอยหลังลบบัญชี 7 วัน',

    confirmTitle:
      'ยืนยันการลบบัญชี',

    confirmBody:
      'เพื่อป้องกันการลบบัญชีโดยไม่ตั้งใจ กรุณายืนยันคำขอก่อนเริ่มระยะผ่อนผัน 7 วัน คุณยังสามารถยกเลิกคำขอได้ก่อนระบบเริ่มดำเนินการ',

    confirmType:
      'พิมพ์ DELETE เพื่อยืนยัน',

    confirmReason:
      'เหตุผลที่ต้องการลบบัญชี',

    confirmButton:
      'ยืนยันเริ่มนับถอยหลัง 7 วัน',

    cancel:
      'ยกเลิก',

    deletionStatus:
      'สถานะการลบบัญชี',

    requestedAt:
      'ส่งคำขอเมื่อ',

    scheduledFor:
      'กำหนดลบบัญชี',

    cancelDeletion:
      'ยกเลิกการลบบัญชี',

    cancelling:
      'กำลังยกเลิก...',
  },

  en: {
    subtitle:
      'Manage your data, legal documents, and account deletion.',

    dataSection:
      'Your data',

    downloadTitle:
      'Download personal data',

    downloadBody:
      'Create a JSON copy of your profile, activity, messages, and other information associated with your account.',

    downloadButton:
      'Create data file',

    legalSection:
      'Legal & transparency',

    privacyPolicy:
      'Privacy Policy',

    terms:
      'Terms of Use',

    deleteSection:
      'Delete account',

    deleteTitle:
      'Permanently delete your Melo Chat account',

    deleteBody:
      'Your account will be scheduled for deletion after a 7-day grace period. You can cancel before processing begins. Some information may be retained when required for safety, fraud prevention, or legal obligations.',

    deleteButton:
      'Start 7-day deletion countdown',

    confirmTitle:
      'Confirm account deletion',

    confirmBody:
      'To prevent accidental deletion, confirm your request before the 7-day grace period begins. You can cancel the request before processing starts.',

    confirmType:
      'Type DELETE to confirm',

    confirmReason:
      'Why do you want to delete your account?',

    confirmButton:
      'Confirm 7-day countdown',

    cancel:
      'Cancel',

    deletionStatus:
      'Deletion status',

    requestedAt:
      'Requested',

    scheduledFor:
      'Scheduled deletion',

    cancelDeletion:
      'Cancel account deletion',

    cancelling:
      'Cancelling...',
  },

  de: {
    subtitle:
      'Verwalte deine Daten, rechtliche Dokumente und die Kontolöschung.',

    dataSection:
      'Deine Daten',

    downloadTitle:
      'Persönliche Daten herunterladen',

    downloadBody:
      'Erstelle eine JSON-Kopie deines Profils, deiner Aktivitäten, Nachrichten und weiterer mit deinem Konto verbundener Daten.',

    downloadButton:
      'Datendatei erstellen',

    legalSection:
      'Rechtliches & Transparenz',

    privacyPolicy:
      'Datenschutzerklärung',

    terms:
      'Nutzungsbedingungen',

    deleteSection:
      'Konto löschen',

    deleteTitle:
      'Melo-Chat-Konto dauerhaft löschen',

    deleteBody:
      'Das Konto wird nach einer 7-tägigen Karenzzeit zur Löschung vorgesehen. Die Anfrage kann vor Beginn der Verarbeitung abgebrochen werden. Bestimmte Informationen können aus Sicherheits-, Betrugspräventions- oder rechtlichen Gründen aufbewahrt werden.',

    deleteButton:
      '7-Tage-Löschfrist starten',

    confirmTitle:
      'Kontolöschung bestätigen',

    confirmBody:
      'Bestätige die Anfrage, bevor die 7-tägige Karenzzeit beginnt. Du kannst die Anfrage vor Beginn der Verarbeitung abbrechen.',

    confirmType:
      'DELETE zur Bestätigung eingeben',

    confirmReason:
      'Grund für die Kontolöschung',

    confirmButton:
      '7-Tage-Frist bestätigen',

    cancel:
      'Abbrechen',

    deletionStatus:
      'Löschstatus',

    requestedAt:
      'Angefordert',

    scheduledFor:
      'Geplante Löschung',

    cancelDeletion:
      'Kontolöschung abbrechen',

    cancelling:
      'Wird abgebrochen...',
  },

  zh: {
    subtitle:
      '管理你的数据、法律文件和账户删除。',

    dataSection:
      '你的数据',

    downloadTitle:
      '下载个人数据',

    downloadBody:
      '创建包含个人资料、活动、消息以及其他与账户关联信息的 JSON 副本。',

    downloadButton:
      '创建数据文件',

    legalSection:
      '法律与透明度',

    privacyPolicy:
      '隐私政策',

    terms:
      '使用条款',

    deleteSection:
      '删除账户',

    deleteTitle:
      '永久删除 Melo Chat 账户',

    deleteBody:
      '账户将在 7 天宽限期后安排删除。在系统开始处理前，你可以取消申请。出于安全、防欺诈或法律要求，部分信息可能需要继续保留。',

    deleteButton:
      '开始 7 天删除倒计时',

    confirmTitle:
      '确认删除账户',

    confirmBody:
      '为防止误删，请在 7 天宽限期开始前确认申请。在系统开始处理前仍可取消。',

    confirmType:
      '输入 DELETE 进行确认',

    confirmReason:
      '删除账户的原因',

    confirmButton:
      '确认开始 7 天倒计时',

    cancel:
      '取消',

    deletionStatus:
      '账户删除状态',

    requestedAt:
      '申请时间',

    scheduledFor:
      '计划删除时间',

    cancelDeletion:
      '取消账户删除',

    cancelling:
      '正在取消...',
  },

  ja: {
    subtitle:
      'データ、法的文書、アカウント削除を管理します。',

    dataSection:
      'あなたのデータ',

    downloadTitle:
      '個人データをダウンロード',

    downloadBody:
      'プロフィール、アクティビティ、メッセージ、その他アカウントに関連する情報の JSON コピーを作成します。',

    downloadButton:
      'データファイルを作成',

    legalSection:
      '法的情報と透明性',

    privacyPolicy:
      'プライバシーポリシー',

    terms:
      '利用規約',

    deleteSection:
      'アカウント削除',

    deleteTitle:
      'Melo Chat アカウントを完全に削除',

    deleteBody:
      '7日間の猶予期間後にアカウント削除が予定されます。処理開始前であればキャンセルできます。安全対策、不正防止、法的義務のため、一部の情報が保持される場合があります。',

    deleteButton:
      '7日間の削除カウントダウンを開始',

    confirmTitle:
      'アカウント削除の確認',

    confirmBody:
      '誤操作を防ぐため、7日間の猶予期間を開始する前に申請を確認してください。処理開始前ならキャンセルできます。',

    confirmType:
      '確認のため DELETE と入力',

    confirmReason:
      'アカウントを削除する理由',

    confirmButton:
      '7日間のカウントダウンを確認',

    cancel:
      'キャンセル',

    deletionStatus:
      '削除状況',

    requestedAt:
      '申請日時',

    scheduledFor:
      '削除予定日時',

    cancelDeletion:
      'アカウント削除をキャンセル',

    cancelling:
      'キャンセル中...',
  },

  ko: {
    subtitle:
      '데이터, 법적 문서 및 계정 삭제를 관리합니다.',

    dataSection:
      '내 데이터',

    downloadTitle:
      '개인 데이터 다운로드',

    downloadBody:
      '프로필, 활동, 메시지 및 계정에 연결된 기타 정보의 JSON 사본을 생성합니다.',

    downloadButton:
      '데이터 파일 만들기',

    legalSection:
      '법률 및 투명성',

    privacyPolicy:
      '개인정보 처리방침',

    terms:
      '이용약관',

    deleteSection:
      '계정 삭제',

    deleteTitle:
      'Melo Chat 계정 영구 삭제',

    deleteBody:
      '7일의 유예 기간 후 계정 삭제가 예약됩니다. 처리가 시작되기 전에는 취소할 수 있습니다. 안전, 사기 방지 또는 법적 의무를 위해 일부 정보가 보관될 수 있습니다.',

    deleteButton:
      '7일 삭제 카운트다운 시작',

    confirmTitle:
      '계정 삭제 확인',

    confirmBody:
      '실수로 인한 삭제를 방지하기 위해 7일 유예 기간을 시작하기 전에 요청을 확인해 주세요. 처리가 시작되기 전에는 취소할 수 있습니다.',

    confirmType:
      '확인하려면 DELETE 입력',

    confirmReason:
      '계정을 삭제하려는 이유',

    confirmButton:
      '7일 카운트다운 확인',

    cancel:
      '취소',

    deletionStatus:
      '계정 삭제 상태',

    requestedAt:
      '요청 시간',

    scheduledFor:
      '삭제 예정',

    cancelDeletion:
      '계정 삭제 취소',

    cancelling:
      '취소 중...',
  },
};


const ANDROID_SUPPORT_COPY: Record<
  LocaleKey,
  {
    subtitle: string;

    contactTitle: string;
    contactBody: string;
    emailButton: string;

    faqTitle: string;

    loginTitle: string;
    loginBody: string;

    verificationTitle: string;
    verificationBody: string;

    safetyTitle: string;
    safetyBody: string;

    deleteTitle: string;
    deleteBody: string;
  }
> = {
  th: {
    subtitle:
      'คำถามที่พบบ่อยและช่องทางติดต่อทีมงาน Melo Chat',

    contactTitle:
      'ติดต่อทีมงาน',

    contactBody:
      'ส่งอีเมลถึงทีมสนับสนุน พร้อมระบุอีเมลบัญชีและรายละเอียดปัญหา',

    emailButton:
      'ส่งอีเมลถึงทีมงาน',

    faqTitle:
      'คำถามที่พบบ่อย',

    loginTitle:
      'เข้าสู่ระบบหรือรีเซ็ตรหัสผ่านไม่ได้',

    loginBody:
      'ใช้เมนูลืมรหัสผ่านในหน้าเข้าสู่ระบบ และตรวจสอบว่าอีเมลหรือเบอร์โทรตรงกับบัญชีที่สมัครไว้',

    verificationTitle:
      'ติดตามผลการยืนยันตัวตนหรือบริษัท',

    verificationBody:
      'เปิดหน้าการยืนยันที่เกี่ยวข้องเพื่อตรวจสถานะ หากถูกขอข้อมูลเพิ่มเติมให้ส่งเอกสารใหม่จากหน้านั้น',

    safetyTitle:
      'ต้องการรายงานผู้ใช้หรือเหตุการณ์ไม่ปลอดภัย',

    safetyBody:
      'ใช้เมนูรายงานจากโปรไฟล์ แชท โพสต์ หรือรีวิว หากเป็นเหตุฉุกเฉินให้ติดต่อหน่วยงานฉุกเฉินในพื้นที่ก่อน',

    deleteTitle:
      'ต้องการลบบัญชีและข้อมูลส่วนตัว',

    deleteBody:
      'ไปที่การตั้งค่า → ความเป็นส่วนตัวและข้อมูลส่วนบุคคล แล้วกดส่งคำขอลบบัญชี',
  },

  en: {
    subtitle:
      'Frequently asked questions and ways to contact the Melo Chat team.',

    contactTitle:
      'Contact the team',

    contactBody:
      'Email our support team and include your account email and details of the problem.',

    emailButton:
      'Email the team',

    faqTitle:
      'Frequently asked questions',

    loginTitle:
      'I cannot sign in or reset my password',

    loginBody:
      'Use Forgot password on the sign-in page and make sure the email address or phone number matches the account you registered.',

    verificationTitle:
      'Follow up on identity or business verification',

    verificationBody:
      'Open the relevant verification page to check the status. If more information is requested, submit the new documents from that page.',

    safetyTitle:
      'Report a user or an unsafe incident',

    safetyBody:
      'Use Report from the profile, chat, post, or review. For an emergency, contact your local emergency services first.',

    deleteTitle:
      'Delete my account and personal data',

    deleteBody:
      'Go to Settings → Privacy & personal data, then submit an account deletion request.',
  },

  de: {
    subtitle:
      'Häufige Fragen und Kontaktmöglichkeiten zum Melo-Chat-Team.',

    contactTitle:
      'Team kontaktieren',

    contactBody:
      'Sende dem Support eine E-Mail und gib deine Konto-E-Mail sowie eine Beschreibung des Problems an.',

    emailButton:
      'E-Mail an das Team',

    faqTitle:
      'Häufig gestellte Fragen',

    loginTitle:
      'Anmeldung oder Passwort-Zurücksetzen funktioniert nicht',

    loginBody:
      'Nutze „Passwort vergessen“ auf der Anmeldeseite und prüfe, ob E-Mail-Adresse oder Telefonnummer mit dem registrierten Konto übereinstimmen.',

    verificationTitle:
      'Identitäts- oder Unternehmensprüfung verfolgen',

    verificationBody:
      'Öffne die entsprechende Verifizierungsseite. Falls weitere Angaben angefordert werden, reiche die neuen Dokumente dort ein.',

    safetyTitle:
      'Nutzer oder unsicheren Vorfall melden',

    safetyBody:
      'Nutze die Meldefunktion im Profil, Chat, Beitrag oder in einer Bewertung. In einem Notfall kontaktiere zuerst die örtlichen Notdienste.',

    deleteTitle:
      'Konto und persönliche Daten löschen',

    deleteBody:
      'Gehe zu Einstellungen → Datenschutz & persönliche Daten und sende dort eine Kontolöschanfrage.',
  },

  zh: {
    subtitle:
      '常见问题以及联系 Melo Chat 团队的方式。',

    contactTitle:
      '联系团队',

    contactBody:
      '请发送邮件给支持团队，并注明你的账户邮箱和问题详情。',

    emailButton:
      '发送邮件给团队',

    faqTitle:
      '常见问题',

    loginTitle:
      '无法登录或重置密码',

    loginBody:
      '请在登录页面使用“忘记密码”，并确认邮箱地址或手机号与注册账户一致。',

    verificationTitle:
      '查看身份或企业认证进度',

    verificationBody:
      '打开对应的认证页面查看状态。如果系统要求补充资料，请从该页面重新提交文件。',

    safetyTitle:
      '举报用户或不安全事件',

    safetyBody:
      '可在个人资料、聊天、帖子或评价中使用举报功能。如遇紧急情况，请先联系当地紧急服务机构。',

    deleteTitle:
      '删除账户和个人数据',

    deleteBody:
      '前往 设置 → 隐私和个人数据，然后提交账户删除申请。',
  },

  ja: {
    subtitle:
      'よくある質問と Melo Chat チームへのお問い合わせ方法。',

    contactTitle:
      'チームに連絡',

    contactBody:
      'サポートへメールを送り、アカウントのメールアドレスと問題の詳細を記載してください。',

    emailButton:
      'チームにメールする',

    faqTitle:
      'よくある質問',

    loginTitle:
      'ログインまたはパスワードのリセットができない',

    loginBody:
      'ログイン画面の「パスワードを忘れた場合」を使用し、メールアドレスまたは電話番号が登録したアカウントと一致しているか確認してください。',

    verificationTitle:
      '本人確認・企業確認の進捗を確認したい',

    verificationBody:
      '該当する確認ページを開いてステータスを確認してください。追加情報を求められた場合は、そのページから新しい書類を提出してください。',

    safetyTitle:
      'ユーザーや危険な出来事を報告したい',

    safetyBody:
      'プロフィール、チャット、投稿、レビューから報告機能を使用してください。緊急の場合は、まず地域の緊急機関へ連絡してください。',

    deleteTitle:
      'アカウントと個人データを削除したい',

    deleteBody:
      '設定 → プライバシーと個人データ からアカウント削除申請を送信してください。',
  },

  ko: {
    subtitle:
      '자주 묻는 질문과 Melo Chat 팀에 문의하는 방법입니다.',

    contactTitle:
      '팀에 문의',

    contactBody:
      '지원팀에 이메일을 보내고 계정 이메일과 문제 세부정보를 함께 적어 주세요.',

    emailButton:
      '팀에 이메일 보내기',

    faqTitle:
      '자주 묻는 질문',

    loginTitle:
      '로그인 또는 비밀번호 재설정이 되지 않아요',

    loginBody:
      '로그인 화면의 비밀번호 찾기를 사용하고 이메일 주소 또는 전화번호가 가입한 계정과 일치하는지 확인하세요.',

    verificationTitle:
      '본인 인증 또는 사업자 인증 진행 상태 확인',

    verificationBody:
      '관련 인증 페이지에서 상태를 확인하세요. 추가 정보가 요청된 경우 해당 페이지에서 새 서류를 제출하세요.',

    safetyTitle:
      '사용자 또는 안전하지 않은 상황 신고',

    safetyBody:
      '프로필, 채팅, 게시물 또는 리뷰에서 신고 메뉴를 사용하세요. 긴급 상황이라면 먼저 지역 응급기관에 연락하세요.',

    deleteTitle:
      '계정과 개인 데이터 삭제',

    deleteBody:
      '설정 → 개인정보 및 개인 데이터에서 계정 삭제 요청을 제출하세요.',
  },
};


function Privacy({
  status,
  locale,
  t,
  copy,
  busy,
  confirmText,
  setConfirmText,
  reason,
  setReason,
  onExport,
  onDelete,
  onCancel,
}: {
  status: PrivacyStatusWeb | null;
  locale: string;
  t: Dict;
  copy: UtilityCopy;
  busy: string;
  confirmText: string;
  setConfirmText: (
    value: string,
  ) => void;
  reason: string;
  setReason: (
    value: string,
  ) => void;
  onExport: () => void;
  onDelete: () => void;
  onCancel: () => void;
}) {
  const language =
    safeLocale(locale);

  const ui =
    ANDROID_PRIVACY_COPY[
      language
    ];

  const [
    deleteOpen,
    setDeleteOpen,
  ] = useState(false);

  const statusCode =
    String(
      status?.deletionStatus ||
        'none',
    )
      .trim()
      .toLowerCase();

  const pending =
    [
      'pending',
      'processing',
      'failed',
    ].includes(
      statusCode,
    );

  function closeDelete() {
    setDeleteOpen(false);
    setConfirmText('');
    setReason('');
  }

  function confirmDelete() {
    if (
      busy === 'delete' ||
      confirmText.trim() !==
        'DELETE' ||
      !reason.trim()
    ) {
      return;
    }

    onDelete();
    setDeleteOpen(false);
  }

  return (
    <div
      className={
        styles.androidUtilityPage
      }
    >
      <p
        className={
          styles.androidPageLead
        }
      >
        {ui.subtitle}
      </p>

      <section
        className={
          styles.androidSection
        }
      >
        <h2
          className={
            styles.androidSectionTitle
          }
        >
          {ui.dataSection}
        </h2>

        <article
          className={
            styles.androidDownloadCard
          }
        >
          <div
            className={
              styles.androidActionIcon
            }
            aria-hidden="true"
          >
            ⇩
          </div>

          <div
            className={
              styles.androidCardCopy
            }
          >
            <h3>
              {ui.downloadTitle}
            </h3>

            <p>
              {ui.downloadBody}
            </p>
          </div>

          <button
            type="button"
            className={
              styles.androidPrimaryAction
            }
            disabled={
              busy === 'export'
            }
            onClick={
              onExport
            }
          >
            {busy === 'export'
              ? copy.exportBusy
              : ui.downloadButton}
          </button>
        </article>
      </section>

      <section
        className={
          styles.androidSection
        }
      >
        <h2
          className={
            styles.androidSectionTitle
          }
        >
          {ui.legalSection}
        </h2>

        <div
          className={
            styles.androidLegalCard
          }
        >
          <Link
            href="/privacy-policy"
            className={
              styles.androidLegalRow
            }
          >
            <span
              className={
                styles.androidLegalIcon
              }
              aria-hidden="true"
            >
              ◈
            </span>

            <strong>
              {
                ui.privacyPolicy
              }
            </strong>

            <b
              aria-hidden="true"
            >
              ›
            </b>
          </Link>

          <Link
            href="/terms-of-service"
            className={
              styles.androidLegalRow
            }
          >
            <span
              className={
                styles.androidLegalIcon
              }
              aria-hidden="true"
            >
              ≡
            </span>

            <strong>
              {ui.terms}
            </strong>

            <b
              aria-hidden="true"
            >
              ›
            </b>
          </Link>
        </div>
      </section>

      <section
        className={
          styles.androidSection
        }
      >
        <h2
          className={
            styles.androidDangerSectionTitle
          }
        >
          {ui.deleteSection}
        </h2>

        <article
          className={
            styles.androidDeleteCard
          }
        >
          <div
            className={
              styles.androidDangerIcon
            }
            aria-hidden="true"
          >
            !
          </div>

          <div
            className={
              styles.androidCardCopy
            }
          >
            <h3>
              {ui.deleteTitle}
            </h3>

            <p>
              {ui.deleteBody}
            </p>
          </div>

          {pending ? (
            <div
              className={
                styles.androidDeletionStatus
              }
            >
              <div
                className={
                  styles.androidStatusHead
                }
              >
                <div>
                  <small>
                    {
                      ui.deletionStatus
                    }
                  </small>

                  <strong>
                    {deletionStatusLabel(
                      statusCode,
                      copy,
                    )}
                  </strong>
                </div>

                <span
                  data-status={
                    statusCode
                  }
                >
                  {deletionStatusLabel(
                    statusCode,
                    copy,
                  )}
                </span>
              </div>

              <div
                className={
                  styles.androidStatusGrid
                }
              >
                {status?.deletionRequestedAt ? (
                  <div>
                    <small>
                      {
                        ui.requestedAt
                      }
                    </small>

                    <strong>
                      {formatDate(
                        status.deletionRequestedAt,
                        locale,
                      )}
                    </strong>
                  </div>
                ) : null}

                {status?.deletionScheduledFor ? (
                  <div>
                    <small>
                      {
                        ui.scheduledFor
                      }
                    </small>

                    <strong>
                      {formatDate(
                        status.deletionScheduledFor,
                        locale,
                      )}
                    </strong>
                  </div>
                ) : null}
              </div>

              {status?.deletionFailureMessage ? (
                <p
                  className={
                    styles.androidStatusError
                  }
                >
                  {
                    status.deletionFailureMessage
                  }
                </p>
              ) : null}

              <button
                type="button"
                className={
                  styles.androidCancelDeletion
                }
                disabled={
                  busy === 'cancel'
                }
                onClick={
                  onCancel
                }
              >
                {busy === 'cancel'
                  ? ui.cancelling
                  : ui.cancelDeletion}
              </button>
            </div>
          ) : (
            <button
              type="button"
              className={
                styles.androidDangerAction
              }
              onClick={() =>
                setDeleteOpen(
                  true,
                )
              }
            >
              {
                ui.deleteButton
              }
            </button>
          )}
        </article>
      </section>

      {deleteOpen ? (
        <div
          className={
            styles.androidDeleteBackdrop
          }
          role="presentation"
          onMouseDown={(
            event,
          ) => {
            if (
              event.currentTarget ===
              event.target
            ) {
              closeDelete();
            }
          }}
        >
          <section
            className={
              styles.androidDeleteModal
            }
            role="dialog"
            aria-modal="true"
            aria-labelledby="melo-delete-title"
          >
            <header>
              <div
                className={
                  styles.androidDangerIcon
                }
                aria-hidden="true"
              >
                !
              </div>

              <div>
                <h2
                  id="melo-delete-title"
                >
                  {
                    ui.confirmTitle
                  }
                </h2>

                <p>
                  {
                    ui.confirmBody
                  }
                </p>
              </div>

              <button
                type="button"
                className={
                  styles.androidModalClose
                }
                onClick={
                  closeDelete
                }
                aria-label={
                  ui.cancel
                }
              >
                ×
              </button>
            </header>

            <div
              className={
                styles.androidDeleteFields
              }
            >
              <label>
                <span>
                  {
                    ui.confirmType
                  }
                </span>

                <input
                  value={
                    confirmText
                  }
                  onChange={(
                    event,
                  ) =>
                    setConfirmText(
                      event
                        .target
                        .value,
                    )
                  }
                  placeholder="DELETE"
                  autoComplete="off"
                  spellCheck={
                    false
                  }
                />
              </label>

              <label>
                <span>
                  {
                    ui.confirmReason
                  }
                </span>

                <textarea
                  value={
                    reason
                  }
                  onChange={(
                    event,
                  ) =>
                    setReason(
                      event
                        .target
                        .value,
                    )
                  }
                  maxLength={
                    500
                  }
                />

                <small>
                  {
                    reason.length
                  }
                  /500
                </small>
              </label>
            </div>

            <footer
              className={
                styles.androidDeleteModalActions
              }
            >
              <button
                type="button"
                className={
                  styles.androidModalCancel
                }
                onClick={
                  closeDelete
                }
              >
                {ui.cancel}
              </button>

              <button
                type="button"
                className={
                  styles.androidDangerAction
                }
                disabled={
                  busy ===
                    'delete' ||
                  confirmText.trim() !==
                    'DELETE' ||
                  !reason.trim()
                }
                onClick={
                  confirmDelete
                }
              >
                {busy ===
                'delete'
                  ? copy.deleteBusy
                  : ui.confirmButton}
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </div>
  );
}


function Support({
  copy: _copy,
}: {
  copy: UtilityCopy;
}) {
  const { locale } =
    useLocale();

  const language =
    safeLocale(locale);

  const ui =
    ANDROID_SUPPORT_COPY[
      language
    ];

  const SUPPORT_EMAIL =
    'melochat.official@gmail.com';

  const faq = [
    {
      title:
        ui.loginTitle,
      body:
        ui.loginBody,
    },

    {
      title:
        ui.verificationTitle,
      body:
        ui.verificationBody,
    },

    {
      title:
        ui.safetyTitle,
      body:
        ui.safetyBody,
    },

    {
      title:
        ui.deleteTitle,
      body:
        ui.deleteBody,
    },
  ];

  return (
    <div
      className={
        styles.androidUtilityPage
      }
    >
      <p
        className={
          styles.androidPageLead
        }
      >
        {ui.subtitle}
      </p>

      <article
        className={
          styles.androidSupportContact
        }
      >
        <div
          className={
            styles.androidSupportIcon
          }
          aria-hidden="true"
        >
          ?
        </div>

        <div
          className={
            styles.androidSupportCopy
          }
        >
          <h2>
            {ui.contactTitle}
          </h2>

          <p>
            {ui.contactBody}
          </p>

          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className={
              styles.androidSupportEmail
            }
          >
            {SUPPORT_EMAIL}
          </a>
        </div>

        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className={
            styles.androidPrimaryAction
          }
        >
          ✉{' '}
          {ui.emailButton}
        </a>
      </article>

      <section
        className={
          styles.androidSection
        }
      >
        <h2
          className={
            styles.androidSectionTitle
          }
        >
          {ui.faqTitle}
        </h2>

        <div
          className={
            styles.androidFaqGrid
          }
        >
          {faq.map(
            (
              item,
              index,
            ) => (
              <article
                className={
                  styles.androidFaqCard
                }
                key={
                  item.title
                }
              >
                <span
                  className={
                    styles.androidFaqNumber
                  }
                  aria-hidden="true"
                >
                  {index + 1}
                </span>

                <div>
                  <h3>
                    {
                      item.title
                    }
                  </h3>

                  <p>
                    {
                      item.body
                    }
                  </p>
                </div>
              </article>
            ),
          )}
        </div>
      </section>
    </div>
  );
}

function Diagnostics({
  data,
  t,
  onRefresh,
}: {
  data: unknown;
  t: Dict;
  onRefresh: () => void;
}) {
  return (
    <div
      className={
        styles.stack
      }
    >
      <article
        className={
          styles.card
        }
      >
        <div
          className={
            styles.cardAction
          }
        >
          <h2>
            Phase 28
            health check
          </h2>

          <button
            type="button"
            onClick={
              onRefresh
            }
          >
            {t.refresh}
          </button>
        </div>

        <pre>
          {JSON.stringify(
            data,
            null,
            2,
          )}
        </pre>
      </article>
    </div>
  );
}

function Cleanup({
  data,
  total,
  t,
  busy,
  confirmText,
  setConfirmText,
  onClear,
}: {
  data: PrelaunchCountsWeb | null;
  total: number;
  t: Dict;
  busy: string;
  confirmText: string;
  setConfirmText: (
    value: string,
  ) => void;
  onClear: () => void;
}) {
  return (
    <div
      className={
        styles.stack
      }
    >
      <div
        className={
          styles.metricGrid
        }
      >
        {data
          ? Object.entries(
              data,
            ).map(
              ([
                key,
                value,
              ]) => (
                <div
                  key={
                    key
                  }
                >
                  <strong>
                    {
                      value
                    }
                  </strong>

                  <span>
                    {
                      key
                    }
                  </span>
                </div>
              ),
            )
          : null}
      </div>

      <article
        className={`${styles.card} ${styles.dangerCard}`}
      >
        <h2>
          {t.total}:{' '}
          {total}
        </h2>

        <p>
          Type{' '}
          <b>
            DELETE TEST
            DATA
          </b>{' '}
          to enable
          cleanup. This
          admin action
          cannot be
          undone.
        </p>

        <input
          value={
            confirmText
          }
          onChange={(
            event,
          ) =>
            setConfirmText(
              event
                .target
                .value,
            )
          }
          placeholder="DELETE TEST DATA"
        />

        <button
          type="button"
          className={
            styles.danger
          }
          disabled={
            busy ===
              'cleanup' ||
            confirmText.trim() !==
              'DELETE TEST DATA' ||
            total === 0
          }
          onClick={
            onClear
          }
        >
          Delete {total}{' '}
          test records
        </button>
      </article>
    </div>
  );
}

function QuestAdmin({
  stats,
  quests,
  rewards,
  t,
  busy,
  toggleQuest,
  toggleReward,
}: {
  stats: QuestRewardAdminStatsWeb | null;
  quests: AdminQuestRowWeb[];
  rewards: AdminRewardRowWeb[];
  t: Dict;
  busy: string;
  toggleQuest: (
    item: AdminQuestRowWeb,
  ) => void;
  toggleReward: (
    item: AdminRewardRowWeb,
  ) => void;
}) {
  return (
    <div
      className={
        styles.stack
      }
    >
      <div
        className={
          styles.metricGrid
        }
      >
        {stats
          ? Object.entries(
              stats,
            ).map(
              ([
                key,
                value,
              ]) => (
                <div
                  key={
                    key
                  }
                >
                  <strong>
                    {
                      value
                    }
                  </strong>

                  <span>
                    {
                      key
                    }
                  </span>
                </div>
              ),
            )
          : null}
      </div>

      <article
        className={
          styles.card
        }
      >
        <h2>
          Quests
        </h2>

        <div
          className={
            styles.adminRows
          }
        >
          {quests.map(
            (
              item,
            ) => (
              <div
                key={
                  item.id
                }
              >
                <div>
                  <strong>
                    {
                      item.title
                    }
                  </strong>

                  <small>
                    {
                      item.type
                    }
                    {' · '}
                    {
                      item.points
                    }{' '}
                    pts
                  </small>
                </div>

                <button
                  type="button"
                  data-active={
                    item.active
                  }
                  disabled={
                    busy ===
                    item.id
                  }
                  onClick={() =>
                    toggleQuest(
                      item,
                    )
                  }
                >
                  {item.active
                    ? t.active
                    : t.inactive}
                </button>
              </div>
            ),
          )}
        </div>
      </article>

      <article
        className={
          styles.card
        }
      >
        <h2>
          Rewards
        </h2>

        <div
          className={
            styles.adminRows
          }
        >
          {rewards.map(
            (
              item,
            ) => (
              <div
                key={
                  item.id
                }
              >
                <div>
                  <strong>
                    {
                      item.title
                    }
                  </strong>

                  <small>
                    {
                      item.cost
                    }{' '}
                    pts
                    {item.stock ==
                    null
                      ? ''
                      : ` · stock ${item.stock}`}
                  </small>
                </div>

                <button
                  type="button"
                  data-active={
                    item.active
                  }
                  disabled={
                    busy ===
                    item.id
                  }
                  onClick={() =>
                    toggleReward(
                      item,
                    )
                  }
                >
                  {item.active
                    ? t.active
                    : t.inactive}
                </button>
              </div>
            ),
          )}
        </div>
      </article>
    </div>
  );
}

function ReviewAdmin({
  home,
  counts,
  t,
  onRefresh,
}: {
  home: {
    hasAccess: boolean;
    pendingCount: number;
  } | null;
  counts: Record<
    string,
    number
  >;
  t: Dict;
  onRefresh: () => void;
}) {
  return (
    <div
      className={
        styles.stack
      }
    >
      <article
        className={
          styles.card
        }
      >
        <div
          className={
            styles.cardAction
          }
        >
          <div>
            <h2>
              {t.pending}:{' '}
              {home?.pendingCount ??
                0}
            </h2>

            <p>
              Admin review
              queues from the
              same backend used
              by the Android
              app.
            </p>
          </div>

          <button
            type="button"
            onClick={
              onRefresh
            }
          >
            {t.refresh}
          </button>
        </div>
      </article>

      <div
        className={
          styles.metricGrid
        }
      >
        {Object.entries(
          counts,
        ).map(
          ([
            key,
            value,
          ]) => (
            <div
              key={
                key
              }
            >
              <strong>
                {
                  value
                }
              </strong>

              <span>
                {
                  key
                }
              </span>
            </div>
          ),
        )}
      </div>
    </div>
  );
}