export type LifestyleLocale = "th" | "en" | "de";
export type LifestyleCategory = "pets" | "drink" | "smoke" | "exercise" | "social" | "interests";

export type LifestyleOption = {
  value: string;
  th: string;
  en: string;
  de: string;
  aliases?: string[];
};

export const LIFESTYLE_OPTIONS: Record<LifestyleCategory, readonly LifestyleOption[]> = {
  pets: [
    { value: "dog", th: "สุนัข", en: "Dogs", de: "Hunde", aliases: ["dog", "dogs"] },
    { value: "cat", th: "แมว", en: "Cats", de: "Katzen", aliases: ["cat", "cats"] },
    { value: "bird", th: "นก", en: "Birds", de: "Vögel", aliases: ["bird", "birds"] },
    { value: "fish", th: "ปลา", en: "Fish", de: "Fische", aliases: ["fish"] },
    { value: "other_pets", th: "สัตว์เลี้ยงอื่น ๆ", en: "Other pets", de: "Andere Haustiere", aliases: ["other pets", "other_pet", "other_pets"] },
    { value: "no_pets", th: "ไม่มีสัตว์เลี้ยง", en: "No pets", de: "Keine Haustiere", aliases: ["no pets", "no_pet", "no_pets"] },
  ],
  drink: [
    { value: "never", th: "ไม่ดื่ม", en: "Never", de: "Nie" },
    { value: "rarely", th: "ดื่มเล็กน้อย", en: "Rarely", de: "Selten" },
    { value: "special_occasions", th: "ดื่มตามโอกาสพิเศษ", en: "Special occasions", de: "Besondere Anlässe", aliases: ["special occasion", "special occasions"] },
    { value: "weekends", th: "ดื่มช่วงวันหยุด", en: "Weekends", de: "Am Wochenende", aliases: ["weekend", "weekends"] },
    { value: "regularly", th: "ดื่มเป็นประจำ", en: "Regularly", de: "Regelmäßig" },
  ],
  smoke: [
    { value: "never", th: "ไม่สูบ", en: "Never", de: "Nie" },
    { value: "sometimes", th: "สูบบางครั้ง", en: "Sometimes", de: "Manchmal" },
    { value: "regularly", th: "สูบเป็นประจำ", en: "Regularly", de: "Regelmäßig" },
    { value: "quitting", th: "กำลังเลิก", en: "Quitting", de: "Höre gerade auf" },
  ],
  exercise: [
    { value: "rarely", th: "ไม่ค่อยออก", en: "Rarely", de: "Selten" },
    { value: "1_2_times_week", th: "สัปดาห์ละ 1–2 ครั้ง", en: "1–2 times/week", de: "1–2× pro Woche", aliases: ["1-2 times/week", "1–2 times/week", "1_2_times_week"] },
    { value: "3_4_times_week", th: "สัปดาห์ละ 3–4 ครั้ง", en: "3–4 times/week", de: "3–4× pro Woche", aliases: ["3-4 times/week", "3–4 times/week", "3_4_times_week"] },
    { value: "almost_daily", th: "เกือบทุกวัน", en: "Almost daily", de: "Fast täglich", aliases: ["almost daily", "almost_daily"] },
  ],
  social: [
    { value: "introvert", th: "Introvert", en: "Introvert", de: "Introvertiert" },
    { value: "ambivert", th: "Ambivert", en: "Ambivert", de: "Ambivertiert" },
    { value: "extrovert", th: "Extrovert", en: "Extrovert", de: "Extrovertiert" },
  ],
  interests: [
    { value: "coffee", th: "Coffee", en: "Coffee", de: "Kaffee" },
    { value: "travel", th: "Travel", en: "Travel", de: "Reisen" },
    { value: "fitness", th: "Fitness", en: "Fitness", de: "Fitness" },
    { value: "foodie", th: "Foodie", en: "Foodie", de: "Foodie" },
    { value: "music", th: "Music", en: "Music", de: "Musik" },
    { value: "pets", th: "Pets", en: "Pets", de: "Haustiere" },
    { value: "art", th: "Art", en: "Art", de: "Kunst" },
    { value: "beach", th: "Beach", en: "Beach", de: "Strand" },
  ],
};

function norm(value: unknown) {
  return String(value ?? "").trim().toLocaleLowerCase();
}

export function canonicalLifestyleValue(category: LifestyleCategory, raw: unknown): string | null {
  const needle = norm(raw);
  if (!needle) return null;
  for (const option of LIFESTYLE_OPTIONS[category]) {
    const candidates = [option.value, option.th, option.en, option.de, ...(option.aliases ?? [])];
    if (candidates.some((candidate) => norm(candidate) === needle)) return option.value;
  }
  return null;
}

export function normalizeLifestyleArray(category: LifestyleCategory, raw: unknown): string[] {
  const values = Array.isArray(raw) ? raw : raw == null ? [] : [raw];
  const out: string[] = [];
  for (const value of values) {
    const canonical = canonicalLifestyleValue(category, value);
    if (canonical && !out.includes(canonical)) out.push(canonical);
  }
  return out;
}

export function normalizeLifestylePreferences(raw: unknown): Record<string, string[]> {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  const pets = normalizeLifestyleArray("pets", [
    ...(Array.isArray(source.pets) ? source.pets : []),
    ...(Array.isArray(source.pet) ? source.pet : []),
  ]);
  return {
    pets,
    drink: normalizeLifestyleArray("drink", source.drink),
    smoke: normalizeLifestyleArray("smoke", source.smoke),
    exercise: normalizeLifestyleArray("exercise", source.exercise),
    social: normalizeLifestyleArray("social", source.social),
    interests: normalizeLifestyleArray("interests", source.interests),
  };
}

export function lifestyleOptions(category: LifestyleCategory, locale: LifestyleLocale) {
  return LIFESTYLE_OPTIONS[category].map((option) => ({ value: option.value, label: option[locale] }));
}

export function lifestyleLabel(category: LifestyleCategory, raw: unknown, locale: LifestyleLocale): string | null {
  const canonical = canonicalLifestyleValue(category, raw);
  if (!canonical) return null;
  const option = LIFESTYLE_OPTIONS[category].find((item) => item.value === canonical);
  return option ? option[locale] : null;
}
