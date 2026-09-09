'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  rpcRequest,
} from '@/lib/supabase/browser';

import {
  useLocale,
} from '@/components/SiteProviders';

import styles
  from './QuestRewardAdminWorkspace.module.css';


type Row =
  Record<
    string,
    unknown
  >;


type AdminQuestRow = {
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


type AdminRewardRow = {
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

  walletValidityDays:
    number | null;

  partnerId: string | null;

  termsTh: string;
  termsEn: string;

  entitlementCode:
    string | null;

  entitlementDurationDays:
    number | null;

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


type QuestDraft = {
  id: string | null;

  slug: string;
  category: string;

  titleTh: string;
  titleEn: string;

  descriptionTh: string;
  descriptionEn: string;

  rewardPoints: number;

  rewardBadgeCode: string;
  rewardBadgeNameTh: string;
  rewardBadgeNameEn: string;

  verificationLevel: number;
  progressTarget: number;

  isSponsored: boolean;

  startsAt: string;
  endsAt: string;

  sortOrder: number;
  isActive: boolean;
};


type RewardDraft = {
  id: string | null;

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
  maxPerUser: number | null;

  startsAt: string;
  endsAt: string;

  walletValidityDays:
    number | null;

  partnerId: string;

  termsTh: string;
  termsEn: string;

  entitlementCode: string;

  entitlementDurationDays:
    number | null;

  isFeatured: boolean;
  isActive: boolean;

  sortOrder: number;
};


type Tab =
  | 'quests'
  | 'rewards';


type Filter =
  | 'all'
  | 'active'
  | 'inactive';


type Copy = {
  accessDenied: string;
  accessDeniedDesc: string;

  loading: string;
  loadFailed: string;
  retry: string;

  totalQuests: string;
  activeQuests: string;
  completedUsers: string;

  totalRewards: string;
  activeRewards: string;
  redeemed: string;
  used: string;

  quests: string;
  rewards: string;

  searchQuest: string;
  searchReward: string;

  all: string;
  active: string;
  inactive: string;

  createQuest: string;
  createReward: string;

  edit: string;

  activate: string;
  deactivate: string;

  noQuest: string;
  noReward: string;

  points: string;
  started: string;
  completed: string;
  pendingReview: string;

  cost: string;
  stock: string;
  unlimited: string;
  remaining: string;

  sponsored: string;
  featured: string;

  editQuest: string;
  editReward: string;

  basicInfo: string;
  conditions: string;
  rewardConfig: string;
  schedule: string;
  fulfillment: string;

  slug: string;
  code: string;
  category: string;

  titleTh: string;
  titleEn: string;

  descriptionTh: string;
  descriptionEn: string;

  rewardPoints: string;

  badgeCode: string;
  badgeNameTh: string;
  badgeNameEn: string;

  verificationLevel: string;
  progressTarget: string;

  startsAt: string;
  endsAt: string;

  sortOrder: string;

  enabled: string;

  isSponsored: string;
  isFeatured: string;

  fulfillmentType: string;

  partnerCode: string;
  entitlement: string;

  imageUrl: string;

  pointCost: string;

  stockTotal: string;
  maxPerUser: string;

  walletValidityDays: string;

  partnerId: string;

  termsTh: string;
  termsEn: string;

  entitlementCode: string;
  entitlementDuration: string;

  save: string;
  saving: string;
  cancel: string;

  saved: string;
  required: string;
};


const COPY:
Record<
  string,
  Copy
> = {
  th: {
    accessDenied: 'ไม่มีสิทธิ์จัดการ Quest & Reward',
    accessDeniedDesc: 'เมนูนี้สำหรับ Admin หรือ Super Admin ที่ได้รับสิทธิ์เท่านั้น',

    loading: 'กำลังโหลด Quest & Reward...',
    loadFailed: 'โหลดข้อมูลไม่สำเร็จ',
    retry: 'ลองใหม่',

    totalQuests: 'Quest ทั้งหมด',
    activeQuests: 'Quest เปิดใช้งาน',
    completedUsers: 'ผู้ใช้ที่ทำ Quest สำเร็จ',

    totalRewards: 'Reward ทั้งหมด',
    activeRewards: 'Reward เปิดใช้งาน',
    redeemed: 'แลกรางวัลแล้ว',
    used: 'ใช้รางวัลแล้ว',

    quests: 'Quests',
    rewards: 'Rewards',

    searchQuest: 'ค้นหาชื่อ Quest, Slug หรือ Category...',
    searchReward: 'ค้นหาชื่อ Reward, Code หรือ Category...',

    all: 'ทั้งหมด',
    active: 'เปิดใช้งาน',
    inactive: 'ปิดใช้งาน',

    createQuest: '+ สร้าง Quest',
    createReward: '+ สร้าง Reward',

    edit: 'แก้ไข',

    activate: 'เปิดใช้งาน',
    deactivate: 'ปิดใช้งาน',

    noQuest: 'ไม่พบ Quest',
    noReward: 'ไม่พบ Reward',

    points: 'คะแนน',
    started: 'เริ่มทำ',
    completed: 'สำเร็จ',
    pendingReview: 'รอตรวจ',

    cost: 'ใช้คะแนน',
    stock: 'Stock',
    unlimited: 'ไม่จำกัด',
    remaining: 'คงเหลือ',

    sponsored: 'Sponsored',
    featured: 'Featured',

    editQuest: 'แก้ไข Quest',
    editReward: 'แก้ไข Reward',

    basicInfo: 'ข้อมูลหลัก',
    conditions: 'เงื่อนไข Quest',
    rewardConfig: 'รางวัลจาก Quest',
    schedule: 'กำหนดเวลาและสถานะ',
    fulfillment: 'การรับรางวัล',

    slug: 'Slug',
    code: 'Code',
    category: 'Category',

    titleTh: 'ชื่อภาษาไทย',
    titleEn: 'ชื่อภาษาอังกฤษ',

    descriptionTh: 'รายละเอียดภาษาไทย',
    descriptionEn: 'รายละเอียดภาษาอังกฤษ',

    rewardPoints: 'คะแนนที่ได้รับ',

    badgeCode: 'Badge Code',
    badgeNameTh: 'ชื่อ Badge ภาษาไทย',
    badgeNameEn: 'ชื่อ Badge ภาษาอังกฤษ',

    verificationLevel: 'ระดับ Verification',
    progressTarget: 'Progress Target',

    startsAt: 'เริ่มแสดง',
    endsAt: 'สิ้นสุด',

    sortOrder: 'ลำดับการแสดง',

    enabled: 'เปิดใช้งาน',

    isSponsored: 'Sponsored Quest',
    isFeatured: 'Featured Reward',

    fulfillmentType: 'รูปแบบการรับรางวัล',

    partnerCode: 'Partner Code',
    entitlement: 'Entitlement',

    imageUrl: 'Image URL',

    pointCost: 'คะแนนที่ใช้แลก',

    stockTotal: 'จำนวน Stock',
    maxPerUser: 'สูงสุดต่อ User',

    walletValidityDays: 'อายุรางวัลใน Wallet (วัน)',

    partnerId: 'Partner ID',

    termsTh: 'เงื่อนไขภาษาไทย',
    termsEn: 'เงื่อนไขภาษาอังกฤษ',

    entitlementCode: 'Entitlement Code',
    entitlementDuration: 'อายุ Entitlement (วัน)',

    save: 'บันทึก',
    saving: 'กำลังบันทึก...',
    cancel: 'ยกเลิก',

    saved: 'บันทึกข้อมูลเรียบร้อยแล้ว',
    required: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบ',
  },

  en: {
    accessDenied: 'No Quest & Reward admin access',
    accessDeniedDesc: 'This tool is available only to authorized Admin or Super Admin accounts.',

    loading: 'Loading Quest & Reward...',
    loadFailed: 'Unable to load data',
    retry: 'Try again',

    totalQuests: 'Total quests',
    activeQuests: 'Active quests',
    completedUsers: 'Users completed',

    totalRewards: 'Total rewards',
    activeRewards: 'Active rewards',
    redeemed: 'Redeemed',
    used: 'Used',

    quests: 'Quests',
    rewards: 'Rewards',

    searchQuest: 'Search quest name, slug or category...',
    searchReward: 'Search reward name, code or category...',

    all: 'All',
    active: 'Active',
    inactive: 'Inactive',

    createQuest: '+ Create Quest',
    createReward: '+ Create Reward',

    edit: 'Edit',

    activate: 'Activate',
    deactivate: 'Deactivate',

    noQuest: 'No quests found',
    noReward: 'No rewards found',

    points: 'Points',
    started: 'Started',
    completed: 'Completed',
    pendingReview: 'Pending review',

    cost: 'Cost',
    stock: 'Stock',
    unlimited: 'Unlimited',
    remaining: 'Remaining',

    sponsored: 'Sponsored',
    featured: 'Featured',

    editQuest: 'Edit Quest',
    editReward: 'Edit Reward',

    basicInfo: 'Basic information',
    conditions: 'Quest conditions',
    rewardConfig: 'Quest reward',
    schedule: 'Schedule & status',
    fulfillment: 'Fulfillment',

    slug: 'Slug',
    code: 'Code',
    category: 'Category',

    titleTh: 'Thai title',
    titleEn: 'English title',

    descriptionTh: 'Thai description',
    descriptionEn: 'English description',

    rewardPoints: 'Reward points',

    badgeCode: 'Badge code',
    badgeNameTh: 'Thai badge name',
    badgeNameEn: 'English badge name',

    verificationLevel: 'Verification level',
    progressTarget: 'Progress target',

    startsAt: 'Starts at',
    endsAt: 'Ends at',

    sortOrder: 'Sort order',

    enabled: 'Active',

    isSponsored: 'Sponsored Quest',
    isFeatured: 'Featured Reward',

    fulfillmentType: 'Fulfillment type',

    partnerCode: 'Partner code',
    entitlement: 'Entitlement',

    imageUrl: 'Image URL',

    pointCost: 'Point cost',

    stockTotal: 'Total stock',
    maxPerUser: 'Max per user',

    walletValidityDays: 'Wallet validity (days)',

    partnerId: 'Partner ID',

    termsTh: 'Thai terms',
    termsEn: 'English terms',

    entitlementCode: 'Entitlement code',
    entitlementDuration: 'Entitlement duration (days)',

    save: 'Save',
    saving: 'Saving...',
    cancel: 'Cancel',

    saved: 'Saved successfully',
    required: 'Please complete all required fields.',
  },

  de: {
    accessDenied: 'Keine Quest-&-Reward-Berechtigung',
    accessDeniedDesc: 'Dieses Werkzeug ist nur für autorisierte Admins verfügbar.',

    loading: 'Quest & Reward werden geladen...',
    loadFailed: 'Daten konnten nicht geladen werden',
    retry: 'Erneut versuchen',

    totalQuests: 'Quests gesamt',
    activeQuests: 'Aktive Quests',
    completedUsers: 'Abgeschlossene Nutzer',

    totalRewards: 'Rewards gesamt',
    activeRewards: 'Aktive Rewards',
    redeemed: 'Eingelöst',
    used: 'Verwendet',

    quests: 'Quests',
    rewards: 'Rewards',

    searchQuest: 'Quest, Slug oder Kategorie suchen...',
    searchReward: 'Reward, Code oder Kategorie suchen...',

    all: 'Alle',
    active: 'Aktiv',
    inactive: 'Inaktiv',

    createQuest: '+ Quest erstellen',
    createReward: '+ Reward erstellen',

    edit: 'Bearbeiten',

    activate: 'Aktivieren',
    deactivate: 'Deaktivieren',

    noQuest: 'Keine Quests gefunden',
    noReward: 'Keine Rewards gefunden',

    points: 'Punkte',
    started: 'Gestartet',
    completed: 'Abgeschlossen',
    pendingReview: 'Prüfung offen',

    cost: 'Kosten',
    stock: 'Bestand',
    unlimited: 'Unbegrenzt',
    remaining: 'Verfügbar',

    sponsored: 'Gesponsert',
    featured: 'Hervorgehoben',

    editQuest: 'Quest bearbeiten',
    editReward: 'Reward bearbeiten',

    basicInfo: 'Grundinformationen',
    conditions: 'Quest-Bedingungen',
    rewardConfig: 'Quest-Belohnung',
    schedule: 'Zeitraum & Status',
    fulfillment: 'Einlösung',

    slug: 'Slug',
    code: 'Code',
    category: 'Kategorie',

    titleTh: 'Thailändischer Titel',
    titleEn: 'Englischer Titel',

    descriptionTh: 'Thailändische Beschreibung',
    descriptionEn: 'Englische Beschreibung',

    rewardPoints: 'Belohnungspunkte',

    badgeCode: 'Badge-Code',
    badgeNameTh: 'Thailändischer Badge-Name',
    badgeNameEn: 'Englischer Badge-Name',

    verificationLevel: 'Verifizierungsstufe',
    progressTarget: 'Fortschrittsziel',

    startsAt: 'Start',
    endsAt: 'Ende',

    sortOrder: 'Sortierung',

    enabled: 'Aktiv',

    isSponsored: 'Gesponserte Quest',
    isFeatured: 'Hervorgehobener Reward',

    fulfillmentType: 'Einlösungsart',

    partnerCode: 'Partner-Code',
    entitlement: 'Entitlement',

    imageUrl: 'Bild-URL',

    pointCost: 'Punktekosten',

    stockTotal: 'Gesamtbestand',
    maxPerUser: 'Maximum pro Nutzer',

    walletValidityDays: 'Wallet-Gültigkeit (Tage)',

    partnerId: 'Partner-ID',

    termsTh: 'Thailändische Bedingungen',
    termsEn: 'Englische Bedingungen',

    entitlementCode: 'Entitlement-Code',
    entitlementDuration: 'Entitlement-Dauer (Tage)',

    save: 'Speichern',
    saving: 'Wird gespeichert...',
    cancel: 'Abbrechen',

    saved: 'Erfolgreich gespeichert',
    required: 'Bitte alle Pflichtfelder ausfüllen.',
  },

  zh: {
    accessDenied: '没有 Quest & Reward 管理权限',
    accessDeniedDesc: '此工具仅限获得授权的管理员使用。',

    loading: '正在加载 Quest & Reward...',
    loadFailed: '无法加载数据',
    retry: '重试',

    totalQuests: 'Quest 总数',
    activeQuests: '启用的 Quest',
    completedUsers: '完成人数',

    totalRewards: 'Reward 总数',
    activeRewards: '启用的 Reward',
    redeemed: '已兑换',
    used: '已使用',

    quests: 'Quests',
    rewards: 'Rewards',

    searchQuest: '搜索 Quest 名称、Slug 或分类...',
    searchReward: '搜索 Reward 名称、Code 或分类...',

    all: '全部',
    active: '启用',
    inactive: '停用',

    createQuest: '+ 创建 Quest',
    createReward: '+ 创建 Reward',

    edit: '编辑',

    activate: '启用',
    deactivate: '停用',

    noQuest: '没有找到 Quest',
    noReward: '没有找到 Reward',

    points: '积分',
    started: '已开始',
    completed: '已完成',
    pendingReview: '待审核',

    cost: '所需积分',
    stock: '库存',
    unlimited: '不限',
    remaining: '剩余',

    sponsored: '赞助',
    featured: '推荐',

    editQuest: '编辑 Quest',
    editReward: '编辑 Reward',

    basicInfo: '基本信息',
    conditions: 'Quest 条件',
    rewardConfig: 'Quest 奖励',
    schedule: '时间与状态',
    fulfillment: '兑换方式',

    slug: 'Slug',
    code: 'Code',
    category: '分类',

    titleTh: '泰文标题',
    titleEn: '英文标题',

    descriptionTh: '泰文描述',
    descriptionEn: '英文描述',

    rewardPoints: '奖励积分',

    badgeCode: 'Badge Code',
    badgeNameTh: '泰文 Badge 名称',
    badgeNameEn: '英文 Badge 名称',

    verificationLevel: '验证等级',
    progressTarget: '进度目标',

    startsAt: '开始时间',
    endsAt: '结束时间',

    sortOrder: '排序',

    enabled: '启用',

    isSponsored: '赞助 Quest',
    isFeatured: '推荐 Reward',

    fulfillmentType: '兑换类型',

    partnerCode: 'Partner Code',
    entitlement: 'Entitlement',

    imageUrl: '图片 URL',

    pointCost: '兑换积分',

    stockTotal: '总库存',
    maxPerUser: '每个用户上限',

    walletValidityDays: 'Wallet 有效期（天）',

    partnerId: 'Partner ID',

    termsTh: '泰文条款',
    termsEn: '英文条款',

    entitlementCode: 'Entitlement Code',
    entitlementDuration: 'Entitlement 有效期（天）',

    save: '保存',
    saving: '保存中...',
    cancel: '取消',

    saved: '保存成功',
    required: '请填写所有必填信息。',
  },

  ja: {
    accessDenied: 'Quest & Reward の管理権限がありません',
    accessDeniedDesc: 'このツールは承認された管理者のみ利用できます。',

    loading: 'Quest & Reward を読み込み中...',
    loadFailed: 'データを読み込めませんでした',
    retry: '再試行',

    totalQuests: 'Quest 合計',
    activeQuests: '有効な Quest',
    completedUsers: '完了ユーザー',

    totalRewards: 'Reward 合計',
    activeRewards: '有効な Reward',
    redeemed: '交換済み',
    used: '使用済み',

    quests: 'Quests',
    rewards: 'Rewards',

    searchQuest: 'Quest 名、Slug、カテゴリを検索...',
    searchReward: 'Reward 名、Code、カテゴリを検索...',

    all: 'すべて',
    active: '有効',
    inactive: '無効',

    createQuest: '+ Quest を作成',
    createReward: '+ Reward を作成',

    edit: '編集',

    activate: '有効化',
    deactivate: '無効化',

    noQuest: 'Quest がありません',
    noReward: 'Reward がありません',

    points: 'ポイント',
    started: '開始',
    completed: '完了',
    pendingReview: '審査待ち',

    cost: '必要ポイント',
    stock: '在庫',
    unlimited: '無制限',
    remaining: '残り',

    sponsored: 'Sponsored',
    featured: 'Featured',

    editQuest: 'Quest を編集',
    editReward: 'Reward を編集',

    basicInfo: '基本情報',
    conditions: 'Quest 条件',
    rewardConfig: 'Quest 報酬',
    schedule: '期間と状態',
    fulfillment: '受取方法',

    slug: 'Slug',
    code: 'Code',
    category: 'カテゴリ',

    titleTh: 'タイ語タイトル',
    titleEn: '英語タイトル',

    descriptionTh: 'タイ語説明',
    descriptionEn: '英語説明',

    rewardPoints: '報酬ポイント',

    badgeCode: 'Badge Code',
    badgeNameTh: 'タイ語 Badge 名',
    badgeNameEn: '英語 Badge 名',

    verificationLevel: '本人確認レベル',
    progressTarget: '進捗目標',

    startsAt: '開始日時',
    endsAt: '終了日時',

    sortOrder: '表示順',

    enabled: '有効',

    isSponsored: 'Sponsored Quest',
    isFeatured: 'Featured Reward',

    fulfillmentType: '受取方式',

    partnerCode: 'Partner Code',
    entitlement: 'Entitlement',

    imageUrl: '画像 URL',

    pointCost: '必要ポイント',

    stockTotal: '総在庫',
    maxPerUser: 'ユーザーごとの上限',

    walletValidityDays: 'Wallet 有効日数',

    partnerId: 'Partner ID',

    termsTh: 'タイ語利用条件',
    termsEn: '英語利用条件',

    entitlementCode: 'Entitlement Code',
    entitlementDuration: 'Entitlement 有効日数',

    save: '保存',
    saving: '保存中...',
    cancel: 'キャンセル',

    saved: '保存しました',
    required: '必須項目を入力してください。',
  },

  ko: {
    accessDenied: 'Quest & Reward 관리자 권한 없음',
    accessDeniedDesc: '이 도구는 승인된 관리자만 사용할 수 있습니다.',

    loading: 'Quest & Reward 불러오는 중...',
    loadFailed: '데이터를 불러오지 못했습니다',
    retry: '다시 시도',

    totalQuests: '전체 Quest',
    activeQuests: '활성 Quest',
    completedUsers: '완료 사용자',

    totalRewards: '전체 Reward',
    activeRewards: '활성 Reward',
    redeemed: '교환 완료',
    used: '사용 완료',

    quests: 'Quests',
    rewards: 'Rewards',

    searchQuest: 'Quest 이름, Slug 또는 Category 검색...',
    searchReward: 'Reward 이름, Code 또는 Category 검색...',

    all: '전체',
    active: '활성',
    inactive: '비활성',

    createQuest: '+ Quest 만들기',
    createReward: '+ Reward 만들기',

    edit: '수정',

    activate: '활성화',
    deactivate: '비활성화',

    noQuest: 'Quest가 없습니다',
    noReward: 'Reward가 없습니다',

    points: '포인트',
    started: '시작',
    completed: '완료',
    pendingReview: '검토 대기',

    cost: '필요 포인트',
    stock: '재고',
    unlimited: '무제한',
    remaining: '남음',

    sponsored: 'Sponsored',
    featured: 'Featured',

    editQuest: 'Quest 수정',
    editReward: 'Reward 수정',

    basicInfo: '기본 정보',
    conditions: 'Quest 조건',
    rewardConfig: 'Quest 보상',
    schedule: '기간 및 상태',
    fulfillment: '지급 방식',

    slug: 'Slug',
    code: 'Code',
    category: 'Category',

    titleTh: '태국어 제목',
    titleEn: '영어 제목',

    descriptionTh: '태국어 설명',
    descriptionEn: '영어 설명',

    rewardPoints: '보상 포인트',

    badgeCode: 'Badge Code',
    badgeNameTh: '태국어 Badge 이름',
    badgeNameEn: '영어 Badge 이름',

    verificationLevel: '인증 레벨',
    progressTarget: '진행 목표',

    startsAt: '시작 시간',
    endsAt: '종료 시간',

    sortOrder: '정렬 순서',

    enabled: '활성',

    isSponsored: 'Sponsored Quest',
    isFeatured: 'Featured Reward',

    fulfillmentType: '지급 유형',

    partnerCode: 'Partner Code',
    entitlement: 'Entitlement',

    imageUrl: '이미지 URL',

    pointCost: '교환 포인트',

    stockTotal: '전체 재고',
    maxPerUser: '사용자당 최대',

    walletValidityDays: 'Wallet 유효 기간(일)',

    partnerId: 'Partner ID',

    termsTh: '태국어 이용 조건',
    termsEn: '영어 이용 조건',

    entitlementCode: 'Entitlement Code',
    entitlementDuration: 'Entitlement 기간(일)',

    save: '저장',
    saving: '저장 중...',
    cancel: '취소',

    saved: '저장했습니다',
    required: '필수 정보를 모두 입력하세요.',
  },
};


function asRows(
  value: unknown,
): Row[] {
  return Array.isArray(
    value,
  )
    ? value.filter(
        (
          item,
        ): item is Row =>
          Boolean(
            item &&
            typeof item === 'object' &&
            !Array.isArray(item),
          ),
      )
    : [];
}


function asRecord(
  value: unknown,
): Row {
  if (
    Array.isArray(value)
  ) {
    const first =
      value[0];

    return first &&
      typeof first === 'object' &&
      !Array.isArray(first)
      ? first as Row
      : {};
  }

  return value &&
    typeof value === 'object'
    ? value as Row
    : {};
}


function text(
  value: unknown,
  fallback = '',
) {
  return typeof value === 'string'
    ? value
    : fallback;
}


function num(
  value: unknown,
  fallback = 0,
) {
  const number =
    Number(value);

  return Number.isFinite(
    number,
  )
    ? number
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

  const number =
    Number(value);

  return Number.isFinite(
    number,
  )
    ? number
    : null;
}


function boolean(
  value: unknown,
) {
  return (
    value === true ||
    value === 'true' ||
    value === 1 ||
    value === '1'
  );
}


function nullableText(
  value: unknown,
) {
  const valueText =
    text(
      value,
    ).trim();

  return valueText ||
    null;
}


function dateInput(
  value:
    string |
    null,
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
    return value.slice(
      0,
      16,
    );
  }

  const local =
    new Date(
      date.getTime() -
      date.getTimezoneOffset() *
        60000,
    );

  return local
    .toISOString()
    .slice(
      0,
      16,
    );
}


function datePayload(
  value: string,
) {
  const clean =
    value.trim();

  if (!clean) {
    return null;
  }

  const date =
    new Date(clean);

  return Number.isNaN(
    date.getTime(),
  )
    ? clean
    : date.toISOString();
}


function emptyQuest():
QuestDraft {
  return {
    id: null,

    slug: '',
    category: 'special',

    titleTh: '',
    titleEn: '',

    descriptionTh: '',
    descriptionEn: '',

    rewardPoints: 10,

    rewardBadgeCode: '',
    rewardBadgeNameTh: '',
    rewardBadgeNameEn: '',

    verificationLevel: 1,
    progressTarget: 1,

    isSponsored: false,

    startsAt: '',
    endsAt: '',

    sortOrder: 0,
    isActive: true,
  };
}


function emptyReward():
RewardDraft {
  return {
    id: null,

    code: '',
    category: 'voucher',

    fulfillmentType:
      'partner_code',

    titleTh: '',
    titleEn: '',

    descriptionTh: '',
    descriptionEn: '',

    imageUrl: '',

    pointCost: 100,

    stockTotal: null,
    maxPerUser: null,

    startsAt: '',
    endsAt: '',

    walletValidityDays:
      null,

    partnerId: '',

    termsTh: '',
    termsEn: '',

    entitlementCode: '',

    entitlementDurationDays:
      null,

    isFeatured: false,
    isActive: true,

    sortOrder: 0,
  };
}


async function getAccess() {
  const result =
    await rpcRequest<
      Row |
      Row[]
    >(
      'get_my_melo_quest_reward_admin_access_v1',
    );

  if (
    result.error
  ) {
    throw new Error(
      result.error,
    );
  }

  const row =
    asRecord(
      result.data,
    );

  return boolean(
    row.allowed,
  );
}


async function getStats():
Promise<
  Stats
> {
  const result =
    await rpcRequest<
      Row |
      Row[]
    >(
      'admin_get_melo_quest_reward_stats_v1',
    );

  if (
    result.error
  ) {
    throw new Error(
      result.error,
    );
  }

  const row =
    asRecord(
      result.data,
    );

  return {
    questTotal:
      num(
        row.quest_total,
      ),

    questActive:
      num(
        row.quest_active,
      ),

    questCompletedUsers:
      num(
        row.quest_completed_users,
      ),

    rewardTotal:
      num(
        row.reward_total,
      ),

    rewardActive:
      num(
        row.reward_active,
      ),

    rewardRedeemed:
      num(
        row.reward_redeemed,
      ),

    rewardUsed:
      num(
        row.reward_used,
      ),
  };
}


async function getQuests():
Promise<
  AdminQuestRow[]
> {
  const result =
    await rpcRequest<
      Row[]
    >(
      'admin_list_melo_quests_v1',
    );

  if (
    result.error
  ) {
    throw new Error(
      result.error,
    );
  }

  return asRows(
    result.data,
  )
    .map(
      (row) => ({
        id:
          text(
            row.id,
          ),

        slug:
          text(
            row.slug,
          ),

        category:
          text(
            row.category,
            'special',
          ),

        titleTh:
          text(
            row.title_th,
          ),

        titleEn:
          text(
            row.title_en,
          ),

        descriptionTh:
          text(
            row.description_th,
          ),

        descriptionEn:
          text(
            row.description_en,
          ),

        rewardPoints:
          num(
            row.reward_points,
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
                row.verification_level,
                1,
              ),
            ),
          ),

        progressTarget:
          Math.max(
            1,
            num(
              row.progress_target,
              1,
            ),
          ),

        isSponsored:
          boolean(
            row.is_sponsored,
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
            row.sort_order,
          ),

        isActive:
          boolean(
            row.is_active,
          ),

        startedCount:
          num(
            row.started_count,
          ),

        completedCount:
          num(
            row.completed_count,
          ),

        pendingReviewCount:
          num(
            row.pending_review_count,
          ),
      }),
    )
    .filter(
      (row) =>
        Boolean(
          row.id,
        ),
    );
}


async function getRewards():
Promise<
  AdminRewardRow[]
> {
  const result =
    await rpcRequest<
      Row[]
    >(
      'admin_list_melo_rewards_v1',
    );

  if (
    result.error
  ) {
    throw new Error(
      result.error,
    );
  }

  return asRows(
    result.data,
  )
    .map(
      (row): AdminRewardRow => ({
        id:
          text(
            row.id,
          ),

        code:
          text(
            row.code,
          ),

        category:
          text(
            row.category,
            'voucher',
          ),

        fulfillmentType:
          (
            row.fulfillment_type ===
            'entitlement'
              ? 'entitlement'
              : 'partner_code'
          ) as AdminRewardRow['fulfillmentType'],

        titleTh:
          text(
            row.title_th,
          ),

        titleEn:
          text(
            row.title_en,
          ),

        descriptionTh:
          text(
            row.description_th,
          ),

        descriptionEn:
          text(
            row.description_en,
          ),

        imageUrl:
          text(
            row.image_url,
          ),

        pointCost:
          num(
            row.point_cost,
          ),

        stockTotal:
          nullableNum(
            row.stock_total,
          ),

        stockRedeemed:
          num(
            row.stock_redeemed,
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
            row.terms_th,
          ),

        termsEn:
          text(
            row.terms_en,
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
          boolean(
            row.is_featured,
          ),

        isActive:
          boolean(
            row.is_active,
          ),

        sortOrder:
          num(
            row.sort_order,
          ),

        redeemedCount:
          num(
            row.redeemed_count,
          ),

        readyCount:
          num(
            row.ready_count,
          ),

        usedCount:
          num(
            row.used_count,
          ),

        expiredCount:
          num(
            row.expired_count,
          ),

        cancelledCount:
          num(
            row.cancelled_count,
          ),
      }),
    )
    .filter(
      (row) =>
        Boolean(
          row.id,
        ),
    );
}


async function saveQuest(
  input:
    QuestDraft,
) {
  const result =
    await rpcRequest(
      'admin_upsert_melo_quest_v1',
      {
        p_payload: {
          id:
            input.id,

          slug:
            input.slug.trim(),

          category:
            input.category.trim(),

          title_th:
            input.titleTh.trim(),

          title_en:
            input.titleEn.trim(),

          description_th:
            input.descriptionTh.trim(),

          description_en:
            input.descriptionEn.trim(),

          reward_points:
            Math.max(
              1,
              Math.round(
                input.rewardPoints,
              ),
            ),

          reward_badge_code:
            input.rewardBadgeCode
              .trim() ||
            null,

          reward_badge_name_th:
            input.rewardBadgeNameTh
              .trim() ||
            null,

          reward_badge_name_en:
            input.rewardBadgeNameEn
              .trim() ||
            null,

          verification_level:
            Math.max(
              1,
              Math.min(
                3,
                Math.round(
                  input.verificationLevel,
                ),
              ),
            ),

          progress_target:
            Math.max(
              1,
              Math.round(
                input.progressTarget,
              ),
            ),

          is_sponsored:
            input.isSponsored,

          starts_at:
            datePayload(
              input.startsAt,
            ),

          ends_at:
            datePayload(
              input.endsAt,
            ),

          sort_order:
            Math.round(
              input.sortOrder,
            ),

          is_active:
            input.isActive,
        },
      },
    );

  if (
    result.error
  ) {
    throw new Error(
      result.error,
    );
  }
}


async function saveReward(
  input:
    RewardDraft,
) {
  const result =
    await rpcRequest(
      'admin_upsert_melo_reward_v1',
      {
        p_payload: {
          id:
            input.id,

          code:
            input.code.trim(),

          category:
            input.category.trim(),

          fulfillment_type:
            input.fulfillmentType,

          title_th:
            input.titleTh.trim(),

          title_en:
            input.titleEn.trim(),

          description_th:
            input.descriptionTh.trim(),

          description_en:
            input.descriptionEn.trim(),

          image_url:
            input.imageUrl.trim(),

          point_cost:
            Math.max(
              1,
              Math.round(
                input.pointCost,
              ),
            ),

          stock_total:
            input.stockTotal ==
            null
              ? null
              : Math.max(
                  0,
                  Math.round(
                    input.stockTotal,
                  ),
                ),

          max_per_user:
            input.maxPerUser ==
            null
              ? null
              : Math.max(
                  1,
                  Math.round(
                    input.maxPerUser,
                  ),
                ),

          starts_at:
            datePayload(
              input.startsAt,
            ),

          ends_at:
            datePayload(
              input.endsAt,
            ),

          wallet_validity_days:
            input.walletValidityDays ==
            null
              ? null
              : Math.max(
                  1,
                  Math.round(
                    input.walletValidityDays,
                  ),
                ),

          partner_id:
            input.partnerId
              .trim() ||
            null,

          terms_th:
            input.termsTh.trim(),

          terms_en:
            input.termsEn.trim(),

          entitlement_code:
            input.entitlementCode
              .trim() ||
            null,

          entitlement_duration_days:
            input.entitlementDurationDays ==
            null
              ? null
              : Math.max(
                  1,
                  Math.round(
                    input.entitlementDurationDays,
                  ),
                ),

          is_featured:
            input.isFeatured,

          is_active:
            input.isActive,

          sort_order:
            Math.round(
              input.sortOrder,
            ),
        },
      },
    );

  if (
    result.error
  ) {
    throw new Error(
      result.error,
    );
  }
}


async function setQuestActive(
  id:
    string,

  active:
    boolean,
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
    throw new Error(
      result.error,
    );
  }
}


async function setRewardActive(
  id:
    string,

  active:
    boolean,
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
    throw new Error(
      result.error,
    );
  }
}


export default function QuestRewardAdminWorkspace() {
  const {
    locale,
  } =
    useLocale();

  const copy =
    COPY[locale] ??
    COPY.en;

  const [
    access,
    setAccess,
  ] =
    useState(false);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    busy,
    setBusy,
  ] =
    useState('');

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
    stats,
    setStats,
  ] =
    useState<
      Stats |
      null
    >(null);

  const [
    quests,
    setQuests,
  ] =
    useState<
      AdminQuestRow[]
    >([]);

  const [
    rewards,
    setRewards,
  ] =
    useState<
      AdminRewardRow[]
    >([]);

  const [
    tab,
    setTab,
  ] =
    useState<
      Tab
    >(
      'quests',
    );

  const [
    filter,
    setFilter,
  ] =
    useState<
      Filter
    >(
      'all',
    );

  const [
    search,
    setSearch,
  ] =
    useState('');

  const [
    questEditor,
    setQuestEditor,
  ] =
    useState<
      QuestDraft |
      null
    >(null);

  const [
    rewardEditor,
    setRewardEditor,
  ] =
    useState<
      RewardDraft |
      null
    >(null);


  const load =
    useCallback(
      async () => {
        setLoading(true);
        setError('');

        try {
          const allowed =
            await getAccess();

          setAccess(
            allowed,
          );

          if (!allowed) {
            setStats(null);
            setQuests([]);
            setRewards([]);

            return;
          }

          const [
            nextStats,
            nextQuests,
            nextRewards,
          ] =
            await Promise.all([
              getStats(),
              getQuests(),
              getRewards(),
            ]);

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
            cause instanceof Error
              ? cause.message
              : copy.loadFailed,
          );
        } finally {
          setLoading(false);
        }
      },
      [
        copy.loadFailed,
      ],
    );


  useEffect(
    () => {
      void load();
    },
    [
      load,
    ],
  );


  const visibleQuests =
    useMemo(
      () => {
        const query =
          search
            .trim()
            .toLowerCase();

        return quests.filter(
          (row) => {
            if (
              filter === 'active' &&
              !row.isActive
            ) {
              return false;
            }

            if (
              filter === 'inactive' &&
              row.isActive
            ) {
              return false;
            }

            if (!query) {
              return true;
            }

            return [
              row.titleTh,
              row.titleEn,
              row.slug,
              row.category,
              row.descriptionTh,
              row.descriptionEn,
            ]
              .join(' ')
              .toLowerCase()
              .includes(
                query,
              );
          },
        );
      },
      [
        filter,
        quests,
        search,
      ],
    );


  const visibleRewards =
    useMemo(
      () => {
        const query =
          search
            .trim()
            .toLowerCase();

        return rewards.filter(
          (row) => {
            if (
              filter === 'active' &&
              !row.isActive
            ) {
              return false;
            }

            if (
              filter === 'inactive' &&
              row.isActive
            ) {
              return false;
            }

            if (!query) {
              return true;
            }

            return [
              row.titleTh,
              row.titleEn,
              row.code,
              row.category,
              row.descriptionTh,
              row.descriptionEn,
            ]
              .join(' ')
              .toLowerCase()
              .includes(
                query,
              );
          },
        );
      },
      [
        filter,
        rewards,
        search,
      ],
    );


  function questTitle(
    row:
      AdminQuestRow,
  ) {
    return locale === 'th'
      ? row.titleTh ||
        row.titleEn ||
        row.slug
      : row.titleEn ||
        row.titleTh ||
        row.slug;
  }


  function rewardTitle(
    row:
      AdminRewardRow,
  ) {
    return locale === 'th'
      ? row.titleTh ||
        row.titleEn ||
        row.code
      : row.titleEn ||
        row.titleTh ||
        row.code;
  }


  function editQuest(
    row:
      AdminQuestRow,
  ) {
    setQuestEditor({
      id:
        row.id,

      slug:
        row.slug,

      category:
        row.category,

      titleTh:
        row.titleTh,

      titleEn:
        row.titleEn,

      descriptionTh:
        row.descriptionTh,

      descriptionEn:
        row.descriptionEn,

      rewardPoints:
        row.rewardPoints,

      rewardBadgeCode:
        row.rewardBadgeCode ??
        '',

      rewardBadgeNameTh:
        row.rewardBadgeNameTh ??
        '',

      rewardBadgeNameEn:
        row.rewardBadgeNameEn ??
        '',

      verificationLevel:
        row.verificationLevel,

      progressTarget:
        row.progressTarget,

      isSponsored:
        row.isSponsored,

      startsAt:
        dateInput(
          row.startsAt,
        ),

      endsAt:
        dateInput(
          row.endsAt,
        ),

      sortOrder:
        row.sortOrder,

      isActive:
        row.isActive,
    });
  }


  function editReward(
    row:
      AdminRewardRow,
  ) {
    setRewardEditor({
      id:
        row.id,

      code:
        row.code,

      category:
        row.category,

      fulfillmentType:
        row.fulfillmentType,

      titleTh:
        row.titleTh,

      titleEn:
        row.titleEn,

      descriptionTh:
        row.descriptionTh,

      descriptionEn:
        row.descriptionEn,

      imageUrl:
        row.imageUrl,

      pointCost:
        row.pointCost,

      stockTotal:
        row.stockTotal,

      maxPerUser:
        row.maxPerUser,

      startsAt:
        dateInput(
          row.startsAt,
        ),

      endsAt:
        dateInput(
          row.endsAt,
        ),

      walletValidityDays:
        row.walletValidityDays,

      partnerId:
        row.partnerId ??
        '',

      termsTh:
        row.termsTh,

      termsEn:
        row.termsEn,

      entitlementCode:
        row.entitlementCode ??
        '',

      entitlementDurationDays:
        row.entitlementDurationDays,

      isFeatured:
        row.isFeatured,

      isActive:
        row.isActive,

      sortOrder:
        row.sortOrder,
    });
  }


  async function submitQuest() {
    if (
      !questEditor
    ) {
      return;
    }

    if (
      !questEditor.slug.trim() ||
      !questEditor.category.trim() ||
      !questEditor.titleTh.trim() ||
      !questEditor.titleEn.trim()
    ) {
      setError(
        copy.required,
      );

      return;
    }

    setBusy(
      'save-quest',
    );

    setError('');

    try {
      await saveQuest(
        questEditor,
      );

      setQuestEditor(
        null,
      );

      setSuccess(
        copy.saved,
      );

      await load();

      window.setTimeout(
        () =>
          setSuccess(''),
        3000,
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
      setBusy('');
    }
  }


  async function submitReward() {
    if (
      !rewardEditor
    ) {
      return;
    }

    if (
      !rewardEditor.code.trim() ||
      !rewardEditor.category.trim() ||
      !rewardEditor.titleTh.trim() ||
      !rewardEditor.titleEn.trim()
    ) {
      setError(
        copy.required,
      );

      return;
    }

    setBusy(
      'save-reward',
    );

    setError('');

    try {
      await saveReward(
        rewardEditor,
      );

      setRewardEditor(
        null,
      );

      setSuccess(
        copy.saved,
      );

      await load();

      window.setTimeout(
        () =>
          setSuccess(''),
        3000,
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
      setBusy('');
    }
  }


  async function toggleQuest(
    row:
      AdminQuestRow,
  ) {
    setBusy(
      row.id,
    );

    setError('');

    try {
      await setQuestActive(
        row.id,
        !row.isActive,
      );

      await load();
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
      setBusy('');
    }
  }


  async function toggleReward(
    row:
      AdminRewardRow,
  ) {
    setBusy(
      row.id,
    );

    setError('');

    try {
      await setRewardActive(
        row.id,
        !row.isActive,
      );

      await load();
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
      setBusy('');
    }
  }


  if (
    loading &&
    !stats
  ) {
    return (
      <div
        className={
          styles.state
        }
      >
        <span
          className={
            styles.spinner
          }
        />

        <strong>
          {copy.loading}
        </strong>
      </div>
    );
  }


  if (
    !access
  ) {
    return (
      <div
        className={
          styles.state
        }
      >
        <span
          className={
            styles.stateIcon
          }
        >
          Q
        </span>

        <strong>
          {copy.accessDenied}
        </strong>

        <p>
          {copy.accessDeniedDesc}
        </p>

        {error ? (
          <small>
            {error}
          </small>
        ) : null}
      </div>
    );
  }


  return (
    <section
      className={
        styles.workspace
      }
    >
      <div
        className={
          styles.stats
        }
      >
        <Metric
          label={
            copy.totalQuests
          }
          value={
            stats?.questTotal ??
            0
          }
        />

        <Metric
          label={
            copy.activeQuests
          }
          value={
            stats?.questActive ??
            0
          }
          highlight
        />

        <Metric
          label={
            copy.completedUsers
          }
          value={
            stats?.questCompletedUsers ??
            0
          }
        />

        <Metric
          label={
            copy.totalRewards
          }
          value={
            stats?.rewardTotal ??
            0
          }
        />

        <Metric
          label={
            copy.activeRewards
          }
          value={
            stats?.rewardActive ??
            0
          }
          highlight
        />

        <Metric
          label={
            copy.redeemed
          }
          value={
            stats?.rewardRedeemed ??
            0
          }
        />

        <Metric
          label={
            copy.used
          }
          value={
            stats?.rewardUsed ??
            0
          }
        />
      </div>

      <section
        className={
          styles.panel
        }
      >
        <header
          className={
            styles.toolbar
          }
        >
          <div
            className={
              styles.tabs
            }
          >
            <button
              type="button"
              data-active={
                tab ===
                'quests'
              }
              onClick={() => {
                setTab(
                  'quests',
                );

                setSearch('');
                setFilter('all');
              }}
            >
              {copy.quests}

              <b>
                {quests.length}
              </b>
            </button>

            <button
              type="button"
              data-active={
                tab ===
                'rewards'
              }
              onClick={() => {
                setTab(
                  'rewards',
                );

                setSearch('');
                setFilter('all');
              }}
            >
              {copy.rewards}

              <b>
                {rewards.length}
              </b>
            </button>
          </div>

          <button
            type="button"
            className={
              styles.create
            }
            onClick={() =>
              tab === 'quests'
                ? setQuestEditor(
                    emptyQuest(),
                  )
                : setRewardEditor(
                    emptyReward(),
                  )
            }
          >
            {tab === 'quests'
              ? copy.createQuest
              : copy.createReward}
          </button>
        </header>

        <div
          className={
            styles.filters
          }
        >
          <div
            className={
              styles.search
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
                tab === 'quests'
                  ? copy.searchQuest
                  : copy.searchReward
              }
            />

            {search ? (
              <button
                type="button"
                onClick={() =>
                  setSearch('')
                }
              >
                ×
              </button>
            ) : null}
          </div>

          <div
            className={
              styles.filterButtons
            }
          >
            {(
              [
                'all',
                'active',
                'inactive',
              ] as Filter[]
            ).map(
              (value) => (
                <button
                  type="button"
                  key={
                    value
                  }
                  data-active={
                    filter ===
                    value
                  }
                  onClick={() =>
                    setFilter(
                      value,
                    )
                  }
                >
                  {value === 'all'
                    ? copy.all
                    : value === 'active'
                      ? copy.active
                      : copy.inactive}
                </button>
              ),
            )}
          </div>
        </div>

        {error ? (
          <div
            className={
              styles.error
            }
          >
            <span>
              {error}
            </span>

            <button
              type="button"
              onClick={() =>
                setError('')
              }
            >
              ×
            </button>
          </div>
        ) : null}

        {success ? (
          <div
            className={
              styles.success
            }
          >
            ✓ {success}
          </div>
        ) : null}

        {tab === 'quests' ? (
          <div
            className={
              styles.list
            }
          >
            {visibleQuests.length ? (
              visibleQuests.map(
                (row) => (
                  <article
                    className={
                      styles.item
                    }
                    key={
                      row.id
                    }
                  >
                    <div
                      className={
                        styles.itemIcon
                      }
                    >
                      Q
                    </div>

                    <div
                      className={
                        styles.itemMain
                      }
                    >
                      <div
                        className={
                          styles.itemTitle
                        }
                      >
                        <strong>
                          {questTitle(
                            row,
                          )}
                        </strong>

                        <span
                          data-active={
                            row.isActive
                          }
                        >
                          {row.isActive
                            ? copy.active
                            : copy.inactive}
                        </span>

                        {row.isSponsored ? (
                          <em>
                            {copy.sponsored}
                          </em>
                        ) : null}
                      </div>

                      <p>
                        {locale === 'th'
                          ? row.descriptionTh ||
                            row.descriptionEn
                          : row.descriptionEn ||
                            row.descriptionTh}
                      </p>

                      <div
                        className={
                          styles.meta
                        }
                      >
                        <span>
                          {row.category}
                        </span>

                        <span>
                          {row.rewardPoints}{' '}
                          {copy.points}
                        </span>

                        <span>
                          Verification{' '}
                          Lv.{row.verificationLevel}
                        </span>

                        <span>
                          Target{' '}
                          {row.progressTarget}
                        </span>
                      </div>

                      <div
                        className={
                          styles.performance
                        }
                      >
                        <span>
                          {copy.started}{' '}
                          <b>
                            {row.startedCount}
                          </b>
                        </span>

                        <span>
                          {copy.completed}{' '}
                          <b>
                            {row.completedCount}
                          </b>
                        </span>

                        <span
                          data-alert={
                            row.pendingReviewCount >
                            0
                          }
                        >
                          {copy.pendingReview}{' '}
                          <b>
                            {row.pendingReviewCount}
                          </b>
                        </span>
                      </div>
                    </div>

                    <div
                      className={
                        styles.itemActions
                      }
                    >
                      <button
                        type="button"
                        onClick={() =>
                          editQuest(
                            row,
                          )
                        }
                      >
                        {copy.edit}
                      </button>

                      <button
                        type="button"
                        disabled={
                          busy ===
                          row.id
                        }
                        data-danger={
                          row.isActive
                        }
                        onClick={() =>
                          void toggleQuest(
                            row,
                          )
                        }
                      >
                        {row.isActive
                          ? copy.deactivate
                          : copy.activate}
                      </button>
                    </div>
                  </article>
                ),
              )
            ) : (
              <div
                className={
                  styles.empty
                }
              >
                <span>
                  Q
                </span>

                <strong>
                  {copy.noQuest}
                </strong>
              </div>
            )}
          </div>
        ) : (
          <div
            className={
              styles.list
            }
          >
            {visibleRewards.length ? (
              visibleRewards.map(
                (row) => (
                  <article
                    className={
                      styles.item
                    }
                    key={
                      row.id
                    }
                  >
                    <div
                      className={
                        styles.rewardMedia
                      }
                    >
                      {row.imageUrl ? (
                        <img
                          src={
                            row.imageUrl
                          }
                          alt=""
                        />
                      ) : (
                        <span>
                          R
                        </span>
                      )}
                    </div>

                    <div
                      className={
                        styles.itemMain
                      }
                    >
                      <div
                        className={
                          styles.itemTitle
                        }
                      >
                        <strong>
                          {rewardTitle(
                            row,
                          )}
                        </strong>

                        <span
                          data-active={
                            row.isActive
                          }
                        >
                          {row.isActive
                            ? copy.active
                            : copy.inactive}
                        </span>

                        {row.isFeatured ? (
                          <em>
                            {copy.featured}
                          </em>
                        ) : null}
                      </div>

                      <p>
                        {locale === 'th'
                          ? row.descriptionTh ||
                            row.descriptionEn
                          : row.descriptionEn ||
                            row.descriptionTh}
                      </p>

                      <div
                        className={
                          styles.meta
                        }
                      >
                        <span>
                          {row.category}
                        </span>

                        <span>
                          {copy.cost}{' '}
                          {row.pointCost}{' '}
                          pts
                        </span>

                        <span>
                          {copy.stock}{' '}
                          {row.stockTotal ==
                          null
                            ? copy.unlimited
                            : row.stockTotal}
                        </span>

                        <span>
                          {copy.remaining}{' '}
                          {row.stockRemaining ==
                          null
                            ? copy.unlimited
                            : row.stockRemaining}
                        </span>
                      </div>

                      <div
                        className={
                          styles.performance
                        }
                      >
                        <span>
                          {copy.redeemed}{' '}
                          <b>
                            {row.redeemedCount}
                          </b>
                        </span>

                        <span>
                          Ready{' '}
                          <b>
                            {row.readyCount}
                          </b>
                        </span>

                        <span>
                          {copy.used}{' '}
                          <b>
                            {row.usedCount}
                          </b>
                        </span>
                      </div>
                    </div>

                    <div
                      className={
                        styles.itemActions
                      }
                    >
                      <button
                        type="button"
                        onClick={() =>
                          editReward(
                            row,
                          )
                        }
                      >
                        {copy.edit}
                      </button>

                      <button
                        type="button"
                        disabled={
                          busy ===
                          row.id
                        }
                        data-danger={
                          row.isActive
                        }
                        onClick={() =>
                          void toggleReward(
                            row,
                          )
                        }
                      >
                        {row.isActive
                          ? copy.deactivate
                          : copy.activate}
                      </button>
                    </div>
                  </article>
                ),
              )
            ) : (
              <div
                className={
                  styles.empty
                }
              >
                <span>
                  R
                </span>

                <strong>
                  {copy.noReward}
                </strong>
              </div>
            )}
          </div>
        )}
      </section>

      {questEditor ? (
        <QuestEditor
          copy={
            copy
          }
          draft={
            questEditor
          }
          setDraft={
            setQuestEditor
          }
          saving={
            busy ===
            'save-quest'
          }
          onCancel={() =>
            setQuestEditor(
              null,
            )
          }
          onSave={() =>
            void submitQuest()
          }
        />
      ) : null}

      {rewardEditor ? (
        <RewardEditor
          copy={
            copy
          }
          draft={
            rewardEditor
          }
          setDraft={
            setRewardEditor
          }
          saving={
            busy ===
            'save-reward'
          }
          onCancel={() =>
            setRewardEditor(
              null,
            )
          }
          onSave={() =>
            void submitReward()
          }
        />
      ) : null}
    </section>
  );
}


function Metric({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        styles.metric
      }
      data-highlight={
        highlight
      }
    >
      <span>
        {label}
      </span>

      <strong>
        {value.toLocaleString()}
      </strong>
    </div>
  );
}


function QuestEditor({
  copy,
  draft,
  setDraft,
  saving,
  onCancel,
  onSave,
}: {
  copy: Copy;
  draft: QuestDraft;

  setDraft:
    (
      value:
        QuestDraft,
    ) => void;

  saving: boolean;

  onCancel:
    () => void;

  onSave:
    () => void;
}) {
  return (
    <div
      className={
        styles.modalBackdrop
      }
      role="dialog"
      aria-modal="true"
    >
      <section
        className={
          styles.editor
        }
      >
        <header
          className={
            styles.editorHeader
          }
        >
          <div>
            <small>
              QUEST
            </small>

            <h3>
              {draft.id
                ? copy.editQuest
                : copy.createQuest.replace(
                    '+ ',
                    '',
                  )}
            </h3>
          </div>

          <button
            type="button"
            onClick={
              onCancel
            }
          >
            ×
          </button>
        </header>

        <div
          className={
            styles.editorBody
          }
        >
          <EditorSection
            title={
              copy.basicInfo
            }
          >
            <Field
              label={
                copy.slug
              }
            >
              <input
                value={
                  draft.slug
                }
                onChange={(
                  event,
                ) =>
                  setDraft({
                    ...draft,

                    slug:
                      event
                        .target
                        .value,
                  })
                }
              />
            </Field>

            <Field
              label={
                copy.category
              }
            >
              <input
                value={
                  draft.category
                }
                onChange={(
                  event,
                ) =>
                  setDraft({
                    ...draft,

                    category:
                      event
                        .target
                        .value,
                  })
                }
              />
            </Field>

            <Field
              label={
                copy.titleTh
              }
            >
              <input
                value={
                  draft.titleTh
                }
                onChange={(
                  event,
                ) =>
                  setDraft({
                    ...draft,

                    titleTh:
                      event
                        .target
                        .value,
                  })
                }
              />
            </Field>

            <Field
              label={
                copy.titleEn
              }
            >
              <input
                value={
                  draft.titleEn
                }
                onChange={(
                  event,
                ) =>
                  setDraft({
                    ...draft,

                    titleEn:
                      event
                        .target
                        .value,
                  })
                }
              />
            </Field>

            <Field
              label={
                copy.descriptionTh
              }
              wide
            >
              <textarea
                rows={3}
                value={
                  draft.descriptionTh
                }
                onChange={(
                  event,
                ) =>
                  setDraft({
                    ...draft,

                    descriptionTh:
                      event
                        .target
                        .value,
                  })
                }
              />
            </Field>

            <Field
              label={
                copy.descriptionEn
              }
              wide
            >
              <textarea
                rows={3}
                value={
                  draft.descriptionEn
                }
                onChange={(
                  event,
                ) =>
                  setDraft({
                    ...draft,

                    descriptionEn:
                      event
                        .target
                        .value,
                  })
                }
              />
            </Field>
          </EditorSection>

          <EditorSection
            title={
              copy.rewardConfig
            }
          >
            <Field
              label={
                copy.rewardPoints
              }
            >
              <input
                type="number"
                min={1}
                value={
                  draft.rewardPoints
                }
                onChange={(
                  event,
                ) =>
                  setDraft({
                    ...draft,

                    rewardPoints:
                      Number(
                        event
                          .target
                          .value,
                      ) ||
                      1,
                  })
                }
              />
            </Field>

            <Field
              label={
                copy.badgeCode
              }
            >
              <input
                value={
                  draft.rewardBadgeCode
                }
                onChange={(
                  event,
                ) =>
                  setDraft({
                    ...draft,

                    rewardBadgeCode:
                      event
                        .target
                        .value,
                  })
                }
              />
            </Field>

            <Field
              label={
                copy.badgeNameTh
              }
            >
              <input
                value={
                  draft.rewardBadgeNameTh
                }
                onChange={(
                  event,
                ) =>
                  setDraft({
                    ...draft,

                    rewardBadgeNameTh:
                      event
                        .target
                        .value,
                  })
                }
              />
            </Field>

            <Field
              label={
                copy.badgeNameEn
              }
            >
              <input
                value={
                  draft.rewardBadgeNameEn
                }
                onChange={(
                  event,
                ) =>
                  setDraft({
                    ...draft,

                    rewardBadgeNameEn:
                      event
                        .target
                        .value,
                  })
                }
              />
            </Field>
          </EditorSection>

          <EditorSection
            title={
              copy.conditions
            }
          >
            <Field
              label={
                copy.verificationLevel
              }
            >
              <select
                value={
                  draft.verificationLevel
                }
                onChange={(
                  event,
                ) =>
                  setDraft({
                    ...draft,

                    verificationLevel:
                      Number(
                        event
                          .target
                          .value,
                      ),
                  })
                }
              >
                <option value={1}>
                  Level 1
                </option>

                <option value={2}>
                  Level 2
                </option>

                <option value={3}>
                  Level 3
                </option>
              </select>
            </Field>

            <Field
              label={
                copy.progressTarget
              }
            >
              <input
                type="number"
                min={1}
                value={
                  draft.progressTarget
                }
                onChange={(
                  event,
                ) =>
                  setDraft({
                    ...draft,

                    progressTarget:
                      Number(
                        event
                          .target
                          .value,
                      ) ||
                      1,
                  })
                }
              />
            </Field>

            <ToggleField
              label={
                copy.isSponsored
              }
              value={
                draft.isSponsored
              }
              onChange={(
                value,
              ) =>
                setDraft({
                  ...draft,

                  isSponsored:
                    value,
                })
              }
            />
          </EditorSection>

          <EditorSection
            title={
              copy.schedule
            }
          >
            <Field
              label={
                copy.startsAt
              }
            >
              <input
                type="datetime-local"
                value={
                  draft.startsAt
                }
                onChange={(
                  event,
                ) =>
                  setDraft({
                    ...draft,

                    startsAt:
                      event
                        .target
                        .value,
                  })
                }
              />
            </Field>

            <Field
              label={
                copy.endsAt
              }
            >
              <input
                type="datetime-local"
                value={
                  draft.endsAt
                }
                onChange={(
                  event,
                ) =>
                  setDraft({
                    ...draft,

                    endsAt:
                      event
                        .target
                        .value,
                  })
                }
              />
            </Field>

            <Field
              label={
                copy.sortOrder
              }
            >
              <input
                type="number"
                value={
                  draft.sortOrder
                }
                onChange={(
                  event,
                ) =>
                  setDraft({
                    ...draft,

                    sortOrder:
                      Number(
                        event
                          .target
                          .value,
                      ) ||
                      0,
                  })
                }
              />
            </Field>

            <ToggleField
              label={
                copy.enabled
              }
              value={
                draft.isActive
              }
              onChange={(
                value,
              ) =>
                setDraft({
                  ...draft,

                  isActive:
                    value,
                })
              }
            />
          </EditorSection>
        </div>

        <footer
          className={
            styles.editorFooter
          }
        >
          <button
            type="button"
            onClick={
              onCancel
            }
          >
            {copy.cancel}
          </button>

          <button
            type="button"
            className={
              styles.primary
            }
            disabled={
              saving
            }
            onClick={
              onSave
            }
          >
            {saving
              ? copy.saving
              : copy.save}
          </button>
        </footer>
      </section>
    </div>
  );
}


function RewardEditor({
  copy,
  draft,
  setDraft,
  saving,
  onCancel,
  onSave,
}: {
  copy: Copy;
  draft: RewardDraft;

  setDraft:
    (
      value:
        RewardDraft,
    ) => void;

  saving: boolean;

  onCancel:
    () => void;

  onSave:
    () => void;
}) {
  return (
    <div
      className={
        styles.modalBackdrop
      }
      role="dialog"
      aria-modal="true"
    >
      <section
        className={
          styles.editor
        }
      >
        <header
          className={
            styles.editorHeader
          }
        >
          <div>
            <small>
              REWARD
            </small>

            <h3>
              {draft.id
                ? copy.editReward
                : copy.createReward.replace(
                    '+ ',
                    '',
                  )}
            </h3>
          </div>

          <button
            type="button"
            onClick={
              onCancel
            }
          >
            ×
          </button>
        </header>

        <div
          className={
            styles.editorBody
          }
        >
          <EditorSection
            title={
              copy.basicInfo
            }
          >
            <Field
              label={
                copy.code
              }
            >
              <input
                value={
                  draft.code
                }
                onChange={(
                  event,
                ) =>
                  setDraft({
                    ...draft,

                    code:
                      event
                        .target
                        .value,
                  })
                }
              />
            </Field>

            <Field
              label={
                copy.category
              }
            >
              <input
                value={
                  draft.category
                }
                onChange={(
                  event,
                ) =>
                  setDraft({
                    ...draft,

                    category:
                      event
                        .target
                        .value,
                  })
                }
              />
            </Field>

            <Field
              label={
                copy.titleTh
              }
            >
              <input
                value={
                  draft.titleTh
                }
                onChange={(
                  event,
                ) =>
                  setDraft({
                    ...draft,

                    titleTh:
                      event
                        .target
                        .value,
                  })
                }
              />
            </Field>

            <Field
              label={
                copy.titleEn
              }
            >
              <input
                value={
                  draft.titleEn
                }
                onChange={(
                  event,
                ) =>
                  setDraft({
                    ...draft,

                    titleEn:
                      event
                        .target
                        .value,
                  })
                }
              />
            </Field>

            <Field
              label={
                copy.descriptionTh
              }
              wide
            >
              <textarea
                rows={3}
                value={
                  draft.descriptionTh
                }
                onChange={(
                  event,
                ) =>
                  setDraft({
                    ...draft,

                    descriptionTh:
                      event
                        .target
                        .value,
                  })
                }
              />
            </Field>

            <Field
              label={
                copy.descriptionEn
              }
              wide
            >
              <textarea
                rows={3}
                value={
                  draft.descriptionEn
                }
                onChange={(
                  event,
                ) =>
                  setDraft({
                    ...draft,

                    descriptionEn:
                      event
                        .target
                        .value,
                  })
                }
              />
            </Field>

            <Field
              label={
                copy.imageUrl
              }
              wide
            >
              <input
                value={
                  draft.imageUrl
                }
                onChange={(
                  event,
                ) =>
                  setDraft({
                    ...draft,

                    imageUrl:
                      event
                        .target
                        .value,
                  })
                }
              />
            </Field>
          </EditorSection>

          <EditorSection
            title={
              copy.fulfillment
            }
          >
            <Field
              label={
                copy.fulfillmentType
              }
            >
              <select
                value={
                  draft.fulfillmentType
                }
                onChange={(
                  event,
                ) =>
                  setDraft({
                    ...draft,

                    fulfillmentType:
                      event
                        .target
                        .value as
                        | 'partner_code'
                        | 'entitlement',
                  })
                }
              >
                <option value="partner_code">
                  {copy.partnerCode}
                </option>

                <option value="entitlement">
                  {copy.entitlement}
                </option>
              </select>
            </Field>

            <Field
              label={
                copy.pointCost
              }
            >
              <input
                type="number"
                min={1}
                value={
                  draft.pointCost
                }
                onChange={(
                  event,
                ) =>
                  setDraft({
                    ...draft,

                    pointCost:
                      Number(
                        event
                          .target
                          .value,
                      ) ||
                      1,
                  })
                }
              />
            </Field>

            <Field
              label={
                copy.stockTotal
              }
            >
              <input
                type="number"
                min={0}
                value={
                  draft.stockTotal ??
                  ''
                }
                placeholder={
                  copy.unlimited
                }
                onChange={(
                  event,
                ) =>
                  setDraft({
                    ...draft,

                    stockTotal:
                      event
                        .target
                        .value ===
                      ''
                        ? null
                        : Number(
                            event
                              .target
                              .value,
                          ),
                  })
                }
              />
            </Field>

            <Field
              label={
                copy.maxPerUser
              }
            >
              <input
                type="number"
                min={1}
                value={
                  draft.maxPerUser ??
                  ''
                }
                placeholder={
                  copy.unlimited
                }
                onChange={(
                  event,
                ) =>
                  setDraft({
                    ...draft,

                    maxPerUser:
                      event
                        .target
                        .value ===
                      ''
                        ? null
                        : Number(
                            event
                              .target
                              .value,
                          ),
                  })
                }
              />
            </Field>

            <Field
              label={
                copy.walletValidityDays
              }
            >
              <input
                type="number"
                min={1}
                value={
                  draft.walletValidityDays ??
                  ''
                }
                onChange={(
                  event,
                ) =>
                  setDraft({
                    ...draft,

                    walletValidityDays:
                      event
                        .target
                        .value ===
                      ''
                        ? null
                        : Number(
                            event
                              .target
                              .value,
                          ),
                  })
                }
              />
            </Field>

            <Field
              label={
                copy.partnerId
              }
            >
              <input
                value={
                  draft.partnerId
                }
                onChange={(
                  event,
                ) =>
                  setDraft({
                    ...draft,

                    partnerId:
                      event
                        .target
                        .value,
                  })
                }
              />
            </Field>

            {draft.fulfillmentType ===
            'entitlement' ? (
              <>
                <Field
                  label={
                    copy.entitlementCode
                  }
                >
                  <input
                    value={
                      draft.entitlementCode
                    }
                    onChange={(
                      event,
                    ) =>
                      setDraft({
                        ...draft,

                        entitlementCode:
                          event
                            .target
                            .value,
                      })
                    }
                  />
                </Field>

                <Field
                  label={
                    copy.entitlementDuration
                  }
                >
                  <input
                    type="number"
                    min={1}
                    value={
                      draft.entitlementDurationDays ??
                      ''
                    }
                    onChange={(
                      event,
                    ) =>
                      setDraft({
                        ...draft,

                        entitlementDurationDays:
                          event
                            .target
                            .value ===
                          ''
                            ? null
                            : Number(
                                event
                                  .target
                                  .value,
                              ),
                      })
                    }
                  />
                </Field>
              </>
            ) : null}

            <Field
              label={
                copy.termsTh
              }
              wide
            >
              <textarea
                rows={3}
                value={
                  draft.termsTh
                }
                onChange={(
                  event,
                ) =>
                  setDraft({
                    ...draft,

                    termsTh:
                      event
                        .target
                        .value,
                  })
                }
              />
            </Field>

            <Field
              label={
                copy.termsEn
              }
              wide
            >
              <textarea
                rows={3}
                value={
                  draft.termsEn
                }
                onChange={(
                  event,
                ) =>
                  setDraft({
                    ...draft,

                    termsEn:
                      event
                        .target
                        .value,
                  })
                }
              />
            </Field>
          </EditorSection>

          <EditorSection
            title={
              copy.schedule
            }
          >
            <Field
              label={
                copy.startsAt
              }
            >
              <input
                type="datetime-local"
                value={
                  draft.startsAt
                }
                onChange={(
                  event,
                ) =>
                  setDraft({
                    ...draft,

                    startsAt:
                      event
                        .target
                        .value,
                  })
                }
              />
            </Field>

            <Field
              label={
                copy.endsAt
              }
            >
              <input
                type="datetime-local"
                value={
                  draft.endsAt
                }
                onChange={(
                  event,
                ) =>
                  setDraft({
                    ...draft,

                    endsAt:
                      event
                        .target
                        .value,
                  })
                }
              />
            </Field>

            <Field
              label={
                copy.sortOrder
              }
            >
              <input
                type="number"
                value={
                  draft.sortOrder
                }
                onChange={(
                  event,
                ) =>
                  setDraft({
                    ...draft,

                    sortOrder:
                      Number(
                        event
                          .target
                          .value,
                      ) ||
                      0,
                  })
                }
              />
            </Field>

            <ToggleField
              label={
                copy.isFeatured
              }
              value={
                draft.isFeatured
              }
              onChange={(
                value,
              ) =>
                setDraft({
                  ...draft,

                  isFeatured:
                    value,
                })
              }
            />

            <ToggleField
              label={
                copy.enabled
              }
              value={
                draft.isActive
              }
              onChange={(
                value,
              ) =>
                setDraft({
                  ...draft,

                  isActive:
                    value,
                })
              }
            />
          </EditorSection>
        </div>

        <footer
          className={
            styles.editorFooter
          }
        >
          <button
            type="button"
            onClick={
              onCancel
            }
          >
            {copy.cancel}
          </button>

          <button
            type="button"
            className={
              styles.primary
            }
            disabled={
              saving
            }
            onClick={
              onSave
            }
          >
            {saving
              ? copy.saving
              : copy.save}
          </button>
        </footer>
      </section>
    </div>
  );
}


function EditorSection({
  title,
  children,
}: {
  title: string;
  children:
    React.ReactNode;
}) {
  return (
    <section
      className={
        styles.editorSection
      }
    >
      <h4>
        {title}
      </h4>

      <div
        className={
          styles.formGrid
        }
      >
        {children}
      </div>
    </section>
  );
}


function Field({
  label,
  wide = false,
  children,
}: {
  label: string;
  wide?: boolean;
  children:
    React.ReactNode;
}) {
  return (
    <label
      className={
        wide
          ? styles.fieldWide
          : styles.field
      }
    >
      <span>
        {label}
      </span>

      {children}
    </label>
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
      value:
        boolean,
    ) => void;
}) {
  return (
    <label
      className={
        styles.toggleField
      }
    >
      <span>
        {label}
      </span>

      <input
        type="checkbox"
        checked={
          value
        }
        onChange={(
          event,
        ) =>
          onChange(
            event
              .target
              .checked,
          )
        }
      />
    </label>
  );
}