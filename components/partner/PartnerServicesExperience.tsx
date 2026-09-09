'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';

import { useLocale } from '@/components/SiteProviders';
import { resolveCommerceMedia } from '@/components/commerce/commerceMedia';

import {
  getCurrentUser,
  rpcRequest,
  uploadStorageObject,
} from '@/lib/supabase/browser';

import PartnerModeHeader from './PartnerModeHeader';
import PartnerServiceSpecificMultiSelect from './PartnerServiceSpecificMultiSelect';
import PartnerPromotionPricePreview from './PartnerPromotionPricePreview';

import {
  deletePartnerService,
  getActivePartnerBusiness,
  hasPartnerPermission,
  listPartnerServices,
  setPartnerServiceActive,
  type PartnerBusinessAccess,
  type PartnerService,
} from './partnerModeWeb';

import styles from './PartnerServicesExperience.module.css';

type LocaleCode =
  | 'th'
  | 'en'
  | 'de'
  | 'zh'
  | 'ja'
  | 'ko';

type SaleMode =
  | 'display'
  | 'inquiry'
  | 'instant';

type PromotionMode =
  | 'none'
  | 'fixed'
  | 'percent';

type ItemFormat =
  | 'food_drink'
  | 'accommodation'
  | 'activity'
  | 'service'
  | 'product'
  | 'transport'
  | 'other';

type InquiryRequirement =
  | 'date'
  | 'time'
  | 'guests'
  | 'tables'
  | 'note';

type Row = Record<string, unknown>;

type ServiceForm = {
  itemFormat: ItemFormat;
  subcategory: string;
  title: string;
  description: string;
  optionDetails: string;
  dietaryDetails: string;
  normalPrice: string;
  priceUnit: string;
  promotionMode: PromotionMode;
  promotionValue: string;
  currency: string;
  minCustomers: string;
  maxCustomers: string;
  includes: string;
  excludes: string;
  saleMode: SaleMode;
  inquiryRequirements: InquiryRequirement[];
  legacyDetailType: string;
};

const COPY = {
  th: {
    eyebrow: 'MELO PARTNER',
    title: 'สินค้าและบริการ',
    subtitle:
      'จัดการเมนู สินค้า บริการ ราคา และรูปแบบการซื้อหรือจองของร้าน',

    add: 'เพิ่มสินค้า / บริการ',
    refresh: 'รีเฟรช',
    loading: 'กำลังโหลดข้อมูล...',

    noAccess:
      'บัญชีนี้ไม่มีสิทธิ์จัดการสินค้าและบริการของร้าน',

    noItems: 'ยังไม่มีสินค้า / บริการ',

    noItemsBody:
      'เริ่มเพิ่มรายการแรกของร้านเพื่อให้ลูกค้าเห็นสินค้าและบริการของคุณ',

    all: 'ทั้งหมด',
    available: 'พร้อมให้บริการ',
    unavailable: 'ปิดให้บริการ',

    details: 'ดูรายละเอียด',
    hideDetails: 'ซ่อนรายละเอียด',

    edit: 'แก้ไข',
    delete: 'ลบ',
    enable: 'เปิดบริการ',
    disable: 'ปิดบริการ',

    askPrice: 'สอบถามราคา',

    category: 'ประเภท',
    priceUnit: 'หน่วยราคา',
    status: 'สถานะ',

    confirmDelete:
      'ยืนยันการลบรายการนี้?',

    formNew:
      'เพิ่มสินค้า / บริการ',

    formEdit:
      'แก้ไขสินค้า / บริการ',

    formIntro:
      'กรอกข้อมูลตามรูปแบบเดียวกับ Melo Partner บน Android โดยจัดหน้าให้เหมาะกับการใช้งานบนเว็บ',

    close: 'ปิด',

    basicSection:
      'ข้อมูลสินค้า / บริการ',

    basicHint:
      'ข้อมูลหลักที่ลูกค้าจะเห็นก่อนตัดสินใจซื้อ จอง หรือสอบถาม',

    businessFit:
      'เหมาะกับธุรกิจ',

    businessFitFallback:
      'สินค้า บริการ ร้านอาหาร คาเฟ่ ที่พัก กิจกรรม และธุรกิจท้องถิ่น',

    itemFormat:
      'รูปแบบรายการ',

    itemFormatRequired:
      'รูปแบบรายการ *',

    formatFood:
      'เมนู / อาหารและเครื่องดื่ม',

    formatAccommodation:
      'ที่พัก / ห้องพัก',

    formatActivity:
      'กิจกรรม / ประสบการณ์',

    formatService:
      'บริการ',

    formatProduct:
      'สินค้า',

    formatTransport:
      'การเดินทาง / รถรับส่ง',

    formatOther:
      'อื่น ๆ',

    subcategory:
      'ประเภทย่อย *',

    subFood:
      'Menu / Food',

    subDrink:
      'Drink / Beverage',

    subSetMenu:
      'Set Menu',

    subCafe:
      'Cafe / Dessert',

    subCatering:
      'Catering',

    subRoom:
      'Room / Accommodation',

    subPackageStay:
      'Stay Package',

    subActivity:
      'Activity',

    subExperience:
      'Experience',

    subTour:
      'Tour',

    subService:
      'Service',

    subBeauty:
      'Beauty / Wellness',

    subProduct:
      'Product',

    subTransport:
      'Transport',

    subOther:
      'Other',

    itemName:
      'ชื่อเมนู / บริการ *',

    itemNamePlaceholder:
      'เช่น Set Dinner สำหรับ 2 ท่าน',

    description:
      'รายละเอียดเมนู / บริการ *',

    descriptionPlaceholder:
      'ระบุเมนู สิ่งที่รวม จำนวนคน ช่วงเวลาที่ใช้ได้ และรายละเอียดสำคัญ',

    specificTitle:
      'รายละเอียดเฉพาะ – เมนู / อาหารและเครื่องดื่ม',

    specificHint:
      'ข้อมูลส่วนนี้ช่วยให้ลูกค้าเข้าใจเมนูและเงื่อนไขก่อนใช้บริการ',

    options:
      'ขนาด / ตัวเลือก',

    optionsHint:
      'เช่น Small / Large, Hot / Iced',

    dietary:
      'ข้อมูลอาหาร / การแพ้',

    dietaryHint:
      'เช่น Vegetarian, มีถั่ว, ไม่มีหมู',

    imageSection:
      'รูปภาพสินค้า / บริการ',

    imageHint:
      'อัปโหลดภาพหลักของรายการ รองรับ JPG, PNG และ WEBP',

    imageMain:
      'ภาพหลัก',

    addImage:
      'เลือกรูป',

    changeImage:
      'เปลี่ยนรูป',

    removeImage:
      'ลบรูป',

    imageLimit:
      'ไฟล์ไม่เกิน 8 MB',

    priceSection:
      'ราคาและเงื่อนไข',

    priceHint:
      'กำหนดราคาปกติ โปรโมชั่น สกุลเงิน และจำนวนลูกค้าที่รองรับ',

    regularPrice:
      'ราคาปกติ',

    regularPricePlaceholder:
      'เว้นว่าง = สอบถามราคา',

    unitPlate:
      'จาน',

    unitCup:
      'แก้ว',

    unitSet:
      'ชุด',

    unitPerson:
      'คน',

    unitTable:
      'โต๊ะ',

    customUnit:
      'หน่วยอื่น',

    promotion:
      'ราคาโปรโมชั่น',

    noPromotion:
      'ไม่ใช้โปรโมชั่น',

    promoFixed:
      'ใส่ราคาหลังลด',

    promoPercent:
      'ลด %',

    promoPrice:
      'ราคาหลังลด',

    discountPercent:
      'ส่วนลด (%)',

    currency:
      'สกุลเงิน',

    minimumCustomers:
      'จำนวนลูกค้าขั้นต่ำ',

    maximumCustomers:
      'จำนวนลูกค้าสูงสุด',

    unlimited:
      'ไม่จำกัด',

    includes:
      'สิ่งที่รวมในเมนู / เซ็ต',

    includesPlaceholder:
      'เช่น อาหาร 2 จาน เครื่องดื่ม 2 แก้ว ของหวาน',

    excludes:
      'สิ่งที่ไม่รวม / เงื่อนไขร้าน',

    excludesPlaceholder:
      'เช่น เมนูพิเศษ Service charge หรือวันหยุดนักขัตฤกษ์',

    flowSection:
      'วิธีให้ลูกค้าซื้อ / จอง',

    flowHint:
      'กำหนด Flow ของรายการนี้ โดยการชำระเงินจะเปลี่ยนตามรูปแบบที่เลือก',

    displayOnly:
      'แสดงข้อมูลเท่านั้น',

    displayOnlyDesc:
      'ลูกค้าเห็นรายละเอียดและราคา แต่ไม่มีขั้นตอนสั่งซื้อจากรายการนี้',

    inquiry:
      'สอบถามก่อนซื้อ',

    inquiryDesc:
      'เหมาะกับโรงแรม ทัวร์ กิจกรรม รถเช่า หรือบริการที่ต้องตกลงวัน เวลา จำนวนคน และราคาก่อน',

    instant:
      'ซื้อได้ทันที',

    instantDesc:
      'เหมาะกับคูปอง Voucher โปรโมชั่น แพ็กเกจ และสินค้าที่ราคาและเงื่อนไขชัดเจน',

    inquirySection:
      'ข้อมูลที่ต้องถามลูกค้าก่อนสร้างใบงาน',

    inquiryHint:
      'เลือกข้อมูลที่ร้านต้องใช้ก่อนยืนยันรายการหรือสร้างใบงานจาก Business Chat',

    inquiryDate:
      'วันที่',

    inquiryTime:
      'เวลา',

    inquiryGuests:
      'จำนวนคน',

    inquiryTables:
      'จำนวนโต๊ะ',

    inquiryNote:
      'คำขอเพิ่มเติม',

    save:
      'บันทึกสินค้า / บริการ',

    update:
      'บันทึกการแก้ไข',

    saving:
      'กำลังบันทึก...',

    imageError:
      'รองรับเฉพาะ JPG, PNG หรือ WEBP และไฟล์ต้องไม่เกิน 8 MB',

    requiredError:
      'กรุณากรอกชื่อและรายละเอียดสินค้า / บริการให้ครบ',

    saveSuccess:
      'บันทึกสินค้า / บริการเรียบร้อยแล้ว',

    detailOptions:
      'ขนาด / ตัวเลือก',

    detailDietary:
      'ข้อมูลอาหาร / การแพ้',
  },

  en: {
    eyebrow: 'MELO PARTNER',

    title:
      'Products & services',

    subtitle:
      'Manage items, services, pricing and purchase or booking flows for your store',

    add:
      'Add product / service',

    refresh:
      'Refresh',

    loading:
      'Loading...',

    noAccess:
      'This account cannot manage products and services for this store',

    noItems:
      'No products or services yet',

    noItemsBody:
      'Add your first item so customers can discover what your store offers',

    all:
      'All',

    available:
      'Available',

    unavailable:
      'Unavailable',

    details:
      'View details',

    hideDetails:
      'Hide details',

    edit:
      'Edit',

    delete:
      'Delete',

    enable:
      'Enable',

    disable:
      'Disable',

    askPrice:
      'Ask for price',

    category:
      'Category',

    priceUnit:
      'Price unit',

    status:
      'Status',

    confirmDelete:
      'Delete this item?',

    formNew:
      'Add product / service',

    formEdit:
      'Edit product / service',

    formIntro:
      'Uses the same information structure as Melo Partner on Android, arranged for a desktop workspace',

    close:
      'Close',

    basicSection:
      'Product / service information',

    basicHint:
      'Core information customers see before buying, booking or asking your store',

    businessFit:
      'Suitable for',

    businessFitFallback:
      'Food, cafes, accommodation, activities, services and local businesses',

    itemFormat:
      'Item format',

    itemFormatRequired:
      'Item format *',

    formatFood:
      'Menu / food & beverage',

    formatAccommodation:
      'Accommodation / room',

    formatActivity:
      'Activity / experience',

    formatService:
      'Service',

    formatProduct:
      'Product',

    formatTransport:
      'Transport / transfer',

    formatOther:
      'Other',

    subcategory:
      'Subcategory *',

    subFood:
      'Menu / Food',

    subDrink:
      'Drink / Beverage',

    subSetMenu:
      'Set Menu',

    subCafe:
      'Cafe / Dessert',

    subCatering:
      'Catering',

    subRoom:
      'Room / Accommodation',

    subPackageStay:
      'Stay Package',

    subActivity:
      'Activity',

    subExperience:
      'Experience',

    subTour:
      'Tour',

    subService:
      'Service',

    subBeauty:
      'Beauty / Wellness',

    subProduct:
      'Product',

    subTransport:
      'Transport',

    subOther:
      'Other',

    itemName:
      'Product / service name *',

    itemNamePlaceholder:
      'e.g. Set Dinner for 2',

    description:
      'Product / service description *',

    descriptionPlaceholder:
      'Describe what is included, guest capacity, availability and important conditions',

    specificTitle:
      'Food & beverage details',

    specificHint:
      'Add useful menu information customers should know before visiting or ordering',

    options:
      'Size / options',

    optionsHint:
      'e.g. Small / Large, Hot / Iced',

    dietary:
      'Dietary / allergy information',

    dietaryHint:
      'e.g. Vegetarian, contains nuts, no pork',

    imageSection:
      'Product / service image',

    imageHint:
      'Upload the main image. JPG, PNG and WEBP are supported',

    imageMain:
      'Main image',

    addImage:
      'Choose image',

    changeImage:
      'Change image',

    removeImage:
      'Remove',

    imageLimit:
      'Maximum file size 8 MB',

    priceSection:
      'Pricing & conditions',

    priceHint:
      'Set regular price, promotion, currency and customer limits',

    regularPrice:
      'Regular price',

    regularPricePlaceholder:
      'Leave blank = ask for price',

    unitPlate:
      'plate',

    unitCup:
      'cup',

    unitSet:
      'set',

    unitPerson:
      'person',

    unitTable:
      'table',

    customUnit:
      'Custom unit',

    promotion:
      'Promotion price',

    noPromotion:
      'No promotion',

    promoFixed:
      'Set sale price',

    promoPercent:
      'Discount %',

    promoPrice:
      'Sale price',

    discountPercent:
      'Discount (%)',

    currency:
      'Currency',

    minimumCustomers:
      'Minimum customers',

    maximumCustomers:
      'Maximum customers',

    unlimited:
      'Unlimited',

    includes:
      'Included',

    includesPlaceholder:
      'e.g. 2 dishes, 2 drinks and dessert',

    excludes:
      'Not included / store conditions',

    excludesPlaceholder:
      'e.g. special menu, service charge or public holidays',

    flowSection:
      'How customers buy / book',

    flowHint:
      'Choose the transaction flow for this item',

    displayOnly:
      'Information only',

    displayOnlyDesc:
      'Customers can view information and pricing without an in-app purchase flow',

    inquiry:
      'Ask before purchase',

    inquiryDesc:
      'For hotels, tours, activities, rentals or services that need date, time, guests and price confirmation',

    instant:
      'Buy instantly',

    instantDesc:
      'For vouchers, promotions, packages and items with fixed terms and pricing',

    inquirySection:
      'Information required before creating a work order',

    inquiryHint:
      'Choose information the store needs before confirming the transaction',

    inquiryDate:
      'Date',

    inquiryTime:
      'Time',

    inquiryGuests:
      'Guests',

    inquiryTables:
      'Tables',

    inquiryNote:
      'Additional request',

    save:
      'Save product / service',

    update:
      'Save changes',

    saving:
      'Saving...',

    imageError:
      'Use JPG, PNG or WEBP and keep the file under 8 MB',

    requiredError:
      'Product / service name and description are required',

    saveSuccess:
      'Product / service saved',

    detailOptions:
      'Size / options',

    detailDietary:
      'Dietary / allergy information',
  },

  de: {
    eyebrow:
      'MELO PARTNER',

    title:
      'Produkte & Services',

    subtitle:
      'Produkte, Services, Preise sowie Kauf- und Buchungsabläufe verwalten',

    add:
      'Produkt / Service hinzufügen',

    refresh:
      'Aktualisieren',

    loading:
      'Wird geladen...',

    noAccess:
      'Dieses Konto darf Produkte und Services dieses Stores nicht verwalten',

    noItems:
      'Noch keine Produkte oder Services',

    noItemsBody:
      'Füge den ersten Eintrag hinzu, damit Kunden dein Angebot entdecken können',

    all:
      'Alle',

    available:
      'Verfügbar',

    unavailable:
      'Nicht verfügbar',

    details:
      'Details',

    hideDetails:
      'Details schließen',

    edit:
      'Bearbeiten',

    delete:
      'Löschen',

    enable:
      'Aktivieren',

    disable:
      'Deaktivieren',

    askPrice:
      'Preis anfragen',

    category:
      'Kategorie',

    priceUnit:
      'Preiseinheit',

    status:
      'Status',

    confirmDelete:
      'Diesen Eintrag löschen?',

    formNew:
      'Produkt / Service hinzufügen',

    formEdit:
      'Produkt / Service bearbeiten',

    formIntro:
      'Die Android-Datenstruktur von Melo Partner wurde für die Web-Nutzung angepasst',

    close:
      'Schließen',

    basicSection:
      'Produkt- / Serviceinformationen',

    basicHint:
      'Die wichtigsten Informationen für Kunden vor Kauf, Buchung oder Anfrage',

    businessFit:
      'Geeignet für',

    businessFitFallback:
      'Gastronomie, Cafés, Unterkünfte, Aktivitäten und lokale Services',

    itemFormat:
      'Eintragsformat',

    itemFormatRequired:
      'Eintragsformat *',

    formatFood:
      'Speisen / Getränke',

    formatAccommodation:
      'Unterkunft / Zimmer',

    formatActivity:
      'Aktivität / Erlebnis',

    formatService:
      'Service',

    formatProduct:
      'Produkt',

    formatTransport:
      'Transport / Transfer',

    formatOther:
      'Sonstiges',

    subcategory:
      'Unterkategorie *',

    subFood:
      'Menü / Essen',

    subDrink:
      'Getränk',

    subSetMenu:
      'Set-Menü',

    subCafe:
      'Café / Dessert',

    subCatering:
      'Catering',

    subRoom:
      'Zimmer / Unterkunft',

    subPackageStay:
      'Aufenthaltspaket',

    subActivity:
      'Aktivität',

    subExperience:
      'Erlebnis',

    subTour:
      'Tour',

    subService:
      'Service',

    subBeauty:
      'Beauty / Wellness',

    subProduct:
      'Produkt',

    subTransport:
      'Transport',

    subOther:
      'Sonstiges',

    itemName:
      'Produkt- / Servicename *',

    itemNamePlaceholder:
      'z. B. Dinner-Set für 2 Personen',

    description:
      'Beschreibung *',

    descriptionPlaceholder:
      'Leistung, Umfang, Verfügbarkeit und wichtige Bedingungen beschreiben',

    specificTitle:
      'Details zu Speisen & Getränken',

    specificHint:
      'Zusätzliche Menüinformationen für Kunden',

    options:
      'Größe / Optionen',

    optionsHint:
      'z. B. Small / Large, Hot / Iced',

    dietary:
      'Ernährung / Allergien',

    dietaryHint:
      'z. B. vegetarisch, enthält Nüsse, ohne Schweinefleisch',

    imageSection:
      'Produkt- / Servicebild',

    imageHint:
      'Hauptbild als JPG, PNG oder WEBP hochladen',

    imageMain:
      'Hauptbild',

    addImage:
      'Bild auswählen',

    changeImage:
      'Bild ändern',

    removeImage:
      'Entfernen',

    imageLimit:
      'Maximal 8 MB',

    priceSection:
      'Preis & Bedingungen',

    priceHint:
      'Preis, Aktion, Währung und Kundengrenzen festlegen',

    regularPrice:
      'Normalpreis',

    regularPricePlaceholder:
      'Leer = Preis anfragen',

    unitPlate:
      'Teller',

    unitCup:
      'Becher',

    unitSet:
      'Set',

    unitPerson:
      'Person',

    unitTable:
      'Tisch',

    customUnit:
      'Andere Einheit',

    promotion:
      'Aktionspreis',

    noPromotion:
      'Keine Aktion',

    promoFixed:
      'Aktionspreis',

    promoPercent:
      'Rabatt %',

    promoPrice:
      'Preis nach Rabatt',

    discountPercent:
      'Rabatt (%)',

    currency:
      'Währung',

    minimumCustomers:
      'Mindestanzahl Kunden',

    maximumCustomers:
      'Maximale Kundenanzahl',

    unlimited:
      'Unbegrenzt',

    includes:
      'Enthalten',

    includesPlaceholder:
      'z. B. 2 Gerichte, 2 Getränke und Dessert',

    excludes:
      'Nicht enthalten / Bedingungen',

    excludesPlaceholder:
      'z. B. Sondermenüs, Servicegebühr oder Feiertage',

    flowSection:
      'Kauf- / Buchungsablauf',

    flowHint:
      'Wähle den passenden Ablauf für diesen Eintrag',

    displayOnly:
      'Nur Informationen',

    displayOnlyDesc:
      'Kunden sehen Details und Preis ohne Kaufvorgang',

    inquiry:
      'Vor Kauf anfragen',

    inquiryDesc:
      'Für Leistungen, bei denen Datum, Zeit, Personen oder Preis bestätigt werden müssen',

    instant:
      'Sofort kaufen',

    instantDesc:
      'Für Voucher, Aktionen, Pakete und Angebote mit festem Preis',

    inquirySection:
      'Benötigte Kundendaten',

    inquiryHint:
      'Wähle die Informationen, die vor der Auftragserstellung erforderlich sind',

    inquiryDate:
      'Datum',

    inquiryTime:
      'Zeit',

    inquiryGuests:
      'Personen',

    inquiryTables:
      'Tische',

    inquiryNote:
      'Zusatzwunsch',

    save:
      'Produkt / Service speichern',

    update:
      'Änderungen speichern',

    saving:
      'Wird gespeichert...',

    imageError:
      'Nur JPG, PNG oder WEBP bis 8 MB verwenden',

    requiredError:
      'Name und Beschreibung sind erforderlich',

    saveSuccess:
      'Produkt / Service gespeichert',

    detailOptions:
      'Größe / Optionen',

    detailDietary:
      'Ernährung / Allergien',
  },

  zh: {
    eyebrow:
      'MELO PARTNER',

    title:
      '商品与服务',

    subtitle:
      '管理商品、服务、价格以及购买或预订流程',

    add:
      '添加商品 / 服务',

    refresh:
      '刷新',

    loading:
      '正在加载...',

    noAccess:
      '此账户无权管理该店铺的商品与服务',

    noItems:
      '暂无商品或服务',

    noItemsBody:
      '添加第一个项目，让顾客了解店铺提供的内容',

    all:
      '全部',

    available:
      '可提供',

    unavailable:
      '已停用',

    details:
      '查看详情',

    hideDetails:
      '收起详情',

    edit:
      '编辑',

    delete:
      '删除',

    enable:
      '启用',

    disable:
      '停用',

    askPrice:
      '询价',

    category:
      '分类',

    priceUnit:
      '价格单位',

    status:
      '状态',

    confirmDelete:
      '确定删除此项目吗？',

    formNew:
      '添加商品 / 服务',

    formEdit:
      '编辑商品 / 服务',

    formIntro:
      '采用 Melo Partner Android 的信息结构，并针对网页端重新布局',

    close:
      '关闭',

    basicSection:
      '商品 / 服务信息',

    basicHint:
      '顾客在购买、预订或咨询前看到的主要信息',

    businessFit:
      '适合业务',

    businessFitFallback:
      '餐饮、咖啡店、住宿、活动、服务及本地商家',

    itemFormat:
      '项目形式',

    itemFormatRequired:
      '项目形式 *',

    formatFood:
      '菜单 / 餐饮',

    formatAccommodation:
      '住宿 / 房间',

    formatActivity:
      '活动 / 体验',

    formatService:
      '服务',

    formatProduct:
      '商品',

    formatTransport:
      '交通 / 接送',

    formatOther:
      '其他',

    subcategory:
      '子分类 *',

    subFood:
      '菜单 / 食物',

    subDrink:
      '饮料',

    subSetMenu:
      '套餐',

    subCafe:
      '咖啡 / 甜点',

    subCatering:
      '餐饮服务',

    subRoom:
      '房间 / 住宿',

    subPackageStay:
      '住宿套餐',

    subActivity:
      '活动',

    subExperience:
      '体验',

    subTour:
      '旅行',

    subService:
      '服务',

    subBeauty:
      '美容 / 健康',

    subProduct:
      '商品',

    subTransport:
      '交通',

    subOther:
      '其他',

    itemName:
      '商品 / 服务名称 *',

    itemNamePlaceholder:
      '例如：双人晚餐套餐',

    description:
      '商品 / 服务说明 *',

    descriptionPlaceholder:
      '说明内容、人数、可使用时间和重要条件',

    specificTitle:
      '餐饮专属信息',

    specificHint:
      '补充顾客在使用前需要了解的菜单信息',

    options:
      '尺寸 / 选项',

    optionsHint:
      '例如 Small / Large、Hot / Iced',

    dietary:
      '饮食 / 过敏信息',

    dietaryHint:
      '例如 Vegetarian、含坚果、不含猪肉',

    imageSection:
      '商品 / 服务图片',

    imageHint:
      '上传主图片，支持 JPG、PNG、WEBP',

    imageMain:
      '主图片',

    addImage:
      '选择图片',

    changeImage:
      '更换图片',

    removeImage:
      '删除图片',

    imageLimit:
      '最大 8 MB',

    priceSection:
      '价格与条件',

    priceHint:
      '设置正常价格、优惠、货币和人数限制',

    regularPrice:
      '正常价格',

    regularPricePlaceholder:
      '留空 = 询价',

    unitPlate:
      '份',

    unitCup:
      '杯',

    unitSet:
      '套',

    unitPerson:
      '人',

    unitTable:
      '桌',

    customUnit:
      '其他单位',

    promotion:
      '优惠价格',

    noPromotion:
      '无优惠',

    promoFixed:
      '优惠后价格',

    promoPercent:
      '折扣 %',

    promoPrice:
      '优惠价',

    discountPercent:
      '折扣 (%)',

    currency:
      '货币',

    minimumCustomers:
      '最少顾客人数',

    maximumCustomers:
      '最多顾客人数',

    unlimited:
      '不限',

    includes:
      '包含内容',

    includesPlaceholder:
      '例如 2 道菜、2 杯饮料和甜点',

    excludes:
      '不包含 / 店铺条件',

    excludesPlaceholder:
      '例如特殊菜单、服务费或节假日',

    flowSection:
      '顾客如何购买 / 预订',

    flowHint:
      '选择此项目适用的交易流程',

    displayOnly:
      '仅展示信息',

    displayOnlyDesc:
      '顾客只能查看信息和价格，不直接下单',

    inquiry:
      '购买前咨询',

    inquiryDesc:
      '适合需要确认日期、时间、人数或价格的服务',

    instant:
      '立即购买',

    instantDesc:
      '适合优惠券、促销、套餐和固定价格商品',

    inquirySection:
      '创建订单前需要的顾客信息',

    inquiryHint:
      '选择店铺在确认交易前需要顾客提供的信息',

    inquiryDate:
      '日期',

    inquiryTime:
      '时间',

    inquiryGuests:
      '人数',

    inquiryTables:
      '桌数',

    inquiryNote:
      '附加要求',

    save:
      '保存商品 / 服务',

    update:
      '保存修改',

    saving:
      '正在保存...',

    imageError:
      '仅支持 JPG、PNG、WEBP，文件不得超过 8 MB',

    requiredError:
      '请填写商品 / 服务名称和说明',

    saveSuccess:
      '商品 / 服务已保存',

    detailOptions:
      '尺寸 / 选项',

    detailDietary:
      '饮食 / 过敏信息',
  },

  ja: {
    eyebrow:
      'MELO PARTNER',

    title:
      '商品・サービス',

    subtitle:
      '商品、サービス、価格、購入・予約フローを管理します',

    add:
      '商品・サービスを追加',

    refresh:
      '更新',

    loading:
      '読み込み中...',

    noAccess:
      'この店舗の商品・サービスを管理する権限がありません',

    noItems:
      '商品・サービスはまだありません',

    noItemsBody:
      '最初の商品またはサービスを追加してください',

    all:
      'すべて',

    available:
      '提供中',

    unavailable:
      '停止中',

    details:
      '詳細を見る',

    hideDetails:
      '詳細を閉じる',

    edit:
      '編集',

    delete:
      '削除',

    enable:
      '有効にする',

    disable:
      '停止する',

    askPrice:
      '価格を問い合わせ',

    category:
      'カテゴリ',

    priceUnit:
      '価格単位',

    status:
      'ステータス',

    confirmDelete:
      'この項目を削除しますか？',

    formNew:
      '商品・サービスを追加',

    formEdit:
      '商品・サービスを編集',

    formIntro:
      'Melo Partner Android と同じ情報構成をWeb向けに最適化しています',

    close:
      '閉じる',

    basicSection:
      '商品・サービス情報',

    basicHint:
      '購入・予約・問い合わせ前に顧客が確認する基本情報です',

    businessFit:
      'おすすめ業種',

    businessFitFallback:
      '飲食店、カフェ、宿泊、アクティビティ、ローカルサービス',

    itemFormat:
      '項目形式',

    itemFormatRequired:
      '項目形式 *',

    formatFood:
      'メニュー / 飲食',

    formatAccommodation:
      '宿泊 / 部屋',

    formatActivity:
      'アクティビティ / 体験',

    formatService:
      'サービス',

    formatProduct:
      '商品',

    formatTransport:
      '交通 / 送迎',

    formatOther:
      'その他',

    subcategory:
      'サブカテゴリ *',

    subFood:
      'メニュー / フード',

    subDrink:
      'ドリンク',

    subSetMenu:
      'セットメニュー',

    subCafe:
      'カフェ / デザート',

    subCatering:
      'ケータリング',

    subRoom:
      '部屋 / 宿泊',

    subPackageStay:
      '宿泊パッケージ',

    subActivity:
      'アクティビティ',

    subExperience:
      '体験',

    subTour:
      'ツアー',

    subService:
      'サービス',

    subBeauty:
      '美容 / ウェルネス',

    subProduct:
      '商品',

    subTransport:
      '交通',

    subOther:
      'その他',

    itemName:
      '商品・サービス名 *',

    itemNamePlaceholder:
      '例：2名用ディナーセット',

    description:
      '商品・サービス説明 *',

    descriptionPlaceholder:
      '内容、人数、利用可能時間、重要な条件を入力してください',

    specificTitle:
      '飲食メニューの詳細',

    specificHint:
      '利用前に顧客が確認したいメニュー情報を追加します',

    options:
      'サイズ / オプション',

    optionsHint:
      '例：Small / Large、Hot / Iced',

    dietary:
      '食事 / アレルギー情報',

    dietaryHint:
      '例：Vegetarian、ナッツあり、豚肉なし',

    imageSection:
      '商品・サービス画像',

    imageHint:
      'JPG、PNG、WEBP のメイン画像をアップロード',

    imageMain:
      'メイン画像',

    addImage:
      '画像を選択',

    changeImage:
      '画像を変更',

    removeImage:
      '画像を削除',

    imageLimit:
      '最大 8 MB',

    priceSection:
      '価格と条件',

    priceHint:
      '通常価格、プロモーション、通貨、人数制限を設定します',

    regularPrice:
      '通常価格',

    regularPricePlaceholder:
      '空欄 = 価格を問い合わせ',

    unitPlate:
      '皿',

    unitCup:
      '杯',

    unitSet:
      'セット',

    unitPerson:
      '人',

    unitTable:
      'テーブル',

    customUnit:
      'その他',

    promotion:
      'プロモーション価格',

    noPromotion:
      'プロモーションなし',

    promoFixed:
      '割引後価格',

    promoPercent:
      '割引 %',

    promoPrice:
      '割引価格',

    discountPercent:
      '割引率 (%)',

    currency:
      '通貨',

    minimumCustomers:
      '最少人数',

    maximumCustomers:
      '最大人数',

    unlimited:
      '制限なし',

    includes:
      '含まれるもの',

    includesPlaceholder:
      '例：料理2品、ドリンク2杯、デザート',

    excludes:
      '含まれないもの / 店舗条件',

    excludesPlaceholder:
      '例：特別メニュー、サービス料、祝日',

    flowSection:
      '購入 / 予約方法',

    flowHint:
      'この項目に適した取引フローを選択します',

    displayOnly:
      '情報表示のみ',

    displayOnlyDesc:
      '顧客は情報と価格を確認できますが、購入手続きはありません',

    inquiry:
      '購入前に問い合わせ',

    inquiryDesc:
      '日付、時間、人数、価格などの確認が必要なサービス向け',

    instant:
      'すぐ購入',

    instantDesc:
      'Voucher、キャンペーン、パッケージなど固定条件の商品向け',

    inquirySection:
      '注文作成前に必要な顧客情報',

    inquiryHint:
      '取引確認前に必要な情報を選択してください',

    inquiryDate:
      '日付',

    inquiryTime:
      '時間',

    inquiryGuests:
      '人数',

    inquiryTables:
      'テーブル数',

    inquiryNote:
      '追加リクエスト',

    save:
      '商品・サービスを保存',

    update:
      '変更を保存',

    saving:
      '保存中...',

    imageError:
      'JPG、PNG、WEBP、8 MB以下の画像を使用してください',

    requiredError:
      '商品・サービス名と説明を入力してください',

    saveSuccess:
      '商品・サービスを保存しました',

    detailOptions:
      'サイズ / オプション',

    detailDietary:
      '食事 / アレルギー情報',
  },

  ko: {
    eyebrow:
      'MELO PARTNER',

    title:
      '상품 및 서비스',

    subtitle:
      '상품, 서비스, 가격 및 구매·예약 방식을 관리합니다',

    add:
      '상품 / 서비스 추가',

    refresh:
      '새로고침',

    loading:
      '불러오는 중...',

    noAccess:
      '이 매장의 상품 및 서비스를 관리할 권한이 없습니다',

    noItems:
      '등록된 상품 또는 서비스가 없습니다',

    noItemsBody:
      '고객에게 보여줄 첫 상품이나 서비스를 추가하세요',

    all:
      '전체',

    available:
      '서비스 가능',

    unavailable:
      '서비스 중지',

    details:
      '상세 보기',

    hideDetails:
      '상세 닫기',

    edit:
      '수정',

    delete:
      '삭제',

    enable:
      '활성화',

    disable:
      '중지',

    askPrice:
      '가격 문의',

    category:
      '카테고리',

    priceUnit:
      '가격 단위',

    status:
      '상태',

    confirmDelete:
      '이 항목을 삭제할까요?',

    formNew:
      '상품 / 서비스 추가',

    formEdit:
      '상품 / 서비스 수정',

    formIntro:
      'Melo Partner Android의 정보 구성을 웹 환경에 맞게 배치했습니다',

    close:
      '닫기',

    basicSection:
      '상품 / 서비스 정보',

    basicHint:
      '구매, 예약 또는 문의 전에 고객이 확인하는 기본 정보입니다',

    businessFit:
      '적합한 업종',

    businessFitFallback:
      '음식점, 카페, 숙박, 액티비티, 서비스 및 지역 비즈니스',

    itemFormat:
      '항목 형식',

    itemFormatRequired:
      '항목 형식 *',

    formatFood:
      '메뉴 / 음식 및 음료',

    formatAccommodation:
      '숙박 / 객실',

    formatActivity:
      '액티비티 / 체험',

    formatService:
      '서비스',

    formatProduct:
      '상품',

    formatTransport:
      '교통 / 픽업',

    formatOther:
      '기타',

    subcategory:
      '하위 카테고리 *',

    subFood:
      '메뉴 / 음식',

    subDrink:
      '음료',

    subSetMenu:
      '세트 메뉴',

    subCafe:
      '카페 / 디저트',

    subCatering:
      '케이터링',

    subRoom:
      '객실 / 숙박',

    subPackageStay:
      '숙박 패키지',

    subActivity:
      '액티비티',

    subExperience:
      '체험',

    subTour:
      '투어',

    subService:
      '서비스',

    subBeauty:
      '뷰티 / 웰니스',

    subProduct:
      '상품',

    subTransport:
      '교통',

    subOther:
      '기타',

    itemName:
      '상품 / 서비스 이름 *',

    itemNamePlaceholder:
      '예: 2인 디너 세트',

    description:
      '상품 / 서비스 설명 *',

    descriptionPlaceholder:
      '구성, 인원, 이용 가능 시간 및 주요 조건을 입력하세요',

    specificTitle:
      '음식 / 음료 상세 정보',

    specificHint:
      '고객이 이용 전에 확인할 메뉴 정보를 입력합니다',

    options:
      '사이즈 / 옵션',

    optionsHint:
      '예: Small / Large, Hot / Iced',

    dietary:
      '식단 / 알레르기 정보',

    dietaryHint:
      '예: Vegetarian, 견과류 포함, 돼지고기 없음',

    imageSection:
      '상품 / 서비스 이미지',

    imageHint:
      'JPG, PNG 또는 WEBP 메인 이미지를 업로드하세요',

    imageMain:
      '대표 이미지',

    addImage:
      '이미지 선택',

    changeImage:
      '이미지 변경',

    removeImage:
      '이미지 삭제',

    imageLimit:
      '최대 8 MB',

    priceSection:
      '가격 및 조건',

    priceHint:
      '정상가, 프로모션, 통화 및 고객 수를 설정합니다',

    regularPrice:
      '정상 가격',

    regularPricePlaceholder:
      '비워두면 가격 문의',

    unitPlate:
      '접시',

    unitCup:
      '잔',

    unitSet:
      '세트',

    unitPerson:
      '인',

    unitTable:
      '테이블',

    customUnit:
      '기타 단위',

    promotion:
      '프로모션 가격',

    noPromotion:
      '프로모션 없음',

    promoFixed:
      '할인가 입력',

    promoPercent:
      '할인 %',

    promoPrice:
      '할인 가격',

    discountPercent:
      '할인율 (%)',

    currency:
      '통화',

    minimumCustomers:
      '최소 고객 수',

    maximumCustomers:
      '최대 고객 수',

    unlimited:
      '제한 없음',

    includes:
      '포함 사항',

    includesPlaceholder:
      '예: 음식 2개, 음료 2잔, 디저트',

    excludes:
      '불포함 / 매장 조건',

    excludesPlaceholder:
      '예: 특별 메뉴, 서비스 요금 또는 공휴일',

    flowSection:
      '고객 구매 / 예약 방법',

    flowHint:
      '이 항목의 거래 방식을 선택하세요',

    displayOnly:
      '정보만 표시',

    displayOnlyDesc:
      '정보와 가격만 표시하고 앱 내 구매는 제공하지 않습니다',

    inquiry:
      '구매 전 문의',

    inquiryDesc:
      '날짜, 시간, 인원 또는 가격 확인이 필요한 서비스에 적합합니다',

    instant:
      '즉시 구매',

    instantDesc:
      'Voucher, 프로모션, 패키지 등 가격과 조건이 확정된 상품에 적합합니다',

    inquirySection:
      '작업 생성 전 필요한 고객 정보',

    inquiryHint:
      '거래 확인 전에 매장이 필요한 정보를 선택하세요',

    inquiryDate:
      '날짜',

    inquiryTime:
      '시간',

    inquiryGuests:
      '인원',

    inquiryTables:
      '테이블 수',

    inquiryNote:
      '추가 요청',

    save:
      '상품 / 서비스 저장',

    update:
      '변경사항 저장',

    saving:
      '저장 중...',

    imageError:
      'JPG, PNG 또는 WEBP 파일을 사용하고 8 MB 이하로 업로드하세요',

    requiredError:
      '상품 / 서비스 이름과 설명을 입력하세요',

    saveSuccess:
      '상품 / 서비스를 저장했습니다',

    detailOptions:
      '사이즈 / 옵션',

    detailDietary:
      '식단 / 알레르기 정보',
  },
} as const;

type Copy =
  (typeof COPY)[LocaleCode];

const EMPTY_FORM: ServiceForm = {
  itemFormat:
    'food_drink',

  subcategory:
    'menu_food',

  title:
    '',

  description:
    '',

  optionDetails:
    '',

  dietaryDetails:
    '',

  normalPrice:
    '',

  priceUnit:
    'set',

  promotionMode:
    'none',

  promotionValue:
    '',

  currency:
    'THB',

  minCustomers:
    '1',

  maxCustomers:
    '',

  includes:
    '',

  excludes:
    '',

  saleMode:
    'inquiry',

  inquiryRequirements: [
    'date',
    'time',
    'guests',
  ],

  legacyDetailType:
    'standard',
};

function copyFor(locale: string) {
  const normalized =
    (
      Object.prototype.hasOwnProperty.call(
        COPY,
        locale,
      )
        ? locale
        : 'en'
    ) as LocaleCode;

  return {
    locale: normalized,
    copy: COPY[normalized],
  };
}

function nullableNumber(value: string) {
  const clean =
    value.trim();

  if (!clean) {
    return null;
  }

  const number =
    Number(clean);

  return Number.isFinite(number)
    ? number
    : null;
}

function nullableInteger(value: string) {
  const number =
    nullableNumber(value);

  if (number === null) {
    return null;
  }

  return Math.max(
    0,
    Math.floor(number),
  );
}

function servicePrice(
  service: PartnerService,
  copy: Copy,
) {
  if (service.price === null) {
    return copy.askPrice;
  }

  const amount =
    service.price.toLocaleString(
      undefined,
      {
        maximumFractionDigits: 2,
      },
    );

  return `${
    service.currency || 'THB'
  } ${amount}${
    service.priceUnit
      ? ` / ${service.priceUnit}`
      : ''
  }`;
}

function stripStoragePrefix(value: string) {
  const clean =
    String(value || '').trim();

  if (
    clean.startsWith(
      'supabase://business-media/',
    )
  ) {
    return clean.slice(
      'supabase://business-media/'
        .length,
    );
  }

  if (
    clean.startsWith(
      'business-media/',
    )
  ) {
    return clean.slice(
      'business-media/'
        .length,
    );
  }

  if (
    /^https?:\/\//i.test(clean)
  ) {
    return '';
  }

  return clean;
}

function extensionOf(file: File) {
  const filename =
    file.name.toLowerCase();

  const extension =
    filename
      .split('.')
      .pop()
      ?.replace(
        /[^a-z0-9]/g,
        '',
      );

  if (
    extension === 'jpg' ||
    extension === 'jpeg' ||
    extension === 'png' ||
    extension === 'webp'
  ) {
    return extension === 'jpeg'
      ? 'jpg'
      : extension;
  }

  if (
    file.type === 'image/png'
  ) {
    return 'png';
  }

  if (
    file.type === 'image/webp'
  ) {
    return 'webp';
  }

  return 'jpg';
}

function formatOptions(copy: Copy) {
  return [
    {
      value:
        'food_drink' as ItemFormat,
      label:
        copy.formatFood,
    },
    {
      value:
        'accommodation' as ItemFormat,
      label:
        copy.formatAccommodation,
    },
    {
      value:
        'activity' as ItemFormat,
      label:
        copy.formatActivity,
    },
    {
      value:
        'service' as ItemFormat,
      label:
        copy.formatService,
    },
    {
      value:
        'product' as ItemFormat,
      label:
        copy.formatProduct,
    },
    {
      value:
        'transport' as ItemFormat,
      label:
        copy.formatTransport,
    },
    {
      value:
        'other' as ItemFormat,
      label:
        copy.formatOther,
    },
  ];
}

function subcategoryOptions(
  format: ItemFormat,
  copy: Copy,
) {
  switch (format) {
    case 'food_drink':
      return [
        {
          value:
            'menu_food',
          label:
            copy.subFood,
        },
        {
          value:
            'drink',
          label:
            copy.subDrink,
        },
        {
          value:
            'set_menu',
          label:
            copy.subSetMenu,
        },
        {
          value:
            'cafe_dessert',
          label:
            copy.subCafe,
        },
        {
          value:
            'catering',
          label:
            copy.subCatering,
        },
      ];

    case 'accommodation':
      return [
        {
          value:
            'room',
          label:
            copy.subRoom,
        },
        {
          value:
            'stay_package',
          label:
            copy.subPackageStay,
        },
      ];

    case 'activity':
      return [
        {
          value:
            'activity',
          label:
            copy.subActivity,
        },
        {
          value:
            'experience',
          label:
            copy.subExperience,
        },
        {
          value:
            'tour',
          label:
            copy.subTour,
        },
      ];

    case 'service':
      return [
        {
          value:
            'service',
          label:
            copy.subService,
        },
        {
          value:
            'beauty_wellness',
          label:
            copy.subBeauty,
        },
      ];

    case 'product':
      return [
        {
          value:
            'product',
          label:
            copy.subProduct,
        },
      ];

    case 'transport':
      return [
        {
          value:
            'transport',
          label:
            copy.subTransport,
        },
      ];

    default:
      return [
        {
          value:
            'other',
          label:
            copy.subOther,
        },
      ];
  }
}

function formatFromCategory(
  category: string,
): ItemFormat {
  const clean =
    String(category || '')
      .trim()
      .toLowerCase()
      .replace(
        /[\s-]+/g,
        '_',
      );

  if (
    clean.includes('food') ||
    clean.includes('menu') ||
    clean.includes('drink') ||
    clean.includes('cafe') ||
    clean.includes('catering') ||
    clean.includes('dessert')
  ) {
    return 'food_drink';
  }

  if (
    clean.includes('room') ||
    clean.includes('hotel') ||
    clean.includes('stay') ||
    clean.includes('accommodation')
  ) {
    return 'accommodation';
  }

  if (
    clean.includes('activity') ||
    clean.includes('experience') ||
    clean.includes('tour')
  ) {
    return 'activity';
  }

  if (
    clean.includes('transport') ||
    clean.includes('transfer') ||
    clean.includes('car')
  ) {
    return 'transport';
  }

  if (
    clean.includes('product') ||
    clean.includes('shopping')
  ) {
    return 'product';
  }

  if (
    clean.includes('service') ||
    clean.includes('beauty') ||
    clean.includes('wellness')
  ) {
    return 'service';
  }

  return 'other';
}

function categoryLabel(
  category: string,
  copy: Copy,
) {
  const clean =
    String(category || '').trim();

  if (!clean) {
    return copy.subOther;
  }

  const normalized =
    clean
      .toLowerCase()
      .replace(
        /[\s-]+/g,
        '_',
      );

  const all =
    (
      [
        'food_drink',
        'accommodation',
        'activity',
        'service',
        'product',
        'transport',
        'other',
      ] as ItemFormat[]
    ).flatMap(
      (format) =>
        subcategoryOptions(
          format,
          copy,
        ),
    );

  const found =
    all.find(
      (option) =>
        option.value ===
        normalized,
    );

  if (found) {
    return found.label;
  }

  return clean.replace(
    /[_-]+/g,
    ' ',
  );
}

function normalizedSaleMode(
  value: unknown,
): SaleMode {
  const clean =
    String(value || '')
      .trim()
      .toLowerCase();

  if (
    clean === 'instant'
  ) {
    return 'instant';
  }

  if (
    clean === 'display' ||
    clean === 'view_only' ||
    clean === 'info'
  ) {
    return 'display';
  }

  return 'inquiry';
}

function inquiryArray(
  value: unknown,
): InquiryRequirement[] {
  let raw: unknown =
    value;

  if (
    typeof raw === 'string'
  ) {
    try {
      raw =
        JSON.parse(raw);
    } catch {
      raw =
        raw
          .split(',')
          .map(
            (item) =>
              item.trim(),
          );
    }
  }

  if (
    !Array.isArray(raw)
  ) {
    return [
      'date',
      'time',
      'guests',
    ];
  }

  const allowed =
    new Set<InquiryRequirement>(
      [
        'date',
        'time',
        'guests',
        'tables',
        'note',
      ],
    );

  return raw
    .map(
      (item) =>
        String(
          item,
        ) as InquiryRequirement,
    )
    .filter(
      (item) =>
        allowed.has(item),
    );
}

async function resolveServiceImage(
  path: string,
) {
  const clean =
    String(path || '').trim();

  if (!clean) {
    return '';
  }

  if (
    /^https?:\/\//i.test(clean)
  ) {
    return clean;
  }

  try {
    return await resolveCommerceMedia(
      {
        image_storage_path:
          clean,

        image_path:
          clean,

        service_image_path:
          clean,

        product_image_path:
          clean,
      },
    );
  } catch {
    return '';
  }
}

function ProductCard({
  service,
  copy,
  busy,
  expanded,
  onToggleExpanded,
  onToggleActive,
  onEdit,
  onDelete,
}: {
  service: PartnerService;
  copy: Copy;
  busy: boolean;
  expanded: boolean;
  onToggleExpanded: () => void;
  onToggleActive: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [
    image,
    setImage,
  ] =
    useState('');

  useEffect(
    () => {
      let active = true;

      void resolveServiceImage(
        service.imagePath,
      ).then(
        (url) => {
          if (active) {
            setImage(url);
          }
        },
      );

      return () => {
        active = false;
      };
    },
    [
      service.id,
      service.imagePath,
    ],
  );

  return (
    <article
      className={
        styles.productCard
      }
    >
      <div
        className={
          styles.productMedia
        }
      >
        {image ? (
          <img
            src={image}
            alt={
              service.title
            }
          />
        ) : (
          <div
            className={
              styles.mediaPlaceholder
            }
          >
            <span>
              ▧
            </span>

            <strong>
              {
                service.title
              }
            </strong>
          </div>
        )}

        <span
          className={
            styles.categoryBadge
          }
        >
          {categoryLabel(
            service.category,
            copy,
          )}
        </span>

        <span
          className={
            styles.availabilityBadge
          }
          data-active={
            service.active
          }
        >
          {service.active
            ? copy.available
            : copy.unavailable}
        </span>
      </div>

      <div
        className={
          styles.productBody
        }
      >
        <h3>
          {
            service.title
          }
        </h3>

        <p>
          {service.description ||
            categoryLabel(
              service.category,
              copy,
            )}
        </p>

        <div
          className={
            styles.productPriceRow
          }
        >
          <strong>
            {servicePrice(
              service,
              copy,
            )}
          </strong>

          <button
            type="button"
            onClick={
              onToggleExpanded
            }
          >
            {expanded
              ? copy.hideDetails
              : copy.details}{' '}
            ›
          </button>
        </div>

        {expanded ? (
          <div
            className={
              styles.productDetails
            }
          >
            <div>
              <small>
                {
                  copy.category
                }
              </small>

              <strong>
                {categoryLabel(
                  service.category,
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
                  ? copy.available
                  : copy.unavailable}
              </strong>
            </div>
          </div>
        ) : null}
      </div>

      <footer
        className={
          styles.productActions
        }
      >
        <button
          type="button"
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
          data-primary="true"
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
          data-danger="true"
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
      </footer>
    </article>
  );
}

export default function PartnerServicesExperience() {
  const {
    locale:
      rawLocale,
  } =
    useLocale();

  const {
    locale,
    copy,
  } =
    copyFor(
      rawLocale,
    );

  const [
    access,
    setAccess,
  ] =
    useState<
      PartnerBusinessAccess |
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
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState('');

  const [
    success,
    setSuccess,
  ] =
    useState('');

  const [
    filter,
    setFilter,
  ] =
    useState('all');

  const [
    expandedId,
    setExpandedId,
  ] =
    useState<
      string |
      null
    >(null);

  const [
    busyServiceId,
    setBusyServiceId,
  ] =
    useState<
      string |
      null
    >(null);

  const [
    formOpen,
    setFormOpen,
  ] =
    useState(false);

  const [
    editingId,
    setEditingId,
  ] =
    useState<
      string |
      null
    >(null);

  const [
    form,
    setForm,
  ] =
    useState<ServiceForm>({
      ...EMPTY_FORM,
    });

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    imageFile,
    setImageFile,
  ] =
    useState<
      File |
      null
    >(null);

  const [
    imagePreview,
    setImagePreview,
  ] =
    useState('');

  const [
    existingImagePath,
    setExistingImagePath,
  ] =
    useState('');

  const [
    existingImagePreview,
    setExistingImagePreview,
  ] =
    useState('');

  const load =
    useCallback(
      async () => {
        setLoading(true);
        setError('');

        try {
          const nextAccess =
            await getActivePartnerBusiness();

          setAccess(
            nextAccess,
          );

          if (!nextAccess) {
            setServices([]);
            return;
          }

          if (
            !hasPartnerPermission(
              nextAccess,
              'services',
            )
          ) {
            setServices([]);
            return;
          }

          const nextServices =
            await listPartnerServices(
              nextAccess.businessId,
            );

          setServices(
            nextServices,
          );
        } catch (cause) {
          setError(
            cause instanceof Error
              ? cause.message
              : String(cause),
          );
        } finally {
          setLoading(false);
        }
      },
      [],
    );

  useEffect(
    () => {
      void load();
    },
    [
      load,
    ],
  );

  useEffect(
    () => {
      return () => {
        if (
          imagePreview.startsWith(
            'blob:',
          )
        ) {
          URL.revokeObjectURL(
            imagePreview,
          );
        }
      };
    },
    [
      imagePreview,
    ],
  );

  useEffect(
    () => {
      if (!formOpen) {
        return;
      }

      const previous =
        document.body.style.overflow;

      document.body.style.overflow =
        'hidden';

      const onKeyDown =
        (
          event:
            KeyboardEvent,
        ) => {
          if (
            event.key ===
            'Escape'
          ) {
            closeForm();
          }
        };

      window.addEventListener(
        'keydown',
        onKeyDown,
      );

      return () => {
        document.body.style.overflow =
          previous;

        window.removeEventListener(
          'keydown',
          onKeyDown,
        );
      };
    },
    [
      formOpen,
    ],
  );

  const allowed =
    Boolean(
      access &&
      hasPartnerPermission(
        access,
        'services',
      ),
    );

  const categories =
    useMemo(
      () => {
        const values =
          new Set<string>();

        services.forEach(
          (service) => {
            const category =
              service.category.trim();

            if (category) {
              values.add(
                category,
              );
            }
          },
        );

        return [
          ...values,
        ];
      },
      [
        services,
      ],
    );

  const filteredServices =
    useMemo(
      () => {
        if (
          filter === 'all'
        ) {
          return services;
        }

        return services.filter(
          (service) =>
            service.category ===
            filter,
        );
      },
      [
        filter,
        services,
      ],
    );

  const currentSubcategories =
    useMemo(
      () =>
        subcategoryOptions(
          form.itemFormat,
          copy,
        ),
      [
        copy,
        form.itemFormat,
      ],
    );

  const selectedImage =
    imagePreview ||
    existingImagePreview;

  function patchForm(
    values:
      Partial<ServiceForm>,
  ) {
    setForm(
      (current) => ({
        ...current,
        ...values,
      }),
    );
  }

  function resetForm() {
    setEditingId(null);

    setForm({
      ...EMPTY_FORM,

      inquiryRequirements: [
        ...EMPTY_FORM
          .inquiryRequirements,
      ],
    });

    setImageFile(null);
    setImagePreview('');
    setExistingImagePath('');
    setExistingImagePreview('');
  }

  function openNew() {
    setError('');
    setSuccess('');

    resetForm();

    setFormOpen(true);
  }

  function closeForm() {
    if (saving) {
      return;
    }

    setFormOpen(false);

    resetForm();
  }

  async function loadSalesSettings(
    businessId: string,
    serviceId: string,
  ) {
    const result =
      await rpcRequest<Row[]>(
        'get_business_service_sales_settings',
        {
          p_business_id:
            businessId,
        },
      );

    if (
      result.error ||
      !Array.isArray(
        result.data,
      )
    ) {
      return null;
    }

    return (
      result.data.find(
        (row) =>
          String(
            row.service_id ||
            '',
          ) === serviceId,
      ) || null
    );
  }

  async function openEdit(
    service:
      PartnerService,
  ) {
    setError('');
    setSuccess('');

    const format =
      formatFromCategory(
        service.category,
      );

    const normalizedCategory =
      service.category
        .trim()
        .toLowerCase()
        .replace(
          /[\s-]+/g,
          '_',
        );

    const options =
      subcategoryOptions(
        format,
        copy,
      );

    const subcategory =
      options.some(
        (option) =>
          option.value ===
          normalizedCategory,
      )
        ? normalizedCategory
        : (
            options[0]
              ?.value ||
            'other'
          );

    setEditingId(
      service.id,
    );

    setForm({
      ...EMPTY_FORM,

      itemFormat:
        format,

      subcategory,

      title:
        service.title,

      description:
        service.description,

      normalPrice:
        service.price ===
        null
          ? ''
          : String(
              service.price,
            ),

      priceUnit:
        service.priceUnit ||
        'set',

      currency:
        service.currency ||
        'THB',

      legacyDetailType:
        service.detailType ||
        'standard',

      promotionMode:
        service.detailType ===
        'promotion'
          ? 'fixed'
          : 'none',
    });

    const rawImagePath =
      stripStoragePrefix(
        service.imagePath,
      );

    setExistingImagePath(
      rawImagePath,
    );

    setExistingImagePreview(
      await resolveServiceImage(
        service.imagePath,
      ),
    );

    setImageFile(null);
    setImagePreview('');

    setFormOpen(true);

    if (access) {
      void loadSalesSettings(
        access.businessId,
        service.id,
      ).then(
        async (sales) => {
          if (!sales) {
            return;
          }

          const salesImage =
            String(
              sales
                .image_storage_path ||
              '',
            ).trim();

          patchForm({
            saleMode:
              normalizedSaleMode(
                sales.sale_mode,
              ),

            inquiryRequirements:
              inquiryArray(
                sales.inquiry_requirements,
              ),

            maxCustomers:
              sales.max_per_user ===
                null ||
              sales.max_per_user ===
                undefined
                ? ''
                : String(
                    sales.max_per_user,
                  ),
          });

          if (salesImage) {
            setExistingImagePath(
              stripStoragePrefix(
                salesImage,
              ),
            );

            setExistingImagePreview(
              await resolveServiceImage(
                salesImage,
              ),
            );
          }
        },
      );
    }
  }

  function changeItemFormat(
    value: ItemFormat,
  ) {
    const nextOptions =
      subcategoryOptions(
        value,
        copy,
      );

    patchForm({
      itemFormat:
        value,

      subcategory:
        nextOptions[0]
          ?.value ||
        'other',
    });
  }

  function changeImage(
    event:
      ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      event.target.files?.[0];

    event.target.value =
      '';

    if (!file) {
      return;
    }

    const validType =
      [
        'image/jpeg',
        'image/png',
        'image/webp',
      ].includes(
        file.type,
      );

    const validSize =
      file.size <=
      8 *
        1024 *
        1024;

    if (
      !validType ||
      !validSize
    ) {
      setError(
        copy.imageError,
      );

      return;
    }

    setError('');

    if (
      imagePreview.startsWith(
        'blob:',
      )
    ) {
      URL.revokeObjectURL(
        imagePreview,
      );
    }

    const preview =
      URL.createObjectURL(
        file,
      );

    setImageFile(file);
    setImagePreview(
      preview,
    );
  }

  function removeImage() {
    if (
      imagePreview.startsWith(
        'blob:',
      )
    ) {
      URL.revokeObjectURL(
        imagePreview,
      );
    }

    setImageFile(null);
    setImagePreview('');
    setExistingImagePath('');
    setExistingImagePreview('');
  }

  function toggleRequirement(
    requirement:
      InquiryRequirement,
  ) {
    setForm(
      (current) => {
        const selected =
          current
            .inquiryRequirements
            .includes(
              requirement,
            );

        return {
          ...current,

          inquiryRequirements:
            selected
              ? current
                  .inquiryRequirements
                  .filter(
                    (item) =>
                      item !==
                      requirement,
                  )
              : [
                  ...current
                    .inquiryRequirements,
                  requirement,
                ],
        };
      },
    );
  }

  function descriptionForSave() {
    const lines = [
      form.description.trim(),
    ];

    if (
      form.itemFormat ===
        'food_drink' &&
      form.optionDetails.trim()
    ) {
      lines.push(
        `${copy.detailOptions}: ${form.optionDetails.trim()}`,
      );
    }

    if (
      form.itemFormat ===
        'food_drink' &&
      form.dietaryDetails.trim()
    ) {
      lines.push(
        `${copy.detailDietary}: ${form.dietaryDetails.trim()}`,
      );
    }

    return lines
      .filter(Boolean)
      .join('\n');
  }

  function calculatedPrice() {
    const normal =
      nullableNumber(
        form.normalPrice,
      );

    const promotion =
      nullableNumber(
        form.promotionValue,
      );

    if (
      form.promotionMode ===
      'fixed'
    ) {
      return {
        price:
          promotion ??
          normal,

        originalPrice:
          normal,

        detailType:
          'promotion',
      };
    }

    if (
      form.promotionMode ===
        'percent' &&
      normal !== null &&
      promotion !== null
    ) {
      const percent =
        Math.max(
          0,
          Math.min(
            100,
            promotion,
          ),
        );

      return {
        price:
          Math.max(
            0,
            normal *
              (
                1 -
                percent /
                  100
              ),
          ),

        originalPrice:
          normal,

        detailType:
          'promotion',
      };
    }

    return {
      price:
        normal,

      originalPrice:
        null,

      detailType:
        form.legacyDetailType ===
        'promotion'
          ? 'standard'
          : (
              form
                .legacyDetailType ||
              'standard'
            ),
    };
  }

  async function uploadMainImage(
    businessId: string,
    serviceId: string,
  ) {
    if (!imageFile) {
      return existingImagePath;
    }

    const user =
      await getCurrentUser();

    if (!user?.id) {
      throw new Error(
        'Authentication required',
      );
    }

    const extension =
      extensionOf(
        imageFile,
      );

    const path =
      `${user.id}/${businessId}-${serviceId}-${Date.now()}.${extension}`;

    const upload =
      await uploadStorageObject(
        'business-media',
        path,
        imageFile,
        imageFile.type,
      );

    if (upload.error) {
      throw new Error(
        upload.error,
      );
    }

    return (
      upload.data?.path ||
      path
    );
  }

  async function saveSalesSettings(
    businessId: string,
    serviceId: string,
    imagePath: string,
  ) {
    const maxPerUser =
      nullableInteger(
        form.maxCustomers,
      );

    const result =
      await rpcRequest(
        'save_business_service_sales_settings',
        {
          p_business_id:
            businessId,

          p_service_id:
            serviceId,

          p_sale_mode:
            form.saleMode ===
            'display'
              ? 'info'
              : form.saleMode,

          p_inquiry_requirements:
            form.saleMode ===
            'inquiry'
              ? form.inquiryRequirements
              : [],

          p_max_per_user:
            maxPerUser,

          p_image_storage_path:
            imagePath ||
            null,
        },
      );

    if (result.error) {
      throw new Error(
        result.error,
      );
    }
  }

  async function submit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      !access ||
      saving
    ) {
      return;
    }

    if (
      !form.title.trim() ||
      !form.description.trim()
    ) {
      setError(
        copy.requiredError,
      );

      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const price =
        calculatedPrice();

      const result =
        await rpcRequest<string>(
          'partner_save_business_service',
          {
            p_business_id:
              access.businessId,

            p_service_id:
              editingId,

            p_category:
              form.subcategory,

            p_title:
              form.title.trim(),

            p_description:
              descriptionForSave(),

            p_price_from:
              price.price,

            p_currency:
              form.currency,

            p_price_unit:
              form.priceUnit.trim(),

            p_detail_type:
              price.detailType,

            p_original_price:
              price.originalPrice,

            p_duration_minutes:
              null,

            p_min_guests:
              nullableInteger(
                form.minCustomers,
              ),

            p_max_guests:
              nullableInteger(
                form.maxCustomers,
              ),

            p_includes_text:
              form.includes.trim(),

            p_excludes_text:
              form.excludes.trim(),

            p_valid_from:
              null,

            p_valid_until:
              null,

            p_melo_member_only:
              false,

            p_stock_limit:
              null,
          },
        );

      if (result.error) {
        throw new Error(
          result.error,
        );
      }

      const serviceId =
        String(
          result.data ||
          editingId ||
          '',
        ).trim();

      if (!serviceId) {
        throw new Error(
          'Service ID was not returned',
        );
      }

      setEditingId(
        serviceId,
      );

      const imagePath =
        await uploadMainImage(
          access.businessId,
          serviceId,
        );

      await saveSalesSettings(
        access.businessId,
        serviceId,
        imagePath,
      );

      setSuccess(
        copy.saveSuccess,
      );

      setFormOpen(false);

      resetForm();

      await load();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : String(cause),
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleService(
    service: PartnerService,
  ) {
    if (
      !access ||
      busyServiceId
    ) {
      return;
    }

    setBusyServiceId(
      service.id,
    );

    setError('');

    try {
      await setPartnerServiceActive(
        access.businessId,
        service.id,
        !service.active,
      );

      await load();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : String(cause),
      );
    } finally {
      setBusyServiceId(null);
    }
  }

  async function removeService(
    service: PartnerService,
  ) {
    if (
      !access ||
      busyServiceId
    ) {
      return;
    }

    if (
      !window.confirm(
        `${copy.confirmDelete}\n${service.title}`,
      )
    ) {
      return;
    }

    setBusyServiceId(
      service.id,
    );

    setError('');

    try {
      await deletePartnerService(
        access.businessId,
        service.id,
      );

      await load();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : String(cause),
      );
    } finally {
      setBusyServiceId(null);
    }
  }

  const formatList =
    formatOptions(copy);

  const unitOptions = [
    {
      value:
        'plate',
      label:
        copy.unitPlate,
    },
    {
      value:
        'cup',
      label:
        copy.unitCup,
    },
    {
      value:
        'set',
      label:
        copy.unitSet,
    },
    {
      value:
        'person',
      label:
        copy.unitPerson,
    },
    {
      value:
        'table',
      label:
        copy.unitTable,
    },
  ];

  const currencyOptions = [
    'THB',
    'USD',
    'EUR',
    'JPY',
    'KRW',
    'CNY',
  ];

  const requirementOptions:
    Array<{
      value:
        InquiryRequirement;
      label:
        string;
    }> = [
      {
        value:
          'date',
        label:
          copy.inquiryDate,
      },
      {
        value:
          'time',
        label:
          copy.inquiryTime,
      },
      {
        value:
          'guests',
        label:
          copy.inquiryGuests,
      },
      {
        value:
          'tables',
        label:
          copy.inquiryTables,
      },
      {
        value:
          'note',
        label:
          copy.inquiryNote,
      },
    ];

  return (
    <main
      className={
        styles.page
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
          false
        }
      />

      <section
        className={
          styles.shell
        }
      >
        <header
          className={
            styles.pageHeader
          }
        >
          <div>
            <small>
              {
                copy.eyebrow
              }
            </small>

            <h1>
              {
                copy.title
              }
            </h1>

            <p>
              {
                copy.subtitle
              }
            </p>
          </div>

          <div
            className={
              styles.headerActions
            }
          >
            {allowed ? (
              <button
                type="button"
                className={
                  styles.addButton
                }
                onClick={
                  openNew
                }
              >
                <span>
                  ＋
                </span>

                {
                  copy.add
                }
              </button>
            ) : null}

            <button
              type="button"
              className={
                styles.refreshButton
              }
              onClick={() =>
                void load()
              }
              aria-label={
                copy.refresh
              }
            >
              ↻
            </button>
          </div>
        </header>

        {error ? (
          <div
            className={
              styles.errorBanner
            }
          >
            {
              error
            }
          </div>
        ) : null}

        {success ? (
          <div
            className={
              styles.successBanner
            }
          >
            {
              success
            }
          </div>
        ) : null}

        {loading ? (
          <div
            className={
              styles.stateCard
            }
          >
            {
              copy.loading
            }
          </div>
        ) : !allowed ? (
          <div
            className={
              styles.stateCard
            }
          >
            <strong>
              {
                copy.noAccess
              }
            </strong>
          </div>
        ) : (
          <>
            <div
              className={
                styles.filters
              }
            >
              <button
                type="button"
                data-active={
                  filter === 'all'
                }
                onClick={() =>
                  setFilter('all')
                }
              >
                <span>
                  {
                    copy.all
                  }
                </span>

                <b>
                  {
                    services.length
                  }
                </b>
              </button>

              {categories.map(
                (category) => {
                  const count =
                    services.filter(
                      (service) =>
                        service.category ===
                        category,
                    ).length;

                  return (
                    <button
                      key={
                        category
                      }
                      type="button"
                      data-active={
                        filter ===
                        category
                      }
                      onClick={() =>
                        setFilter(
                          category,
                        )
                      }
                    >
                      <span>
                        {categoryLabel(
                          category,
                          copy,
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
              <div
                className={
                  styles.productGrid
                }
              >
                {filteredServices.map(
                  (service) => (
                    <ProductCard
                      key={
                        service.id
                      }
                      service={
                        service
                      }
                      copy={
                        copy
                      }
                      busy={
                        busyServiceId ===
                        service.id
                      }
                      expanded={
                        expandedId ===
                        service.id
                      }
                      onToggleExpanded={() =>
                        setExpandedId(
                          expandedId ===
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
                        void openEdit(
                          service,
                        )
                      }
                      onDelete={() =>
                        void removeService(
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
                  styles.emptyState
                }
              >
                <span>
                  ＋
                </span>

                <strong>
                  {
                    copy.noItems
                  }
                </strong>

                <p>
                  {
                    copy.noItemsBody
                  }
                </p>

                <button
                  type="button"
                  onClick={
                    openNew
                  }
                >
                  {
                    copy.add
                  }
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {formOpen ? (
        <div
          className={
            styles.modalBackdrop
          }
          onMouseDown={(
            event,
          ) => {
            if (
              event.currentTarget ===
              event.target
            ) {
              closeForm();
            }
          }}
        >
          <form
            className={
              styles.modal
            }
            onSubmit={
              submit
            }
          >
            <header
              className={
                styles.modalHeader
              }
            >
              <div>
                <small>
                  MELO PARTNER
                </small>

                <h2>
                  {editingId
                    ? copy.formEdit
                    : copy.formNew}
                </h2>

                <p>
                  {
                    copy.formIntro
                  }
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeForm
                }
                disabled={
                  saving
                }
                aria-label={
                  copy.close
                }
              >
                ×
              </button>
            </header>

            <div
              className={
                styles.modalScroll
              }
            >
              <div
                className={
                  styles.formLayout
                }
              >
                {/* ==============================
                    SECTION 01
                    BASIC INFORMATION
                    ============================== */}

                <section
                  className={
                    styles.formCard
                  }
                >
                  <div
                    className={
                      styles.sectionHead
                    }
                  >
                    <div>
                      <span>
                        01
                      </span>

                      <div>
                        <h3>
                          {
                            copy.basicSection
                          }
                        </h3>

                        <p>
                          {
                            copy.basicHint
                          }
                        </p>
                      </div>
                    </div>
                  </div>

                  <div
                    className={
                      styles.businessFit
                    }
                  >
                    <span>
                      ✦
                    </span>

                    <div>
                      <strong>
                        {
                          copy.businessFit
                        }
                      </strong>

                      <p>
                        {access?.businessType ||
                          copy.businessFitFallback}
                      </p>
                    </div>
                  </div>

                  <div
                    className={
                      styles.twoColumns
                    }
                  >
                    <label
                      className={
                        styles.field
                      }
                    >
                      <span>
                        {
                          copy.itemFormatRequired
                        }
                      </span>

                      <select
                        value={
                          form.itemFormat
                        }
                        onChange={(
                          event,
                        ) =>
                          changeItemFormat(
                            event
                              .target
                              .value as ItemFormat,
                          )
                        }
                      >
                        {formatList.map(
                          (option) => (
                            <option
                              key={
                                option.value
                              }
                              value={
                                option.value
                              }
                            >
                              {
                                option.label
                              }
                            </option>
                          ),
                        )}
                      </select>
                    </label>

                    <label
                      className={
                        styles.field
                      }
                    >
                      <span>
                        {
                          copy.subcategory
                        }
                      </span>

                      <select
                        value={
                          form.subcategory
                        }
                        onChange={(
                          event,
                        ) =>
                          patchForm({
                            subcategory:
                              event
                                .target
                                .value,
                          })
                        }
                      >
                        {currentSubcategories.map(
                          (option) => (
                            <option
                              key={
                                option.value
                              }
                              value={
                                option.value
                              }
                            >
                              {
                                option.label
                              }
                            </option>
                          ),
                        )}
                      </select>
                    </label>
                  </div>

                  <label
                    className={
                      styles.field
                    }
                  >
                    <span>
                      {
                        copy.itemName
                      }
                    </span>

                    <input
                      value={
                        form.title
                      }
                      onChange={(
                        event,
                      ) =>
                        patchForm({
                          title:
                            event
                              .target
                              .value,
                        })
                      }
                      placeholder={
                        copy.itemNamePlaceholder
                      }
                      required
                    />
                  </label>

                  <label
                    className={
                      styles.field
                    }
                  >
                    <span>
                      {
                        copy.description
                      }
                    </span>

                    <textarea
                      value={
                        form.description
                      }
                      onChange={(
                        event,
                      ) =>
                        patchForm({
                          description:
                            event
                              .target
                              .value,
                        })
                      }
                      placeholder={
                        copy.descriptionPlaceholder
                      }
                      required
                    />
                  </label>

                  {form.itemFormat ===
                  'food_drink' ? (
                    <div
                      className={
                        styles.specialCard
                      }
                    >
                      <div
                        className={
                          styles.specialHead
                        }
                      >
                        <h4>
                          {
                            copy.specificTitle
                          }
                        </h4>

                        <p>
                          {
                            copy.specificHint
                          }
                        </p>
                      </div>

                      <div
                        className={
                          styles.twoColumns
                        }
                      >
                        <div
                          className={
                            styles.field
                          }
                        >
                          <span>
                            {
                              copy.options
                            }
                          </span>

                          <PartnerServiceSpecificMultiSelect
                            locale={
                              locale
                            }
                            kind="menuOptions"
                            value={
                              form.optionDetails
                            }
                            placeholder={
                              copy.optionsHint
                            }
                            onChange={(
                              value,
                            ) =>
                              patchForm({
                                optionDetails:
                                  value,
                              })
                            }
                          />
                        </div>

                        <div
                          className={
                            styles.field
                          }
                        >
                          <span>
                            {
                              copy.dietary
                            }
                          </span>

                          <PartnerServiceSpecificMultiSelect
                            locale={
                              locale
                            }
                            kind="dietary"
                            value={
                              form.dietaryDetails
                            }
                            placeholder={
                              copy.dietaryHint
                            }
                            onChange={(
                              value,
                            ) =>
                              patchForm({
                                dietaryDetails:
                                  value,
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  ) : null}
                </section>

                {/* ==============================
                    SECTION 02
                    IMAGE
                    ============================== */}

                <section
                  className={`${styles.formCard} ${styles.imageCard}`}
                >
                  <div
                    className={
                      styles.sectionHead
                    }
                  >
                    <div>
                      <span>
                        02
                      </span>

                      <div>
                        <h3>
                          {
                            copy.imageSection
                          }
                        </h3>

                        <p>
                          {
                            copy.imageHint
                          }
                        </p>
                      </div>
                    </div>
                  </div>

                  <div
                    className={
                      styles.imageWorkspace
                    }
                  >
                    {selectedImage ? (
                      <div
                        className={
                          styles.imagePreview
                        }
                      >
                        <img
                          src={
                            selectedImage
                          }
                          alt=""
                        />

                        <span>
                          {
                            copy.imageMain
                          }
                        </span>
                      </div>
                    ) : (
                      <label
                        className={
                          styles.imageDrop
                        }
                      >
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={
                            changeImage
                          }
                        />

                        <b>
                          ＋
                        </b>

                        <strong>
                          {
                            copy.addImage
                          }
                        </strong>

                        <small>
                          {
                            copy.imageLimit
                          }
                        </small>
                      </label>
                    )}

                    {selectedImage ? (
                      <div
                        className={
                          styles.imageActions
                        }
                      >
                        <label>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={
                              changeImage
                            }
                          />

                          {
                            copy.changeImage
                          }
                        </label>

                        <button
                          type="button"
                          onClick={
                            removeImage
                          }
                        >
                          {
                            copy.removeImage
                          }
                        </button>
                      </div>
                    ) : null}
                  </div>
                </section>

                {/* ==============================
                    SECTION 03
                    PRICE
                    ============================== */}

                <section
                  className={`${styles.formCard} ${styles.wideCard}`}
                >
                  <div
                    className={
                      styles.sectionHead
                    }
                  >
                    <div>
                      <span>
                        03
                      </span>

                      <div>
                        <h3>
                          {
                            copy.priceSection
                          }
                        </h3>

                        <p>
                          {
                            copy.priceHint
                          }
                        </p>
                      </div>
                    </div>
                  </div>

                  <div
                    className={
                      styles.priceGrid
                    }
                  >
                    <div>
                      <label
                        className={
                          styles.field
                        }
                      >
                        <span>
                          {
                            copy.regularPrice
                          }
                        </span>

                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={
                            form.normalPrice
                          }
                          onChange={(
                            event,
                          ) =>
                            patchForm({
                              normalPrice:
                                event
                                  .target
                                  .value,
                            })
                          }
                          placeholder={
                            copy.regularPricePlaceholder
                          }
                        />
                      </label>

                      <div
                        className={
                          styles.chips
                        }
                      >
                        {unitOptions.map(
                          (option) => (
                            <button
                              key={
                                option.value
                              }
                              type="button"
                              data-active={
                                form.priceUnit ===
                                option.value
                              }
                              onClick={() =>
                                patchForm({
                                  priceUnit:
                                    option.value,
                                })
                              }
                            >
                              {
                                option.label
                              }
                            </button>
                          ),
                        )}
                      </div>

                      <label
                        className={
                          styles.inlineCustomUnit
                        }
                      >
                        <span>
                          {
                            copy.customUnit
                          }
                        </span>

                        <input
                          value={
                            unitOptions.some(
                              (option) =>
                                option.value ===
                                form.priceUnit,
                            )
                              ? ''
                              : form.priceUnit
                          }
                          onChange={(
                            event,
                          ) =>
                            patchForm({
                              priceUnit:
                                event
                                  .target
                                  .value,
                            })
                          }
                        />
                      </label>
                    </div>

                    <div
                      className={
                        styles.promotionCard
                      }
                    >
                      <strong>
                        {
                          copy.promotion
                        }
                      </strong>

                      <div
                        className={
                          styles.segmented
                        }
                      >
                        <button
                          type="button"
                          data-active={
                            form.promotionMode ===
                            'none'
                          }
                          onClick={() =>
                            patchForm({
                              promotionMode:
                                'none',
                            })
                          }
                        >
                          {
                            copy.noPromotion
                          }
                        </button>

                        <button
                          type="button"
                          data-active={
                            form.promotionMode ===
                            'fixed'
                          }
                          onClick={() =>
                            patchForm({
                              promotionMode:
                                'fixed',
                            })
                          }
                        >
                          {
                            copy.promoFixed
                          }
                        </button>

                        <button
                          type="button"
                          data-active={
                            form.promotionMode ===
                            'percent'
                          }
                          onClick={() =>
                            patchForm({
                              promotionMode:
                                'percent',
                            })
                          }
                        >
                          {
                            copy.promoPercent
                          }
                        </button>
                      </div>

                      {form.promotionMode !==
                      'none' ? (
                        <>
                          <label
                            className={
                              styles.field
                            }
                          >
                            <span>
                              {form.promotionMode ===
                              'percent'
                                ? copy.discountPercent
                                : copy.promoPrice}
                            </span>

                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              max={
                                form.promotionMode ===
                                'percent'
                                  ? 100
                                  : undefined
                              }
                              value={
                                form.promotionValue
                              }
                              onChange={(
                                event,
                              ) =>
                                patchForm({
                                  promotionValue:
                                    event
                                      .target
                                      .value,
                                })
                              }
                            />
                          </label>

                          <PartnerPromotionPricePreview
                            locale={
                              locale
                            }
                            regularPrice={
                              form.normalPrice
                            }
                            promotionMode={
                              form.promotionMode
                            }
                            promotionValue={
                              form.promotionValue
                            }
                            currency={
                              form.currency
                            }
                            priceUnit={
                              form.priceUnit
                            }
                          />
                        </>
                      ) : null}
                    </div>
                  </div>

                  <div
                    className={
                      styles.currencyBlock
                    }
                  >
                    <span>
                      {
                        copy.currency
                      }
                    </span>

                    <div
                      className={
                        styles.chips
                      }
                    >
                      {currencyOptions.map(
                        (currency) => (
                          <button
                            key={
                              currency
                            }
                            type="button"
                            data-active={
                              form.currency ===
                              currency
                            }
                            onClick={() =>
                              patchForm({
                                currency,
                              })
                            }
                          >
                            {
                              currency
                            }
                          </button>
                        ),
                      )}
                    </div>
                  </div>

                  <div
                    className={
                      styles.twoColumns
                    }
                  >
                    <label
                      className={
                        styles.field
                      }
                    >
                      <span>
                        {
                          copy.minimumCustomers
                        }
                      </span>

                      <input
                        type="number"
                        min="0"
                        value={
                          form.minCustomers
                        }
                        onChange={(
                          event,
                        ) =>
                          patchForm({
                            minCustomers:
                              event
                                .target
                                .value,
                          })
                        }
                      />
                    </label>

                    <label
                      className={
                        styles.field
                      }
                    >
                      <span>
                        {
                          copy.maximumCustomers
                        }
                      </span>

                      <input
                        type="number"
                        min="0"
                        value={
                          form.maxCustomers
                        }
                        onChange={(
                          event,
                        ) =>
                          patchForm({
                            maxCustomers:
                              event
                                .target
                                .value,
                          })
                        }
                        placeholder={
                          copy.unlimited
                        }
                      />
                    </label>
                  </div>

                  <div
                    className={
                      styles.twoColumns
                    }
                  >
                    <label
                      className={
                        styles.field
                      }
                    >
                      <span>
                        {
                          copy.includes
                        }
                      </span>

                      <textarea
                        value={
                          form.includes
                        }
                        onChange={(
                          event,
                        ) =>
                          patchForm({
                            includes:
                              event
                                .target
                                .value,
                          })
                        }
                        placeholder={
                          copy.includesPlaceholder
                        }
                      />
                    </label>

                    <label
                      className={
                        styles.field
                      }
                    >
                      <span>
                        {
                          copy.excludes
                        }
                      </span>

                      <textarea
                        value={
                          form.excludes
                        }
                        onChange={(
                          event,
                        ) =>
                          patchForm({
                            excludes:
                              event
                                .target
                                .value,
                          })
                        }
                        placeholder={
                          copy.excludesPlaceholder
                        }
                      />
                    </label>
                  </div>
                </section>

                {/* ==============================
                    SECTION 04
                    SALES FLOW
                    ============================== */}

                <section
                  className={`${styles.formCard} ${styles.wideCard}`}
                >
                  <div
                    className={
                      styles.sectionHead
                    }
                  >
                    <div>
                      <span>
                        04
                      </span>

                      <div>
                        <h3>
                          {
                            copy.flowSection
                          }
                        </h3>

                        <p>
                          {
                            copy.flowHint
                          }
                        </p>
                      </div>
                    </div>
                  </div>

                  <div
                    className={
                      styles.flowGrid
                    }
                  >
                    <button
                      type="button"
                      data-active={
                        form.saleMode ===
                        'display'
                      }
                      onClick={() =>
                        patchForm({
                          saleMode:
                            'display',
                        })
                      }
                    >
                      <span>
                        👁
                      </span>

                      <div>
                        <strong>
                          {
                            copy.displayOnly
                          }
                        </strong>

                        <p>
                          {
                            copy.displayOnlyDesc
                          }
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      data-active={
                        form.saleMode ===
                        'inquiry'
                      }
                      onClick={() =>
                        patchForm({
                          saleMode:
                            'inquiry',
                        })
                      }
                    >
                      <span>
                        💬
                      </span>

                      <div>
                        <strong>
                          {
                            copy.inquiry
                          }
                        </strong>

                        <p>
                          {
                            copy.inquiryDesc
                          }
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      data-active={
                        form.saleMode ===
                        'instant'
                      }
                      onClick={() =>
                        patchForm({
                          saleMode:
                            'instant',
                        })
                      }
                    >
                      <span>
                        ⚡
                      </span>

                      <div>
                        <strong>
                          {
                            copy.instant
                          }
                        </strong>

                        <p>
                          {
                            copy.instantDesc
                          }
                        </p>
                      </div>
                    </button>
                  </div>

                  {form.saleMode ===
                  'inquiry' ? (
                    <div
                      className={
                        styles.inquiryCard
                      }
                    >
                      <h4>
                        {
                          copy.inquirySection
                        }
                      </h4>

                      <p>
                        {
                          copy.inquiryHint
                        }
                      </p>

                      <div
                        className={
                          styles.inquiryChips
                        }
                      >
                        {requirementOptions.map(
                          (option) => (
                            <button
                              key={
                                option.value
                              }
                              type="button"
                              data-active={
                                form
                                  .inquiryRequirements
                                  .includes(
                                    option.value,
                                  )
                              }
                              onClick={() =>
                                toggleRequirement(
                                  option.value,
                                )
                              }
                            >
                              {form
                                .inquiryRequirements
                                .includes(
                                  option.value,
                                )
                                ? '✓ '
                                : ''}

                              {
                                option.label
                              }
                            </button>
                          ),
                        )}
                      </div>
                    </div>
                  ) : null}
                </section>
              </div>
            </div>

            <footer
              className={
                styles.modalFooter
              }
            >
              <button
                type="button"
                className={
                  styles.cancelButton
                }
                onClick={
                  closeForm
                }
                disabled={
                  saving
                }
              >
                {
                  copy.close
                }
              </button>

              <button
                type="submit"
                className={
                  styles.saveButton
                }
                disabled={
                  saving ||
                  !form.title.trim() ||
                  !form.description.trim()
                }
              >
                {saving
                  ? copy.saving
                  : editingId
                    ? copy.update
                    : copy.save}
              </button>
            </footer>
          </form>
        </div>
      ) : null}
    </main>
  );
}