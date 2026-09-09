type NominatimReverse = {
  display_name?: string;
  name?: string;
  lat?: string;
  lon?: string;
  address?: Record<string, unknown>;
};

function text(row: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function unique(parts: string[]) {
  const seen = new Set<string>();
  return parts.filter((value) => {
    const clean = value.trim();
    if (!clean) return false;
    const key = clean.toLocaleLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const latitude = Number(url.searchParams.get("lat"));
  const longitude = Number(url.searchParams.get("lng"));
  const locale = (url.searchParams.get("locale") || "en").trim().slice(0, 8);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return Response.json({ place: null }, { status: 400 });
  }

  const endpoint = new URL("https://nominatim.openstreetmap.org/reverse");
  endpoint.searchParams.set("lat", String(latitude));
  endpoint.searchParams.set("lon", String(longitude));
  endpoint.searchParams.set("format", "jsonv2");
  endpoint.searchParams.set("addressdetails", "1");
  endpoint.searchParams.set("zoom", "18");
  endpoint.searchParams.set("accept-language", `${locale},en`);

  try {
    const response = await fetch(endpoint, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "Accept-Language": `${locale},en;q=0.8`,
        "User-Agent": "MeloChatWeb/1.0 (reverse-geocode)",
      },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return Response.json({ place: null });

    const payload = await response.json() as NominatimReverse;
    const address = payload.address && typeof payload.address === "object" ? payload.address : {};
    const road = text(address, "road", "pedestrian", "footway");
    const house = text(address, "house_number");
    const neighbourhood = text(address, "neighbourhood", "quarter", "suburb");
    const district = text(address, "district", "city_district", "county");
    const city = text(address, "city", "town", "municipality", "village");
    const region = text(address, "state", "province", "region");
    const country = text(address, "country");
    const countryCode = text(address, "country_code").toUpperCase();
    const postalCode = text(address, "postcode");
    const name = String(payload.name || text(address, "amenity", "shop", "tourism", "building") || road || neighbourhood || city || region || country).trim();
    const shortAddress = unique([district, city, region, country]).slice(0, 3).join(", ");
    const fullAddress = unique([
      unique([house, road]).join(" "),
      neighbourhood,
      district,
      city,
      region,
      postalCode,
      country,
    ]).join(", ") || String(payload.display_name ?? "").trim();
    // Same compact label shape used by Android buildLocationLabel(): place/district/city/region/country, max 3 parts.
    const label = unique([name, district, city, region, country]).slice(0, 3).join(", ");

    return Response.json({
      place: {
        label,
        name,
        address: fullAddress,
        shortAddress,
        city,
        district,
        subdistrict: text(address, "suburb", "village", "neighbourhood"),
        state: region,
        region,
        province: region,
        country,
        countryCode,
        postalCode,
        latitude,
        longitude,
      },
    });
  } catch {
    return Response.json({ place: null });
  }
}
