'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocale } from '@/components/SiteProviders';
import { resolveCommerceMedia } from '@/components/commerce/commerceMedia';
import PlaceSearchInput, { type PlaceSearchResult } from '@/components/location/PlaceSearchInput';
import PartnerModeHeader from './PartnerModeHeader';
import {
  EMPTY_PARTNER_BUSINESS_PROFILE_EXTRAS,
  EMPTY_PARTNER_BUSINESS_VERIFICATION_DETAILS,
  getActivePartnerBusiness,
  getPartnerBusiness,
  getPartnerBusinessProfileExtras,
  getPartnerBusinessVerificationDetails,
  listPartnerNearbyPlaces,
  markPartnerBusinessMaterialChange,
  savePartnerBusinessProfileExtras,
  savePartnerBusinessVerificationDetails,
  setActivePartnerBusiness,
  setPartnerBusinessLocation,
  saveMyBusinessAccountDraft,
  uploadPartnerBusinessMedia,
  uploadPartnerBusinessVerificationDocument,
  type PartnerBusinessAccess,
  type PartnerBusinessOpeningDay,
  type PartnerBusinessProfileExtras,
  type PartnerServiceMode,
  type PartnerBusinessVerificationDetails,
  type PartnerNearbyPlace,
} from './partnerModeWeb';
import partnerStyles from './PartnerMode.module.css';
import styles from './PartnerStoreEdit.module.css';

type Row = Record<string, unknown>;
type Locale = 'th' | 'en' | 'de' | 'zh' | 'ja' | 'ko';
type MediaKind = 'logo' | 'cover';
type DocumentKind = 'registration' | 'tax';

type FormState = {
  businessType: string;
  legalName: string;
  displayName: string;
  description: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  primaryLanguage: string;
  partnershipModes: string[];
  latitude: number | null;
  longitude: number | null;
};

const EMPTY_FORM: FormState = {
  businessType: 'food_drink',
  legalName: '',
  displayName: '',
  description: '',
  address: '',
  city: '',
  country: 'Thailand',
  phone: '',
  email: '',
  website: '',
  primaryLanguage: 'th',
  partnershipModes: [],
  latitude: null,
  longitude: null,
};

const NEARBY_PREFIX = 'ใกล้ ';
const PET_FRIENDLY_VALUE = 'รองรับสัตว์เลี้ยง';
const NO_PETS_VALUE = 'ไม่รองรับสัตว์เลี้ยง';

const APP_LANGUAGES = [
  ['th', 'ไทย'],
  ['en', 'English'],
  ['de', 'Deutsch'],
  ['zh', '中文'],
  ['ja', '日本語'],
  ['ko', '한국어'],
] as const;

const CATEGORIES = [
  ['accommodation', { th: 'ที่พัก', en: 'Accommodation', de: 'Unterkunft', zh: '住宿', ja: '宿泊', ko: '숙박' }],
  ['food_drink', { th: 'อาหารและเครื่องดื่ม', en: 'Food & Drink', de: 'Essen & Trinken', zh: '餐饮', ja: '飲食', ko: '음식 및 음료' }],
  ['tours_guides', { th: 'ทัวร์และไกด์', en: 'Tours & Guides', de: 'Touren & Guides', zh: '旅游与导游', ja: 'ツアー・ガイド', ko: '투어 및 가이드' }],
  ['transport_rental', { th: 'การเดินทางและรถเช่า', en: 'Transport & Rental', de: 'Transport & Vermietung', zh: '交通与租赁', ja: '交通・レンタル', ko: '교통 및 렌탈' }],
  ['activities_experiences', { th: 'กิจกรรมและประสบการณ์', en: 'Activities & Experiences', de: 'Aktivitäten & Erlebnisse', zh: '活动与体验', ja: 'アクティビティ・体験', ko: '액티비티 및 체험' }],
  ['sports_outdoor', { th: 'กีฬาและ Outdoor', en: 'Sports & Outdoor', de: 'Sport & Outdoor', zh: '运动与户外', ja: 'スポーツ・アウトドア', ko: '스포츠 및 아웃도어' }],
  ['attractions', { th: 'สถานที่ท่องเที่ยว', en: 'Attractions', de: 'Sehenswürdigkeiten', zh: '景点', ja: '観光スポット', ko: '관광 명소' }],
  ['events_entertainment', { th: 'อีเวนต์และความบันเทิง', en: 'Events & Entertainment', de: 'Events & Unterhaltung', zh: '活动与娱乐', ja: 'イベント・エンタメ', ko: '이벤트 및 엔터테인먼트' }],
  ['wellness_lifestyle', { th: 'Wellness & Lifestyle', en: 'Wellness & Lifestyle', de: 'Wellness & Lifestyle', zh: '健康与生活方式', ja: 'ウェルネス・ライフスタイル', ko: '웰니스 및 라이프스타일' }],
  ['shopping_equipment', { th: 'ร้านค้าและเช่าอุปกรณ์', en: 'Shopping & Equipment Rental', de: 'Shopping & Ausrüstungsverleih', zh: '购物与设备租赁', ja: 'ショッピング・用品レンタル', ko: '쇼핑 및 장비 대여' }],
  ['traveler_services', { th: 'บริการนักท่องเที่ยว', en: 'Traveler Services', de: 'Reiseservices', zh: '旅行者服务', ja: '旅行者向けサービス', ko: '여행자 서비스' }],
  ['local_other', { th: 'ธุรกิจท้องถิ่นและอื่น ๆ', en: 'Local Business & Others', de: 'Lokales & Sonstiges', zh: '本地商家及其他', ja: 'ローカルビジネス・その他', ko: '지역 비즈니스 및 기타' }],
] as const;

const PARTNERSHIPS = [
  ['accommodation', { th: 'ที่พักสำหรับทริป', en: 'Trip accommodation', de: 'Unterkunft für Trips', zh: '行程住宿', ja: '旅行向け宿泊', ko: '여행 숙박' }],
  ['transport', { th: 'รถเช่า / รับส่ง', en: 'Rental / transfer', de: 'Miete / Transfer', zh: '租车 / 接送', ja: 'レンタル / 送迎', ko: '렌탈 / 픽업' }],
  ['tour', { th: 'ทัวร์ / Local Experience', en: 'Tour / Local Experience', de: 'Tour / Lokales Erlebnis', zh: '旅游 / 本地体验', ja: 'ツアー / ローカル体験', ko: '투어 / 로컬 체험' }],
  ['venue', { th: 'สถานที่จัด Event', en: 'Event venue', de: 'Event-Location', zh: '活动场地', ja: 'イベント会場', ko: '이벤트 장소' }],
  ['sponsorship', { th: 'สนับสนุนกิจกรรม', en: 'Activity sponsorship', de: 'Aktivitäts-Sponsoring', zh: '活动赞助', ja: 'イベント協賛', ko: '활동 후원' }],
] as const;

const SERVICE_MODES: Array<[PartnerServiceMode, Record<Locale, string>]> = [
  ['storefront', { th: 'มีหน้าร้าน', en: 'Storefront', de: 'Vor Ort', zh: '实体门店', ja: '実店舗', ko: '매장 운영' }],
  ['on_site', { th: 'ให้บริการนอกสถานที่', en: 'On-site service', de: 'Vor-Ort-Service', zh: '上门服务', ja: '出張サービス', ko: '출장 서비스' }],
  ['online', { th: 'ออนไลน์', en: 'Online', de: 'Online', zh: '在线', ja: 'オンライン', ko: '온라인' }],
  ['multi_area', { th: 'หลายพื้นที่', en: 'Multiple areas', de: 'Mehrere Gebiete', zh: '多个区域', ja: '複数エリア', ko: '여러 지역' }],
];

type RawSubtypeOption = [string, string, string, string, string, string, string];
const BUSINESS_SUBTYPES: Partial<Record<string, RawSubtypeOption[]>> = {
  accommodation: [
    ['hotel', 'โรงแรม', 'Hotel', 'Hotel', '酒店', 'ホテル', '호텔'],
    ['resort', 'รีสอร์ต', 'Resort', 'Resort', '度假村', 'リゾート', '리조트'],
    ['hostel', 'โฮสเทล', 'Hostel', 'Hostel', '青年旅舍', 'ホステル', '호스텔'],
    ['villa', 'วิลล่า', 'Villa', 'Villa', '别墅', 'ヴィラ', '빌라'],
    ['boutique_hotel', 'Boutique Hotel', 'Boutique Hotel', 'Boutique-Hotel', '精品酒店', 'ブティックホテル', '부티크 호텔'],
  ],
  food_drink: [
    ['restaurant', 'ร้านอาหาร', 'Restaurant', 'Restaurant', '餐厅', 'レストラン', '레스토랑'],
    ['cafe', 'คาเฟ่', 'Cafe', 'Café', '咖啡馆', 'カフェ', '카페'],
    ['bar', 'บาร์', 'Bar', 'Bar', '酒吧', 'バー', '바'],
    ['bakery', 'เบเกอรี่', 'Bakery', 'Bäckerei', '烘焙店', 'ベーカリー', '베이커리'],
    ['catering', 'จัดเลี้ยง', 'Catering', 'Catering', '餐饮服务', 'ケータリング', '케이터링'],
  ],
  tours_guides: [
    ['tour_operator', 'บริษัททัวร์', 'Tour operator', 'Reiseveranstalter', '旅行社', 'ツアーオペレーター', '투어 운영사'],
    ['local_guide', 'ไกด์ท้องถิ่น', 'Local guide', 'Lokaler Guide', '当地导游', 'ローカルガイド', '로컬 가이드'],
    ['travel_agency', 'ตัวแทนท่องเที่ยว', 'Travel agency', 'Reisebüro', '旅行代理', '旅行代理店', '여행사'],
  ],
  transport_rental: [
    ['car_rental', 'รถเช่า', 'Car rental', 'Autovermietung', '租车', 'レンタカー', '렌터카'],
    ['transfer', 'รถรับส่ง', 'Transfer', 'Transfer', '接送', '送迎', '픽업/샌딩'],
    ['private_driver', 'รถพร้อมคนขับ', 'Private driver', 'Privatfahrer', '私人司机', '専用ドライバー', '전용 기사'],
    ['shuttle', 'Shuttle', 'Shuttle', 'Shuttle', '班车', 'シャトル', '셔틀'],
  ],
  activities_experiences: [
    ['activity_provider', 'ผู้ให้บริการกิจกรรม', 'Activity provider', 'Aktivitätsanbieter', '活动服务商', 'アクティビティ事業者', '액티비티 제공자'],
    ['experience_provider', 'ผู้ให้บริการประสบการณ์', 'Experience provider', 'Erlebnisanbieter', '体验服务商', '体験事業者', '체험 제공자'],
    ['workshop', 'เวิร์กช็อป', 'Workshop', 'Workshop', '工作坊', 'ワークショップ', '워크숍'],
  ],
  sports_outdoor: [
    ['sports_center', 'ศูนย์กีฬา', 'Sports center', 'Sportzentrum', '体育中心', 'スポーツセンター', '스포츠 센터'],
    ['outdoor_operator', 'กิจกรรม Outdoor', 'Outdoor operator', 'Outdoor-Anbieter', '户外活动服务商', 'アウトドア事業者', '아웃도어 운영사'],
    ['equipment_rental', 'เช่าอุปกรณ์', 'Equipment rental', 'Ausrüstungsverleih', '设备租赁', '用品レンタル', '장비 대여'],
  ],
  attractions: [
    ['attraction', 'สถานที่ท่องเที่ยว', 'Attraction', 'Attraktion', '景点', '観光スポット', '관광 명소'],
    ['museum', 'พิพิธภัณฑ์', 'Museum', 'Museum', '博物馆', '博物館', '박물관'],
    ['park', 'สวน / พื้นที่ท่องเที่ยว', 'Park', 'Park', '公园', '公園', '공원'],
  ],
  events_entertainment: [
    ['event_venue', 'สถานที่จัดงาน', 'Event venue', 'Event-Location', '活动场地', 'イベント会場', '이벤트 장소'],
    ['entertainment_venue', 'สถานบันเทิง', 'Entertainment venue', 'Unterhaltungsort', '娱乐场所', 'エンタメ施設', '엔터테인먼트 장소'],
    ['organizer', 'ผู้จัดงาน', 'Organizer', 'Veranstalter', '活动主办方', '主催者', '주최자'],
  ],
  wellness_lifestyle: [
    ['spa', 'สปา', 'Spa', 'Spa', '水疗', 'スパ', '스파'],
    ['massage', 'นวด', 'Massage', 'Massage', '按摩', 'マッサージ', '마사지'],
    ['wellness', 'Wellness', 'Wellness', 'Wellness', '康养', 'ウェルネス', '웰니스'],
    ['fitness', 'ฟิตเนส', 'Fitness', 'Fitness', '健身', 'フィットネス', '피트니스'],
  ],
  shopping_equipment: [
    ['retail', 'ร้านค้าปลีก', 'Retail', 'Einzelhandel', '零售', '小売', '소매'],
    ['equipment_rental', 'เช่าอุปกรณ์', 'Equipment rental', 'Ausrüstungsverleih', '设备租赁', '用品レンタル', '장비 대여'],
    ['local_product', 'สินค้าท้องถิ่น', 'Local products', 'Lokale Produkte', '本地商品', 'ローカル商品', '지역 상품'],
  ],
  traveler_services: [
    ['luggage', 'รับฝากสัมภาระ', 'Luggage service', 'Gepäckservice', '行李服务', '荷物サービス', '수하물 서비스'],
    ['laundry', 'ซักรีด', 'Laundry', 'Wäscherei', '洗衣', 'ランドリー', '세탁'],
    ['travel_assistance', 'บริการช่วยเหลือนักท่องเที่ยว', 'Travel assistance', 'Reiseassistenz', '旅行协助', '旅行サポート', '여행 지원'],
    ['sim_esim', 'SIM / eSIM', 'SIM / eSIM', 'SIM / eSIM', 'SIM / eSIM', 'SIM / eSIM', 'SIM / eSIM'],
  ],
  local_other: [
    ['local_service', 'บริการท้องถิ่น', 'Local service', 'Lokaler Service', '本地服务', 'ローカルサービス', '지역 서비스'],
    ['professional_service', 'บริการวิชาชีพ', 'Professional service', 'Professioneller Service', '专业服务', '専門サービス', '전문 서비스'],
    ['other', 'อื่น ๆ', 'Other', 'Sonstiges', '其他', 'その他', '기타'],
  ],
};

const ALIGNMENT_COPY: Record<Locale, {
  subtype: string;
  extraCapabilities: string;
  extraCapabilitiesHint: string;
  collaboration: string;
  collaborationHint: string;
  memberProgram: string;
  memberManaged: string;
  memberLegacyActive: string;
  memberNotEnrolled: string;
  serviceModes: string;
  serviceAreas: string;
  serviceAreasPlaceholder: string;
  serviceRadius: string;
  serviceRadiusHint: string;
  bookingDefaultHint: string;
}> = {
  th: { subtype: 'ประเภทย่อยของธุรกิจ', extraCapabilities: 'บริการ/ความสามารถเพิ่มเติมของธุรกิจ', extraCapabilitiesHint: 'ใช้แสดงในโปรไฟล์และช่วยค้นหาร้านเท่านั้น ไม่ใช้เป็นหมวดสินค้า/ดีล', collaboration: 'ความร่วมมือกับ Melo', collaborationHint: 'เลือกเฉพาะความสามารถด้าน Trip / Event / Partnership ไม่ใช่โปรโมชั่น', memberProgram: 'โปรแกรมสิทธิ์สมาชิก Melo', memberManaged: 'สิทธิ์สมาชิกจัดการโดย Melo/Admin Campaign ร้านค้าไม่สามารถสร้างส่วนลดสมาชิกเองจากหน้านี้ได้', memberLegacyActive: 'พบสถานะสิทธิ์สมาชิกเดิม — ระบบจะเก็บข้อมูลเดิมไว้และให้ Melo/Admin เป็นผู้จัดการ', memberNotEnrolled: 'ยังไม่พบสถานะเข้าร่วมโปรแกรมจากข้อมูลเดิม', serviceModes: 'รูปแบบพื้นที่ให้บริการ', serviceAreas: 'จังหวัด / พื้นที่ที่ให้บริการ', serviceAreasPlaceholder: 'เช่น เชียงใหม่, ลำพูน, เชียงราย', serviceRadius: 'รัศมีให้บริการ (กม.)', serviceRadiusHint: 'เว้นว่างได้ หากธุรกิจไม่ได้ให้บริการตามรัศมี', bookingDefaultHint: 'นี่คือค่าเริ่มต้นของร้าน สินค้า/บริการแต่ละรายการสามารถกำหนด Action ของตัวเองได้' },
  en: { subtype: 'Business subtype', extraCapabilities: 'Additional business services / capabilities', extraCapabilitiesHint: 'Used for the Partner profile and discovery only. It does not create a Product or Deal category.', collaboration: 'Melo collaboration', collaborationHint: 'Select Trip / Event / partnership capabilities only, not promotions.', memberProgram: 'Melo Member benefits program', memberManaged: 'Member benefits are controlled by Melo/Admin campaigns. Partners cannot create a member discount from this page.', memberLegacyActive: 'A legacy member-benefit status was found. It is preserved and managed by Melo/Admin.', memberNotEnrolled: 'No legacy program enrollment status was found.', serviceModes: 'Service mode', serviceAreas: 'Service provinces / areas', serviceAreasPlaceholder: 'e.g. Chiang Mai, Lamphun, Chiang Rai', serviceRadius: 'Service radius (km)', serviceRadiusHint: 'Optional when the business is not radius-based.', bookingDefaultHint: 'This is the store default. Each Product/Service may override its own action.' },
  de: { subtype: 'Geschäfts-Untertyp', extraCapabilities: 'Zusätzliche Leistungen / Fähigkeiten', extraCapabilitiesHint: 'Nur für Partnerprofil und Suche. Daraus wird keine Produkt- oder Deal-Kategorie erstellt.', collaboration: 'Zusammenarbeit mit Melo', collaborationHint: 'Nur Trip-/Event-/Partnerschaftsfähigkeiten auswählen, keine Aktionen.', memberProgram: 'Melo-Mitgliedervorteilsprogramm', memberManaged: 'Mitgliedervorteile werden durch Melo/Admin-Kampagnen verwaltet. Partner können hier keinen Mitgliederrabatt erstellen.', memberLegacyActive: 'Ein alter Mitgliedervorteilsstatus wurde gefunden. Er bleibt erhalten und wird von Melo/Admin verwaltet.', memberNotEnrolled: 'Kein alter Programmstatus gefunden.', serviceModes: 'Servicemodus', serviceAreas: 'Service-Provinzen / Gebiete', serviceAreasPlaceholder: 'z. B. Chiang Mai, Lamphun, Chiang Rai', serviceRadius: 'Serviceradius (km)', serviceRadiusHint: 'Optional, wenn der Service nicht radiusbasiert ist.', bookingDefaultHint: 'Dies ist der Standard des Geschäfts. Jedes Produkt/jede Dienstleistung kann die Aktion überschreiben.' },
  zh: { subtype: '业务子类型', extraCapabilities: '其他业务服务 / 能力', extraCapabilitiesHint: '仅用于 Partner 资料与发现，不会自动创建商品或优惠分类。', collaboration: '与 Melo 的合作', collaborationHint: '仅选择 Trip / Event / 合作能力，不作为促销类型。', memberProgram: 'Melo 会员权益计划', memberManaged: '会员权益由 Melo/Admin 活动统一管理，商家不能在此页面自行创建会员折扣。', memberLegacyActive: '检测到旧版会员权益状态。系统会保留该数据，并交由 Melo/Admin 管理。', memberNotEnrolled: '未检测到旧版计划加入状态。', serviceModes: '服务模式', serviceAreas: '服务省份 / 区域', serviceAreasPlaceholder: '例如：清迈、南奔、清莱', serviceRadius: '服务半径（公里）', serviceRadiusHint: '若业务不按半径服务，可留空。', bookingDefaultHint: '这是店铺默认设置，每个商品/服务可单独覆盖其操作方式。' },
  ja: { subtype: '事業サブタイプ', extraCapabilities: '追加サービス / 事業能力', extraCapabilitiesHint: 'Partnerプロフィールと検索のみに使用し、商品・Dealカテゴリーは自動作成しません。', collaboration: 'Meloとの連携', collaborationHint: 'Trip / Event / パートナー連携能力のみを選択し、プロモーションには使用しません。', memberProgram: 'Melo会員特典プログラム', memberManaged: '会員特典はMelo/Adminキャンペーンで管理されます。この画面から会員割引を作成することはできません。', memberLegacyActive: '旧会員特典ステータスが見つかりました。データは保持され、Melo/Adminが管理します。', memberNotEnrolled: '旧プログラム参加ステータスは見つかりませんでした。', serviceModes: 'サービス形態', serviceAreas: '対応都道府県 / エリア', serviceAreasPlaceholder: '例：チェンマイ、ランプーン、チェンライ', serviceRadius: '対応半径（km）', serviceRadiusHint: '半径指定が不要な事業は空欄にできます。', bookingDefaultHint: '店舗のデフォルト設定です。各商品/サービスで個別のActionを上書きできます。' },
  ko: { subtype: '비즈니스 하위 유형', extraCapabilities: '추가 비즈니스 서비스 / 역량', extraCapabilitiesHint: 'Partner 프로필과 검색에만 사용되며 상품/딜 카테고리를 자동 생성하지 않습니다.', collaboration: 'Melo 협업', collaborationHint: 'Trip / Event / 파트너십 역량만 선택하며 프로모션 유형으로 사용하지 않습니다.', memberProgram: 'Melo 회원 혜택 프로그램', memberManaged: '회원 혜택은 Melo/Admin 캠페인에서 관리합니다. 이 화면에서 파트너가 회원 할인을 직접 만들 수 없습니다.', memberLegacyActive: '기존 회원 혜택 상태가 감지되었습니다. 데이터는 유지되며 Melo/Admin이 관리합니다.', memberNotEnrolled: '기존 프로그램 참여 상태가 없습니다.', serviceModes: '서비스 방식', serviceAreas: '서비스 지역 / 권역', serviceAreasPlaceholder: '예: 치앙마이, 람푼, 치앙라이', serviceRadius: '서비스 반경 (km)', serviceRadiusHint: '반경 기반 서비스가 아니면 비워둘 수 있습니다.', bookingDefaultHint: '매장 기본값입니다. 각 상품/서비스에서 자체 Action으로 덮어쓸 수 있습니다.' },
};

const DAYS: Array<[PartnerBusinessOpeningDay, Record<Locale, string>]> = [
  ['mon', { th: 'จันทร์', en: 'Monday', de: 'Montag', zh: '星期一', ja: '月曜日', ko: '월요일' }],
  ['tue', { th: 'อังคาร', en: 'Tuesday', de: 'Dienstag', zh: '星期二', ja: '火曜日', ko: '화요일' }],
  ['wed', { th: 'พุธ', en: 'Wednesday', de: 'Mittwoch', zh: '星期三', ja: '水曜日', ko: '수요일' }],
  ['thu', { th: 'พฤหัสบดี', en: 'Thursday', de: 'Donnerstag', zh: '星期四', ja: '木曜日', ko: '목요일' }],
  ['fri', { th: 'ศุกร์', en: 'Friday', de: 'Freitag', zh: '星期五', ja: '金曜日', ko: '금요일' }],
  ['sat', { th: 'เสาร์', en: 'Saturday', de: 'Samstag', zh: '星期六', ja: '土曜日', ko: '토요일' }],
  ['sun', { th: 'อาทิตย์', en: 'Sunday', de: 'Sonntag', zh: '星期日', ja: '日曜日', ko: '일요일' }],
];

const COPY = {
  th: {
    title: 'แก้ไขข้อมูลร้านค้า', subtitle: 'จัดการข้อมูลที่ลูกค้าเห็น ข้อมูลติดต่อ ตำแหน่ง เวลาเปิด และข้อมูลยืนยันธุรกิจ โดยอิงโครงสร้างเดียวกับแอป Android',
    save: 'บันทึกการเปลี่ยนแปลง', saving: 'กำลังบันทึก…', backStore: 'ดูหน้าร้าน', ownerOnly: 'เฉพาะ Owner เท่านั้นที่แก้ไขข้อมูลร้านและเอกสารยืนยันได้',
    media: 'รูปภาพร้านค้า', mediaHint: 'แตะปุ่มบนรูปโปรไฟล์เพื่อเปลี่ยนรูปโปรไฟล์ร้านค้า และใช้ปุ่มด้านขวาเพื่อเปลี่ยนรูปปก', changeCover: 'เปลี่ยนรูปปก', addCover: 'เพิ่มรูปปก', changeLogo: 'เปลี่ยนรูปโปรไฟล์', addLogo: 'เพิ่มรูปโปรไฟล์',
    basic: 'ข้อมูลธุรกิจ', basicHint: 'ข้อมูลหลักที่แสดงในหน้าร้านและใช้ประกอบการตรวจสอบ', businessType: 'ประเภทธุรกิจ', legalName: 'ชื่อจดทะเบียน', displayName: 'ชื่อที่แสดงใน Melo', description: 'เกี่ยวกับธุรกิจและบริการ',
    subcategory: 'ประเภทย่อย / คำอธิบายหมวด', secondaryCategories: 'หมวดเพิ่มเติม', partnerships: 'รูปแบบความร่วมมือ', serviceArea: 'พื้นที่ให้บริการ',
    contactLocation: 'ที่อยู่และช่องทางติดต่อ', searchPlace: 'ค้นหาที่อยู่ธุรกิจ', searchPlacePh: 'ค้นหาชื่อร้าน อาคาร ถนน เขต จังหวัด หรือสถานที่', search: 'ค้นหา', searchingPlaces: 'กำลังค้นหาสถานที่…', useLocation: 'ใช้ตำแหน่งปัจจุบัน',
    address: 'รายละเอียดที่อยู่', city: 'จังหวัด / เมือง', country: 'ประเทศ', coordinate: 'พิกัด Partner', phone: 'โทรศัพท์', email: 'อีเมล', website: 'เว็บไซต์ / Social Link',
    nearby: 'สถานที่ใกล้เคียง', nearbyHint: 'ค้นหาจุดสำคัญในรัศมีประมาณ 5 กม. และเลือกแสดงได้สูงสุด 6 แห่ง', findNearby: 'ค้นหาใกล้เคียง', savedNearby: 'สถานที่ใกล้เคียงที่บันทึกไว้', pet: 'รองรับสัตว์เลี้ยงไหม', petYes: 'รองรับสัตว์เลี้ยง', petNo: 'ไม่รองรับสัตว์เลี้ยง',
    service: 'การให้บริการ', serviceHint: 'ตั้งค่าภาษา เวลาเปิด และรูปแบบการรับจองของร้าน', serviceLanguages: 'ภาษาที่ให้บริการ', bookingMode: 'รูปแบบการรับจอง', bookingUrl: 'ลิงก์จองภายนอก', openingHours: 'เวลาเปิดทำการ', open: 'เปิด', closed: 'ปิด',
    socials: 'ช่องทางติดต่อเพิ่มเติม', line: 'LINE', facebook: 'Facebook', instagram: 'Instagram', whatsapp: 'WhatsApp',
    verification: 'ข้อมูลยืนยันธุรกิจ', verificationHint: 'ข้อมูลส่วนนี้เป็นข้อมูลส่วนตัวสำหรับ Owner และ Admin Review เท่านั้น', registration: 'เลขทะเบียนนิติบุคคล / ทะเบียนพาณิชย์', tax: 'เลขประจำตัวผู้เสียภาษี', verifierName: 'ผู้ติดต่อสำหรับการตรวจสอบ', verifierPhone: 'เบอร์ผู้ติดต่อ', registrationDoc: 'เอกสารทะเบียนธุรกิจ', taxDoc: 'เอกสารภาษี', attached: 'แนบเอกสารแล้ว ✓', chooseFile: 'เลือกไฟล์รูป',
    reviewNote: 'การแก้ไขข้อมูลสำคัญ เช่น ประเภทธุรกิจ ชื่อจดทะเบียน ประเทศ หรือเลขทะเบียน อาจเข้าสู่กระบวนการตรวจสอบอีกครั้งตามระบบ Android',
    success: 'บันทึกข้อมูลร้านค้าเรียบร้อยแล้ว', required: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบ', descriptionShort: 'รายละเอียดธุรกิจต้องมีอย่างน้อย 30 ตัวอักษร', partnershipRequired: 'กรุณาเลือกรูปแบบความร่วมมืออย่างน้อย 1 รายการ', verifierRequired: 'กรุณากรอกชื่อและเบอร์ผู้ติดต่อสำหรับการตรวจสอบ', imageOnly: 'รองรับไฟล์รูปภาพเท่านั้น', imageTooLarge: 'ไฟล์รูปต้องไม่เกิน 12 MB', maxNearby: 'เลือกสถานที่ใกล้เคียงได้สูงสุด 6 แห่ง', noNearby: 'ไม่พบสถานที่ใกล้เคียง', noPlaces: 'ไม่พบสถานที่จากคำค้น', loadFailed: 'โหลดข้อมูลร้านค้าไม่สำเร็จ', saveFailed: 'บันทึกข้อมูลร้านค้าไม่สำเร็จ', noAccess: 'ไม่พบบัญชี Partner ที่ใช้งานได้',
    bookingChat: 'สอบถามผ่านแชท', bookingRequest: 'ส่งคำขอจอง', bookingExternal: 'จองผ่านลิงก์ภายนอก', bookingWalkIn: 'Walk-in / หน้าร้าน', optional: 'ไม่บังคับ', status: 'สถานะร้าน', storeNo: 'ร้าน',
  },
  en: {
    title: 'Edit store information', subtitle: 'Manage customer-facing details, contact information, location, opening hours and business verification using the same structure as Android.',
    save: 'Save changes', saving: 'Saving…', backStore: 'View store', ownerOnly: 'Only the Owner can edit store information and verification documents.',
    media: 'Store media', mediaHint: 'Use the button on the profile image to change the store profile image, and the button on the right to change the cover.', changeCover: 'Change cover', addCover: 'Add cover', changeLogo: 'Change profile image', addLogo: 'Add profile image',
    basic: 'Business information', basicHint: 'Core information shown on the store page and used for review.', businessType: 'Business type', legalName: 'Registered name', displayName: 'Display name in Melo', description: 'About the business and services',
    subcategory: 'Subcategory / category detail', secondaryCategories: 'Additional categories', partnerships: 'Partnership modes', serviceArea: 'Service area',
    contactLocation: 'Address & contact', searchPlace: 'Search business location', searchPlacePh: 'Search store, building, street, city or place', search: 'Search', searchingPlaces: 'Searching places…', useLocation: 'Use current location',
    address: 'Address details', city: 'City / Province', country: 'Country', coordinate: 'Partner coordinates', phone: 'Phone', email: 'Email', website: 'Website / Social link',
    nearby: 'Nearby places', nearbyHint: 'Find useful places within about 5 km and select up to 6 to display.', findNearby: 'Find nearby', savedNearby: 'Saved nearby places', pet: 'Pet friendly?', petYes: 'Pet friendly', petNo: 'No pets',
    service: 'Service settings', serviceHint: 'Set service languages, opening hours and booking behavior.', serviceLanguages: 'Service languages', bookingMode: 'Booking mode', bookingUrl: 'External booking URL', openingHours: 'Opening hours', open: 'Open', closed: 'Closed',
    socials: 'Additional contact channels', line: 'LINE', facebook: 'Facebook', instagram: 'Instagram', whatsapp: 'WhatsApp',
    verification: 'Business verification', verificationHint: 'Private information visible only to the Owner and Admin Review.', registration: 'Business / commercial registration number', tax: 'Tax ID', verifierName: 'Verification contact', verifierPhone: 'Verification phone', registrationDoc: 'Business registration document', taxDoc: 'Tax document', attached: 'Document attached ✓', chooseFile: 'Choose image',
    reviewNote: 'Material changes such as business type, registered name, country or registration details may trigger re-verification, matching Android behavior.',
    success: 'Store information saved.', required: 'Complete all required fields.', descriptionShort: 'Business description must be at least 30 characters.', partnershipRequired: 'Select at least one partnership mode.', verifierRequired: 'Enter the verification contact name and phone.', imageOnly: 'Image files only.', imageTooLarge: 'Image must be 12 MB or smaller.', maxNearby: 'You can select up to 6 nearby places.', noNearby: 'No nearby places found.', noPlaces: 'No places found.', loadFailed: 'Unable to load store information.', saveFailed: 'Unable to save store information.', noAccess: 'No active Partner account found.',
    bookingChat: 'Chat inquiry', bookingRequest: 'Booking request', bookingExternal: 'External booking link', bookingWalkIn: 'Walk-in / in-store', optional: 'Optional', status: 'Store status', storeNo: 'Store',
  },
  de: {
    title: 'Store-Daten bearbeiten', subtitle: 'Kundendaten, Kontakt, Standort, Öffnungszeiten und Unternehmensprüfung wie in der Android-App verwalten.',
    save: 'Änderungen speichern', saving: 'Wird gespeichert…', backStore: 'Store ansehen', ownerOnly: 'Nur der Inhaber kann Store-Daten und Prüfdokumente bearbeiten.',
    media: 'Store-Medien', mediaHint: 'Ändere das Profilbild über die Schaltfläche am Profilbild und das Cover über die Schaltfläche rechts.', changeCover: 'Cover ändern', addCover: 'Cover hinzufügen', changeLogo: 'Profilbild ändern', addLogo: 'Profilbild hinzufügen',
    basic: 'Unternehmensdaten', basicHint: 'Kerndaten für Store-Seite und Prüfung.', businessType: 'Unternehmenstyp', legalName: 'Eingetragener Name', displayName: 'Anzeigename in Melo', description: 'Über Unternehmen und Leistungen',
    subcategory: 'Unterkategorie / Kategoriedetail', secondaryCategories: 'Weitere Kategorien', partnerships: 'Kooperationsarten', serviceArea: 'Servicegebiet',
    contactLocation: 'Adresse & Kontakt', searchPlace: 'Geschäftsstandort suchen', searchPlacePh: 'Store, Gebäude, Straße, Stadt oder Ort suchen', search: 'Suchen', searchingPlaces: 'Orte werden gesucht…', useLocation: 'Aktuellen Standort verwenden',
    address: 'Adressdetails', city: 'Stadt / Provinz', country: 'Land', coordinate: 'Partner-Koordinaten', phone: 'Telefon', email: 'E-Mail', website: 'Website / Social-Link',
    nearby: 'Orte in der Nähe', nearbyHint: 'Wichtige Orte im Umkreis von ca. 5 km suchen und bis zu 6 auswählen.', findNearby: 'In der Nähe suchen', savedNearby: 'Gespeicherte Orte', pet: 'Haustiere erlaubt?', petYes: 'Haustiere erlaubt', petNo: 'Keine Haustiere',
    service: 'Service-Einstellungen', serviceHint: 'Sprachen, Öffnungszeiten und Buchungsart festlegen.', serviceLanguages: 'Service-Sprachen', bookingMode: 'Buchungsart', bookingUrl: 'Externe Buchungs-URL', openingHours: 'Öffnungszeiten', open: 'Geöffnet', closed: 'Geschlossen',
    socials: 'Weitere Kontaktkanäle', line: 'LINE', facebook: 'Facebook', instagram: 'Instagram', whatsapp: 'WhatsApp',
    verification: 'Unternehmensprüfung', verificationHint: 'Private Daten nur für Inhaber und Admin Review.', registration: 'Handels-/Registrierungsnummer', tax: 'Steuer-ID', verifierName: 'Prüfkontakt', verifierPhone: 'Telefon des Prüfers', registrationDoc: 'Registrierungsdokument', taxDoc: 'Steuerdokument', attached: 'Dokument vorhanden ✓', chooseFile: 'Bild auswählen',
    reviewNote: 'Wesentliche Änderungen können wie in Android eine erneute Prüfung auslösen.',
    success: 'Store-Daten gespeichert.', required: 'Bitte alle Pflichtfelder ausfüllen.', descriptionShort: 'Die Beschreibung muss mindestens 30 Zeichen lang sein.', partnershipRequired: 'Mindestens eine Kooperationsart auswählen.', verifierRequired: 'Name und Telefon des Prüfkontakts eingeben.', imageOnly: 'Nur Bilddateien.', imageTooLarge: 'Bild maximal 12 MB.', maxNearby: 'Maximal 6 Orte auswählbar.', noNearby: 'Keine Orte in der Nähe gefunden.', noPlaces: 'Keine Orte gefunden.', loadFailed: 'Store-Daten konnten nicht geladen werden.', saveFailed: 'Store-Daten konnten nicht gespeichert werden.', noAccess: 'Kein aktives Partner-Konto gefunden.',
    bookingChat: 'Chat-Anfrage', bookingRequest: 'Buchungsanfrage', bookingExternal: 'Externer Buchungslink', bookingWalkIn: 'Walk-in / vor Ort', optional: 'Optional', status: 'Store-Status', storeNo: 'Store',
  },
  zh: {
    title: '编辑店铺信息', subtitle: '按照 Android 版结构管理顾客可见信息、联系方式、位置、营业时间和企业验证。',
    save: '保存更改', saving: '正在保存…', backStore: '查看店铺', ownerOnly: '只有店主可以编辑店铺资料和验证文件。',
    media: '店铺图片', mediaHint: '点击头像上的按钮更换店铺头像，使用右侧按钮更换封面。', changeCover: '更换封面', addCover: '添加封面', changeLogo: '更换头像', addLogo: '添加头像',
    basic: '企业信息', basicHint: '用于店铺页面展示和审核的核心资料。', businessType: '企业类型', legalName: '注册名称', displayName: 'Melo 显示名称', description: '企业与服务介绍',
    subcategory: '子类别 / 类别说明', secondaryCategories: '附加类别', partnerships: '合作方式', serviceArea: '服务区域',
    contactLocation: '地址与联系方式', searchPlace: '搜索企业地址', searchPlacePh: '搜索店铺、建筑、街道、城市或地点', search: '搜索', searchingPlaces: '正在搜索地点…', useLocation: '使用当前位置',
    address: '详细地址', city: '城市 / 省', country: '国家', coordinate: 'Partner 坐标', phone: '电话', email: '邮箱', website: '网站 / 社交链接',
    nearby: '附近地点', nearbyHint: '搜索约 5 公里内的重要地点，最多选择 6 个展示。', findNearby: '搜索附近', savedNearby: '已保存的附近地点', pet: '允许宠物吗？', petYes: '允许宠物', petNo: '不允许宠物',
    service: '服务设置', serviceHint: '设置服务语言、营业时间和预订方式。', serviceLanguages: '服务语言', bookingMode: '预订方式', bookingUrl: '外部预订链接', openingHours: '营业时间', open: '营业', closed: '休息',
    socials: '其他联系方式', line: 'LINE', facebook: 'Facebook', instagram: 'Instagram', whatsapp: 'WhatsApp',
    verification: '企业验证', verificationHint: '仅店主和 Admin Review 可见的私密信息。', registration: '企业 / 商业登记号', tax: '税号', verifierName: '审核联系人', verifierPhone: '审核联系电话', registrationDoc: '企业登记文件', taxDoc: '税务文件', attached: '已上传文件 ✓', chooseFile: '选择图片',
    reviewNote: '企业类型、注册名称、国家或登记资料等重要变更可能触发重新验证，与 Android 行为一致。',
    success: '店铺信息已保存。', required: '请完整填写必填信息。', descriptionShort: '企业介绍至少需要 30 个字符。', partnershipRequired: '请至少选择一种合作方式。', verifierRequired: '请填写审核联系人姓名和电话。', imageOnly: '仅支持图片文件。', imageTooLarge: '图片不得超过 12 MB。', maxNearby: '最多选择 6 个附近地点。', noNearby: '未找到附近地点。', noPlaces: '未找到地点。', loadFailed: '无法加载店铺信息。', saveFailed: '无法保存店铺信息。', noAccess: '未找到可用的 Partner 账户。',
    bookingChat: '聊天咨询', bookingRequest: '提交预订请求', bookingExternal: '外部预订链接', bookingWalkIn: '到店 / Walk-in', optional: '可选', status: '店铺状态', storeNo: '店铺',
  },
  ja: {
    title: '店舗情報を編集', subtitle: 'Android版と同じ構成で、公開情報、連絡先、場所、営業時間、事業確認情報を管理します。',
    save: '変更を保存', saving: '保存中…', backStore: '店舗を見る', ownerOnly: '店舗情報と確認書類を編集できるのはオーナーのみです。',
    media: '店舗画像', mediaHint: 'プロフィール画像上のボタンで店舗プロフィール画像を変更し、右側のボタンでカバーを変更します。', changeCover: 'カバーを変更', addCover: 'カバーを追加', changeLogo: 'プロフィール画像を変更', addLogo: 'プロフィール画像を追加',
    basic: '事業情報', basicHint: '店舗ページ表示と審査に使用する基本情報です。', businessType: '事業タイプ', legalName: '登録名', displayName: 'Melo表示名', description: '事業とサービスについて',
    subcategory: 'サブカテゴリー / カテゴリー詳細', secondaryCategories: '追加カテゴリー', partnerships: '提携方法', serviceArea: 'サービスエリア',
    contactLocation: '住所・連絡先', searchPlace: '店舗所在地を検索', searchPlacePh: '店舗、建物、道路、市区町村、場所を検索', search: '検索', searchingPlaces: '場所を検索中…', useLocation: '現在地を使用',
    address: '住所詳細', city: '市区町村 / 都道府県', country: '国', coordinate: 'Partner座標', phone: '電話', email: 'メール', website: 'Webサイト / SNSリンク',
    nearby: '周辺スポット', nearbyHint: '約5km以内の重要スポットを検索し、最大6件まで表示できます。', findNearby: '周辺を検索', savedNearby: '保存済み周辺スポット', pet: 'ペット対応', petYes: 'ペット可', petNo: 'ペット不可',
    service: 'サービス設定', serviceHint: '対応言語、営業時間、予約方法を設定します。', serviceLanguages: '対応言語', bookingMode: '予約方法', bookingUrl: '外部予約URL', openingHours: '営業時間', open: '営業', closed: '休業',
    socials: '追加の連絡先', line: 'LINE', facebook: 'Facebook', instagram: 'Instagram', whatsapp: 'WhatsApp',
    verification: '事業確認情報', verificationHint: 'オーナーとAdmin Reviewのみが確認できる非公開情報です。', registration: '法人 / 商業登録番号', tax: '税務番号', verifierName: '確認担当者', verifierPhone: '確認用電話番号', registrationDoc: '事業登録書類', taxDoc: '税務書類', attached: '書類添付済み ✓', chooseFile: '画像を選択',
    reviewNote: '事業タイプ、登録名、国、登録情報などの重要変更はAndroidと同様に再確認の対象になる場合があります。',
    success: '店舗情報を保存しました。', required: '必須項目を入力してください。', descriptionShort: '事業説明は30文字以上必要です。', partnershipRequired: '提携方法を1つ以上選択してください。', verifierRequired: '確認担当者の氏名と電話番号を入力してください。', imageOnly: '画像ファイルのみ対応しています。', imageTooLarge: '画像は12MB以下にしてください。', maxNearby: '周辺スポットは最大6件まで選択できます。', noNearby: '周辺スポットが見つかりません。', noPlaces: '場所が見つかりません。', loadFailed: '店舗情報を読み込めませんでした。', saveFailed: '店舗情報を保存できませんでした。', noAccess: '有効なPartnerアカウントがありません。',
    bookingChat: 'チャット問い合わせ', bookingRequest: '予約リクエスト', bookingExternal: '外部予約リンク', bookingWalkIn: '来店 / Walk-in', optional: '任意', status: '店舗ステータス', storeNo: '店舗',
  },
  ko: {
    title: '매장 정보 수정', subtitle: 'Android 버전과 같은 구조로 고객 공개 정보, 연락처, 위치, 영업시간 및 비즈니스 인증 정보를 관리합니다.',
    save: '변경사항 저장', saving: '저장 중…', backStore: '매장 보기', ownerOnly: '매장 정보와 인증 문서는 Owner만 수정할 수 있습니다.',
    media: '매장 이미지', mediaHint: '프로필 이미지 위의 버튼으로 매장 프로필 이미지를 변경하고, 오른쪽 버튼으로 커버를 변경합니다.', changeCover: '커버 변경', addCover: '커버 추가', changeLogo: '프로필 이미지 변경', addLogo: '프로필 이미지 추가',
    basic: '비즈니스 정보', basicHint: '매장 페이지와 검토에 사용되는 핵심 정보입니다.', businessType: '비즈니스 유형', legalName: '등록 상호', displayName: 'Melo 표시 이름', description: '비즈니스 및 서비스 소개',
    subcategory: '하위 카테고리 / 상세 분류', secondaryCategories: '추가 카테고리', partnerships: '파트너십 방식', serviceArea: '서비스 지역',
    contactLocation: '주소 및 연락처', searchPlace: '사업장 위치 검색', searchPlacePh: '매장, 건물, 도로, 도시 또는 장소 검색', search: '검색', searchingPlaces: '장소 검색 중…', useLocation: '현재 위치 사용',
    address: '상세 주소', city: '도시 / 주·도', country: '국가', coordinate: 'Partner 좌표', phone: '전화', email: '이메일', website: '웹사이트 / 소셜 링크',
    nearby: '주변 장소', nearbyHint: '약 5km 내 주요 장소를 검색해 최대 6곳까지 표시할 수 있습니다.', findNearby: '주변 검색', savedNearby: '저장된 주변 장소', pet: '반려동물 동반 가능?', petYes: '반려동물 가능', petNo: '반려동물 불가',
    service: '서비스 설정', serviceHint: '서비스 언어, 영업시간 및 예약 방식을 설정합니다.', serviceLanguages: '서비스 언어', bookingMode: '예약 방식', bookingUrl: '외부 예약 URL', openingHours: '영업시간', open: '영업', closed: '휴무',
    socials: '추가 연락 채널', line: 'LINE', facebook: 'Facebook', instagram: 'Instagram', whatsapp: 'WhatsApp',
    verification: '비즈니스 인증', verificationHint: 'Owner와 Admin Review만 확인할 수 있는 비공개 정보입니다.', registration: '사업자 / 상업 등록번호', tax: '세금 ID', verifierName: '인증 연락 담당자', verifierPhone: '인증 연락처', registrationDoc: '사업자 등록 문서', taxDoc: '세금 문서', attached: '문서 첨부됨 ✓', chooseFile: '이미지 선택',
    reviewNote: '비즈니스 유형, 등록 상호, 국가 또는 등록정보 같은 중요 변경은 Android와 동일하게 재인증 대상이 될 수 있습니다.',
    success: '매장 정보를 저장했습니다.', required: '필수 정보를 모두 입력해 주세요.', descriptionShort: '비즈니스 소개는 최소 30자 이상이어야 합니다.', partnershipRequired: '파트너십 방식을 1개 이상 선택해 주세요.', verifierRequired: '인증 담당자 이름과 전화번호를 입력해 주세요.', imageOnly: '이미지 파일만 지원합니다.', imageTooLarge: '이미지는 12MB 이하여야 합니다.', maxNearby: '주변 장소는 최대 6개까지 선택할 수 있습니다.', noNearby: '주변 장소를 찾지 못했습니다.', noPlaces: '장소를 찾지 못했습니다.', loadFailed: '매장 정보를 불러오지 못했습니다.', saveFailed: '매장 정보를 저장하지 못했습니다.', noAccess: '사용 가능한 Partner 계정을 찾지 못했습니다.',
    bookingChat: '채팅 문의', bookingRequest: '예약 요청', bookingExternal: '외부 예약 링크', bookingWalkIn: '방문 / Walk-in', optional: '선택', status: '매장 상태', storeNo: '매장',
  },
} as const;

function valueText(row: Row | null, ...keys: string[]) {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== null && value !== undefined && String(value).trim()) return String(value).trim();
  }
  return '';
}

function valueArray(row: Row | null, ...keys: string[]) {
  for (const key of keys) {
    const value = row?.[key];
    if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function valueNumber(row: Row | null, ...keys: string[]) {
  for (const key of keys) {
    const raw = row?.[key];
    if (raw === null || raw === undefined || raw === '') continue;
    const value = Number(raw);
    if (Number.isFinite(value)) return value;
  }
  return null;
}

function localeKey(locale: string): Locale {
  return ['th', 'en', 'de', 'zh', 'ja', 'ko'].includes(locale) ? locale as Locale : 'en';
}

function normalizeBusinessCategory(id: string) {
  const legacyMap: Record<string, string> = {
    cafe: 'food_drink',
    hotel: 'accommodation',
    tour_company: 'tours_guides',
    car_rental: 'transport_rental',
    event_venue: 'events_entertainment',
    local_business: 'local_other',
  };
  return CATEGORIES.some(([value]) => value === id) ? id : legacyMap[id] ?? 'local_other';
}

function categoryLabel(id: string, locale: Locale) {
  const normalized = normalizeBusinessCategory(id);
  return CATEGORIES.find(([value]) => value === normalized)?.[1][locale] ?? id;
}

function partnershipLabel(id: string, locale: Locale) {
  return PARTNERSHIPS.find(([value]) => value === id)?.[1][locale] ?? id;
}

function subtypeOptions(businessType: string, locale: Locale, currentValue = '') {
  const localeIndex: Record<Locale, number> = { th: 1, en: 2, de: 3, zh: 4, ja: 5, ko: 6 };
  const options = (BUSINESS_SUBTYPES[businessType] ?? []).map((item) => ({
    value: item[0],
    label: item[localeIndex[locale]],
  }));
  const current = currentValue.trim();
  if (current && !options.some((item) => item.value === current)) {
    options.push({ value: current, label: current });
  }
  return options;
}

function serviceModeLabel(id: PartnerServiceMode, locale: Locale) {
  return SERVICE_MODES.find(([value]) => value === id)?.[1][locale] ?? id;
}

function formatNearbyAmenity(place: PartnerNearbyPlace) {
  const distance = Number.isFinite(place.distanceKm)
    ? place.distanceKm.toFixed(place.distanceKm < 10 ? 1 : 0)
    : '0';
  return `${NEARBY_PREFIX}${place.name} • ${distance} กม.`;
}

function isNearbyAmenity(value: string) {
  return value.trim().startsWith(NEARBY_PREFIX);
}

function isPetAmenity(value: string) {
  return value === PET_FRIENDLY_VALUE || value === NO_PETS_VALUE;
}

function validateImage(file: File, t: (typeof COPY)[Locale]) {
  if (!file.type.startsWith('image/')) return t.imageOnly;
  if (file.size > 12 * 1024 * 1024) return t.imageTooLarge;
  return '';
}

export default function PartnerStoreEditExperience() {
  const { locale } = useLocale();
  const lang = localeKey(locale);
  const t = COPY[lang];
  const alignment = ALIGNMENT_COPY[lang];

  const [access, setAccess] = useState<PartnerBusinessAccess | null>(null);
  const [business, setBusiness] = useState<Row | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [extras, setExtras] = useState<PartnerBusinessProfileExtras>({
    ...EMPTY_PARTNER_BUSINESS_PROFILE_EXTRAS,
    openingHours: { ...EMPTY_PARTNER_BUSINESS_PROFILE_EXTRAS.openingHours },
  });
  const [verification, setVerification] = useState<PartnerBusinessVerificationDetails>({
    ...EMPTY_PARTNER_BUSINESS_VERIFICATION_DETAILS,
  });
  const [verificationDirty, setVerificationDirty] = useState(false);

  const [logoUrl, setLogoUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [registrationFile, setRegistrationFile] = useState<File | null>(null);
  const [taxFile, setTaxFile] = useState<File | null>(null);

  const [placeQuery, setPlaceQuery] = useState('');
  const [nearbyPlaces, setNearbyPlaces] = useState<PartnerNearbyPlace[]>([]);
  const [selectedNearbyIds, setSelectedNearbyIds] = useState<string[]>([]);
  const [savedNearbyLabels, setSavedNearbyLabels] = useState<string[]>([]);
  const [nearbyDirty, setNearbyDirty] = useState(false);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [petPolicy, setPetPolicy] = useState<'' | 'yes' | 'no'>('');

  const [initialMaterial, setInitialMaterial] = useState({
    status: '',
    businessType: '',
    legalName: '',
    country: '',
    registrationNumber: '',
    taxId: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const logoInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);
  const registrationInput = useRef<HTMLInputElement>(null);
  const taxInput = useRef<HTMLInputElement>(null);

  const [logoPreview, setLogoPreview] = useState('');
  const [coverPreview, setCoverPreview] = useState('');

  useEffect(() => {
    if (!logoFile) {
      setLogoPreview('');
      return;
    }
    const url = URL.createObjectURL(logoFile);
    setLogoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [logoFile]);

  useEffect(() => {
    if (!coverFile) {
      setCoverPreview('');
      return;
    }
    const url = URL.createObjectURL(coverFile);
    setCoverPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [coverFile]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const nextAccess = await getActivePartnerBusiness();
      setAccess(nextAccess);
      if (!nextAccess) {
        setBusiness(null);
        setError(t.noAccess);
        return;
      }

      await setActivePartnerBusiness(nextAccess.businessId);

      const [row, nextExtras, nextVerification] = await Promise.all([
        getPartnerBusiness(nextAccess.businessId),
        getPartnerBusinessProfileExtras(nextAccess.businessId),
        getPartnerBusinessVerificationDetails(nextAccess.businessId),
      ]);

      if (!row) throw new Error(t.loadFailed);
      const businessRow = row as Row;
      setBusiness(businessRow);

      const nextForm: FormState = {
        businessType: normalizeBusinessCategory(valueText(businessRow, 'business_type') || nextAccess.businessType || 'food_drink'),
        legalName: valueText(businessRow, 'legal_name'),
        displayName: valueText(businessRow, 'display_name') || nextAccess.displayName,
        description: valueText(businessRow, 'description'),
        address: valueText(businessRow, 'address'),
        city: valueText(businessRow, 'city'),
        country: valueText(businessRow, 'country') || 'Thailand',
        phone: valueText(businessRow, 'phone'),
        email: valueText(businessRow, 'email'),
        website: valueText(businessRow, 'website'),
        primaryLanguage: valueText(businessRow, 'primary_language') || lang,
        partnershipModes: valueArray(businessRow, 'partnership_modes'),
        latitude: valueNumber(businessRow, 'latitude'),
        longitude: valueNumber(businessRow, 'longitude'),
      };

      setForm(nextForm);
      setPlaceQuery([nextForm.address, nextForm.city, nextForm.country].filter(Boolean).join(', '));
      setExtras({
        ...nextExtras,
        openingHours: { ...nextExtras.openingHours },
      });
      setVerification(nextVerification);
      setVerificationDirty(false);

      const amenities = nextExtras.amenities || [];
      setSavedNearbyLabels(amenities.filter(isNearbyAmenity));
      setNearbyPlaces([]);
      setSelectedNearbyIds([]);
      setNearbyDirty(false);
      setPetPolicy(
        amenities.includes(PET_FRIENDLY_VALUE)
          ? 'yes'
          : amenities.includes(NO_PETS_VALUE)
            ? 'no'
            : '',
      );

      setLogoFile(null);
      setCoverFile(null);
      setRegistrationFile(null);
      setTaxFile(null);

      const [nextLogo, nextCover] = await Promise.all([
        resolveCommerceMedia({
          logo_storage_path: valueText(businessRow, 'logo_storage_path', 'logo_path', 'profile_image_path'),
          logo_url: valueText(businessRow, 'logo_url', 'profile_image_url'),
        }),
        resolveCommerceMedia({
          cover_storage_path: valueText(businessRow, 'cover_storage_path', 'cover_path', 'cover_image_path'),
          cover_url: valueText(businessRow, 'cover_url', 'cover_image_url'),
        }),
      ]);
      setLogoUrl(nextLogo);
      setCoverUrl(nextCover);

      setInitialMaterial({
        status: valueText(businessRow, 'status'),
        businessType: nextForm.businessType,
        legalName: nextForm.legalName,
        country: nextForm.country,
        registrationNumber: nextVerification.registrationNumber,
        taxId: nextVerification.taxId,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [lang, t.loadFailed, t.noAccess]);

  useEffect(() => {
    void load();
  }, [load]);

  const canEdit = Boolean(access?.isOwner);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const setExtra = <K extends keyof PartnerBusinessProfileExtras>(
    key: K,
    value: PartnerBusinessProfileExtras[K],
  ) => {
    setExtras((current) => ({ ...current, [key]: value }));
  };

  const setVerificationField = <K extends keyof PartnerBusinessVerificationDetails>(
    key: K,
    value: PartnerBusinessVerificationDetails[K],
  ) => {
    setVerification((current) => ({ ...current, [key]: value }));
    setVerificationDirty(true);
  };

  const pickImage = (
    kind: MediaKind | DocumentKind,
    file: File | undefined,
  ) => {
    if (!file) return;
    const problem = validateImage(file, t);
    if (problem) {
      setError(problem);
      return;
    }
    setError('');
    if (kind === 'logo') setLogoFile(file);
    else if (kind === 'cover') setCoverFile(file);
    else if (kind === 'registration') {
      setRegistrationFile(file);
      setVerificationDirty(true);
    } else {
      setTaxFile(file);
      setVerificationDirty(true);
    }
  };

  const togglePartnership = (id: string) => {
    setForm((current) => ({
      ...current,
      partnershipModes: current.partnershipModes.includes(id)
        ? current.partnershipModes.filter((value) => value !== id)
        : [...current.partnershipModes, id],
    }));
  };

  const changeBusinessType = (businessType: string) => {
    setField('businessType', businessType);
    setExtras((current) => ({ ...current, subcategory: '' }));
  };

  const toggleServiceMode = (id: PartnerServiceMode) => {
    setExtras((current) => ({
      ...current,
      serviceModes: current.serviceModes.includes(id)
        ? current.serviceModes.filter((value) => value !== id)
        : [...current.serviceModes, id],
    }));
  };

  const toggleSecondaryCategory = (id: string) => {
    setExtras((current) => ({
      ...current,
      secondaryCategories: current.secondaryCategories.includes(id)
        ? current.secondaryCategories.filter((value) => value !== id)
        : [...current.secondaryCategories, id],
    }));
  };

  const toggleServiceLanguage = (id: string) => {
    setExtras((current) => ({
      ...current,
      serviceLanguages: current.serviceLanguages.includes(id)
        ? current.serviceLanguages.filter((value) => value !== id)
        : [...current.serviceLanguages, id],
    }));
  };

  const setOpeningHour = (
    day: PartnerBusinessOpeningDay,
    patch: Partial<PartnerBusinessProfileExtras['openingHours'][PartnerBusinessOpeningDay]>,
  ) => {
    setExtras((current) => ({
      ...current,
      hoursConfigured: true,
      openingHours: {
        ...current.openingHours,
        [day]: {
          ...current.openingHours[day],
          ...patch,
        },
      },
    }));
  };

  const selectPlace = (place: PlaceSearchResult) => {
    setField('address', place.address || place.shortAddress || place.name);
    setField('city', place.city || place.province || place.state || form.city);
    setField('country', place.country || form.country);
    setField('latitude', Number(place.latitude));
    setField('longitude', Number(place.longitude));
    setPlaceQuery([place.name, place.shortAddress || place.address].filter(Boolean).join(', '));
    setNearbyPlaces([]);
    setSelectedNearbyIds([]);
    setNearbyDirty(false);
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setField('latitude', position.coords.latitude);
        setField('longitude', position.coords.longitude);
        setNearbyPlaces([]);
        setSelectedNearbyIds([]);
        setNearbyDirty(false);
      },
      () => setError(t.loadFailed),
      { enableHighAccuracy: true, timeout: 12000 },
    );
  };

  const findNearby = async () => {
    if (form.latitude === null || form.longitude === null || nearbyLoading) return;
    setNearbyLoading(true);
    setError('');
    try {
      const result = await listPartnerNearbyPlaces({
        latitude: form.latitude,
        longitude: form.longitude,
        languageCode: lang,
      });
      setNearbyPlaces(result);
      setSelectedNearbyIds([]);
      setNearbyDirty(true);
      if (!result.length) setError(t.noNearby);
    } catch (caught) {
      setNearbyPlaces([]);
      setError(caught instanceof Error ? caught.message : t.noNearby);
    } finally {
      setNearbyLoading(false);
    }
  };

  const toggleNearby = (id: string) => {
    setSelectedNearbyIds((current) => {
      if (current.includes(id)) return current.filter((value) => value !== id);
      if (current.length >= 6) {
        setError(t.maxNearby);
        return current;
      }
      setError('');
      return [...current, id];
    });
    setNearbyDirty(true);
  };

  const save = async () => {
    if (!access || !canEdit || saving) return;
    setError('');
    setNotice('');

    if (
      form.legalName.trim().length < 2 ||
      form.displayName.trim().length < 2 ||
      !form.city.trim() ||
      !form.country.trim() ||
      !form.phone.trim() ||
      !form.email.trim()
    ) {
      setError(t.required);
      return;
    }
    if (form.description.trim().length < 30) {
      setError(t.descriptionShort);
      return;
    }
    // Media/profile-only edits must not be blocked by private KYC fields.
    // Require the verification contact only when the owner actually edits the
    // verification section or uploads replacement verification documents.
    if (verificationDirty && (!verification.contactPersonName.trim() || !verification.contactPersonPhone.trim())) {
      setError(t.verifierRequired);
      return;
    }

    setSaving(true);
    try {
      await setActivePartnerBusiness(access.businessId);

      const savedBusinessId = await saveMyBusinessAccountDraft({
        businessType: form.businessType,
        legalName: form.legalName,
        displayName: form.displayName,
        description: form.description,
        address: form.address,
        city: form.city,
        country: form.country,
        phone: form.phone,
        email: form.email,
        website: form.website,
        primaryLanguage: form.primaryLanguage || lang,
        partnershipModes: form.partnershipModes,
      });

      const targetBusinessId = savedBusinessId || access.businessId;
      await setActivePartnerBusiness(targetBusinessId);

      const preservedAmenities = (extras.amenities || []).filter(
        (value) => !isNearbyAmenity(value) && !isPetAmenity(value),
      );
      const selectedNearbyLabels = nearbyDirty
        ? nearbyPlaces.filter((place) => selectedNearbyIds.includes(place.id)).map(formatNearbyAmenity)
        : savedNearbyLabels;
      const existingPetAmenities = (extras.amenities || []).filter(isPetAmenity);
      const petAmenity = form.businessType === 'accommodation'
        ? petPolicy === 'yes'
          ? [PET_FRIENDLY_VALUE]
          : petPolicy === 'no'
            ? [NO_PETS_VALUE]
            : []
        : existingPetAmenities;

      const nextExtras: PartnerBusinessProfileExtras = {
        ...extras,
        serviceLanguages: extras.serviceLanguages.length ? extras.serviceLanguages : [form.primaryLanguage || lang],
        amenities: [...preservedAmenities, ...selectedNearbyLabels, ...petAmenity],
      };

      await Promise.all([
        setPartnerBusinessLocation({
          latitude: form.latitude,
          longitude: form.longitude,
        }),
        savePartnerBusinessProfileExtras(nextExtras),
      ]);

      await Promise.all([
        logoFile ? uploadPartnerBusinessMedia(targetBusinessId, 'logo', logoFile) : Promise.resolve(),
        coverFile ? uploadPartnerBusinessMedia(targetBusinessId, 'cover', coverFile) : Promise.resolve(),
      ]);

      const [registrationDocumentPath, taxDocumentPath] = await Promise.all([
        registrationFile
          ? uploadPartnerBusinessVerificationDocument(targetBusinessId, 'registration', registrationFile)
          : Promise.resolve(verification.registrationDocumentPath),
        taxFile
          ? uploadPartnerBusinessVerificationDocument(targetBusinessId, 'tax', taxFile)
          : Promise.resolve(verification.taxDocumentPath),
      ]);

      const nextVerification: PartnerBusinessVerificationDetails = {
        ...verification,
        registrationDocumentPath: registrationDocumentPath || null,
        taxDocumentPath: taxDocumentPath || null,
      };

      if (verificationDirty) {
        await savePartnerBusinessVerificationDetails(targetBusinessId, nextVerification);
      }

      if (initialMaterial.status === 'approved') {
        const changedFields = [
          initialMaterial.businessType !== form.businessType ? 'business_type' : '',
          initialMaterial.legalName.trim() !== form.legalName.trim() ? 'legal_name' : '',
          initialMaterial.country.trim() !== form.country.trim() ? 'country' : '',
          initialMaterial.registrationNumber.trim() !== verification.registrationNumber.trim() ? 'registration_number' : '',
          initialMaterial.taxId.trim() !== verification.taxId.trim() ? 'tax_id' : '',
        ].filter(Boolean);
        await markPartnerBusinessMaterialChange(targetBusinessId, changedFields);
      }

      await load();
      setNotice(t.success);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  const visibleLogo = logoPreview || logoUrl;
  const visibleCover = coverPreview || coverUrl || visibleLogo;
  const status = valueText(business, 'status') || '-';

  const bookingOptions = useMemo(
    () => [
      ['chat', t.bookingChat],
      ['request', t.bookingRequest],
      ['external', t.bookingExternal],
      ['walk_in', t.bookingWalkIn],
    ] as const,
    [t],
  );

  if (loading) {
    return (
      <main className={partnerStyles.partnerPage}>
        <div className={partnerStyles.loading}>Loading Partner Mode…</div>
      </main>
    );
  }

  return (
    <main className={partnerStyles.partnerPage}>
      <PartnerModeHeader access={access} onBusinessChanged={() => void load()} />

      <section className={styles.shell}>
        <header className={styles.pageHeader}>
          <div>
            <small>MELO PARTNER</small>
            <h1>{t.title}</h1>
            <p>{t.subtitle}</p>
          </div>
          <div className={styles.headerActions}>
            <a href="/partner/store" className={styles.secondaryButton}>{t.backStore}</a>
            <button type="button" className={styles.primaryButton} disabled={!canEdit || saving} onClick={() => void save()}>
              {saving ? t.saving : t.save}
            </button>
          </div>
        </header>

        {notice ? <div className={styles.successNotice}>✓ {notice}</div> : null}
        {error ? <div className={styles.errorNotice}>{error}</div> : null}
        {!access ? <div className={styles.emptyState}>{t.noAccess}</div> : null}
        {access && !canEdit ? <div className={styles.ownerNotice}>{t.ownerOnly}</div> : null}

        {access ? (
          <div className={styles.layout}>
            <div className={styles.mainColumn}>
              <section className={styles.card}>
                <div className={styles.cardHeading}>
                  <div><span>01</span><div><h2>{t.media}</h2><p>{t.mediaHint}</p></div></div>
                  <div className={styles.storeMeta}><b>{t.storeNo} #{access.storeNo || 1}</b><small>{t.status}: {status}</small></div>
                </div>

                <div className={styles.mediaEditor}>
                  <div className={styles.coverFrame}>
                    {visibleCover ? <img src={visibleCover} alt="" /> : <div className={styles.coverEmpty}>MELO PARTNER</div>}
                  </div>
                  <div className={styles.logoRow}>
                    <div style={{ position: 'relative', flex: '0 0 auto' }}>
                      <div className={styles.logoFrame}>
                        {visibleLogo ? <img src={visibleLogo} alt="" /> : <span>＋</span>}
                      </div>
                      {canEdit ? (
                        <label
                          aria-label={visibleLogo ? t.changeLogo : t.addLogo}
                          title={visibleLogo ? t.changeLogo : t.addLogo}
                          style={{
                            position: 'absolute',
                            right: -4,
                            bottom: -4,
                            width: 30,
                            height: 30,
                            borderRadius: 999,
                            display: 'grid',
                            placeItems: 'center',
                            cursor: 'pointer',
                            background: 'var(--primary, #2f8cff)',
                            color: '#fff',
                            border: '3px solid var(--surface, #fff)',
                            boxShadow: '0 4px 12px rgba(0,0,0,.18)',
                            zIndex: 5,
                            fontSize: 15,
                            fontWeight: 900,
                            lineHeight: 1,
                          }}
                        >
                          ✎
                          <input
                            ref={logoInput}
                            type="file"
                            accept="image/*"
                            aria-label={visibleLogo ? t.changeLogo : t.addLogo}
                            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                            onClick={(event) => { event.currentTarget.value = ''; }}
                            onChange={(event) => {
                              pickImage('logo', event.currentTarget.files?.[0]);
                              event.currentTarget.value = '';
                            }}
                          />
                        </label>
                      ) : null}
                    </div>
                    <div>
                      <strong>{form.displayName || access.displayName}</strong>
                      <small>{categoryLabel(form.businessType, lang)}</small>
                    </div>
                    {canEdit ? (
                      <label
                        className={styles.smallAction}
                        style={{ position: 'relative', overflow: 'hidden', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        {visibleCover ? t.changeCover : t.addCover}
                        <input
                          ref={coverInput}
                          type="file"
                          accept="image/*"
                          aria-label={visibleCover ? t.changeCover : t.addCover}
                          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                          onClick={(event) => { event.currentTarget.value = ''; }}
                          onChange={(event) => {
                            pickImage('cover', event.currentTarget.files?.[0]);
                            event.currentTarget.value = '';
                          }}
                        />
                      </label>
                    ) : null}
                  </div>
                </div>
              </section>

              <section className={styles.card}>
                <SectionHeading number="02" title={t.basic} hint={t.basicHint} />
                <div className={styles.formGrid}>
                  <Field label={`${t.businessType} *`}>
                    <select value={form.businessType} onChange={(event) => changeBusinessType(event.target.value)} disabled={!canEdit}>
                      {CATEGORIES.map(([id, labels]) => <option key={id} value={id}>{labels[lang]}</option>)}
                    </select>
                  </Field>
                  <Field label={alignment.subtype}>
                    <select value={extras.subcategory} onChange={(event) => setExtra('subcategory', event.target.value)} disabled={!canEdit}>
                      <option value="">— {t.optional} —</option>
                      {subtypeOptions(form.businessType, lang, extras.subcategory).map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label={`${t.legalName} *`}>
                    <input value={form.legalName} onChange={(event) => setField('legalName', event.target.value)} disabled={!canEdit} />
                  </Field>
                  <Field label={`${t.displayName} *`}>
                    <input value={form.displayName} onChange={(event) => setField('displayName', event.target.value)} disabled={!canEdit} />
                  </Field>
                  <Field label={`${t.description} *`} wide>
                    <textarea rows={5} value={form.description} onChange={(event) => setField('description', event.target.value)} disabled={!canEdit} />
                    <small className={styles.counter}>{form.description.trim().length}/30+</small>
                  </Field>
                  <Field label={alignment.extraCapabilities} wide>
                    <div className={styles.chipGrid}>
                      {CATEGORIES.filter(([id]) => id !== form.businessType).map(([id, labels]) => {
                        const active = extras.secondaryCategories.includes(id);
                        return <button type="button" key={id} disabled={!canEdit} data-active={active} className={styles.chip} onClick={() => toggleSecondaryCategory(id)}>{active ? '✓ ' : ''}{labels[lang]}</button>;
                      })}
                    </div>
                    <small className={styles.counter}>{alignment.extraCapabilitiesHint}</small>
                  </Field>
                  <Field label={alignment.collaboration} wide>
                    <div className={styles.chipGrid}>
                      {PARTNERSHIPS.map(([id]) => {
                        const active = form.partnershipModes.includes(id);
                        return <button type="button" key={id} disabled={!canEdit} data-active={active} className={styles.chip} onClick={() => togglePartnership(id)}>{active ? '✓ ' : ''}{partnershipLabel(id, lang)}</button>;
                      })}
                    </div>
                    <small className={styles.counter}>{alignment.collaborationHint}</small>
                  </Field>
                  <Field label={alignment.memberProgram} wide>
                    <div className={styles.coordinateCard}>
                      <span>Ⓜ</span>
                      <div>
                        <strong>{form.partnershipModes.includes('discounts') ? alignment.memberLegacyActive : alignment.memberNotEnrolled}</strong>
                        <small>{alignment.memberManaged}</small>
                      </div>
                    </div>
                  </Field>
                  <Field label={alignment.serviceModes} wide>
                    <div className={styles.chipGrid}>
                      {SERVICE_MODES.map(([id]) => {
                        const active = extras.serviceModes.includes(id);
                        return <button type="button" key={id} disabled={!canEdit} data-active={active} className={styles.chip} onClick={() => toggleServiceMode(id)}>{active ? '✓ ' : ''}{serviceModeLabel(id, lang)}</button>;
                      })}
                    </div>
                  </Field>
                  <Field label={alignment.serviceAreas}>
                    <input value={extras.serviceArea} onChange={(event) => setExtra('serviceArea', event.target.value)} placeholder={alignment.serviceAreasPlaceholder} disabled={!canEdit} />
                  </Field>
                  <Field label={alignment.serviceRadius}>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={extras.serviceRadiusKm ?? ''}
                      onChange={(event) => setExtra('serviceRadiusKm', event.target.value === '' ? null : Math.max(0, Number(event.target.value) || 0))}
                      disabled={!canEdit}
                    />
                    <small className={styles.counter}>{alignment.serviceRadiusHint}</small>
                  </Field>
                </div>
              </section>

              <section className={styles.card}>
                <SectionHeading number="03" title={t.contactLocation} />
                <div className={styles.placeSearch}>
                  <div className={styles.placeSearchLabel}>
                    <span>{t.searchPlace}</span>
                    <div className={styles.searchRow}>
                      {canEdit ? (
                        <PlaceSearchInput
                          value={placeQuery}
                          onChange={setPlaceQuery}
                          onSelect={selectPlace}
                          placeholder={t.searchPlacePh}
                          locale={lang}
                          regionCode={form.country}
                          latitude={form.latitude}
                          longitude={form.longitude}
                          searchingLabel={t.searchingPlaces}
                          noResultsLabel={t.noPlaces}
                          ariaLabel={t.searchPlace}
                        />
                      ) : (
                        <input
                          value={placeQuery}
                          placeholder={t.searchPlacePh}
                          disabled
                          readOnly
                        />
                      )}
                      <button type="button" disabled={!canEdit} onClick={useCurrentLocation}>{t.useLocation}</button>
                    </div>
                  </div>
                </div>

                <div className={styles.formGrid}>
                  <Field label={t.address} wide>
                    <input value={form.address} onChange={(event) => setField('address', event.target.value)} disabled={!canEdit} />
                  </Field>
                  <Field label={`${t.city} *`}>
                    <input value={form.city} onChange={(event) => setField('city', event.target.value)} disabled={!canEdit} />
                  </Field>
                  <Field label={`${t.country} *`}>
                    <input value={form.country} onChange={(event) => setField('country', event.target.value)} disabled={!canEdit} />
                  </Field>
                </div>

                <div className={styles.coordinateCard}>
                  <span>📍</span>
                  <div><strong>{t.coordinate}</strong><small>{form.latitude !== null && form.longitude !== null ? `${form.latitude.toFixed(6)}, ${form.longitude.toFixed(6)}` : '—'}</small></div>
                </div>

                <div className={styles.nearbyHeading}>
                  <div><h3>{t.nearby}</h3><p>{t.nearbyHint}</p></div>
                  <button type="button" className={styles.smallAction} disabled={!canEdit || form.latitude === null || form.longitude === null || nearbyLoading} onClick={() => void findNearby()}>{nearbyLoading ? '…' : t.findNearby}</button>
                </div>
                {nearbyPlaces.length ? (
                  <div className={styles.nearbyGrid}>
                    {nearbyPlaces.map((place) => {
                      const active = selectedNearbyIds.includes(place.id);
                      return (
                        <button type="button" key={place.id} className={styles.nearbyItem} data-active={active} onClick={() => toggleNearby(place.id)} disabled={!canEdit}>
                          <span><b>{place.category || 'POI'} · {place.distanceKm.toFixed(place.distanceKm < 10 ? 1 : 0)} km</b><strong>{place.name}</strong><small>{place.address}</small></span><em>{active ? '✓' : '+'}</em>
                        </button>
                      );
                    })}
                  </div>
                ) : savedNearbyLabels.length ? (
                  <div className={styles.savedNearby}><strong>{t.savedNearby}</strong>{savedNearbyLabels.map((label) => <span key={label}>• {label.replace(NEARBY_PREFIX, '')}</span>)}</div>
                ) : null}

                {form.businessType === 'accommodation' ? (
                  <div className={styles.inlineGroup}>
                    <strong>{t.pet}</strong>
                    <div className={styles.chipGrid}>
                      <button type="button" className={styles.chip} data-active={petPolicy === 'yes'} onClick={() => setPetPolicy((value) => value === 'yes' ? '' : 'yes')} disabled={!canEdit}>{petPolicy === 'yes' ? '✓ ' : ''}{t.petYes}</button>
                      <button type="button" className={styles.chip} data-active={petPolicy === 'no'} onClick={() => setPetPolicy((value) => value === 'no' ? '' : 'no')} disabled={!canEdit}>{petPolicy === 'no' ? '✓ ' : ''}{t.petNo}</button>
                    </div>
                  </div>
                ) : null}

                <div className={styles.formGrid}>
                  <Field label={`${t.phone} *`}><input value={form.phone} onChange={(event) => setField('phone', event.target.value)} disabled={!canEdit} /></Field>
                  <Field label={`${t.email} *`}><input type="email" value={form.email} onChange={(event) => setField('email', event.target.value)} disabled={!canEdit} /></Field>
                  <Field label={t.website} wide><input value={form.website} onChange={(event) => setField('website', event.target.value)} placeholder="https://…" disabled={!canEdit} /></Field>
                </div>
              </section>

              <section className={styles.card}>
                <SectionHeading number="04" title={t.service} hint={t.serviceHint} />
                <div className={styles.formGrid}>
                  <Field label={t.serviceLanguages} wide>
                    <div className={styles.chipGrid}>
                      {APP_LANGUAGES.map(([id, label]) => {
                        const active = extras.serviceLanguages.includes(id);
                        return <button type="button" key={id} className={styles.chip} data-active={active} onClick={() => toggleServiceLanguage(id)} disabled={!canEdit}>{active ? '✓ ' : ''}{label}</button>;
                      })}
                    </div>
                  </Field>
                  <Field label={t.bookingMode}>
                    <select value={extras.bookingMode} onChange={(event) => setExtra('bookingMode', event.target.value as PartnerBusinessProfileExtras['bookingMode'])} disabled={!canEdit}>
                      {bookingOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                    <small className={styles.counter}>{alignment.bookingDefaultHint}</small>
                  </Field>
                  {extras.bookingMode === 'external' ? (
                    <Field label={t.bookingUrl}>
                      <input value={extras.bookingUrl} onChange={(event) => setExtra('bookingUrl', event.target.value)} placeholder="https://…" disabled={!canEdit} />
                    </Field>
                  ) : null}
                </div>

                <div className={styles.hoursBlock}>
                  <h3>{t.openingHours}</h3>
                  <div className={styles.hoursList}>
                    {DAYS.map(([day, labels]) => {
                      const item = extras.openingHours[day];
                      return (
                        <div className={styles.hoursRow} key={day}>
                          <strong>{labels[lang]}</strong>
                          <button type="button" className={styles.openToggle} data-open={!item.closed} onClick={() => setOpeningHour(day, { closed: !item.closed })} disabled={!canEdit}>
                            {!item.closed ? `✓ ${t.open}` : t.closed}
                          </button>
                          <input type="time" value={item.open} onChange={(event) => setOpeningHour(day, { open: event.target.value })} disabled={!canEdit || item.closed} />
                          <span>—</span>
                          <input type="time" value={item.close} onChange={(event) => setOpeningHour(day, { close: event.target.value })} disabled={!canEdit || item.closed} />
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className={styles.socialBlock}>
                  <h3>{t.socials}</h3>
                  <div className={styles.formGrid}>
                    <Field label={t.line}><input value={extras.line} onChange={(event) => setExtra('line', event.target.value)} disabled={!canEdit} /></Field>
                    <Field label={t.whatsapp}><input value={extras.whatsapp} onChange={(event) => setExtra('whatsapp', event.target.value)} disabled={!canEdit} /></Field>
                    <Field label={t.facebook}><input value={extras.facebook} onChange={(event) => setExtra('facebook', event.target.value)} disabled={!canEdit} /></Field>
                    <Field label={t.instagram}><input value={extras.instagram} onChange={(event) => setExtra('instagram', event.target.value)} disabled={!canEdit} /></Field>
                  </div>
                </div>
              </section>
            </div>

            <aside className={styles.sideColumn}>
              <section className={`${styles.card} ${styles.stickyCard}`}>
                <SectionHeading number="05" title={t.verification} hint={t.verificationHint} />
                <div className={styles.sideForm}>
                  <Field label={t.registration}><input value={verification.registrationNumber} onChange={(event) => setVerificationField('registrationNumber', event.target.value)} disabled={!canEdit} /></Field>
                  <Field label={t.tax}><input value={verification.taxId} onChange={(event) => setVerificationField('taxId', event.target.value)} disabled={!canEdit} /></Field>
                  <Field label={`${t.verifierName} *`}><input value={verification.contactPersonName} onChange={(event) => setVerificationField('contactPersonName', event.target.value)} disabled={!canEdit} /></Field>
                  <Field label={`${t.verifierPhone} *`}><input value={verification.contactPersonPhone} onChange={(event) => setVerificationField('contactPersonPhone', event.target.value)} disabled={!canEdit} /></Field>
                </div>

                <div className={styles.documentGrid}>
                  <button type="button" disabled={!canEdit} onClick={() => registrationInput.current?.click()}>
                    <span>▧</span><div><strong>{t.registrationDoc}</strong><small>{registrationFile ? registrationFile.name : verification.registrationDocumentPath ? t.attached : t.chooseFile}</small></div>
                  </button>
                  <button type="button" disabled={!canEdit} onClick={() => taxInput.current?.click()}>
                    <span>▧</span><div><strong>{t.taxDoc}</strong><small>{taxFile ? taxFile.name : verification.taxDocumentPath ? t.attached : t.chooseFile}</small></div>
                  </button>
                  <input ref={registrationInput} hidden type="file" accept="image/*" onChange={(event) => pickImage('registration', event.target.files?.[0])} />
                  <input ref={taxInput} hidden type="file" accept="image/*" onChange={(event) => pickImage('tax', event.target.files?.[0])} />
                </div>

                <div className={styles.reviewNote}>{t.reviewNote}</div>

              </section>
            </aside>
          </div>
        ) : null}
      </section>
    </main>
  );
}

function SectionHeading({ number, title, hint }: { number: string; title: string; hint?: string }) {
  return (
    <div className={styles.sectionHeading}>
      <span>{number}</span>
      <div><h2>{title}</h2>{hint ? <p>{hint}</p> : null}</div>
    </div>
  );
}

function Field({
  label,
  wide = false,
  children,
}: {
  label: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={wide ? styles.fieldWide : styles.field}>
      <span>{label}</span>
      {children}
    </label>
  );
}
