import type { Locale } from './dictionaries';

export type ActivityDetailFeature = 'trip' | 'event' | 'community';

type DetailFeatureCopy = {
  title: string;
  back: string;
  about: string;
  route?: string;
  itinerary?: string;
  members: string;
  emptyMembers: string;
  join: string;
  joining: string;
  leave: string;
  leaving: string;
  joined: string;
  owner: string;
  full: string;
  closed: string;
  requestJoin?: string;
  requestAgain?: string;
  requestPending?: string;
  cancelRequest?: string;
  requestMessage?: string;
  requestMessagePlaceholder?: string;
  requestSent?: string;
  requestCancelled?: string;
};

type ActivityDetailCopy = {
  live: string;
  loading: string;
  loadFailed: string;
  notFound: string;
  retry: string;
  date: string;
  location: string;
  organizer: string;
  category: string;
  language: string;
  capacity: string;
  price: string;
  budget: string;
  privacy: string;
  status: string;
  remaining: string;
  people: string;
  free: string;
  confirmLeave: string;
  actionFailed: string;
  refresh: string;
  open: string;
  features: Record<ActivityDetailFeature, DetailFeatureCopy>;
};

export const activityDetailCopy: Record<Locale, ActivityDetailCopy> = {
  th: {
    live: 'ข้อมูล Melo แบบเรียลไทม์', loading: 'กำลังโหลดรายละเอียด…', loadFailed: 'โหลดรายละเอียดไม่สำเร็จ', notFound: 'ไม่พบข้อมูลนี้', retry: 'ลองใหม่', date: 'วันและเวลา', location: 'สถานที่', organizer: 'ผู้จัด', category: 'หมวดหมู่', language: 'ภาษาหลัก', capacity: 'จำนวนที่รับ', price: 'ราคา', budget: 'งบต่อคน', privacy: 'ความเป็นส่วนตัว', status: 'สถานะ', remaining: 'เหลือที่ว่าง', people: 'คน', free: 'ฟรี', confirmLeave: 'ยืนยันว่าต้องการยกเลิกการเข้าร่วม?', actionFailed: 'ดำเนินการไม่สำเร็จ', refresh: 'รีเฟรช', open: 'เปิดรับสมาชิก',
    features: {
      trip: { title: 'รายละเอียดทริป', back: 'กลับไปทริป', about: 'เกี่ยวกับทริป', route: 'เส้นทาง', itinerary: 'กำหนดการ', members: 'สมาชิกทริป', emptyMembers: 'ยังไม่มีรายชื่อสมาชิก', join: 'ขอเข้าร่วมทริป', joining: 'กำลังส่งคำขอ…', leave: 'ออกจากทริป', leaving: 'กำลังออก…', joined: 'เข้าร่วมแล้ว', owner: 'คุณเป็นผู้จัดทริป', full: 'ทริปเต็มแล้ว', closed: 'ปิดรับสมาชิก', requestJoin: 'ขอเข้าร่วมทริป', requestAgain: 'ส่งคำขอใหม่', requestPending: 'รอผู้จัดอนุมัติ', cancelRequest: 'ยกเลิกคำขอ', requestMessage: 'ข้อความถึงผู้จัด', requestMessagePlaceholder: 'แนะนำตัวสั้น ๆ หรือบอกเหตุผลที่อยากร่วมทริป (ไม่บังคับ)', requestSent: 'ส่งคำขอเข้าร่วมแล้ว', requestCancelled: 'ยกเลิกคำขอแล้ว' },
      event: { title: 'รายละเอียดกิจกรรม', back: 'กลับไปกิจกรรม', about: 'เกี่ยวกับกิจกรรม', members: 'ผู้เข้าร่วม', emptyMembers: 'ยังไม่มีรายชื่อผู้เข้าร่วม', join: 'เข้าร่วมกิจกรรม', joining: 'กำลังเข้าร่วม…', leave: 'ยกเลิกการเข้าร่วม', leaving: 'กำลังยกเลิก…', joined: 'เข้าร่วมแล้ว', owner: 'คุณเป็นผู้จัดกิจกรรม', full: 'กิจกรรมเต็มแล้ว', closed: 'ปิดรับผู้เข้าร่วม' },
      community: { title: 'รายละเอียดคอมมูนิตี้', back: 'กลับไปคอมมูนิตี้', about: 'เกี่ยวกับคอมมูนิตี้', members: 'สมาชิกคอมมูนิตี้', emptyMembers: 'ยังไม่มีรายชื่อสมาชิก', join: 'เข้าร่วมคอมมูนิตี้', joining: 'กำลังเข้าร่วม…', leave: 'ออกจากคอมมูนิตี้', leaving: 'กำลังออก…', joined: 'เป็นสมาชิกแล้ว', owner: 'คุณเป็นเจ้าของคอมมูนิตี้', full: 'สมาชิกเต็ม', closed: 'ปิดรับสมาชิก' },
    },
  },
  en: {
    live: 'Live Melo data', loading: 'Loading details…', loadFailed: 'Unable to load details', notFound: 'This item was not found', retry: 'Try again', date: 'Date & time', location: 'Location', organizer: 'Organizer', category: 'Category', language: 'Primary language', capacity: 'Capacity', price: 'Price', budget: 'Budget per person', privacy: 'Privacy', status: 'Status', remaining: 'Spots left', people: 'people', free: 'Free', confirmLeave: 'Are you sure you want to leave?', actionFailed: 'Action failed', refresh: 'Refresh', open: 'Open for members',
    features: {
      trip: { title: 'Trip details', back: 'Back to Trips', about: 'About this trip', route: 'Route', itinerary: 'Itinerary', members: 'Trip members', emptyMembers: 'No members to show yet.', join: 'Request to join', joining: 'Sending request…', leave: 'Leave trip', leaving: 'Leaving…', joined: 'Joined', owner: 'You organize this trip', full: 'Trip is full', closed: 'Membership closed', requestJoin: 'Request to join', requestAgain: 'Request again', requestPending: 'Waiting for organizer approval', cancelRequest: 'Cancel request', requestMessage: 'Message to organizer', requestMessagePlaceholder: 'Briefly introduce yourself or say why you want to join (optional)', requestSent: 'Join request sent', requestCancelled: 'Join request cancelled' },
      event: { title: 'Event details', back: 'Back to Events', about: 'About this event', members: 'Attendees', emptyMembers: 'No attendees to show yet.', join: 'Join event', joining: 'Joining…', leave: 'Leave event', leaving: 'Leaving…', joined: 'Joined', owner: 'You organize this event', full: 'Event is full', closed: 'Membership closed' },
      community: { title: 'Community details', back: 'Back to Community', about: 'About this community', members: 'Community members', emptyMembers: 'No members to show yet.', join: 'Join community', joining: 'Joining…', leave: 'Leave community', leaving: 'Leaving…', joined: 'Member', owner: 'You own this community', full: 'Community is full', closed: 'Membership closed' },
    },
  },
  de: {
    live: 'Live-Melo-Daten', loading: 'Details werden geladen…', loadFailed: 'Details konnten nicht geladen werden', notFound: 'Dieser Eintrag wurde nicht gefunden', retry: 'Erneut versuchen', date: 'Datum & Uhrzeit', location: 'Ort', organizer: 'Organisator', category: 'Kategorie', language: 'Hauptsprache', capacity: 'Kapazität', price: 'Preis', budget: 'Budget pro Person', privacy: 'Privatsphäre', status: 'Status', remaining: 'Freie Plätze', people: 'Personen', free: 'Kostenlos', confirmLeave: 'Möchtest du wirklich austreten?', actionFailed: 'Aktion fehlgeschlagen', refresh: 'Aktualisieren', open: 'Mitgliederaufnahme offen',
    features: {
      trip: { title: 'Trip-Details', back: 'Zurück zu Trips', about: 'Über diesen Trip', route: 'Route', itinerary: 'Reiseplan', members: 'Trip-Mitglieder', emptyMembers: 'Noch keine Mitglieder sichtbar.', join: 'Beitritt anfragen', joining: 'Anfrage wird gesendet…', leave: 'Trip verlassen', leaving: 'Wird verlassen…', joined: 'Beigetreten', owner: 'Du organisierst diesen Trip', full: 'Trip ist voll', closed: 'Aufnahme geschlossen', requestJoin: 'Beitritt anfragen', requestAgain: 'Erneut anfragen', requestPending: 'Wartet auf Freigabe', cancelRequest: 'Anfrage abbrechen', requestMessage: 'Nachricht an den Organisator', requestMessagePlaceholder: 'Stell dich kurz vor oder nenne deinen Grund (optional)', requestSent: 'Beitrittsanfrage gesendet', requestCancelled: 'Anfrage abgebrochen' },
      event: { title: 'Event-Details', back: 'Zurück zu Events', about: 'Über dieses Event', members: 'Teilnehmende', emptyMembers: 'Noch keine Teilnehmenden sichtbar.', join: 'Event beitreten', joining: 'Beitritt…', leave: 'Event verlassen', leaving: 'Wird verlassen…', joined: 'Beigetreten', owner: 'Du organisierst dieses Event', full: 'Event ist voll', closed: 'Aufnahme geschlossen' },
      community: { title: 'Community-Details', back: 'Zurück zur Community', about: 'Über diese Community', members: 'Community-Mitglieder', emptyMembers: 'Noch keine Mitglieder sichtbar.', join: 'Community beitreten', joining: 'Beitritt…', leave: 'Community verlassen', leaving: 'Wird verlassen…', joined: 'Mitglied', owner: 'Du besitzt diese Community', full: 'Community ist voll', closed: 'Aufnahme geschlossen' },
    },
  },
  zh: {
    live: 'Melo 实时数据', loading: '正在加载详情…', loadFailed: '无法加载详情', notFound: '未找到此内容', retry: '重试', date: '日期与时间', location: '地点', organizer: '组织者', category: '分类', language: '主要语言', capacity: '人数上限', price: '价格', budget: '人均预算', privacy: '隐私', status: '状态', remaining: '剩余名额', people: '人', free: '免费', confirmLeave: '确定要退出吗？', actionFailed: '操作失败', refresh: '刷新', open: '开放加入',
    features: {
      trip: { title: '行程详情', back: '返回行程', about: '关于此行程', route: '路线', itinerary: '行程安排', members: '行程成员', emptyMembers: '暂时没有成员可显示。', join: '申请加入', joining: '正在发送申请…', leave: '退出行程', leaving: '正在退出…', joined: '已加入', owner: '你是此行程的组织者', full: '行程已满', closed: '已关闭加入', requestJoin: '申请加入', requestAgain: '重新申请', requestPending: '等待组织者批准', cancelRequest: '取消申请', requestMessage: '给组织者的留言', requestMessagePlaceholder: '简单介绍自己或说明想加入的原因（选填）', requestSent: '已发送加入申请', requestCancelled: '已取消申请' },
      event: { title: '活动详情', back: '返回活动', about: '关于此活动', members: '参与者', emptyMembers: '暂时没有参与者可显示。', join: '参加活动', joining: '正在加入…', leave: '退出活动', leaving: '正在退出…', joined: '已参加', owner: '你是此活动的组织者', full: '活动已满', closed: '已关闭加入' },
      community: { title: '社区详情', back: '返回社区', about: '关于此社区', members: '社区成员', emptyMembers: '暂时没有成员可显示。', join: '加入社区', joining: '正在加入…', leave: '退出社区', leaving: '正在退出…', joined: '已加入', owner: '你是此社区的创建者', full: '社区人数已满', closed: '已关闭加入' },
    },
  },
  ja: {
    live: 'Meloライブデータ', loading: '詳細を読み込み中…', loadFailed: '詳細を読み込めません', notFound: '項目が見つかりません', retry: '再試行', date: '日時', location: '場所', organizer: '主催者', category: 'カテゴリ', language: 'メイン言語', capacity: '定員', price: '価格', budget: '1人あたり予算', privacy: '公開設定', status: 'ステータス', remaining: '残り枠', people: '人', free: '無料', confirmLeave: '本当に退出しますか？', actionFailed: '操作に失敗しました', refresh: '更新', open: '参加受付中',
    features: {
      trip: { title: 'トリップ詳細', back: 'トリップへ戻る', about: 'このトリップについて', route: 'ルート', itinerary: '旅程', members: 'トリップメンバー', emptyMembers: '表示できるメンバーはまだいません。', join: '参加リクエスト', joining: '送信中…', leave: 'トリップを退出', leaving: '退出中…', joined: '参加済み', owner: 'あなたが主催するトリップです', full: '満員です', closed: '参加受付終了', requestJoin: '参加リクエスト', requestAgain: '再リクエスト', requestPending: '主催者の承認待ち', cancelRequest: 'リクエスト取消', requestMessage: '主催者へのメッセージ', requestMessagePlaceholder: '簡単な自己紹介や参加理由（任意）', requestSent: '参加リクエストを送信しました', requestCancelled: 'リクエストを取り消しました' },
      event: { title: 'イベント詳細', back: 'イベントへ戻る', about: 'このイベントについて', members: '参加者', emptyMembers: '表示できる参加者はまだいません。', join: 'イベントに参加', joining: '参加中…', leave: 'イベントを退出', leaving: '退出中…', joined: '参加済み', owner: 'あなたが主催するイベントです', full: '満員です', closed: '参加受付終了' },
      community: { title: 'コミュニティ詳細', back: 'コミュニティへ戻る', about: 'このコミュニティについて', members: 'コミュニティメンバー', emptyMembers: '表示できるメンバーはまだいません。', join: 'コミュニティに参加', joining: '参加中…', leave: 'コミュニティを退出', leaving: '退出中…', joined: 'メンバー', owner: 'あなたがオーナーです', full: '満員です', closed: '参加受付終了' },
    },
  },
  ko: {
    live: 'Melo 실시간 데이터', loading: '상세 정보를 불러오는 중…', loadFailed: '상세 정보를 불러오지 못했습니다', notFound: '항목을 찾을 수 없습니다', retry: '다시 시도', date: '날짜 및 시간', location: '위치', organizer: '주최자', category: '카테고리', language: '기본 언어', capacity: '정원', price: '가격', budget: '1인 예산', privacy: '공개 범위', status: '상태', remaining: '남은 자리', people: '명', free: '무료', confirmLeave: '정말 나가시겠습니까?', actionFailed: '작업에 실패했습니다', refresh: '새로고침', open: '가입 가능',
    features: {
      trip: { title: '트립 상세', back: '트립으로 돌아가기', about: '트립 소개', route: '경로', itinerary: '일정', members: '트립 멤버', emptyMembers: '표시할 멤버가 아직 없습니다.', join: '참여 요청', joining: '요청 보내는 중…', leave: '트립 나가기', leaving: '나가는 중…', joined: '참여 중', owner: '내가 주최하는 트립입니다', full: '트립이 가득 찼습니다', closed: '가입 마감', requestJoin: '참여 요청', requestAgain: '다시 요청', requestPending: '주최자 승인 대기 중', cancelRequest: '요청 취소', requestMessage: '주최자에게 보낼 메시지', requestMessagePlaceholder: '간단한 소개나 참여 이유를 적어주세요 (선택)', requestSent: '참여 요청을 보냈습니다', requestCancelled: '요청을 취소했습니다' },
      event: { title: '이벤트 상세', back: '이벤트로 돌아가기', about: '이벤트 소개', members: '참여자', emptyMembers: '표시할 참여자가 아직 없습니다.', join: '이벤트 참여', joining: '참여 중…', leave: '이벤트 나가기', leaving: '나가는 중…', joined: '참여 중', owner: '내가 주최하는 이벤트입니다', full: '이벤트가 가득 찼습니다', closed: '가입 마감' },
      community: { title: '커뮤니티 상세', back: '커뮤니티로 돌아가기', about: '커뮤니티 소개', members: '커뮤니티 멤버', emptyMembers: '표시할 멤버가 아직 없습니다.', join: '커뮤니티 가입', joining: '가입 중…', leave: '커뮤니티 나가기', leaving: '나가는 중…', joined: '가입됨', owner: '내가 만든 커뮤니티입니다', full: '커뮤니티가 가득 찼습니다', closed: '가입 마감' },
    },
  },
};
