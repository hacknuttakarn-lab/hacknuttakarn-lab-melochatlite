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
  },
};
