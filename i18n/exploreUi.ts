import type { Locale } from './dictionaries';

export type ExploreFeature = 'trips' | 'events' | 'community' | 'deals' | 'partners' | 'quests';

type FeatureCopy = {
  title: string;
  subtitle: string;
  search: string;
  empty: string;
  tabs: string[];
};

type ExploreCopy = {
  portal: string;
  live: string;
  refresh: string;
  refreshing: string;
  loading: string;
  retry: string;
  loadFailed: string;
  all: string;
  categories: string;
  results: string;
  details: string;
  close: string;
  date: string;
  location: string;
  members: string;
  organizer: string;
  status: string;
  price: string;
  points: string;
  progress: string;
  verified: string;
  memberOnly: string;
  joined: string;
  mine: string;
  upcoming: string;
  noImage: string;
  note: string;
  features: Record<ExploreFeature, FeatureCopy>;
};

export const exploreCopy: Record<Locale, ExploreCopy> = {
  th: {
    portal: 'MELO DISCOVER', live: 'ข้อมูลจาก Melo แบบเรียลไทม์', refresh: 'รีเฟรช', refreshing: 'กำลังรีเฟรช…', loading: 'กำลังโหลดข้อมูล…', retry: 'ลองใหม่', loadFailed: 'โหลดข้อมูลไม่สำเร็จ', all: 'ทั้งหมด', categories: 'หมวดหมู่', results: 'รายการ', details: 'ดูรายละเอียด', close: 'ปิด', date: 'วันที่', location: 'สถานที่', members: 'สมาชิก', organizer: 'ผู้จัด', status: 'สถานะ', price: 'ราคา', points: 'แต้ม', progress: 'ความคืบหน้า', verified: 'ยืนยันแล้ว', memberOnly: 'Melo Member', joined: 'เข้าร่วมแล้ว', mine: 'ของฉัน', upcoming: 'กำลังจะมาถึง', noImage: 'Melo', note: 'หน้าเว็บชุดนี้เน้นการค้นหาและดูรายละเอียดจากข้อมูลจริงของบัญชี Melo โดยยังคงการทำรายการสำคัญบางส่วนไว้ในแอปเพื่อให้ระบบและสิทธิ์ตรงกัน',
    features: {
      trips: { title: 'ทริป', subtitle: 'ค้นหาทริปที่น่าสนใจ ดูเส้นทาง วันเดินทาง และทริปที่คุณเกี่ยวข้อง', search: 'ค้นหาทริป จุดหมาย หรือหมวดหมู่', empty: 'ยังไม่มีทริปที่ตรงกับตัวกรอง', tabs: ['ค้นหาทริป', 'ทริปของฉัน'] },
      events: { title: 'กิจกรรม', subtitle: 'ค้นหากิจกรรมและอีเวนต์ที่เปิดให้เข้าร่วม พร้อมดูวัน เวลา และสถานที่', search: 'ค้นหากิจกรรม สถานที่ หรือหมวดหมู่', empty: 'ยังไม่มีกิจกรรมที่ตรงกับตัวกรอง', tabs: ['ค้นหากิจกรรม', 'กิจกรรมของฉัน'] },
      community: { title: 'คอมมูนิตี้', subtitle: 'ค้นหากลุ่มตามความสนใจ ประเทศ และไลฟ์สไตล์ พร้อมดูคอมมูนิตี้ที่คุณเข้าร่วม', search: 'ค้นหาคอมมูนิตี้หรือความสนใจ', empty: 'ยังไม่มีคอมมูนิตี้ที่ตรงกับตัวกรอง', tabs: ['ค้นหาคอมมูนิตี้', 'คอมมูนิตี้ของฉัน'] },
      deals: { title: 'ดีลพิเศษ', subtitle: 'โปรโมชัน คูปอง และแพ็กเกจจากพาร์ทเนอร์ที่ผ่านการอนุมัติ', search: 'ค้นหาดีล ร้านค้า หรือหมวดหมู่', empty: 'ยังไม่มีดีลที่ตรงกับตัวกรอง', tabs: ['ดีลทั้งหมด', 'สำหรับ Melo Member'] },
      partners: { title: 'พาร์ทเนอร์', subtitle: 'ค้นหาร้านค้า ที่พัก คาเฟ่ บริการ และประสบการณ์ใน Melo', search: 'ค้นหาร้านค้า เมือง หรือประเภทธุรกิจ', empty: 'ยังไม่มีพาร์ทเนอร์ที่ตรงกับตัวกรอง', tabs: ['พาร์ทเนอร์ทั้งหมด', 'แนะนำ'] },
      quests: { title: 'ภารกิจ', subtitle: 'ทำภารกิจจากการเดินทาง กิจกรรม คอมมูนิตี้ และพาร์ทเนอร์ เพื่อสะสม Melo Points', search: 'ค้นหาภารกิจหรือหมวดหมู่', empty: 'ยังไม่มีภารกิจที่ตรงกับตัวกรอง', tabs: ['ภารกิจทั้งหมด', 'กำลังทำ', 'สำเร็จแล้ว'] },
    },
  },
  en: {
    portal: 'MELO DISCOVER', live: 'Live Melo data', refresh: 'Refresh', refreshing: 'Refreshing…', loading: 'Loading…', retry: 'Try again', loadFailed: 'Unable to load data', all: 'All', categories: 'Categories', results: 'items', details: 'View details', close: 'Close', date: 'Date', location: 'Location', members: 'Members', organizer: 'Organizer', status: 'Status', price: 'Price', points: 'Points', progress: 'Progress', verified: 'Verified', memberOnly: 'Melo Member', joined: 'Joined', mine: 'Mine', upcoming: 'Upcoming', noImage: 'Melo', note: 'This web release focuses on discovery and detailed viewing from live Melo account data. Some high-impact actions remain in the app so permissions and workflows stay consistent.',
    features: {
      trips: { title: 'Trips', subtitle: 'Discover trips, routes, travel dates and trips connected to your account.', search: 'Search trips, destinations or categories', empty: 'No trips match these filters.', tabs: ['Discover', 'My Trips'] },
      events: { title: 'Events', subtitle: 'Discover activities and events with dates, venues and participation context.', search: 'Search events, venues or categories', empty: 'No events match these filters.', tabs: ['Discover', 'My Events'] },
      community: { title: 'Community', subtitle: 'Find groups by interests, country and lifestyle, plus communities you joined.', search: 'Search communities or interests', empty: 'No communities match these filters.', tabs: ['Discover', 'My Communities'] },
      deals: { title: 'Special Deals', subtitle: 'Promotions, coupons and packages from approved Melo partners.', search: 'Search deals, partners or categories', empty: 'No deals match these filters.', tabs: ['All Deals', 'Melo Member'] },
      partners: { title: 'Partners', subtitle: 'Discover stays, cafés, stores, services and experiences inside Melo.', search: 'Search partners, cities or business types', empty: 'No partners match these filters.', tabs: ['All Partners', 'Recommended'] },
      quests: { title: 'Quests', subtitle: 'Complete travel, event, community and partner quests to earn Melo Points.', search: 'Search quests or categories', empty: 'No quests match these filters.', tabs: ['All Quests', 'In Progress', 'Completed'] },
    },
  },
  de: {
    portal: 'MELO DISCOVER', live: 'Live-Melo-Daten', refresh: 'Aktualisieren', refreshing: 'Aktualisieren…', loading: 'Wird geladen…', retry: 'Erneut versuchen', loadFailed: 'Daten konnten nicht geladen werden', all: 'Alle', categories: 'Kategorien', results: 'Einträge', details: 'Details ansehen', close: 'Schließen', date: 'Datum', location: 'Ort', members: 'Mitglieder', organizer: 'Organisator', status: 'Status', price: 'Preis', points: 'Punkte', progress: 'Fortschritt', verified: 'Verifiziert', memberOnly: 'Melo Member', joined: 'Beigetreten', mine: 'Meine', upcoming: 'Demnächst', noImage: 'Melo', note: 'Diese Web-Version konzentriert sich auf Entdecken und Detailansichten aus Live-Melo-Daten. Wichtige Aktionen bleiben vorerst in der App.',
    features: {
      trips: { title: 'Reisen', subtitle: 'Entdecke Trips, Routen, Reisedaten und deine eigenen Reisen.', search: 'Reisen, Ziele oder Kategorien suchen', empty: 'Keine passenden Reisen.', tabs: ['Entdecken', 'Meine Reisen'] },
      events: { title: 'Events', subtitle: 'Entdecke Aktivitäten und Events mit Datum und Veranstaltungsort.', search: 'Events, Orte oder Kategorien suchen', empty: 'Keine passenden Events.', tabs: ['Entdecken', 'Meine Events'] },
      community: { title: 'Community', subtitle: 'Finde Gruppen nach Interessen, Land und Lifestyle.', search: 'Communities oder Interessen suchen', empty: 'Keine passenden Communities.', tabs: ['Entdecken', 'Meine Communities'] },
      deals: { title: 'Spezialangebote', subtitle: 'Aktionen, Gutscheine und Pakete geprüfter Melo-Partner.', search: 'Angebote, Partner oder Kategorien suchen', empty: 'Keine passenden Angebote.', tabs: ['Alle Angebote', 'Melo Member'] },
      partners: { title: 'Partner', subtitle: 'Entdecke Unterkünfte, Cafés, Shops, Services und Erlebnisse.', search: 'Partner, Städte oder Geschäftstypen suchen', empty: 'Keine passenden Partner.', tabs: ['Alle Partner', 'Empfohlen'] },
      quests: { title: 'Quests', subtitle: 'Erfülle Reise-, Event-, Community- und Partner-Quests für Melo Points.', search: 'Quests oder Kategorien suchen', empty: 'Keine passenden Quests.', tabs: ['Alle Quests', 'In Arbeit', 'Abgeschlossen'] },
    },
  },
  zh: {
    portal: 'MELO DISCOVER', live: 'Melo 实时数据', refresh: '刷新', refreshing: '正在刷新…', loading: '正在加载…', retry: '重试', loadFailed: '无法加载数据', all: '全部', categories: '分类', results: '条', details: '查看详情', close: '关闭', date: '日期', location: '地点', members: '成员', organizer: '组织者', status: '状态', price: '价格', points: '积分', progress: '进度', verified: '已认证', memberOnly: 'Melo Member', joined: '已加入', mine: '我的', upcoming: '即将开始', noImage: 'Melo', note: '当前网页版重点提供基于 Melo 实时账户数据的发现与详情浏览。部分重要操作仍保留在 App 中，以保持权限与流程一致。',
    features: {
      trips: { title: '行程', subtitle: '发现行程、路线、旅行日期以及与你账户相关的行程。', search: '搜索行程、目的地或分类', empty: '没有符合筛选条件的行程。', tabs: ['发现', '我的行程'] },
      events: { title: '活动', subtitle: '发现活动与事件，并查看日期、场地和参与信息。', search: '搜索活动、场地或分类', empty: '没有符合筛选条件的活动。', tabs: ['发现', '我的活动'] },
      community: { title: '社区', subtitle: '按兴趣、国家和生活方式寻找社区。', search: '搜索社区或兴趣', empty: '没有符合筛选条件的社区。', tabs: ['发现', '我的社区'] },
      deals: { title: '特别优惠', subtitle: '来自已审核 Melo 合作伙伴的促销、优惠券和套餐。', search: '搜索优惠、合作伙伴或分类', empty: '没有符合筛选条件的优惠。', tabs: ['全部优惠', 'Melo Member'] },
      partners: { title: '合作伙伴', subtitle: '发现住宿、咖啡馆、商店、服务和体验。', search: '搜索合作伙伴、城市或商业类型', empty: '没有符合筛选条件的合作伙伴。', tabs: ['全部合作伙伴', '推荐'] },
      quests: { title: '任务', subtitle: '完成旅行、活动、社区和合作伙伴任务以获得 Melo Points。', search: '搜索任务或分类', empty: '没有符合筛选条件的任务。', tabs: ['全部任务', '进行中', '已完成'] },
    },
  },
  ja: {
    portal: 'MELO DISCOVER', live: 'Meloライブデータ', refresh: '更新', refreshing: '更新中…', loading: '読み込み中…', retry: '再試行', loadFailed: 'データを読み込めません', all: 'すべて', categories: 'カテゴリ', results: '件', details: '詳細を見る', close: '閉じる', date: '日付', location: '場所', members: 'メンバー', organizer: '主催者', status: 'ステータス', price: '価格', points: 'ポイント', progress: '進捗', verified: '認証済み', memberOnly: 'Melo Member', joined: '参加済み', mine: '自分', upcoming: '近日開催', noImage: 'Melo', note: '現在のWeb版はMeloのライブデータを使った検索と詳細閲覧を中心にしています。重要な操作の一部は権限とフローを揃えるためアプリに残しています。',
    features: {
      trips: { title: 'トリップ', subtitle: 'トリップ、ルート、旅行日程、自分に関連するトリップを探します。', search: 'トリップ、目的地、カテゴリを検索', empty: '条件に合うトリップはありません。', tabs: ['探す', 'マイトリップ'] },
      events: { title: 'イベント', subtitle: '日時や会場情報とともに参加可能なイベントを探します。', search: 'イベント、会場、カテゴリを検索', empty: '条件に合うイベントはありません。', tabs: ['探す', 'マイイベント'] },
      community: { title: 'コミュニティ', subtitle: '興味、国、ライフスタイルからグループを探します。', search: 'コミュニティや興味を検索', empty: '条件に合うコミュニティはありません。', tabs: ['探す', '参加中'] },
      deals: { title: '特別オファー', subtitle: '承認済みMelo Partnerのプロモーション、クーポン、パッケージ。', search: 'オファー、パートナー、カテゴリを検索', empty: '条件に合うオファーはありません。', tabs: ['すべて', 'Melo Member'] },
      partners: { title: 'パートナー', subtitle: '宿泊、カフェ、ショップ、サービス、体験を探します。', search: 'パートナー、都市、業種を検索', empty: '条件に合うパートナーはありません。', tabs: ['すべて', 'おすすめ'] },
      quests: { title: 'クエスト', subtitle: '旅行、イベント、コミュニティ、パートナーのクエストでMelo Pointsを獲得。', search: 'クエストやカテゴリを検索', empty: '条件に合うクエストはありません。', tabs: ['すべて', '進行中', '完了'] },
    },
  },
  ko: {
    portal: 'MELO DISCOVER', live: 'Melo 실시간 데이터', refresh: '새로고침', refreshing: '새로고침 중…', loading: '불러오는 중…', retry: '다시 시도', loadFailed: '데이터를 불러오지 못했습니다', all: '전체', categories: '카테고리', results: '개', details: '상세 보기', close: '닫기', date: '날짜', location: '위치', members: '멤버', organizer: '주최자', status: '상태', price: '가격', points: '포인트', progress: '진행률', verified: '인증됨', memberOnly: 'Melo Member', joined: '참여 중', mine: '내 항목', upcoming: '예정', noImage: 'Melo', note: '현재 웹 버전은 Melo 실시간 데이터를 기반으로 탐색과 상세 보기를 제공합니다. 권한과 흐름을 맞추기 위해 일부 중요한 작업은 앱에 유지됩니다.',
    features: {
      trips: { title: '트립', subtitle: '트립, 경로, 여행 날짜와 내 계정에 연결된 트립을 찾아보세요.', search: '트립, 목적지 또는 카테고리 검색', empty: '조건에 맞는 트립이 없습니다.', tabs: ['탐색', '내 트립'] },
      events: { title: '이벤트', subtitle: '날짜와 장소 정보와 함께 참여 가능한 활동과 이벤트를 찾아보세요.', search: '이벤트, 장소 또는 카테고리 검색', empty: '조건에 맞는 이벤트가 없습니다.', tabs: ['탐색', '내 이벤트'] },
      community: { title: '커뮤니티', subtitle: '관심사, 국가와 라이프스타일별 그룹을 찾아보세요.', search: '커뮤니티 또는 관심사 검색', empty: '조건에 맞는 커뮤니티가 없습니다.', tabs: ['탐색', '내 커뮤니티'] },
      deals: { title: '특별 딜', subtitle: '승인된 Melo 파트너의 프로모션, 쿠폰과 패키지입니다.', search: '딜, 파트너 또는 카테고리 검색', empty: '조건에 맞는 딜이 없습니다.', tabs: ['전체 딜', 'Melo Member'] },
      partners: { title: '파트너', subtitle: '숙소, 카페, 매장, 서비스와 경험을 찾아보세요.', search: '파트너, 도시 또는 업종 검색', empty: '조건에 맞는 파트너가 없습니다.', tabs: ['전체 파트너', '추천'] },
      quests: { title: '퀘스트', subtitle: '여행, 이벤트, 커뮤니티 및 파트너 퀘스트를 완료하고 Melo Points를 모으세요.', search: '퀘스트 또는 카테고리 검색', empty: '조건에 맞는 퀘스트가 없습니다.', tabs: ['전체 퀘스트', '진행 중', '완료'] },
    },
  },
};
