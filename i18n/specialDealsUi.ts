import type { Locale } from './dictionaries';

type SpecialDealsCopy = {
  kicker: string;
  title: string;
  subtitle: string;
  all: string;
  recommendedTitle: string;
  recommendedSubtitle: string;
  dealsTitle: string;
  dealsSubtitle: string;
  recommendedBadge: string;
  memberOnly: string;
  discount: string;
  from: string;
  validUntil: string;
  viewDeal: string;
  buy: string;
  ask: string;
  loading: string;
  loadFailed: string;
  retry: string;
  empty: string;
  dealCount: string;
};

export const specialDealsCopy: Record<Locale, SpecialDealsCopy> = {
  th: {
    kicker: 'MELO DEALS',
    title: 'ดีลพิเศษ',
    subtitle: 'รวมโปรโมชัน คูปอง และแพ็กเกจจากพาร์ทเนอร์ Melo ที่พร้อมเผยแพร่',
    all: 'ทั้งหมด',
    recommendedTitle: 'Special Deals แนะนำ',
    recommendedSubtitle: 'ข้อเสนอเด่นที่คัดจากดีลที่กำลังใช้งานอยู่ เลื่อนดูได้ต่อเนื่อง',
    dealsTitle: 'Deals',
    dealsSubtitle: 'เลือกดูดีลทั้งหมดตามประเภทที่คุณสนใจ',
    recommendedBadge: 'แนะนำ',
    memberOnly: 'Melo Member',
    discount: 'ลด',
    from: 'เริ่มต้น',
    validUntil: 'ใช้ได้ถึง',
    viewDeal: 'ดูดีล',
    buy: 'ซื้อ',
    ask: 'สอบถาม',
    loading: 'กำลังโหลดดีล…',
    loadFailed: 'โหลดดีลไม่สำเร็จ',
    retry: 'ลองใหม่',
    empty: 'ยังไม่มีดีลในประเภทนี้',
    dealCount: 'ดีล',
  },
  en: {
    kicker: 'MELO DEALS',
    title: 'Special Deals',
    subtitle: 'Promotions, coupons and packages from Melo partners that are ready for public discovery.',
    all: 'All',
    recommendedTitle: 'Recommended Special Deals',
    recommendedSubtitle: 'Highlighted offers from currently active deals, presented in a continuous marquee.',
    dealsTitle: 'Deals',
    dealsSubtitle: 'Browse all available deals by the category you care about.',
    recommendedBadge: 'Recommended',
    memberOnly: 'Melo Member',
    discount: 'OFF',
    from: 'From',
    validUntil: 'Valid until',
    viewDeal: 'View deal',
    buy: 'Buy',
    ask: 'Ask',
    loading: 'Loading deals…',
    loadFailed: 'Unable to load deals',
    retry: 'Try again',
    empty: 'No deals are available in this category yet.',
    dealCount: 'deals',
  },
  de: {
    kicker: 'MELO DEALS',
    title: 'Spezialangebote',
    subtitle: 'Aktionen, Gutscheine und Pakete von Melo-Partnern, die öffentlich verfügbar sind.',
    all: 'Alle',
    recommendedTitle: 'Empfohlene Spezialangebote',
    recommendedSubtitle: 'Hervorgehobene aktive Angebote in einer fortlaufenden Marquee-Ansicht.',
    dealsTitle: 'Angebote',
    dealsSubtitle: 'Entdecke alle verfügbaren Angebote nach Kategorie.',
    recommendedBadge: 'Empfohlen',
    memberOnly: 'Melo Member',
    discount: 'Rabatt',
    from: 'Ab',
    validUntil: 'Gültig bis',
    viewDeal: 'Angebot ansehen',
    buy: 'Kaufen',
    ask: 'Anfragen',
    loading: 'Angebote werden geladen…',
    loadFailed: 'Angebote konnten nicht geladen werden',
    retry: 'Erneut versuchen',
    empty: 'In dieser Kategorie sind noch keine Angebote verfügbar.',
    dealCount: 'Angebote',
  },
  zh: {
    kicker: 'MELO DEALS',
    title: '特别优惠',
    subtitle: '来自 Melo 合作伙伴、可公开展示的促销、优惠券和套餐。',
    all: '全部',
    recommendedTitle: '推荐特别优惠',
    recommendedSubtitle: '从当前有效优惠中精选，并以连续滚动方式展示。',
    dealsTitle: '优惠',
    dealsSubtitle: '按你感兴趣的分类浏览所有可用优惠。',
    recommendedBadge: '推荐',
    memberOnly: 'Melo Member',
    discount: '优惠',
    from: '起价',
    validUntil: '有效期至',
    viewDeal: '查看优惠',
    buy: '购买',
    ask: '咨询',
    loading: '正在加载优惠…',
    loadFailed: '无法加载优惠',
    retry: '重试',
    empty: '此分类暂时没有优惠。',
    dealCount: '个优惠',
  },
  ja: {
    kicker: 'MELO DEALS',
    title: '特別オファー',
    subtitle: '公開可能な Melo パートナーのプロモーション、クーポン、パッケージ。',
    all: 'すべて',
    recommendedTitle: 'おすすめ Special Deals',
    recommendedSubtitle: '現在有効なオファーから注目のディールを選び、連続スクロールで表示します。',
    dealsTitle: 'Deals',
    dealsSubtitle: '興味のあるカテゴリから利用可能なディールを探せます。',
    recommendedBadge: 'おすすめ',
    memberOnly: 'Melo Member',
    discount: 'OFF',
    from: '価格',
    validUntil: '有効期限',
    viewDeal: 'ディールを見る',
    buy: '購入',
    ask: '問い合わせ',
    loading: 'ディールを読み込み中…',
    loadFailed: 'ディールを読み込めません',
    retry: '再試行',
    empty: 'このカテゴリにはまだディールがありません。',
    dealCount: '件',
  },
  ko: {
    kicker: 'MELO DEALS',
    title: '특별 딜',
    subtitle: '공개 가능한 Melo 파트너의 프로모션, 쿠폰 및 패키지를 만나보세요.',
    all: '전체',
    recommendedTitle: '추천 Special Deals',
    recommendedSubtitle: '현재 이용 가능한 딜 중 주목할 만한 혜택을 연속 Marquee로 보여줍니다.',
    dealsTitle: 'Deals',
    dealsSubtitle: '관심 있는 카테고리별로 모든 딜을 둘러보세요.',
    recommendedBadge: '추천',
    memberOnly: 'Melo Member',
    discount: '할인',
    from: '시작가',
    validUntil: '유효기간',
    viewDeal: '딜 보기',
    buy: '구매',
    ask: '문의',
    loading: '딜을 불러오는 중…',
    loadFailed: '딜을 불러오지 못했습니다',
    retry: '다시 시도',
    empty: '이 카테고리에는 아직 딜이 없습니다.',
    dealCount: '개 딜',
  },
};
