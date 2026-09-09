import type { Locale } from './dictionaries';

export type MemberFeature = 'friends' | 'love' | 'deals' | 'partners' | 'trips' | 'events' | 'community' | 'quests';

type FeatureCopy = { title: string; subtitle: string; empty: string; };
type MemberCopy = {
  portal: string;
  liveData: string;
  refresh: string;
  refreshing: string;
  loading: string;
  retry: string;
  open: string;
  noData: string;
  loadFailed: string;
  match: string;
  location: string;
  members: string;
  people: string;
  date: string;
  points: string;
  price: string;
  status: string;
  liked: string;
  likesYou: string;
  saved: string;
  matched: string;
  results: string;
  webNote: string;
  features: Record<MemberFeature, FeatureCopy>;
};

export const memberCopy: Record<Locale, MemberCopy> = {
  th: {
    portal: 'MELO MEMBER', liveData: 'ข้อมูลจากบัญชี Melo', refresh: 'รีเฟรช', refreshing: 'กำลังรีเฟรช…', loading: 'กำลังโหลดข้อมูล…', retry: 'ลองใหม่', open: 'เปิดดู', noData: 'ยังไม่มีข้อมูลในส่วนนี้', loadFailed: 'โหลดข้อมูลไม่สำเร็จ', match: 'เข้ากัน', location: 'สถานที่', members: 'สมาชิก', people: 'คน', date: 'วันที่', points: 'แต้ม', price: 'ราคา', status: 'สถานะ', liked: 'ถูกใจแล้ว', likesYou: 'ถูกใจคุณ', saved: 'บันทึก', matched: 'จับคู่', results: 'รายการ', webNote: 'Melo Web รุ่นนี้เริ่มจากการดูและค้นหาข้อมูล ส่วนการทำรายการที่ละเอียดจะทยอยเปิดตามระบบในแอป',
    features: {
      friends: { title: 'หาเพื่อน', subtitle: 'ค้นหาคนที่มีไลฟ์สไตล์ ภาษา และความสนใจใกล้เคียงกัน', empty: 'ยังไม่มีคำแนะนำเพื่อนในตอนนี้' },
      love: { title: 'หาคู่', subtitle: 'ดูสถานะการถูกใจ บันทึก และการจับคู่จากบัญชี Melo ของคุณ', empty: 'ยังไม่มีข้อมูลการหาคู่ในตอนนี้' },
      deals: { title: 'ดีลพิเศษ', subtitle: 'ดูโปรโมชัน คูปอง และแพ็กเกจจากพาร์ทเนอร์ที่ผ่านการอนุมัติ', empty: 'ยังไม่มีดีลพิเศษที่พร้อมแสดง' },
      partners: { title: 'พาร์ทเนอร์', subtitle: 'ค้นหาร้านค้า ที่พัก บริการ และประสบการณ์จาก Melo Partner', empty: 'ยังไม่มีพาร์ทเนอร์ที่พร้อมแสดง' },
      trips: { title: 'ทริป', subtitle: 'ดูทริปสาธารณะและทริปที่เกี่ยวข้องกับบัญชีของคุณ', empty: 'ยังไม่มีทริปที่พร้อมแสดง' },
      events: { title: 'กิจกรรม', subtitle: 'ค้นหากิจกรรมและอีเวนต์ที่เปิดให้เข้าร่วม', empty: 'ยังไม่มีกิจกรรมที่พร้อมแสดง' },
      community: { title: 'คอมมูนิตี้', subtitle: 'ค้นหากลุ่มความสนใจและคอมมูนิตี้ของ Melo', empty: 'ยังไม่มีคอมมูนิตี้ที่พร้อมแสดง' },
      quests: { title: 'ภารกิจ', subtitle: 'ดูภารกิจ ความคืบหน้า และ Melo Points ของคุณ', empty: 'ยังไม่มีภารกิจที่พร้อมใช้งาน' },
    },
  },
  en: {
    portal: 'MELO MEMBER', liveData: 'Live Melo account data', refresh: 'Refresh', refreshing: 'Refreshing…', loading: 'Loading…', retry: 'Try again', open: 'Open', noData: 'Nothing here yet', loadFailed: 'Unable to load data', match: 'match', location: 'Location', members: 'members', people: 'people', date: 'Date', points: 'points', price: 'Price', status: 'Status', liked: 'Liked', likesYou: 'Likes you', saved: 'Saved', matched: 'Matched', results: 'items', webNote: 'This Melo Web release starts with discovery and account viewing. Detailed actions will roll out in sync with the app.',
    features: {
      friends: { title: 'Find Friends', subtitle: 'Discover people with similar lifestyles, languages and interests.', empty: 'No friend suggestions are available right now.' },
      love: { title: 'Love', subtitle: 'View your likes, saved profiles and matches from your Melo account.', empty: 'No dating activity is available yet.' },
      deals: { title: 'Special Deals', subtitle: 'Browse promotions, coupons and packages from approved Melo partners.', empty: 'No special deals are available right now.' },
      partners: { title: 'Partners', subtitle: 'Discover stores, stays, services and experiences from Melo Partners.', empty: 'No partners are available right now.' },
      trips: { title: 'Trips', subtitle: 'Browse public trips and trips connected to your account.', empty: 'No trips are available right now.' },
      events: { title: 'Events', subtitle: 'Discover activities and events that are open to join.', empty: 'No events are available right now.' },
      community: { title: 'Community', subtitle: 'Find interest groups and Melo communities.', empty: 'No communities are available right now.' },
      quests: { title: 'Quests', subtitle: 'Track quests, progress and your Melo Points.', empty: 'No quests are available right now.' },
    },
  },
  de: {
    portal: 'MELO MEMBER', liveData: 'Live-Daten deines Melo-Kontos', refresh: 'Aktualisieren', refreshing: 'Aktualisieren…', loading: 'Wird geladen…', retry: 'Erneut versuchen', open: 'Öffnen', noData: 'Noch keine Daten', loadFailed: 'Daten konnten nicht geladen werden', match: 'Match', location: 'Ort', members: 'Mitglieder', people: 'Personen', date: 'Datum', points: 'Punkte', price: 'Preis', status: 'Status', liked: 'Geliked', likesYou: 'Mag dich', saved: 'Gespeichert', matched: 'Matches', results: 'Einträge', webNote: 'Melo Web startet mit Entdecken und Kontoeinblicken. Weitere Aktionen folgen synchron zur App.',
    features: {
      friends: { title: 'Freunde finden', subtitle: 'Entdecke Menschen mit ähnlichem Lifestyle, Sprachen und Interessen.', empty: 'Zurzeit keine Freundschaftsvorschläge.' },
      love: { title: 'Love', subtitle: 'Sieh Likes, gespeicherte Profile und Matches deines Melo-Kontos.', empty: 'Zurzeit keine Dating-Aktivität.' },
      deals: { title: 'Spezialangebote', subtitle: 'Entdecke Aktionen, Gutscheine und Pakete geprüfter Melo-Partner.', empty: 'Zurzeit keine Spezialangebote.' },
      partners: { title: 'Partner', subtitle: 'Entdecke Shops, Unterkünfte, Services und Erlebnisse.', empty: 'Zurzeit keine Partner verfügbar.' },
      trips: { title: 'Reisen', subtitle: 'Öffentliche Reisen und deine zugehörigen Trips ansehen.', empty: 'Zurzeit keine Reisen verfügbar.' },
      events: { title: 'Events', subtitle: 'Aktivitäten und Events entdecken, denen du beitreten kannst.', empty: 'Zurzeit keine Events verfügbar.' },
      community: { title: 'Community', subtitle: 'Interessengruppen und Melo-Communities entdecken.', empty: 'Zurzeit keine Communities verfügbar.' },
      quests: { title: 'Quests', subtitle: 'Quests, Fortschritt und Melo Points verfolgen.', empty: 'Zurzeit keine Quests verfügbar.' },
    },
  },
  zh: {
    portal: 'MELO MEMBER', liveData: 'Melo 账户实时数据', refresh: '刷新', refreshing: '正在刷新…', loading: '正在加载…', retry: '重试', open: '查看', noData: '暂时没有内容', loadFailed: '无法加载数据', match: '匹配', location: '地点', members: '成员', people: '人', date: '日期', points: '积分', price: '价格', status: '状态', liked: '已喜欢', likesYou: '喜欢你', saved: '已收藏', matched: '已匹配', results: '条', webNote: '当前 Melo Web 先提供发现与账户查看，更多操作功能会逐步与 App 同步开放。',
    features: {
      friends: { title: '找朋友', subtitle: '发现生活方式、语言和兴趣相近的人。', empty: '目前没有朋友推荐。' },
      love: { title: '恋爱', subtitle: '查看你的喜欢、收藏和匹配状态。', empty: '目前没有恋爱相关数据。' },
      deals: { title: '特别优惠', subtitle: '浏览通过审核的 Melo 合作伙伴优惠、优惠券与套餐。', empty: '目前没有特别优惠。' },
      partners: { title: '合作伙伴', subtitle: '发现商店、住宿、服务和体验。', empty: '目前没有可显示的合作伙伴。' },
      trips: { title: '行程', subtitle: '浏览公开行程以及与你账户相关的行程。', empty: '目前没有行程。' },
      events: { title: '活动', subtitle: '发现可参加的活动与事件。', empty: '目前没有活动。' },
      community: { title: '社区', subtitle: '发现兴趣小组与 Melo 社区。', empty: '目前没有社区。' },
      quests: { title: '任务', subtitle: '查看任务、进度与 Melo Points。', empty: '目前没有可用任务。' },
    },
  },
  ja: {
    portal: 'MELO MEMBER', liveData: 'Meloアカウントのライブデータ', refresh: '更新', refreshing: '更新中…', loading: '読み込み中…', retry: '再試行', open: '開く', noData: 'まだデータがありません', loadFailed: 'データを読み込めません', match: 'マッチ', location: '場所', members: 'メンバー', people: '人', date: '日付', points: 'ポイント', price: '価格', status: 'ステータス', liked: 'いいね済み', likesYou: 'あなたへのいいね', saved: '保存', matched: 'マッチ', results: '件', webNote: '現在のMelo Webは検索・閲覧を中心に提供しています。詳細操作はアプリと連動して順次追加されます。',
    features: {
      friends: { title: '友だちを探す', subtitle: 'ライフスタイル、言語、興味が近い人を見つけます。', empty: '現在おすすめの友だちはありません。' },
      love: { title: '恋愛', subtitle: 'いいね、保存、マッチ状況を確認できます。', empty: '現在恋愛データはありません。' },
      deals: { title: '特別オファー', subtitle: '承認済みMelo Partnerのプロモーションやクーポンを探します。', empty: '現在特別オファーはありません。' },
      partners: { title: 'パートナー', subtitle: '店舗、宿泊、サービス、体験を探します。', empty: '現在パートナー情報はありません。' },
      trips: { title: 'トリップ', subtitle: '公開トリップと自分に関連するトリップを確認します。', empty: '現在トリップはありません。' },
      events: { title: 'イベント', subtitle: '参加可能なアクティビティやイベントを探します。', empty: '現在イベントはありません。' },
      community: { title: 'コミュニティ', subtitle: '興味のあるグループやMeloコミュニティを探します。', empty: '現在コミュニティはありません。' },
      quests: { title: 'クエスト', subtitle: 'クエスト、進捗、Melo Pointsを確認します。', empty: '現在クエストはありません。' },
    },
  },
  ko: {
    portal: 'MELO MEMBER', liveData: 'Melo 계정 실시간 데이터', refresh: '새로고침', refreshing: '새로고침 중…', loading: '불러오는 중…', retry: '다시 시도', open: '열기', noData: '아직 데이터가 없습니다', loadFailed: '데이터를 불러오지 못했습니다', match: '매치', location: '위치', members: '멤버', people: '명', date: '날짜', points: '포인트', price: '가격', status: '상태', liked: '좋아요', likesYou: '나를 좋아함', saved: '저장', matched: '매치', results: '개', webNote: '현재 Melo Web은 탐색과 계정 조회부터 제공합니다. 세부 기능은 앱과 연동해 순차적으로 추가됩니다.',
    features: {
      friends: { title: '친구 찾기', subtitle: '라이프스타일, 언어, 관심사가 비슷한 사람을 찾아보세요.', empty: '현재 추천 친구가 없습니다.' },
      love: { title: '연애', subtitle: '좋아요, 저장, 매치 상태를 확인하세요.', empty: '현재 연애 관련 데이터가 없습니다.' },
      deals: { title: '특별 딜', subtitle: '승인된 Melo 파트너의 프로모션, 쿠폰, 패키지를 확인하세요.', empty: '현재 특별 딜이 없습니다.' },
      partners: { title: '파트너', subtitle: '매장, 숙소, 서비스와 경험을 찾아보세요.', empty: '현재 표시할 파트너가 없습니다.' },
      trips: { title: '트립', subtitle: '공개 트립과 내 계정에 연결된 트립을 확인하세요.', empty: '현재 트립이 없습니다.' },
      events: { title: '이벤트', subtitle: '참여 가능한 활동과 이벤트를 찾아보세요.', empty: '현재 이벤트가 없습니다.' },
      community: { title: '커뮤니티', subtitle: '관심사 그룹과 Melo 커뮤니티를 찾아보세요.', empty: '현재 커뮤니티가 없습니다.' },
      quests: { title: '퀘스트', subtitle: '퀘스트, 진행률과 Melo Points를 확인하세요.', empty: '현재 사용 가능한 퀘스트가 없습니다.' },
    },
  },
};
