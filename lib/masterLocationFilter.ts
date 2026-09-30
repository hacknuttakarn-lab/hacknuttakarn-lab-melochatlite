import {
  findCountryByValue,
  findRegionByValue,
  getCountryRegions,
  normalizeSearch,
  type LocalizedLocationOption,
} from "@/data/locations";
import { getCityOptions } from "@/data/cities";

export type MasterLocationLocale = "th" | "en" | "de" | "zh" | "ja" | "ko";

export type MasterLocationRecord = {
  country?: string | null;
  province?: string | null;
  region?: string | null;
  state?: string | null;
  district?: string | null;
  subdistrict?: string | null;
  city?: string | null;
  address?: string | null;
  destination?: string | null;
  startPoint?: string | null;
  venue?: string | null;
};

const GLOBAL_SCOPE_VALUES = new Set([
  "",
  "global",
  "world",
  "worldwide",
  "all",
  "__global__",
  "ทุกประเทศ",
  "ทั่วโลก",
]);

const THAILAND_REGION_ALIASES: Record<string, string[]> = {
  "TH-10": ["Bangkok", "Bangkok Metropolis", "กรุงเทพ", "กรุงเทพฯ", "กทม"],
  "TH-20": ["Chonburi"],
  "TH-31": ["Buriram"],
  "TH-40": ["Khonkaen"],
  "TH-80": ["Nakornsithammarat", "Nakhon Si Thammarat"],
  "TH-90": ["Songkhla"],
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeLoose(value: string) {
  return normalizeSearch(value)
    .replace(/\b(chang wat|province|state|prefecture|จังหวัด|จ\.?)\b/gi, " ")
    .replace(/[()[\]{}]/g, " ")
    .replace(/[,，·/\\|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compact(value: string) {
  return normalizeLoose(value).replace(/[\s._-]+/g, "");
}

function optionAliases(option: LocalizedLocationOption) {
  const aliases = [option.code, option.value, option.th, option.en];
  if (option.code.startsWith("TH-")) {
    aliases.push(...(THAILAND_REGION_ALIASES[option.code] ?? []));
  }
  return [...new Set(aliases.map((value) => clean(value)).filter(Boolean))];
}

function exactOptionMatch(
  options: LocalizedLocationOption[],
  value: string,
) {
  const normalized = normalizeLoose(value);
  const compacted = compact(value);
  if (!normalized) return undefined;

  return options.find((option) =>
    optionAliases(option).some((alias) => {
      const aliasNormalized = normalizeLoose(alias);
      return (
        aliasNormalized === normalized ||
        compact(alias) === compacted
      );
    }),
  );
}

function embeddedOptionMatch(
  options: LocalizedLocationOption[],
  value: string,
) {
  const normalized = ` ${normalizeLoose(value)} `;
  const compacted = compact(value);
  if (!normalized.trim()) return undefined;

  const ranked = options
    .flatMap((option) =>
      optionAliases(option).map((alias) => ({
        option,
        normalized: normalizeLoose(alias),
        compacted: compact(alias),
      })),
    )
    .filter((item) => item.normalized.length >= 4 || item.compacted.length >= 5)
    .sort((left, right) =>
      Math.max(right.normalized.length, right.compacted.length) -
      Math.max(left.normalized.length, left.compacted.length),
    );

  return ranked.find((item) => {
    if (item.normalized && normalized.includes(` ${item.normalized} `)) return true;
    if (item.compacted.length >= 6 && compacted.includes(item.compacted)) return true;
    return false;
  })?.option;
}

export function resolveMasterCountry(value: string) {
  const raw = clean(value);
  if (!raw || GLOBAL_SCOPE_VALUES.has(normalizeSearch(raw))) return undefined;
  return findCountryByValue(raw);
}

export function getMasterProvinceOptions(countryValue: string) {
  const country = resolveMasterCountry(countryValue);
  return country ? getCountryRegions(country.value) : [];
}

export function getMasterDistrictOptions(countryValue: string, provinceValue: string) {
  const country = resolveMasterCountry(countryValue);
  if (!country || !provinceValue.trim()) return [];
  const province = findRegionByValue(country.value, provinceValue);
  if (!province) return [];
  return getCityOptions(country.value, province.value);
}

export function getMasterLocationLabel(
  option: LocalizedLocationOption,
  locale: string,
) {
  // The master currently stores Thai + English. Other supported UI locales
  // intentionally use the canonical English label instead of mixing languages.
  return locale === "th" ? option.th : option.en;
}

export function getMasterLocationValueLabel(
  options: LocalizedLocationOption[],
  value: string,
  locale: string,
) {
  if (!value) return "";
  const option = exactOptionMatch(options, value);
  return option ? getMasterLocationLabel(option, locale) : value;
}

function countryForRecord(countryValue: string, recordCountry: string) {
  return resolveMasterCountry(countryValue) ?? resolveMasterCountry(recordCountry);
}

export function canonicalProvinceValue(
  countryValue: string,
  record: MasterLocationRecord,
) {
  const country = countryForRecord(countryValue, clean(record.country));
  if (!country) return "";

  const options = getCountryRegions(country.value);
  if (!options.length) return "";

  const directCandidates = [
    clean(record.province),
    clean(record.region),
    clean(record.state),
  ].filter(Boolean);

  for (const candidate of directCandidates) {
    const direct = findRegionByValue(country.value, candidate) ?? exactOptionMatch(options, candidate);
    if (direct) return direct.value;
  }

  const fallbackCandidates = [
    clean(record.city),
    clean(record.destination),
    clean(record.venue),
    clean(record.startPoint),
    clean(record.address),
    ...directCandidates,
  ].filter(Boolean);

  for (const candidate of fallbackCandidates) {
    const direct = exactOptionMatch(options, candidate);
    if (direct) return direct.value;
    const embedded = embeddedOptionMatch(options, candidate);
    if (embedded) return embedded.value;
  }

  return "";
}

export function canonicalDistrictValue(
  countryValue: string,
  provinceValue: string,
  record: MasterLocationRecord,
) {
  if (!provinceValue) return "";
  const country = countryForRecord(countryValue, clean(record.country));
  if (!country) return "";

  const province = findRegionByValue(country.value, provinceValue);
  if (!province) return "";

  const options = getCityOptions(country.value, province.value);
  if (!options.length) return "";

  const candidates = [
    clean(record.district),
    clean(record.subdistrict),
    clean(record.city),
    clean(record.address),
    clean(record.destination),
    clean(record.venue),
    clean(record.startPoint),
  ].filter(Boolean);

  for (const candidate of candidates) {
    const direct = exactOptionMatch(options, candidate);
    if (direct) return direct.value;
    const embedded = embeddedOptionMatch(options, candidate);
    if (embedded) return embedded.value;
  }

  return "";
}

export function matchesMasterLocation(
  record: MasterLocationRecord,
  countryValue: string,
  selectedProvince: string,
  selectedDistrict: string,
) {
  if (!selectedProvince && !selectedDistrict) return true;

  const province = canonicalProvinceValue(countryValue, record);
  if (selectedProvince && province !== selectedProvince) return false;

  if (selectedDistrict) {
    if (!province) return false;
    const district = canonicalDistrictValue(countryValue, province, record);
    if (district !== selectedDistrict) return false;
  }

  return true;
}
