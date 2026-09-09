type PhotonFeature = {
  geometry?: { coordinates?: unknown };
  properties?: Record<string, unknown>;
};

type PhotonResponse = { features?: PhotonFeature[] };

type NominatimResult = {
  place_id?: string | number;
  osm_type?: string;
  osm_id?: string | number;
  lat?: string;
  lon?: string;
  display_name?: string;
  name?: string;
  namedetails?: Record<string, unknown>;
  address?: Record<string, unknown>;
};

type PlaceResult = {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  latitude: number;
  longitude: number;
};

function text(properties: Record<string, unknown> | undefined, key: string) {
  const value = properties?.[key];
  return typeof value === "string" ? value.trim() : "";
}

function joinUnique(parts: string[]) {
  const seen = new Set<string>();
  return parts.filter((part) => {
    const clean = part.trim();
    if (!clean) return false;
    const key = clean.toLocaleLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function compactAddress(parts: string[], name: string) {
  return joinUnique(parts)
    .filter((part) => part.toLocaleLowerCase() !== name.toLocaleLowerCase())
    .join(", ");
}

function photonPlaces(data: PhotonResponse, query: string): PlaceResult[] {
  return (data.features || []).flatMap((feature, index) => {
    const properties = feature.properties || {};
    const coordinates = Array.isArray(feature.geometry?.coordinates)
      ? feature.geometry?.coordinates
      : [];
    const longitude = Number(coordinates?.[0]);
    const latitude = Number(coordinates?.[1]);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return [];

    const name = text(properties, "name") || text(properties, "street") || text(properties, "city") || query;
    const city = text(properties, "city") || text(properties, "locality") || text(properties, "district") || text(properties, "county");
    const state = text(properties, "state");
    const country = text(properties, "country");
    const postcode = text(properties, "postcode");
    const street = joinUnique([text(properties, "housenumber"), text(properties, "street")]).join(" ");
    const district = text(properties, "district") || text(properties, "county");
    const address = compactAddress([street, district, city, state, postcode, country], name);
    const osmType = text(properties, "osm_type");
    const osmId = String(properties.osm_id ?? "");

    return [{
      id: `photon:${osmType || "place"}:${osmId || index}:${latitude}:${longitude}`,
      name,
      address,
      city,
      state,
      country,
      latitude,
      longitude,
    }];
  });
}

function nominatimPlaces(data: NominatimResult[], query: string): PlaceResult[] {
  return data.flatMap((item, index) => {
    const latitude = Number(item.lat);
    const longitude = Number(item.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return [];

    const address = item.address || {};
    const namedetails = item.namedetails || {};
    const name = String(
      item.name ||
      namedetails.name ||
      address.amenity ||
      address.tourism ||
      address.shop ||
      address.leisure ||
      address.office ||
      address.building ||
      query,
    ).trim();
    const city = text(address, "city") || text(address, "town") || text(address, "municipality") || text(address, "village") || text(address, "suburb") || text(address, "district") || text(address, "county");
    const state = text(address, "state") || text(address, "province");
    const country = text(address, "country");
    const postcode = text(address, "postcode");
    const road = text(address, "road") || text(address, "pedestrian") || text(address, "footway");
    const house = text(address, "house_number");
    const neighbourhood = text(address, "neighbourhood") || text(address, "quarter") || text(address, "suburb");
    const structured = compactAddress([
      joinUnique([house, road]).join(" "),
      neighbourhood,
      city,
      state,
      postcode,
      country,
    ], name);
    const displayName = typeof item.display_name === "string" ? item.display_name.trim() : "";
    const fullAddress = structured || (displayName && displayName !== name ? displayName : "");

    return [{
      id: `nominatim:${item.osm_type || "place"}:${item.osm_id || item.place_id || index}:${latitude}:${longitude}`,
      name,
      address: fullAddress,
      city,
      state,
      country,
      latitude,
      longitude,
    }];
  });
}

function resultKey(place: PlaceResult) {
  const lat = place.latitude.toFixed(5);
  const lon = place.longitude.toFixed(5);
  return `${place.name.toLocaleLowerCase()}|${lat}|${lon}`;
}

function mergePlaces(groups: PlaceResult[][], limit = 10) {
  const seenExact = new Set<string>();
  const seenCoordinates = new Set<string>();
  const merged: PlaceResult[] = [];

  for (const group of groups) {
    for (const place of group) {
      const exact = resultKey(place);
      const coordinate = `${place.latitude.toFixed(5)}|${place.longitude.toFixed(5)}`;
      if (seenExact.has(exact) || seenCoordinates.has(coordinate)) continue;
      seenExact.add(exact);
      seenCoordinates.add(coordinate);
      merged.push(place);
      if (merged.length >= limit) return merged;
    }
  }
  return merged;
}

async function fetchPhoton(query: string, locale: string) {
  const endpoint = new URL("https://photon.komoot.io/api/");
  endpoint.searchParams.set("q", query);
  endpoint.searchParams.set("limit", "12");
  if (locale) endpoint.searchParams.set("lang", locale.split("-")[0]);

  try {
    const response = await fetch(endpoint, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "Accept-Language": `${locale},en;q=0.8`,
      },
      signal: AbortSignal.timeout(4500),
    });
    if (!response.ok) return [];
    return photonPlaces((await response.json()) as PhotonResponse, query);
  } catch {
    return [];
  }
}

async function fetchNominatim(query: string, locale: string) {
  const endpoint = new URL("https://nominatim.openstreetmap.org/search");
  endpoint.searchParams.set("q", query);
  endpoint.searchParams.set("format", "jsonv2");
  endpoint.searchParams.set("addressdetails", "1");
  endpoint.searchParams.set("namedetails", "1");
  endpoint.searchParams.set("limit", "12");
  endpoint.searchParams.set("dedupe", "0");
  endpoint.searchParams.set("accept-language", `${locale},en`);

  try {
    const response = await fetch(endpoint, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "Accept-Language": `${locale},en;q=0.8`,
        "User-Agent": "MeloChatWeb/1.0 (place-search)",
      },
      signal: AbortSignal.timeout(4500),
    });
    if (!response.ok) return [];
    const data = await response.json();
    return nominatimPlaces(Array.isArray(data) ? data : [], query);
  } catch {
    return [];
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = (url.searchParams.get("q") || "").trim();
  const locale = (url.searchParams.get("locale") || "en").trim().slice(0, 8);

  if (query.length < 2) {
    return Response.json({ results: [] });
  }

  /*
   * The mobile app shows several map/POI candidates for partial text. Photon can
   * legitimately return only one feature for some Thai POI names, so the web
   * search now combines two OpenStreetMap geocoders and de-duplicates by map
   * coordinate. This keeps the UI provider-neutral while returning a useful list.
   */
  const [nominatim, photon] = await Promise.all([
    fetchNominatim(query, locale),
    fetchPhoton(query, locale),
  ]);

  return Response.json({ results: mergePlaces([nominatim, photon], 10) });
}
