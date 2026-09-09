import type { Locale } from '@/i18n/dictionaries';

export const GLOBAL_COUNTRY_SCOPE = '__GLOBAL__' as const;

export type DiscoveryCountry = {
  code: string;
  value: string;
  labels: Record<Locale, string>;
  aliases?: string[];
};

// Keep this aligned with Melo mobile Home -> Choose Country (15 launch markets + Global).
export const DISCOVERY_COUNTRIES: readonly DiscoveryCountry[] = [
  { code: 'TH', value: 'Thailand', labels: { th: 'ไทย', en: 'Thailand', de: 'Thailand', zh: '泰国', ja: 'タイ', ko: '태국' }, aliases: ['ประเทศไทย', 'thai'] },
  { code: 'JP', value: 'Japan', labels: { th: 'ญี่ปุ่น', en: 'Japan', de: 'Japan', zh: '日本', ja: '日本', ko: '일본' } },
  { code: 'KR', value: 'South Korea', labels: { th: 'เกาหลีใต้', en: 'South Korea', de: 'Südkorea', zh: '韩国', ja: '韓国', ko: '대한민국' }, aliases: ['korea', 'republic of korea', 'เกาหลี'] },
  { code: 'SG', value: 'Singapore', labels: { th: 'สิงคโปร์', en: 'Singapore', de: 'Singapur', zh: '新加坡', ja: 'シンガポール', ko: '싱가포르' } },
  { code: 'MY', value: 'Malaysia', labels: { th: 'มาเลเซีย', en: 'Malaysia', de: 'Malaysia', zh: '马来西亚', ja: 'マレーシア', ko: '말레이시아' } },
  { code: 'PH', value: 'Philippines', labels: { th: 'ฟิลิปปินส์', en: 'Philippines', de: 'Philippinen', zh: '菲律宾', ja: 'フィリピン', ko: '필리핀' } },
  { code: 'AU', value: 'Australia', labels: { th: 'ออสเตรเลีย', en: 'Australia', de: 'Australien', zh: '澳大利亚', ja: 'オーストラリア', ko: '호주' } },
  { code: 'NZ', value: 'New Zealand', labels: { th: 'นิวซีแลนด์', en: 'New Zealand', de: 'Neuseeland', zh: '新西兰', ja: 'ニュージーランド', ko: '뉴질랜드' } },
  { code: 'DE', value: 'Germany', labels: { th: 'เยอรมนี', en: 'Germany', de: 'Deutschland', zh: '德国', ja: 'ドイツ', ko: '독일' } },
  { code: 'CN', value: 'China', labels: { th: 'จีน', en: 'China', de: 'China', zh: '中国', ja: '中国', ko: '중국' }, aliases: ['pr china', "people's republic of china", 'จีนแผ่นดินใหญ่'] },
  { code: 'AT', value: 'Austria', labels: { th: 'ออสเตรีย', en: 'Austria', de: 'Österreich', zh: '奥地利', ja: 'オーストリア', ko: '오스트리아' } },
  { code: 'CH', value: 'Switzerland', labels: { th: 'สวิตเซอร์แลนด์', en: 'Switzerland', de: 'Schweiz', zh: '瑞士', ja: 'スイス', ko: '스위스' } },
  { code: 'NL', value: 'Netherlands', labels: { th: 'เนเธอร์แลนด์', en: 'Netherlands', de: 'Niederlande', zh: '荷兰', ja: 'オランダ', ko: '네덜란드' }, aliases: ['holland'] },
  { code: 'GB', value: 'United Kingdom', labels: { th: 'สหราชอาณาจักร', en: 'United Kingdom', de: 'Vereinigtes Königreich', zh: '英国', ja: 'イギリス', ko: '영국' }, aliases: ['uk', 'u.k.', 'great britain', 'britain', 'england', 'อังกฤษ'] },
  { code: 'CA', value: 'Canada', labels: { th: 'แคนาดา', en: 'Canada', de: 'Kanada', zh: '加拿大', ja: 'カナダ', ko: '캐나다' } },
  { code: 'US', value: 'United States', labels: { th: 'สหรัฐอเมริกา', en: 'United States', de: 'Vereinigte Staaten', zh: '美国', ja: 'アメリカ', ko: '미국' }, aliases: ['usa', 'u.s.', 'u.s.a.', 'america', 'อเมริกา', 'สหรัฐ'] },
] as const;

export const COUNTRY_SCOPE_VALUES = [GLOBAL_COUNTRY_SCOPE, ...DISCOVERY_COUNTRIES.map((country) => country.code)] as const;
export const COUNTRY_PICKER_COUNTRY_CODES = ['TH', 'US', 'DE', 'CN', 'JP', 'KR'] as const;
export const COUNTRY_PICKER_COUNTRIES = COUNTRY_PICKER_COUNTRY_CODES.map((code) =>
  DISCOVERY_COUNTRIES.find((country) => country.code === code),
).filter((country): country is DiscoveryCountry => Boolean(country));
export type CountryScope = (typeof COUNTRY_SCOPE_VALUES)[number];

const GLOBAL_LABELS: Record<Locale, string> = {
  th: 'ทั่วโลก',
  en: 'Global',
  de: 'Global',
  zh: '全球',
  ja: 'グローバル',
  ko: '전 세계',
};

const COUNTRY_PICKER_LABELS: Record<Locale, string> = {
  th: 'ประเทศ',
  en: 'Country',
  de: 'Land',
  zh: '国家/地区',
  ja: '国',
  ko: '국가',
};

function normalize(value: string) {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[.'’`´(),/\\_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const aliasToCode = new Map<string, string>();
for (const country of DISCOVERY_COUNTRIES) {
  const values = [country.code, country.value, ...Object.values(country.labels), ...(country.aliases ?? [])];
  for (const value of values) {
    const key = normalize(value);
    if (key && !aliasToCode.has(key)) aliasToCode.set(key, country.code);
  }
}

export function isCountryScope(value: string | null | undefined): value is CountryScope {
  const raw = String(value ?? '').trim();
  return raw === GLOBAL_COUNTRY_SCOPE || DISCOVERY_COUNTRIES.some((country) => country.code === raw);
}

export function countryCodeFromValue(value: string | null | undefined): string | null {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  return aliasToCode.get(normalize(raw)) ?? null;
}

export function matchesCountryScope(itemCountry: string | null | undefined, scope: CountryScope): boolean {
  if (scope === GLOBAL_COUNTRY_SCOPE) return true;
  const raw = String(itemCountry ?? '').trim();
  // Preserve legacy records with no/unknown country metadata, matching the mobile behavior.
  if (!raw) return true;
  const code = countryCodeFromValue(raw);
  return code ? code === scope : true;
}

export function countryScopeLabel(scope: CountryScope, locale: Locale) {
  if (scope === GLOBAL_COUNTRY_SCOPE) return GLOBAL_LABELS[locale];
  return DISCOVERY_COUNTRIES.find((country) => country.code === scope)?.labels[locale] ?? scope;
}

export function countryScopeFlag(scope: CountryScope) {
  if (scope === GLOBAL_COUNTRY_SCOPE) return '🌐';
  return String.fromCodePoint(...scope.split('').map((char) => 127397 + char.charCodeAt(0)));
}

export function countryPickerLabel(locale: Locale) {
  return COUNTRY_PICKER_LABELS[locale];
}
