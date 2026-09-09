import type { Locale } from '@/i18n/dictionaries';

export type CommerceDetailCopy = {
  back: string; partner: string; deal: string; verified: string; save: string; saved: string; share: string;
  services: string; about: string; contact: string; address: string; website: string; language: string; reviews: string;
  noServices: string; noReviews: string; from: string; original: string; validUntil: string; memberOnly: string;
  includes: string; excludes: string; duration: string; guests: string; minutes: string;
  ask: string; askTitle: string; askPlaceholder: string; send: string; sent: string; close: string;
  claim: string; claimed: string; couponCode: string; buy: string; buying: string; payment: string; amount: string;
  paymentPending: string; paymentPaid: string; refreshPayment: string; expires: string; voucher: string;
  loginRequired: string; notFound: string; loadFailed: string; retry: string; loading: string; actionFailed: string;
  infoOnly: string; inquiryMode: string; instantMode: string; serviceSaved: string; serviceUnsaved: string;
  openPartner: string; browseMore: string; dealDetails: string; menuDetails: string; serviceUsers: string; people: string;
  moreFromPartner: string; moreFromPartnerDesc: string; serviceCategories: string; allCategories: string;
  serviceInfo: string; serviceArea: string; serviceLanguages: string; amenities: string; pets: string; petsAllowed: string; petsNotAllowed: string;
  booking: string; bookingChat: string; bookingRequest: string; bookingExternal: string; bookingWalkIn: string; openBooking: string;
  serviceHours: string; closed: string; viewReviews: string; reviewTitle: string;
  seeMore: string; partnerDetails: string; openMap: string;
  mon: string; tue: string; wed: string; thu: string; fri: string; sat: string; sun: string;
};

const th: CommerceDetailCopy = {
  back:'กลับ', partner:'พาร์ทเนอร์', deal:'ดีลพิเศษ', verified:'ผ่านการยืนยัน', save:'บันทึก', saved:'บันทึกแล้ว', share:'แชร์',
  services:'สินค้า / บริการ', about:'เกี่ยวกับร้าน', contact:'ข้อมูลติดต่อ', address:'ที่อยู่', website:'เว็บไซต์', language:'ภาษา', reviews:'รีวิว',
  noServices:'ยังไม่มีสินค้า/บริการที่เปิดให้ใช้งาน', noReviews:'ยังไม่มีรีวิว', from:'เริ่มต้น', original:'ราคาปกติ', validUntil:'ใช้ได้ถึง', memberOnly:'เฉพาะ Melo Member',
  includes:'รวม', excludes:'ไม่รวม', duration:'ระยะเวลา', guests:'จำนวนผู้ใช้', minutes:'นาที',
  ask:'สอบถาม / ขอจอง', askTitle:'ส่งข้อความถึงพาร์ทเนอร์', askPlaceholder:'พิมพ์สิ่งที่ต้องการสอบถาม เช่น วันที่ จำนวนคน หรือรายละเอียดเพิ่มเติม', send:'ส่งข้อความ', sent:'ส่งคำขอแล้ว', close:'ปิด',
  claim:'รับคูปอง', claimed:'รับคูปองสำเร็จ', couponCode:'รหัสคูปอง', buy:'ซื้อได้เลย', buying:'กำลังสร้างรายการ…', payment:'ชำระเงิน', amount:'ยอดชำระ',
  paymentPending:'รอการชำระเงิน', paymentPaid:'ชำระเงินสำเร็จ', refreshPayment:'ตรวจสอบสถานะ', expires:'หมดอายุ', voucher:'Voucher',
  loginRequired:'กรุณาเข้าสู่ระบบเพื่อทำรายการ', notFound:'ไม่พบข้อมูลนี้ หรือพาร์ทเนอร์ยังไม่เปิดให้ใช้งานสาธารณะ', loadFailed:'โหลดข้อมูลไม่สำเร็จ', retry:'ลองใหม่', loading:'กำลังโหลด…', actionFailed:'ทำรายการไม่สำเร็จ',
  infoOnly:'ดูข้อมูล', inquiryMode:'สอบถามก่อนจอง', instantMode:'ซื้อได้เลย', serviceSaved:'บันทึกดีลแล้ว', serviceUnsaved:'ยกเลิกบันทึกแล้ว',
  openPartner:'ดูหน้าพาร์ทเนอร์', browseMore:'ดูรายการอื่น', dealDetails:'รายละเอียดดีล', menuDetails:'รายละเอียดเมนู', serviceUsers:'จำนวนผู้ใช้บริการ', people:'คน',
  moreFromPartner:'สินค้าอื่น ๆ ในร้าน', moreFromPartnerDesc:'ดูสินค้าและบริการอื่นจากร้านเดียวกัน', serviceCategories:'ประเภทสินค้า / บริการ', allCategories:'ทั้งหมด',
  serviceInfo:'ข้อมูลสำหรับการใช้บริการ', serviceArea:'พื้นที่ให้บริการ', serviceLanguages:'ภาษา', amenities:'สิ่งอำนวยความสะดวก', pets:'สัตว์เลี้ยง', petsAllowed:'รองรับสัตว์เลี้ยง', petsNotAllowed:'ไม่รองรับสัตว์เลี้ยง',
  booking:'การจอง', bookingChat:'แชทกับ Partner', bookingRequest:'ส่งคำขอจอง', bookingExternal:'จองผ่านเว็บไซต์', bookingWalkIn:'Walk-in / ติดต่อหน้าร้าน', openBooking:'เปิดหน้าจอง',
  serviceHours:'เวลาให้บริการ', closed:'ปิด', viewReviews:'ดูรีวิว', reviewTitle:'รีวิวของพาร์ทเนอร์',
  seeMore:'ดูเพิ่มเติม', partnerDetails:'รายละเอียดพาร์ทเนอร์', openMap:'ดูพิกัดร้าน',
  mon:'จ.', tue:'อ.', wed:'พ.', thu:'พฤ.', fri:'ศ.', sat:'ส.', sun:'อา.',
};

const en: CommerceDetailCopy = {
  back:'Back', partner:'Partner', deal:'Special Deal', verified:'Verified', save:'Save', saved:'Saved', share:'Share',
  services:'Products / Services', about:'About', contact:'Contact', address:'Address', website:'Website', language:'Language', reviews:'Reviews',
  noServices:'No active products or services yet.', noReviews:'No reviews yet.', from:'From', original:'Regular price', validUntil:'Valid until', memberOnly:'Melo Member only',
  includes:'Includes', excludes:'Excludes', duration:'Duration', guests:'Guests', minutes:'min',
  ask:'Ask / Book', askTitle:'Message this partner', askPlaceholder:'Tell the partner what you need, preferred date, guest count or other details.', send:'Send', sent:'Request sent', close:'Close',
  claim:'Claim coupon', claimed:'Coupon claimed', couponCode:'Coupon code', buy:'Buy now', buying:'Creating payment…', payment:'Payment', amount:'Amount',
  paymentPending:'Awaiting payment', paymentPaid:'Payment successful', refreshPayment:'Check status', expires:'Expires', voucher:'Voucher',
  loginRequired:'Please sign in to continue.', notFound:'This item is unavailable or the partner is not public.', loadFailed:'Unable to load data', retry:'Try again', loading:'Loading…', actionFailed:'Action failed',
  infoOnly:'View info', inquiryMode:'Ask before booking', instantMode:'Buy now', serviceSaved:'Deal saved', serviceUnsaved:'Removed from saved',
  openPartner:'View partner', browseMore:'Browse more', dealDetails:'Deal details', menuDetails:'Menu details', serviceUsers:'Service users', people:'people',
  moreFromPartner:'More from this partner', moreFromPartnerDesc:'Explore other products and services from the same partner', serviceCategories:'Product / service categories', allCategories:'All',
  serviceInfo:'Service information', serviceArea:'Service area', serviceLanguages:'Language', amenities:'Amenities', pets:'Pets', petsAllowed:'Pets allowed', petsNotAllowed:'No pets',
  booking:'Booking', bookingChat:'Chat with Partner', bookingRequest:'Send booking request', bookingExternal:'Book on website', bookingWalkIn:'Walk-in / contact store', openBooking:'Open booking page',
  serviceHours:'Service hours', closed:'Closed', viewReviews:'View reviews', reviewTitle:'Partner reviews',
  seeMore:'See more', partnerDetails:'Partner details', openMap:'View location',
  mon:'Mon', tue:'Tue', wed:'Wed', thu:'Thu', fri:'Fri', sat:'Sat', sun:'Sun',
};

const de: CommerceDetailCopy = {
  ...en,
  back:'Zurück', partner:'Partner', deal:'Spezialangebot', save:'Speichern', saved:'Gespeichert', services:'Produkte / Services', about:'Über den Partner', contact:'Kontakt', address:'Adresse', website:'Website', reviews:'Bewertungen',
  ask:'Anfragen / Buchen', send:'Senden', close:'Schließen', claim:'Gutschein sichern', buy:'Jetzt kaufen', payment:'Zahlung', paymentPending:'Zahlung ausstehend', paymentPaid:'Zahlung erfolgreich', retry:'Erneut versuchen', loading:'Wird geladen…',
  browseMore:'Weitere Angebote', dealDetails:'Angebotsdetails', menuDetails:'Menüdetails', serviceUsers:'Teilnehmer', people:'Personen', moreFromPartner:'Mehr von diesem Partner', moreFromPartnerDesc:'Weitere Produkte und Services desselben Partners', serviceCategories:'Produkt- / Servicekategorien', allCategories:'Alle',
  serviceInfo:'Informationen zur Nutzung', serviceArea:'Servicegebiet', serviceLanguages:'Sprache', amenities:'Ausstattung', pets:'Haustiere', petsAllowed:'Haustiere erlaubt', petsNotAllowed:'Keine Haustiere',
  booking:'Buchung', bookingChat:'Mit Partner chatten', bookingRequest:'Buchungsanfrage senden', bookingExternal:'Über Website buchen', bookingWalkIn:'Walk-in / vor Ort kontaktieren', openBooking:'Buchungsseite öffnen', serviceHours:'Öffnungszeiten', closed:'Geschlossen', viewReviews:'Bewertungen ansehen', reviewTitle:'Partner-Bewertungen',
  seeMore:'Mehr anzeigen', partnerDetails:'Partnerdetails', openMap:'Standort ansehen',
  mon:'Mo', tue:'Di', wed:'Mi', thu:'Do', fri:'Fr', sat:'Sa', sun:'So',
};

const zh: CommerceDetailCopy = {
  ...en,
  back:'返回', partner:'合作伙伴', deal:'特别优惠', save:'收藏', saved:'已收藏', services:'商品 / 服务', about:'关于商家', contact:'联系方式', address:'地址', website:'网站', reviews:'评价',
  ask:'咨询 / 预订', send:'发送', close:'关闭', claim:'领取优惠券', buy:'立即购买', payment:'付款', paymentPending:'等待付款', paymentPaid:'付款成功', retry:'重试', loading:'正在加载…', browseMore:'查看更多', dealDetails:'优惠详情', menuDetails:'菜单详情', serviceUsers:'使用人数', people:'人', moreFromPartner:'该商家的其他商品', moreFromPartnerDesc:'查看同一商家的其他商品和服务', serviceCategories:'商品 / 服务类别', allCategories:'全部',
  serviceInfo:'服务信息', serviceArea:'服务区域', serviceLanguages:'语言', amenities:'设施', pets:'宠物', petsAllowed:'允许携带宠物', petsNotAllowed:'不接待宠物', booking:'预订', bookingChat:'与合作伙伴聊天', bookingRequest:'发送预订请求', bookingExternal:'通过网站预订', bookingWalkIn:'到店 / 联系门店', openBooking:'打开预订页面', serviceHours:'营业时间', closed:'休息', viewReviews:'查看评价', reviewTitle:'合作伙伴评价',
  seeMore:'查看更多', partnerDetails:'合作伙伴详情', openMap:'查看位置',
  mon:'周一', tue:'周二', wed:'周三', thu:'周四', fri:'周五', sat:'周六', sun:'周日',
};

const ja: CommerceDetailCopy = {
  ...en,
  back:'戻る', partner:'パートナー', deal:'特別オファー', save:'保存', saved:'保存済み', services:'商品 / サービス', about:'店舗について', contact:'連絡先', address:'住所', website:'Webサイト', reviews:'レビュー',
  ask:'問い合わせ / 予約', send:'送信', close:'閉じる', claim:'クーポンを取得', buy:'今すぐ購入', payment:'支払い', paymentPending:'支払い待ち', paymentPaid:'支払い完了', retry:'再試行', loading:'読み込み中…', browseMore:'もっと見る', dealDetails:'オファー詳細', menuDetails:'メニュー詳細', serviceUsers:'利用人数', people:'人', moreFromPartner:'この店舗のほかの商品', moreFromPartnerDesc:'同じ店舗の商品・サービスをもっと見る', serviceCategories:'商品 / サービスカテゴリ', allCategories:'すべて',
  serviceInfo:'利用情報', serviceArea:'サービスエリア', serviceLanguages:'言語', amenities:'設備・サービス', pets:'ペット', petsAllowed:'ペット可', petsNotAllowed:'ペット不可', booking:'予約', bookingChat:'Partnerとチャット', bookingRequest:'予約リクエストを送信', bookingExternal:'Webサイトで予約', bookingWalkIn:'Walk-in / 店舗へ連絡', openBooking:'予約ページを開く', serviceHours:'営業時間', closed:'休業', viewReviews:'レビューを見る', reviewTitle:'パートナーレビュー',
  seeMore:'詳細を見る', partnerDetails:'パートナー詳細', openMap:'場所を見る',
  mon:'月', tue:'火', wed:'水', thu:'木', fri:'金', sat:'土', sun:'日',
};

const ko: CommerceDetailCopy = {
  ...en,
  back:'뒤로', partner:'파트너', deal:'특별 딜', save:'저장', saved:'저장됨', services:'상품 / 서비스', about:'매장 소개', contact:'연락처', address:'주소', website:'웹사이트', reviews:'리뷰',
  ask:'문의 / 예약', send:'보내기', close:'닫기', claim:'쿠폰 받기', buy:'바로 구매', payment:'결제', paymentPending:'결제 대기', paymentPaid:'결제 완료', retry:'다시 시도', loading:'불러오는 중…', browseMore:'더 보기', dealDetails:'딜 상세', menuDetails:'메뉴 상세', serviceUsers:'이용 인원', people:'명', moreFromPartner:'이 매장의 다른 상품', moreFromPartnerDesc:'같은 매장의 다른 상품과 서비스를 확인하세요', serviceCategories:'상품 / 서비스 카테고리', allCategories:'전체',
  serviceInfo:'이용 정보', serviceArea:'서비스 지역', serviceLanguages:'언어', amenities:'편의시설', pets:'반려동물', petsAllowed:'반려동물 동반 가능', petsNotAllowed:'반려동물 동반 불가', booking:'예약', bookingChat:'Partner와 채팅', bookingRequest:'예약 요청 보내기', bookingExternal:'웹사이트에서 예약', bookingWalkIn:'방문 / 매장 문의', openBooking:'예약 페이지 열기', serviceHours:'운영 시간', closed:'휴무', viewReviews:'리뷰 보기', reviewTitle:'파트너 리뷰',
  seeMore:'더 보기', partnerDetails:'파트너 상세정보', openMap:'위치 보기',
  mon:'월', tue:'화', wed:'수', thu:'목', fri:'금', sat:'토', sun:'일',
};

export const commerceDetailCopy: Record<Locale, CommerceDetailCopy> = { th, en, de, zh, ja, ko };
