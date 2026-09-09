'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { useLocale } from '@/components/SiteProviders';
import { resolveCommerceMediaList } from '@/components/commerce/commerceMedia';
import { GLOBAL_COUNTRY_SCOPE, matchesCountryScope } from '@/lib/discoveryCountry';
import { getCurrentUser, isSupabaseConfigured, rpcRequest } from '@/lib/supabase/browser';
import { partnersCopy } from '@/i18n/partnersUi';
import styles from './PartnersExperience.module.css';

type Row = Record<string, unknown>;
type User = { id: string; email?: string };

type PartnerItem = {
  id: string;
  name: string;
  description: string;
  category: string;
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
  const [selectedCategory, setSelectedCategory] = useState('');
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
  const categories = useMemo(() => [...new Set(scoped.map((partner) => partner.category).filter(Boolean))].slice(0, 16), [scoped]);
  const filtered = useMemo(() => scoped.filter((partner) =>
    !selectedCategory || normalizeCategory(partner.category) === normalizeCategory(selectedCategory)
  ), [scoped, selectedCategory]);

  const recommended = useMemo(() => {
    const flagged = filtered.filter((partner) => partner.recommended);
    return (flagged.length ? flagged : filtered).slice(0, 6);
  }, [filtered]);
  const marqueeItems = useMemo(() => recommended.length > 1 ? [...recommended, ...recommended] : recommended, [recommended]);

  const money = (value: number | null, currency: string) => value === null ? '' : `${value.toLocaleString(localeTag, { maximumFractionDigits: 2 })} ${currency || 'THB'}`;
  const openPartner = (partner: PartnerItem) => router.push(`/partners/${partner.id}`);

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

        <nav className={styles.categoryNav} aria-label={copy.title}>
          <button type="button" className={!selectedCategory ? styles.categoryActive : ''} onClick={() => setSelectedCategory('')}>{copy.all}</button>
          {categories.map((category) => (
            <button type="button" key={category} className={selectedCategory === category ? styles.categoryActive : ''} onClick={() => setSelectedCategory(category)}>{categoryLabel(category)}</button>
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
                              <small>{categoryLabel(partner.category)}</small>
                              <h3>{partner.name}</h3>
                              {(partner.city || partner.country) && <p>{[partner.city, partner.country].filter(Boolean).join(' · ')}</p>}
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
                            <small>{categoryLabel(partner.category)}</small>
                            <h3>{partner.name}</h3>
                            {(partner.city || partner.country) && <p className={styles.location}>{[partner.city, partner.country].filter(Boolean).join(' · ')}</p>}
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
                          <span>{partner.featuredService || categoryLabel(partner.category)}</span>
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
