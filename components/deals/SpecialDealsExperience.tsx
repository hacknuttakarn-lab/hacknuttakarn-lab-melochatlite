'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { useLocale } from '@/components/SiteProviders';
import { getCurrentUser, isSupabaseConfigured, rpcRequest } from '@/lib/supabase/browser';
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
  image: string;
  images: string[];
  partnerName: string;
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
  if (detailType === 'package') score += 60;
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

export function SpecialDealsExperience() {
  const router = useRouter();
  const { locale } = useLocale();
  const copy = specialDealsCopy[locale];
  const configured = isSupabaseConfigured();
  const localeTag = useMemo(() => ({ th: 'th-TH', en: 'en-US', de: 'de-DE', zh: 'zh-CN', ja: 'ja-JP', ko: 'ko-KR' }[locale]), [locale]);
  const [user, setUser] = useState<User | null>(null);
  const [deals, setDeals] = useState<DealItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
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
      const enrichedBusinesses = new Map<string, Row>();
      await Promise.all(dealBusinessIds.map(async (businessId) => {
        const [serviceBase, serviceDetails, salesSettings, businessDetail] = await Promise.all([
          rpcRequest<Row[]>('melo_business_services_for_viewer', { p_business_id: businessId }),
          rpcRequest<Row[]>('get_business_service_details', { p_business_id: businessId }),
          rpcRequest<Row[]>('get_business_service_sales_settings', { p_business_id: businessId }),
          rpcRequest<Row[]>('melo_business_for_viewer', { p_business_id: businessId }),
        ]);
        const detailMap = new Map(rowsOf(serviceDetails.data).map((row) => [text(row, 'service_id', 'id'), row]));
        const salesMap = new Map(rowsOf(salesSettings.data).map((row) => [text(row, 'service_id', 'id'), row]));
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
        const businessExtra = enrichedBusinesses.get(businessId) ?? {};
        const images = await resolveCommerceMediaList(row, serviceExtra, businessExtra, business);
        return {
          id,
          businessId,
          title: text(row, 'title') || text(serviceExtra, 'title', 'name') || 'Melo Deal',
          description: text(row, 'description', 'short_description') || text(serviceExtra, 'description', 'short_description'),
          category: text(row, 'category', 'detail_type') || text(serviceExtra, 'category', 'detail_type') || 'Deals',
          image: images[0] ?? '',
          images,
          partnerName: text(businessExtra, 'display_name', 'legal_name') || text(business, 'display_name', 'legal_name') || text(row, 'business_name', 'partner_name') || 'Melo Partner',
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
        };
      }));
      const next = mapped
        .filter((item): item is DealItem => Boolean(item))
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

  const categories = useMemo(() => [...new Set(deals.map((deal) => deal.category).filter(Boolean))].slice(0, 14), [deals]);
  const filtered = useMemo(() => selectedCategory ? deals.filter((deal) => deal.category === selectedCategory) : deals, [deals, selectedCategory]);
  const recommended = useMemo(() => filtered.slice(0, 5), [filtered]);
  const marqueeItems = useMemo(() => recommended.length > 1 ? [...recommended, ...recommended] : recommended, [recommended]);

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
          <span className={styles.countPill}>{filtered.length.toLocaleString(localeTag)} {copy.dealCount}</span>
        </header>

        <nav className={styles.categoryNav} aria-label={copy.title}>
          <button type="button" className={!selectedCategory ? styles.categoryActive : ''} onClick={() => setSelectedCategory('')}>{copy.all}</button>
          {categories.map((category) => (
            <button type="button" key={category} className={selectedCategory === category ? styles.categoryActive : ''} onClick={() => setSelectedCategory(category)}>{category}</button>
          ))}
        </nav>

        {loading ? (
          <section className={styles.state}><span className={styles.spinner} /><p>{copy.loading}</p></section>
        ) : error ? (
          <section className={styles.state}><strong>{copy.loadFailed}</strong><p>{error}</p><button type="button" onClick={() => user && void load()}>{copy.retry}</button></section>
        ) : filtered.length === 0 ? (
          <section className={styles.state}><strong>{copy.empty}</strong></section>
        ) : (
          <>
            <section className={styles.recommendedSection}>
              <div className={styles.sectionHeading}>
                <div><span>{copy.recommendedBadge}</span><h2>{copy.recommendedTitle}</h2><p>{copy.recommendedSubtitle}</p></div>
              </div>
              <div className={styles.marqueeViewport}>
                <div className={`${styles.marqueeTrack} ${recommended.length <= 1 ? styles.marqueeStatic : ''}`}>
                  {marqueeItems.map((deal, index) => {
                    const percent = discountPercent(deal);
                    return (
                      <button type="button" className={styles.featureCard} key={`${deal.id}-${index}`} onClick={() => openDeal(deal)}>
                        <div className={styles.featureImage} style={deal.images.length ? { backgroundImage: commerceBackgroundImage(deal.images) } : undefined}>
                          {!deal.image && <span>％</span>}
                          <div className={styles.featureShade} />
                          <div className={styles.featureBadges}>
                            <em>{copy.recommendedBadge}</em>
                            {percent > 0 && <strong>-{percent}%</strong>}
                            {deal.memberOnly && <i>{copy.memberOnly}</i>}
                          </div>
                          <div className={styles.featureCaption}>
                            <small>{deal.partnerName}</small>
                            <h3>{deal.title}</h3>
                            <div>{deal.price !== null && <b>{money(deal.price, deal.currency)}</b>}{deal.originalPrice !== null && deal.price !== null && deal.originalPrice > deal.price && <del>{money(deal.originalPrice, deal.currency)}</del>}</div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            <section className={styles.dealsSection}>
              <div className={styles.sectionHeading}>
                <div><h2>{copy.dealsTitle}</h2><p>{copy.dealsSubtitle}</p></div>
              </div>
              <div className={styles.dealGrid}>
                {filtered.map((deal) => {
                  const percent = discountPercent(deal);
                  return (
                    <article className={styles.dealCard} key={deal.id}>
                      <button type="button" className={styles.dealMainButton} onClick={() => openDeal(deal)} aria-label={`${copy.viewDeal}: ${deal.title}`}>
                        <div className={styles.dealImage} style={deal.images.length ? { backgroundImage: commerceBackgroundImage(deal.images) } : undefined}>
                          {!deal.image && <span>％</span>}
                          <div className={styles.imageBadges}>
                            {percent > 0 && <em>-{percent}%</em>}
                            {deal.memberOnly && <strong>{copy.memberOnly}</strong>}
                          </div>
                        </div>
                        <div className={styles.dealBody}>
                          <div className={styles.partnerLine}><span>{deal.partnerName}</span>{deal.city || deal.country ? <small>{[deal.city, deal.country].filter(Boolean).join(' · ')}</small> : null}</div>
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
                      <div className={styles.dealFooter}>
                        <span>{deal.category}</span>
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
                })}
              </div>
            </section>
          </>
        )}
      </section>
    </main>
  );
}
