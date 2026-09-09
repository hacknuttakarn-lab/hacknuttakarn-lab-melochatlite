"use client";

import { invokeEdgeFunction } from "@/lib/supabase/browser";

export type MeloPlaceAutocompleteSuggestion = {
  id: string;
  placeId: string;
  text: string;
  mainText: string;
  secondaryText: string;
  distanceMeters: number | null;
};

export type MeloPlaceResult = {
  id: string;
  placeId: string;
  name: string;
  address: string;
  shortAddress: string;
  city: string;
  district: string;
  subdistrict: string;
  state: string;
  region: string;
  province: string;
  country: string;
  countryCode: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  googleMapsUri: string | null;
};

type Row = Record<string, unknown>;

function finiteNumber(value: unknown): number | null {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeRegionCode(value: string | undefined) {
  const normalized = String(value ?? "").trim();
  if (/^[A-Za-z]{2}$/.test(normalized)) return normalized.toUpperCase();
  const key = normalized.toLowerCase().replace(/\s+/g, " ");
  const known: Record<string, string> = {
    thailand: "TH", "ประเทศไทย": "TH",
    japan: "JP", "ญี่ปุ่น": "JP",
    china: "CN", "จีน": "CN",
    "south korea": "KR", korea: "KR", "เกาหลีใต้": "KR",
    germany: "DE", "เยอรมนี": "DE",
    "united states": "US", usa: "US", "สหรัฐอเมริกา": "US",
    "united kingdom": "GB", uk: "GB", "สหราชอาณาจักร": "GB",
    singapore: "SG", "สิงคโปร์": "SG",
    malaysia: "MY", "มาเลเซีย": "MY",
  };
  return known[key] ?? "";
}

function edgePayload(data: unknown) {
  const payload = data && typeof data === "object" ? data as Row : {};
  if (payload.error) throw new Error(String(payload.error));
  return payload;
}

export async function searchMeloPlaces(input: {
  query: string;
  languageCode?: string;
  regionCode?: string;
  latitude?: number | null;
  longitude?: number | null;
}) {
  const query = input.query.trim();
  if (query.length < 2) return [] as MeloPlaceAutocompleteSuggestion[];

  const result = await invokeEdgeFunction<Row>("ai-trip-place-search", {
    mode: "autocomplete",
    input: query,
    languageCode: input.languageCode ?? "th",
    regionCode: normalizeRegionCode(input.regionCode),
    preferRegions: false,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
  });
  if (result.error) throw new Error(result.error);
  const payload = edgePayload(result.data);
  const rows = Array.isArray(payload.suggestions) ? payload.suggestions : [];

  return rows.flatMap<MeloPlaceAutocompleteSuggestion>((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const row = raw as Row;
    const placeId = String(row.placeId ?? row.id ?? "").trim();
    const text = String(row.text ?? "").trim();
    if (!placeId || !text) return [];
    return [{
      id: String(row.id ?? placeId),
      placeId,
      text,
      mainText: String(row.mainText ?? text).trim(),
      secondaryText: String(row.secondaryText ?? "").trim(),
      distanceMeters: finiteNumber(row.distanceMeters),
    }];
  }).slice(0, 6);
}

export async function resolveMeloPlace(input: {
  placeId: string;
  languageCode?: string;
  regionCode?: string;
}): Promise<MeloPlaceResult> {
  const result = await invokeEdgeFunction<Row>("ai-trip-place-search", {
    mode: "place_detail",
    placeId: input.placeId.trim(),
    languageCode: input.languageCode ?? "th",
    regionCode: normalizeRegionCode(input.regionCode),
  });
  if (result.error) throw new Error(result.error);
  const payload = edgePayload(result.data);
  const raw = payload.place;
  if (!raw || typeof raw !== "object") throw new Error("PLACE_DETAILS_UNAVAILABLE");
  const row = raw as Row;
  const latitude = finiteNumber(row.latitude);
  const longitude = finiteNumber(row.longitude);
  if (latitude == null || longitude == null) throw new Error("PLACE_COORDINATES_UNAVAILABLE");

  const region = String(row.region ?? "").trim();
  return {
    id: String(row.id ?? input.placeId),
    placeId: String(row.placeId ?? row.id ?? input.placeId),
    name: String(row.name ?? "").trim(),
    address: String(row.address ?? "").trim(),
    shortAddress: String(row.shortAddress ?? "").trim(),
    city: String(row.city ?? "").trim(),
    district: String(row.district ?? "").trim(),
    subdistrict: String(row.subdistrict ?? "").trim(),
    state: region,
    region,
    province: String(row.province ?? row.region ?? "").trim(),
    country: String(row.country ?? "").trim(),
    countryCode: String(row.countryCode ?? "").trim().toUpperCase(),
    postalCode: String(row.postalCode ?? "").trim(),
    latitude,
    longitude,
    googleMapsUri: row.googleMapsUri ? String(row.googleMapsUri) : null,
  };
}

export function meloPlaceDisplayLabel(place: Pick<MeloPlaceResult, "name" | "address" | "shortAddress">) {
  const name = (place.name || place.shortAddress || place.address).trim();
  const secondary = (place.shortAddress || place.address).trim();
  return secondary && secondary !== name ? `${name} · ${secondary}` : name;
}

export function formatMeloDistance(distanceMeters: number | null, locale: string) {
  if (distanceMeters == null || !Number.isFinite(distanceMeters) || distanceMeters < 0) return "";
  if (distanceMeters < 1000) return `${Math.max(1, Math.round(distanceMeters))} ${locale === "th" ? "ม." : "m"}`;
  const km = distanceMeters / 1000;
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} ${locale === "th" ? "กม." : "km"}`;
}

function currentPosition() {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("GEOLOCATION_UNAVAILABLE"));
      return;
    }
    // Mirrors Expo Location.Accuracy.Balanced closely for browser use.
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 12000,
      maximumAge: 60000,
    });
  });
}

export async function getCurrentMeloPlace(input: {
  locale: string;
  fallbackLabel: string;
}): Promise<MeloPlaceResult> {
  const position = await currentPosition();
  const latitude = position.coords.latitude;
  const longitude = position.coords.longitude;
  let reverse: Partial<MeloPlaceResult> & { label?: string } = {};

  try {
    const response = await fetch(`/api/place-reverse?lat=${encodeURIComponent(latitude)}&lng=${encodeURIComponent(longitude)}&locale=${encodeURIComponent(input.locale)}`, {
      cache: "no-store",
    });
    if (response.ok) {
      const payload = await response.json() as { place?: Partial<MeloPlaceResult> & { label?: string } };
      reverse = payload.place ?? {};
    }
  } catch {
    // Coordinates remain usable when reverse geocoding is unavailable.
  }

  const label = String(reverse.label || reverse.name || input.fallbackLabel).trim() || input.fallbackLabel;
  return {
    id: `current:${latitude}:${longitude}`,
    placeId: "",
    name: label,
    address: String(reverse.address ?? "").trim(),
    shortAddress: String(reverse.shortAddress ?? "").trim(),
    city: String(reverse.city ?? "").trim(),
    district: String(reverse.district ?? "").trim(),
    subdistrict: String(reverse.subdistrict ?? "").trim(),
    state: String(reverse.state ?? reverse.region ?? "").trim(),
    region: String(reverse.region ?? reverse.state ?? "").trim(),
    province: String(reverse.province ?? reverse.region ?? reverse.state ?? "").trim(),
    country: String(reverse.country ?? "").trim(),
    countryCode: String(reverse.countryCode ?? "").trim().toUpperCase(),
    postalCode: String(reverse.postalCode ?? "").trim(),
    latitude,
    longitude,
    googleMapsUri: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${latitude},${longitude}`)}`,
  };
}
