import type { Locale } from './dictionaries';

export type ActivityChatFeature = 'trip' | 'event' | 'community';

type ActivityChatCopy = {
  eyebrow: string;
  room: string;
  back: string;
  loading: string;
  loadFailed: string;
  retry: string;
  refresh: string;
  live: string;
  accessDenied: string;
  accessDeniedBody: string;
  messages: string;
  noMessages: string;
  composerPlaceholder: string;
  send: string;
  sending: string;
  translated: string;
  original: string;
  photo: string;
  location: string;
  openMap: string;
  sticker: string;
  announcement: string;
  announcements: string;
  latestAnnouncement: string;
  noAnnouncements: string;
  publishAnnouncement: string;
  publish: string;
  publishing: string;
  announcementPlaceholder: string;
  announcementBy: string;
  showAll: string;
  hideHistory: string;
  chatClosed: string;
  announcementOnly: string;
  archived: string;
  postActivity: string;
  active: string;
  chars: string;
  sendFailed: string;
  publishFailed: string;
  openChat: string;
  features: Record<ActivityChatFeature, { title: string; backLabel: string }>;
};

export const activityChatCopy: Record<Locale, ActivityChatCopy> = {
  th: {
    eyebrow: 'MELO CHAT', room: 'ห้องสนทนา', back: 'กลับ', loading: 'กำลังโหลดห้องสนทนา…', loadFailed: 'โหลดห้องสนทนาไม่สำเร็จ', retry: 'ลองใหม่', refresh: 'รีเฟรช', live: 'อัปเดตอัตโนมัติ', accessDenied: 'คุณยังเข้าแชทนี้ไม่ได้', accessDeniedBody: 'ต้องเป็นผู้จัดหรือสมาชิกที่เข้าร่วมแล้วก่อน จึงจะอ่านและส่งข้อความในห้องนี้ได้', messages: 'ข้อความ', noMessages: 'ยังไม่มีข้อความ เริ่มบทสนทนาได้เลย', composerPlaceholder: 'พิมพ์ข้อความถึงสมาชิก…', send: 'ส่ง', sending: 'กำลังส่ง…', translated: 'แปลแล้ว', original: 'ข้อความต้นฉบับ', photo: 'รูปภาพ', location: 'ตำแหน่ง', openMap: 'เปิดแผนที่', sticker: 'สติ๊กเกอร์', announcement: 'ประกาศ', announcements: 'ประกาศทั้งหมด', latestAnnouncement: 'ประกาศล่าสุด', noAnnouncements: 'ยังไม่มีประกาศจากผู้ดูแล', publishAnnouncement: 'สร้างประกาศ', publish: 'เผยแพร่ประกาศ', publishing: 'กำลังเผยแพร่…', announcementPlaceholder: 'พิมพ์ข้อความประกาศถึงสมาชิก เช่น เปลี่ยนเวลานัดหมาย…', announcementBy: 'โดย', showAll: 'ดูทั้งหมด', hideHistory: 'ซ่อนรายการ', chatClosed: 'ห้องแชทนี้ปิดการส่งข้อความแล้ว', announcementOnly: 'ห้องนี้อยู่ในโหมดประกาศ สมาชิกอ่านประกาศได้ แต่ส่งข้อความทั่วไปไม่ได้', archived: 'ห้องสนทนาถูกเก็บถาวรแล้ว', postActivity: 'ยังพูดคุยต่อได้หลังจบกิจกรรมตามช่วงเวลาที่กำหนด', active: 'ห้องสนทนากำลังใช้งาน', chars: 'ตัวอักษร', sendFailed: 'ส่งข้อความไม่สำเร็จ', publishFailed: 'สร้างประกาศไม่สำเร็จ', openChat: 'เปิดห้องแชท',
    features: { trip: { title: 'แชททริป', backLabel: 'กลับไปรายละเอียดทริป' }, event: { title: 'แชทกิจกรรม', backLabel: 'กลับไปรายละเอียดกิจกรรม' }, community: { title: 'แชทคอมมูนิตี้', backLabel: 'กลับไปคอมมูนิตี้' } },
  },
  en: {
    eyebrow: 'MELO CHAT', room: 'Conversation room', back: 'Back', loading: 'Loading conversation…', loadFailed: 'Unable to load chat', retry: 'Try again', refresh: 'Refresh', live: 'Auto refresh', accessDenied: 'You cannot access this chat yet', accessDeniedBody: 'You must be the organizer or an approved member before you can read and send messages in this room.', messages: 'Messages', noMessages: 'No messages yet. Start the conversation.', composerPlaceholder: 'Message the members…', send: 'Send', sending: 'Sending…', translated: 'Translated', original: 'Original', photo: 'Photo', location: 'Location', openMap: 'Open map', sticker: 'Sticker', announcement: 'Announcement', announcements: 'All announcements', latestAnnouncement: 'Latest announcement', noAnnouncements: 'No organizer announcements yet.', publishAnnouncement: 'New announcement', publish: 'Publish announcement', publishing: 'Publishing…', announcementPlaceholder: 'Write an announcement for members, e.g. the meeting time has changed…', announcementBy: 'By', showAll: 'View all', hideHistory: 'Hide history', chatClosed: 'This room is no longer accepting regular messages.', announcementOnly: 'This room is in announcement-only mode. Members can read announcements but cannot send regular chat messages.', archived: 'This conversation has been archived.', postActivity: 'Members can keep chatting for the configured period after the activity ends.', active: 'Conversation is active', chars: 'characters', sendFailed: 'Unable to send message', publishFailed: 'Unable to publish announcement', openChat: 'Open chat',
    features: { trip: { title: 'Trip chat', backLabel: 'Back to trip details' }, event: { title: 'Event chat', backLabel: 'Back to event details' }, community: { title: 'Community chat', backLabel: 'Back to community' } },
  },
  de: {
    eyebrow: 'MELO CHAT', room: 'Chatraum', back: 'Zurück', loading: 'Chat wird geladen…', loadFailed: 'Chat konnte nicht geladen werden', retry: 'Erneut versuchen', refresh: 'Aktualisieren', live: 'Automatische Aktualisierung', accessDenied: 'Du hast noch keinen Zugriff auf diesen Chat', accessDeniedBody: 'Du musst Organisator oder bestätigtes Mitglied sein, um Nachrichten in diesem Raum zu lesen und zu senden.', messages: 'Nachrichten', noMessages: 'Noch keine Nachrichten. Starte die Unterhaltung.', composerPlaceholder: 'Nachricht an die Mitglieder…', send: 'Senden', sending: 'Wird gesendet…', translated: 'Übersetzt', original: 'Original', photo: 'Foto', location: 'Standort', openMap: 'Karte öffnen', sticker: 'Sticker', announcement: 'Ankündigung', announcements: 'Alle Ankündigungen', latestAnnouncement: 'Neueste Ankündigung', noAnnouncements: 'Noch keine Ankündigungen.', publishAnnouncement: 'Neue Ankündigung', publish: 'Veröffentlichen', publishing: 'Wird veröffentlicht…', announcementPlaceholder: 'Schreibe eine Ankündigung für die Mitglieder…', announcementBy: 'Von', showAll: 'Alle anzeigen', hideHistory: 'Verlauf ausblenden', chatClosed: 'In diesem Raum können keine normalen Nachrichten mehr gesendet werden.', announcementOnly: 'Dieser Raum ist nur für Ankündigungen. Mitglieder können lesen, aber keine normalen Nachrichten senden.', archived: 'Dieser Chat wurde archiviert.', postActivity: 'Nach dem Ende kann für den festgelegten Zeitraum weiter gechattet werden.', active: 'Chat ist aktiv', chars: 'Zeichen', sendFailed: 'Nachricht konnte nicht gesendet werden', publishFailed: 'Ankündigung konnte nicht veröffentlicht werden', openChat: 'Chat öffnen',
    features: { trip: { title: 'Trip-Chat', backLabel: 'Zurück zu den Trip-Details' }, event: { title: 'Event-Chat', backLabel: 'Zurück zu den Event-Details' }, community: { title: 'Community-Chat', backLabel: 'Zurück zur Community' } },
  },
  zh: {
    eyebrow: 'MELO CHAT', room: '聊天室', back: '返回', loading: '正在加载聊天…', loadFailed: '聊天加载失败', retry: '重试', refresh: '刷新', live: '自动刷新', accessDenied: '你暂时无法进入此聊天', accessDeniedBody: '你需要是组织者或已加入的成员，才能阅读和发送此聊天室的消息。', messages: '消息', noMessages: '还没有消息，开始聊天吧。', composerPlaceholder: '给成员发送消息…', send: '发送', sending: '正在发送…', translated: '已翻译', original: '原文', photo: '图片', location: '位置', openMap: '打开地图', sticker: '贴纸', announcement: '公告', announcements: '全部公告', latestAnnouncement: '最新公告', noAnnouncements: '暂时没有管理员公告。', publishAnnouncement: '发布公告', publish: '发布公告', publishing: '正在发布…', announcementPlaceholder: '给成员写一条公告，例如集合时间有变化…', announcementBy: '发布者', showAll: '查看全部', hideHistory: '收起记录', chatClosed: '此聊天室已停止发送普通消息。', announcementOnly: '此聊天室为仅公告模式，成员可以阅读公告，但不能发送普通消息。', archived: '此聊天已归档。', postActivity: '活动结束后仍可在设定期限内继续聊天。', active: '聊天室正在使用', chars: '字符', sendFailed: '消息发送失败', publishFailed: '公告发布失败', openChat: '打开聊天',
    features: { trip: { title: '旅行聊天', backLabel: '返回旅行详情' }, event: { title: '活动聊天', backLabel: '返回活动详情' }, community: { title: '社区聊天', backLabel: '返回社区' } },
  },
  ja: {
    eyebrow: 'MELO CHAT', room: 'チャットルーム', back: '戻る', loading: 'チャットを読み込み中…', loadFailed: 'チャットを読み込めませんでした', retry: '再試行', refresh: '更新', live: '自動更新', accessDenied: 'まだこのチャットにアクセスできません', accessDeniedBody: '主催者または参加済みメンバーになると、このルームのメッセージを閲覧・送信できます。', messages: 'メッセージ', noMessages: 'まだメッセージはありません。会話を始めましょう。', composerPlaceholder: 'メンバーにメッセージ…', send: '送信', sending: '送信中…', translated: '翻訳済み', original: '原文', photo: '写真', location: '位置情報', openMap: '地図を開く', sticker: 'ステッカー', announcement: 'お知らせ', announcements: 'すべてのお知らせ', latestAnnouncement: '最新のお知らせ', noAnnouncements: '主催者からのお知らせはまだありません。', publishAnnouncement: 'お知らせを作成', publish: 'お知らせを公開', publishing: '公開中…', announcementPlaceholder: '集合時間の変更など、メンバーへのお知らせを入力…', announcementBy: '投稿者', showAll: 'すべて見る', hideHistory: '履歴を閉じる', chatClosed: 'このルームでは通常メッセージを送信できません。', announcementOnly: 'このルームはお知らせ専用です。メンバーはお知らせを読めますが通常メッセージは送信できません。', archived: 'このチャットはアーカイブされました。', postActivity: '活動終了後も設定された期間は会話を続けられます。', active: 'チャットは利用中です', chars: '文字', sendFailed: 'メッセージを送信できませんでした', publishFailed: 'お知らせを公開できませんでした', openChat: 'チャットを開く',
    features: { trip: { title: 'Tripチャット', backLabel: 'Trip詳細に戻る' }, event: { title: 'イベントチャット', backLabel: 'イベント詳細に戻る' }, community: { title: 'コミュニティチャット', backLabel: 'コミュニティに戻る' } },
  },
  ko: {
    eyebrow: 'MELO CHAT', room: '채팅방', back: '뒤로', loading: '채팅을 불러오는 중…', loadFailed: '채팅을 불러오지 못했습니다', retry: '다시 시도', refresh: '새로고침', live: '자동 새로고침', accessDenied: '아직 이 채팅에 접근할 수 없습니다', accessDeniedBody: '주최자이거나 참여가 승인된 멤버만 이 방의 메시지를 읽고 보낼 수 있습니다.', messages: '메시지', noMessages: '아직 메시지가 없습니다. 대화를 시작해 보세요.', composerPlaceholder: '멤버에게 메시지…', send: '보내기', sending: '전송 중…', translated: '번역됨', original: '원문', photo: '사진', location: '위치', openMap: '지도 열기', sticker: '스티커', announcement: '공지', announcements: '전체 공지', latestAnnouncement: '최신 공지', noAnnouncements: '아직 운영자 공지가 없습니다.', publishAnnouncement: '공지 작성', publish: '공지 게시', publishing: '게시 중…', announcementPlaceholder: '모임 시간 변경 등 멤버에게 전달할 공지를 작성하세요…', announcementBy: '작성자', showAll: '전체 보기', hideHistory: '기록 숨기기', chatClosed: '이 채팅방은 일반 메시지 전송이 종료되었습니다.', announcementOnly: '이 방은 공지 전용 모드입니다. 멤버는 공지를 읽을 수 있지만 일반 채팅은 보낼 수 없습니다.', archived: '이 채팅은 보관되었습니다.', postActivity: '활동 종료 후 설정된 기간 동안 계속 대화할 수 있습니다.', active: '채팅방 사용 중', chars: '자', sendFailed: '메시지를 보내지 못했습니다', publishFailed: '공지를 게시하지 못했습니다', openChat: '채팅 열기',
    features: { trip: { title: '여행 채팅', backLabel: '여행 상세로 돌아가기' }, event: { title: '이벤트 채팅', backLabel: '이벤트 상세로 돌아가기' }, community: { title: '커뮤니티 채팅', backLabel: '커뮤니티로 돌아가기' } },
  },
};
