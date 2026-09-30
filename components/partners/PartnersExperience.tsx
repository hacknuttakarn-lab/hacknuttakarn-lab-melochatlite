'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { useLocale } from '@/components/SiteProviders';
import { resolveCommerceMediaList } from '@/components/commerce/commerceMedia';
import { GLOBAL_COUNTRY_SCOPE, matchesCountryScope } from '@/lib/discoveryCountry';
import {
  getMasterLocationLabel,
  getMasterProvinceOptions,
  matchesMasterLocation,
} from '@/lib/masterLocationFilter';
import { getCurrentUser, isSupabaseConfigured, rpcRequest } from '@/lib/supabase/browser';
import { getPartnerCategoryLabel, partnersCopy, type PartnerBusinessCategory } from '@/i18n/partnersUi';
import styles from './PartnersExperience.module.css';

type Row = Record<string, unknown>;
type User = { id: string; email?: string };

type PartnerCategoryFilter = '' | PartnerBusinessCategory | 'activity_outdoor';
type CategoryGroupKey = 'groupTravelStay' | 'groupActivityTransport' | 'groupFoodLifestyle' | 'groupShoppingServices';

const BUSINESS_TYPES: PartnerBusinessCategory[] = [
  'accommodation', 'food_drink', 'tours_guides', 'transport_rental',
  'activities_experiences', 'sports_outdoor', 'attractions', 'events_entertainment',
  'wellness_lifestyle', 'shopping_equipment', 'traveler_services', 'local_other',
];

const CATEGORY_META: Record<PartnerBusinessCategory, { icon: string; accent: string }> = {
  accommodation: { icon: '🏨', accent: '#2F8FFF' },
  food_drink: { icon: '☕', accent: '#FF5C72' },
  tours_guides: { icon: '✈', accent: '#FF9E2C' },
  transport_rental: { icon: '🚗', accent: '#17A7BE' },
  activities_experiences: { icon: '🎯', accent: '#8B63E8' },
  sports_outdoor: { icon: '🏕️', accent: '#32B979' },
  attractions: { icon: '📍', accent: '#F25C5C' },
  events_entertainment: { icon: '🎉', accent: '#FF4F87' },
  wellness_lifestyle: { icon: '🧘', accent: '#20B7A6' },
  shopping_equipment: { icon: '🛍️', accent: '#A970FF' },
  traveler_services: { icon: '🧳', accent: '#2E9DEB' },
  local_other: { icon: '◎', accent: '#6B7A90' },
};

const QUICK_CATEGORY_SHORTCUTS: Array<{ key: Exclude<PartnerCategoryFilter, ''>; icon: string; accent: string }> = [
  { key: 'accommodation', icon: CATEGORY_META.accommodation.icon, accent: CATEGORY_META.accommodation.accent },
  { key: 'food_drink', icon: CATEGORY_META.food_drink.icon, accent: CATEGORY_META.food_drink.accent },
  { key: 'tours_guides', icon: CATEGORY_META.tours_guides.icon, accent: CATEGORY_META.tours_guides.accent },
  { key: 'transport_rental', icon: CATEGORY_META.transport_rental.icon, accent: CATEGORY_META.transport_rental.accent },
  { key: 'activity_outdoor', icon: '🏕️', accent: CATEGORY_META.sports_outdoor.accent },
  { key: 'attractions', icon: CATEGORY_META.attractions.icon, accent: CATEGORY_META.attractions.accent },
  { key: 'events_entertainment', icon: CATEGORY_META.events_entertainment.icon, accent: CATEGORY_META.events_entertainment.accent },
  { key: 'wellness_lifestyle', icon: CATEGORY_META.wellness_lifestyle.icon, accent: CATEGORY_META.wellness_lifestyle.accent },
  { key: 'shopping_equipment', icon: CATEGORY_META.shopping_equipment.icon, accent: CATEGORY_META.shopping_equipment.accent },
];

const CATEGORY_GROUPS: Array<{ titleKey: CategoryGroupKey; types: PartnerBusinessCategory[] }> = [
  { titleKey: 'groupTravelStay', types: ['accommodation', 'tours_guides', 'attractions'] },
  { titleKey: 'groupActivityTransport', types: ['transport_rental', 'activities_experiences', 'sports_outdoor', 'events_entertainment'] },
  { titleKey: 'groupFoodLifestyle', types: ['food_drink', 'wellness_lifestyle'] },
  { titleKey: 'groupShoppingServices', types: ['shopping_equipment', 'traveler_services', 'local_other'] },
];

const LEGACY_CATEGORY_MAP: Record<string, PartnerBusinessCategory> = {
  hotel: 'accommodation', accommodation: 'accommodation', cafe: 'food_drink', restaurant: 'food_drink', food: 'food_drink',
  tour_company: 'tours_guides', tour: 'tours_guides', car_rental: 'transport_rental', transport: 'transport_rental',
  event_venue: 'events_entertainment', venue: 'events_entertainment', local_business: 'local_other',
};

type PartnerItem = {
  id: string;
  name: string;
  description: string;
  category: string;
  address: string;
  province: string;
  district: string;
  city: string;
  country: string;
  verified: boolean;
  recommended: boolean;
  coverImages: string[];
  logoImages: string[];
  serviceCount: number;
  serviceCategories: string[];
  featuredService: string;
  fromPrice: number | null;
  currency: string;
  score: number;
};

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

function normalizeCategory(value: string) {
  return value.trim().toLowerCase();
}

function categoryLabel(value: string) {
  if (!value) return '';
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

function normalizePartnerCategory(value: string): PartnerBusinessCategory | null {
  const normalized = normalizeCategory(value);
  if (BUSINESS_TYPES.includes(normalized as PartnerBusinessCategory)) return normalized as PartnerBusinessCategory;
  return LEGACY_CATEGORY_MAP[normalized] ?? null;
}

function displayCategoryLabel(value: string, locale: Parameters<typeof getPartnerCategoryLabel>[1]) {
  const normalized = normalizePartnerCategory(value);
  return normalized ? getPartnerCategoryLabel(normalized, locale) : categoryLabel(value);
}

function partnerMatchesCategory(partner: PartnerItem, filter: PartnerCategoryFilter) {
  if (!filter) return true;
  const normalized = normalizePartnerCategory(partner.category);
  if (filter === 'activity_outdoor') return normalized === 'activities_experiences' || normalized === 'sports_outdoor';
  return normalized === filter;
}


type LocationFilterCopy = {
  title: string;
  hint: string;
  province: string;
  district: string;
  keyword: string;
  allProvince: string;
  allDistrict: string;
  clear: string;
  results: (count: number) => string;
};

const LOCATION_FILTER_COPY: Record<'th' | 'en' | 'de' | 'zh' | 'ja' | 'ko', LocationFilterCopy> = {
  th: {
    title: 'ค้นหาในหมวดนี้',
    hint: 'เลือกพื้นที่และใส่คำค้น เพื่อหาพาร์ทเนอร์ที่ตรงกับสิ่งที่ต้องการมากขึ้น',
    province: 'จังหวัด / รัฐ',
    district: 'อำเภอ / เขต / เมือง',
    keyword: 'ค้นหาชื่อร้าน สถานที่ หรือคำสำคัญ',
    allProvince: 'ทุกจังหวัด / รัฐ',
    allDistrict: 'ทุกอำเภอ / เมือง',
    clear: 'ล้างตัวกรอง',
    results: (count) => `พบ ${count} แห่ง`,
  },
  en: {
    title: 'Search this category',
    hint: 'Choose an area and add keywords to find the most relevant Partners.',
    province: 'Province / State',
    district: 'District / City',
    keyword: 'Search business, place, or keyword',
    allProvince: 'All provinces / states',
    allDistrict: 'All districts / cities',
    clear: 'Clear filters',
    results: (count) => `${count} results`,
  },
  de: {
    title: 'In dieser Kategorie suchen',
    hint: 'Region auswählen und Suchbegriffe eingeben, um passende Partner zu finden.',
    province: 'Region / Bundesland',
    district: 'Bezirk / Stadt',
    keyword: 'Geschäft, Ort oder Stichwort suchen',
    allProvince: 'Alle Regionen / Bundesländer',
    allDistrict: 'Alle Bezirke / Städte',
    clear: 'Filter löschen',
    results: (count) => `${count} Ergebnisse`,
  },
  zh: {
    title: '搜索此类别',
    hint: '选择地区并输入关键词，更准确地查找合作商家。',
    province: '省 / 州 / 地区',
    district: '区 / 市',
    keyword: '搜索商家、地点或关键词',
    allProvince: '所有省 / 州',
    allDistrict: '所有区 / 市',
    clear: '清除筛选',
    results: (count) => `找到 ${count} 个`,
  },
  ja: {
    title: 'このカテゴリーから検索',
    hint: 'エリアとキーワードを指定して、目的に合うパートナーを探せます。',
    province: '都道府県 / 州',
    district: '市区町村 / 都市',
    keyword: '店舗名・場所・キーワードを検索',
    allProvince: 'すべての都道府県 / 州',
    allDistrict: 'すべての市区町村 / 都市',
    clear: 'フィルターを解除',
    results: (count) => `${count} 件`,
  },
  ko: {
    title: '이 카테고리에서 검색',
    hint: '지역과 검색어를 선택해 원하는 파트너를 더 정확하게 찾아보세요.',
    province: '도 / 주 / 지역',
    district: '구 / 시',
    keyword: '업체명, 장소 또는 키워드 검색',
    allProvince: '모든 도 / 주',
    allDistrict: '모든 구 / 시',
    clear: '필터 지우기',
    results: (count) => `${count}개 결과`,
  },
};

function normalizeArea(value: string) {
  return value.trim().toLocaleLowerCase();
}

function partnerProvince(partner: PartnerItem) {
  return (partner.province || partner.city || '').trim();
}

function partnerDistrict(partner: PartnerItem) {
  if (partner.district.trim()) return partner.district.trim();
  if (!partner.province.trim()) return '';
  const city = partner.city.trim();
  return city && normalizeArea(city) !== normalizeArea(partner.province) ? city : '';
}

function partnerLocationText(partner: PartnerItem) {
  const parts = [partnerDistrict(partner), partnerProvince(partner), partner.country].filter(Boolean);
  return parts.filter((part, index) => parts.findIndex((item) => normalizeArea(item) === normalizeArea(part)) === index).join(' · ');
}


async function imageRows(row: Row, detail: Row, services: Row[]) {
  const logoSource: Row = {
    logo_url: text(detail, 'logo_url') || text(row, 'logo_url'),
    logo_storage_path: text(detail, 'logo_storage_path', 'logo_path') || text(row, 'logo_storage_path', 'logo_path'),
    profile_image_url: text(detail, 'profile_image_url', 'profile_photo_url') || text(row, 'profile_image_url', 'profile_photo_url'),
    profile_image_path: text(detail, 'profile_image_path', 'profile_photo_path') || text(row, 'profile_image_path', 'profile_photo_path'),
  };
  const coverSource: Row = {
    cover_url: text(detail, 'cover_url', 'cover_image_url') || text(row, 'cover_url', 'cover_image_url'),
    cover_storage_path: text(detail, 'cover_storage_path', 'cover_image_path', 'cover_path') || text(row, 'cover_storage_path', 'cover_image_path', 'cover_path'),
    image_url: text(detail, 'image_url') || text(row, 'image_url'),
    image_storage_path: text(detail, 'image_storage_path', 'image_path') || text(row, 'image_storage_path', 'image_path'),
  };

  const [logo, cover] = await Promise.all([
    resolveCommerceMediaList(logoSource, detail, row, ...services),
    resolveCommerceMediaList(coverSource, detail, row, ...services),
  ]);
  return {
    logo: logo.length ? logo : cover,
    cover: cover.length ? cover : logo,
  };
}

function partnerScore(row: Row, detail: Row, serviceCount: number, hasImage: boolean) {
  let score = 0;
  if (bool(row, 'is_recommended', 'recommended', 'is_featured') || bool(detail, 'is_recommended', 'recommended', 'is_featured')) score += 140;
  if (bool(row, 'is_verified', 'verified') || bool(detail, 'is_verified', 'verified')) score += 80;
  if (hasImage) score += 25;
  score += Math.min(45, serviceCount * 5);
  const updated = new Date(text(detail, 'updated_at') || text(row, 'updated_at', 'created_at')).getTime();
  if (Number.isFinite(updated)) score += Math.min(9, Math.max(0, updated / 1_000_000_000_000));
  return score;
}

function ActiveImage({ urls, alt, className, eager = false }: { urls: string[]; alt: string; className: string; eager?: boolean }) {
  const [index, setIndex] = useState(0);
  useEffect(() => setIndex(0), [urls]);
  const src = urls[index] ?? '';
  if (!src) return <span className={`${className} ${styles.imagePlaceholder}`} aria-hidden="true">◇</span>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      loading={eager ? 'eager' : 'lazy'}
      onError={() => setIndex((current) => (current + 1 < urls.length ? current + 1 : urls.length))}
    />
  );
}

export function PartnersExperience() {
  const router = useRouter();
  const { locale, countryScope } = useLocale();
  const copy = partnersCopy[locale];
  const configured = isSupabaseConfigured();
  const localeTag = useMemo(() => ({ th: 'th-TH', en: 'en-US', de: 'de-DE', zh: 'zh-CN', ja: 'ja-JP', ko: 'ko-KR' }[locale]), [locale]);
  const [user, setUser] = useState<User | null>(null);
  const [partners, setPartners] = useState<PartnerItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<PartnerCategoryFilter>('');
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
  const [selectedProvince, setSelectedProvince] = useState('');
  const [categoryQuery, setCategoryQuery] = useState('');
  const categorySearchRef = useRef<HTMLElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const businessResult = await rpcRequest<Row[]>('melo_public_businesses');
      if (businessResult.error) throw new Error(businessResult.error);
      const publicRows = rowsOf(businessResult.data);
      const ids = publicRows.map((row) => text(row, 'id')).filter(Boolean);
      if (!ids.length) {
        setPartners([]);
        return;
      }

      const servicesResult = await rpcRequest<Row[]>('melo_public_business_service_summaries', {
        p_business_ids: ids,
        p_limit: Math.max(80, Math.min(220, ids.length * 14)),
      });
      const serviceRows = servicesResult.error ? [] : rowsOf(servicesResult.data).filter((row) => row.is_active !== false);
      const servicesByBusiness = new Map<string, Row[]>();
      for (const service of serviceRows) {
        const businessId = text(service, 'business_id');
        if (!businessId) continue;
        const list = servicesByBusiness.get(businessId) ?? [];
        list.push(service);
        servicesByBusiness.set(businessId, list);
      }

      // The public marketplace RPC is intentionally compact. Always hydrate the
      // public businesses with the viewer-safe detail RPC so media fields are not
      // guessed from a summary row. We also hydrate service details as a fallback
      // source for businesses that use a service/product photo as their storefront.
      const details = new Map<string, Row>();
      const detailedServices = new Map<string, Row[]>();
      await Promise.all(ids.map(async (businessId) => {
        const [businessDetail, serviceBase, serviceDetails] = await Promise.all([
          rpcRequest<Row[]>('melo_business_for_viewer', { p_business_id: businessId }),
          rpcRequest<Row[]>('melo_business_services_for_viewer', { p_business_id: businessId }),
          rpcRequest<Row[]>('get_business_service_details', { p_business_id: businessId }),
        ]);
        const detail = rowsOf(businessDetail.data)[0];
        if (detail) details.set(businessId, detail);
        const detailMap = new Map(rowsOf(serviceDetails.data).map((service) => [text(service, 'service_id', 'id'), service]));
        const hydrated = rowsOf(serviceBase.data)
          .filter((service) => service.is_active !== false)
          .map((service) => ({ ...service, ...(detailMap.get(text(service, 'id', 'service_id')) ?? {}) }));
        if (hydrated.length) detailedServices.set(businessId, hydrated);
      }));

      const mapped = await Promise.all(publicRows.map(async (row): Promise<PartnerItem | null> => {
        const id = text(row, 'id');
        if (!id) return null;
        const detail = details.get(id) ?? {};
        const services = detailedServices.get(id) ?? servicesByBusiness.get(id) ?? [];
        const media = await imageRows(row, detail, services);
        const category = text(detail, 'business_type', 'category') || text(row, 'business_type', 'category') || services.map((service) => text(service, 'category')).find(Boolean) || 'Partner';
        const prices = services.map((service) => numberOrNull(service, 'price_from', 'price')).filter((value): value is number => value !== null);
        const fromPrice = prices.length ? Math.min(...prices) : null;
        const serviceCategories = [...new Set(services.map((service) => text(service, 'category')).filter(Boolean))].slice(0, 3);
        const featuredService = services.map((service) => text(service, 'title', 'name')).find(Boolean) || '';
        const recommended = bool(row, 'is_recommended', 'recommended', 'is_featured') || bool(detail, 'is_recommended', 'recommended', 'is_featured');
        const verified = bool(row, 'is_verified', 'verified') || bool(detail, 'is_verified', 'verified') || text(row, 'status').toLowerCase() === 'approved';
        return {
          id,
          name: text(detail, 'display_name', 'legal_name') || text(row, 'display_name', 'legal_name') || 'Melo Partner',
          description: text(detail, 'description', 'about', 'bio') || text(row, 'description', 'about', 'bio'),
          category,
          address: text(detail, 'address') || text(row, 'address'),
          province: text(detail, 'province') || text(row, 'province'),
          district: text(detail, 'district') || text(row, 'district'),
          city: text(detail, 'city') || text(row, 'city'),
          country: text(detail, 'country') || text(row, 'country'),
          verified,
          recommended,
          coverImages: media.cover,
          logoImages: media.logo,
          serviceCount: services.length,
          serviceCategories,
          featuredService,
          fromPrice,
          currency: services.map((service) => text(service, 'currency')).find(Boolean) || 'THB',
          score: partnerScore(row, detail, services.length, media.cover.length > 0 || media.logo.length > 0),
        };
      }));
      const next = mapped
        .filter((item): item is PartnerItem => Boolean(item))
        .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name));
      setPartners(next);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : copy.loadFailed);
      setPartners([]);
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

  const scoped = useMemo(() => partners.filter((partner) => countryScope === GLOBAL_COUNTRY_SCOPE || matchesCountryScope(partner.country, countryScope)), [countryScope, partners]);
  const categoryBase = useMemo(() => scoped.filter((partner) => partnerMatchesCategory(partner, selectedCategory)), [scoped, selectedCategory]);
  // Partner discovery is currently Thailand-first. The dropdown values come from
  // the canonical master list, while legacy/map strings are only normalized for matching.
  const locationCountryValue = countryScope === GLOBAL_COUNTRY_SCOPE ? 'Thailand' : countryScope;
  const provinceOptions = useMemo(
    () => getMasterProvinceOptions(locationCountryValue),
    [locationCountryValue],
  );

  // Location Filter V2: province belongs to the active country scope.
  useEffect(() => {
    setSelectedProvince("");
  }, [locationCountryValue]);
  const filtered = useMemo(() => {
    const query = categoryQuery.trim().toLocaleLowerCase();
    return categoryBase
      .filter((partner) =>
        matchesMasterLocation(
          {
            country: partner.country,
            province: partner.province,
            district: partner.district,
            city: partner.city,
            address: partner.address,
          },
          locationCountryValue,
          selectedProvince,
          '',
        ),
      )
      .filter((partner) => {
        if (!query) return true;
        const haystack = [
          partner.name,
          partner.description,
          partner.address,
          partner.province,
          partner.district,
          partner.city,
          partner.country,
          partner.category,
          partner.featuredService,
          ...partner.serviceCategories,
        ].join(' ').toLocaleLowerCase();
        return haystack.includes(query);
      });
  }, [categoryBase, categoryQuery, locationCountryValue, selectedProvince]);
  const recommended = useMemo(() => {
    const flagged = filtered.filter((partner) => partner.recommended);
    return (flagged.length ? flagged : filtered).slice(0, 6);
  }, [filtered]);
  const marqueeItems = useMemo(() => recommended.length > 1 ? [...recommended, ...recommended] : recommended, [recommended]);

  const money = (value: number | null, currency: string) => value === null ? '' : `${value.toLocaleString(localeTag, { maximumFractionDigits: 2 })} ${currency || 'THB'}`;
  const openPartner = (partner: PartnerItem) => router.push(`/partners/${partner.id}`);
  const selectCategory = (category: PartnerCategoryFilter) => {
    setSelectedCategory(category);
    setSelectedProvince('');
    setCategoryQuery('');
    setCategorySheetOpen(false);
    if (category) {
      window.setTimeout(() => categorySearchRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 40);
    }
  };
  const categoryLabelForFilter = (category: Exclude<PartnerCategoryFilter, ''>) => category === 'activity_outdoor'
    ? copy.activityOutdoor
    : getPartnerCategoryLabel(category, locale);
  const isCategoryActive = (category: PartnerBusinessCategory) => selectedCategory === category
    || (selectedCategory === 'activity_outdoor' && (category === 'activities_experiences' || category === 'sports_outdoor'));
  const locationCopy = LOCATION_FILTER_COPY[locale] ?? LOCATION_FILTER_COPY.en;
  const selectedCategoryLabel = selectedCategory ? categoryLabelForFilter(selectedCategory) : '';
  const selectedCategoryIcon = selectedCategory === 'activity_outdoor'
    ? '🏕️'
    : selectedCategory
      ? CATEGORY_META[selectedCategory].icon
      : '📍';

  return (
    <main className={styles.page}>
      <Header />
      <section className={styles.shell}>
        <header className={styles.pageHeader}>
          <div>
            <span className={styles.kicker}>{copy.kicker}</span>
            <h1>{copy.title}</h1>
            <p>{copy.subtitle}</p>
          </div>
          <span className={styles.countPill}>{filtered.length.toLocaleString(localeTag)} {copy.partnerCount}</span>
        </header>

        <section className={styles.categoryBrowser} aria-label={copy.categoriesTitle}>
          <div className={styles.categoryBrowserHeader}>
            <div>
              <strong>{copy.categoriesTitle}</strong>
              <p>{copy.categoriesSubtitle}</p>
            </div>
            <button type="button" className={!selectedCategory ? styles.categoryAllActive : styles.categoryAllButton} onClick={() => selectCategory('')}>
              {copy.all}
            </button>
          </div>

          <div className={styles.desktopCategoryGrid}>
            {BUSINESS_TYPES.map((category) => (
              <button type="button" key={category} className={`${styles.categoryTile} ${isCategoryActive(category) ? styles.categoryTileActive : ''}`} onClick={() => selectCategory(category)}>
                <span className={styles.categoryTileIcon} style={{ background: CATEGORY_META[category].accent }}>{CATEGORY_META[category].icon}</span>
                <span className={styles.categoryTileCopy}>
                  <strong>{getPartnerCategoryLabel(category, locale)}</strong>
                </span>
              </button>
            ))}
          </div>

          <div className={styles.mobileCategoryGrid}>
            {QUICK_CATEGORY_SHORTCUTS.map((item) => {
              const active = item.key === 'activity_outdoor' ? selectedCategory === 'activity_outdoor' : selectedCategory === item.key;
              return (
                <button type="button" key={item.key} className={`${styles.mobileCategoryButton} ${active ? styles.mobileCategoryButtonActive : ''}`} onClick={() => selectCategory(item.key)}>
                  <span className={styles.mobileCategoryIcon} style={{ background: item.accent }}>{item.icon}</span>
                  <strong>{categoryLabelForFilter(item.key)}</strong>
                </button>
              );
            })}
            <button type="button" className={styles.mobileCategoryButton} onClick={() => setCategorySheetOpen(true)}>
              <span className={`${styles.mobileCategoryIcon} ${styles.mobileCategoryMore}`}>•••</span>
              <strong>{copy.otherCategories}</strong>
            </button>
          </div>
        </section>

        {selectedCategory ? (
          <section ref={categorySearchRef} className={styles.categorySearchPanel} aria-label={locationCopy.title}>
            <div className={styles.categorySearchHeading}>
              <span className={styles.categorySearchIcon}>{selectedCategoryIcon}</span>
              <div>
                <small>{locationCopy.title}</small>
                <h2>{selectedCategoryLabel}</h2>
                <p>{locationCopy.hint}</p>
              </div>
              <strong className={styles.categorySearchCount}>{locationCopy.results(filtered.length)}</strong>
            </div>
            <div className={styles.categorySearchFilters}>
              <label>
                <span>{locationCopy.province}</span>
                <select
                  value={selectedProvince}
                  onChange={(event) => {
                    setSelectedProvince(event.target.value);
                                  }}
                >
                  <option value="">{locationCopy.allProvince}</option>
                  {provinceOptions.map((province) => <option value={province.value} key={province.code}>{getMasterLocationLabel(province, locale)}</option>)}
                </select>
              </label>

              <label className={styles.categorySearchKeyword}>
                <span>{locationCopy.keyword}</span>
                <input value={categoryQuery} onChange={(event) => setCategoryQuery(event.target.value)} placeholder={locationCopy.keyword} />
              </label>
              <button
                type="button"
                className={styles.categorySearchClear}
                disabled={!selectedProvince && !categoryQuery.trim()}
                onClick={() => {
                  setSelectedProvince('');
                                setCategoryQuery('');
                }}
              >
                {locationCopy.clear}
              </button>
            </div>
          </section>
        ) : null}

        {categorySheetOpen && (
          <div className={styles.categoryModal} role="dialog" aria-modal="true" aria-label={copy.allCategories} onClick={() => setCategorySheetOpen(false)}>
            <div className={styles.categorySheet} onClick={(event) => event.stopPropagation()}>
              <div className={styles.categorySheetHandle} />
              <div className={styles.categorySheetHeader}>
                <div><h2>{copy.allCategories}</h2><p>{copy.categoriesSubtitle}</p></div>
                <button type="button" aria-label={copy.closeCategories} onClick={() => setCategorySheetOpen(false)}>×</button>
              </div>
              <button type="button" className={styles.categorySheetAll} onClick={() => selectCategory('')}><span>☷</span><strong>{copy.all}</strong></button>
              <div className={styles.categorySheetScroll}>
                {CATEGORY_GROUPS.map((group) => (
                  <section className={styles.categoryGroup} key={group.titleKey}>
                    <h3>{copy[group.titleKey]}</h3>
                    <div className={styles.categoryGroupGrid}>
                      {group.types.map((category) => (
                        <button type="button" key={category} onClick={() => selectCategory(category)}>
                          <span style={{ background: CATEGORY_META[category].accent }}>{CATEGORY_META[category].icon}</span>
                          <strong>{getPartnerCategoryLabel(category, locale)}</strong>
                        </button>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <section className={styles.state}><span className={styles.spinner} /><p>{copy.loading}</p></section>
        ) : error ? (
          <section className={styles.state}><strong>{copy.loadFailed}</strong><p>{error}</p><button type="button" onClick={() => user && void load()}>{copy.retry}</button></section>
        ) : filtered.length === 0 ? (
          <section className={styles.state}><strong>{copy.empty}</strong></section>
        ) : (
          <>
            {recommended.length > 0 && (
              <section className={styles.recommendedSection}>
                <div className={styles.sectionHeading}>
                  <div><span>{copy.recommendedBadge}</span><h2>{copy.recommendedTitle}</h2><p>{copy.recommendedSubtitle}</p></div>
                </div>
                <div className={styles.marqueeViewport}>
                  <div className={`${styles.marqueeTrack} ${recommended.length <= 1 ? styles.marqueeStatic : ''}`}>
                    {marqueeItems.map((partner, index) => (
                      <button type="button" className={styles.featureCard} key={`${partner.id}-${index}`} onClick={() => openPartner(partner)}>
                        <div className={styles.featureCover}>
                          <ActiveImage urls={partner.coverImages} alt="" className={styles.featureCoverImage} eager={index < 2} />
                          <div className={styles.featureShade} />
                          <div className={styles.featureBadgeRow}>
                            <em>{copy.recommendedBadge}</em>
                            {partner.verified && <strong>✓ {copy.verified}</strong>}
                          </div>
                          <div className={styles.featureIdentity}>
                            <ActiveImage urls={partner.logoImages} alt={partner.name} className={styles.featureLogo} eager={index < 2} />
                            <div>
                              <small>{displayCategoryLabel(partner.category, locale)}</small>
                              <h3>{partner.name}</h3>
                              {partnerLocationText(partner) && <p>{partnerLocationText(partner)}</p>}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            )}

            <section className={styles.partnersSection}>
              <div className={styles.sectionHeading}>
                <div><h2>{copy.partnersTitle}</h2><p>{copy.partnersSubtitle}</p></div>
              </div>
              <div className={styles.partnerGrid}>
                {filtered.map((partner) => (
                  <article className={styles.partnerCard} key={partner.id}>
                    <button type="button" className={styles.partnerButton} onClick={() => openPartner(partner)}>
                      <div className={styles.cardCover}>
                        <ActiveImage urls={partner.coverImages} alt="" className={styles.cardCoverImage} />
                        <div className={styles.cardShade} />
                        <div className={styles.cardBadges}>
                          {partner.verified && <em>✓ {copy.verified}</em>}
                        </div>
                      </div>
                      <div className={styles.cardBody}>
                        <div className={styles.identityRow}>
                          <ActiveImage urls={partner.logoImages} alt={partner.name} className={styles.cardLogo} />
                          <div>
                            <small>{displayCategoryLabel(partner.category, locale)}</small>
                            <h3>{partner.name}</h3>
                            {partnerLocationText(partner) && <p className={styles.location}>{partnerLocationText(partner)}</p>}
                          </div>
                        </div>

                        <p className={styles.description}>{partner.description || copy.noDescription}</p>

                        {partner.serviceCategories.length > 0 && (
                          <div className={styles.serviceChips}>
                            {partner.serviceCategories.map((category) => <span key={category}>{categoryLabel(category)}</span>)}
                          </div>
                        )}

                        <div className={styles.cardMeta}>
                          <div>
                            <span>{copy.services}</span>
                            <strong>{partner.serviceCount.toLocaleString(localeTag)} {copy.service}</strong>
                          </div>
                          {partner.fromPrice !== null && (
                            <div>
                              <span>{copy.from}</span>
                              <strong>{money(partner.fromPrice, partner.currency)}</strong>
                            </div>
                          )}
                        </div>

                        <div className={styles.cardFooter}>
                          <span>{partner.featuredService || displayCategoryLabel(partner.category, locale)}</span>
                          <b>{copy.viewPartner} →</b>
                        </div>
                      </div>
                    </button>
                  </article>
                ))}
              </div>
            </section>
          </>
        )}
      </section>
    </main>
  );
}
