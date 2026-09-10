import type { Locale } from './dictionaries';

type PartnersCopy = {
  kicker: string;
  title: string;
  subtitle: string;
  all: string;
  searchPlaceholder: string;
  recommendedTitle: string;
  recommendedSubtitle: string;
  partnersTitle: string;
  partnersSubtitle: string;
  recommendedBadge: string;
  verified: string;
  services: string;
  service: string;
  from: string;
  viewPartner: string;
  loading: string;
  loadFailed: string;
  retry: string;
  empty: string;
  partnerCount: string;
  noDescription: string;
  categoriesTitle: string;
  categoriesSubtitle: string;
  otherCategories: string;
  allCategories: string;
  closeCategories: string;
  activityOutdoor: string;
  groupTravelStay: string;
  groupActivityTransport: string;
  groupFoodLifestyle: string;
  groupShoppingServices: string;
};

export const partnersCopy: Record<Locale, PartnersCopy> = {
  th: {
    kicker: 'MELO PARTNERS',
    title: 'พาร์ทเนอร์',
    subtitle: 'ค้นหาร้าน ที่พัก คาเฟ่ บริการ และธุรกิจที่ผ่านการอนุมัติในระบบ Melo',
    all: 'ทั้งหมด',
    searchPlaceholder: 'ค้นหาร้าน ประเภท เมือง หรือประเทศ',
    recommendedTitle: 'พาร์ทเนอร์แนะนำ',
    recommendedSubtitle: 'ร้านและบริการเด่นที่พร้อมให้สมาชิก Melo ค้นพบ',
    partnersTitle: 'พาร์ทเนอร์ทั้งหมด',
    partnersSubtitle: 'เลือกดูพาร์ทเนอร์ตามประเภทและประเทศที่คุณสนใจ',
    recommendedBadge: 'แนะนำ',
    verified: 'ยืนยันแล้ว',
    services: 'สินค้า / บริการ',
    service: 'รายการ',
    from: 'เริ่มต้น',
    viewPartner: 'ดูพาร์ทเนอร์',
    loading: 'กำลังโหลดพาร์ทเนอร์…',
    loadFailed: 'โหลดข้อมูลพาร์ทเนอร์ไม่สำเร็จ',
    retry: 'ลองใหม่',
    empty: 'ยังไม่มีพาร์ทเนอร์ในหมวดนี้',
    partnerCount: 'พาร์ทเนอร์',
    noDescription: 'ดูข้อมูลร้าน สินค้า บริการ และข้อเสนอจากพาร์ทเนอร์ Melo',
    categoriesTitle: 'ค้นหาตามประเภท',
    categoriesSubtitle: 'เลือกประเภทเพื่อกรองพาร์ทเนอร์ หรือดูทุกประเภทได้ในครั้งเดียว',
    otherCategories: 'อื่นๆ',
    allCategories: 'ประเภททั้งหมด',
    closeCategories: 'ปิด',
    activityOutdoor: 'กิจกรรม & Outdoor',
    groupTravelStay: 'เที่ยว & ที่พัก',
    groupActivityTransport: 'กิจกรรม & การเดินทาง',
    groupFoodLifestyle: 'อาหาร & Lifestyle',
    groupShoppingServices: 'สินค้า & บริการ',
  },
  en: {
    kicker: 'MELO PARTNERS',
    title: 'Partners',
    subtitle: 'Discover approved hotels, cafés, services and local businesses in the Melo ecosystem.',
    all: 'All',
    searchPlaceholder: 'Search partner, category, city or country',
    recommendedTitle: 'Recommended Partners',
    recommendedSubtitle: 'Featured businesses and services worth discovering on Melo.',
    partnersTitle: 'All Partners',
    partnersSubtitle: 'Browse approved Melo partners by category and country.',
    recommendedBadge: 'Recommended',
    verified: 'Verified',
    services: 'Products / Services',
    service: 'items',
    from: 'From',
    viewPartner: 'View partner',
    loading: 'Loading partners…',
    loadFailed: 'Unable to load partners',
    retry: 'Try again',
    empty: 'No partners are available in this category yet.',
    partnerCount: 'partners',
    noDescription: 'Explore this Melo partner, its services and available offers.',
    categoriesTitle: 'Browse by category',
    categoriesSubtitle: 'Choose a category to filter Partners or view every category at once.',
    otherCategories: 'More',
    allCategories: 'All categories',
    closeCategories: 'Close',
    activityOutdoor: 'Activities & Outdoor',
    groupTravelStay: 'Travel & Stay',
    groupActivityTransport: 'Activities & Transport',
    groupFoodLifestyle: 'Food & Lifestyle',
    groupShoppingServices: 'Shopping & Services',
  },
  de: {
    kicker: 'MELO PARTNERS',
    title: 'Partner',
    subtitle: 'Entdecke freigegebene Hotels, Cafés, Services und lokale Unternehmen im Melo-Ökosystem.',
    all: 'Alle',
    searchPlaceholder: 'Partner, Kategorie, Stadt oder Land suchen',
    recommendedTitle: 'Empfohlene Partner',
    recommendedSubtitle: 'Ausgewählte Unternehmen und Services, die du auf Melo entdecken kannst.',
    partnersTitle: 'Alle Partner',
    partnersSubtitle: 'Durchsuche freigegebene Melo-Partner nach Kategorie und Land.',
    recommendedBadge: 'Empfohlen',
    verified: 'Verifiziert',
    services: 'Produkte / Services',
    service: 'Einträge',
    from: 'Ab',
    viewPartner: 'Partner ansehen',
    loading: 'Partner werden geladen…',
    loadFailed: 'Partner konnten nicht geladen werden',
    retry: 'Erneut versuchen',
    empty: 'In dieser Kategorie sind noch keine Partner verfügbar.',
    partnerCount: 'Partner',
    noDescription: 'Entdecke diesen Melo-Partner, seine Services und Angebote.',
    categoriesTitle: 'Nach Kategorie entdecken',
    categoriesSubtitle: 'Wähle eine Kategorie zum Filtern oder zeige alle Kategorien auf einmal.',
    otherCategories: 'Mehr',
    allCategories: 'Alle Kategorien',
    closeCategories: 'Schließen',
    activityOutdoor: 'Aktivitäten & Outdoor',
    groupTravelStay: 'Reisen & Unterkunft',
    groupActivityTransport: 'Aktivitäten & Transport',
    groupFoodLifestyle: 'Essen & Lifestyle',
    groupShoppingServices: 'Shopping & Services',
  },
  zh: {
    kicker: 'MELO PARTNERS',
    title: '合作伙伴',
    subtitle: '发现 Melo 生态中已审核的酒店、咖啡馆、服务和本地商家。',
    all: '全部',
    searchPlaceholder: '搜索商家、分类、城市或国家',
    recommendedTitle: '推荐合作伙伴',
    recommendedSubtitle: '精选值得在 Melo 上发现的商家与服务。',
    partnersTitle: '全部合作伙伴',
    partnersSubtitle: '按分类和国家浏览已审核的 Melo 合作伙伴。',
    recommendedBadge: '推荐',
    verified: '已认证',
    services: '商品 / 服务',
    service: '项',
    from: '起价',
    viewPartner: '查看商家',
    loading: '正在加载合作伙伴…',
    loadFailed: '无法加载合作伙伴',
    retry: '重试',
    empty: '此分类暂时没有合作伙伴。',
    partnerCount: '个合作伙伴',
    noDescription: '查看此 Melo 合作伙伴的服务与可用优惠。',
    categoriesTitle: '按类型查找',
    categoriesSubtitle: '选择分类筛选合作商家，或一次查看全部类型。',
    otherCategories: '更多',
    allCategories: '全部类型',
    closeCategories: '关闭',
    activityOutdoor: '活动与户外',
    groupTravelStay: '旅行与住宿',
    groupActivityTransport: '活动与交通',
    groupFoodLifestyle: '餐饮与生活方式',
    groupShoppingServices: '购物与服务',
  },
  ja: {
    kicker: 'MELO PARTNERS',
    title: 'パートナー',
    subtitle: 'Melo で承認済みのホテル、カフェ、サービス、地域のお店を探せます。',
    all: 'すべて',
    searchPlaceholder: 'パートナー、カテゴリ、都市、国を検索',
    recommendedTitle: 'おすすめパートナー',
    recommendedSubtitle: 'Melo で見つけたい注目のお店やサービス。',
    partnersTitle: 'すべてのパートナー',
    partnersSubtitle: 'カテゴリや国から承認済み Melo パートナーを探せます。',
    recommendedBadge: 'おすすめ',
    verified: '認証済み',
    services: '商品 / サービス',
    service: '件',
    from: '価格',
    viewPartner: 'パートナーを見る',
    loading: 'パートナーを読み込み中…',
    loadFailed: 'パートナーを読み込めません',
    retry: '再試行',
    empty: 'このカテゴリにはまだパートナーがありません。',
    partnerCount: '件',
    noDescription: 'この Melo パートナーのサービスやオファーを確認できます。',
    categoriesTitle: 'カテゴリから探す',
    categoriesSubtitle: 'カテゴリで絞り込むか、すべてのカテゴリを一覧できます。',
    otherCategories: 'その他',
    allCategories: 'すべてのカテゴリ',
    closeCategories: '閉じる',
    activityOutdoor: 'アクティビティ & アウトドア',
    groupTravelStay: '旅行 & 宿泊',
    groupActivityTransport: 'アクティビティ & 交通',
    groupFoodLifestyle: 'グルメ & ライフスタイル',
    groupShoppingServices: 'ショッピング & サービス',
  },
  ko: {
    kicker: 'MELO PARTNERS',
    title: '파트너',
    subtitle: 'Melo에서 승인된 호텔, 카페, 서비스 및 지역 비즈니스를 만나보세요.',
    all: '전체',
    searchPlaceholder: '파트너, 카테고리, 도시 또는 국가 검색',
    recommendedTitle: '추천 파트너',
    recommendedSubtitle: 'Melo에서 발견할 만한 주요 비즈니스와 서비스를 소개합니다.',
    partnersTitle: '전체 파트너',
    partnersSubtitle: '카테고리와 국가별로 승인된 Melo 파트너를 둘러보세요.',
    recommendedBadge: '추천',
    verified: '인증됨',
    services: '상품 / 서비스',
    service: '개',
    from: '시작가',
    viewPartner: '파트너 보기',
    loading: '파트너를 불러오는 중…',
    loadFailed: '파트너를 불러오지 못했습니다',
    retry: '다시 시도',
    empty: '이 카테고리에는 아직 파트너가 없습니다.',
    partnerCount: '개 파트너',
    noDescription: '이 Melo 파트너의 서비스와 이용 가능한 혜택을 확인해보세요.',
    categoriesTitle: '카테고리로 찾기',
    categoriesSubtitle: '카테고리를 선택해 파트너를 필터링하거나 전체 카테고리를 한 번에 확인하세요.',
    otherCategories: '더보기',
    allCategories: '전체 카테고리',
    closeCategories: '닫기',
    activityOutdoor: '액티비티 & 아웃도어',
    groupTravelStay: '여행 & 숙박',
    groupActivityTransport: '액티비티 & 교통',
    groupFoodLifestyle: '푸드 & 라이프스타일',
    groupShoppingServices: '쇼핑 & 서비스',
  },
};

export type PartnerBusinessCategory =
  | 'accommodation'
  | 'food_drink'
  | 'tours_guides'
  | 'transport_rental'
  | 'activities_experiences'
  | 'sports_outdoor'
  | 'attractions'
  | 'events_entertainment'
  | 'wellness_lifestyle'
  | 'shopping_equipment'
  | 'traveler_services'
  | 'local_other';

const partnerCategoryLabels: Record<PartnerBusinessCategory, Record<Locale, string>> = {
  accommodation: { th: 'ที่พัก', en: 'Accommodation', de: 'Unterkunft', zh: '住宿', ja: '宿泊施設', ko: '숙박' },
  food_drink: { th: 'อาหาร & เครื่องดื่ม', en: 'Food & Drink', de: 'Essen & Trinken', zh: '餐饮', ja: '飲食', ko: '음식 & 음료' },
  tours_guides: { th: 'ทัวร์ & ไกด์', en: 'Tours & Guides', de: 'Touren & Guides', zh: '旅行团与导游', ja: 'ツアー & ガイド', ko: '투어 & 가이드' },
  transport_rental: { th: 'เดินทาง & รถเช่า', en: 'Transport & Rental', de: 'Transport & Vermietung', zh: '交通与租赁', ja: '交通 & レンタル', ko: '교통 & 렌탈' },
  activities_experiences: { th: 'กิจกรรม & ประสบการณ์', en: 'Activities & Experiences', de: 'Aktivitäten & Erlebnisse', zh: '活动与体验', ja: 'アクティビティ & 体験', ko: '액티비티 & 체험' },
  sports_outdoor: { th: 'กีฬา & Outdoor', en: 'Sports & Outdoor', de: 'Sport & Outdoor', zh: '运动与户外', ja: 'スポーツ & アウトドア', ko: '스포츠 & 아웃도어' },
  attractions: { th: 'สถานที่ท่องเที่ยว', en: 'Attractions', de: 'Sehenswürdigkeiten', zh: '景点', ja: '観光スポット', ko: '관광지' },
  events_entertainment: { th: 'อีเวนต์ & ความบันเทิง', en: 'Events & Entertainment', de: 'Events & Unterhaltung', zh: '活动与娱乐', ja: 'イベント & エンタメ', ko: '이벤트 & 엔터테인먼트' },
  wellness_lifestyle: { th: 'Wellness & Lifestyle', en: 'Wellness & Lifestyle', de: 'Wellness & Lifestyle', zh: '健康与生活方式', ja: 'ウェルネス & ライフスタイル', ko: '웰니스 & 라이프스타일' },
  shopping_equipment: { th: 'ร้านค้า & อุปกรณ์', en: 'Shopping & Equipment', de: 'Shopping & Ausrüstung', zh: '购物与装备', ja: 'ショッピング & 装備', ko: '쇼핑 & 장비' },
  traveler_services: { th: 'บริการนักท่องเที่ยว', en: 'Traveler Services', de: 'Reiseservices', zh: '旅行者服务', ja: '旅行者向けサービス', ko: '여행자 서비스' },
  local_other: { th: 'ธุรกิจ / บริการอื่นๆ', en: 'Local Business & Others', de: 'Lokale Unternehmen & Sonstiges', zh: '本地商家及其他', ja: 'ローカルビジネス & その他', ko: '로컬 비즈니스 & 기타' },
};

export function getPartnerCategoryLabel(category: PartnerBusinessCategory, locale: Locale) {
  return partnerCategoryLabels[category]?.[locale] ?? partnerCategoryLabels[category]?.en ?? category;
}

