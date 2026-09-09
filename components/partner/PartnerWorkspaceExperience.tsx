'use client';

import Link from 'next/link';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';

import { useLocale } from '@/components/SiteProviders';
import { resolveCommerceMedia } from '@/components/commerce/commerceMedia';
import VerifiedUserAvatar from '@/components/profile/VerifiedUserAvatar';
import { rpcRequest } from '@/lib/supabase/browser';

import PartnerModeHeader from './PartnerModeHeader';

import {
  addPartnerStaff,
  deletePartnerService,
  getActivePartnerBusiness,
  getPartnerBusiness,
  getPartnerDashboardSummary,
  getPartnerRecentActivity,
  getPartnerWallet,
  hasPartnerPermission,
  listPartnerServices,
  listPartnerStaff,
  listPartnerTransactions,
  removePartnerStaff,
  savePartnerService,
  setPartnerServiceActive,
  type PartnerBusinessAccess,
  type PartnerDashboardSummary,
  type PartnerService,
  type PartnerStaffMember,
  type PartnerTransaction,
  type PartnerWalletSummary,
} from './partnerModeWeb';

import styles from './PartnerMode.module.css';

type Section =
  | 'store'
  | 'services'
  | 'customers'
  | 'finance'
  | 'analytics'
  | 'reports'
  | 'staff'
  | 'chat';

type CustomerFilter =
  | 'all'
  | 'order'
  | 'booking'
  | 'coupon';

type Row = Record<string, unknown>;

const EMPTY_SUMMARY: PartnerDashboardSummary = {
  serviceCount: 0,
  pendingBookings: 0,
  activeCoupons: 0,
  paidOrders: 0,
  grossSales: 0,
  averageRating: 0,
  reviewCount: 0,
};

const EMPTY_WALLET: PartnerWalletSummary = {
  availableBalance: 0,
  pendingBalance: 0,
  lifetimeGross: 0,
  withdrawnTotal: 0,
  currency: 'THB',
};

const COPY = {
  th: {
    store: 'ร้านค้า',
    services: 'สินค้าและบริการ',
    customers: 'รายการลูกค้า',
    finance: 'การเงิน',
    analytics: 'สถิติร้านค้า',
    reports: 'รายงาน',
    staff: 'พนักงานและแอดมิน',
    chat: 'แชทร้านค้า',
    loading: 'กำลังโหลด…',
    noAccess: 'ไม่มีสิทธิ์ใช้งานส่วนนี้',
    active: 'เปิดใช้งาน',
    inactive: 'ปิดใช้งาน',
    viewStore: 'ดูหน้าร้านในมุมมองลูกค้า',
    total: 'ทั้งหมด',
    pending: 'รอดำเนินการ',
    sales: 'ยอดขาย',
    rating: 'คะแนน',
    available: 'ยอดพร้อมถอน',
    walletPending: 'ยอดรอดำเนินการ',
    lifetime: 'ยอดรวมตลอดเวลา',
    withdrawn: 'ถอนแล้ว',
    email: 'อีเมล Melo',
    role: 'บทบาท',
    addStaff: 'เพิ่มพนักงาน',
    remove: 'นำออก',
    export: 'ดาวน์โหลด CSV',
    noData: 'ยังไม่มีข้อมูล',
    customer: 'ลูกค้า',
    status: 'สถานะ',
    amount: 'ยอดเงิน',
    date: 'วันที่',
    service: 'บริการ',
    type: 'ประเภท',
  },

  en: {
    store: 'Store',
    services: 'Products & services',
    customers: 'Customer transactions',
    finance: 'Finance',
    analytics: 'Store analytics',
    reports: 'Reports',
    staff: 'Staff & admins',
    chat: 'Partner chat',
    loading: 'Loading…',
    noAccess: 'You do not have permission for this section',
    active: 'Active',
    inactive: 'Inactive',
    viewStore: 'View customer-facing store',
    total: 'Total',
    pending: 'Pending',
    sales: 'Sales',
    rating: 'Rating',
    available: 'Available balance',
    walletPending: 'Pending balance',
    lifetime: 'Lifetime gross',
    withdrawn: 'Withdrawn',
    email: 'Melo email',
    role: 'Role',
    addStaff: 'Add staff',
    remove: 'Remove',
    export: 'Download CSV',
    noData: 'No data yet',
    customer: 'Customer',
    status: 'Status',
    amount: 'Amount',
    date: 'Date',
    service: 'Service',
    type: 'Type',
  },

  de: {
    store: 'Store',
    services: 'Produkte & Services',
    customers: 'Kundenvorgänge',
    finance: 'Finanzen',
    analytics: 'Statistik',
    reports: 'Berichte',
    staff: 'Mitarbeiter & Admins',
    chat: 'Partner-Chat',
    loading: 'Wird geladen…',
    noAccess: 'Keine Berechtigung',
    active: 'Aktiv',
    inactive: 'Inaktiv',
    viewStore: 'Store aus Kundensicht',
    total: 'Gesamt',
    pending: 'Offen',
    sales: 'Umsatz',
    rating: 'Bewertung',
    available: 'Verfügbar',
    walletPending: 'Ausstehend',
    lifetime: 'Gesamtumsatz',
    withdrawn: 'Ausgezahlt',
    email: 'Melo E-Mail',
    role: 'Rolle',
    addStaff: 'Mitarbeiter hinzufügen',
    remove: 'Entfernen',
    export: 'CSV herunterladen',
    noData: 'Noch keine Daten',
    customer: 'Kunde',
    status: 'Status',
    amount: 'Betrag',
    date: 'Datum',
    service: 'Service',
    type: 'Typ',
  },

  zh: {
    store: '店铺',
    services: '商品与服务',
    customers: '客户交易',
    finance: '财务',
    analytics: '店铺统计',
    reports: '报告',
    staff: '员工与管理员',
    chat: '商家聊天',
    loading: '正在加载…',
    noAccess: '你没有此部分的权限',
    active: '启用',
    inactive: '停用',
    viewStore: '查看客户看到的店铺',
    total: '总计',
    pending: '待处理',
    sales: '销售额',
    rating: '评分',
    available: '可提现余额',
    walletPending: '待处理余额',
    lifetime: '累计收入',
    withdrawn: '已提现',
    email: 'Melo 邮箱',
    role: '角色',
    addStaff: '添加员工',
    remove: '移除',
    export: '下载 CSV',
    noData: '暂无数据',
    customer: '客户',
    status: '状态',
    amount: '金额',
    date: '日期',
    service: '服务',
    type: '类型',
  },

  ja: {
    store: '店舗',
    services: '商品・サービス',
    customers: '顧客取引',
    finance: '財務',
    analytics: '店舗分析',
    reports: 'レポート',
    staff: 'スタッフ・管理者',
    chat: 'Partnerチャット',
    loading: '読み込み中…',
    noAccess: 'このセクションへの権限がありません',
    active: '有効',
    inactive: '無効',
    viewStore: '顧客向け店舗を見る',
    total: '合計',
    pending: '保留',
    sales: '売上',
    rating: '評価',
    available: '出金可能残高',
    walletPending: '保留残高',
    lifetime: '累計売上',
    withdrawn: '出金済み',
    email: 'Meloメール',
    role: '役割',
    addStaff: 'スタッフ追加',
    remove: '削除',
    export: 'CSVダウンロード',
    noData: 'データはありません',
    customer: '顧客',
    status: 'ステータス',
    amount: '金額',
    date: '日付',
    service: 'サービス',
    type: '種類',
  },

  ko: {
    store: '매장',
    services: '상품 및 서비스',
    customers: '고객 거래',
    finance: '재무',
    analytics: '매장 통계',
    reports: '보고서',
    staff: '직원 및 관리자',
    chat: '파트너 채팅',
    loading: '불러오는 중…',
    noAccess: '이 섹션에 대한 권한이 없습니다',
    active: '활성',
    inactive: '비활성',
    viewStore: '고객 화면에서 매장 보기',
    total: '전체',
    pending: '대기',
    sales: '매출',
    rating: '평점',
    available: '출금 가능 잔액',
    walletPending: '대기 잔액',
    lifetime: '누적 매출',
    withdrawn: '출금 완료',
    email: 'Melo 이메일',
    role: '역할',
    addStaff: '직원 추가',
    remove: '삭제',
    export: 'CSV 다운로드',
    noData: '데이터가 없습니다',
    customer: '고객',
    status: '상태',
    amount: '금액',
    date: '날짜',
    service: '서비스',
    type: '유형',
  },
} as const;

const CUSTOMER_COPY = {
  th: {
    title: 'รายการลูกค้า',
    subtitle:
      'รายงานออเดอร์ การจอง คูปอง/ดีล และการใช้สิทธิ์ของลูกค้าที่เกิดขึ้นกับร้านนี้',
    chatTitle: 'สร้างรายการจาก Business Chat',
    chatBody:
      'หากต้องสร้างการจองหรือออเดอร์ให้ลูกค้า ให้เปิดแชทของลูกค้าคนนั้นแล้วเลือก “สร้างรายการให้ลูกค้า” รายการที่สร้างจะถูกรวมในหน้านี้อัตโนมัติ',
    openChat: 'เปิดแชท',
    all: 'ทั้งหมด',
    orders: 'ออเดอร์',
    bookings: 'การจอง',
    coupons: 'คูปอง / ดีล',
    search: 'ค้นหาชื่อลูกค้า รหัสรายการ หรือบริการ',
    pending: 'รอดำเนินการ',
    waiting: 'รอใช้บริการ',
    used: 'ใช้สิทธิ์แล้ว',
    details: 'ดูรายละเอียด',
    reference: 'รหัสรายการ',
    schedule: 'วันนัด / วันที่รายการ',
    created: 'สร้างเมื่อ',
    people: 'คน',
    totalAmount: 'ยอดรายการ',
    kindOrder: 'ออเดอร์',
    kindBooking: 'การจอง',
    kindCoupon: 'คูปอง / ดีล',
    empty: 'ไม่พบรายการลูกค้าที่ตรงกับตัวกรอง',
  },

  en: {
    title: 'Customer list',
    subtitle:
      'Orders, bookings, coupons/deals and customer service redemptions for this store',
    chatTitle: 'Create an item from Business Chat',
    chatBody:
      'To create a booking or order for a customer, open that customer’s chat and choose “Create item for customer”. New items appear here automatically.',
    openChat: 'Open chat',
    all: 'All',
    orders: 'Orders',
    bookings: 'Bookings',
    coupons: 'Coupons / deals',
    search: 'Search customer, reference or service',
    pending: 'Pending',
    waiting: 'Awaiting service',
    used: 'Redeemed',
    details: 'View details',
    reference: 'Reference',
    schedule: 'Appointment / item date',
    created: 'Created',
    people: 'people',
    totalAmount: 'Total',
    kindOrder: 'Order',
    kindBooking: 'Booking',
    kindCoupon: 'Coupon / deal',
    empty: 'No customer items match this filter',
  },

  de: {
    title: 'Kundenliste',
    subtitle:
      'Bestellungen, Buchungen, Coupons/Deals und eingelöste Leistungen dieses Stores',
    chatTitle: 'Vorgang aus Business Chat erstellen',
    chatBody:
      'Öffne den Chat des Kunden und wähle „Vorgang für Kunden erstellen“. Neue Vorgänge erscheinen automatisch hier.',
    openChat: 'Chat öffnen',
    all: 'Alle',
    orders: 'Bestellungen',
    bookings: 'Buchungen',
    coupons: 'Coupons / Deals',
    search: 'Kunde, Referenz oder Service suchen',
    pending: 'Offen',
    waiting: 'Wartet auf Leistung',
    used: 'Eingelöst',
    details: 'Details ansehen',
    reference: 'Referenz',
    schedule: 'Termin / Datum',
    created: 'Erstellt',
    people: 'Personen',
    totalAmount: 'Summe',
    kindOrder: 'Bestellung',
    kindBooking: 'Buchung',
    kindCoupon: 'Coupon / Deal',
    empty: 'Keine passenden Kundenvorgänge',
  },

  zh: {
    title: '客户列表',
    subtitle: '此店铺的订单、预订、优惠券/优惠及客户核销记录',
    chatTitle: '从 Business Chat 创建记录',
    chatBody:
      '需要为客户创建预订或订单时，请打开该客户聊天并选择“为客户创建记录”。新记录会自动显示在这里。',
    openChat: '打开聊天',
    all: '全部',
    orders: '订单',
    bookings: '预订',
    coupons: '优惠券 / 优惠',
    search: '搜索客户、编号或服务',
    pending: '待处理',
    waiting: '待使用服务',
    used: '已核销',
    details: '查看详情',
    reference: '记录编号',
    schedule: '预约 / 记录日期',
    created: '创建时间',
    people: '人',
    totalAmount: '金额',
    kindOrder: '订单',
    kindBooking: '预订',
    kindCoupon: '优惠券 / 优惠',
    empty: '没有符合筛选条件的客户记录',
  },

  ja: {
    title: '顧客一覧',
    subtitle:
      'この店舗の注文・予約・クーポン/ディール・サービス利用履歴',
    chatTitle: 'Business Chat から項目を作成',
    chatBody:
      '顧客の予約や注文を作成する場合は、その顧客とのチャットを開き「顧客用の項目を作成」を選択してください。作成した項目は自動でここに表示されます。',
    openChat: 'チャットを開く',
    all: 'すべて',
    orders: '注文',
    bookings: '予約',
    coupons: 'クーポン / ディール',
    search: '顧客名・参照番号・サービスを検索',
    pending: '保留中',
    waiting: 'サービス待ち',
    used: '利用済み',
    details: '詳細を見る',
    reference: '参照番号',
    schedule: '予約 / 日付',
    created: '作成日時',
    people: '人',
    totalAmount: '金額',
    kindOrder: '注文',
    kindBooking: '予約',
    kindCoupon: 'クーポン / ディール',
    empty: '条件に一致する顧客項目はありません',
  },

  ko: {
    title: '고객 목록',
    subtitle:
      '이 매장의 주문, 예약, 쿠폰/딜 및 고객 서비스 사용 내역',
    chatTitle: 'Business Chat에서 항목 만들기',
    chatBody:
      '고객의 예약이나 주문을 만들려면 해당 고객 채팅을 열고 “고객 항목 만들기”를 선택하세요. 새 항목은 자동으로 여기에 표시됩니다.',
    openChat: '채팅 열기',
    all: '전체',
    orders: '주문',
    bookings: '예약',
    coupons: '쿠폰 / 딜',
    search: '고객, 참조번호 또는 서비스 검색',
    pending: '대기',
    waiting: '서비스 대기',
    used: '사용 완료',
    details: '상세 보기',
    reference: '참조번호',
    schedule: '예약 / 항목 날짜',
    created: '생성일',
    people: '명',
    totalAmount: '금액',
    kindOrder: '주문',
    kindBooking: '예약',
    kindCoupon: '쿠폰 / 딜',
    empty: '필터와 일치하는 고객 항목이 없습니다',
  },
} as const;

const SERVICE_COPY = {
  th: {
    all: 'ทั้งหมด',
    add: 'เพิ่ม',
    addTitle: 'เพิ่มสินค้า / บริการ',
    editTitle: 'แก้ไขสินค้า / บริการ',
    category: 'หมวดหมู่',
    type: 'ประเภท',
    price: 'ราคา',
    currency: 'สกุลเงิน',
    priceUnit: 'หน่วยราคา',
    title: 'ชื่อสินค้า / บริการ',
    description: 'รายละเอียด',
    save: 'บันทึก',
    update: 'บันทึกการแก้ไข',
    details: 'ดูรายละเอียด',
    hideDetails: 'ซ่อนรายละเอียด',
    edit: 'แก้ไข',
    delete: 'ลบ',
    enable: 'เปิดให้บริการ',
    disable: 'ปิดบริการ',
    availableNow: 'พร้อมให้บริการ',
    unavailable: 'ปิดให้บริการ',
    noImage: 'ยังไม่มีรูปสินค้า / บริการ',
    askPrice: 'สอบถามราคา',
    confirmDelete: 'ยืนยันการลบรายการนี้?',
    standard: 'มาตรฐาน',
    promotion: 'โปรโมชั่น',
    coupon: 'คูปอง',
    package: 'แพ็กเกจ',
    general: 'ทั่วไป',
    status: 'สถานะ',
  },

  en: {
    all: 'All',
    add: 'Add',
    addTitle: 'Add product / service',
    editTitle: 'Edit product / service',
    category: 'Category',
    type: 'Type',
    price: 'Price',
    currency: 'Currency',
    priceUnit: 'Price unit',
    title: 'Product / service name',
    description: 'Description',
    save: 'Save',
    update: 'Save changes',
    details: 'View details',
    hideDetails: 'Hide details',
    edit: 'Edit',
    delete: 'Delete',
    enable: 'Enable service',
    disable: 'Disable service',
    availableNow: 'Available',
    unavailable: 'Unavailable',
    noImage: 'No product / service image',
    askPrice: 'Ask for price',
    confirmDelete: 'Delete this item?',
    standard: 'Standard',
    promotion: 'Promotion',
    coupon: 'Coupon',
    package: 'Package',
    general: 'General',
    status: 'Status',
  },

  de: {
    all: 'Alle',
    add: 'Hinzufügen',
    addTitle: 'Produkt / Service hinzufügen',
    editTitle: 'Produkt / Service bearbeiten',
    category: 'Kategorie',
    type: 'Typ',
    price: 'Preis',
    currency: 'Währung',
    priceUnit: 'Preiseinheit',
    title: 'Produkt- / Servicename',
    description: 'Beschreibung',
    save: 'Speichern',
    update: 'Änderungen speichern',
    details: 'Details ansehen',
    hideDetails: 'Details schließen',
    edit: 'Bearbeiten',
    delete: 'Löschen',
    enable: 'Aktivieren',
    disable: 'Deaktivieren',
    availableNow: 'Verfügbar',
    unavailable: 'Nicht verfügbar',
    noImage: 'Kein Produkt- / Servicebild',
    askPrice: 'Preis anfragen',
    confirmDelete: 'Diesen Eintrag löschen?',
    standard: 'Standard',
    promotion: 'Promotion',
    coupon: 'Coupon',
    package: 'Paket',
    general: 'Allgemein',
    status: 'Status',
  },

  zh: {
    all: '全部',
    add: '添加',
    addTitle: '添加商品 / 服务',
    editTitle: '编辑商品 / 服务',
    category: '分类',
    type: '类型',
    price: '价格',
    currency: '货币',
    priceUnit: '价格单位',
    title: '商品 / 服务名称',
    description: '说明',
    save: '保存',
    update: '保存更改',
    details: '查看详情',
    hideDetails: '收起详情',
    edit: '编辑',
    delete: '删除',
    enable: '启用服务',
    disable: '停用服务',
    availableNow: '可提供服务',
    unavailable: '暂停服务',
    noImage: '暂无商品 / 服务图片',
    askPrice: '询价',
    confirmDelete: '确定删除此项目吗？',
    standard: '标准',
    promotion: '促销',
    coupon: '优惠券',
    package: '套餐',
    general: '一般',
    status: '状态',
  },

  ja: {
    all: 'すべて',
    add: '追加',
    addTitle: '商品・サービスを追加',
    editTitle: '商品・サービスを編集',
    category: 'カテゴリ',
    type: 'タイプ',
    price: '価格',
    currency: '通貨',
    priceUnit: '価格単位',
    title: '商品・サービス名',
    description: '説明',
    save: '保存',
    update: '変更を保存',
    details: '詳細を見る',
    hideDetails: '詳細を閉じる',
    edit: '編集',
    delete: '削除',
    enable: '提供する',
    disable: '提供停止',
    availableNow: '提供中',
    unavailable: '提供停止中',
    noImage: '商品・サービス画像はありません',
    askPrice: '価格を問い合わせ',
    confirmDelete: 'この項目を削除しますか？',
    standard: '標準',
    promotion: 'プロモーション',
    coupon: 'クーポン',
    package: 'パッケージ',
    general: '一般',
    status: 'ステータス',
  },

  ko: {
    all: '전체',
    add: '추가',
    addTitle: '상품 / 서비스 추가',
    editTitle: '상품 / 서비스 수정',
    category: '카테고리',
    type: '유형',
    price: '가격',
    currency: '통화',
    priceUnit: '가격 단위',
    title: '상품 / 서비스 이름',
    description: '설명',
    save: '저장',
    update: '변경사항 저장',
    details: '상세 보기',
    hideDetails: '상세 닫기',
    edit: '수정',
    delete: '삭제',
    enable: '서비스 활성화',
    disable: '서비스 비활성화',
    availableNow: '서비스 가능',
    unavailable: '서비스 중지',
    noImage: '상품 / 서비스 이미지 없음',
    askPrice: '가격 문의',
    confirmDelete: '이 항목을 삭제할까요?',
    standard: '기본',
    promotion: '프로모션',
    coupon: '쿠폰',
    package: '패키지',
    general: '일반',
    status: '상태',
  },
} as const;

const DETAIL_COPY = {
  th: {
    eyebrow: 'รายละเอียดรายการ',
    customer: 'ลูกค้า',
    member: 'ลูกค้า Melo',
    storeItems: 'รายการกับร้าน',
    storeTotal: 'ยอดรวมกับร้าน',

    product: 'สินค้า / บริการ',
    type: 'ประเภท',
    item: 'รายการ',
    serviceDate: 'วันใช้บริการ',
    quantity: 'จำนวน',
    details: 'รายละเอียด',
    noDetails: 'ไม่มีรายละเอียดเพิ่มเติม',

    payment: 'การชำระ / ยอดรายการ',
    customerAmount: 'ยอดลูกค้า',
    paymentStatus: 'สถานะ',
    created: 'สร้างรายการ',

    redemption: 'การใช้สิทธิ์ / QR',

    booking: 'การจอง',
    order: 'ออเดอร์',
    coupon: 'คูปอง / ดีล',

    pending: 'รอดำเนินการ',
    waiting: 'รอใช้บริการ',
    used: 'ใช้สิทธิ์แล้ว',
    unavailable: 'ไม่พร้อมใช้งาน',

    paid: 'ชำระเงินแล้ว',
    awaitingPayment: 'รอชำระเงิน',
    refunded: 'คืนเงินแล้ว',

    readyTitle: 'รอรายการพร้อมใช้งาน',
    readyBody:
      'เมื่อถึงเวลาใช้บริการ ลูกค้าแสดง QR ให้ Partner สแกน',

    usedTitle: 'ใช้สิทธิ์แล้ว',
    usedBody:
      'รายการนี้ถูกใช้สิทธิ์เรียบร้อยแล้ว',

    pendingTitle: 'รายการยังไม่พร้อมใช้งาน',
    pendingBody:
      'รอการยืนยันรายการหรือการชำระเงินก่อนเปิดใช้สิทธิ์',

    unavailableTitle: 'ไม่สามารถใช้สิทธิ์ได้',
    unavailableBody:
      'ตรวจสอบสถานะรายการก่อนดำเนินการต่อ',

    people: 'คน',
    units: 'ชิ้น',

    loading: 'กำลังโหลดรายละเอียด…',
    close: 'ปิด',
  },

  en: {
    eyebrow: 'Transaction details',
    customer: 'Customer',
    member: 'Melo customer',
    storeItems: 'items with this store',
    storeTotal: 'Total with store',

    product: 'Product / service',
    type: 'Type',
    item: 'Item',
    serviceDate: 'Service date',
    quantity: 'Quantity',
    details: 'Details',
    noDetails: 'No additional details',

    payment: 'Payment / transaction total',
    customerAmount: 'Customer amount',
    paymentStatus: 'Status',
    created: 'Created',

    redemption: 'Redemption / QR',

    booking: 'Booking',
    order: 'Order',
    coupon: 'Coupon / deal',

    pending: 'Pending',
    waiting: 'Awaiting service',
    used: 'Redeemed',
    unavailable: 'Unavailable',

    paid: 'Paid',
    awaitingPayment: 'Awaiting payment',
    refunded: 'Refunded',

    readyTitle: 'Ready for service',
    readyBody:
      'At service time, the customer presents their QR code for the Partner to scan.',

    usedTitle: 'Redeemed',
    usedBody:
      'This transaction has already been redeemed.',

    pendingTitle: 'Not ready yet',
    pendingBody:
      'Confirmation or payment must be completed before redemption.',

    unavailableTitle: 'Redemption unavailable',
    unavailableBody:
      'Check the transaction status before continuing.',

    people: 'people',
    units: 'items',

    loading: 'Loading details…',
    close: 'Close',
  },

  de: {
    eyebrow: 'Vorgangsdetails',
    customer: 'Kunde',
    member: 'Melo-Kunde',
    storeItems: 'Vorgänge mit diesem Store',
    storeTotal: 'Gesamt beim Store',

    product: 'Produkt / Service',
    type: 'Typ',
    item: 'Eintrag',
    serviceDate: 'Servicetermin',
    quantity: 'Menge',
    details: 'Details',
    noDetails: 'Keine weiteren Details',

    payment: 'Zahlung / Summe',
    customerAmount: 'Kundenbetrag',
    paymentStatus: 'Status',
    created: 'Erstellt',

    redemption: 'Einlösung / QR',

    booking: 'Buchung',
    order: 'Bestellung',
    coupon: 'Coupon / Deal',

    pending: 'Offen',
    waiting: 'Wartet auf Leistung',
    used: 'Eingelöst',
    unavailable: 'Nicht verfügbar',

    paid: 'Bezahlt',
    awaitingPayment: 'Zahlung ausstehend',
    refunded: 'Erstattet',

    readyTitle: 'Bereit zur Einlösung',
    readyBody:
      'Zum Servicetermin zeigt der Kunde den QR-Code zum Scannen durch den Partner.',

    usedTitle: 'Eingelöst',
    usedBody:
      'Dieser Vorgang wurde bereits eingelöst.',

    pendingTitle: 'Noch nicht bereit',
    pendingBody:
      'Bestätigung oder Zahlung muss zuerst abgeschlossen werden.',

    unavailableTitle: 'Einlösung nicht verfügbar',
    unavailableBody:
      'Bitte zuerst den Status des Vorgangs prüfen.',

    people: 'Personen',
    units: 'Stück',

    loading: 'Details werden geladen…',
    close: 'Schließen',
  },

  zh: {
    eyebrow: '交易详情',
    customer: '客户',
    member: 'Melo 客户',
    storeItems: '笔店铺记录',
    storeTotal: '店铺累计金额',

    product: '商品 / 服务',
    type: '类型',
    item: '项目',
    serviceDate: '使用日期',
    quantity: '数量',
    details: '详情',
    noDetails: '暂无更多详情',

    payment: '付款 / 订单金额',
    customerAmount: '客户金额',
    paymentStatus: '状态',
    created: '创建时间',

    redemption: '核销 / QR',

    booking: '预订',
    order: '订单',
    coupon: '优惠券 / 优惠',

    pending: '待处理',
    waiting: '待使用服务',
    used: '已核销',
    unavailable: '不可用',

    paid: '已付款',
    awaitingPayment: '待付款',
    refunded: '已退款',

    readyTitle: '等待可使用',
    readyBody:
      '到使用时间后，客户出示 QR 码供商家扫描。',

    usedTitle: '已核销',
    usedBody:
      '此记录已完成核销。',

    pendingTitle: '暂不可使用',
    pendingBody:
      '等待确认或付款完成后即可使用。',

    unavailableTitle: '无法核销',
    unavailableBody:
      '请先检查记录状态。',

    people: '人',
    units: '件',

    loading: '正在加载详情…',
    close: '关闭',
  },

  ja: {
    eyebrow: '取引詳細',
    customer: '顧客',
    member: 'Melo 顧客',
    storeItems: '件の店舗利用',
    storeTotal: '店舗での合計',

    product: '商品・サービス',
    type: '種類',
    item: '項目',
    serviceDate: '利用日時',
    quantity: '数量',
    details: '詳細',
    noDetails: '追加情報はありません',

    payment: '支払い / 合計',
    customerAmount: '顧客金額',
    paymentStatus: '状態',
    created: '作成日時',

    redemption: '利用 / QR',

    booking: '予約',
    order: '注文',
    coupon: 'クーポン / ディール',

    pending: '保留中',
    waiting: 'サービス待ち',
    used: '利用済み',
    unavailable: '利用不可',

    paid: '支払い済み',
    awaitingPayment: '支払い待ち',
    refunded: '返金済み',

    readyTitle: '利用待ち',
    readyBody:
      '利用時に顧客が QR コードを提示し、Partner がスキャンします。',

    usedTitle: '利用済み',
    usedBody:
      'この項目はすでに利用済みです。',

    pendingTitle: 'まだ利用できません',
    pendingBody:
      '確認または支払い完了後に利用できます。',

    unavailableTitle: '利用できません',
    unavailableBody:
      '続行する前に取引状態を確認してください。',

    people: '人',
    units: '点',

    loading: '詳細を読み込み中…',
    close: '閉じる',
  },

  ko: {
    eyebrow: '거래 상세',
    customer: '고객',
    member: 'Melo 고객',
    storeItems: '건의 매장 이용',
    storeTotal: '매장 누적 금액',

    product: '상품 / 서비스',
    type: '유형',
    item: '항목',
    serviceDate: '이용 일시',
    quantity: '수량',
    details: '상세 정보',
    noDetails: '추가 정보가 없습니다',

    payment: '결제 / 거래 금액',
    customerAmount: '고객 금액',
    paymentStatus: '상태',
    created: '생성일',

    redemption: '사용 / QR',

    booking: '예약',
    order: '주문',
    coupon: '쿠폰 / 딜',

    pending: '대기',
    waiting: '서비스 대기',
    used: '사용 완료',
    unavailable: '이용 불가',

    paid: '결제 완료',
    awaitingPayment: '결제 대기',
    refunded: '환불 완료',

    readyTitle: '이용 대기',
    readyBody:
      '서비스 이용 시 고객이 QR 코드를 제시하면 Partner가 스캔합니다.',

    usedTitle: '사용 완료',
    usedBody:
      '이 항목은 이미 사용 처리되었습니다.',

    pendingTitle: '아직 이용할 수 없습니다',
    pendingBody:
      '확인 또는 결제가 완료된 후 이용할 수 있습니다.',

    unavailableTitle: '이용할 수 없습니다',
    unavailableBody:
      '계속하기 전에 거래 상태를 확인하세요.',

    people: '명',
    units: '개',

    loading: '상세 정보를 불러오는 중…',
    close: '닫기',
  },
} as const;

type ServiceCopy =
  (typeof SERVICE_COPY)[keyof typeof SERVICE_COPY];

type LocaleCode =
  keyof typeof DETAIL_COPY;

const PERMISSION: Record<Section, string> = {
  store: 'edit_store',
  services: 'services',
  customers: 'sales',
  finance: 'finance',
  analytics: 'analytics',
  reports: 'reports',
  staff: 'manage_staff',
  chat: 'chat',
};

function rows(
  value: unknown,
): Row[] {
  if (
    !Array.isArray(
      value,
    )
  ) {
    return [];
  }

  return value.filter(
    (
      item,
    ): item is Row =>
      Boolean(
        item,
      ) &&
      typeof item ===
        'object',
  );
}

function text(
  row: Row | null,
  ...keys: string[]
) {
  for (
    const key of
    keys
  ) {
    const value =
      row?.[
        key
      ];

    if (
      value !==
        undefined &&
      value !==
        null &&
      String(
        value,
      ).trim()
    ) {
      return String(
        value,
      ).trim();
    }
  }

  return '';
}

function numberValue(
  row: Row | null,
  ...keys: string[]
) {
  for (
    const key of
    keys
  ) {
    const raw =
      row?.[
        key
      ];

    if (
      raw ===
        null ||
      raw ===
        undefined ||
      String(
        raw,
      ).trim() ===
        ''
    ) {
      continue;
    }

    const value =
      Number(
        raw,
      );

    if (
      Number.isFinite(
        value,
      )
    ) {
      return value;
    }
  }

  return null;
}

function formatMoney(
  value: number,
  currency: string,
) {
  return `${value.toLocaleString(
    undefined,
    {
      maximumFractionDigits:
        2,
    },
  )} ${currency}`;
}

function formatDate(
  value: string,
) {
  if (
    !value
  ) {
    return '—';
  }

  const date =
    new Date(
      value,
    );

  return Number.isNaN(
    date.getTime(),
  )
    ? value
    : date.toLocaleString();
}

function localeName(
  locale: LocaleCode,
) {
  if (
    locale ===
    'th'
  ) {
    return 'th-TH';
  }

  if (
    locale ===
    'de'
  ) {
    return 'de-DE';
  }

  if (
    locale ===
    'zh'
  ) {
    return 'zh-CN';
  }

  if (
    locale ===
    'ja'
  ) {
    return 'ja-JP';
  }

  if (
    locale ===
    'ko'
  ) {
    return 'ko-KR';
  }

  return 'en-US';
}

function formatDetailDate(
  value: string,
  locale: LocaleCode,
) {
  if (
    !value
  ) {
    return '—';
  }

  const date =
    new Date(
      value,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  try {
    return new Intl.DateTimeFormat(
      localeName(
        locale,
      ),
      {
        dateStyle:
          'medium',

        timeStyle:
          'short',
      },
    ).format(
      date,
    );
  } catch {
    return date.toLocaleString();
  }
}

function formatDetailMoney(
  value:
    | number
    | null,
  currency: string,
  locale: LocaleCode,
) {
  if (
    value ===
    null
  ) {
    return '—';
  }

  const code =
    (
      currency ||
      'THB'
    )
      .trim()
      .toUpperCase();

  try {
    return new Intl.NumberFormat(
      localeName(
        locale,
      ),
      {
        style:
          'currency',

        currency:
          code,

        minimumFractionDigits:
          0,

        maximumFractionDigits:
          2,
      },
    ).format(
      value,
    );
  } catch {
    return `${code} ${value.toLocaleString()}`;
  }
}

function customerStatusGroup(
  status: string,
) {
  const value =
    status
      .trim()
      .toLowerCase();

  if (
    [
      'completed',
      'redeemed',
      'used',
      'fulfilled',
      'served',
      'done',
      'consumed',
    ].includes(
      value,
    )
  ) {
    return 'used' as const;
  }

  if (
    [
      'confirmed',
      'approved',
      'accepted',
      'paid',
      'reserved',
      'booked',
      'ready',
      'active',
    ].includes(
      value,
    )
  ) {
    return 'waiting' as const;
  }

  if (
    [
      'cancelled',
      'canceled',
      'rejected',
      'expired',
      'failed',
      'refunded',
    ].includes(
      value,
    )
  ) {
    return 'other' as const;
  }

  return 'pending' as const;
}

function customerReference(
  value: string,
) {
  const raw =
    String(
      value ||
      '',
    ).trim();

  return raw
    ? `#${raw.replace(
        /^#+/,
        '',
      )}`
    : '—';
}

function normalizeReference(
  value: string,
) {
  return String(
    value ||
    '',
  )
    .trim()
    .replace(
      /^#+/,
      '',
    )
    .toLowerCase();
}

function serviceTypeLabel(
  value: string,
  copy: ServiceCopy,
) {
  switch (
    value
      .trim()
      .toLowerCase()
  ) {
    case 'promotion':
      return copy.promotion;

    case 'coupon':
      return copy.coupon;

    case 'package':
      return copy.package;

    case 'standard':
    default:
      return (
        value.trim() ||
        copy.standard
      );
  }
}

function serviceCategoryLabel(
  value: string,
  copy: ServiceCopy,
) {
  const raw =
    value.trim();

  const normalized =
    raw.toLowerCase();

  if (
    !raw ||
    normalized ===
      'general'
  ) {
    return copy.general;
  }

  const aliases:
    Record<
      string,
      string
    > = {
    food_drink:
      'Food / Drink',
    food:
      'Food',
    drink:
      'Drink',
    accommodation:
      'Accommodation',
    transport:
      'Transport',
    activity:
      'Activity',
    activities:
      'Activities',
    service:
      'Service',
    beauty:
      'Beauty',
    wellness:
      'Wellness',
    shopping:
      'Shopping',
    tour:
      'Tour',
    experience:
      'Experience',
  };

  return (
    aliases[
      normalized
    ] ||
    raw
      .replace(
        /[_-]+/g,
        ' ',
      )
      .replace(
        /\b\w/g,
        (
          character,
        ) =>
          character
            .toUpperCase(),
      )
  );
}

function servicePriceLabel(
  service:
    PartnerService,
  copy:
    ServiceCopy,
) {
  if (
    service.price ===
    null
  ) {
    return copy.askPrice;
  }

  const amount =
    service.price.toLocaleString(
      undefined,
      {
        maximumFractionDigits:
          2,
      },
    );

  const currency =
    service.currency ||
    'THB';

  return `${currency} ${amount}${
    service.priceUnit
      ? ` / ${service.priceUnit}`
      : ''
  }`;
}

function DetailRow({
  label,
  children,
  multiline = false,
}: {
  label: string;
  children: ReactNode;
  multiline?: boolean;
}) {
  return (
    <div
      className={
        multiline
          ? 'meloCustomerPopupRow meloCustomerPopupRowMulti'
          : 'meloCustomerPopupRow'
      }
    >
      <span>
        {
          label
        }
      </span>

      <strong>
        {
          children
        }
      </strong>
    </div>
  );
}

function PartnerServiceCard({
  service,
  copy,
  busy,
  expanded,
  onToggleDetails,
  onToggleActive,
  onEdit,
  onDelete,
}: {
  service:
    PartnerService;

  copy:
    ServiceCopy;

  busy:
    boolean;

  expanded:
    boolean;

  onToggleDetails:
    () => void;

  onToggleActive:
    () => void;

  onEdit:
    () => void;

  onDelete:
    () => void;
}) {
  const [
    image,
    setImage,
  ] =
    useState('');

  useEffect(
    () => {
      let alive =
        true;

      const path =
        service
          .imagePath
          ?.trim() ||
        '';

      if (
        !path
      ) {
        setImage('');

        return () => {
          alive =
            false;
        };
      }

      if (
        /^https?:\/\//i.test(
          path,
        )
      ) {
        setImage(
          path,
        );

        return () => {
          alive =
            false;
        };
      }

      void resolveCommerceMedia(
        {
          image_storage_path:
            path,

          image_path:
            path,

          service_image_path:
            path,

          product_image_path:
            path,
        },
      )
        .then(
          (
            resolved,
          ) => {
            if (
              alive
            ) {
              setImage(
                resolved,
              );
            }
          },
        )
        .catch(
          () => {
            if (
              alive
            ) {
              setImage('');
            }
          },
        );

      return () => {
        alive =
          false;
      };
    },
    [
      service.id,
      service.imagePath,
    ],
  );

  return (
    <article className="meloServiceProductCard">
      <div className="meloServiceProductMedia">
        {image ? (
          <img
            src={
              image
            }
            alt={
              service.title
            }
          />
        ) : (
          <div className="meloServiceProductMediaPlaceholder">
            <span>
              ▧
            </span>

            <strong>
              {
                copy.noImage
              }
            </strong>
          </div>
        )}

        <div className="meloServiceProductBadges">
          <span className="meloServiceCategoryBadge">
            {serviceCategoryLabel(
              service.category,
              copy,
            )}
          </span>

          <span
            className="meloServiceStatusBadge"
            data-active={
              service.active
            }
          >
            {service.active
              ? copy.availableNow
              : copy.unavailable}
          </span>
        </div>
      </div>

      <div className="meloServiceProductBody">
        <h3>
          {
            service.title
          }
        </h3>

        <p>
          {service.description ||
            serviceCategoryLabel(
              service.category,
              copy,
            )}
        </p>

        <div
          className="meloServiceAvailability"
          data-active={
            service.active
          }
        >
          <span>
            ⚡
          </span>

          <strong>
            {service.active
              ? copy.availableNow
              : copy.unavailable}
          </strong>
        </div>

        <div className="meloServiceProductPriceRow">
          <strong>
            {servicePriceLabel(
              service,
              copy,
            )}
          </strong>

          <button
            type="button"
            onClick={
              onToggleDetails
            }
          >
            {expanded
              ? copy.hideDetails
              : copy.details}{' '}
            ›
          </button>
        </div>

        {expanded ? (
          <div className="meloServiceProductDetails">
            <div>
              <small>
                {
                  copy.category
                }
              </small>

              <strong>
                {serviceCategoryLabel(
                  service.category,
                  copy,
                )}
              </strong>
            </div>

            <div>
              <small>
                {
                  copy.type
                }
              </small>

              <strong>
                {serviceTypeLabel(
                  service.detailType,
                  copy,
                )}
              </strong>
            </div>

            <div>
              <small>
                {
                  copy.priceUnit
                }
              </small>

              <strong>
                {service.priceUnit ||
                  '—'}
              </strong>
            </div>

            <div>
              <small>
                {
                  copy.status
                }
              </small>

              <strong>
                {service.active
                  ? copy.availableNow
                  : copy.unavailable}
              </strong>
            </div>
          </div>
        ) : null}
      </div>

      <div className="meloServiceProductActions">
        <button
          type="button"
          className="meloServiceAvailabilityButton"
          data-active={
            service.active
          }
          onClick={
            onToggleActive
          }
          disabled={
            busy
          }
        >
          {service.active
            ? copy.disable
            : copy.enable}
        </button>

        <button
          type="button"
          className="meloServiceEditButton"
          onClick={
            onEdit
          }
          disabled={
            busy
          }
        >
          {
            copy.edit
          }
        </button>

        <button
          type="button"
          className="meloServiceDeleteButton"
          onClick={
            onDelete
          }
          disabled={
            busy
          }
        >
          {
            copy.delete
          }
        </button>
      </div>
    </article>
  );
}

function CustomerDetailModal({
  item,
  transactions,
  businessId,
  locale: rawLocale,
  onClose,
}: {
  item:
    PartnerTransaction |
    null;

  transactions:
    PartnerTransaction[];

  businessId:
    string;

  locale:
    string;

  onClose:
    () => void;
}) {
  const locale =
    (
      Object.prototype.hasOwnProperty.call(
        DETAIL_COPY,
        rawLocale,
      )
        ? rawLocale
        : 'en'
    ) as LocaleCode;

  const copy =
    DETAIL_COPY[
      locale
    ];

  const [
    rawDetail,
    setRawDetail,
  ] =
    useState<
      Row |
      null
    >(null);

  const [
    loading,
    setLoading,
  ] =
    useState(
      false,
    );

  useEffect(
    () => {
      if (
        !item
      ) {
        setRawDetail(
          null,
        );

        return;
      }

      const previousOverflow =
        document
          .body
          .style
          .overflow;

      document
        .body
        .style
        .overflow =
        'hidden';

      const handleKeyDown =
        (
          event:
            KeyboardEvent,
        ) => {
          if (
            event.key ===
            'Escape'
          ) {
            onClose();
          }
        };

      window.addEventListener(
        'keydown',
        handleKeyDown,
      );

      return () => {
        document
          .body
          .style
          .overflow =
          previousOverflow;

        window.removeEventListener(
          'keydown',
          handleKeyDown,
        );
      };
    },
    [
      item,
      onClose,
    ],
  );

  useEffect(
    () => {
      let active =
        true;

      async function loadDetail() {
        if (
          !item ||
          !businessId
        ) {
          setRawDetail(
            null,
          );

          return;
        }

        setLoading(
          true,
        );

        try {
          let candidates:
            Row[] =
            [];

          if (
            item.kind ===
            'booking'
          ) {
            const [
              offers,
              bookings,
            ] =
              await Promise.all(
                [
                  rpcRequest<
                    Row[]
                  >(
                    'get_partner_booking_offers',
                    {
                      p_business_id:
                        businessId,
                    },
                  ),

                  rpcRequest<
                    Row[]
                  >(
                    'get_my_business_bookings',
                  ),
                ],
              );

            candidates = [
              ...rows(
                offers.data,
              ),

              ...rows(
                bookings.data,
              ),
            ];
          } else if (
            item.kind ===
            'order'
          ) {
            const result =
              await rpcRequest<
                Row[]
              >(
                'get_partner_service_orders',
                {
                  p_business_id:
                    businessId,
                },
              );

            candidates =
              rows(
                result.data,
              );
          } else {
            const result =
              await rpcRequest<
                Row[]
              >(
                'get_my_business_coupon_claims',
              );

            candidates =
              rows(
                result.data,
              );
          }

          const itemReference =
            normalizeReference(
              item.referenceCode,
            );

          const matched =
            candidates.find(
              (
                row,
              ) => {
                const rowId =
                  text(
                    row,
                    'id',
                    'booking_id',
                    'order_id',
                    'claim_id',
                    'coupon_claim_id',
                  );

                if (
                  rowId &&
                  rowId ===
                    item.id
                ) {
                  return true;
                }

                const rowReference =
                  normalizeReference(
                    text(
                      row,
                      'reference_code',
                      'booking_code',
                      'order_code',
                      'claim_code',
                      'coupon_code',
                      'transaction_code',
                      'code',
                    ),
                  );

                return Boolean(
                  rowReference &&
                  itemReference &&
                  rowReference ===
                    itemReference,
                );
              },
            ) ||
            null;

          if (
            active
          ) {
            setRawDetail(
              matched,
            );
          }
        } catch (
          caught
        ) {
          console.warn(
            '[Melo Partner] Unable to load transaction detail:',
            caught,
          );

          if (
            active
          ) {
            setRawDetail(
              null,
            );
          }
        } finally {
          if (
            active
          ) {
            setLoading(
              false,
            );
          }
        }
      }

      void loadDetail();

      return () => {
        active =
          false;
      };
    },
    [
      item,
      businessId,
    ],
  );

  const customerHistory =
    useMemo(
      () => {
        if (
          !item
        ) {
          return [];
        }

        const map =
          new Map<
            string,
            PartnerTransaction
          >();

        transactions.forEach(
          (
            transaction,
          ) => {
            const same =
              item.customerUserId &&
              transaction.customerUserId
                ? item.customerUserId ===
                  transaction.customerUserId
                : item.customerName
                    .trim()
                    .toLowerCase() ===
                  transaction.customerName
                    .trim()
                    .toLowerCase();

            if (
              same
            ) {
              map.set(
                `${transaction.kind}:${transaction.id}`,
                transaction,
              );
            }
          },
        );

        return [
          ...map.values(),
        ];
      },
      [
        item,
        transactions,
      ],
    );

  const customerTotal =
    useMemo(
      () =>
        customerHistory.reduce(
          (
            total,
            transaction,
          ) =>
            total +
            (
              transaction.amount ??
              0
            ),
          0,
        ),
      [
        customerHistory,
      ],
    );

  if (
    !item
  ) {
    return null;
  }

  const details =
    text(
      rawDetail,
      'notes',
      'details',
      'description',
      'service_description',
      'offer_notes',
      'order_notes',
      'coupon_details',
      'terms_text',
      'includes_text',
    );

  const serviceDate =
    text(
      rawDetail,
      'booking_date',
      'service_date',
      'scheduled_date',
      'redeem_date',
      'reservation_date',
    );

  const serviceTime =
    text(
      rawDetail,
      'booking_time',
      'service_time',
      'scheduled_time',
      'reservation_time',
    );

  const rawGuests =
    numberValue(
      rawDetail,
      'guest_count',
      'party_size',
      'people_count',
    );

  const rawQuantity =
    numberValue(
      rawDetail,
      'quantity',
      'item_count',
      'qty',
    );

  const paymentStatus =
    text(
      rawDetail,
      'payment_status',
      'payment_state',
      'order_payment_status',
      'charge_status',
    );

  const usageStatus =
    text(
      rawDetail,
      'usage_status',
      'redemption_status',
      'redeem_status',
      'service_usage_status',
    );

  const redeemedAt =
    text(
      rawDetail,
      'redeemed_at',
      'used_at',
      'fulfilled_at',
      'served_at',
      'consumed_at',
    );

  const createdAt =
    text(
      rawDetail,
      'created_at',
      'requested_at',
      'claimed_at',
      'ordered_at',
      'booked_at',
    ) ||
    item.createdAt;

  const schedule =
    serviceDate
      ? [
          serviceDate,
          serviceTime,
        ]
          .filter(
            Boolean,
          )
          .join(
            ' · ',
          )
      : formatDetailDate(
          item.scheduledAt ||
            item.createdAt,
          locale,
        );

  const group =
    customerStatusGroup(
      usageStatus ||
        item.status,
    );

  const normalizedPayment =
    paymentStatus
      .trim()
      .toLowerCase();

  const isPaid =
    [
      'paid',
      'completed',
      'succeeded',
      'success',
    ].includes(
      normalizedPayment,
    );

  const usageState =
    group ===
    'used'
      ? 'used'
      : group ===
          'waiting' ||
        isPaid
        ? 'waiting'
        : group ===
          'pending'
          ? 'pending'
          : 'other';

  const statusLabel =
    group ===
    'used'
      ? copy.used
      : group ===
          'waiting'
        ? copy.waiting
        : group ===
            'pending'
          ? copy.pending
          : item.status ||
            copy.unavailable;

  const paymentLabel =
    [
      'paid',
      'completed',
      'success',
      'succeeded',
    ].includes(
      normalizedPayment,
    )
      ? copy.paid
      : [
          'pending',
          'unpaid',
          'awaiting_payment',
          'processing',
        ].includes(
          normalizedPayment,
        )
        ? copy.awaitingPayment
        : [
            'refund',
            'refunded',
          ].includes(
            normalizedPayment,
          )
          ? copy.refunded
          : paymentStatus ||
            statusLabel;

  const kindLabel =
    item.kind ===
    'booking'
      ? copy.booking
      : item.kind ===
          'order'
        ? copy.order
        : copy.coupon;

  const quantity =
    item.kind ===
    'booking'
      ? (
          item.guestCount ??
          rawGuests ??
          1
        )
      : (
          rawQuantity ??
          item.guestCount ??
          1
        );

  const usageTitle =
    usageState ===
    'used'
      ? copy.usedTitle
      : usageState ===
          'waiting'
        ? copy.readyTitle
        : usageState ===
            'pending'
          ? copy.pendingTitle
          : copy.unavailableTitle;

  const usageBody =
    usageState ===
    'used'
      ? (
          redeemedAt
            ? `${copy.usedBody} · ${formatDetailDate(
                redeemedAt,
                locale,
              )}`
            : copy.usedBody
        )
      : usageState ===
          'waiting'
        ? copy.readyBody
        : usageState ===
            'pending'
          ? copy.pendingBody
          : copy.unavailableBody;

  const profileHref =
    item.customerUserId
      ? `/users/${item.customerUserId}`
      : '';

  return (
    <div
      className="meloCustomerPopupBackdrop"
      onMouseDown={(
        event,
      ) => {
        if (
          event.currentTarget ===
          event.target
        ) {
          onClose();
        }
      }}
    >
      <section
        className="meloCustomerPopup"
        role="dialog"
        aria-modal="true"
        aria-label={
          copy.eyebrow
        }
      >
        <header className="meloCustomerPopupHeader">
          <div>
            <small>
              {
                copy.eyebrow
              }
            </small>

            <h2>
              {
                item.title
              }
            </h2>

            <code>
              {customerReference(
                item.referenceCode,
              )}
            </code>
          </div>

          <button
            type="button"
            aria-label={
              copy.close
            }
            onClick={
              onClose
            }
          >
            ×
          </button>
        </header>

        <div className="meloCustomerPopupBody">
          {loading ? (
            <div className="meloCustomerPopupLoading">
              {
                copy.loading
              }
            </div>
          ) : null}

          <section className="meloCustomerPopupSection">
            <h3>
              {
                copy.customer
              }
            </h3>

            <div className="meloCustomerPopupProfile">
              {profileHref ? (
                <Link
                  href={
                    profileHref
                  }
                >
                  <VerifiedUserAvatar
                    userId={
                      item.customerUserId
                    }
                    name={
                      item.customerName
                    }
                    src={
                      item.customerPhotoUrl
                    }
                    country={
                      item.customerCountry
                    }
                    nationality={
                      item.customerNationality
                    }
                    size={
                      66
                    }
                    badgeSize={
                      18
                    }
                    alt={
                      item.customerName
                    }
                  />
                </Link>
              ) : (
                <VerifiedUserAvatar
                  name={
                    item.customerName
                  }
                  src={
                    item.customerPhotoUrl
                  }
                  country={
                    item.customerCountry
                  }
                  nationality={
                    item.customerNationality
                  }
                  size={
                    66
                  }
                  badgeSize={
                    18
                  }
                  alt={
                    item.customerName
                  }
                />
              )}

              <div className="meloCustomerPopupProfileCopy">
                {profileHref ? (
                  <Link
                    href={
                      profileHref
                    }
                  >
                    {
                      item.customerName
                    }
                  </Link>
                ) : (
                  <strong>
                    {
                      item.customerName
                    }
                  </strong>
                )}

                <span>
                  {
                    copy.member
                  }{' '}
                  ·{' '}
                  {
                    customerHistory.length
                  }{' '}
                  {
                    copy.storeItems
                  }
                </span>

                <small>
                  {
                    copy.storeTotal
                  }{' '}
                  <b>
                    {formatDetailMoney(
                      customerTotal,
                      item.currency,
                      locale,
                    )}
                  </b>
                </small>
              </div>

              <span
                className="meloCustomerPopupStatus"
                data-status={
                  group
                }
              >
                {
                  statusLabel
                }
              </span>
            </div>
          </section>

          <div className="meloCustomerPopupColumns">
            <section className="meloCustomerPopupSection">
              <h3>
                {
                  copy.product
                }
              </h3>

              <div className="meloCustomerPopupCard">
                <DetailRow
                  label={
                    copy.type
                  }
                >
                  {
                    kindLabel
                  }
                </DetailRow>

                <DetailRow
                  label={
                    copy.item
                  }
                >
                  {
                    item.title
                  }
                </DetailRow>

                <DetailRow
                  label={
                    copy.serviceDate
                  }
                >
                  {
                    schedule
                  }
                </DetailRow>

                <DetailRow
                  label={
                    copy.quantity
                  }
                >
                  {
                    quantity
                  }{' '}
                  {item.kind ===
                  'booking'
                    ? copy.people
                    : copy.units}
                </DetailRow>

                <DetailRow
                  label={
                    copy.details
                  }
                  multiline
                >
                  {
                    details ||
                    copy.noDetails
                  }
                </DetailRow>
              </div>
            </section>

            <section className="meloCustomerPopupSection">
              <h3>
                {
                  copy.payment
                }
              </h3>

              <div className="meloCustomerPopupCard">
                <DetailRow
                  label={
                    copy.customerAmount
                  }
                >
                  <b className="meloCustomerPopupMoney">
                    {formatDetailMoney(
                      item.amount,
                      item.currency,
                      locale,
                    )}
                  </b>
                </DetailRow>

                <DetailRow
                  label={
                    copy.paymentStatus
                  }
                >
                  {
                    paymentLabel
                  }
                </DetailRow>

                <DetailRow
                  label={
                    copy.created
                  }
                >
                  {formatDetailDate(
                    createdAt,
                    locale,
                  )}
                </DetailRow>
              </div>
            </section>
          </div>

          <section className="meloCustomerPopupSection">
            <h3>
              {
                copy.redemption
              }
            </h3>

            <div
              className="meloCustomerPopupUsage"
              data-state={
                usageState
              }
            >
              <span>
                {usageState ===
                'used'
                  ? '✓'
                  : '▣'}
              </span>

              <div>
                <strong>
                  {
                    usageTitle
                  }
                </strong>

                <p>
                  {
                    usageBody
                  }
                </p>
              </div>
            </div>
          </section>

          <button
            type="button"
            className="meloCustomerPopupCloseButton"
            onClick={
              onClose
            }
          >
            {
              copy.close
            }
          </button>
        </div>
      </section>

      <style jsx global>{`
        .meloCustomerPopupBackdrop {
          position: fixed;
          inset: 0;
          z-index: 300;
          display: grid;
          place-items: center;
          padding: 24px;
          background: rgba(4, 12, 22, 0.62);
          backdrop-filter: blur(9px);
        }

        .meloCustomerPopup {
          width: min(920px, 100%);
          max-height: calc(100vh - 48px);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          border: 1px solid var(--border);
          border-radius: 27px;
          background: var(--surface);
          color: var(--text);
          box-shadow:
            0 32px 100px
            rgba(0, 0, 0, 0.34);
        }

        .meloCustomerPopupHeader {
          position: relative;
          flex: 0 0 auto;
          min-height: 104px;
          padding:
            22px
            76px
            20px
            25px;
          border-bottom: 1px solid var(--border);
          background:
            color-mix(
              in srgb,
              var(--surface) 93%,
              var(--primary-soft)
            );
        }

        .meloCustomerPopupHeader small {
          display: block;
          color: var(--primary);
          font-size: 9px;
          font-weight: 950;
          letter-spacing: 0.08em;
        }

        .meloCustomerPopupHeader h2 {
          max-width: 730px;
          margin: 7px 0 5px;
          color: var(--text);
          font-size: 23px;
          line-height: 1.28;
          letter-spacing: -0.025em;
          overflow-wrap: anywhere;
        }

        .meloCustomerPopupHeader code {
          display: block;
          color: var(--text-secondary);
          font-family: inherit;
          font-size: 9px;
          font-weight: 800;
        }

        .meloCustomerPopupHeader > button {
          position: absolute;
          top: 18px;
          right: 18px;
          width: 41px;
          height: 41px;
          display: grid;
          place-items: center;
          border: 1px solid var(--border);
          border-radius: 13px;
          background: var(--surface-2);
          color: var(--text);
          font: inherit;
          font-size: 23px;
          cursor: pointer;
        }

        .meloCustomerPopupHeader > button:hover {
          border-color:
            color-mix(
              in srgb,
              var(--primary) 42%,
              var(--border)
            );
          background: var(--primary-soft);
          color: var(--primary);
        }

        .meloCustomerPopupBody {
          min-height: 0;
          display: grid;
          gap: 20px;
          overflow-y: auto;
          padding: 20px 24px 24px;
        }

        .meloCustomerPopupLoading {
          margin-bottom: -7px;
          color: var(--primary);
          font-size: 9px;
          font-weight: 850;
        }

        .meloCustomerPopupSection {
          min-width: 0;
        }

        .meloCustomerPopupSection > h3 {
          margin: 0 0 9px;
          color: var(--text);
          font-size: 14px;
          font-weight: 950;
        }

        .meloCustomerPopupProfile {
          display: grid;
          grid-template-columns:
            66px
            minmax(0, 1fr)
            auto;
          gap: 14px;
          align-items: center;
          padding: 14px;
          border: 1px solid var(--border);
          border-radius: 20px;
          background: var(--surface-2);
        }

        .meloCustomerPopupProfile > a {
          line-height: 0;
        }

        .meloCustomerPopupProfileCopy {
          min-width: 0;
        }

        .meloCustomerPopupProfileCopy > a,
        .meloCustomerPopupProfileCopy > strong {
          display: block;
          width: max-content;
          max-width: 100%;
          overflow: hidden;
          color: var(--text);
          font-size: 14px;
          font-weight: 950;
          text-decoration: none;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .meloCustomerPopupProfileCopy > a:hover {
          color: var(--primary);
        }

        .meloCustomerPopupProfileCopy > span {
          display: block;
          margin-top: 4px;
          color: var(--text-secondary);
          font-size: 8.5px;
          line-height: 1.55;
        }

        .meloCustomerPopupProfileCopy > small {
          display: block;
          margin-top: 4px;
          color: var(--text-secondary);
          font-size: 8.5px;
        }

        .meloCustomerPopupProfileCopy > small b {
          color: var(--text);
          font-size: 9px;
        }

        .meloCustomerPopupStatus {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 30px;
          padding: 0 11px;
          border-radius: 999px;
          background: var(--surface);
          color: var(--text-secondary);
          font-size: 8px;
          font-weight: 900;
          white-space: nowrap;
        }

        .meloCustomerPopupStatus[data-status='pending'] {
          background:
            color-mix(
              in srgb,
              var(--warning) 13%,
              var(--surface)
            );
          color:
            color-mix(
              in srgb,
              var(--warning) 80%,
              var(--text)
            );
        }

        .meloCustomerPopupStatus[data-status='waiting'] {
          background: var(--primary-soft);
          color: var(--primary);
        }

        .meloCustomerPopupStatus[data-status='used'] {
          background:
            color-mix(
              in srgb,
              #26a269 13%,
              var(--surface)
            );
          color:
            color-mix(
              in srgb,
              #26a269 80%,
              var(--text)
            );
        }

        .meloCustomerPopupColumns {
          display: grid;
          grid-template-columns:
            minmax(0, 1.25fr)
            minmax(280px, 0.75fr);
          gap: 15px;
          align-items: start;
        }

        .meloCustomerPopupCard {
          overflow: hidden;
          border: 1px solid var(--border);
          border-radius: 20px;
          background: var(--surface-2);
        }

        .meloCustomerPopupRow {
          display: grid;
          grid-template-columns:
            minmax(115px, 0.42fr)
            minmax(0, 1fr);
          gap: 17px;
          align-items: start;
          padding: 13px 15px;
          border-top: 1px solid var(--border);
        }

        .meloCustomerPopupRow:first-child {
          border-top: 0;
        }

        .meloCustomerPopupRow > span {
          color: var(--text-secondary);
          font-size: 8px;
          font-weight: 800;
        }

        .meloCustomerPopupRow > strong {
          min-width: 0;
          color: var(--text);
          font-size: 9.5px;
          line-height: 1.55;
          text-align: right;
          overflow-wrap: anywhere;
        }

        .meloCustomerPopupRowMulti {
          grid-template-columns: 1fr;
          gap: 7px;
        }

        .meloCustomerPopupRowMulti > strong {
          white-space: pre-wrap;
          text-align: left;
          line-height: 1.72;
        }

        .meloCustomerPopupMoney {
          color: var(--primary);
          font-size: 14px;
        }

        .meloCustomerPopupUsage {
          display: grid;
          grid-template-columns:
            48px
            minmax(0, 1fr);
          gap: 13px;
          align-items: center;
          padding: 15px;
          border: 1px solid
            color-mix(
              in srgb,
              var(--primary) 34%,
              var(--border)
            );
          border-radius: 20px;
          background:
            color-mix(
              in srgb,
              var(--primary-soft) 70%,
              var(--surface)
            );
        }

        .meloCustomerPopupUsage > span {
          width: 48px;
          height: 48px;
          display: grid;
          place-items: center;
          border-radius: 14px;
          background: var(--primary-soft);
          color: var(--primary);
          font-size: 18px;
          font-weight: 950;
        }

        .meloCustomerPopupUsage strong {
          display: block;
          color: var(--text);
          font-size: 11px;
        }

        .meloCustomerPopupUsage p {
          margin: 4px 0 0;
          color: var(--text-secondary);
          font-size: 8.5px;
          line-height: 1.6;
        }

        .meloCustomerPopupUsage[data-state='used'] {
          border-color:
            color-mix(
              in srgb,
              #26a269 35%,
              var(--border)
            );
          background:
            color-mix(
              in srgb,
              #26a269 9%,
              var(--surface)
            );
        }

        .meloCustomerPopupUsage[data-state='used'] > span {
          background:
            color-mix(
              in srgb,
              #26a269 14%,
              var(--surface)
            );
          color: #269765;
        }

        .meloCustomerPopupUsage[data-state='pending'] {
          border-color:
            color-mix(
              in srgb,
              var(--warning) 35%,
              var(--border)
            );
          background:
            color-mix(
              in srgb,
              var(--warning) 8%,
              var(--surface)
            );
        }

        .meloCustomerPopupUsage[data-state='pending'] > span {
          background:
            color-mix(
              in srgb,
              var(--warning) 14%,
              var(--surface)
            );
          color:
            color-mix(
              in srgb,
              var(--warning) 80%,
              var(--text)
            );
        }

        .meloCustomerPopupUsage[data-state='other'] {
          border-color: var(--border);
          background: var(--surface-2);
        }

        .meloCustomerPopupUsage[data-state='other'] > span {
          background: var(--surface-3);
          color: var(--text-secondary);
        }

        .meloCustomerPopupCloseButton {
          width: 100%;
          min-height: 45px;
          border: 1px solid var(--border);
          border-radius: 13px;
          background: var(--surface-2);
          color: var(--text);
          font: inherit;
          font-size: 10px;
          font-weight: 900;
          cursor: pointer;
        }

        .meloCustomerPopupCloseButton:hover {
          border-color:
            color-mix(
              in srgb,
              var(--primary) 40%,
              var(--border)
            );
          background: var(--primary-soft);
          color: var(--primary);
        }

        @media (max-width: 760px) {
          .meloCustomerPopupBackdrop {
            padding: 12px;
          }

          .meloCustomerPopup {
            max-height: calc(100vh - 24px);
            border-radius: 22px;
          }

          .meloCustomerPopupHeader {
            min-height: 92px;
            padding:
              19px
              64px
              17px
              18px;
          }

          .meloCustomerPopupHeader h2 {
            font-size: 19px;
          }

          .meloCustomerPopupBody {
            padding:
              16px
              16px
              18px;
          }

          .meloCustomerPopupColumns {
            grid-template-columns: 1fr;
          }

          .meloCustomerPopupProfile {
            grid-template-columns:
              58px
              minmax(0, 1fr);
          }

          .meloCustomerPopupStatus {
            grid-column: 2;
            justify-self: start;
          }

          .meloCustomerPopupRow {
            grid-template-columns:
              minmax(90px, 0.4fr)
              minmax(0, 1fr);
          }
        }

        @media (max-width: 480px) {
          .meloCustomerPopupBackdrop {
            padding: 0;
            place-items: end center;
          }

          .meloCustomerPopup {
            width: 100%;
            max-height: 94vh;
            border-right: 0;
            border-bottom: 0;
            border-left: 0;
            border-radius:
              25px
              25px
              0
              0;
          }

          .meloCustomerPopupRow {
            grid-template-columns: 1fr;
            gap: 5px;
          }

          .meloCustomerPopupRow > strong {
            text-align: left;
          }
        }
      `}</style>
    </div>
  );
}

function StorePanel({
  business,
  access,
  viewStoreLabel,
}: {
  business:
    Row |
    null;

  access:
    PartnerBusinessAccess;

  viewStoreLabel:
    string;
}) {
  const [
    image,
    setImage,
  ] =
    useState('');

  useEffect(
    () => {
      let alive =
        true;

      const candidate =
        business
          ? {
              logo_storage_path:
                text(
                  business,
                  'logo_storage_path',
                  'logo_path',
                ),

              profile_image_path:
                text(
                  business,
                  'profile_image_path',
                ),
            }
          : {};

      void resolveCommerceMedia(
        candidate,
      )
        .then(
          (
            value,
          ) => {
            if (
              alive
            ) {
              setImage(
                value,
              );
            }
          },
        )
        .catch(
          () => {
            if (
              alive
            ) {
              setImage('');
            }
          },
        );

      return () => {
        alive =
          false;
      };
    },
    [
      business,
    ],
  );

  return (
    <div
      className={
        styles.panel
      }
    >
      <div
        className={
          styles.storeProfile
        }
      >
        <div
          className={
            styles.storeProfileImage
          }
        >
          {image ? (
            <img
              src={
                image
              }
              alt=""
            />
          ) : (
            <span>
              ▣
            </span>
          )}
        </div>

        <div>
          <h2>
            {text(
              business,
              'display_name',
              'name',
            ) ||
              access.displayName}
          </h2>

          <p>
            {text(
              business,
              'description',
            ) ||
              'Melo Partner'}
          </p>

          <div
            className={
              styles.detailGrid
            }
          >
            <div>
              <small>
                TYPE
              </small>

              <strong>
                {text(
                  business,
                  'business_type',
                ) ||
                  access.businessType}
              </strong>
            </div>

            <div>
              <small>
                STATUS
              </small>

              <strong>
                {text(
                  business,
                  'status',
                ) ||
                  'approved'}
              </strong>
            </div>

            <div>
              <small>
                LOCATION
              </small>

              <strong>
                {[
                  text(
                    business,
                    'city',
                  ),

                  text(
                    business,
                    'country',
                  ),
                ]
                  .filter(
                    Boolean,
                  )
                  .join(
                    ', ',
                  ) ||
                  '—'}
              </strong>
            </div>

            <div>
              <small>
                ROLE
              </small>

              <strong>
                {access
                  .role
                  .toUpperCase()}
              </strong>
            </div>
          </div>

          <div
            className={
              styles.toolbar
            }
            style={{
              marginTop:
                14,
            }}
          >
            <Link
              className={
                styles.primaryButton
              }
              href={`/partners/${access.businessId}`}
              style={{
                padding:
                  '10px 13px',

                borderRadius:
                  12,
              }}
            >
              {
                viewStoreLabel
              }
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PartnerWorkspaceExperience({
  section,
}: {
  section:
    Section;
}) {
  const {
    locale,
  } =
    useLocale();

  const t =
    COPY[
      locale
    ] ??
    COPY.en;

  const customerT =
    CUSTOMER_COPY[
      locale
    ] ??
    CUSTOMER_COPY.en;

  const serviceT =
    SERVICE_COPY[
      locale
    ] ??
    SERVICE_COPY.en;

  const [
    access,
    setAccess,
  ] =
    useState<
      PartnerBusinessAccess |
      null
    >(null);

  const [
    loading,
    setLoading,
  ] =
    useState(
      true,
    );

  const [
    error,
    setError,
  ] =
    useState('');

  const [
    business,
    setBusiness,
  ] =
    useState<
      Row |
      null
    >(null);

  const [
    services,
    setServices,
  ] =
    useState<
      PartnerService[]
    >([]);

  const [
    transactions,
    setTransactions,
  ] =
    useState<
      PartnerTransaction[]
    >([]);

  const [
    staff,
    setStaff,
  ] =
    useState<
      PartnerStaffMember[]
    >([]);

  const [
    wallet,
    setWallet,
  ] =
    useState(
      EMPTY_WALLET,
    );

  const [
    summary,
    setSummary,
  ] =
    useState(
      EMPTY_SUMMARY,
    );

  const [
    activity,
    setActivity,
  ] =
    useState<
      any[]
    >([]);

  const [
    staffEmail,
    setStaffEmail,
  ] =
    useState('');

  const [
    staffRole,
    setStaffRole,
  ] =
    useState<
      | 'admin'
      | 'manager'
      | 'staff'
    >('staff');

  const [
    busy,
    setBusy,
  ] =
    useState(
      false,
    );

  const [
    serviceFormOpen,
    setServiceFormOpen,
  ] =
    useState(
      false,
    );

  const [
    serviceEditingId,
    setServiceEditingId,
  ] =
    useState<
      string |
      null
    >(null);

  const [
    serviceTitle,
    setServiceTitle,
  ] =
    useState('');

  const [
    serviceDescription,
    setServiceDescription,
  ] =
    useState('');

  const [
    serviceCategory,
    setServiceCategory,
  ] =
    useState(
      'general',
    );

  const [
    servicePrice,
    setServicePrice,
  ] =
    useState('');

  const [
    serviceCurrency,
    setServiceCurrency,
  ] =
    useState(
      'THB',
    );

  const [
    servicePriceUnit,
    setServicePriceUnit,
  ] =
    useState('');

  const [
    serviceType,
    setServiceType,
  ] =
    useState(
      'standard',
    );

  const [
    serviceFilter,
    setServiceFilter,
  ] =
    useState(
      'all',
    );

  const [
    expandedServiceId,
    setExpandedServiceId,
  ] =
    useState<
      string |
      null
    >(null);

  const [
    customerFilter,
    setCustomerFilter,
  ] =
    useState<
      CustomerFilter
    >('all');

  const [
    customerQuery,
    setCustomerQuery,
  ] =
    useState('');

  /*
   * เปลี่ยนจาก expandedTransactionId
   * เป็น transaction ที่เลือกสำหรับ Popup
   */
  const [
    selectedTransaction,
    setSelectedTransaction,
  ] =
    useState<
      PartnerTransaction |
      null
    >(null);

  const title =
    section ===
    'customers'
      ? customerT.title
      : (
          t as Record<
            string,
            string
          >
        )[
          section
        ] ||
        section;

  const load =
    useCallback(
      async () => {
        setLoading(
          true,
        );

        setError('');

        try {
          const nextAccess =
            await getActivePartnerBusiness();

          setAccess(
            nextAccess,
          );

          if (
            !nextAccess
          ) {
            return;
          }

          const permission =
            PERMISSION[
              section
            ] as any;

          const sectionAllowed =
            section ===
            'customers'
              ? (
                  hasPartnerPermission(
                    nextAccess,
                    'sales',
                  ) ||
                  hasPartnerPermission(
                    nextAccess,
                    'bookings',
                  ) ||
                  hasPartnerPermission(
                    nextAccess,
                    'coupons',
                  )
                )
              : hasPartnerPermission(
                  nextAccess,
                  permission,
                );

          if (
            !sectionAllowed
          ) {
            return;
          }

          if (
            section ===
            'store'
          ) {
            setBusiness(
              await getPartnerBusiness(
                nextAccess.businessId,
              ),
            );
          } else if (
            section ===
            'services'
          ) {
            setServices(
              await listPartnerServices(
                nextAccess.businessId,
              ),
            );
          } else if (
            section ===
            'customers'
          ) {
            setTransactions(
              await listPartnerTransactions(
                nextAccess.businessId,
              ),
            );
          } else if (
            section ===
            'finance'
          ) {
            const [
              nextWallet,
              nextSummary,
            ] =
              await Promise.all(
                [
                  getPartnerWallet(
                    nextAccess.businessId,
                  ),

                  getPartnerDashboardSummary(
                    nextAccess.businessId,
                  ),
                ],
              );

            setWallet(
              nextWallet,
            );

            setSummary(
              nextSummary,
            );
          } else if (
            section ===
              'analytics' ||
            section ===
              'reports'
          ) {
            const [
              nextSummary,
              nextActivity,
              nextTransactions,
            ] =
              await Promise.all(
                [
                  getPartnerDashboardSummary(
                    nextAccess.businessId,
                  ),

                  getPartnerRecentActivity(
                    nextAccess.businessId,
                  ),

                  listPartnerTransactions(
                    nextAccess.businessId,
                  ),
                ],
              );

            setSummary(
              nextSummary,
            );

            setActivity(
              nextActivity,
            );

            setTransactions(
              nextTransactions,
            );
          } else if (
            section ===
            'staff'
          ) {
            setStaff(
              await listPartnerStaff(
                nextAccess.businessId,
              ),
            );
          }
        } catch (
          caught
        ) {
          setError(
            caught instanceof
              Error
              ? caught.message
              : String(
                  caught,
                ),
          );
        } finally {
          setLoading(
            false,
          );
        }
      },
      [
        section,
      ],
    );

  useEffect(
    () => {
      void load();
    },
    [
      load,
    ],
  );

  const allowed =
    access
      ? section ===
        'customers'
        ? (
            hasPartnerPermission(
              access,
              'sales',
            ) ||
            hasPartnerPermission(
              access,
              'bookings',
            ) ||
            hasPartnerPermission(
              access,
              'coupons',
            )
          )
        : hasPartnerPermission(
            access,
            PERMISSION[
              section
            ] as any,
          )
      : false;

  const customerCounts =
    useMemo(
      () => ({
        all:
          transactions.length,

        order:
          transactions.filter(
            (
              item,
            ) =>
              item.kind ===
              'order',
          ).length,

        booking:
          transactions.filter(
            (
              item,
            ) =>
              item.kind ===
              'booking',
          ).length,

        coupon:
          transactions.filter(
            (
              item,
            ) =>
              item.kind ===
              'coupon',
          ).length,
      }),
      [
        transactions,
      ],
    );

  const customerStats =
    useMemo(
      () => ({
        pending:
          transactions.filter(
            (
              item,
            ) =>
              customerStatusGroup(
                item.status,
              ) ===
              'pending',
          ).length,

        waiting:
          transactions.filter(
            (
              item,
            ) =>
              customerStatusGroup(
                item.status,
              ) ===
              'waiting',
          ).length,

        used:
          transactions.filter(
            (
              item,
            ) =>
              customerStatusGroup(
                item.status,
              ) ===
              'used',
          ).length,
      }),
      [
        transactions,
      ],
    );

  const filteredCustomerTransactions =
    useMemo(
      () => {
        const query =
          customerQuery
            .trim()
            .toLowerCase();

        return transactions.filter(
          (
            item,
          ) =>
            (
              customerFilter ===
                'all' ||
              item.kind ===
                customerFilter
            ) &&
            (
              !query ||
              [
                item.customerName,
                item.title,
                item.referenceCode,
                item.status,
              ].some(
                (
                  value,
                ) =>
                  String(
                    value ||
                    '',
                  )
                    .toLowerCase()
                    .includes(
                      query,
                    ),
              )
            ),
        );
      },
      [
        transactions,
        customerFilter,
        customerQuery,
      ],
    );

  const serviceCategories =
    useMemo(
      () =>
        Array.from(
          new Set(
            services.map(
              (
                item,
              ) =>
                item.category
                  .trim() ||
                'general',
            ),
          ),
        ).sort(
          (
            left,
            right,
          ) =>
            serviceCategoryLabel(
              left,
              serviceT,
            ).localeCompare(
              serviceCategoryLabel(
                right,
                serviceT,
              ),
            ),
        ),
      [
        services,
        serviceT,
      ],
    );

  const filteredServices =
    useMemo(
      () =>
        serviceFilter ===
        'all'
          ? services
          : services.filter(
              (
                item,
              ) =>
                (
                  item.category
                    .trim() ||
                  'general'
                ) ===
                serviceFilter,
            ),
      [
        services,
        serviceFilter,
      ],
    );

  useEffect(
    () => {
      if (
        serviceFilter !==
          'all' &&
        !serviceCategories.includes(
          serviceFilter,
        )
      ) {
        setServiceFilter(
          'all',
        );
      }
    },
    [
      serviceFilter,
      serviceCategories,
    ],
  );

  function resetServiceForm() {
    setServiceEditingId(
      null,
    );

    setServiceTitle(
      '',
    );

    setServiceDescription(
      '',
    );

    setServiceCategory(
      'general',
    );

    setServicePrice(
      '',
    );

    setServiceCurrency(
      'THB',
    );

    setServicePriceUnit(
      '',
    );

    setServiceType(
      'standard',
    );
  }

  function openNewService() {
    resetServiceForm();

    setServiceFormOpen(
      true,
    );
  }

  function openEditService(
    service:
      PartnerService,
  ) {
    setServiceEditingId(
      service.id,
    );

    setServiceTitle(
      service.title,
    );

    setServiceDescription(
      service.description,
    );

    setServiceCategory(
      service.category ||
      'general',
    );

    setServicePrice(
      service.price ===
      null
        ? ''
        : String(
            service.price,
          ),
    );

    setServiceCurrency(
      service.currency ||
      'THB',
    );

    setServicePriceUnit(
      service.priceUnit ||
      '',
    );

    setServiceType(
      service.detailType ||
      'standard',
    );

    setServiceFormOpen(
      true,
    );
  }

  function closeServiceForm() {
    setServiceFormOpen(
      false,
    );

    resetServiceForm();
  }

  async function toggleService(
    service:
      PartnerService,
  ) {
    if (
      !access ||
      busy
    ) {
      return;
    }

    setBusy(
      true,
    );

    try {
      await setPartnerServiceActive(
        access.businessId,
        service.id,
        !service.active,
      );

      await load();
    } catch (
      caught
    ) {
      setError(
        caught instanceof
          Error
          ? caught.message
          : String(
              caught,
            ),
      );
    } finally {
      setBusy(
        false,
      );
    }
  }

  async function createService(
    event:
      FormEvent,
  ) {
    event.preventDefault();

    if (
      !access ||
      !serviceTitle.trim() ||
      busy
    ) {
      return;
    }

    setBusy(
      true,
    );

    try {
      await savePartnerService(
        {
          businessId:
            access.businessId,

          serviceId:
            serviceEditingId,

          category:
            serviceCategory,

          title:
            serviceTitle,

          description:
            serviceDescription,

          price:
            servicePrice.trim()
              ? Number(
                  servicePrice,
                )
              : null,

          currency:
            serviceCurrency,

          priceUnit:
            servicePriceUnit,

          detailType:
            serviceType,
        },
      );

      closeServiceForm();

      await load();
    } catch (
      caught
    ) {
      setError(
        caught instanceof
          Error
          ? caught.message
          : String(
              caught,
            ),
      );
    } finally {
      setBusy(
        false,
      );
    }
  }

  async function removeServiceItem(
    service:
      PartnerService,
  ) {
    if (
      !access ||
      busy
    ) {
      return;
    }

    if (
      !window.confirm(
        `${serviceT.confirmDelete}\n${service.title}`,
      )
    ) {
      return;
    }

    setBusy(
      true,
    );

    try {
      await deletePartnerService(
        access.businessId,
        service.id,
      );

      if (
        expandedServiceId ===
        service.id
      ) {
        setExpandedServiceId(
          null,
        );
      }

      await load();
    } catch (
      caught
    ) {
      setError(
        caught instanceof
          Error
          ? caught.message
          : String(
              caught,
            ),
      );
    } finally {
      setBusy(
        false,
      );
    }
  }

  async function submitStaff(
    event:
      FormEvent,
  ) {
    event.preventDefault();

    if (
      !access ||
      !staffEmail.trim() ||
      busy
    ) {
      return;
    }

    setBusy(
      true,
    );

    try {
      await addPartnerStaff(
        access.businessId,
        staffEmail,
        staffRole,
      );

      setStaffEmail('');

      await load();
    } catch (
      caught
    ) {
      setError(
        caught instanceof
          Error
          ? caught.message
          : String(
              caught,
            ),
      );
    } finally {
      setBusy(
        false,
      );
    }
  }

  async function deleteStaff(
    item:
      PartnerStaffMember,
  ) {
    if (
      !access ||
      busy ||
      !confirm(
        `${t.remove}: ${item.displayName}?`,
      )
    ) {
      return;
    }

    setBusy(
      true,
    );

    try {
      await removePartnerStaff(
        access.businessId,
        item.id,
      );

      await load();
    } catch (
      caught
    ) {
      setError(
        caught instanceof
          Error
          ? caught.message
          : String(
              caught,
            ),
      );
    } finally {
      setBusy(
        false,
      );
    }
  }

  function exportCsv() {
    const lines = [
      [
        'type',
        'customer',
        'service',
        'status',
        'amount',
        'currency',
        'created_at',
      ],

      ...transactions.map(
        (
          item,
        ) => [
          item.kind,
          item.customerName,
          item.title,
          item.status,
          item.amount ??
            '',
          item.currency,
          item.createdAt,
        ],
      ),
    ];

    const csv =
      lines
        .map(
          (
            row,
          ) =>
            row
              .map(
                (
                  value,
                ) =>
                  `"${String(
                    value,
                  ).replace(
                    /"/g,
                    '""',
                  )}"`,
              )
              .join(
                ',',
              ),
        )
        .join(
          '\r\n',
        );

    const blob =
      new Blob(
        [
          `\ufeff${csv}`,
        ],
        {
          type:
            'text/csv;charset=utf-8',
        },
      );

    const url =
      URL.createObjectURL(
        blob,
      );

    const anchor =
      document.createElement(
        'a',
      );

    anchor.href =
      url;

    anchor.download =
      `melo-partner-${access?.businessId || 'report'}.csv`;

    anchor.click();

    URL.revokeObjectURL(
      url,
    );
  }

  function renderSection() {
    if (
      section ===
      'store'
    ) {
      return (
        <StorePanel
          business={
            business
          }
          access={
            access!
          }
          viewStoreLabel={
            t.viewStore
          }
        />
      );
    }

    if (
      section ===
      'services'
    ) {
      return (
        <>
          <div className="meloServiceCatalog">
            <div className="meloServiceFilterBar">
              <button
                type="button"
                className={
                  serviceFilter ===
                  'all'
                    ? 'meloServiceFilterActive'
                    : 'meloServiceFilterButton'
                }
                onClick={() =>
                  setServiceFilter(
                    'all',
                  )
                }
              >
                <span>
                  {
                    serviceT.all
                  }
                </span>

                <b>
                  {
                    services.length
                  }
                </b>
              </button>

              {serviceCategories.map(
                (
                  category,
                ) => {
                  const count =
                    services.filter(
                      (
                        item,
                      ) =>
                        (
                          item.category
                            .trim() ||
                          'general'
                        ) ===
                        category,
                    ).length;

                  return (
                    <button
                      type="button"
                      key={
                        category
                      }
                      className={
                        serviceFilter ===
                        category
                          ? 'meloServiceFilterActive'
                          : 'meloServiceFilterButton'
                      }
                      onClick={() =>
                        setServiceFilter(
                          category,
                        )
                      }
                    >
                      <span>
                        {serviceCategoryLabel(
                          category,
                          serviceT,
                        )}
                      </span>

                      <b>
                        {
                          count
                        }
                      </b>
                    </button>
                  );
                },
              )}
            </div>

            {filteredServices.length ? (
              <div className="meloServiceProductGrid">
                {filteredServices.map(
                  (
                    service,
                  ) => (
                    <PartnerServiceCard
                      key={
                        service.id
                      }
                      service={
                        service
                      }
                      copy={
                        serviceT
                      }
                      busy={
                        busy
                      }
                      expanded={
                        expandedServiceId ===
                        service.id
                      }
                      onToggleDetails={() =>
                        setExpandedServiceId(
                          expandedServiceId ===
                            service.id
                            ? null
                            : service.id,
                        )
                      }
                      onToggleActive={() =>
                        void toggleService(
                          service,
                        )
                      }
                      onEdit={() =>
                        openEditService(
                          service,
                        )
                      }
                      onDelete={() =>
                        void removeServiceItem(
                          service,
                        )
                      }
                    />
                  ),
                )}
              </div>
            ) : (
              <div
                className={
                  styles.panel
                }
              >
                <div
                  className={
                    styles.empty
                  }
                >
                  {
                    t.noData
                  }
                </div>
              </div>
            )}
          </div>

          {serviceFormOpen ? (
            <div
              className={
                styles.partnerModalBackdrop
              }
              onMouseDown={(
                event,
              ) => {
                if (
                  event.currentTarget ===
                  event.target
                ) {
                  closeServiceForm();
                }
              }}
            >
              <form
                className={
                  styles.partnerModal
                }
                onSubmit={
                  createService
                }
              >
                <button
                  type="button"
                  className={
                    styles.partnerModalClose
                  }
                  onClick={
                    closeServiceForm
                  }
                >
                  ×
                </button>

                <small>
                  MELO PARTNER
                </small>

                <h2>
                  {serviceEditingId
                    ? serviceT.editTitle
                    : serviceT.addTitle}
                </h2>

                <label>
                  {
                    serviceT.title
                  }

                  <input
                    value={
                      serviceTitle
                    }
                    onChange={(
                      event,
                    ) =>
                      setServiceTitle(
                        event
                          .target
                          .value,
                      )
                    }
                    required
                  />
                </label>

                <label>
                  {
                    serviceT.description
                  }

                  <textarea
                    value={
                      serviceDescription
                    }
                    onChange={(
                      event,
                    ) =>
                      setServiceDescription(
                        event
                          .target
                          .value,
                      )
                    }
                  />
                </label>

                <div
                  className={
                    styles.partnerFormGrid
                  }
                >
                  <label>
                    {
                      serviceT.category
                    }

                    <input
                      value={
                        serviceCategory
                      }
                      onChange={(
                        event,
                      ) =>
                        setServiceCategory(
                          event
                            .target
                            .value,
                        )
                      }
                    />
                  </label>

                  <label>
                    {
                      serviceT.type
                    }

                    <select
                      value={
                        serviceType
                      }
                      onChange={(
                        event,
                      ) =>
                        setServiceType(
                          event
                            .target
                            .value,
                        )
                      }
                    >
                      <option value="standard">
                        {
                          serviceT.standard
                        }
                      </option>

                      <option value="promotion">
                        {
                          serviceT.promotion
                        }
                      </option>

                      <option value="coupon">
                        {
                          serviceT.coupon
                        }
                      </option>

                      <option value="package">
                        {
                          serviceT.package
                        }
                      </option>
                    </select>
                  </label>

                  <label>
                    {
                      serviceT.price
                    }

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        servicePrice
                      }
                      onChange={(
                        event,
                      ) =>
                        setServicePrice(
                          event
                            .target
                            .value,
                        )
                      }
                    />
                  </label>

                  <label>
                    {
                      serviceT.currency
                    }

                    <select
                      value={
                        serviceCurrency
                      }
                      onChange={(
                        event,
                      ) =>
                        setServiceCurrency(
                          event
                            .target
                            .value,
                        )
                      }
                    >
                      <option>
                        THB
                      </option>

                      <option>
                        USD
                      </option>

                      <option>
                        EUR
                      </option>

                      <option>
                        JPY
                      </option>

                      <option>
                        KRW
                      </option>

                      <option>
                        CNY
                      </option>
                    </select>
                  </label>

                  <label>
                    {
                      serviceT.priceUnit
                    }

                    <input
                      value={
                        servicePriceUnit
                      }
                      onChange={(
                        event,
                      ) =>
                        setServicePriceUnit(
                          event
                            .target
                            .value,
                        )
                      }
                      placeholder={
                        locale ===
                        'th'
                          ? 'เช่น ชุด / คน / คืน'
                          : 'e.g. set / person / night'
                      }
                    />
                  </label>
                </div>

                <button
                  className={
                    styles.primaryButton
                  }
                  disabled={
                    busy ||
                    !serviceTitle.trim()
                  }
                >
                  {serviceEditingId
                    ? serviceT.update
                    : serviceT.save}
                </button>
              </form>
            </div>
          ) : null}
        </>
      );
    }

    if (
      section ===
      'customers'
    ) {
      return (
        <div
          className={
            styles.customerWorkspace
          }
        >
          <section
            className={
              styles.customerChatCallout
            }
          >
            <span
              className={
                styles.customerChatIcon
              }
            >
              💬
            </span>

            <div>
              <strong>
                {
                  customerT.chatTitle
                }
              </strong>

              <p>
                {
                  customerT.chatBody
                }
              </p>
            </div>

            <button
              type="button"
              className={
                styles.customerChatButton
              }
              onClick={() =>
                window.dispatchEvent(
                  new Event(
                    'melo-open-partner-chat',
                  ),
                )
              }
            >
              {
                customerT.openChat
              }
            </button>
          </section>

          <section
            className={
              styles.customerControlPanel
            }
          >
            <div
              className={
                styles.customerFilterRow
              }
            >
              {(
                [
                  'all',
                  'order',
                  'booking',
                  'coupon',
                ] as CustomerFilter[]
              ).map(
                (
                  filter,
                ) => {
                  const label =
                    filter ===
                    'all'
                      ? customerT.all
                      : filter ===
                        'order'
                        ? customerT.orders
                        : filter ===
                          'booking'
                          ? customerT.bookings
                          : customerT.coupons;

                  return (
                    <button
                      key={
                        filter
                      }
                      type="button"
                      className={
                        customerFilter ===
                        filter
                          ? styles.customerFilterActive
                          : styles.customerFilterButton
                      }
                      onClick={() =>
                        setCustomerFilter(
                          filter,
                        )
                      }
                    >
                      <span>
                        {
                          label
                        }
                      </span>

                      <b>
                        {
                          customerCounts[
                            filter
                          ]
                        }
                      </b>
                    </button>
                  );
                },
              )}
            </div>

            <div
              className={
                styles.customerSearch
              }
            >
              <span>
                ⌕
              </span>

              <input
                value={
                  customerQuery
                }
                onChange={(
                  event,
                ) =>
                  setCustomerQuery(
                    event
                      .target
                      .value,
                  )
                }
                placeholder={
                  customerT.search
                }
              />
            </div>

            <div
              className={
                styles.customerStats
              }
            >
              <div>
                <strong>
                  {
                    customerStats.pending
                  }
                </strong>

                <span>
                  {
                    customerT.pending
                  }
                </span>
              </div>

              <div>
                <strong>
                  {
                    customerStats.waiting
                  }
                </strong>

                <span>
                  {
                    customerT.waiting
                  }
                </span>
              </div>

              <div>
                <strong>
                  {
                    customerStats.used
                  }
                </strong>

                <span>
                  {
                    customerT.used
                  }
                </span>
              </div>
            </div>
          </section>

          <section
            className={
              styles.customerListPanel
            }
          >
            <div
              className={
                styles.customerListHeader
              }
              aria-hidden="true"
            >
              <span>
                {
                  t.customer
                }
              </span>

              <span>
                {
                  t.service
                }
              </span>

              <span>
                {
                  t.date
                }
              </span>

              <span>
                {
                  t.status
                }
              </span>

              <span>
                {
                  t.amount
                }
              </span>

              <span />
            </div>

            <div
              className={
                styles.customerRowList
              }
            >
              {filteredCustomerTransactions.length ? (
                filteredCustomerTransactions.map(
                  (
                    item,
                    index,
                  ) => {
                    const group =
                      customerStatusGroup(
                        item.status,
                      );

                    const kindLabel =
                      item.kind ===
                      'order'
                        ? customerT.kindOrder
                        : item.kind ===
                          'booking'
                          ? customerT.kindBooking
                          : customerT.kindCoupon;

                    const statusLabel =
                      group ===
                      'pending'
                        ? customerT.pending
                        : group ===
                          'waiting'
                          ? customerT.waiting
                          : group ===
                            'used'
                            ? customerT.used
                            : item.status;

                    const profileHref =
                      item.customerUserId
                        ? `/users/${item.customerUserId}`
                        : '';

                    return (
                      <article
                        className={
                          styles.customerTransactionRow
                        }
                        key={`${item.kind}:${item.id}:${item.createdAt}:${index}`}
                      >
                        <div
                          className={
                            styles.customerIdentity
                          }
                        >
                          {profileHref ? (
                            <Link
                              href={
                                profileHref
                              }
                            >
                              <VerifiedUserAvatar
                                userId={
                                  item.customerUserId
                                }
                                name={
                                  item.customerName
                                }
                                src={
                                  item.customerPhotoUrl
                                }
                                country={
                                  item.customerCountry
                                }
                                nationality={
                                  item.customerNationality
                                }
                                size={
                                  50
                                }
                                badgeSize={
                                  15
                                }
                                alt={
                                  item.customerName
                                }
                              />
                            </Link>
                          ) : (
                            <VerifiedUserAvatar
                              name={
                                item.customerName
                              }
                              src={
                                item.customerPhotoUrl
                              }
                              country={
                                item.customerCountry
                              }
                              nationality={
                                item.customerNationality
                              }
                              size={
                                50
                              }
                              badgeSize={
                                15
                              }
                              alt={
                                item.customerName
                              }
                            />
                          )}

                          <div>
                            {profileHref ? (
                              <Link
                                className={
                                  styles.customerNameLink
                                }
                                href={
                                  profileHref
                                }
                              >
                                {
                                  item.customerName
                                }
                              </Link>
                            ) : (
                              <strong
                                className={
                                  styles.customerNameLink
                                }
                              >
                                {
                                  item.customerName
                                }
                              </strong>
                            )}

                            <code
                              className={
                                styles.customerReferenceCode
                              }
                            >
                              {customerReference(
                                item.referenceCode,
                              )}
                            </code>
                          </div>
                        </div>

                        <div
                          className={
                            styles.customerItemCell
                          }
                        >
                          <strong>
                            {
                              item.title
                            }
                          </strong>

                          <span
                            className={
                              styles.customerKindBadge
                            }
                          >
                            ↔{' '}
                            {
                              kindLabel
                            }
                          </span>
                        </div>

                        <div
                          className={
                            styles.customerDateCell
                          }
                        >
                          <strong>
                            {formatDate(
                              item.scheduledAt ||
                                item.createdAt,
                            )}
                          </strong>

                          {item.guestCount ? (
                            <span>
                              👥{' '}
                              {
                                item.guestCount
                              }{' '}
                              {
                                customerT.people
                              }
                            </span>
                          ) : null}
                        </div>

                        <div
                          className={
                            styles.customerStatusCell
                          }
                        >
                          <span
                            className={
                              styles.customerStatus
                            }
                            data-status={
                              group
                            }
                          >
                            {
                              statusLabel
                            }
                          </span>
                        </div>

                        <div
                          className={
                            styles.customerAmountCell
                          }
                        >
                          <small>
                            {
                              customerT.totalAmount
                            }
                          </small>

                          <strong>
                            {item.amount ===
                            null
                              ? '—'
                              : formatMoney(
                                  item.amount,
                                  item.currency,
                                )}
                          </strong>
                        </div>

                        <button
                          className={
                            styles.customerDetailsButton
                          }
                          type="button"
                          onClick={() =>
                            setSelectedTransaction(
                              item,
                            )
                          }
                        >
                          {
                            customerT.details
                          }{' '}
                          ›
                        </button>
                      </article>
                    );
                  },
                )
              ) : (
                <div
                  className={
                    styles.empty
                  }
                >
                  {
                    customerT.empty
                  }
                </div>
              )}
            </div>
          </section>

          <CustomerDetailModal
            item={
              selectedTransaction
            }
            transactions={
              transactions
            }
            businessId={
              access?.businessId ||
              ''
            }
            locale={
              locale
            }
            onClose={() =>
              setSelectedTransaction(
                null,
              )
            }
          />
        </div>
      );
    }

    if (
      section ===
      'reports'
    ) {
      return (
        <div
          className={
            styles.panel
          }
        >
          <div
            style={{
              overflowX:
                'auto',
            }}
          >
            <table
              className={
                styles.listTable
              }
            >
              <thead>
                <tr>
                  <th>
                    {
                      t.type
                    }
                  </th>

                  <th>
                    {
                      t.customer
                    }
                  </th>

                  <th>
                    {
                      t.service
                    }
                  </th>

                  <th>
                    {
                      t.status
                    }
                  </th>

                  <th>
                    {
                      t.amount
                    }
                  </th>

                  <th>
                    {
                      t.date
                    }
                  </th>
                </tr>
              </thead>

              <tbody>
                {transactions.length ? (
                  transactions.map(
                    (
                      item,
                      index,
                    ) => (
                      <tr
                        key={`${item.kind}:${item.id}:${item.status}:${item.amount ?? 'na'}:${item.createdAt}:${index}`}
                      >
                        <td>
                          {
                            item.kind
                          }
                        </td>

                        <td>
                          {
                            item.customerName
                          }
                        </td>

                        <td>
                          {
                            item.title
                          }
                        </td>

                        <td>
                          <span
                            className={
                              styles.status
                            }
                          >
                            {
                              item.status
                            }
                          </span>
                        </td>

                        <td>
                          {item.amount ===
                          null
                            ? '—'
                            : formatMoney(
                                item.amount,
                                item.currency,
                              )}
                        </td>

                        <td>
                          {formatDate(
                            item.createdAt,
                          )}
                        </td>
                      </tr>
                    ),
                  )
                ) : (
                  <tr>
                    <td
                      colSpan={
                        6
                      }
                    >
                      {
                        t.noData
                      }
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    if (
      section ===
      'finance'
    ) {
      return (
        <>
          <div
            className={
              styles.dataGrid
            }
          >
            <div
              className={
                styles.dataCard
              }
            >
              <small>
                {
                  t.available
                }
              </small>

              <strong>
                {formatMoney(
                  wallet.availableBalance,
                  wallet.currency,
                )}
              </strong>
            </div>

            <div
              className={
                styles.dataCard
              }
            >
              <small>
                {
                  t.walletPending
                }
              </small>

              <strong>
                {formatMoney(
                  wallet.pendingBalance,
                  wallet.currency,
                )}
              </strong>
            </div>

            <div
              className={
                styles.dataCard
              }
            >
              <small>
                {
                  t.lifetime
                }
              </small>

              <strong>
                {formatMoney(
                  Math.max(
                    wallet.lifetimeGross,
                    summary.grossSales,
                  ),
                  wallet.currency,
                )}
              </strong>
            </div>

            <div
              className={
                styles.dataCard
              }
            >
              <small>
                {
                  t.withdrawn
                }
              </small>

              <strong>
                {formatMoney(
                  wallet.withdrawnTotal,
                  wallet.currency,
                )}
              </strong>
            </div>
          </div>

          <div
            className={
              styles.notice
            }
            style={{
              marginTop:
                14,
            }}
          >
            Owner-only finance permissions follow the same Partner permissions as the Android app.
          </div>
        </>
      );
    }

    if (
      section ===
      'analytics'
    ) {
      const success =
        transactions.filter(
          (
            item,
          ) =>
            [
              'paid',
              'confirmed',
              'completed',
              'redeemed',
            ].includes(
              item.status.toLowerCase(),
            ),
        ).length;

      const pending =
        transactions.filter(
          (
            item,
          ) =>
            ![
              'paid',
              'confirmed',
              'completed',
              'redeemed',
              'cancelled',
              'rejected',
              'expired',
            ].includes(
              item.status.toLowerCase(),
            ),
        ).length;

      const totalAmount =
        transactions.reduce(
          (
            sum,
            item,
          ) =>
            sum +
            (
              item.amount ||
              0
            ),
          0,
        );

      return (
        <>
          <div
            className={
              styles.dataGrid
            }
          >
            <div
              className={
                styles.dataCard
              }
            >
              <small>
                {
                  t.sales
                }
              </small>

              <strong>
                {formatMoney(
                  Math.max(
                    summary.grossSales,
                    totalAmount,
                  ),
                  'THB',
                )}
              </strong>
            </div>

            <div
              className={
                styles.dataCard
              }
            >
              <small>
                {
                  t.total
                }
              </small>

              <strong>
                {
                  transactions.length
                }
              </strong>
            </div>

            <div
              className={
                styles.dataCard
              }
            >
              <small>
                SUCCESS
              </small>

              <strong>
                {
                  success
                }
              </strong>
            </div>

            <div
              className={
                styles.dataCard
              }
            >
              <small>
                {
                  t.pending
                }
              </small>

              <strong>
                {
                  pending
                }
              </strong>
            </div>

            <div
              className={
                styles.dataCard
              }
            >
              <small>
                {
                  t.rating
                }
              </small>

              <strong>
                {summary.reviewCount
                  ? summary.averageRating.toFixed(
                      1,
                    )
                  : '—'}
              </strong>
            </div>

            <div
              className={
                styles.dataCard
              }
            >
              <small>
                REVIEWS
              </small>

              <strong>
                {
                  summary.reviewCount
                }
              </strong>
            </div>
          </div>

          <div
            className={
              styles.sectionHeader
            }
          >
            <h2>
              Recent activity
            </h2>
          </div>

          <div
            className={
              styles.activityList
            }
          >
            {activity.length ? (
              activity
                .slice(
                  0,
                  20,
                )
                .map(
                  (
                    item:
                      any,
                    index,
                  ) => (
                    <div
                      className={
                        styles.activityRow
                      }
                      key={`${item.id || index}`}
                    >
                      <span
                        className={
                          styles.activityMark
                        }
                      >
                        ↗
                      </span>

                      <div>
                        <strong>
                          {item.title ||
                            item.type}
                        </strong>

                        <small>
                          {item.subtitle ||
                            item.status}
                        </small>
                      </div>

                      <em>
                        {formatDate(
                          item.createdAt,
                        )}
                      </em>
                    </div>
                  ),
                )
            ) : (
              <div
                className={
                  styles.empty
                }
              >
                {
                  t.noData
                }
              </div>
            )}
          </div>
        </>
      );
    }

    if (
      section ===
      'staff'
    ) {
      return (
        <div
          className={
            styles.panel
          }
        >
          {access!.isOwner ||
          access!.role ===
            'admin' ? (
            <form
              className={
                styles.staffForm
              }
              onSubmit={
                submitStaff
              }
            >
              <input
                type="email"
                value={
                  staffEmail
                }
                onChange={(
                  event,
                ) =>
                  setStaffEmail(
                    event
                      .target
                      .value,
                  )
                }
                placeholder={
                  t.email
                }
              />

              <select
                value={
                  staffRole
                }
                onChange={(
                  event,
                ) =>
                  setStaffRole(
                    event
                      .target
                      .value as
                      | 'admin'
                      | 'manager'
                      | 'staff',
                  )
                }
              >
                <option value="staff">
                  Staff
                </option>

                <option value="manager">
                  Manager
                </option>

                <option value="admin">
                  Admin
                </option>
              </select>

              <button
                className={
                  styles.primaryButton
                }
                disabled={
                  !staffEmail.trim() ||
                  busy
                }
              >
                {
                  t.addStaff
                }
              </button>
            </form>
          ) : null}

          <div>
            {staff.length ? (
              staff.map(
                (
                  item,
                ) => (
                  <div
                    className={
                      styles.staffRow
                    }
                    key={
                      item.id
                    }
                  >
                    <div>
                      <strong>
                        {
                          item.displayName
                        }
                      </strong>

                      <small>
                        {
                          item.email
                        }
                      </small>
                    </div>

                    <span
                      className={
                        styles.status
                      }
                    >
                      {item.role.toUpperCase()}
                    </span>

                    {access!.isOwner ? (
                      <button
                        type="button"
                        className={
                          styles.dangerButton
                        }
                        onClick={() =>
                          void deleteStaff(
                            item,
                          )
                        }
                      >
                        {
                          t.remove
                        }
                      </button>
                    ) : null}
                  </div>
                ),
              )
            ) : (
              <div
                className={
                  styles.empty
                }
              >
                {
                  t.noData
                }
              </div>
            )}
          </div>
        </div>
      );
    }

    if (
      section ===
      'chat'
    ) {
      return (
        <div
          className={
            styles.panel
          }
        >
          <div
            className={
              styles.empty
            }
          >
            <button
              type="button"
              className={
                styles.primaryButton
              }
              style={{
                padding:
                  '10px 14px',

                border:
                  0,

                borderRadius:
                  12,

                cursor:
                  'pointer',
              }}
              onClick={() =>
                window.dispatchEvent(
                  new Event(
                    'melo-open-partner-chat',
                  ),
                )
              }
            >
              💬{' '}
              {
                t.chat
              }
            </button>
          </div>
        </div>
      );
    }

    return null;
  }

  return (
    <main
      className={
        styles.partnerPage
      }
    >
      <PartnerModeHeader
        access={
          access
        }
        onBusinessChanged={() =>
          void load()
        }
        initialChatOpen={
          section ===
          'chat'
        }
      />

      <section
        className={
          styles.partnerShell
        }
      >
        <header
          className={
            styles.pageTitle
          }
        >
          <div>
            <small>
              MELO PARTNER
            </small>

            <h1>
              {
                title
              }
            </h1>

            <p>
              {section ===
              'customers'
                ? customerT.subtitle
                : (
                    access?.displayName ||
                    'Melo Partner'
                  )}
            </p>
          </div>

          <div
            className={
              styles.toolbar
            }
          >
            {section ===
              'services' &&
            allowed ? (
              <button
                type="button"
                className={
                  styles.primaryButton
                }
                onClick={
                  openNewService
                }
              >
                ＋{' '}
                {
                  serviceT.add
                }
              </button>
            ) : null}

            <button
              type="button"
              onClick={() =>
                void load()
              }
              aria-label="Refresh"
            >
              ↻
            </button>

            {section ===
              'reports' &&
            allowed ? (
              <button
                type="button"
                className={
                  styles.primaryButton
                }
                onClick={
                  exportCsv
                }
              >
                {
                  t.export
                }
              </button>
            ) : null}
          </div>
        </header>

        {error ? (
          <div
            className={
              styles.notice
            }
          >
            {
              error
            }
          </div>
        ) : null}

        {loading ? (
          <div
            className={
              styles.loading
            }
          >
            {
              t.loading
            }
          </div>
        ) : !access ||
          !allowed ? (
          <div
            className={
              styles.panel
            }
          >
            <div
              className={
                styles.empty
              }
            >
              {
                t.noAccess
              }
            </div>
          </div>
        ) : (
          renderSection()
        )}
      </section>

      <style jsx global>{`
        .meloServiceCatalog {
          display: grid;
          gap: 15px;
        }

        .meloServiceFilterBar {
          display: flex;
          align-items: center;
          gap: 8px;
          overflow-x: auto;
          padding: 2px 1px 5px;
          scrollbar-width: none;
        }

        .meloServiceFilterBar::-webkit-scrollbar {
          display: none;
        }

        .meloServiceFilterButton,
        .meloServiceFilterActive {
          min-height: 39px;
          display: inline-flex;
          flex: 0 0 auto;
          align-items: center;
          gap: 8px;
          border: 1px solid var(--border);
          border-radius: 12px;
          background: var(--surface);
          color: var(--text-secondary);
          padding: 0 13px;
          font: inherit;
          font-size: 10px;
          font-weight: 850;
          white-space: nowrap;
          cursor: pointer;
          transition:
            background 0.16s ease,
            border-color 0.16s ease,
            color 0.16s ease,
            transform 0.16s ease;
        }

        .meloServiceFilterButton:hover {
          transform: translateY(-1px);
          border-color:
            color-mix(
              in srgb,
              var(--primary) 35%,
              var(--border)
            );
          color: var(--primary);
        }

        .meloServiceFilterButton b,
        .meloServiceFilterActive b {
          min-width: 21px;
          height: 21px;
          display: grid;
          place-items: center;
          border-radius: 999px;
          background: var(--surface-2);
          color: var(--text-secondary);
          padding: 0 5px;
          font-size: 8px;
        }

        .meloServiceFilterActive {
          border-color:
            color-mix(
              in srgb,
              var(--primary) 55%,
              var(--border)
            );
          background: var(--primary-soft);
          color: var(--primary);
        }

        .meloServiceFilterActive b {
          background: var(--primary);
          color: #fff;
        }

        .meloServiceProductGrid {
          display: grid;
          grid-template-columns:
            repeat(
              3,
              minmax(0, 1fr)
            );
          gap: 16px;
        }

        .meloServiceProductCard {
          min-width: 0;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          border: 1px solid var(--border);
          border-radius: 22px;
          background: var(--surface);
          box-shadow:
            0 12px 32px
            color-mix(
              in srgb,
              var(--shadow) 24%,
              transparent
            );
          transition:
            transform 0.16s ease,
            border-color 0.16s ease,
            box-shadow 0.16s ease;
        }

        .meloServiceProductCard:hover {
          transform: translateY(-2px);
          border-color:
            color-mix(
              in srgb,
              var(--primary) 28%,
              var(--border)
            );
        }

        .meloServiceProductMedia {
          position: relative;
          overflow: hidden;
          aspect-ratio: 16 / 9;
          background:
            linear-gradient(
              145deg,
              var(--surface-2),
              var(--surface-3)
            );
        }

        .meloServiceProductMedia > img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .meloServiceProductMediaPlaceholder {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          align-content: center;
          gap: 8px;
          color: var(--text-secondary);
          text-align: center;
        }

        .meloServiceProductMediaPlaceholder > span {
          width: 48px;
          height: 48px;
          display: grid;
          place-items: center;
          border-radius: 15px;
          background: var(--primary-soft);
          color: var(--primary);
          font-size: 21px;
        }

        .meloServiceProductMediaPlaceholder > strong {
          max-width: 180px;
          font-size: 9px;
          line-height: 1.4;
        }

        .meloServiceProductBadges {
          position: absolute;
          top: 12px;
          left: 12px;
          right: 12px;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 8px;
          pointer-events: none;
        }

        .meloServiceCategoryBadge,
        .meloServiceStatusBadge {
          min-height: 27px;
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          padding: 0 10px;
          backdrop-filter: blur(13px);
          font-size: 8px;
          font-weight: 950;
          box-shadow:
            0 4px 14px
            rgba(0, 0, 0, 0.13);
        }

        .meloServiceCategoryBadge {
          max-width: 62%;
          overflow: hidden;
          background:
            color-mix(
              in srgb,
              var(--primary) 88%,
              #061527
            );
          color: #fff;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .meloServiceStatusBadge {
          flex: 0 0 auto;
          background:
            rgba(
              10,
              22,
              34,
              0.74
            );
          color: #fff;
        }

        .meloServiceStatusBadge[data-active='true'] {
          background:
            rgba(
              24,
              137,
              90,
              0.9
            );
        }

        .meloServiceProductBody {
          display: flex;
          flex: 1;
          flex-direction: column;
          padding: 17px 17px 15px;
        }

        .meloServiceProductBody h3 {
          margin: 0;
          color: var(--text);
          font-size: 16px;
          line-height: 1.4;
          letter-spacing: -0.012em;
          overflow-wrap: anywhere;
        }

        .meloServiceProductBody > p {
          min-height: 40px;
          display: -webkit-box;
          overflow: hidden;
          margin: 7px 0 0;
          color: var(--text-secondary);
          font-size: 10px;
          line-height: 1.6;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
        }

        .meloServiceAvailability {
          width: max-content;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-top: 12px;
          color: var(--text-secondary);
        }

        .meloServiceAvailability[data-active='true'] {
          color: var(--primary);
        }

        .meloServiceAvailability > span {
          font-size: 11px;
        }

        .meloServiceAvailability > strong {
          font-size: 8.5px;
        }

        .meloServiceProductPriceRow {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 12px;
          margin-top: auto;
          padding-top: 15px;
        }

        .meloServiceProductPriceRow > strong {
          min-width: 0;
          color: var(--text);
          font-size: 14px;
          line-height: 1.35;
          overflow-wrap: anywhere;
        }

        .meloServiceProductPriceRow > button {
          flex: 0 0 auto;
          border: 0;
          background: transparent;
          color: var(--primary);
          padding: 2px 0;
          font: inherit;
          font-size: 9px;
          font-weight: 900;
          cursor: pointer;
        }

        .meloServiceProductPriceRow > button:hover {
          text-decoration: underline;
        }

        .meloServiceProductDetails {
          display: grid;
          grid-template-columns:
            repeat(
              2,
              minmax(0, 1fr)
            );
          gap: 8px;
          margin-top: 13px;
          padding-top: 13px;
          border-top: 1px solid var(--border);
        }

        .meloServiceProductDetails > div {
          min-width: 0;
          border-radius: 11px;
          background: var(--surface-2);
          padding: 10px 11px;
        }

        .meloServiceProductDetails small,
        .meloServiceProductDetails strong {
          display: block;
        }

        .meloServiceProductDetails small {
          color: var(--text-secondary);
          font-size: 7px;
          font-weight: 850;
          letter-spacing: 0.035em;
          text-transform: uppercase;
        }

        .meloServiceProductDetails strong {
          margin-top: 5px;
          color: var(--text);
          font-size: 9px;
          line-height: 1.4;
          overflow-wrap: anywhere;
        }

        .meloServiceProductActions {
          display: grid;
          grid-template-columns:
            1.25fr
            0.9fr
            0.75fr;
          gap: 7px;
          border-top: 1px solid var(--border);
          background:
            color-mix(
              in srgb,
              var(--surface-2) 55%,
              var(--surface)
            );
          padding:
            12px
            14px
            14px;
        }

        .meloServiceProductActions button {
          min-width: 0;
          min-height: 37px;
          border: 1px solid var(--border);
          border-radius: 11px;
          padding: 0 9px;
          font: inherit;
          font-size: 8.5px;
          font-weight: 900;
          cursor: pointer;
        }

        .meloServiceProductActions button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .meloServiceAvailabilityButton {
          background: var(--surface);
          color: var(--text-secondary);
        }

        .meloServiceAvailabilityButton[data-active='false'] {
          border-color:
            color-mix(
              in srgb,
              var(--primary) 36%,
              var(--border)
            );
          background: var(--primary-soft);
          color: var(--primary);
        }

        .meloServiceEditButton {
          background:
            color-mix(
              in srgb,
              var(--primary-soft) 70%,
              var(--surface)
            );
          color: var(--primary);
        }

        .meloServiceDeleteButton {
          border-color:
            color-mix(
              in srgb,
              var(--danger) 30%,
              var(--border)
            ) !important;
          background:
            color-mix(
              in srgb,
              var(--danger) 7%,
              var(--surface)
            );
          color: var(--danger);
        }

        @media (max-width: 1040px) {
          .meloServiceProductGrid {
            grid-template-columns:
              repeat(
                2,
                minmax(0, 1fr)
              );
          }
        }

        @media (max-width: 680px) {
          .meloServiceProductGrid {
            grid-template-columns: 1fr;
          }

          .meloServiceProductCard {
            border-radius: 19px;
          }

          .meloServiceProductBody {
            padding: 15px;
          }

          .meloServiceProductActions {
            padding:
              10px
              12px
              12px;
          }
        }

        @media (max-width: 420px) {
          .meloServiceProductActions {
            grid-template-columns:
              1fr
              1fr;
          }

          .meloServiceAvailabilityButton {
            grid-column:
              1 / -1;
          }
        }
      `}</style>
    </main>
  );
}