export const ENGLISH_NAME_MAX_LENGTH = 80;

export function normalizeEnglishNameInput(value: string) {
  return value
    .toUpperCase()
    .replace(/[^A-Z '\-]/g, '')
    .replace(/\s{2,}/g, ' ')
    .slice(0, ENGLISH_NAME_MAX_LENGTH);
}

export function normalizeEnglishName(value: string) {
  return normalizeEnglishNameInput(value).trim().replace(/\s+/g, ' ');
}

export function isValidEnglishName(value: string) {
  const normalized = normalizeEnglishName(value);
  return Boolean(normalized) && /^[A-Z]+(?:[ '\-][A-Z]+)*$/.test(normalized);
}

export function normalizeDocumentNumberInput(value: string, documentType: string, issuingCountry: string) {
  if (documentType === 'national_id' && isThaiIssuingCountry(issuingCountry)) {
    return value.replace(/\D/g, '').slice(0, 13);
  }
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9\-\/ ]/g, '')
    .replace(/\s{2,}/g, ' ')
    .slice(0, 64);
}

export function isThaiIssuingCountry(value: string) {
  const normalized = value.trim().toLowerCase();
  return normalized === 'thai' || normalized === 'thailand' || normalized === 'th' || normalized === 'ประเทศไทย';
}

export function isValidThaiNationalId(value: string) {
  const digits = value.replace(/\D/g, '');
  if (!/^\d{13}$/.test(digits)) return false;
  let sum = 0;
  for (let index = 0; index < 12; index += 1) {
    sum += Number(digits[index]) * (13 - index);
  }
  const checkDigit = (11 - (sum % 11)) % 10;
  return checkDigit === Number(digits[12]);
}
