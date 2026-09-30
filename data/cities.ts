// MELO_CITY_EDUCATION_MULTISELECT_FIX_V1
import {
  findCountryByValue,
  findRegionByValue,
  getRegionDisplayName,
  type LocalizedLocationOption,
} from '@/data/locations';

type CitySeed = {
  value: string;
  th: string;
  en: string;
};

function option(code: string, city: CitySeed): LocalizedLocationOption {
  return {
    code,
    value: city.value,
    th: city.th,
    en: city.en,
  };
}

const CITIES_BY_REGION: Record<string, CitySeed[]> = {
  'TH|Krung Thep Maha Nakhon': [
    { value: 'Bang Kapi', th: 'บางกะปิ', en: 'Bang Kapi' },
    { value: 'Bang Khae', th: 'บางแค', en: 'Bang Khae' },
    { value: 'Bang Khun Thian', th: 'บางขุนเทียน', en: 'Bang Khun Thian' },
    { value: 'Bang Na', th: 'บางนา', en: 'Bang Na' },
    { value: 'Bang Rak', th: 'บางรัก', en: 'Bang Rak' },
    { value: 'Bangkok Noi', th: 'บางกอกน้อย', en: 'Bangkok Noi' },
    { value: 'Bangkok Yai', th: 'บางกอกใหญ่', en: 'Bangkok Yai' },
    { value: 'Chatuchak', th: 'จตุจักร', en: 'Chatuchak' },
    { value: 'Din Daeng', th: 'ดินแดง', en: 'Din Daeng' },
    { value: 'Don Mueang', th: 'ดอนเมือง', en: 'Don Mueang' },
    { value: 'Huai Khwang', th: 'ห้วยขวาง', en: 'Huai Khwang' },
    { value: 'Khlong Toei', th: 'คลองเตย', en: 'Khlong Toei' },
    { value: 'Lak Si', th: 'หลักสี่', en: 'Lak Si' },
    { value: 'Lat Krabang', th: 'ลาดกระบัง', en: 'Lat Krabang' },
    { value: 'Lat Phrao', th: 'ลาดพร้าว', en: 'Lat Phrao' },
    { value: 'Pathum Wan', th: 'ปทุมวัน', en: 'Pathum Wan' },
    { value: 'Phaya Thai', th: 'พญาไท', en: 'Phaya Thai' },
    { value: 'Phra Khanong', th: 'พระโขนง', en: 'Phra Khanong' },
    { value: 'Prawet', th: 'ประเวศ', en: 'Prawet' },
    { value: 'Ratchathewi', th: 'ราชเทวี', en: 'Ratchathewi' },
    { value: 'Sathon', th: 'สาทร', en: 'Sathon' },
    { value: 'Suan Luang', th: 'สวนหลวง', en: 'Suan Luang' },
    { value: 'Watthana', th: 'วัฒนา', en: 'Watthana' },
    { value: 'Yan Nawa', th: 'ยานนาวา', en: 'Yan Nawa' },
  ],
  'TH|Nonthaburi': [
    { value: 'Mueang Nonthaburi', th: 'เมืองนนทบุรี', en: 'Mueang Nonthaburi' },
    { value: 'Pak Kret', th: 'ปากเกร็ด', en: 'Pak Kret' },
    { value: 'Bang Bua Thong', th: 'บางบัวทอง', en: 'Bang Bua Thong' },
    { value: 'Bang Kruai', th: 'บางกรวย', en: 'Bang Kruai' },
    { value: 'Bang Yai', th: 'บางใหญ่', en: 'Bang Yai' },
    { value: 'Sai Noi', th: 'ไทรน้อย', en: 'Sai Noi' },
  ],
  'TH|Pathum Thani': [
    { value: 'Mueang Pathum Thani', th: 'เมืองปทุมธานี', en: 'Mueang Pathum Thani' },
    { value: 'Khlong Luang', th: 'คลองหลวง', en: 'Khlong Luang' },
    { value: 'Thanyaburi', th: 'ธัญบุรี', en: 'Thanyaburi' },
    { value: 'Lam Luk Ka', th: 'ลำลูกกา', en: 'Lam Luk Ka' },
    { value: 'Lat Lum Kaeo', th: 'ลาดหลุมแก้ว', en: 'Lat Lum Kaeo' },
    { value: 'Nong Suea', th: 'หนองเสือ', en: 'Nong Suea' },
    { value: 'Sam Khok', th: 'สามโคก', en: 'Sam Khok' },
  ],
  'TH|Samut Prakan': [
    { value: 'Mueang Samut Prakan', th: 'เมืองสมุทรปราการ', en: 'Mueang Samut Prakan' },
    { value: 'Bang Bo', th: 'บางบ่อ', en: 'Bang Bo' },
    { value: 'Bang Phli', th: 'บางพลี', en: 'Bang Phli' },
    { value: 'Bang Sao Thong', th: 'บางเสาธง', en: 'Bang Sao Thong' },
    { value: 'Phra Pradaeng', th: 'พระประแดง', en: 'Phra Pradaeng' },
    { value: 'Phra Samut Chedi', th: 'พระสมุทรเจดีย์', en: 'Phra Samut Chedi' },
  ],
  'TH|Chiang Mai': [
    { value: 'Mueang Chiang Mai', th: 'เมืองเชียงใหม่', en: 'Mueang Chiang Mai' },
    { value: 'Hang Dong', th: 'หางดง', en: 'Hang Dong' },
    { value: 'Mae Rim', th: 'แม่ริม', en: 'Mae Rim' },
    { value: 'San Kamphaeng', th: 'สันกำแพง', en: 'San Kamphaeng' },
    { value: 'San Sai', th: 'สันทราย', en: 'San Sai' },
    { value: 'Doi Saket', th: 'ดอยสะเก็ด', en: 'Doi Saket' },
    { value: 'Saraphi', th: 'สารภี', en: 'Saraphi' },
  ],
  'TH|Chon Buri': [
    { value: 'Mueang Chon Buri', th: 'เมืองชลบุรี', en: 'Mueang Chon Buri' },
    { value: 'Pattaya', th: 'พัทยา', en: 'Pattaya' },
    { value: 'Bang Lamung', th: 'บางละมุง', en: 'Bang Lamung' },
    { value: 'Si Racha', th: 'ศรีราชา', en: 'Si Racha' },
    { value: 'Sattahip', th: 'สัตหีบ', en: 'Sattahip' },
    { value: 'Phanat Nikhom', th: 'พนัสนิคม', en: 'Phanat Nikhom' },
  ],
  'TH|Phuket': [
    { value: 'Mueang Phuket', th: 'เมืองภูเก็ต', en: 'Mueang Phuket' },
    { value: 'Kathu', th: 'กะทู้', en: 'Kathu' },
    { value: 'Thalang', th: 'ถลาง', en: 'Thalang' },
  ],
  'US|California': [
    { value: 'Los Angeles', th: 'ลอสแอนเจลิส', en: 'Los Angeles' },
    { value: 'San Francisco', th: 'ซานฟรานซิสโก', en: 'San Francisco' },
    { value: 'San Diego', th: 'ซานดิเอโก', en: 'San Diego' },
    { value: 'San Jose', th: 'ซานโฮเซ', en: 'San Jose' },
    { value: 'Sacramento', th: 'แซคราเมนโต', en: 'Sacramento' },
  ],
  'US|New York': [
    { value: 'New York City', th: 'นครนิวยอร์ก', en: 'New York City' },
    { value: 'Buffalo', th: 'บัฟฟาโล', en: 'Buffalo' },
    { value: 'Rochester', th: 'โรเชสเตอร์', en: 'Rochester' },
    { value: 'Albany', th: 'ออลบานี', en: 'Albany' },
  ],
  'JP|Tokyo': [
    { value: 'Shinjuku', th: 'ชินจูกุ', en: 'Shinjuku' },
    { value: 'Shibuya', th: 'ชิบูยะ', en: 'Shibuya' },
    { value: 'Minato', th: 'มินาโตะ', en: 'Minato' },
    { value: 'Setagaya', th: 'เซตากายะ', en: 'Setagaya' },
    { value: 'Chiyoda', th: 'ชิโยดะ', en: 'Chiyoda' },
  ],
};

export function getCityOptions(
  countryValue: string,
  provinceValue: string,
): LocalizedLocationOption[] {
  const country = findCountryByValue(countryValue);
  const province = findRegionByValue(countryValue, provinceValue);

  if (!country || !provinceValue.trim()) return [];

  const regionValue = province?.value ?? provinceValue.trim();
  const key = `${country.code}|${regionValue}`;
  const exact = CITIES_BY_REGION[key] ?? [];

  if (exact.length > 0) {
    return exact.map((city, index) => option(`${country.code}-${province?.code ?? 'REG'}-${index + 1}`, city));
  }

  const localizedProvinceTh = getRegionDisplayName(countryValue, regionValue, 'th');
  const localizedProvinceEn = getRegionDisplayName(countryValue, regionValue, 'en');

  if (country.code === 'TH') {
    return [
      option(`${country.code}-${province?.code ?? 'REG'}-MUEANG`, {
        value: `Mueang ${regionValue}`,
        th: `อำเภอเมือง${localizedProvinceTh}`,
        en: `Mueang ${localizedProvinceEn}`,
      }),
    ];
  }

  return [
    option(`${country.code}-${province?.code ?? 'REG'}-CENTRE`, {
      value: regionValue,
      th: localizedProvinceTh,
      en: localizedProvinceEn,
    }),
  ];
}
