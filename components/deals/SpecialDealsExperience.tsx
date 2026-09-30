'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { useLocale } from '@/components/SiteProviders';
import { getCurrentUser, isSupabaseConfigured, rpcRequest } from '@/lib/supabase/browser';
import {
  getMasterLocationLabel,
  getMasterProvinceOptions,
  matchesMasterLocation,
} from '@/lib/masterLocationFilter';
import { commerceBackgroundImage, resolveCommerceMediaList } from '@/components/commerce/commerceMedia';
import { specialDealsCopy } from '@/i18n/specialDealsUi';
import styles from './SpecialDealsExperience.module.css';

type Row = Record<string, unknown>;
type User = { id: string; email?: string };

type DealItem = {
  id: string;
  businessId: string;
  title: string;
  description: string;
  category: string;
  businessCategory: DealBusinessCategory;
  image: string;
  images: string[];
  partnerName: string;
  address: string;
  province: string;
  district: string;
  city: string;
  country: string;
  price: number | null;
  originalPrice: number | null;
  currency: string;
  validUntil: string;
  memberOnly: boolean;
  detailType: string;
  saleMode: 'info' | 'inquiry' | 'instant';
  score: number;
  featured: boolean;
  partnerVerified: boolean;
};

type PromotionFilter = 'all' | 'discount' | 'bonus' | 'coupon' | 'member';

type DealBusinessCategory =
  | 'accommodation'
  | 'food_drink'
  | 'tours_guides'
  | 'transport_rental'
  | 'activities_experiences'
  | 'sports_outdoor'
  | 'attractions'
  | 'events_entertainment'
  | 'wellness_lifestyle'
  | 'shopping_equipment'
  | 'traveler_services'
  | 'local_other';

const DEAL_BUSINESS_CATEGORIES: Array<{ key: DealBusinessCategory; icon: string; accent: string }> = [
  { key: 'accommodation', icon: '🏨', accent: '#2F8FFF' },
  { key: 'food_drink', icon: '☕', accent: '#FF5C72' },
  { key: 'tours_guides', icon: '✈', accent: '#FF9E2C' },
  { key: 'transport_rental', icon: '🚗', accent: '#17A7BE' },
  { key: 'activities_experiences', icon: '🎯', accent: '#8B63E8' },
  { key: 'sports_outdoor', icon: '🏕️', accent: '#32B979' },
  { key: 'attractions', icon: '📍', accent: '#F25C5C' },
  { key: 'events_entertainment', icon: '🎉', accent: '#FF4F87' },
  { key: 'wellness_lifestyle', icon: '🧘', accent: '#20B7A6' },
  { key: 'shopping_equipment', icon: '🛍️', accent: '#A970FF' },
  { key: 'traveler_services', icon: '🧳', accent: '#2E9DEB' },
  { key: 'local_other', icon: '◎', accent: '#6B7A90' },
];

const LEGACY_BUSINESS_CATEGORY_MAP: Record<string, DealBusinessCategory> = {
  hotel: 'accommodation',
  accommodation: 'accommodation',
  cafe: 'food_drink',
  restaurant: 'food_drink',
  food: 'food_drink',
  food_drink: 'food_drink',
  tour_company: 'tours_guides',
  tour: 'tours_guides',
  tours_guides: 'tours_guides',
  car_rental: 'transport_rental',
  transport: 'transport_rental',
  transport_rental: 'transport_rental',
  activity: 'activities_experiences',
  activities_experiences: 'activities_experiences',
  sports_outdoor: 'sports_outdoor',
  attraction: 'attractions',
  attractions: 'attractions',
  event_venue: 'events_entertainment',
  venue: 'events_entertainment',
  events_entertainment: 'events_entertainment',
  wellness_lifestyle: 'wellness_lifestyle',
  shopping_equipment: 'shopping_equipment',
  traveler_services: 'traveler_services',
  local_business: 'local_other',
  local_other: 'local_other',
};


type DealFilterCopy = {
  categoriesTitle: string;
  categoriesHint: string;
  searchTitle: string;
  searchHint: string;
  businessCategory: string;
  allBusinessCategories: string;
  province: string;
  keyword: string;
  allProvince: string;
  clear: string;
  partnerDeals: string;
  viewPartner: string;
  dealItems: (count: number) => string;
  results: (count: number) => string;
  businessLabels: Record<DealBusinessCategory, string>;
};

const DEAL_FILTER_COPY: Record<'th' | 'en' | 'de' | 'zh' | 'ja' | 'ko', DealFilterCopy> = {
  th: {
    categoriesTitle: 'ประเภทดีล',
    categoriesHint: 'เลือกประเภทข้อเสนอ แล้วกรองต่อด้วยหมวดสินค้า/บริการ จังหวัด หรือคำค้น',
    searchTitle: 'ค้นหาในประเภทนี้',
    searchHint: 'เลือกหมวดสินค้า/บริการและจังหวัด เพื่อหาดีลที่ตรงกับสิ่งที่ต้องการ',
    businessCategory: 'หมวดสินค้า / บริการ',
    allBusinessCategories: 'ทุกหมวด',
    province: 'จังหวัด',
    keyword: 'ค้นหาดีล ร้านค้า สถานที่ หรือคำสำคัญ',
    allProvince: 'ทุกจังหวัด',
    clear: 'ล้างตัวกรอง',
    partnerDeals: 'ดีลจากร้านนี้',
    viewPartner: 'ดูร้าน',
    dealItems: (count) => `${count} ดีล`,
    results: (count) => `พบ ${count} ดีล`,
    businessLabels: {
      accommodation: 'ที่พัก',
      food_drink: 'อาหาร & เครื่องดื่ม',
      tours_guides: 'ทัวร์ & ไกด์',
      transport_rental: 'การเดินทาง & รถเช่า',
      activities_experiences: 'กิจกรรม & ประสบการณ์',
      sports_outdoor: 'กีฬา & Outdoor',
      attractions: 'สถานที่ท่องเที่ยว',
      events_entertainment: 'อีเวนต์ & ความบันเทิง',
      wellness_lifestyle: 'Wellness & Lifestyle',
      shopping_equipment: 'ร้านค้า & อุปกรณ์',
      traveler_services: 'บริการนักท่องเที่ยว',
      local_other: 'ธุรกิจ / บริการอื่นๆ',
    },
  },
  en: {
    categoriesTitle: 'Deal types',
    categoriesHint: 'Choose an offer type, then filter by product/service category, province or keyword.',
    searchTitle: 'Search this deal type',
    searchHint: 'Choose a product/service category and province to find the most relevant deals.',
    businessCategory: 'Product / service category',
    allBusinessCategories: 'All categories',
    province: 'Province / state',
    keyword: 'Search deal, Partner, place or keyword',
    allProvince: 'All provinces / states',
    clear: 'Clear filters',
    partnerDeals: 'Deals from this Partner',
    viewPartner: 'View Partner',
    dealItems: (count) => `${count} deals`,
    results: (count) => `${count} deals`,
    businessLabels: {
      accommodation: 'Accommodation',
      food_drink: 'Food & Drink',
      tours_guides: 'Tours & Guides',
      transport_rental: 'Transport & Rental',
      activities_experiences: 'Activities & Experiences',
      sports_outdoor: 'Sports & Outdoor',
      attractions: 'Attractions',
      events_entertainment: 'Events & Entertainment',
      wellness_lifestyle: 'Wellness & Lifestyle',
      shopping_equipment: 'Shopping & Equipment',
      traveler_services: 'Traveler Services',
      local_other: 'Local Business & Others',
    },
  },
  de: {
    categoriesTitle: 'Deal-Arten',
    categoriesHint: 'Angebotsart wählen und nach Produkt-/Dienstleistungskategorie, Region oder Stichwort filtern.',
    searchTitle: 'In dieser Deal-Art suchen',
    searchHint: 'Kategorie und Region wählen, um passende Deals schneller zu finden.',
    businessCategory: 'Produkt- / Dienstleistungskategorie',
    allBusinessCategories: 'Alle Kategorien',
    province: 'Region / Bundesland',
    keyword: 'Deal, Partner, Ort oder Stichwort suchen',
    allProvince: 'Alle Regionen',
    clear: 'Filter löschen',
    partnerDeals: 'Deals dieses Partners',
    viewPartner: 'Partner ansehen',
    dealItems: (count) => `${count} Deals`,
    results: (count) => `${count} Deals`,
    businessLabels: {
      accommodation: 'Unterkunft',
      food_drink: 'Essen & Trinken',
      tours_guides: 'Touren & Guides',
      transport_rental: 'Transport & Mietservice',
      activities_experiences: 'Aktivitäten & Erlebnisse',
      sports_outdoor: 'Sport & Outdoor',
      attractions: 'Sehenswürdigkeiten',
      events_entertainment: 'Events & Unterhaltung',
      wellness_lifestyle: 'Wellness & Lifestyle',
      shopping_equipment: 'Shopping & Ausrüstung',
      traveler_services: 'Reiseservices',
      local_other: 'Lokale Anbieter & Sonstiges',
    },
  },
  zh: {
    categoriesTitle: '优惠类型',
    categoriesHint: '选择优惠类型，再按商品/服务分类、省份或关键词筛选。',
    searchTitle: '搜索此优惠类型',
    searchHint: '选择商品/服务分类和省份，更准确地查找优惠。',
    businessCategory: '商品 / 服务分类',
    allBusinessCategories: '全部分类',
    province: '省 / 州',
    keyword: '搜索优惠、商家、地点或关键词',
    allProvince: '全部省 / 州',
    clear: '清除筛选',
    partnerDeals: '该商家的优惠',
    viewPartner: '查看商家',
    dealItems: (count) => `${count} 个优惠`,
    results: (count) => `找到 ${count} 个优惠`,
    businessLabels: {
      accommodation: '住宿',
      food_drink: '餐饮',
      tours_guides: '旅行团与向导',
      transport_rental: '交通与租赁',
      activities_experiences: '活动与体验',
      sports_outdoor: '运动与户外',
      attractions: '景点',
      events_entertainment: '活动与娱乐',
      wellness_lifestyle: '健康与生活方式',
      shopping_equipment: '购物与装备',
      traveler_services: '旅行服务',
      local_other: '本地商家与其他',
    },
  },
  ja: {
    categoriesTitle: 'Dealタイプ',
    categoriesHint: 'オファータイプを選び、商品・サービスカテゴリ、都道府県、キーワードで絞り込めます。',
    searchTitle: 'このDealタイプから検索',
    searchHint: '商品・サービスカテゴリとエリアを選んで、希望に合うDealを探せます。',
    businessCategory: '商品 / サービスカテゴリ',
    allBusinessCategories: 'すべてのカテゴリ',
    province: '都道府県 / 州',
    keyword: 'Deal・Partner・場所・キーワードを検索',
    allProvince: 'すべての都道府県 / 州',
    clear: 'フィルターを解除',
    partnerDeals: 'このPartnerのDeal',
    viewPartner: 'Partnerを見る',
    dealItems: (count) => `${count} Deal`,
    results: (count) => `${count} Deal`,
    businessLabels: {
      accommodation: '宿泊',
      food_drink: 'フード & ドリンク',
      tours_guides: 'ツアー & ガイド',
      transport_rental: '移動 & レンタル',
      activities_experiences: 'アクティビティ & 体験',
      sports_outdoor: 'スポーツ & Outdoor',
      attractions: '観光スポット',
      events_entertainment: 'イベント & エンタメ',
      wellness_lifestyle: 'Wellness & Lifestyle',
      shopping_equipment: 'ショッピング & 装備',
      traveler_services: '旅行者向けサービス',
      local_other: 'ローカルビジネス & その他',
    },
  },
  ko: {
    categoriesTitle: '딜 유형',
    categoriesHint: '혜택 유형을 선택한 뒤 상품/서비스 카테고리, 지역 또는 검색어로 필터링하세요.',
    searchTitle: '이 딜 유형에서 검색',
    searchHint: '상품/서비스 카테고리와 지역을 선택해 원하는 딜을 더 쉽게 찾아보세요.',
    businessCategory: '상품 / 서비스 카테고리',
    allBusinessCategories: '모든 카테고리',
    province: '도 / 주',
    keyword: '딜, 파트너, 장소 또는 검색어',
    allProvince: '모든 도 / 주',
    clear: '필터 지우기',
    partnerDeals: '이 파트너의 딜',
    viewPartner: '파트너 보기',
    dealItems: (count) => `${count}개 딜`,
    results: (count) => `${count}개 딜`,
    businessLabels: {
      accommodation: '숙박',
      food_drink: '음식 & 음료',
      tours_guides: '투어 & 가이드',
      transport_rental: '교통 & 렌탈',
      activities_experiences: '활동 & 체험',
      sports_outdoor: '스포츠 & Outdoor',
      attractions: '관광 명소',
      events_entertainment: '이벤트 & 엔터테인먼트',
      wellness_lifestyle: 'Wellness & Lifestyle',
      shopping_equipment: '쇼핑 & 장비',
      traveler_services: '여행자 서비스',
      local_other: '로컬 비즈니스 & 기타',
    },
  },
};


type UnifiedDealsCopy = {
  description: string;
  searchPlaceholder: string;
  allAreas: string;
  categoryTitle: string;
  categoryHint: string;
  promotionTitle: string;
  all: string;
  promotionLabels: Record<PromotionFilter, string>;
  recommended: string;
  categoryDeals: (label: string) => string;
  viewAll: string;
  results: (label: string, count: number) => string;
  empty: string;
  clear: string;
  verified: string;
  special: string;
};

const UNIFIED_DEALS_COPY: Record<'th' | 'en' | 'de' | 'zh' | 'ja' | 'ko', UnifiedDealsCopy> = {
  th: {
    description: 'ค้นหาร้านค้า ที่พัก อาหาร กิจกรรม บริการ และโปรโมชั่นจาก Melo Partner',
    searchPlaceholder: 'ค้นหาร้าน สินค้า บริการ หรือสถานที่...',
    allAreas: 'ทุกพื้นที่',
    categoryTitle: 'ค้นหาตามประเภท',
    categoryHint: 'เลือกก่อนว่าคุณกำลังมองหาสินค้าหรือบริการประเภทไหน',
    promotionTitle: 'โปรโมชั่น',
    all: 'ทั้งหมด',
    promotionLabels: { all: 'ทั้งหมด', discount: '% ลดราคา', bonus: '1 แถม 1', coupon: 'คูปอง', member: 'Melo Member' },
    recommended: 'แนะนำสำหรับคุณ',
    categoryDeals: (label) => `ดีล${label}`,
    viewAll: 'ดูทั้งหมด',
    results: (label, count) => `ดีล${label} · พบ ${count} รายการ`,
    empty: 'ไม่พบดีลที่ตรงกับตัวกรองนี้',
    clear: 'ล้างตัวกรอง',
    verified: 'ยืนยันแล้ว',
    special: 'โปรโมชั่น',
  },
  en: {
    description: 'Discover shops, stays, food, activities, services and promotions from Melo Partners.',
    searchPlaceholder: 'Search shops, products, services or places...',
    allAreas: 'All areas',
    categoryTitle: 'Browse by category',
    categoryHint: 'Choose what kind of product or service you are looking for first.',
    promotionTitle: 'Promotion',
    all: 'All',
    promotionLabels: { all: 'All', discount: '% Discount', bonus: 'Buy 1 Get 1', coupon: 'Coupon', member: 'Melo Member' },
    recommended: 'Recommended for you',
    categoryDeals: (label) => `${label} deals`,
    viewAll: 'View all',
    results: (label, count) => `${label} deals · ${count} results`,
    empty: 'No deals match these filters.',
    clear: 'Clear filters',
    verified: 'Verified',
    special: 'Promotion',
  },
  de: {
    description: 'Entdecke Shops, Unterkünfte, Essen, Aktivitäten, Services und Aktionen von Melo Partnern.',
    searchPlaceholder: 'Shops, Produkte, Services oder Orte suchen...',
    allAreas: 'Alle Regionen',
    categoryTitle: 'Nach Kategorie suchen',
    categoryHint: 'Wähle zuerst, welche Art von Produkt oder Dienstleistung du suchst.',
    promotionTitle: 'Aktion',
    all: 'Alle',
    promotionLabels: { all: 'Alle', discount: '% Rabatt', bonus: '1+1 gratis', coupon: 'Gutschein', member: 'Melo Member' },
    recommended: 'Für dich empfohlen',
    categoryDeals: (label) => `${label} Deals`,
    viewAll: 'Alle ansehen',
    results: (label, count) => `${label} Deals · ${count} Ergebnisse`,
    empty: 'Keine Deals passen zu diesen Filtern.',
    clear: 'Filter löschen',
    verified: 'Verifiziert',
    special: 'Aktion',
  },
  zh: {
    description: '发现 Melo Partner 提供的商家、住宿、餐饮、活动、服务和优惠。',
    searchPlaceholder: '搜索商家、商品、服务或地点...',
    allAreas: '全部地区',
    categoryTitle: '按分类查找',
    categoryHint: '先选择你要查找的商品或服务类型。',
    promotionTitle: '优惠类型',
    all: '全部',
    promotionLabels: { all: '全部', discount: '% 折扣', bonus: '买一送一', coupon: '优惠券', member: 'Melo Member' },
    recommended: '为你推荐',
    categoryDeals: (label) => `${label}优惠`,
    viewAll: '查看全部',
    results: (label, count) => `${label}优惠 · ${count} 项`,
    empty: '没有符合当前筛选条件的优惠。',
    clear: '清除筛选',
    verified: '已认证',
    special: '优惠',
  },
  ja: {
    description: 'Melo Partnerの店舗、宿泊、フード、アクティビティ、サービス、プロモーションを探せます。',
    searchPlaceholder: '店舗・商品・サービス・場所を検索...',
    allAreas: 'すべてのエリア',
    categoryTitle: 'カテゴリから探す',
    categoryHint: 'まず探している商品・サービスの種類を選んでください。',
    promotionTitle: 'プロモーション',
    all: 'すべて',
    promotionLabels: { all: 'すべて', discount: '% 割引', bonus: '1+1', coupon: 'クーポン', member: 'Melo Member' },
    recommended: 'おすすめ',
    categoryDeals: (label) => `${label}のDeal`,
    viewAll: 'すべて見る',
    results: (label, count) => `${label}のDeal · ${count}件`,
    empty: '条件に一致するDealがありません。',
    clear: 'フィルター解除',
    verified: '認証済み',
    special: 'プロモーション',
  },
  ko: {
    description: 'Melo Partner의 매장, 숙박, 음식, 액티비티, 서비스와 프로모션을 찾아보세요.',
    searchPlaceholder: '매장, 상품, 서비스 또는 장소 검색...',
    allAreas: '전체 지역',
    categoryTitle: '카테고리로 찾기',
    categoryHint: '먼저 찾고 있는 상품 또는 서비스 유형을 선택하세요.',
    promotionTitle: '프로모션',
    all: '전체',
    promotionLabels: { all: '전체', discount: '% 할인', bonus: '1+1', coupon: '쿠폰', member: 'Melo Member' },
    recommended: '추천 딜',
    categoryDeals: (label) => `${label} 딜`,
    viewAll: '전체 보기',
    results: (label, count) => `${label} 딜 · ${count}개`,
    empty: '현재 필터와 일치하는 딜이 없습니다.',
    clear: '필터 지우기',
    verified: '인증됨',
    special: '프로모션',
  },
};

const PROMOTION_FILTERS: Array<{ key: PromotionFilter; icon: string }> = [
  { key: 'all', icon: '◎' },
  { key: 'discount', icon: '%' },
  { key: 'bonus', icon: '🎁' },
  { key: 'coupon', icon: '🎟' },
  { key: 'member', icon: '💙' },
];

function normalizeDealBusinessCategory(businessType: string, serviceCategory: string): DealBusinessCategory {
  // Product/service category is the primary Discovery dimension. Partner type is
  // only a fallback when the service itself does not provide a useful category.
  const service = serviceCategory.trim().toLocaleLowerCase();
  if (/(food|drink|cafe|coffee|restaurant|menu|bakery|อาหาร|เครื่องดื่ม|คาเฟ่)/i.test(service)) return 'food_drink';
  if (/(hotel|room|stay|accommodation|resort|villa|hostel|ที่พัก|โรงแรม|รีสอร์ต|วิลล่า)/i.test(service)) return 'accommodation';
  if (/(tour|guide|ทัวร์|ไกด์)/i.test(service)) return 'tours_guides';
  if (/(transport|rental|car|รถ|เช่า|transfer)/i.test(service)) return 'transport_rental';
  if (/(outdoor|sport|fitness|camp|กีฬา|แคมป์)/i.test(service)) return 'sports_outdoor';
  if (/(activity|experience|workshop|กิจกรรม|ประสบการณ์)/i.test(service)) return 'activities_experiences';
  if (/(attraction|ticket|สถานที่ท่องเที่ยว)/i.test(service)) return 'attractions';
  if (/(event|entertainment|music|อีเวนต์|บันเทิง)/i.test(service)) return 'events_entertainment';
  if (/(wellness|spa|massage|beauty|สุขภาพ|สปา)/i.test(service)) return 'wellness_lifestyle';
  if (/(shop|shopping|equipment|product|retail|ร้านค้า|อุปกรณ์)/i.test(service)) return 'shopping_equipment';
  if (/(travel service|visa|insurance|traveler|บริการนักท่องเที่ยว)/i.test(service)) return 'traveler_services';

  const raw = businessType.trim().toLocaleLowerCase().replace(/[\s-]+/g, '_');
  if (raw && LEGACY_BUSINESS_CATEGORY_MAP[raw]) return LEGACY_BUSINESS_CATEGORY_MAP[raw];
  return 'local_other';
}

function rowsOf(value: unknown): Row[] {
  if (Array.isArray(value)) return value.filter((row): row is Row => Boolean(row) && typeof row === 'object');
  if (value && typeof value === 'object') return [value as Row];
  return [];
}

function text(row: Row, ...keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return '';
}

const DEAL_SERVICE_MEDIA_KEYS = [
  'image_url','service_image_url','product_image_url','main_image_url','thumbnail_url','photo_url',
  'image_storage_path','service_image_storage_path','product_image_storage_path','main_image_storage_path','media_storage_path','service_photo_storage_path','product_photo_storage_path',
  'service_image_path','product_image_path','main_image_path','media_path','thumbnail_path','photo_path','image_path',
  'service_cover_path','service_cover_image_path','service_photo_path','product_photo_path','primary_image_path','main_photo_path','storage_path','path',
  'image_urls','images','photos','gallery','media','image_paths','photo_paths','gallery_paths','gallery_images','service_images','product_images',
  'additional_images','additional_image_paths','media_urls','media_paths','photo_urls','service_image_paths','product_image_paths','service_photos','product_photos','service_media','product_media',
] as const;

const DEAL_SERVICE_EXPLICIT_MEDIA_KEYS = [
  'service_image_url','product_image_url','main_image_url','service_image_storage_path','product_image_storage_path','main_image_storage_path',
  'service_photo_storage_path','product_photo_storage_path','service_image_path','product_image_path','main_image_path','service_cover_path','service_cover_image_path',
  'service_photo_path','product_photo_path','service_images','product_images','service_image_paths','product_image_paths','service_photos','product_photos','service_media','product_media',
] as const;

function mediaRecordFromKeys(source: Row, keys: readonly string[]) {
  const record: Row = {};
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null && value !== '') record[key] = value;
  }
  return record;
}

function dealServiceMediaRecord(...sources: Row[]) {
  const record: Row = {};
  for (const source of sources) {
    for (const key of DEAL_SERVICE_MEDIA_KEYS) {
      const value = source[key];
      if (record[key] === undefined && value !== undefined && value !== null && value !== '') record[key] = value;
    }
  }
  return record;
}

function dealExplicitServiceMediaRecord(...sources: Row[]) {
  const record: Row = {};
  for (const source of sources) Object.assign(record, mediaRecordFromKeys(source, DEAL_SERVICE_EXPLICIT_MEDIA_KEYS));
  return record;
}

async function loadPublicServiceMediaRows(businessId: string): Promise<Row[]> {
  const publicMedia = await rpcRequest<Row[]>('melo_public_partner_service_media', { p_business_id: businessId });
  if (!publicMedia.error) {
    const publicRows = rowsOf(publicMedia.data);
    if (publicRows.length) return publicRows;
  }

  // Compatibility with deployments that already expose the older viewer-safe RPC.
  const legacyMedia = await rpcRequest<Row[]>('get_partner_service_media', { p_business_id: businessId });
  return legacyMedia.error ? [] : rowsOf(legacyMedia.data);
}

function bool(row: Row, ...keys: string[]) {
  for (const key of keys) if (typeof row[key] === 'boolean') return Boolean(row[key]);
  return false;
}

function numberOrNull(row: Row, ...keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value === null || value === undefined || value === '') continue;
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function isActiveDeal(row: Row) {
  if (row.is_active === false) return false;
  const validUntil = text(row, 'valid_until');
  if (!validUntil) return true;
  const end = new Date(`${validUntil}T23:59:59`);
  return Number.isNaN(end.getTime()) || end.getTime() >= Date.now();
}

function priority(row: Row) {
  const detailType = text(row, 'detail_type').toLowerCase();
  const original = numberOrNull(row, 'original_price');
  const current = numberOrNull(row, 'price_from', 'price');
  const discounted = original !== null && current !== null && original > current;
  const searchable = `${text(row, 'title')} ${text(row, 'description')} ${text(row, 'category')}`.toLowerCase();
  let score = 0;
  if (bool(row, 'is_recommended', 'recommended', 'is_featured')) score += 140;
  if (bool(row, 'melo_member_only')) score += 90;
  if (detailType === 'coupon') score += 80;
  if (detailType === 'promotion') score += 70;
  if (discounted) score += 55;
  if (['discount', 'promotion', 'promo', 'deal', 'special', 'sale', 'ส่วนลด', 'โปรโมชั่น', 'คูปอง'].some((word) => searchable.includes(word))) score += 40;
  const updated = new Date(text(row, 'updated_at', 'created_at')).getTime();
  if (Number.isFinite(updated)) score += Math.min(9, Math.max(0, updated / 1_000_000_000_000));
  return score;
}

function discountPercent(item: DealItem) {
  if (item.originalPrice === null || item.price === null || item.originalPrice <= item.price || item.originalPrice <= 0) return 0;
  return Math.max(1, Math.min(99, Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100)));
}

function saleModeOf(row: Row): DealItem['saleMode'] {
  const sale = text(row, 'sale_mode').toLowerCase();
  if (sale === 'instant') return 'instant';
  if (sale === 'info') return 'info';
  return 'inquiry';
}

function dealSearchText(item: DealItem) {
  return `${item.category} ${item.title} ${item.description}`.toLocaleLowerCase();
}
function isOnePlusOne(item: DealItem) {
  const search = dealSearchText(item);
  return ['1 แถม 1', '1แถม1', 'ซื้อ 1 แถม 1', 'buy 1 get 1', 'buy one get one', 'bogo'].some((word) => search.includes(word));
}
function hasPriceDiscount(item: DealItem) { return item.originalPrice !== null && item.price !== null && item.originalPrice > item.price; }

function isCouponDeal(item: DealItem) {
  const search = dealSearchText(item);
  const type = item.detailType.toLocaleLowerCase();
  return type === 'coupon' || ['coupon', 'voucher', 'คูปอง', 'โค้ดส่วนลด'].some((word) => search.includes(word));
}

function isDiscountDeal(item: DealItem) {
  const search = dealSearchText(item);
  return hasPriceDiscount(item) || ['discount', 'sale', 'ส่วนลด', 'ลดราคา'].some((word) => search.includes(word));
}

function isPromotionEligible(item: DealItem) {
  const search = dealSearchText(item);
  const type = item.detailType.toLocaleLowerCase();
  return isOnePlusOne(item)
    || isCouponDeal(item)
    || isDiscountDeal(item)
    || item.memberOnly
    || type === 'promotion'
    || ['promotion', 'promo', 'deal', 'special', 'โปรโมชั่น', 'โปรโมชัน', 'สิทธิพิเศษ', 'ราคาพิเศษ'].some((word) => search.includes(word));
}

function dealMatchesPromotion(item: DealItem, promotion: PromotionFilter) {
  if (promotion === 'all') return true;
  if (promotion === 'bonus') return isOnePlusOne(item);
  if (promotion === 'coupon') return isCouponDeal(item);
  if (promotion === 'member') return item.memberOnly;
  return isDiscountDeal(item);
}

export function SpecialDealsExperience() {
  const router = useRouter();
  const { locale } = useLocale();
  const copy = specialDealsCopy[locale];
  const configured = isSupabaseConfigured();
  const localeTag = useMemo(() => ({ th: 'th-TH', en: 'en-US', de: 'de-DE', zh: 'zh-CN', ja: 'ja-JP', ko: 'ko-KR' }[locale]), [locale]);
  const [user, setUser] = useState<User | null>(null);
  const [deals, setDeals] = useState<DealItem[]>([]);
  const [selectedPromotion, setSelectedPromotion] = useState<PromotionFilter>('all');
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedBusinessCategory, setSelectedBusinessCategory] = useState<DealBusinessCategory | ''>('');
  const [categoryQuery, setCategoryQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const businessResult = await rpcRequest<Row[]>('melo_public_businesses');
      if (businessResult.error) throw new Error(businessResult.error);
      const businesses = rowsOf(businessResult.data);
      const ids = businesses.map((row) => text(row, 'id')).filter(Boolean);
      if (!ids.length) {
        setDeals([]);
        return;
      }

      const serviceResult = await rpcRequest<Row[]>('melo_public_business_service_summaries', {
        p_business_ids: ids,
        p_limit: Math.max(60, Math.min(160, ids.length * 12)),
      });
      if (serviceResult.error) throw new Error(serviceResult.error);

      const businessMap = new Map(businesses.map((row) => [text(row, 'id'), row]));
      const summaryRows = rowsOf(serviceResult.data).filter(isActiveDeal);

      // Public deal summaries are intentionally compact and can contain a media
      // path that is syntactically present but not browser-readable. Hydrate every
      // business represented by an active deal, then resolve the storage object with
      // the current authenticated session (signed URL first, public URL fallback).
      const dealBusinessIds = [...new Set(summaryRows.map((row) => text(row, 'business_id')).filter(Boolean))];
      const enrichedServices = new Map<string, Row>();
      const serviceSalesById = new Map<string, Row>();
      const serviceMediaById = new Map<string, Row[]>();
      const enrichedBusinesses = new Map<string, Row>();
      await Promise.all(dealBusinessIds.map(async (businessId) => {
        const [serviceBase, serviceDetails, salesSettings, publicMediaRows, businessDetail] = await Promise.all([
          rpcRequest<Row[]>('melo_business_services_for_viewer', { p_business_id: businessId }),
          rpcRequest<Row[]>('get_business_service_details', { p_business_id: businessId }),
          rpcRequest<Row[]>('get_business_service_sales_settings', { p_business_id: businessId }),
          loadPublicServiceMediaRows(businessId),
          rpcRequest<Row[]>('melo_business_for_viewer', { p_business_id: businessId }),
        ]);
        const detailMap = new Map(rowsOf(serviceDetails.data).map((row) => [text(row, 'service_id', 'id'), row]));
        const salesMap = new Map(rowsOf(salesSettings.data).map((row) => [text(row, 'service_id', 'id'), row]));
        for (const [serviceId, salesRow] of salesMap) {
          if (serviceId) serviceSalesById.set(serviceId, salesRow);
        }
        for (const mediaRow of publicMediaRows) {
          const serviceId = text(mediaRow, 'service_id', 'id');
          if (!serviceId) continue;
          const current = serviceMediaById.get(serviceId) ?? [];
          current.push(mediaRow);
          serviceMediaById.set(serviceId, current);
        }
        for (const service of rowsOf(serviceBase.data)) {
          const serviceId = text(service, 'id', 'service_id');
          if (!serviceId) continue;
          enrichedServices.set(serviceId, { ...service, ...(detailMap.get(serviceId) ?? {}), ...(salesMap.get(serviceId) ?? {}) });
        }
        const detailRow = rowsOf(businessDetail.data)[0];
        if (detailRow) enrichedBusinesses.set(businessId, detailRow);
      }));

      const mapped = await Promise.all(summaryRows.map(async (row): Promise<DealItem | null> => {
        const id = text(row, 'id');
        const businessId = text(row, 'business_id');
        if (!id || !businessId) return null;
        const business = businessMap.get(businessId) ?? {};
        const serviceExtra = enrichedServices.get(id) ?? {};
        const serviceSales = serviceSalesById.get(id) ?? {};
        const serviceMediaRows = serviceMediaById.get(id) ?? [];
        const businessExtra = enrichedBusinesses.get(businessId) ?? {};
        const imageGroups = await Promise.all([
          resolveCommerceMediaList(dealServiceMediaRecord(...serviceMediaRows)),
          resolveCommerceMediaList(dealServiceMediaRecord(serviceSales)),
          resolveCommerceMediaList(dealExplicitServiceMediaRecord(serviceExtra)),
          resolveCommerceMediaList(dealExplicitServiceMediaRecord(row)),
        ]);
        const images = [...new Set(imageGroups.flat().filter(Boolean))];
        return {
          id,
          businessId,
          title: text(row, 'title') || text(serviceExtra, 'title', 'name') || 'Melo Deal',
          description: text(row, 'description', 'short_description') || text(serviceExtra, 'description', 'short_description'),
          category: text(row, 'category', 'detail_type') || text(serviceExtra, 'category', 'detail_type') || 'Deals',
          businessCategory: normalizeDealBusinessCategory(
            text(businessExtra, 'business_type', 'category') || text(business, 'business_type', 'category'),
            text(row, 'category', 'detail_type') || text(serviceExtra, 'category', 'detail_type'),
          ),
          image: images[0] ?? '',
          images,
          partnerName: text(businessExtra, 'display_name', 'legal_name') || text(business, 'display_name', 'legal_name') || text(row, 'business_name', 'partner_name') || 'Melo Partner',
          address: text(businessExtra, 'address') || text(business, 'address'),
          province: text(businessExtra, 'province', 'region', 'state') || text(business, 'province', 'region', 'state'),
          district: text(businessExtra, 'district', 'subdistrict') || text(business, 'district', 'subdistrict'),
          city: text(businessExtra, 'city') || text(business, 'city'),
          country: text(businessExtra, 'country') || text(business, 'country'),
          price: numberOrNull(row, 'price_from', 'price') ?? numberOrNull(serviceExtra, 'price_from', 'price'),
          originalPrice: numberOrNull(row, 'original_price') ?? numberOrNull(serviceExtra, 'original_price'),
          currency: text(row, 'currency') || text(serviceExtra, 'currency') || 'THB',
          validUntil: text(row, 'valid_until') || text(serviceExtra, 'valid_until'),
          memberOnly: bool(row, 'melo_member_only', 'member_only') || bool(serviceExtra, 'melo_member_only', 'member_only'),
          detailType: text(row, 'detail_type') || text(serviceExtra, 'detail_type'),
          saleMode: saleModeOf({ ...serviceExtra, ...row }),
          score: priority({ ...serviceExtra, ...row }),
          featured: bool(row, 'is_recommended', 'recommended', 'is_featured') || bool(serviceExtra, 'is_recommended', 'recommended', 'is_featured'),
          partnerVerified: bool(businessExtra, 'verified', 'is_verified', 'verification_approved') || bool(business, 'verified', 'is_verified', 'verification_approved'),
        };
      }));
      const next = mapped
        .filter((item): item is DealItem => Boolean(item))
        .filter(isPromotionEligible)
        .sort((a, b) => b.score - a.score);
      setDeals(next);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : copy.loadFailed);
      setDeals([]);
    } finally {
      setLoading(false);
    }
  }, [copy.loadFailed]);

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }
    let active = true;
    getCurrentUser().then((current) => {
      if (!active) return;
      if (!current) {
        router.replace('/login');
        setLoading(false);
        return;
      }
      setUser(current);
      void load();
    });
    return () => { active = false; };
  }, [configured, load, router]);

  const filterCountryValue = 'Thailand';
  const provinceOptions = useMemo(() => getMasterProvinceOptions(filterCountryValue), []);
  const unifiedCopy = UNIFIED_DEALS_COPY[locale] ?? UNIFIED_DEALS_COPY.en;

  const filtered = useMemo(() => {
    const query = categoryQuery.trim().toLocaleLowerCase();
    return deals
      .filter((deal) => dealMatchesPromotion(deal, selectedPromotion))
      .filter((deal) => !selectedBusinessCategory || deal.businessCategory === selectedBusinessCategory)
      .filter((deal) =>
        matchesMasterLocation(
          {
            country: deal.country,
            province: deal.province,
            district: deal.district,
            city: deal.city,
            address: deal.address,
          },
          filterCountryValue,
          selectedProvince,
          '',
        ),
      )
      .filter((deal) => {
        if (!query) return true;
        return [deal.title, deal.description, deal.category, deal.partnerName, deal.address, deal.province, deal.district, deal.city, deal.country]
          .join(' ')
          .toLocaleLowerCase()
          .includes(query);
      });
  }, [categoryQuery, deals, selectedBusinessCategory, selectedPromotion, selectedProvince]);

  const recommended = useMemo(() => filtered.slice(0, 10), [filtered]);
  const categorySections = useMemo(() => DEAL_BUSINESS_CATEGORIES
    .map((category) => {
      const items = filtered.filter((deal) => deal.businessCategory === category.key);
      return { ...category, total: items.length, deals: items.slice(0, 10) };
    })
    .filter((section) => section.total > 0), [filtered]);
  const isDiscoveryMode = selectedBusinessCategory === '';
  const selectedCategoryMeta = DEAL_BUSINESS_CATEGORIES.find((item) => item.key === selectedBusinessCategory) ?? null;
  const filterCopy = DEAL_FILTER_COPY[locale] ?? DEAL_FILTER_COPY.en;

  const selectBusinessCategory = (category: DealBusinessCategory | '') => {
    setSelectedBusinessCategory(category);
  };

  const clearAllFilters = () => {
    setSelectedBusinessCategory('');
    setSelectedPromotion('all');
    setSelectedProvince('');
    setCategoryQuery('');
  };

  const money = (value: number | null, currency: string) => value === null ? '' : `${value.toLocaleString(localeTag, { maximumFractionDigits: 2 })} ${currency}`;
  const date = (value: string) => {
    if (!value) return '';
    const parsed = new Date(`${value}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return value;
    return new Intl.DateTimeFormat(localeTag, { day: 'numeric', month: 'short', year: 'numeric' }).format(parsed);
  };
  const openDeal = (deal: DealItem) => router.push(`/deals/${deal.id}?business=${encodeURIComponent(deal.businessId)}`);
  const openBuy = (deal: DealItem) => router.push(`/deals/${deal.id}?business=${encodeURIComponent(deal.businessId)}&action=buy`);
  const openInquiryChat = (deal: DealItem) => {
    window.dispatchEvent(new CustomEvent('melo-open-business-chat', {
      detail: { businessId: deal.businessId, serviceId: deal.id, title: deal.partnerName },
    }));
  };

  const promotionBadge = (deal: DealItem) => {
    const percent = discountPercent(deal);
    if (isOnePlusOne(deal)) return unifiedCopy.promotionLabels.bonus;
    if (isCouponDeal(deal)) return unifiedCopy.promotionLabels.coupon;
    if (deal.memberOnly) return unifiedCopy.promotionLabels.member;
    if (percent > 0) return `-${percent}%`;
    if (isDiscountDeal(deal)) return unifiedCopy.promotionLabels.discount;
    return unifiedCopy.special;
  };

  const renderDealCard = (deal: DealItem, rail = false) => (
    <article className={`${styles.dealCard} ${rail ? styles.dealRailCard : ''}`} key={deal.id}>
      <button type="button" className={styles.dealMainButton} onClick={() => openDeal(deal)} aria-label={`${copy.viewDeal}: ${deal.title}`}>
        <div className={styles.dealImage} style={deal.images.length ? { backgroundImage: commerceBackgroundImage(deal.images) } : undefined}>
          {!deal.image && <span>％</span>}
          <div className={styles.imageBadges}>
            <em>{promotionBadge(deal)}</em>
            {deal.featured && <b className={styles.featuredBadge}>{copy.recommendedBadge}</b>}
          </div>
        </div>
        <div className={styles.dealBody}>
          <h3>{deal.title}</h3>
          {deal.description && <p>{deal.description}</p>}
          <div className={styles.dealMeta}>
            <div className={styles.priceLine}>
              {deal.price !== null && <strong>{money(deal.price, deal.currency)}</strong>}
              {deal.originalPrice !== null && deal.price !== null && deal.originalPrice > deal.price && <del>{money(deal.originalPrice, deal.currency)}</del>}
            </div>
            {deal.validUntil && <span>{copy.validUntil} {date(deal.validUntil)}</span>}
          </div>
        </div>
      </button>
      <div className={styles.dealPartnerRow}>
        <button type="button" className={styles.partnerLink} onClick={() => router.push(`/partners/${deal.businessId}`)}>
          <strong>{deal.partnerName}</strong>{deal.partnerVerified && <span>✓ {unifiedCopy.verified}</span>}
        </button>
        <small>{[deal.province || deal.city, deal.country].filter(Boolean).join(' · ')}</small>
      </div>
      <div className={styles.dealFooter}>
        <span>{filterCopy.businessLabels[deal.businessCategory]}</span>
        <div className={styles.dealActions}>
          <button type="button" className={styles.viewButton} onClick={() => openDeal(deal)}>{copy.viewDeal}</button>
          {deal.saleMode === 'instant' ? (
            <button type="button" className={styles.buyButton} onClick={() => openBuy(deal)}>{copy.buy}</button>
          ) : deal.saleMode === 'inquiry' ? (
            <button type="button" className={styles.askButton} onClick={() => openInquiryChat(deal)}>{copy.ask}</button>
          ) : null}
        </div>
      </div>
    </article>
  );

  return (
    <main className={styles.page}>
      <Header />
      <section className={styles.shell}>
        <header className={styles.pageHeader}>
          <div>
            <span className={styles.kicker}>MELO DEALS</span>
            <h1>{copy.title}</h1>
            <p>{unifiedCopy.description}</p>
          </div>
        </header>

        <section className={styles.unifiedSearch} aria-label={unifiedCopy.searchPlaceholder}>
          <label className={styles.unifiedSearchInput}>
            <span aria-hidden="true">⌕</span>
            <input
              value={categoryQuery}
              onChange={(event) => setCategoryQuery(event.target.value)}
              placeholder={unifiedCopy.searchPlaceholder}
            />
          </label>
          <select value={selectedProvince} onChange={(event) => setSelectedProvince(event.target.value)} aria-label={filterCopy.province}>
            <option value="">{unifiedCopy.allAreas}</option>
            {provinceOptions.map((province) => <option value={province.value} key={province.code}>{getMasterLocationLabel(province, locale)}</option>)}
          </select>
        </section>

        <section className={styles.unifiedCategorySection} aria-label={unifiedCopy.categoryTitle}>
          <div className={styles.unifiedSectionIntro}>
            <strong>{unifiedCopy.categoryTitle}</strong>
            <p>{unifiedCopy.categoryHint}</p>
          </div>
          <div className={styles.unifiedCategoryRail}>
            <button
              type="button"
              className={`${styles.unifiedCategoryButton} ${selectedBusinessCategory === '' ? styles.unifiedCategoryButtonActive : ''}`}
              onClick={() => selectBusinessCategory('')}
            >
              <span className={styles.unifiedCategoryIcon} style={{ background: '#2F8FFF' }}>◎</span>
              <strong>{unifiedCopy.all}</strong>
            </button>
            {DEAL_BUSINESS_CATEGORIES.map((item) => (
              <button
                type="button"
                key={item.key}
                className={`${styles.unifiedCategoryButton} ${selectedBusinessCategory === item.key ? styles.unifiedCategoryButtonActive : ''}`}
                onClick={() => selectBusinessCategory(item.key)}
              >
                <span className={styles.unifiedCategoryIcon} style={{ background: item.accent }}>{item.icon}</span>
                <strong>{filterCopy.businessLabels[item.key]}</strong>
              </button>
            ))}
          </div>
        </section>

        <section className={styles.promotionFilter} aria-label={unifiedCopy.promotionTitle}>
          <strong>{unifiedCopy.promotionTitle}</strong>
          <div className={styles.promotionChips}>
            {PROMOTION_FILTERS.map((item) => (
              <button
                type="button"
                key={item.key}
                className={selectedPromotion === item.key ? styles.promotionChipActive : ''}
                onClick={() => setSelectedPromotion(item.key)}
              >
                <span aria-hidden="true">{item.icon}</span>{unifiedCopy.promotionLabels[item.key]}
              </button>
            ))}
          </div>
          {(selectedBusinessCategory || selectedPromotion !== 'all' || selectedProvince || categoryQuery.trim()) && (
            <button type="button" className={styles.clearAllButton} onClick={clearAllFilters}>{unifiedCopy.clear}</button>
          )}
        </section>

        {loading ? (
          <section className={styles.state}><span className={styles.spinner} /><p>{copy.loading}</p></section>
        ) : error ? (
          <section className={styles.state}><strong>{copy.loadFailed}</strong><p>{error}</p><button type="button" onClick={() => user && void load()}>{copy.retry}</button></section>
        ) : filtered.length === 0 ? (
          <section className={styles.state}><strong>{unifiedCopy.empty}</strong><button type="button" onClick={clearAllFilters}>{unifiedCopy.clear}</button></section>
        ) : isDiscoveryMode ? (
          <div className={styles.discoveryFeed}>
            {recommended.length > 0 && (
              <section className={styles.discoverySection}>
                <div className={styles.discoveryHeading}><h2>{unifiedCopy.recommended}</h2></div>
                <div className={styles.dealRail}>{recommended.map((deal) => renderDealCard(deal, true))}</div>
              </section>
            )}
            {categorySections.map((section) => (
              <section className={styles.discoverySection} key={section.key}>
                <div className={styles.discoveryHeading}>
                  <h2>{unifiedCopy.categoryDeals(filterCopy.businessLabels[section.key])}</h2>
                  <button type="button" onClick={() => selectBusinessCategory(section.key)}>{unifiedCopy.viewAll} ›</button>
                </div>
                <div className={styles.dealRail}>{section.deals.map((deal) => renderDealCard(deal, true))}</div>
              </section>
            ))}
          </div>
        ) : (
          <section className={styles.resultsMode}>
            <div className={styles.resultsHeading}>
              <div>
                <span>{selectedCategoryMeta?.icon}</span>
                <h2>{unifiedCopy.results(selectedCategoryMeta ? filterCopy.businessLabels[selectedCategoryMeta.key] : unifiedCopy.all, filtered.length)}</h2>
              </div>
            </div>
            <div className={styles.resultsGrid}>{filtered.map((deal) => renderDealCard(deal))}</div>
          </section>
        )}
      </section>
    </main>
  );
}
