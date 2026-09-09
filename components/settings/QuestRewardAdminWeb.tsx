'use client';

import Link from 'next/link';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { Header } from '@/components/Header';
import { useLocale } from '@/components/SiteProviders';

import {
  rpcRequest,
} from '@/lib/supabase/browser';

/* =========================================================
   TYPES
   ========================================================= */

type Row =
  Record<string, unknown>;

type LocaleKey =
  | 'th'
  | 'en'
  | 'de'
  | 'zh'
  | 'ja'
  | 'ko';

type Tab =
  | 'quests'
  | 'rewards';

type QuestRow = {
  id: string;

  slug: string;
  category: string;

  titleTh: string;
  titleEn: string;

  descriptionTh: string;
  descriptionEn: string;

  rewardPoints: number;

  rewardBadgeCode: string | null;
  rewardBadgeNameTh: string | null;
  rewardBadgeNameEn: string | null;

  verificationLevel: number;
  progressTarget: number;

  isSponsored: boolean;

  startsAt: string | null;
  endsAt: string | null;

  sortOrder: number;
  isActive: boolean;

  startedCount: number;
  completedCount: number;
  pendingReviewCount: number;
};

type RewardRow = {
  id: string;

  code: string;
  category: string;

  fulfillmentType:
    | 'partner_code'
    | 'entitlement';

  titleTh: string;
  titleEn: string;

  descriptionTh: string;
  descriptionEn: string;

  imageUrl: string;

  pointCost: number;

  stockTotal: number | null;
  stockRedeemed: number;
  stockRemaining: number | null;

  maxPerUser: number | null;

  startsAt: string | null;
  endsAt: string | null;

  walletValidityDays: number | null;

  partnerId: string | null;

  termsTh: string;
  termsEn: string;

  entitlementCode: string | null;
  entitlementDurationDays: number | null;

  isFeatured: boolean;
  isActive: boolean;

  sortOrder: number;

  redeemedCount: number;
  readyCount: number;
  usedCount: number;
  expiredCount: number;
  cancelledCount: number;
};

type Stats = {
  questTotal: number;
  questActive: number;
  questCompletedUsers: number;

  rewardTotal: number;
  rewardActive: number;
  rewardRedeemed: number;
  rewardUsed: number;
};

type QuestForm = {
  slug: string;
  category: string;

  titleTh: string;
  titleEn: string;

  descriptionTh: string;
  descriptionEn: string;

  rewardPoints: string;

  rewardBadgeCode: string;
  rewardBadgeNameTh: string;
  rewardBadgeNameEn: string;

  verificationLevel: string;
  progressTarget: string;

  startsDate: string;
  startsTime: string;

  endsDate: string;
  endsTime: string;

  sortOrder: string;

  isSponsored: boolean;
  isActive: boolean;
};

type RewardForm = {
  code: string;
  category: string;

  fulfillmentType:
    | 'partner_code'
    | 'entitlement';

  titleTh: string;
  titleEn: string;

  descriptionTh: string;
  descriptionEn: string;

  imageUrl: string;

  pointCost: string;
  stockTotal: string;
  maxPerUser: string;

  startsDate: string;
  startsTime: string;

  endsDate: string;
  endsTime: string;

  walletValidityDays: string;

  partnerId: string;

  termsTh: string;
  termsEn: string;

  entitlementCode: string;
  entitlementDurationDays: string;

  sortOrder: string;

  isFeatured: boolean;
  isActive: boolean;
};

type Editor =
  | {
      kind: 'quest';
      row: QuestRow | null;
    }
  | {
      kind: 'reward';
      row: RewardRow | null;
    }
  | null;

/* =========================================================
   COPY
   ========================================================= */

type AdminCopy = {
  title: string;
  subtitle: string;

  loading: string;

  accessDenied: string;
  accessDeniedDetail: string;

  questActive: string;
  questCompleted: string;
  rewardActive: string;
  rewardUsed: string;

  quest: string;
  reward: string;

  createQuest: string;
  createReward: string;

  editQuest: string;
  editReward: string;

  noQuest: string;
  noReward: string;

  active: string;
  inactive: string;

  sponsored: string;
  featured: string;
  partner: string;
  internal: string;

  started: string;
  completed: string;
  reviewPending: string;

  campaign: string;
  immediate: string;
  noEnd: string;

  stock: string;
  unlimited: string;
  redeemed: string;
  used: string;

  cancel: string;
  save: string;
  saving: string;

  saveSuccess: string;
  saveFailed: string;

  requiredFields: string;
  invalidTime: string;
  invalidRange: string;

  slug: string;
  questCategory: string;

  titleTh: string;
  titleEn: string;

  descriptionTh: string;
  descriptionEn: string;

  meloPoints: string;
  progressTarget: string;

  verificationLevel: string;

  badgeCode: string;
  badgeNameTh: string;
  badgeNameEn: string;

  startDate: string;
  startTime: string;

  endDate: string;
  endTime: string;

  sortOrder: string;

  sponsoredQuest: string;
  enabled: string;

  rewardCode: string;
  rewardCategory: string;
  fulfillmentType: string;

  imageUrl: string;

  pointCost: string;
  stockTotal: string;

  maxPerUser: string;
  walletValidityDays: string;

  partnerId: string;

  entitlementCode: string;
  entitlementDuration: string;

  termsTh: string;
  termsEn: string;

  featuredReward: string;

  emptyDateStart: string;
  emptyDateEnd: string;

  generalPartner: string;
};

const COPY:
  Record<
    LocaleKey,
    AdminCopy
  > = {
  th: {
    title:
      'Quest & Reward Admin',

    subtitle:
      'จัดการภารกิจ แคมเปญ คะแนน รางวัล และสต็อก',

    loading:
      'กำลังโหลดข้อมูล...',

    accessDenied:
      'ไม่มีสิทธิ์จัดการ Quest / Reward',

    accessDeniedDetail:
      'โมดูลนี้เปิดเฉพาะ Admin และ Super Admin ที่เปิดใช้งานอยู่เท่านั้น',

    questActive:
      'Quest เปิด',

    questCompleted:
      'Quest สำเร็จ',

    rewardActive:
      'Reward เปิด',

    rewardUsed:
      'ใช้แล้ว',

    quest:
      'Quest',

    reward:
      'Reward',

    createQuest:
      'สร้าง Quest',

    createReward:
      'สร้าง Reward',

    editQuest:
      'แก้ไข Quest',

    editReward:
      'แก้ไข Reward',

    noQuest:
      'ยังไม่มี Quest',

    noReward:
      'ยังไม่มี Reward',

    active:
      'เปิด',

    inactive:
      'ปิด',

    sponsored:
      'Sponsored',

    featured:
      'Featured',

    partner:
      'Partner',

    internal:
      'Internal',

    started:
      'เริ่ม',

    completed:
      'สำเร็จ',

    reviewPending:
      'รอตรวจ',

    campaign:
      'แคมเปญ',

    immediate:
      'ทันที',

    noEnd:
      'ไม่สิ้นสุด',

    stock:
      'สต็อก',

    unlimited:
      'ไม่จำกัด',

    redeemed:
      'แลก',

    used:
      'ใช้แล้ว',

    cancel:
      'ยกเลิก',

    save:
      'บันทึก',

    saving:
      'กำลังบันทึก...',

    saveSuccess:
      'บันทึกสำเร็จ',

    saveFailed:
      'บันทึกไม่สำเร็จ',

    requiredFields:
      'กรุณากรอกข้อมูลที่จำเป็นให้ครบ',

    invalidTime:
      'กรุณาตรวจสอบรูปแบบเวลา',

    invalidRange:
      'วันและเวลาสิ้นสุดต้องอยู่หลังวันและเวลาเริ่ม',

    slug:
      'Slug / รหัส Quest *',

    questCategory:
      'หมวด Quest',

    titleTh:
      'ชื่อภาษาไทย *',

    titleEn:
      'ชื่อภาษาอังกฤษ *',

    descriptionTh:
      'รายละเอียดภาษาไทย',

    descriptionEn:
      'รายละเอียดภาษาอังกฤษ',

    meloPoints:
      'Melo Points',

    progressTarget:
      'Progress target',

    verificationLevel:
      'Verification level',

    badgeCode:
      'Badge code',

    badgeNameTh:
      'ชื่อ Badge ภาษาไทย',

    badgeNameEn:
      'ชื่อ Badge ภาษาอังกฤษ',

    startDate:
      'วันที่เริ่มแคมเปญ',

    startTime:
      'เวลาเริ่ม',

    endDate:
      'วันที่สิ้นสุดแคมเปญ',

    endTime:
      'เวลาสิ้นสุด',

    sortOrder:
      'ลำดับ',

    sponsoredQuest:
      'Sponsored Quest',

    enabled:
      'เปิดใช้งาน',

    rewardCode:
      'Reward code *',

    rewardCategory:
      'หมวด Reward',

    fulfillmentType:
      'รูปแบบสิทธิ์',

    imageUrl:
      'Image URL',

    pointCost:
      'Point cost',

    stockTotal:
      'Stock (ว่าง = ไม่จำกัด)',

    maxPerUser:
      'สูงสุด / คน',

    walletValidityDays:
      'Wallet อายุ (วัน)',

    partnerId:
      'Partner business UUID',

    entitlementCode:
      'Entitlement code *',

    entitlementDuration:
      'Entitlement duration (วัน)',

    termsTh:
      'เงื่อนไขภาษาไทย',

    termsEn:
      'เงื่อนไขภาษาอังกฤษ',

    featuredReward:
      'Featured Reward',

    emptyDateStart:
      'เว้นว่าง = เริ่มทันที',

    emptyDateEnd:
      'เว้นว่าง = ไม่จำกัด',

    generalPartner:
      'เว้นว่าง = Partner ที่รองรับทั่วไป',
  },

  en: {
    title:
      'Quest & Reward Admin',

    subtitle:
      'Manage quests, campaigns, points, rewards and stock.',

    loading:
      'Loading...',

    accessDenied:
      'Quest / Reward access denied',

    accessDeniedDetail:
      'This module is available only to active Admin and Super Admin accounts.',

    questActive:
      'Active quests',

    questCompleted:
      'Quest completions',

    rewardActive:
      'Active rewards',

    rewardUsed:
      'Used',

    quest:
      'Quest',

    reward:
      'Reward',

    createQuest:
      'Create Quest',

    createReward:
      'Create Reward',

    editQuest:
      'Edit Quest',

    editReward:
      'Edit Reward',

    noQuest:
      'No quests yet',

    noReward:
      'No rewards yet',

    active:
      'Active',

    inactive:
      'Inactive',

    sponsored:
      'Sponsored',

    featured:
      'Featured',

    partner:
      'Partner',

    internal:
      'Internal',

    started:
      'Started',

    completed:
      'Completed',

    reviewPending:
      'Pending review',

    campaign:
      'Campaign',

    immediate:
      'Immediately',

    noEnd:
      'No end date',

    stock:
      'Stock',

    unlimited:
      'Unlimited',

    redeemed:
      'Redeemed',

    used:
      'Used',

    cancel:
      'Cancel',

    save:
      'Save',

    saving:
      'Saving...',

    saveSuccess:
      'Saved successfully',

    saveFailed:
      'Unable to save',

    requiredFields:
      'Please complete all required fields.',

    invalidTime:
      'Please check the time format.',

    invalidRange:
      'The end date and time must be after the start date and time.',

    slug:
      'Quest slug *',

    questCategory:
      'Quest category',

    titleTh:
      'Thai title *',

    titleEn:
      'English title *',

    descriptionTh:
      'Thai description',

    descriptionEn:
      'English description',

    meloPoints:
      'Melo Points',

    progressTarget:
      'Progress target',

    verificationLevel:
      'Verification level',

    badgeCode:
      'Badge code',

    badgeNameTh:
      'Thai badge name',

    badgeNameEn:
      'English badge name',

    startDate:
      'Campaign start date',

    startTime:
      'Start time',

    endDate:
      'Campaign end date',

    endTime:
      'End time',

    sortOrder:
      'Sort order',

    sponsoredQuest:
      'Sponsored Quest',

    enabled:
      'Enabled',

    rewardCode:
      'Reward code *',

    rewardCategory:
      'Reward category',

    fulfillmentType:
      'Fulfillment type',

    imageUrl:
      'Image URL',

    pointCost:
      'Point cost',

    stockTotal:
      'Stock (blank = unlimited)',

    maxPerUser:
      'Maximum per user',

    walletValidityDays:
      'Wallet validity (days)',

    partnerId:
      'Partner business UUID',

    entitlementCode:
      'Entitlement code *',

    entitlementDuration:
      'Entitlement duration (days)',

    termsTh:
      'Thai terms',

    termsEn:
      'English terms',

    featuredReward:
      'Featured Reward',

    emptyDateStart:
      'Blank = start immediately',

    emptyDateEnd:
      'Blank = no end date',

    generalPartner:
      'Blank = any supported Partner',
  },

  de: {
    title:
      'Quest & Reward Admin',

    subtitle:
      'Quests, Kampagnen, Punkte, Belohnungen und Bestand verwalten.',

    loading:
      'Wird geladen...',

    accessDenied:
      'Kein Zugriff auf Quest / Reward',

    accessDeniedDetail:
      'Dieses Modul ist nur für aktive Admin- und Super-Admin-Konten verfügbar.',

    questActive:
      'Aktive Quests',

    questCompleted:
      'Quest-Abschlüsse',

    rewardActive:
      'Aktive Rewards',

    rewardUsed:
      'Verwendet',

    quest:
      'Quest',

    reward:
      'Reward',

    createQuest:
      'Quest erstellen',

    createReward:
      'Reward erstellen',

    editQuest:
      'Quest bearbeiten',

    editReward:
      'Reward bearbeiten',

    noQuest:
      'Noch keine Quests',

    noReward:
      'Noch keine Rewards',

    active:
      'Aktiv',

    inactive:
      'Inaktiv',

    sponsored:
      'Sponsored',

    featured:
      'Featured',

    partner:
      'Partner',

    internal:
      'Intern',

    started:
      'Gestartet',

    completed:
      'Abgeschlossen',

    reviewPending:
      'Prüfung offen',

    campaign:
      'Kampagne',

    immediate:
      'Sofort',

    noEnd:
      'Ohne Enddatum',

    stock:
      'Bestand',

    unlimited:
      'Unbegrenzt',

    redeemed:
      'Eingelöst',

    used:
      'Verwendet',

    cancel:
      'Abbrechen',

    save:
      'Speichern',

    saving:
      'Wird gespeichert...',

    saveSuccess:
      'Erfolgreich gespeichert',

    saveFailed:
      'Speichern fehlgeschlagen',

    requiredFields:
      'Bitte alle Pflichtfelder ausfüllen.',

    invalidTime:
      'Bitte das Zeitformat prüfen.',

    invalidRange:
      'Enddatum und -zeit müssen nach dem Start liegen.',

    slug:
      'Quest-Slug *',

    questCategory:
      'Quest-Kategorie',

    titleTh:
      'Titel auf Thai *',

    titleEn:
      'Titel auf Englisch *',

    descriptionTh:
      'Beschreibung auf Thai',

    descriptionEn:
      'Beschreibung auf Englisch',

    meloPoints:
      'Melo Points',

    progressTarget:
      'Fortschrittsziel',

    verificationLevel:
      'Verifizierungsstufe',

    badgeCode:
      'Badge-Code',

    badgeNameTh:
      'Badge-Name auf Thai',

    badgeNameEn:
      'Badge-Name auf Englisch',

    startDate:
      'Startdatum der Kampagne',

    startTime:
      'Startzeit',

    endDate:
      'Enddatum der Kampagne',

    endTime:
      'Endzeit',

    sortOrder:
      'Sortierung',

    sponsoredQuest:
      'Sponsored Quest',

    enabled:
      'Aktiviert',

    rewardCode:
      'Reward-Code *',

    rewardCategory:
      'Reward-Kategorie',

    fulfillmentType:
      'Einlöseart',

    imageUrl:
      'Bild-URL',

    pointCost:
      'Punktekosten',

    stockTotal:
      'Bestand (leer = unbegrenzt)',

    maxPerUser:
      'Maximum pro Nutzer',

    walletValidityDays:
      'Wallet-Gültigkeit (Tage)',

    partnerId:
      'Partner Business UUID',

    entitlementCode:
      'Entitlement-Code *',

    entitlementDuration:
      'Entitlement-Dauer (Tage)',

    termsTh:
      'Bedingungen auf Thai',

    termsEn:
      'Bedingungen auf Englisch',

    featuredReward:
      'Featured Reward',

    emptyDateStart:
      'Leer = sofort starten',

    emptyDateEnd:
      'Leer = kein Enddatum',

    generalPartner:
      'Leer = alle unterstützten Partner',
  },

  zh: {
    title:
      'Quest & Reward 管理',

    subtitle:
      '管理任务、活动、积分、奖励和库存。',

    loading:
      '加载中...',

    accessDenied:
      '无权管理 Quest / Reward',

    accessDeniedDetail:
      '此模块仅对已启用的 Admin 和 Super Admin 开放。',

    questActive:
      '已启用 Quest',

    questCompleted:
      'Quest 完成',

    rewardActive:
      '已启用 Reward',

    rewardUsed:
      '已使用',

    quest:
      'Quest',

    reward:
      'Reward',

    createQuest:
      '创建 Quest',

    createReward:
      '创建 Reward',

    editQuest:
      '编辑 Quest',

    editReward:
      '编辑 Reward',

    noQuest:
      '暂无 Quest',

    noReward:
      '暂无 Reward',

    active:
      '启用',

    inactive:
      '停用',

    sponsored:
      'Sponsored',

    featured:
      'Featured',

    partner:
      'Partner',

    internal:
      '内部',

    started:
      '开始',

    completed:
      '完成',

    reviewPending:
      '待审核',

    campaign:
      '活动',

    immediate:
      '立即',

    noEnd:
      '无结束日期',

    stock:
      '库存',

    unlimited:
      '无限',

    redeemed:
      '已兑换',

    used:
      '已使用',

    cancel:
      '取消',

    save:
      '保存',

    saving:
      '保存中...',

    saveSuccess:
      '保存成功',

    saveFailed:
      '保存失败',

    requiredFields:
      '请填写所有必填字段。',

    invalidTime:
      '请检查时间格式。',

    invalidRange:
      '结束日期和时间必须晚于开始日期和时间。',

    slug:
      'Quest Slug *',

    questCategory:
      'Quest 分类',

    titleTh:
      '泰文名称 *',

    titleEn:
      '英文名称 *',

    descriptionTh:
      '泰文说明',

    descriptionEn:
      '英文说明',

    meloPoints:
      'Melo Points',

    progressTarget:
      '进度目标',

    verificationLevel:
      '验证等级',

    badgeCode:
      'Badge code',

    badgeNameTh:
      '泰文 Badge 名称',

    badgeNameEn:
      '英文 Badge 名称',

    startDate:
      '活动开始日期',

    startTime:
      '开始时间',

    endDate:
      '活动结束日期',

    endTime:
      '结束时间',

    sortOrder:
      '排序',

    sponsoredQuest:
      'Sponsored Quest',

    enabled:
      '启用',

    rewardCode:
      'Reward code *',

    rewardCategory:
      'Reward 分类',

    fulfillmentType:
      '发放方式',

    imageUrl:
      '图片 URL',

    pointCost:
      '积分成本',

    stockTotal:
      '库存（空白 = 无限）',

    maxPerUser:
      '每位用户上限',

    walletValidityDays:
      'Wallet 有效期（天）',

    partnerId:
      'Partner business UUID',

    entitlementCode:
      'Entitlement code *',

    entitlementDuration:
      'Entitlement 有效期（天）',

    termsTh:
      '泰文条款',

    termsEn:
      '英文条款',

    featuredReward:
      'Featured Reward',

    emptyDateStart:
      '空白 = 立即开始',

    emptyDateEnd:
      '空白 = 无结束日期',

    generalPartner:
      '空白 = 所有支持的 Partner',
  },

  ja: {
    title:
      'Quest & Reward 管理',

    subtitle:
      'クエスト、キャンペーン、ポイント、報酬、在庫を管理します。',

    loading:
      '読み込み中...',

    accessDenied:
      'Quest / Reward を管理する権限がありません',

    accessDeniedDetail:
      'このモジュールは有効な Admin / Super Admin のみ利用できます。',

    questActive:
      '有効な Quest',

    questCompleted:
      'Quest 完了',

    rewardActive:
      '有効な Reward',

    rewardUsed:
      '使用済み',

    quest:
      'Quest',

    reward:
      'Reward',

    createQuest:
      'Quest を作成',

    createReward:
      'Reward を作成',

    editQuest:
      'Quest を編集',

    editReward:
      'Reward を編集',

    noQuest:
      'Quest はまだありません',

    noReward:
      'Reward はまだありません',

    active:
      '有効',

    inactive:
      '無効',

    sponsored:
      'Sponsored',

    featured:
      'Featured',

    partner:
      'Partner',

    internal:
      'Internal',

    started:
      '開始',

    completed:
      '完了',

    reviewPending:
      '審査待ち',

    campaign:
      'キャンペーン',

    immediate:
      'すぐに開始',

    noEnd:
      '終了日なし',

    stock:
      '在庫',

    unlimited:
      '無制限',

    redeemed:
      '交換済み',

    used:
      '使用済み',

    cancel:
      'キャンセル',

    save:
      '保存',

    saving:
      '保存中...',

    saveSuccess:
      '保存しました',

    saveFailed:
      '保存できませんでした',

    requiredFields:
      '必須項目を入力してください。',

    invalidTime:
      '時刻形式を確認してください。',

    invalidRange:
      '終了日時は開始日時より後にしてください。',

    slug:
      'Quest Slug *',

    questCategory:
      'Quest カテゴリ',

    titleTh:
      'タイ語タイトル *',

    titleEn:
      '英語タイトル *',

    descriptionTh:
      'タイ語説明',

    descriptionEn:
      '英語説明',

    meloPoints:
      'Melo Points',

    progressTarget:
      'Progress target',

    verificationLevel:
      'Verification level',

    badgeCode:
      'Badge code',

    badgeNameTh:
      'タイ語 Badge 名',

    badgeNameEn:
      '英語 Badge 名',

    startDate:
      'キャンペーン開始日',

    startTime:
      '開始時刻',

    endDate:
      'キャンペーン終了日',

    endTime:
      '終了時刻',

    sortOrder:
      '並び順',

    sponsoredQuest:
      'Sponsored Quest',

    enabled:
      '有効',

    rewardCode:
      'Reward code *',

    rewardCategory:
      'Reward カテゴリ',

    fulfillmentType:
      '付与方式',

    imageUrl:
      '画像 URL',

    pointCost:
      '必要ポイント',

    stockTotal:
      '在庫（空欄 = 無制限）',

    maxPerUser:
      '1ユーザー上限',

    walletValidityDays:
      'Wallet 有効日数',

    partnerId:
      'Partner business UUID',

    entitlementCode:
      'Entitlement code *',

    entitlementDuration:
      'Entitlement 期間（日）',

    termsTh:
      'タイ語利用条件',

    termsEn:
      '英語利用条件',

    featuredReward:
      'Featured Reward',

    emptyDateStart:
      '空欄 = すぐに開始',

    emptyDateEnd:
      '空欄 = 終了日なし',

    generalPartner:
      '空欄 = 対応する全 Partner',
  },

  ko: {
    title:
      'Quest & Reward 관리',

    subtitle:
      '퀘스트, 캠페인, 포인트, 보상 및 재고를 관리합니다.',

    loading:
      '불러오는 중...',

    accessDenied:
      'Quest / Reward 관리 권한이 없습니다',

    accessDeniedDetail:
      '이 모듈은 활성 Admin 및 Super Admin 계정만 사용할 수 있습니다.',

    questActive:
      '활성 Quest',

    questCompleted:
      'Quest 완료',

    rewardActive:
      '활성 Reward',

    rewardUsed:
      '사용 완료',

    quest:
      'Quest',

    reward:
      'Reward',

    createQuest:
      'Quest 만들기',

    createReward:
      'Reward 만들기',

    editQuest:
      'Quest 수정',

    editReward:
      'Reward 수정',

    noQuest:
      'Quest가 없습니다',

    noReward:
      'Reward가 없습니다',

    active:
      '활성',

    inactive:
      '비활성',

    sponsored:
      'Sponsored',

    featured:
      'Featured',

    partner:
      'Partner',

    internal:
      'Internal',

    started:
      '시작',

    completed:
      '완료',

    reviewPending:
      '검토 대기',

    campaign:
      '캠페인',

    immediate:
      '즉시',

    noEnd:
      '종료일 없음',

    stock:
      '재고',

    unlimited:
      '무제한',

    redeemed:
      '교환',

    used:
      '사용',

    cancel:
      '취소',

    save:
      '저장',

    saving:
      '저장 중...',

    saveSuccess:
      '저장되었습니다',

    saveFailed:
      '저장하지 못했습니다',

    requiredFields:
      '필수 항목을 모두 입력하세요.',

    invalidTime:
      '시간 형식을 확인하세요.',

    invalidRange:
      '종료 날짜와 시간은 시작 이후여야 합니다.',

    slug:
      'Quest slug *',

    questCategory:
      'Quest 카테고리',

    titleTh:
      '태국어 제목 *',

    titleEn:
      '영어 제목 *',

    descriptionTh:
      '태국어 설명',

    descriptionEn:
      '영어 설명',

    meloPoints:
      'Melo Points',

    progressTarget:
      'Progress target',

    verificationLevel:
      'Verification level',

    badgeCode:
      'Badge code',

    badgeNameTh:
      '태국어 Badge 이름',

    badgeNameEn:
      '영어 Badge 이름',

    startDate:
      '캠페인 시작일',

    startTime:
      '시작 시간',

    endDate:
      '캠페인 종료일',

    endTime:
      '종료 시간',

    sortOrder:
      '정렬 순서',

    sponsoredQuest:
      'Sponsored Quest',

    enabled:
      '활성화',

    rewardCode:
      'Reward code *',

    rewardCategory:
      'Reward 카테고리',

    fulfillmentType:
      '지급 방식',

    imageUrl:
      '이미지 URL',

    pointCost:
      '필요 포인트',

    stockTotal:
      '재고 (빈칸 = 무제한)',

    maxPerUser:
      '사용자당 최대',

    walletValidityDays:
      'Wallet 유효 기간 (일)',

    partnerId:
      'Partner business UUID',

    entitlementCode:
      'Entitlement code *',

    entitlementDuration:
      'Entitlement 기간 (일)',

    termsTh:
      '태국어 조건',

    termsEn:
      '영어 조건',

    featuredReward:
      'Featured Reward',

    emptyDateStart:
      '빈칸 = 즉시 시작',

    emptyDateEnd:
      '빈칸 = 종료일 없음',

    generalPartner:
      '빈칸 = 지원되는 모든 Partner',
  },
};

/* =========================================================
   CONSTANTS
   ========================================================= */

const EMPTY_STATS:
  Stats = {
  questTotal: 0,
  questActive: 0,
  questCompletedUsers: 0,

  rewardTotal: 0,
  rewardActive: 0,
  rewardRedeemed: 0,
  rewardUsed: 0,
};

const QUEST_CATEGORIES = [
  'travel',
  'event',
  'partner',
  'social',
  'explore',
  'special',
];

const REWARD_CATEGORIES = [
  'voucher',
  'travel',
  'partner',
  'badge',
  'premium',
];

/* =========================================================
   HELPERS
   ========================================================= */

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
  locale: LocaleKey,
) {
  return {
    th: 'th-TH',
    en: 'en-US',
    de: 'de-DE',
    zh: 'zh-CN',
    ja: 'ja-JP',
    ko: 'ko-KR',
  }[locale];
}

function rowsOf(
  value: unknown,
): Row[] {
  if (
    Array.isArray(
      value,
    )
  ) {
    return value.filter(
      (
        item,
      ): item is Row =>
        Boolean(
          item,
        ) &&
        typeof item ===
          'object',
    );
  }

  if (
    value &&
    typeof value ===
      'object'
  ) {
    return [
      value as Row,
    ];
  }

  return [];
}

function text(
  row:
    | Row
    | null
    | undefined,
  ...keys: string[]
) {
  if (!row) {
    return '';
  }

  for (
    const key
    of keys
  ) {
    const value =
      row[key];

    if (
      typeof value ===
        'string' &&
      value.trim()
    ) {
      return value.trim();
    }

    if (
      typeof value ===
        'number' &&
      Number.isFinite(
        value,
      )
    ) {
      return String(
        value,
      );
    }
  }

  return '';
}

function num(
  row:
    | Row
    | null
    | undefined,
  key: string,
  fallback = 0,
) {
  if (!row) {
    return fallback;
  }

  const value =
    Number(
      row[key],
    );

  return Number.isFinite(
    value,
  )
    ? value
    : fallback;
}

function nullableNum(
  value: unknown,
) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return null;
  }

  const result =
    Number(value);

  return Number.isFinite(
    result,
  )
    ? result
    : null;
}

function bool(
  row:
    | Row
    | null
    | undefined,
  key: string,
  fallback = false,
) {
  if (!row) {
    return fallback;
  }

  const value =
    row[key];

  if (
    typeof value ===
    'boolean'
  ) {
    return value;
  }

  if (
    value === 1 ||
    value === '1' ||
    value === 'true'
  ) {
    return true;
  }

  if (
    value === 0 ||
    value === '0' ||
    value === 'false'
  ) {
    return false;
  }

  return fallback;
}

function nullableText(
  value: unknown,
) {
  const result =
    String(
      value ?? '',
    ).trim();

  return result ||
    null;
}

function n(
  value: string,
  fallback = 0,
) {
  const parsed =
    Number(value);

  return Number.isFinite(
    parsed,
  )
    ? parsed
    : fallback;
}

function nullableN(
  value: string,
): number | null {
  const clean =
    value.trim();

  if (!clean) {
    return null;
  }

  const parsed =
    Number(clean);

  return Number.isFinite(
    parsed,
  )
    ? parsed
    : null;
}

function adminError(
  message: string,
) {
  const upper =
    message.toUpperCase();

  if (
    upper.includes(
      'MELO_QUEST_REWARD_ADMIN_REQUIRED',
    )
  ) {
    return new Error(
      'บัญชีนี้ไม่มีสิทธิ์จัดการ Quest และ Reward',
    );
  }

  if (
    upper.includes(
      'STEP8_6_DEPENDENCY_REQUIRED',
    )
  ) {
    return new Error(
      'ยังติดตั้ง SQL ของ Quest / Reward / Admin Review ไม่ครบ',
    );
  }

  return new Error(
    message ||
      'Supabase request failed.',
  );
}

function campaignParts(
  value:
    | string
    | null
    | undefined,
) {
  if (!value) {
    return {
      date: '',
      time: '',
    };
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return {
      date: '',
      time: '',
    };
  }

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() +
        1,
    ).padStart(
      2,
      '0',
    );

  const day =
    String(
      date.getDate(),
    ).padStart(
      2,
      '0',
    );

  const hour =
    String(
      date.getHours(),
    ).padStart(
      2,
      '0',
    );

  const minute =
    String(
      date.getMinutes(),
    ).padStart(
      2,
      '0',
    );

  return {
    date:
      `${year}-${month}-${day}`,

    time:
      `${hour}:${minute}`,
  };
}

function validTime(
  value: string,
) {
  if (
    !/^\d{2}:\d{2}$/.test(
      value,
    )
  ) {
    return false;
  }

  const [
    hour,
    minute,
  ] =
    value
      .split(':')
      .map(Number);

  return (
    hour >= 0 &&
    hour <= 23 &&
    minute >= 0 &&
    minute <= 59
  );
}

function buildCampaignIso(
  dateValue: string,
  timeValue: string,
  fallbackTime: string,
): string | null {
  const cleanDate =
    dateValue.trim();

  if (!cleanDate) {
    return null;
  }

  const cleanTime =
    timeValue.trim() ||
    fallbackTime;

  if (
    !validTime(
      cleanTime,
    )
  ) {
    return null;
  }

  const candidate =
    new Date(
      `${cleanDate}T${cleanTime}:00`,
    );

  if (
    Number.isNaN(
      candidate.getTime(),
    )
  ) {
    return null;
  }

  return candidate.toISOString();
}

function questForm(
  row:
    | QuestRow
    | null,
): QuestForm {
  const starts =
    campaignParts(
      row?.startsAt,
    );

  const ends =
    campaignParts(
      row?.endsAt,
    );

  return {
    slug:
      row?.slug ??
      '',

    category:
      row?.category ??
      'travel',

    titleTh:
      row?.titleTh ??
      '',

    titleEn:
      row?.titleEn ??
      '',

    descriptionTh:
      row?.descriptionTh ??
      '',

    descriptionEn:
      row?.descriptionEn ??
      '',

    rewardPoints:
      String(
        row?.rewardPoints ??
          50,
      ),

    rewardBadgeCode:
      row?.rewardBadgeCode ??
      '',

    rewardBadgeNameTh:
      row?.rewardBadgeNameTh ??
      '',

    rewardBadgeNameEn:
      row?.rewardBadgeNameEn ??
      '',

    verificationLevel:
      String(
        row?.verificationLevel ??
          1,
      ),

    progressTarget:
      String(
        row?.progressTarget ??
          1,
      ),

    startsDate:
      starts.date,

    startsTime:
      starts.time,

    endsDate:
      ends.date,

    endsTime:
      ends.time,

    sortOrder:
      String(
        row?.sortOrder ??
          0,
      ),

    isSponsored:
      row?.isSponsored ??
      false,

    isActive:
      row?.isActive ??
      true,
  };
}

function rewardForm(
  row:
    | RewardRow
    | null,
): RewardForm {
  const starts =
    campaignParts(
      row?.startsAt,
    );

  const ends =
    campaignParts(
      row?.endsAt,
    );

  return {
    code:
      row?.code ??
      '',

    category:
      row?.category ??
      'voucher',

    fulfillmentType:
      row?.fulfillmentType ??
      'partner_code',

    titleTh:
      row?.titleTh ??
      '',

    titleEn:
      row?.titleEn ??
      '',

    descriptionTh:
      row?.descriptionTh ??
      '',

    descriptionEn:
      row?.descriptionEn ??
      '',

    imageUrl:
      row?.imageUrl ??
      '',

    pointCost:
      String(
        row?.pointCost ??
          200,
      ),

    stockTotal:
      row?.stockTotal ==
      null
        ? ''
        : String(
            row.stockTotal,
          ),

    maxPerUser:
      row?.maxPerUser ==
      null
        ? ''
        : String(
            row.maxPerUser,
          ),

    startsDate:
      starts.date,

    startsTime:
      starts.time,

    endsDate:
      ends.date,

    endsTime:
      ends.time,

    walletValidityDays:
      row?.walletValidityDays ==
      null
        ? ''
        : String(
            row.walletValidityDays,
          ),

    partnerId:
      row?.partnerId ??
      '',

    termsTh:
      row?.termsTh ??
      '',

    termsEn:
      row?.termsEn ??
      '',

    entitlementCode:
      row?.entitlementCode ??
      '',

    entitlementDurationDays:
      row?.entitlementDurationDays ==
      null
        ? ''
        : String(
            row.entitlementDurationDays,
          ),

    sortOrder:
      String(
        row?.sortOrder ??
          0,
      ),

    isFeatured:
      row?.isFeatured ??
      false,

    isActive:
      row?.isActive ??
      true,
  };
}

function formatCampaign(
  value:
    | string
    | null,
  locale: LocaleKey,
) {
  if (!value) {
    return '';
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

  try {
    return new Intl.DateTimeFormat(
      localeTag(
        locale,
      ),
      {
        dateStyle:
          'medium',

        timeStyle:
          'short',
      },
    ).format(
      date,
    );
  } catch {
    return value;
  }
}

function localizedTitle(
  row:
    | QuestRow
    | RewardRow,
  locale: LocaleKey,
) {
  return locale ===
    'th'
    ? row.titleTh ||
        row.titleEn
    : row.titleEn ||
        row.titleTh;
}

/* =========================================================
   API
   ========================================================= */

async function loadAccess() {
  const result =
    await rpcRequest<
      Row | Row[]
    >(
      'get_my_melo_quest_reward_admin_access_v1',
    );

  if (
    result.error
  ) {
    throw adminError(
      result.error,
    );
  }

  const row =
    rowsOf(
      result.data,
    )[0] ?? {};

  return {
    allowed:
      bool(
        row,
        'allowed',
      ),

    role:
      text(
        row,
        'role',
      ) ||
      'user',
  };
}

async function loadStats(): Promise<Stats> {
  const result =
    await rpcRequest<
      Row | Row[]
    >(
      'admin_get_melo_quest_reward_stats_v1',
    );

  if (
    result.error
  ) {
    throw adminError(
      result.error,
    );
  }

  const row =
    rowsOf(
      result.data,
    )[0] ?? {};

  return {
    questTotal:
      num(
        row,
        'quest_total',
      ),

    questActive:
      num(
        row,
        'quest_active',
      ),

    questCompletedUsers:
      num(
        row,
        'quest_completed_users',
      ),

    rewardTotal:
      num(
        row,
        'reward_total',
      ),

    rewardActive:
      num(
        row,
        'reward_active',
      ),

    rewardRedeemed:
      num(
        row,
        'reward_redeemed',
      ),

    rewardUsed:
      num(
        row,
        'reward_used',
      ),
  };
}

async function listQuests(): Promise<QuestRow[]> {
  const result =
    await rpcRequest<
      Row[]
    >(
      'admin_list_melo_quests_v1',
    );

  if (
    result.error
  ) {
    throw adminError(
      result.error,
    );
  }

  return rowsOf(
    result.data,
  )
    .map(
      (
        row,
      ): QuestRow => ({
        id:
          text(
            row,
            'id',
          ),

        slug:
          text(
            row,
            'slug',
          ),

        category:
          text(
            row,
            'category',
          ) ||
          'special',

        titleTh:
          text(
            row,
            'title_th',
          ),

        titleEn:
          text(
            row,
            'title_en',
          ),

        descriptionTh:
          text(
            row,
            'description_th',
          ),

        descriptionEn:
          text(
            row,
            'description_en',
          ),

        rewardPoints:
          num(
            row,
            'reward_points',
          ),

        rewardBadgeCode:
          nullableText(
            row.reward_badge_code,
          ),

        rewardBadgeNameTh:
          nullableText(
            row.reward_badge_name_th,
          ),

        rewardBadgeNameEn:
          nullableText(
            row.reward_badge_name_en,
          ),

        verificationLevel:
          Math.max(
            1,
            Math.min(
              3,
              num(
                row,
                'verification_level',
                1,
              ),
            ),
          ),

        progressTarget:
          Math.max(
            1,
            num(
              row,
              'progress_target',
              1,
            ),
          ),

        isSponsored:
          bool(
            row,
            'is_sponsored',
          ),

        startsAt:
          nullableText(
            row.starts_at,
          ),

        endsAt:
          nullableText(
            row.ends_at,
          ),

        sortOrder:
          num(
            row,
            'sort_order',
          ),

        isActive:
          bool(
            row,
            'is_active',
          ),

        startedCount:
          num(
            row,
            'started_count',
          ),

        completedCount:
          num(
            row,
            'completed_count',
          ),

        pendingReviewCount:
          num(
            row,
            'pending_review_count',
          ),
      }),
    )
    .filter(
      (
        item,
      ) =>
        Boolean(
          item.id,
        ),
    );
}

async function listRewards(): Promise<RewardRow[]> {
  const result =
    await rpcRequest<
      Row[]
    >(
      'admin_list_melo_rewards_v1',
    );

  if (
    result.error
  ) {
    throw adminError(
      result.error,
    );
  }

  return rowsOf(
    result.data,
  )
    .map(
      (
        row,
      ): RewardRow => ({
        id:
          text(
            row,
            'id',
          ),

        code:
          text(
            row,
            'code',
          ),

        category:
          text(
            row,
            'category',
          ) ||
          'voucher',

        fulfillmentType:
          row.fulfillment_type ===
          'entitlement'
            ? 'entitlement'
            : 'partner_code',

        titleTh:
          text(
            row,
            'title_th',
          ),

        titleEn:
          text(
            row,
            'title_en',
          ),

        descriptionTh:
          text(
            row,
            'description_th',
          ),

        descriptionEn:
          text(
            row,
            'description_en',
          ),

        imageUrl:
          text(
            row,
            'image_url',
          ),

        pointCost:
          num(
            row,
            'point_cost',
          ),

        stockTotal:
          nullableNum(
            row.stock_total,
          ),

        stockRedeemed:
          num(
            row,
            'stock_redeemed',
          ),

        stockRemaining:
          nullableNum(
            row.stock_remaining,
          ),

        maxPerUser:
          nullableNum(
            row.max_per_user,
          ),

        startsAt:
          nullableText(
            row.starts_at,
          ),

        endsAt:
          nullableText(
            row.ends_at,
          ),

        walletValidityDays:
          nullableNum(
            row.wallet_validity_days,
          ),

        partnerId:
          nullableText(
            row.partner_id,
          ),

        termsTh:
          text(
            row,
            'terms_th',
          ),

        termsEn:
          text(
            row,
            'terms_en',
          ),

        entitlementCode:
          nullableText(
            row.entitlement_code,
          ),

        entitlementDurationDays:
          nullableNum(
            row.entitlement_duration_days,
          ),

        isFeatured:
          bool(
            row,
            'is_featured',
          ),

        isActive:
          bool(
            row,
            'is_active',
          ),

        sortOrder:
          num(
            row,
            'sort_order',
          ),

        redeemedCount:
          num(
            row,
            'redeemed_count',
          ),

        readyCount:
          num(
            row,
            'ready_count',
          ),

        usedCount:
          num(
            row,
            'used_count',
          ),

        expiredCount:
          num(
            row,
            'expired_count',
          ),

        cancelledCount:
          num(
            row,
            'cancelled_count',
          ),
      }),
    )
    .filter(
      (
        item,
      ) =>
        Boolean(
          item.id,
        ),
    );
}

async function saveQuestApi(
  row:
    | QuestRow
    | null,

  form:
    QuestForm,
) {
  const startsAt =
    buildCampaignIso(
      form.startsDate,
      form.startsTime,
      '00:00',
    );

  const endsAt =
    buildCampaignIso(
      form.endsDate,
      form.endsTime,
      '23:59',
    );

  const result =
    await rpcRequest(
      'admin_upsert_melo_quest_v1',
      {
        p_payload: {
          id:
            row?.id ??
            null,

          slug:
            form.slug.trim(),

          category:
            form.category,

          title_th:
            form.titleTh.trim(),

          title_en:
            form.titleEn.trim(),

          description_th:
            form.descriptionTh.trim(),

          description_en:
            form.descriptionEn.trim(),

          reward_points:
            Math.max(
              1,
              Math.round(
                n(
                  form.rewardPoints,
                  50,
                ),
              ),
            ),

          reward_badge_code:
            form.rewardBadgeCode
              .trim() ||
            null,

          reward_badge_name_th:
            form.rewardBadgeNameTh
              .trim() ||
            null,

          reward_badge_name_en:
            form.rewardBadgeNameEn
              .trim() ||
            null,

          verification_level:
            Math.max(
              1,
              Math.min(
                3,
                Math.round(
                  n(
                    form.verificationLevel,
                    1,
                  ),
                ),
              ),
            ),

          progress_target:
            Math.max(
              1,
              Math.round(
                n(
                  form.progressTarget,
                  1,
                ),
              ),
            ),

          is_sponsored:
            form.isSponsored,

          starts_at:
            startsAt,

          ends_at:
            endsAt,

          sort_order:
            Math.round(
              n(
                form.sortOrder,
              ),
            ),

          is_active:
            form.isActive,
        },
      },
    );

  if (
    result.error
  ) {
    throw adminError(
      result.error,
    );
  }
}

async function saveRewardApi(
  row:
    | RewardRow
    | null,

  form:
    RewardForm,
) {
  const startsAt =
    buildCampaignIso(
      form.startsDate,
      form.startsTime,
      '00:00',
    );

  const endsAt =
    buildCampaignIso(
      form.endsDate,
      form.endsTime,
      '23:59',
    );

  const stockTotal =
    nullableN(
      form.stockTotal,
    );

  const maxPerUser =
    nullableN(
      form.maxPerUser,
    );

  const walletValidityDays =
    nullableN(
      form.walletValidityDays,
    );

  const entitlementDurationDays =
    nullableN(
      form.entitlementDurationDays,
    );

  const result =
    await rpcRequest(
      'admin_upsert_melo_reward_v1',
      {
        p_payload: {
          id:
            row?.id ??
            null,

          code:
            form.code.trim(),

          category:
            form.category,

          fulfillment_type:
            form.fulfillmentType,

          title_th:
            form.titleTh.trim(),

          title_en:
            form.titleEn.trim(),

          description_th:
            form.descriptionTh.trim(),

          description_en:
            form.descriptionEn.trim(),

          image_url:
            form.imageUrl.trim(),

          point_cost:
            Math.max(
              1,
              Math.round(
                n(
                  form.pointCost,
                  200,
                ),
              ),
            ),

          stock_total:
            stockTotal ==
            null
              ? null
              : Math.max(
                  0,
                  Math.round(
                    stockTotal,
                  ),
                ),

          max_per_user:
            maxPerUser ==
            null
              ? null
              : Math.max(
                  1,
                  Math.round(
                    maxPerUser,
                  ),
                ),

          starts_at:
            startsAt,

          ends_at:
            endsAt,

          wallet_validity_days:
            walletValidityDays ==
            null
              ? null
              : Math.max(
                  1,
                  Math.round(
                    walletValidityDays,
                  ),
                ),

          partner_id:
            form.partnerId
              .trim() ||
            null,

          terms_th:
            form.termsTh.trim(),

          terms_en:
            form.termsEn.trim(),

          entitlement_code:
            form.entitlementCode
              .trim() ||
            null,

          entitlement_duration_days:
            entitlementDurationDays ==
            null
              ? null
              : Math.max(
                  1,
                  Math.round(
                    entitlementDurationDays,
                  ),
                ),

          is_featured:
            form.isFeatured,

          is_active:
            form.isActive,

          sort_order:
            Math.round(
              n(
                form.sortOrder,
              ),
            ),
        },
      },
    );

  if (
    result.error
  ) {
    throw adminError(
      result.error,
    );
  }
}

async function setQuestActiveApi(
  id: string,
  active: boolean,
) {
  const result =
    await rpcRequest(
      'admin_set_melo_quest_active_v1',
      {
        p_quest_id:
          id,

        p_is_active:
          active,
      },
    );

  if (
    result.error
  ) {
    throw adminError(
      result.error,
    );
  }
}

async function setRewardActiveApi(
  id: string,
  active: boolean,
) {
  const result =
    await rpcRequest(
      'admin_set_melo_reward_active_v1',
      {
        p_reward_id:
          id,

        p_is_active:
          active,
      },
    );

  if (
    result.error
  ) {
    throw adminError(
      result.error,
    );
  }
}

/* =========================================================
   MAIN
   ========================================================= */

export default function QuestRewardAdminWeb({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const {
    locale,
  } =
    useLocale();

  const language =
    safeLocale(
      locale,
    );

  const t =
    COPY[language];

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    allowed,
    setAllowed,
  ] =
    useState(false);

  const [
    role,
    setRole,
  ] =
    useState('user');

  const [
    error,
    setError,
  ] =
    useState('');

  const [
    notice,
    setNotice,
  ] =
    useState('');

  const [
    tab,
    setTab,
  ] =
    useState<Tab>(
      'quests',
    );

  const [
    stats,
    setStats,
  ] =
    useState<Stats>(
      EMPTY_STATS,
    );

  const [
    quests,
    setQuests,
  ] =
    useState<
      QuestRow[]
    >([]);

  const [
    rewards,
    setRewards,
  ] =
    useState<
      RewardRow[]
    >([]);

  const [
    editor,
    setEditor,
  ] =
    useState<Editor>(
      null,
    );

  const [
    qForm,
    setQForm,
  ] =
    useState<QuestForm>(
      () =>
        questForm(
          null,
        ),
    );

  const [
    rForm,
    setRForm,
  ] =
    useState<RewardForm>(
      () =>
        rewardForm(
          null,
        ),
    );

  const load =
    useCallback(
      async (
        initial =
          false,
      ) => {
        if (
          initial
        ) {
          setLoading(
            true,
          );
        }

        setError('');

        try {
          const access =
            await loadAccess();

          setAllowed(
            access.allowed,
          );

          setRole(
            access.role,
          );

          if (
            !access.allowed
          ) {
            setStats(
              EMPTY_STATS,
            );

            setQuests(
              [],
            );

            setRewards(
              [],
            );

            return;
          }

          const [
            nextStats,
            nextQuests,
            nextRewards,
          ] =
            await Promise.all(
              [
                loadStats(),
                listQuests(),
                listRewards(),
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
        } catch (
          cause
        ) {
          setError(
            cause instanceof
              Error
              ? cause.message
              : String(
                  cause,
                ),
          );
        } finally {
          if (
            initial
          ) {
            setLoading(
              false,
            );
          }
        }
      },
      [],
    );

  useEffect(
    () => {
      void load(
        true,
      );
    },
    [
      load,
    ],
  );

  const cards =
    useMemo(
      () =>
        tab ===
        'quests'
          ? quests
          : rewards,
      [
        tab,
        quests,
        rewards,
      ],
    );

  function openQuest(
    row:
      | QuestRow
      | null,
  ) {
    setNotice('');
    setError('');

    setQForm(
      questForm(
        row,
      ),
    );

    setEditor({
      kind:
        'quest',

      row,
    });
  }

  function openReward(
    row:
      | RewardRow
      | null,
  ) {
    setNotice('');
    setError('');

    setRForm(
      rewardForm(
        row,
      ),
    );

    setEditor({
      kind:
        'reward',

      row,
    });
  }

  function openCreateForCurrentTab() {
    if (
      tab ===
      'quests'
    ) {
      openQuest(
        null,
      );

      return;
    }

    openReward(
      null,
    );
  }

  function closeEditor() {
    if (
      saving
    ) {
      return;
    }

    setEditor(
      null,
    );
  }

  function validateCampaign(
    startsDate:
      string,

    startsTime:
      string,

    endsDate:
      string,

    endsTime:
      string,
  ) {
    if (
      startsDate &&
      startsTime &&
      !validTime(
        startsTime,
      )
    ) {
      throw new Error(
        t.invalidTime,
      );
    }

    if (
      endsDate &&
      endsTime &&
      !validTime(
        endsTime,
      )
    ) {
      throw new Error(
        t.invalidTime,
      );
    }

    const startsAt =
      buildCampaignIso(
        startsDate,
        startsTime,
        '00:00',
      );

    const endsAt =
      buildCampaignIso(
        endsDate,
        endsTime,
        '23:59',
      );

    if (
      startsAt &&
      endsAt &&
      new Date(
        endsAt,
      ).getTime() <
        new Date(
          startsAt,
        ).getTime()
    ) {
      throw new Error(
        t.invalidRange,
      );
    }
  }

  async function saveQuest() {
    if (
      editor?.kind !==
      'quest'
    ) {
      return;
    }

    setError('');
    setNotice('');

    if (
      !qForm.slug.trim() ||
      !qForm.titleTh.trim() ||
      !qForm.titleEn.trim()
    ) {
      setError(
        t.requiredFields,
      );

      return;
    }

    try {
      validateCampaign(
        qForm.startsDate,
        qForm.startsTime,
        qForm.endsDate,
        qForm.endsTime,
      );

      setSaving(
        true,
      );

      await saveQuestApi(
        editor.row,
        qForm,
      );

      setEditor(
        null,
      );

      await load();

      setNotice(
        t.saveSuccess,
      );
    } catch (
      cause
    ) {
      setError(
        cause instanceof
          Error
          ? cause.message
          : t.saveFailed,
      );
    } finally {
      setSaving(
        false,
      );
    }
  }

  async function saveReward() {
    if (
      editor?.kind !==
      'reward'
    ) {
      return;
    }

    setError('');
    setNotice('');

    if (
      !rForm.code.trim() ||
      !rForm.titleTh.trim() ||
      !rForm.titleEn.trim() ||
      (
        rForm.fulfillmentType ===
          'entitlement' &&
        !rForm.entitlementCode.trim()
      )
    ) {
      setError(
        t.requiredFields,
      );

      return;
    }

    try {
      validateCampaign(
        rForm.startsDate,
        rForm.startsTime,
        rForm.endsDate,
        rForm.endsTime,
      );

      setSaving(
        true,
      );

      await saveRewardApi(
        editor.row,
        rForm,
      );

      setEditor(
        null,
      );

      await load();

      setNotice(
        t.saveSuccess,
      );
    } catch (
      cause
    ) {
      setError(
        cause instanceof
          Error
          ? cause.message
          : t.saveFailed,
      );
    } finally {
      setSaving(
        false,
      );
    }
  }

  async function toggleQuest(
    row: QuestRow,
  ) {
    setError('');
    setNotice('');

    const next =
      !row.isActive;

    setQuests(
      (
        current,
      ) =>
        current.map(
          (
            item,
          ) =>
            item.id ===
            row.id
              ? {
                  ...item,
                  isActive:
                    next,
                }
              : item,
        ),
    );

    try {
      await setQuestActiveApi(
        row.id,
        next,
      );

      await load();
    } catch (
      cause
    ) {
      setQuests(
        (
          current,
        ) =>
          current.map(
            (
              item,
            ) =>
              item.id ===
              row.id
                ? {
                    ...item,
                    isActive:
                      row.isActive,
                  }
                : item,
          ),
      );

      setError(
        cause instanceof
          Error
          ? cause.message
          : String(
              cause,
            ),
      );
    }
  }

  async function toggleReward(
    row: RewardRow,
  ) {
    setError('');
    setNotice('');

    const next =
      !row.isActive;

    setRewards(
      (
        current,
      ) =>
        current.map(
          (
            item,
          ) =>
            item.id ===
            row.id
              ? {
                  ...item,
                  isActive:
                    next,
                }
              : item,
        ),
    );

    try {
      await setRewardActiveApi(
        row.id,
        next,
      );

      await load();
    } catch (
      cause
    ) {
      setRewards(
        (
          current,
        ) =>
          current.map(
            (
              item,
            ) =>
              item.id ===
              row.id
                ? {
                    ...item,
                    isActive:
                      row.isActive,
                  }
                : item,
          ),
      );

      setError(
        cause instanceof
          Error
          ? cause.message
          : String(
              cause,
            ),
      );
    }
  }

  const workspace =
    (
      <section
        className="qrAdmin"
      >
        <div
          className="qrAdminTop"
        >
          <div>
            {!embedded ? (
              <>
                <span
                  className="qrEyebrow"
                >
                  MELO ADMIN
                </span>

                <h1>
                  {t.title}
                </h1>

                <p>
                  {t.subtitle}
                </p>
              </>
            ) : null}
          </div>

          {!loading &&
          allowed ? (
            <button
              type="button"
              className="qrTopCreate"
              disabled={
                saving
              }
              onClick={
                openCreateForCurrentTab
              }
            >
              <span>
                ＋
              </span>

              {tab ===
              'quests'
                ? t.createQuest
                : t.createReward}
            </button>
          ) : null}
        </div>

        {error ? (
          <div
            className="qrMessage qrError"
          >
            {error}
          </div>
        ) : null}

        {notice ? (
          <div
            className="qrMessage qrSuccess"
          >
            {notice}
          </div>
        ) : null}

        {loading ? (
          <div
            className="qrState"
          >
            <span
              className="qrSpinner"
            />

            <strong>
              {t.loading}
            </strong>
          </div>
        ) : !allowed ? (
          <div
            className="qrState"
          >
            <div
              className="qrLock"
            >
              🔒
            </div>

            <strong>
              {
                t.accessDenied
              }
            </strong>

            <p>
              {
                t.accessDeniedDetail
              }
              {' · '}
              role: {role}
            </p>
          </div>
        ) : (
          <>
            <div
              className="qrStats"
            >
              <StatCard
                value={
                  stats.questActive
                }
                label={`${t.questActive} / ${stats.questTotal}`}
              />

              <StatCard
                value={
                  stats.questCompletedUsers
                }
                label={
                  t.questCompleted
                }
              />

              <StatCard
                value={
                  stats.rewardActive
                }
                label={`${t.rewardActive} / ${stats.rewardTotal}`}
              />

              <StatCard
                value={
                  stats.rewardUsed
                }
                label={`${t.rewardUsed} / ${stats.rewardRedeemed}`}
              />
            </div>

            <div
              className="qrTabs"
            >
              <button
                type="button"
                data-active={
                  tab ===
                  'quests'
                }
                onClick={() =>
                  setTab(
                    'quests',
                  )
                }
              >
                {t.quest}

                <span>
                  {
                    quests.length
                  }
                </span>
              </button>

              <button
                type="button"
                data-active={
                  tab ===
                  'rewards'
                }
                onClick={() =>
                  setTab(
                    'rewards',
                  )
                }
              >
                {t.reward}

                <span>
                  {
                    rewards.length
                  }
                </span>
              </button>
            </div>

            {!cards.length ? (
              <div
                className="qrEmpty"
              >
                {tab ===
                'quests'
                  ? t.noQuest
                  : t.noReward}
              </div>
            ) : null}

            {tab ===
            'quests' ? (
              <div
                className="qrCardGrid"
              >
                {quests.map(
                  (
                    row,
                  ) => (
                    <QuestCard
                      key={
                        row.id
                      }
                      row={
                        row
                      }
                      locale={
                        language
                      }
                      t={
                        t
                      }
                      onEdit={() =>
                        openQuest(
                          row,
                        )
                      }
                      onToggle={() =>
                        void toggleQuest(
                          row,
                        )
                      }
                    />
                  ),
                )}
              </div>
            ) : (
              <div
                className="qrCardGrid"
              >
                {rewards.map(
                  (
                    row,
                  ) => (
                    <RewardCard
                      key={
                        row.id
                      }
                      row={
                        row
                      }
                      locale={
                        language
                      }
                      t={
                        t
                      }
                      onEdit={() =>
                        openReward(
                          row,
                        )
                      }
                      onToggle={() =>
                        void toggleReward(
                          row,
                        )
                      }
                    />
                  ),
                )}
              </div>
            )}
          </>
        )}

        {editor ? (
          <div
            className="qrModalBackdrop"
            role="presentation"
            onMouseDown={(
              event,
            ) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                closeEditor();
              }
            }}
          >
            <section
              className="qrModal"
              role="dialog"
              aria-modal="true"
            >
              <header
                className="qrModalHeader"
              >
                <button
                  type="button"
                  disabled={
                    saving
                  }
                  onClick={
                    closeEditor
                  }
                >
                  {t.cancel}
                </button>

                <strong>
                  {editor.kind ===
                  'quest'
                    ? editor.row
                      ? t.editQuest
                      : t.createQuest
                    : editor.row
                      ? t.editReward
                      : t.createReward}
                </strong>

                <button
                  type="button"
                  className="qrModalSave"
                  disabled={
                    saving
                  }
                  onClick={() =>
                    void (
                      editor.kind ===
                      'quest'
                        ? saveQuest()
                        : saveReward()
                    )
                  }
                >
                  {saving
                    ? t.saving
                    : t.save}
                </button>
              </header>

              {editor.kind ===
              'quest' ? (
                <QuestEditor
                  form={
                    qForm
                  }
                  setForm={
                    setQForm
                  }
                  t={t}
                />
              ) : (
                <RewardEditor
                  form={
                    rForm
                  }
                  setForm={
                    setRForm
                  }
                  t={t}
                />
              )}
            </section>
          </div>
        ) : null}

        <QuestRewardStyles />
      </section>
    );

  if (
    embedded
  ) {
    return workspace;
  }

  return (
    <main
      className="qrStandalonePage"
    >
      <Header />

      <div
        className="qrStandaloneShell"
      >
        <div
          className="qrStandaloneBack"
        >
          <Link href="/settings">
            ← Settings
          </Link>
        </div>

        {workspace}
      </div>

      <style jsx global>{`
        .qrStandalonePage {
          min-height: 100vh;
          background: var(--background, #f5f8fc);
          color: var(--text, #101828);
        }

        .qrStandaloneShell {
          width: min(1180px, calc(100% - 34px));
          margin: 0 auto;
          padding: 26px 0 72px;
        }

        .qrStandaloneBack {
          margin-bottom: 14px;
        }

        .qrStandaloneBack a {
          color: var(--primary);
          font-size: 12px;
          font-weight: 850;
          text-decoration: none;
        }
      `}</style>
    </main>
  );
}

/* =========================================================
   CARDS
   ========================================================= */

function StatCard({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <div
      className="qrStat"
    >
      <strong>
        {value}
      </strong>

      <span>
        {label}
      </span>
    </div>
  );
}

function QuestCard({
  row,
  locale,
  t,
  onEdit,
  onToggle,
}: {
  row: QuestRow;
  locale: LocaleKey;
  t: AdminCopy;
  onEdit: () => void;
  onToggle: () => void;
}) {
  return (
    <article
      className="qrCard"
    >
      <div
        className="qrCardTop"
      >
        <div
          className="qrCardBody"
        >
          <div
            className="qrBadges"
          >
            <Badge>
              {row.category}
            </Badge>

            {row.isSponsored ? (
              <Badge warm>
                {t.sponsored}
              </Badge>
            ) : null}

            {!row.isActive ? (
              <Badge muted>
                {t.inactive}
              </Badge>
            ) : null}
          </div>

          <h3>
            {localizedTitle(
              row,
              locale,
            )}
          </h3>

          <p
            className="qrMeta"
          >
            {row.slug}
            {' · '}
            {
              row.rewardPoints
            }{' '}
            PTS
            {' · '}
            Verify L
            {
              row.verificationLevel
            }
            {' · '}
            Target{' '}
            {
              row.progressTarget
            }
          </p>

          <p
            className="qrMeta"
          >
            {t.started}{' '}
            {
              row.startedCount
            }
            {' · '}
            {t.completed}{' '}
            {
              row.completedCount
            }
            {' · '}
            {t.reviewPending}{' '}
            {
              row.pendingReviewCount
            }
          </p>

          {row.startsAt ||
          row.endsAt ? (
            <p
              className="qrMeta"
            >
              {t.campaign}:{' '}
              {row.startsAt
                ? formatCampaign(
                    row.startsAt,
                    locale,
                  )
                : t.immediate}
              {' → '}
              {row.endsAt
                ? formatCampaign(
                    row.endsAt,
                    locale,
                  )
                : t.noEnd}
            </p>
          ) : null}
        </div>

        <SwitchButton
          value={
            row.isActive
          }
          label={
            row.isActive
              ? t.active
              : t.inactive
          }
          onChange={
            onToggle
          }
        />
      </div>

      <button
        type="button"
        className="qrEdit"
        onClick={
          onEdit
        }
      >
        {t.editQuest}
      </button>
    </article>
  );
}

function RewardCard({
  row,
  locale,
  t,
  onEdit,
  onToggle,
}: {
  row: RewardRow;
  locale: LocaleKey;
  t: AdminCopy;
  onEdit: () => void;
  onToggle: () => void;
}) {
  return (
    <article
      className="qrCard"
    >
      <div
        className="qrCardTop"
      >
        <div
          className="qrCardBody"
        >
          <div
            className="qrBadges"
          >
            <Badge>
              {row.category}
            </Badge>

            <Badge
              warm={
                row.fulfillmentType ===
                'entitlement'
              }
            >
              {row.fulfillmentType ===
              'entitlement'
                ? t.internal
                : t.partner}
            </Badge>

            {row.isFeatured ? (
              <Badge warm>
                {t.featured}
              </Badge>
            ) : null}

            {!row.isActive ? (
              <Badge muted>
                {t.inactive}
              </Badge>
            ) : null}
          </div>

          <h3>
            {localizedTitle(
              row,
              locale,
            )}
          </h3>

          <p
            className="qrMeta"
          >
            {row.code}
            {' · '}
            {
              row.pointCost
            }{' '}
            PTS
          </p>

          <p
            className="qrMeta"
          >
            {t.stock}{' '}
            {row.stockRemaining ==
            null
              ? t.unlimited
              : `${row.stockRemaining}/${row.stockTotal ?? row.stockRemaining}`}
            {' · '}
            {t.redeemed}{' '}
            {
              row.redeemedCount
            }
            {' · '}
            {t.used}{' '}
            {
              row.usedCount
            }
          </p>

          {row.startsAt ||
          row.endsAt ? (
            <p
              className="qrMeta"
            >
              {t.campaign}:{' '}
              {row.startsAt
                ? formatCampaign(
                    row.startsAt,
                    locale,
                  )
                : t.immediate}
              {' → '}
              {row.endsAt
                ? formatCampaign(
                    row.endsAt,
                    locale,
                  )
                : t.noEnd}
            </p>
          ) : null}
        </div>

        <SwitchButton
          value={
            row.isActive
          }
          label={
            row.isActive
              ? t.active
              : t.inactive
          }
          onChange={
            onToggle
          }
        />
      </div>

      <button
        type="button"
        className="qrEdit"
        onClick={
          onEdit
        }
      >
        {t.editReward}
      </button>
    </article>
  );
}

function Badge({
  children,
  warm = false,
  muted = false,
}: {
  children:
    React.ReactNode;

  warm?: boolean;
  muted?: boolean;
}) {
  return (
    <span
      className={[
        'qrBadge',

        warm
          ? 'qrBadgeWarm'
          : '',

        muted
          ? 'qrBadgeMuted'
          : '',
      ]
        .filter(
          Boolean,
        )
        .join(' ')}
    >
      {children}
    </span>
  );
}

function SwitchButton({
  value,
  label,
  onChange,
}: {
  value: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      className="qrSwitchButton"
      data-active={
        value
      }
      aria-label={
        label
      }
      title={
        label
      }
      onClick={
        onChange
      }
    >
      <span />
    </button>
  );
}

/* =========================================================
   QUEST EDITOR
   ========================================================= */

function QuestEditor({
  form,
  setForm,
  t,
}: {
  form: QuestForm;

  setForm:
    React.Dispatch<
      React.SetStateAction<QuestForm>
    >;

  t: AdminCopy;
}) {
  function patch(
    next:
      Partial<QuestForm>,
  ) {
    setForm(
      (
        current,
      ) => ({
        ...current,
        ...next,
      }),
    );
  }

  return (
    <div
      className="qrForm"
    >
      <div
        className="qrFormSection"
      >
        <h4>
          Quest
        </h4>

        <Field
          label={
            t.slug
          }
          value={
            form.slug
          }
          placeholder="travel-two-provinces"
          onChange={(
            value,
          ) =>
            patch({
              slug:
                value,
            })
          }
        />

        <Choice
          label={
            t.questCategory
          }
          values={
            QUEST_CATEGORIES
          }
          value={
            form.category
          }
          onChange={(
            value,
          ) =>
            patch({
              category:
                value,
            })
          }
        />

        <div
          className="qrGrid2"
        >
          <Field
            label={
              t.titleTh
            }
            value={
              form.titleTh
            }
            onChange={(
              value,
            ) =>
              patch({
                titleTh:
                  value,
              })
            }
          />

          <Field
            label={
              t.titleEn
            }
            value={
              form.titleEn
            }
            onChange={(
              value,
            ) =>
              patch({
                titleEn:
                  value,
              })
            }
          />
        </div>

        <div
          className="qrGrid2"
        >
          <Field
            label={
              t.descriptionTh
            }
            value={
              form.descriptionTh
            }
            multiline
            onChange={(
              value,
            ) =>
              patch({
                descriptionTh:
                  value,
              })
            }
          />

          <Field
            label={
              t.descriptionEn
            }
            value={
              form.descriptionEn
            }
            multiline
            onChange={(
              value,
            ) =>
              patch({
                descriptionEn:
                  value,
              })
            }
          />
        </div>
      </div>

      <div
        className="qrFormSection"
      >
        <h4>
          Points & Progress
        </h4>

        <div
          className="qrGrid3"
        >
          <Field
            label={
              t.meloPoints
            }
            type="number"
            value={
              form.rewardPoints
            }
            onChange={(
              value,
            ) =>
              patch({
                rewardPoints:
                  value,
              })
            }
          />

          <Field
            label={
              t.progressTarget
            }
            type="number"
            value={
              form.progressTarget
            }
            onChange={(
              value,
            ) =>
              patch({
                progressTarget:
                  value,
              })
            }
          />

          <SelectField
            label={
              t.verificationLevel
            }
            value={
              form.verificationLevel
            }
            options={[
              '1',
              '2',
              '3',
            ]}
            onChange={(
              value,
            ) =>
              patch({
                verificationLevel:
                  value,
              })
            }
          />
        </div>
      </div>

      <div
        className="qrFormSection"
      >
        <h4>
          Badge
        </h4>

        <div
          className="qrGrid3"
        >
          <Field
            label={
              t.badgeCode
            }
            value={
              form.rewardBadgeCode
            }
            onChange={(
              value,
            ) =>
              patch({
                rewardBadgeCode:
                  value,
              })
            }
          />

          <Field
            label={
              t.badgeNameTh
            }
            value={
              form.rewardBadgeNameTh
            }
            onChange={(
              value,
            ) =>
              patch({
                rewardBadgeNameTh:
                  value,
              })
            }
          />

          <Field
            label={
              t.badgeNameEn
            }
            value={
              form.rewardBadgeNameEn
            }
            onChange={(
              value,
            ) =>
              patch({
                rewardBadgeNameEn:
                  value,
              })
            }
          />
        </div>
      </div>

      <div
        className="qrFormSection"
      >
        <h4>
          Campaign
        </h4>

        <div
          className="qrGrid4"
        >
          <Field
            label={
              t.startDate
            }
            type="date"
            value={
              form.startsDate
            }
            hint={
              t.emptyDateStart
            }
            onChange={(
              value,
            ) =>
              patch({
                startsDate:
                  value,
              })
            }
          />

          <Field
            label={
              t.startTime
            }
            type="time"
            value={
              form.startsTime
            }
            onChange={(
              value,
            ) =>
              patch({
                startsTime:
                  value,
              })
            }
          />

          <Field
            label={
              t.endDate
            }
            type="date"
            value={
              form.endsDate
            }
            hint={
              t.emptyDateEnd
            }
            onChange={(
              value,
            ) =>
              patch({
                endsDate:
                  value,
              })
            }
          />

          <Field
            label={
              t.endTime
            }
            type="time"
            value={
              form.endsTime
            }
            onChange={(
              value,
            ) =>
              patch({
                endsTime:
                  value,
              })
            }
          />
        </div>

        <Field
          label={
            t.sortOrder
          }
          type="number"
          value={
            form.sortOrder
          }
          onChange={(
            value,
          ) =>
            patch({
              sortOrder:
                value,
            })
          }
        />

        <div
          className="qrToggleGrid"
        >
          <ToggleField
            label={
              t.sponsoredQuest
            }
            value={
              form.isSponsored
            }
            onChange={(
              value,
            ) =>
              patch({
                isSponsored:
                  value,
              })
            }
          />

          <ToggleField
            label={
              t.enabled
            }
            value={
              form.isActive
            }
            onChange={(
              value,
            ) =>
              patch({
                isActive:
                  value,
              })
            }
          />
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   REWARD EDITOR
   ========================================================= */

function RewardEditor({
  form,
  setForm,
  t,
}: {
  form:
    RewardForm;

  setForm:
    React.Dispatch<
      React.SetStateAction<RewardForm>
    >;

  t:
    AdminCopy;
}) {
  function patch(
    next:
      Partial<RewardForm>,
  ) {
    setForm(
      (
        current,
      ) => ({
        ...current,
        ...next,
      }),
    );
  }

  return (
    <div
      className="qrForm"
    >
      <div
        className="qrFormSection"
      >
        <h4>
          Reward
        </h4>

        <div
          className="qrGrid3"
        >
          <Field
            label={
              t.rewardCode
            }
            value={
              form.code
            }
            placeholder="reward-16"
            onChange={(
              value,
            ) =>
              patch({
                code:
                  value,
              })
            }
          />

          <SelectField
            label={
              t.rewardCategory
            }
            value={
              form.category
            }
            options={
              REWARD_CATEGORIES
            }
            onChange={(
              value,
            ) =>
              patch({
                category:
                  value,
              })
            }
          />

          <SelectField
            label={
              t.fulfillmentType
            }
            value={
              form.fulfillmentType
            }
            options={[
              'partner_code',
              'entitlement',
            ]}
            onChange={(
              value,
            ) =>
              patch({
                fulfillmentType:
                  value ===
                  'entitlement'
                    ? 'entitlement'
                    : 'partner_code',
              })
            }
          />
        </div>

        <div
          className="qrGrid2"
        >
          <Field
            label={
              t.titleTh
            }
            value={
              form.titleTh
            }
            onChange={(
              value,
            ) =>
              patch({
                titleTh:
                  value,
              })
            }
          />

          <Field
            label={
              t.titleEn
            }
            value={
              form.titleEn
            }
            onChange={(
              value,
            ) =>
              patch({
                titleEn:
                  value,
              })
            }
          />
        </div>

        <div
          className="qrGrid2"
        >
          <Field
            label={
              t.descriptionTh
            }
            multiline
            value={
              form.descriptionTh
            }
            onChange={(
              value,
            ) =>
              patch({
                descriptionTh:
                  value,
              })
            }
          />

          <Field
            label={
              t.descriptionEn
            }
            multiline
            value={
              form.descriptionEn
            }
            onChange={(
              value,
            ) =>
              patch({
                descriptionEn:
                  value,
              })
            }
          />
        </div>

        <Field
          label={
            t.imageUrl
          }
          value={
            form.imageUrl
          }
          placeholder="https://..."
          onChange={(
            value,
          ) =>
            patch({
              imageUrl:
                value,
            })
          }
        />
      </div>

      <div
        className="qrFormSection"
      >
        <h4>
          Points & Stock
        </h4>

        <div
          className="qrGrid4"
        >
          <Field
            label={
              t.pointCost
            }
            type="number"
            value={
              form.pointCost
            }
            onChange={(
              value,
            ) =>
              patch({
                pointCost:
                  value,
              })
            }
          />

          <Field
            label={
              t.stockTotal
            }
            type="number"
            value={
              form.stockTotal
            }
            onChange={(
              value,
            ) =>
              patch({
                stockTotal:
                  value,
              })
            }
          />

          <Field
            label={
              t.maxPerUser
            }
            type="number"
            value={
              form.maxPerUser
            }
            onChange={(
              value,
            ) =>
              patch({
                maxPerUser:
                  value,
              })
            }
          />

          <Field
            label={
              t.walletValidityDays
            }
            type="number"
            value={
              form.walletValidityDays
            }
            onChange={(
              value,
            ) =>
              patch({
                walletValidityDays:
                  value,
              })
            }
          />
        </div>
      </div>

      <div
        className="qrFormSection"
      >
        <h4>
          Campaign
        </h4>

        <div
          className="qrGrid4"
        >
          <Field
            label={
              t.startDate
            }
            type="date"
            value={
              form.startsDate
            }
            hint={
              t.emptyDateStart
            }
            onChange={(
              value,
            ) =>
              patch({
                startsDate:
                  value,
              })
            }
          />

          <Field
            label={
              t.startTime
            }
            type="time"
            value={
              form.startsTime
            }
            onChange={(
              value,
            ) =>
              patch({
                startsTime:
                  value,
              })
            }
          />

          <Field
            label={
              t.endDate
            }
            type="date"
            value={
              form.endsDate
            }
            hint={
              t.emptyDateEnd
            }
            onChange={(
              value,
            ) =>
              patch({
                endsDate:
                  value,
              })
            }
          />

          <Field
            label={
              t.endTime
            }
            type="time"
            value={
              form.endsTime
            }
            onChange={(
              value,
            ) =>
              patch({
                endsTime:
                  value,
              })
            }
          />
        </div>
      </div>

      <div
        className="qrFormSection"
      >
        <h4>
          Fulfillment
        </h4>

        {form.fulfillmentType ===
        'partner_code' ? (
          <Field
            label={
              t.partnerId
            }
            value={
              form.partnerId
            }
            hint={
              t.generalPartner
            }
            onChange={(
              value,
            ) =>
              patch({
                partnerId:
                  value,
              })
            }
          />
        ) : (
          <div
            className="qrGrid2"
          >
            <Field
              label={
                t.entitlementCode
              }
              value={
                form.entitlementCode
              }
              onChange={(
                value,
              ) =>
                patch({
                  entitlementCode:
                    value,
                })
              }
            />

            <Field
              label={
                t.entitlementDuration
              }
              type="number"
              value={
                form.entitlementDurationDays
              }
              onChange={(
                value,
              ) =>
                patch({
                  entitlementDurationDays:
                    value,
                })
              }
            />
          </div>
        )}

        <div
          className="qrGrid2"
        >
          <Field
            label={
              t.termsTh
            }
            multiline
            value={
              form.termsTh
            }
            onChange={(
              value,
            ) =>
              patch({
                termsTh:
                  value,
              })
            }
          />

          <Field
            label={
              t.termsEn
            }
            multiline
            value={
              form.termsEn
            }
            onChange={(
              value,
            ) =>
              patch({
                termsEn:
                  value,
              })
            }
          />
        </div>

        <Field
          label={
            t.sortOrder
          }
          type="number"
          value={
            form.sortOrder
          }
          onChange={(
            value,
          ) =>
            patch({
              sortOrder:
                value,
            })
          }
        />

        <div
          className="qrToggleGrid"
        >
          <ToggleField
            label={
              t.featuredReward
            }
            value={
              form.isFeatured
            }
            onChange={(
              value,
            ) =>
              patch({
                isFeatured:
                  value,
              })
            }
          />

          <ToggleField
            label={
              t.enabled
            }
            value={
              form.isActive
            }
            onChange={(
              value,
            ) =>
              patch({
                isActive:
                  value,
              })
            }
          />
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   FORM CONTROLS
   ========================================================= */

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder = '',
  hint = '',
  multiline = false,
}: {
  label: string;
  value: string;

  onChange:
    (
      value: string,
    ) => void;

  type?: string;
  placeholder?: string;
  hint?: string;
  multiline?: boolean;
}) {
  return (
    <label
      className="qrField"
    >
      <span>
        {label}
      </span>

      {multiline ? (
        <textarea
          value={
            value
          }
          placeholder={
            placeholder
          }
          onChange={(
            event,
          ) =>
            onChange(
              event.target
                .value,
            )
          }
        />
      ) : (
        <input
          type={
            type
          }
          value={
            value
          }
          placeholder={
            placeholder
          }
          onChange={(
            event,
          ) =>
            onChange(
              event.target
                .value,
            )
          }
        />
      )}

      {hint ? (
        <small>
          {hint}
        </small>
      ) : null}
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];

  onChange:
    (
      value: string,
    ) => void;
}) {
  return (
    <label
      className="qrField"
    >
      <span>
        {label}
      </span>

      <select
        value={
          value
        }
        onChange={(
          event,
        ) =>
          onChange(
            event.target
              .value,
          )
        }
      >
        {options.map(
          (
            option,
          ) => (
            <option
              value={
                option
              }
              key={
                option
              }
            >
              {option}
            </option>
          ),
        )}
      </select>
    </label>
  );
}

function Choice({
  label,
  values,
  value,
  onChange,
}: {
  label: string;

  values:
    string[];

  value:
    string;

  onChange:
    (
      value: string,
    ) => void;
}) {
  return (
    <div
      className="qrField"
    >
      <span>
        {label}
      </span>

      <div
        className="qrChoice"
      >
        {values.map(
          (
            option,
          ) => (
            <button
              type="button"
              key={
                option
              }
              data-active={
                option ===
                value
              }
              onClick={() =>
                onChange(
                  option,
                )
              }
            >
              {option}
            </button>
          ),
        )}
      </div>
    </div>
  );
}

function ToggleField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;

  onChange:
    (
      value: boolean,
    ) => void;
}) {
  return (
    <label
      className="qrToggleField"
    >
      <strong>
        {label}
      </strong>

      <input
        type="checkbox"
        checked={
          value
        }
        onChange={(
          event,
        ) =>
          onChange(
            event.target
              .checked,
          )
        }
      />

      <span
        className="qrToggleTrack"
      >
        <i />
      </span>
    </label>
  );
}

/* =========================================================
   CSS
   ========================================================= */

function QuestRewardStyles() {
  return (
    <style jsx global>{`
      .qrAdmin {
        width: 100%;
        min-width: 0;
        color: var(--text, #101828);
      }

      .qrAdmin * {
        box-sizing: border-box;
      }

      .qrAdmin button,
      .qrAdmin input,
      .qrAdmin textarea,
      .qrAdmin select {
        font: inherit;
      }

      /* =====================================================
         MAIN HEADER
         ===================================================== */

      .qrAdminTop {
        min-height: 50px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 18px;
        margin-bottom: 16px;
      }

      .qrEyebrow {
        display: block;
        color: var(--primary, #3286ed);
        font-size: 11px;
        font-weight: 900;
        letter-spacing: 0.1em;
      }

      .qrAdminTop h1 {
        margin: 5px 0 0;
        font-size: 28px;
        line-height: 1.15;
      }

      .qrAdminTop p {
        margin: 7px 0 0;
        color: var(--text-secondary, #667085);
        font-size: 13px;
        line-height: 1.5;
      }

      .qrTopCreate {
        min-width: 170px;
        min-height: 42px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        flex: 0 0 auto;
        border: 0;
        border-radius: 12px;
        background: var(--primary, #3286ed);
        color: #fff;
        padding: 0 18px;
        font-size: 12px;
        font-weight: 900;
        cursor: pointer;
        box-shadow:
          0 8px 20px
          color-mix(
            in srgb,
            var(--primary, #3286ed) 20%,
            transparent
          );
      }

      .qrTopCreate span {
        font-size: 17px;
        line-height: 1;
      }

      .qrTopCreate:hover {
        filter: brightness(1.04);
      }

      .qrTopCreate:disabled {
        opacity: 0.55;
        cursor: wait;
      }

      /* =====================================================
         MESSAGES
         ===================================================== */

      .qrMessage {
        margin-bottom: 14px;
        border-radius: 13px;
        padding: 11px 13px;
        font-size: 12px;
        font-weight: 750;
      }

      .qrError {
        border: 1px solid rgba(221, 67, 86, 0.28);
        background: rgba(221, 67, 86, 0.08);
        color: #d9465c;
      }

      .qrSuccess {
        border: 1px solid rgba(43, 167, 116, 0.28);
        background: rgba(43, 167, 116, 0.08);
        color: #238a62;
      }

      .qrState {
        min-height: 230px;
        display: grid;
        place-items: center;
        align-content: center;
        gap: 10px;
        border: 1px solid var(--border, #dce4ee);
        border-radius: 20px;
        background: var(--surface, #fff);
        padding: 30px;
        text-align: center;
      }

      .qrState strong {
        font-size: 16px;
      }

      .qrState p {
        max-width: 520px;
        margin: 0;
        color: var(--text-secondary, #667085);
        font-size: 12px;
        line-height: 1.6;
      }

      .qrLock {
        display: grid;
        width: 54px;
        height: 54px;
        place-items: center;
        border-radius: 17px;
        background: var(--surface-2, #f1f5f9);
        font-size: 23px;
      }

      .qrSpinner {
        width: 30px;
        height: 30px;
        border: 3px solid var(--border, #dce4ee);
        border-top-color: var(--primary, #3286ed);
        border-radius: 50%;
        animation: qrSpin 0.7s linear infinite;
      }

      @keyframes qrSpin {
        to {
          transform: rotate(360deg);
        }
      }

      /* =====================================================
         STATS
         ===================================================== */

      .qrStats {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 12px;
      }

      .qrStat {
        min-height: 98px;
        border: 1px solid var(--border, #dce4ee);
        border-radius: 18px;
        background: var(--surface, #fff);
        padding: 16px;
        box-shadow:
          0 8px 24px
          color-mix(
            in srgb,
            var(--shadow, #0f172a) 9%,
            transparent
          );
      }

      .qrStat strong {
        display: block;
        color: var(--primary, #3286ed);
        font-size: 25px;
        line-height: 1;
      }

      .qrStat span {
        display: block;
        margin-top: 8px;
        color: var(--text-secondary, #667085);
        font-size: 11px;
        font-weight: 750;
      }

      /* =====================================================
         TABS
         ===================================================== */

      .qrTabs {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 5px;
        margin-top: 18px;
        border-radius: 17px;
        background: var(--surface-2, #edf3f8);
        padding: 5px;
      }

      .qrTabs button {
        min-height: 46px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        border: 0;
        border-radius: 13px;
        background: transparent;
        color: var(--text-secondary, #667085);
        font-size: 13px;
        font-weight: 900;
        cursor: pointer;
      }

      .qrTabs button[data-active="true"] {
        border: 1px solid var(--border, #dce4ee);
        background: var(--surface, #fff);
        color: var(--primary, #3286ed);
        box-shadow:
          0 4px 16px
          color-mix(
            in srgb,
            var(--shadow, #0f172a) 8%,
            transparent
          );
      }

      .qrTabs button span {
        display: inline-flex;
        min-width: 22px;
        height: 22px;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        background: var(--primary-soft, #eaf3ff);
        color: var(--primary, #3286ed);
        padding: 0 6px;
        font-size: 10px;
      }

      /* =====================================================
         LIST CARDS
         ===================================================== */

      .qrCardGrid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
        margin-top: 12px;
      }

      .qrCard {
        min-width: 0;
        border: 1px solid var(--border, #dce4ee);
        border-radius: 20px;
        background: var(--surface, #fff);
        padding: 16px;
        box-shadow:
          0 8px 24px
          color-mix(
            in srgb,
            var(--shadow, #0f172a) 8%,
            transparent
          );
      }

      .qrCardTop {
        display: flex;
        align-items: flex-start;
        gap: 15px;
      }

      .qrCardBody {
        min-width: 0;
        flex: 1;
      }

      .qrCard h3 {
        margin: 9px 0 0;
        color: var(--text, #101828);
        font-size: 16px;
        line-height: 1.35;
      }

      .qrBadges {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }

      .qrBadge {
        display: inline-flex;
        align-items: center;
        min-height: 25px;
        border-radius: 999px;
        background: var(--primary-soft, #eaf3ff);
        color: var(--primary, #3286ed);
        padding: 4px 9px;
        font-size: 9px;
        font-weight: 900;
      }

      .qrBadgeWarm {
        background: rgba(242, 176, 62, 0.13);
        color: #b77714;
      }

      .qrBadgeMuted {
        background: var(--surface-2, #edf2f7);
        color: var(--text-secondary, #667085);
      }

      .qrMeta {
        margin: 5px 0 0;
        color: var(--text-secondary, #667085);
        font-size: 10.5px;
        line-height: 1.55;
        font-weight: 650;
        overflow-wrap: anywhere;
      }

      .qrEdit {
        width: 100%;
        min-height: 39px;
        margin-top: 14px;
        border: 1px solid
          color-mix(
            in srgb,
            var(--primary, #3286ed) 20%,
            var(--border, #dce4ee)
          );
        border-radius: 12px;
        background: var(--primary-soft, #eaf3ff);
        color: var(--primary, #3286ed);
        font-size: 11px;
        font-weight: 900;
        cursor: pointer;
      }

      .qrEdit:hover {
        border-color: var(--primary, #3286ed);
      }

      .qrSwitchButton {
        position: relative;
        width: 46px;
        height: 26px;
        flex: 0 0 auto;
        border: 0;
        border-radius: 999px;
        background: var(--border, #dce4ee);
        padding: 0;
        cursor: pointer;
        transition: background 0.18s ease;
      }

      .qrSwitchButton span {
        position: absolute;
        left: 3px;
        top: 3px;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #fff;
        box-shadow: 0 2px 5px rgba(15, 23, 42, 0.2);
        transition: transform 0.18s ease;
      }

      .qrSwitchButton[data-active="true"] {
        background: #10a18b;
      }

      .qrSwitchButton[data-active="true"] span {
        transform: translateX(20px);
      }

      .qrEmpty {
        margin-top: 12px;
        border: 1px dashed var(--border, #dce4ee);
        border-radius: 18px;
        color: var(--text-secondary, #667085);
        padding: 32px;
        text-align: center;
        font-size: 12px;
        font-weight: 750;
      }

      /* =====================================================
         MODAL
         ===================================================== */

      .qrModalBackdrop {
        position: fixed;
        z-index: 10000;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(4, 10, 20, 0.62);
        backdrop-filter: blur(5px);
        padding: 22px;
      }

      .qrModal {
        width: min(1040px, 100%);
        max-height: min(90vh, 920px);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        border: 1px solid var(--border, #dce4ee);
        border-radius: 22px;
        background: var(--background, #f5f8fc);
        box-shadow: 0 30px 80px rgba(4, 10, 20, 0.28);
      }

      .qrModalHeader {
        min-height: 64px;
        display: grid;
        grid-template-columns: 140px minmax(0, 1fr) 140px;
        align-items: center;
        gap: 12px;
        border-bottom: 1px solid var(--border, #dce4ee);
        background: var(--surface, #fff);
        padding: 11px 16px;
      }

      .qrModalHeader strong {
        min-width: 0;
        color: var(--text, #101828);
        font-size: 16px;
        text-align: center;
      }

      .qrModalHeader button {
        min-height: 40px;
        border: 0;
        border-radius: 11px;
        background: transparent;
        color: var(--text-secondary, #667085);
        padding: 0 12px;
        font-size: 11px;
        font-weight: 850;
        cursor: pointer;
      }

      .qrModalHeader .qrModalSave {
        background: var(--primary, #3286ed);
        color: #fff;
      }

      .qrModalHeader button:disabled {
        opacity: 0.55;
        cursor: wait;
      }

      .qrForm {
        overflow-y: auto;
        display: grid;
        gap: 15px;
        padding: 18px;
      }

      .qrFormSection {
        min-width: 0;
        border: 1px solid var(--border, #dce4ee);
        border-radius: 18px;
        background: var(--surface, #fff);
        padding: 17px;
      }

      .qrFormSection h4 {
        margin: 0 0 15px;
        color: var(--text, #101828);
        font-size: 15px;
      }

      /* =====================================================
         CONSISTENT FORM GRID
         ===================================================== */

      .qrGrid2,
      .qrGrid3,
      .qrGrid4,
      .qrToggleGrid {
        display: grid;
        min-width: 0;
        gap: 12px;
        margin-top: 12px;
      }

      .qrGrid2 {
        grid-template-columns:
          repeat(
            2,
            minmax(
              0,
              1fr
            )
          );
      }

      .qrGrid3 {
        grid-template-columns:
          repeat(
            3,
            minmax(
              0,
              1fr
            )
          );
      }

      .qrGrid4 {
        grid-template-columns:
          repeat(
            4,
            minmax(
              0,
              1fr
            )
          );
      }

      .qrToggleGrid {
        grid-template-columns:
          repeat(
            2,
            minmax(
              0,
              1fr
            )
          );
      }

      .qrGrid2 > *,
      .qrGrid3 > *,
      .qrGrid4 > *,
      .qrToggleGrid > * {
        min-width: 0;
      }

      /* =====================================================
         FIELDS
         ===================================================== */

      .qrField {
        display: flex;
        min-width: 0;
        flex-direction: column;
        margin-top: 12px;
      }

      .qrGrid2 > .qrField,
      .qrGrid3 > .qrField,
      .qrGrid4 > .qrField {
        margin-top: 0;
      }

      .qrField > span {
        min-height: 17px;
        display: flex;
        align-items: flex-end;
        margin-bottom: 7px;
        color: var(--text, #101828);
        font-size: 11px;
        line-height: 1.35;
        font-weight: 800;
      }

      .qrField input,
      .qrField select {
        width: 100%;
        height: 46px;
        min-height: 46px;
        border: 1px solid var(--border, #dce4ee);
        border-radius: 12px;
        outline: none;
        background: var(--surface-2, #f7f9fc);
        color: var(--text, #101828);
        padding: 0 12px;
        font-size: 12px;
      }

      .qrField textarea {
        width: 100%;
        height: 108px;
        min-height: 108px;
        max-height: 220px;
        border: 1px solid var(--border, #dce4ee);
        border-radius: 12px;
        outline: none;
        resize: vertical;
        background: var(--surface-2, #f7f9fc);
        color: var(--text, #101828);
        padding: 11px 12px;
        font-size: 12px;
        line-height: 1.55;
      }

      .qrField input:focus,
      .qrField textarea:focus,
      .qrField select:focus {
        border-color: var(--primary, #3286ed);
        box-shadow: 0 0 0 3px
          color-mix(
            in srgb,
            var(--primary, #3286ed) 12%,
            transparent
          );
      }

      .qrField small {
        min-height: 14px;
        display: block;
        margin-top: 5px;
        color: var(--text-secondary, #667085);
        font-size: 9px;
        line-height: 1.4;
      }

      /* =====================================================
         CATEGORY CHOICE
         ===================================================== */

      .qrChoice {
        display: flex;
        flex-wrap: wrap;
        gap: 7px;
      }

      .qrChoice button {
        min-height: 34px;
        border: 1px solid var(--border, #dce4ee);
        border-radius: 999px;
        background: var(--surface-2, #f7f9fc);
        color: var(--text-secondary, #667085);
        padding: 6px 12px;
        font-size: 10px;
        font-weight: 800;
        cursor: pointer;
      }

      .qrChoice button[data-active="true"] {
        border-color: var(--primary, #3286ed);
        background: var(--primary-soft, #eaf3ff);
        color: var(--primary, #3286ed);
      }

      /* =====================================================
         TOGGLES
         ===================================================== */

      .qrToggleField {
        position: relative;
        min-height: 58px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 15px;
        border: 1px solid var(--border, #dce4ee);
        border-radius: 13px;
        background: var(--surface-2, #f7f9fc);
        padding: 10px 13px;
        cursor: pointer;
      }

      .qrToggleField strong {
        color: var(--text, #101828);
        font-size: 11px;
      }

      .qrToggleField input {
        position: absolute;
        opacity: 0;
        pointer-events: none;
      }

      .qrToggleTrack {
        position: relative;
        width: 43px;
        height: 25px;
        flex: 0 0 auto;
        border-radius: 999px;
        background: var(--border, #dce4ee);
        transition: background 0.18s ease;
      }

      .qrToggleTrack i {
        position: absolute;
        left: 3px;
        top: 3px;
        width: 19px;
        height: 19px;
        border-radius: 50%;
        background: #fff;
        box-shadow: 0 2px 5px rgba(15, 23, 42, 0.2);
        transition: transform 0.18s ease;
      }

      .qrToggleField input:checked + .qrToggleTrack {
        background: var(--primary, #3286ed);
      }

      .qrToggleField input:checked + .qrToggleTrack i {
        transform: translateX(18px);
      }

      /* =====================================================
         TABLET
         ===================================================== */

      @media (max-width: 1100px) {
        .qrGrid4 {
          grid-template-columns:
            repeat(
              2,
              minmax(
                0,
                1fr
              )
            );
        }
      }

      @media (max-width: 900px) {
        .qrStats {
          grid-template-columns:
            repeat(
              2,
              minmax(
                0,
                1fr
              )
            );
        }

        .qrCardGrid {
          grid-template-columns:
            1fr;
        }

        .qrGrid3 {
          grid-template-columns:
            repeat(
              2,
              minmax(
                0,
                1fr
              )
            );
        }

        .qrGrid3 > :last-child:nth-child(odd) {
          grid-column:
            1 / -1;
        }
      }

      /* =====================================================
         MOBILE
         ===================================================== */

      @media (max-width: 640px) {
        .qrAdminTop {
          align-items: stretch;
          flex-direction: column;
        }

        .qrTopCreate {
          width: 100%;
        }

        .qrStats {
          grid-template-columns:
            repeat(
              2,
              minmax(
                0,
                1fr
              )
            );
          gap: 8px;
        }

        .qrStat {
          min-height: 88px;
          padding: 13px;
        }

        .qrStat strong {
          font-size: 22px;
        }

        .qrGrid2,
        .qrGrid3,
        .qrGrid4,
        .qrToggleGrid {
          grid-template-columns:
            1fr;
        }

        .qrGrid3 > :last-child:nth-child(odd) {
          grid-column:
            auto;
        }

        .qrModalBackdrop {
          align-items: flex-end;
          padding: 0;
        }

        .qrModal {
          width: 100%;
          max-height: 96vh;
          border-radius: 20px 20px 0 0;
        }

        .qrModalHeader {
          grid-template-columns:
            88px
            minmax(
              0,
              1fr
            )
            88px;
          padding: 10px;
        }

        .qrModalHeader strong {
          font-size: 14px;
        }

        .qrModalHeader button {
          padding: 0 7px;
          font-size: 10px;
        }

        .qrForm {
          padding: 12px;
        }

        .qrFormSection {
          padding: 13px;
        }

        .qrField textarea {
          height: 100px;
          min-height: 100px;
        }
      }
    `}</style>
  );
}