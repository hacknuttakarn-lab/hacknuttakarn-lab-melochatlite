'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocale } from '@/components/SiteProviders';
import {
  createSignedStorageUrl,
  invokeEdgeFunction,
  rpcRequest,
  uploadStorageObject,
} from '@/lib/supabase/browser';
import PartnerModeHeader from './PartnerModeHeader';
import {
  getActivePartnerBusiness,
  getPartnerBusiness,
  type PartnerBusinessAccess,
} from './partnerModeWeb';
import styles from './PartnerMode.module.css';

type Locale = 'th' | 'en' | 'de' | 'zh' | 'ja' | 'ko';
type Row = Record<string, unknown>;
type VerificationStatus = 'draft' | 'pending' | 'revision_required' | 'approved' | 'rejected';
type StripeOnboardingStatus = 'not_started' | 'pending' | 'restricted' | 'ready';

type PayoutAccount = {
  id: string;
  businessId: string;
  businessName: string;
  legalName: string;
  country: string;
  currency: string;
  bankName: string;
  holder: string;
  accountNumber: string;
  certificatePath: string;
  status: VerificationStatus;
  isDefault: boolean;
  submittedAt: string;
  reviewedAt: string;
  reviewerNotes: string;
  updatedAt: string;
};

type FormState = {
  id: string;
  country: string;
  currency: string;
  bankName: string;
  holder: string;
  accountNumber: string;
  certificatePath: string;
  certificateName: string;
};

type StripeStatus = {
  stripeAccountId: string | null;
  onboardingStatus: StripeOnboardingStatus;
  detailsSubmitted: boolean;
  transfersEnabled: boolean;
  payoutsEnabled: boolean;
  chargesEnabled: boolean;
  requirementCount: number;
  lastError: string | null;
};

type BusinessMeta = {
  displayName: string;
  legalName: string;
  country: string;
};

const MAX_PAYOUT_ACCOUNTS = 3;
const PAYOUT_BUCKET = 'partner-payout-verification-private';

const BANKS = [
  ['Bangkok Bank', 'ธนาคารกรุงเทพ', 'Bangkok Bank'],
  ['Kasikorn Bank', 'ธนาคารกสิกรไทย', 'Kasikorn Bank'],
  ['Krungthai Bank', 'ธนาคารกรุงไทย', 'Krungthai Bank'],
  ['Siam Commercial Bank', 'ธนาคารไทยพาณิชย์', 'Siam Commercial Bank (SCB)'],
  ['Krungsri Bank', 'ธนาคารกรุงศรีอยุธยา', 'Krungsri Bank'],
  ['TMB Thanachart Bank', 'ธนาคารทหารไทยธนชาต', 'TMB Thanachart Bank (ttb)'],
  ['Government Savings Bank', 'ธนาคารออมสิน', 'Government Savings Bank (GSB)'],
  ['LH Bank', 'ธนาคารแลนด์ แอนด์ เฮ้าส์', 'LH Bank'],
  ['United Overseas Bank', 'ธนาคารยูโอบี', 'United Overseas Bank (UOB)'],
  ['CIMB Thai Bank', 'ธนาคารซีไอเอ็มบี ไทย', 'CIMB Thai Bank'],
] as const;

const COUNTRIES = [
  { value: 'Thailand', labels: { th: 'ไทย', en: 'Thailand', de: 'Thailand', zh: '泰国', ja: 'タイ', ko: '태국' } },
  { value: 'France', labels: { th: 'ฝรั่งเศส', en: 'France', de: 'Frankreich', zh: '法国', ja: 'フランス', ko: '프랑스' } },
  { value: 'Japan', labels: { th: 'ญี่ปุ่น', en: 'Japan', de: 'Japan', zh: '日本', ja: '日本', ko: '일본' } },
  { value: 'China', labels: { th: 'จีน', en: 'China', de: 'China', zh: '中国', ja: '中国', ko: '중국' } },
  { value: 'South Korea', labels: { th: 'เกาหลีใต้', en: 'South Korea', de: 'Südkorea', zh: '韩国', ja: '韓国', ko: '대한민국' } },
  { value: 'Germany', labels: { th: 'เยอรมนี', en: 'Germany', de: 'Deutschland', zh: '德国', ja: 'ドイツ', ko: '독일' } },
  { value: 'United States', labels: { th: 'สหรัฐอเมริกา', en: 'United States', de: 'Vereinigte Staaten', zh: '美国', ja: 'アメリカ合衆国', ko: '미국' } },
  { value: 'United Kingdom', labels: { th: 'สหราชอาณาจักร', en: 'United Kingdom', de: 'Vereinigtes Königreich', zh: '英国', ja: 'イギリス', ko: '영국' } },
  { value: 'Canada', labels: { th: 'แคนาดา', en: 'Canada', de: 'Kanada', zh: '加拿大', ja: 'カナダ', ko: '캐나다' } },
  { value: 'Australia', labels: { th: 'ออสเตรเลีย', en: 'Australia', de: 'Australien', zh: '澳大利亚', ja: 'オーストラリア', ko: '호주' } },
  { value: 'Singapore', labels: { th: 'สิงคโปร์', en: 'Singapore', de: 'Singapur', zh: '新加坡', ja: 'シンガポール', ko: '싱가포르' } },
  { value: 'Taiwan', labels: { th: 'ไต้หวัน', en: 'Taiwan', de: 'Taiwan', zh: '台湾', ja: '台湾', ko: '대만' } },
  { value: 'Hong Kong', labels: { th: 'ฮ่องกง', en: 'Hong Kong', de: 'Hongkong', zh: '香港', ja: '香港', ko: '홍콩' } },
] as const;

type Copy = {
  eyebrow: string; title: string; subtitle: string;
  noStore: string; noStoreHint: string; ownerOnly: string; ownerOnlyHint: string;
  accounts: string; accountCount: (count: number) => string; add: string; empty: string;
  defaultAccount: string; setDefault: string; deleteAccount: string; deleteConfirm: string;
  newAccount: string; newAccountDetail: string; detailTitle: string; detailHint: string;
  country: string; currency: string; bank: string; selectBank: string; bankName: string;
  holder: string; holderPh: string; account: string; accountPh: string;
  certificate: string; certificateHint: string; chooseFile: string; changeFile: string;
  saveDraft: string; submit: string; resubmit: string; saved: string; submitted: string;
  draft: string; draftDetail: string; pending: string; pendingDetail: string;
  revision: string; revisionDetail: string; approved: string; approvedDetail: string;
  rejected: string; rejectedDetail: string; adminNote: string;
  stripe: string; stripeHint: string; stripeNotStarted: string; stripePending: string;
  stripeRestricted: string; stripeReady: string; setupStripe: string; updateStripe: string;
  openStripeDashboard: string; opening: string; stripeRule: string;
  privacy: string; privacyBody: string;
  bankPicker: string; bankPickerHint: string; searchBank: string; close: string;
  loading: string; uploading: string; required: string; limit: string;
};

const COPY: Record<Locale, Copy> = {
  th: {
    eyebrow: 'MELO PARTNER', title: 'ข้อมูลรับเงิน', subtitle: 'ยืนยันบัญชีธนาคาร ตรวจสถานะ Payout และตั้งค่ารับเงินจริงของร้าน',
    noStore: 'ยังไม่มีร้านค้าที่ใช้งาน', noStoreHint: 'เลือกหรือสร้าง Business Account ก่อนตั้งค่าข้อมูลรับเงิน',
    ownerOnly: 'เฉพาะ Owner เท่านั้น', ownerOnlyHint: 'ข้อมูลบัญชีธนาคารและเอกสาร Payout เป็นข้อมูลส่วนตัวของเจ้าของร้าน Admin/Staff ไม่สามารถเข้าถึงหรือแก้ไขส่วนนี้ได้',
    accounts: 'บัญชีรับเงินของร้าน', accountCount: (count) => `${count}/${MAX_PAYOUT_ACCOUNTS} บัญชี · แต่ละบัญชีต้องผ่านการตรวจแยกกัน`, add: '＋ เพิ่มบัญชี', empty: 'ยังไม่มีบัญชีรับเงิน กรอกข้อมูลบัญชีแรกด้านล่างได้เลย',
    defaultAccount: 'บัญชีหลัก', setDefault: 'ตั้งเป็นบัญชีหลัก', deleteAccount: 'ลบบัญชีนี้', deleteConfirm: 'ยืนยันลบบัญชีรับเงินนี้ออกจากร้าน?',
    newAccount: 'เพิ่มบัญชีรับเงิน', newAccountDetail: 'บัญชีใหม่จะถูกนับเมื่อกดบันทึกแบบร่าง', detailTitle: 'รายละเอียดบัญชีรับเงิน', detailHint: 'ชื่อบัญชีควรตรงกับบุคคลหรือนิติบุคคลของ Business Account และใช้เอกสารธนาคารที่เห็นชื่อกับเลขบัญชีชัดเจน',
    country: 'ประเทศของบัญชี', currency: 'สกุลเงิน', bank: 'ธนาคาร', selectBank: 'เลือกธนาคาร', bankName: 'ชื่อธนาคาร', holder: 'ชื่อเจ้าของบัญชี', holderPh: 'ชื่อบนบัญชีธนาคาร', account: 'เลขบัญชี / IBAN', accountPh: 'เลขบัญชีสำหรับรับเงิน',
    certificate: 'หลักฐานบัญชีธนาคาร', certificateHint: 'แนบสมุดบัญชี / Bank Certificate ที่เห็นชื่อและเลขบัญชีชัดเจน', chooseFile: 'แนบสมุดบัญชี / Bank Certificate', changeFile: 'เปลี่ยนเอกสาร',
    saveDraft: 'บันทึกแบบร่าง', submit: 'ส่งตรวจสอบบัญชีนี้', resubmit: 'ส่งตรวจใหม่', saved: 'บันทึกแบบร่างแล้ว · ข้อมูลยังไม่ถูกส่งให้ Admin Review', submitted: 'ส่งตรวจสอบแล้ว · บัญชีนี้ถูกส่งเข้า Admin Review',
    draft: 'แบบร่าง', draftDetail: 'กรอกข้อมูลและส่งให้ Melo ตรวจสอบก่อนใช้ถอนเงิน', pending: 'รอตรวจสอบ', pendingDetail: 'ข้อมูลถูกส่งให้ Admin Review แล้ว ระหว่างนี้ยังแก้ไขไม่ได้', revision: 'ต้องแก้ไข', revisionDetail: 'Admin ขอข้อมูลเพิ่มเติม แก้ไขแล้วส่งตรวจใหม่ได้', approved: 'อนุมัติแล้ว', approvedDetail: 'บัญชีนี้ผ่านการตรวจสอบของ Melo และเลือกใช้ตอนถอนเงินได้', rejected: 'ไม่อนุมัติ', rejectedDetail: 'แก้ไขข้อมูลบัญชีนี้แล้วส่งตรวจใหม่ได้', adminNote: 'หมายเหตุจาก Admin',
    stripe: 'Stripe Connect', stripeHint: 'เปิดได้เมื่อมีบัญชีรับเงินอย่างน้อย 1 บัญชีที่ Melo อนุมัติ', stripeNotStarted: 'ยังไม่ได้ตั้งค่า', stripePending: 'กำลังตั้งค่า', stripeRestricted: 'ต้องแก้ไขข้อมูล', stripeReady: 'พร้อมรับเงิน', setupStripe: 'ตั้งค่ารับเงินกับ Stripe', updateStripe: 'อัปเดตข้อมูล Stripe', openStripeDashboard: 'เปิด Stripe Express Dashboard', opening: 'กำลังเปิด...', stripeRule: 'หากต้องการเลือกบัญชีใดตอนถอนเงินจริง บัญชีนั้นต้อง Approved ใน Melo และต้องเป็นบัญชีธนาคารที่เชื่อมอยู่ใน Stripe Express ด้วย ระบบจะจับคู่จากบัญชีปลายทางก่อนส่งเงิน',
    privacy: 'ความเป็นส่วนตัว', privacyBody: 'เพิ่มบัญชีรับเงินได้สูงสุด 3 บัญชีต่อร้าน เลขบัญชีเต็มและหลักฐานไม่แสดงในหน้าร้านสาธารณะ และ Staff/Admin ของร้านไม่มีสิทธิ์เข้าถึง ส่วนประวัติถอนเงินจะแสดงเฉพาะเลขท้าย 4 หลักของบัญชีปลายทาง',
    bankPicker: 'เลือกธนาคารในประเทศไทย', bankPickerHint: 'เลือกธนาคารสำหรับบัญชีรับเงินของร้าน', searchBank: 'ค้นหาธนาคาร', close: 'ปิด', loading: 'กำลังโหลด…', uploading: 'กำลังอัปโหลด…', required: 'กรอกประเทศ ธนาคาร สกุลเงิน ชื่อบัญชี เลขบัญชี และแนบหลักฐานบัญชีธนาคารให้ครบก่อนส่งตรวจ', limit: 'เพิ่มบัญชีรับเงินได้สูงสุด 3 บัญชีต่อร้าน',
  },
  en: {
    eyebrow: 'MELO PARTNER', title: 'Payout information', subtitle: 'Verify bank accounts, review payout status, and configure real payouts for your store.',
    noStore: 'No active store', noStoreHint: 'Select or create a Business Account before configuring payout information.', ownerOnly: 'Owner only', ownerOnlyHint: 'Bank account and payout documents are private owner information. Store admins and staff cannot access or edit this section.',
    accounts: 'Store payout accounts', accountCount: (count) => `${count}/${MAX_PAYOUT_ACCOUNTS} accounts · each account is reviewed separately`, add: '＋ Add account', empty: 'No payout account yet. Complete the first account below.', defaultAccount: 'Default', setDefault: 'Set as default', deleteAccount: 'Delete account', deleteConfirm: 'Delete this payout account from the store?',
    newAccount: 'Add payout account', newAccountDetail: 'A new account is counted after you save its draft.', detailTitle: 'Payout account details', detailHint: 'The account holder should match the person or legal entity on the Business Account. Use a bank document that clearly shows the name and account number.',
    country: 'Account country', currency: 'Currency', bank: 'Bank', selectBank: 'Select bank', bankName: 'Bank name', holder: 'Account holder name', holderPh: 'Name on the bank account', account: 'Account number / IBAN', accountPh: 'Account number for receiving payouts', certificate: 'Bank account proof', certificateHint: 'Attach a bank book / Bank Certificate that clearly shows the name and account number.', chooseFile: 'Attach bank book / Bank Certificate', changeFile: 'Change document',
    saveDraft: 'Save draft', submit: 'Submit this account', resubmit: 'Resubmit for review', saved: 'Draft saved · it has not been sent to Admin Review yet.', submitted: 'Submitted · this account is now in Admin Review.', draft: 'Draft', draftDetail: 'Complete the information and submit it to Melo before using it for withdrawals.', pending: 'Under review', pendingDetail: 'The information is in Admin Review and cannot be edited for now.', revision: 'Changes required', revisionDetail: 'Admin requested more information. Edit it and resubmit.', approved: 'Approved', approvedDetail: 'Melo has approved this account and it can be selected for withdrawals.', rejected: 'Not approved', rejectedDetail: 'Edit this account and submit it for review again.', adminNote: 'Admin note',
    stripe: 'Stripe Connect', stripeHint: 'Available after at least one payout account is approved by Melo.', stripeNotStarted: 'Not set up', stripePending: 'Setting up', stripeRestricted: 'Action required', stripeReady: 'Ready for payouts', setupStripe: 'Set up payouts with Stripe', updateStripe: 'Update Stripe information', openStripeDashboard: 'Open Stripe Express Dashboard', opening: 'Opening...', stripeRule: 'To withdraw to an account, it must be approved in Melo and also connected in Stripe Express. The system matches the destination bank account before sending funds.',
    privacy: 'Privacy', privacyBody: 'Each store can keep up to 3 payout accounts. Full account numbers and documents are never shown on the public store page, and store staff/admins cannot access them. Withdrawal history shows only the last 4 digits.',
    bankPicker: 'Select a bank in Thailand', bankPickerHint: 'Choose the bank for this store payout account.', searchBank: 'Search banks', close: 'Close', loading: 'Loading…', uploading: 'Uploading…', required: 'Complete country, bank, currency, account holder, account number, and bank proof before submitting.', limit: 'You can add up to 3 payout accounts per store.',
  },
  de: {
    eyebrow: 'MELO PARTNER', title: 'Auszahlungsdaten', subtitle: 'Bankkonten verifizieren, Payout-Status prüfen und echte Auszahlungen für den Store einrichten.',
    noStore: 'Kein aktiver Store', noStoreHint: 'Wähle oder erstelle zuerst ein Business-Konto.', ownerOnly: 'Nur für Owner', ownerOnlyHint: 'Bankdaten und Payout-Dokumente sind private Owner-Daten. Store-Admins und Mitarbeiter können diesen Bereich nicht öffnen oder bearbeiten.',
    accounts: 'Auszahlungskonten des Stores', accountCount: (count) => `${count}/${MAX_PAYOUT_ACCOUNTS} Konten · jedes Konto wird separat geprüft`, add: '＋ Konto hinzufügen', empty: 'Noch kein Auszahlungskonto. Fülle unten das erste Konto aus.', defaultAccount: 'Hauptkonto', setDefault: 'Als Hauptkonto festlegen', deleteAccount: 'Konto löschen', deleteConfirm: 'Dieses Auszahlungskonto aus dem Store löschen?',
    newAccount: 'Auszahlungskonto hinzufügen', newAccountDetail: 'Ein neues Konto wird nach dem Speichern des Entwurfs gezählt.', detailTitle: 'Details des Auszahlungskontos', detailHint: 'Der Kontoinhaber sollte zur Person oder juristischen Einheit des Business-Kontos passen. Verwende einen Banknachweis mit gut lesbarem Namen und Kontonummer.',
    country: 'Kontoland', currency: 'Währung', bank: 'Bank', selectBank: 'Bank auswählen', bankName: 'Bankname', holder: 'Kontoinhaber', holderPh: 'Name auf dem Bankkonto', account: 'Kontonummer / IBAN', accountPh: 'Kontonummer für Auszahlungen', certificate: 'Banknachweis', certificateHint: 'Bankbuch / Bank Certificate mit gut sichtbarem Namen und Kontonummer anhängen.', chooseFile: 'Banknachweis anhängen', changeFile: 'Dokument ändern',
    saveDraft: 'Entwurf speichern', submit: 'Konto zur Prüfung senden', resubmit: 'Erneut zur Prüfung senden', saved: 'Entwurf gespeichert · noch nicht an Admin Review gesendet.', submitted: 'Gesendet · dieses Konto befindet sich jetzt in Admin Review.', draft: 'Entwurf', draftDetail: 'Daten vervollständigen und vor einer Auszahlung von Melo prüfen lassen.', pending: 'In Prüfung', pendingDetail: 'Die Daten werden geprüft und können vorübergehend nicht bearbeitet werden.', revision: 'Änderungen nötig', revisionDetail: 'Admin benötigt weitere Angaben. Bearbeiten und erneut senden.', approved: 'Genehmigt', approvedDetail: 'Melo hat dieses Konto genehmigt; es kann für Auszahlungen gewählt werden.', rejected: 'Nicht genehmigt', rejectedDetail: 'Daten korrigieren und erneut zur Prüfung senden.', adminNote: 'Admin-Hinweis',
    stripe: 'Stripe Connect', stripeHint: 'Verfügbar, sobald mindestens ein Auszahlungskonto von Melo genehmigt wurde.', stripeNotStarted: 'Nicht eingerichtet', stripePending: 'Einrichtung läuft', stripeRestricted: 'Angaben erforderlich', stripeReady: 'Auszahlungsbereit', setupStripe: 'Stripe-Auszahlungen einrichten', updateStripe: 'Stripe-Daten aktualisieren', openStripeDashboard: 'Stripe Express Dashboard öffnen', opening: 'Wird geöffnet...', stripeRule: 'Für eine Auszahlung muss das Zielkonto in Melo genehmigt und auch in Stripe Express verbunden sein. Das System gleicht das Zielkonto vor der Auszahlung ab.',
    privacy: 'Datenschutz', privacyBody: 'Pro Store sind bis zu 3 Auszahlungskonten möglich. Vollständige Kontonummern und Nachweise erscheinen nie öffentlich; Store-Mitarbeiter und Admins haben keinen Zugriff. Im Auszahlungsverlauf werden nur die letzten 4 Ziffern angezeigt.',
    bankPicker: 'Bank in Thailand auswählen', bankPickerHint: 'Bank für dieses Auszahlungskonto auswählen.', searchBank: 'Bank suchen', close: 'Schließen', loading: 'Wird geladen…', uploading: 'Wird hochgeladen…', required: 'Bitte Land, Bank, Währung, Kontoinhaber, Kontonummer und Banknachweis vollständig angeben.', limit: 'Maximal 3 Auszahlungskonten pro Store.',
  },
  zh: {
    eyebrow: 'MELO PARTNER', title: '收款信息', subtitle: '验证银行账户、查看 Payout 状态并设置店铺实际收款。',
    noStore: '暂无正在使用的店铺', noStoreHint: '请先选择或创建 Business Account，再设置收款信息。', ownerOnly: '仅限 Owner', ownerOnlyHint: '银行账户和 Payout 文件属于店主私密信息，店铺 Admin/Staff 无法访问或编辑此区域。',
    accounts: '店铺收款账户', accountCount: (count) => `${count}/${MAX_PAYOUT_ACCOUNTS} 个账户 · 每个账户单独审核`, add: '＋ 添加账户', empty: '暂无收款账户，可在下方填写第一个账户。', defaultAccount: '主要账户', setDefault: '设为主要账户', deleteAccount: '删除账户', deleteConfirm: '确定从店铺删除此收款账户吗？',
    newAccount: '添加收款账户', newAccountDetail: '保存草稿后，新账户才会计入数量。', detailTitle: '收款账户详情', detailHint: '账户持有人应与 Business Account 中的个人或法人一致，并上传可清楚看到姓名和账号的银行证明。',
    country: '账户国家/地区', currency: '币种', bank: '银行', selectBank: '选择银行', bankName: '银行名称', holder: '账户持有人姓名', holderPh: '银行账户上的姓名', account: '账号 / IBAN', accountPh: '用于收款的账号', certificate: '银行账户证明', certificateHint: '上传可清楚显示姓名和账号的存折 / Bank Certificate。', chooseFile: '上传存折 / Bank Certificate', changeFile: '更换文件',
    saveDraft: '保存草稿', submit: '提交此账户审核', resubmit: '重新提交审核', saved: '草稿已保存 · 尚未提交 Admin Review。', submitted: '已提交 · 此账户已进入 Admin Review。', draft: '草稿', draftDetail: '完成信息并提交 Melo 审核后才能用于提现。', pending: '等待审核', pendingDetail: '信息已提交 Admin Review，期间暂时不能编辑。', revision: '需要修改', revisionDetail: 'Admin 要求补充信息，请修改后重新提交。', approved: '已批准', approvedDetail: 'Melo 已审核通过，可在提现时选择此账户。', rejected: '未批准', rejectedDetail: '修改账户信息后可重新提交审核。', adminNote: 'Admin 备注',
    stripe: 'Stripe Connect', stripeHint: '至少有一个收款账户通过 Melo 审核后才能启用。', stripeNotStarted: '尚未设置', stripePending: '设置中', stripeRestricted: '需要补充信息', stripeReady: '可收款', setupStripe: '设置 Stripe 收款', updateStripe: '更新 Stripe 信息', openStripeDashboard: '打开 Stripe Express Dashboard', opening: '正在打开...', stripeRule: '实际提现时，目标账户必须已在 Melo 获批，并且也已连接到 Stripe Express。系统会在付款前匹配目标银行账户。',
    privacy: '隐私', privacyBody: '每家店最多可添加 3 个收款账户。完整账号和证明文件不会显示在公开店铺页面，店铺 Staff/Admin 也无权访问。提现记录只显示目标账户末 4 位。',
    bankPicker: '选择泰国银行', bankPickerHint: '选择此店铺收款账户使用的银行。', searchBank: '搜索银行', close: '关闭', loading: '正在加载…', uploading: '正在上传…', required: '请完整填写国家/地区、银行、币种、账户持有人、账号并上传银行证明。', limit: '每家店最多可添加 3 个收款账户。',
  },
  ja: {
    eyebrow: 'MELO PARTNER', title: '入金情報', subtitle: '銀行口座の確認、Payout ステータス、店舗の実際の入金設定を管理します。',
    noStore: '使用中の店舗がありません', noStoreHint: '入金情報を設定する前に Business Account を選択または作成してください。', ownerOnly: 'Owner のみ', ownerOnlyHint: '銀行口座と Payout 書類は店舗オーナーの個人情報です。店舗の Admin/Staff はこのセクションを閲覧・編集できません。',
    accounts: '店舗の入金口座', accountCount: (count) => `${count}/${MAX_PAYOUT_ACCOUNTS} 口座 · 各口座は個別に審査されます`, add: '＋ 口座を追加', empty: '入金口座がありません。下で最初の口座を入力できます。', defaultAccount: 'メイン口座', setDefault: 'メイン口座に設定', deleteAccount: '口座を削除', deleteConfirm: 'この入金口座を店舗から削除しますか？',
    newAccount: '入金口座を追加', newAccountDetail: '下書きを保存すると新しい口座としてカウントされます。', detailTitle: '入金口座の詳細', detailHint: '口座名義は Business Account の個人または法人と一致させ、氏名と口座番号が明確に見える銀行書類を使用してください。',
    country: '口座の国', currency: '通貨', bank: '銀行', selectBank: '銀行を選択', bankName: '銀行名', holder: '口座名義', holderPh: '銀行口座の名義', account: '口座番号 / IBAN', accountPh: '入金を受け取る口座番号', certificate: '銀行口座の証明', certificateHint: '氏名と口座番号が明確に見える通帳 / Bank Certificate を添付してください。', chooseFile: '通帳 / Bank Certificate を添付', changeFile: '書類を変更',
    saveDraft: '下書きを保存', submit: 'この口座を審査に提出', resubmit: '再審査を申請', saved: '下書きを保存しました · Admin Review にはまだ送信されていません。', submitted: '提出しました · この口座は Admin Review に送信されました。', draft: '下書き', draftDetail: '出金に使用する前に情報を完成させ Melo の審査へ提出してください。', pending: '審査待ち', pendingDetail: 'Admin Review に提出済みのため、審査中は編集できません。', revision: '修正が必要', revisionDetail: 'Admin から追加情報を求められています。修正して再提出できます。', approved: '承認済み', approvedDetail: 'Melo の審査に通過し、出金先として選択できます。', rejected: '未承認', rejectedDetail: '口座情報を修正して再度審査に提出できます。', adminNote: 'Admin からのメモ',
    stripe: 'Stripe Connect', stripeHint: 'Melo が少なくとも 1 つの入金口座を承認すると利用できます。', stripeNotStarted: '未設定', stripePending: '設定中', stripeRestricted: '情報の修正が必要', stripeReady: '入金可能', setupStripe: 'Stripe 入金を設定', updateStripe: 'Stripe 情報を更新', openStripeDashboard: 'Stripe Express Dashboard を開く', opening: '開いています...', stripeRule: '実際の出金先として使う口座は Melo で承認済みで、Stripe Express にも接続されている必要があります。送金前に宛先口座を照合します。',
    privacy: 'プライバシー', privacyBody: '1店舗につき最大3口座まで登録できます。完全な口座番号と証明書類は公開店舗ページに表示されず、店舗の Staff/Admin もアクセスできません。出金履歴には末尾4桁のみ表示されます。',
    bankPicker: 'タイの銀行を選択', bankPickerHint: '店舗の入金口座に使用する銀行を選択します。', searchBank: '銀行を検索', close: '閉じる', loading: '読み込み中…', uploading: 'アップロード中…', required: '国、銀行、通貨、口座名義、口座番号、銀行証明をすべて入力してください。', limit: '1店舗につき最大3口座まで追加できます。',
  },
  ko: {
    eyebrow: 'MELO PARTNER', title: '정산 정보', subtitle: '은행 계좌 인증, Payout 상태와 매장의 실제 지급 설정을 관리합니다.',
    noStore: '사용 중인 매장이 없습니다', noStoreHint: '정산 정보를 설정하기 전에 Business Account를 선택하거나 생성하세요.', ownerOnly: 'Owner 전용', ownerOnlyHint: '은행 계좌와 Payout 문서는 매장 소유자의 개인정보입니다. 매장 Admin/Staff는 이 영역을 열거나 수정할 수 없습니다.',
    accounts: '매장 정산 계좌', accountCount: (count) => `${count}/${MAX_PAYOUT_ACCOUNTS}개 계좌 · 각 계좌는 별도로 검토됩니다`, add: '＋ 계좌 추가', empty: '정산 계좌가 없습니다. 아래에서 첫 계좌를 입력하세요.', defaultAccount: '기본 계좌', setDefault: '기본 계좌로 설정', deleteAccount: '계좌 삭제', deleteConfirm: '이 정산 계좌를 매장에서 삭제할까요?',
    newAccount: '정산 계좌 추가', newAccountDetail: '임시 저장하면 새 계좌로 집계됩니다.', detailTitle: '정산 계좌 상세', detailHint: '예금주는 Business Account의 개인 또는 법인과 일치해야 하며, 이름과 계좌번호가 명확히 보이는 은행 증빙을 사용하세요.',
    country: '계좌 국가', currency: '통화', bank: '은행', selectBank: '은행 선택', bankName: '은행명', holder: '예금주', holderPh: '은행 계좌의 예금주명', account: '계좌번호 / IBAN', accountPh: '지급받을 계좌번호', certificate: '은행 계좌 증빙', certificateHint: '이름과 계좌번호가 명확히 보이는 통장 / Bank Certificate를 첨부하세요.', chooseFile: '통장 / Bank Certificate 첨부', changeFile: '문서 변경',
    saveDraft: '임시 저장', submit: '이 계좌 검토 요청', resubmit: '재검토 요청', saved: '임시 저장했습니다 · 아직 Admin Review로 전송되지 않았습니다.', submitted: '제출했습니다 · 이 계좌가 Admin Review로 전송되었습니다.', draft: '임시 저장', draftDetail: '출금에 사용하기 전에 정보를 완료하고 Melo 검토를 받아야 합니다.', pending: '검토 대기', pendingDetail: 'Admin Review에 제출되어 현재 수정할 수 없습니다.', revision: '수정 필요', revisionDetail: 'Admin이 추가 정보를 요청했습니다. 수정 후 다시 제출할 수 있습니다.', approved: '승인됨', approvedDetail: 'Melo 검토를 통과했으며 출금 계좌로 선택할 수 있습니다.', rejected: '승인되지 않음', rejectedDetail: '계좌 정보를 수정하고 다시 검토 요청할 수 있습니다.', adminNote: 'Admin 메모',
    stripe: 'Stripe Connect', stripeHint: 'Melo에서 최소 1개의 정산 계좌가 승인된 후 사용할 수 있습니다.', stripeNotStarted: '설정되지 않음', stripePending: '설정 중', stripeRestricted: '정보 수정 필요', stripeReady: '지급 준비 완료', setupStripe: 'Stripe 지급 설정', updateStripe: 'Stripe 정보 업데이트', openStripeDashboard: 'Stripe Express Dashboard 열기', opening: '여는 중...', stripeRule: '실제 출금에 사용할 계좌는 Melo에서 승인되어야 하며 Stripe Express에도 연결되어 있어야 합니다. 시스템은 지급 전에 대상 은행 계좌를 매칭합니다.',
    privacy: '개인정보 보호', privacyBody: '매장당 최대 3개의 정산 계좌를 추가할 수 있습니다. 전체 계좌번호와 증빙은 공개 매장 페이지에 표시되지 않으며 매장 Staff/Admin도 접근할 수 없습니다. 출금 내역에는 마지막 4자리만 표시됩니다.',
    bankPicker: '태국 은행 선택', bankPickerHint: '매장 정산 계좌에 사용할 은행을 선택하세요.', searchBank: '은행 검색', close: '닫기', loading: '불러오는 중…', uploading: '업로드 중…', required: '국가, 은행, 통화, 예금주, 계좌번호, 은행 증빙을 모두 입력하세요.', limit: '매장당 최대 3개의 정산 계좌를 추가할 수 있습니다.',
  },
};

function firstRow(data: unknown): Row | null {
  if (Array.isArray(data)) return (data[0] as Row | undefined) ?? null;
  return data && typeof data === 'object' ? data as Row : null;
}

function rows(data: unknown): Row[] {
  if (Array.isArray(data)) return data as Row[];
  return data && typeof data === 'object' ? [data as Row] : [];
}

function text(row: Row | null | undefined, key: string, fallback = '') {
  const value = row?.[key];
  return value == null ? fallback : String(value);
}

function bool(row: Row | null | undefined, key: string) {
  const value = row?.[key];
  return value === true || value === 1 || value === '1' || String(value).toLowerCase() === 'true';
}

function friendlyError(raw: string, locale: Locale) {
  const value = raw || 'Request failed';
  const th: Record<string, string> = {
    PAYOUT_ACCOUNT_LIMIT_REACHED: `เพิ่มบัญชีรับเงินได้สูงสุด ${MAX_PAYOUT_ACCOUNTS} บัญชีต่อร้าน`,
    PAYOUT_ACCOUNT_ALREADY_EXISTS: 'บัญชีธนาคารนี้ถูกเพิ่มไว้แล้ว',
    PAYOUT_VERIFICATION_LOCKED: 'บัญชีนี้อยู่ระหว่างตรวจหรืออนุมัติแล้ว จึงแก้ไขข้อมูลไม่ได้',
    PAYOUT_VERIFICATION_INCOMPLETE: 'กรอกข้อมูลบัญชีและแนบหลักฐานให้ครบก่อนส่งตรวจ',
    PAYOUT_ACCOUNT_DELETE_LOCKED: 'บัญชีที่รอตรวจหรืออนุมัติแล้วไม่สามารถลบจากหน้านี้ได้',
    APPROVED_PAYOUT_ACCOUNT_REQUIRED: 'เลือกบัญชีรับเงินที่ผ่านการอนุมัติแล้ว',
    PAYOUT_ACCOUNT_NOT_FOUND: 'ไม่พบบัญชีรับเงินนี้ หรือคุณไม่มีสิทธิ์เข้าถึง',
  };
  for (const [code, message] of Object.entries(th)) {
    if (value.includes(code)) return locale === 'th' ? message : value;
  }
  if (value.toLowerCase().includes('could not find the function') || value.toLowerCase().includes('schema cache')) {
    return locale === 'th' ? 'กรุณารันไฟล์ Deploy ของระบบบัญชีรับเงินหลายบัญชีก่อนใช้งาน' : value;
  }
  return value;
}

function normalizeStatus(value: unknown): VerificationStatus {
  const raw = String(value ?? 'draft');
  return ['draft', 'pending', 'revision_required', 'approved', 'rejected'].includes(raw)
    ? raw as VerificationStatus
    : 'draft';
}

function mapAccount(row: Row): PayoutAccount | null {
  const id = text(row, 'id') || text(row, 'account_id');
  const businessId = text(row, 'business_id');
  if (!id || !businessId) return null;
  return {
    id,
    businessId,
    businessName: text(row, 'business_name'),
    legalName: text(row, 'legal_name'),
    country: text(row, 'bank_country'),
    currency: text(row, 'currency', 'THB').toUpperCase(),
    bankName: text(row, 'bank_name'),
    holder: text(row, 'account_holder_name'),
    accountNumber: text(row, 'account_number'),
    certificatePath: text(row, 'document_path'),
    status: normalizeStatus(row.status),
    isDefault: bool(row, 'is_default'),
    submittedAt: text(row, 'submitted_at'),
    reviewedAt: text(row, 'reviewed_at'),
    reviewerNotes: text(row, 'reviewer_notes'),
    updatedAt: text(row, 'updated_at'),
  };
}

function normalizeDocumentPath(value: string) {
  const clean = value.trim().replace(/^\/+/, '');
  return clean.startsWith(`${PAYOUT_BUCKET}/`) ? clean.slice(PAYOUT_BUCKET.length + 1) : clean;
}

async function loadAccounts(businessId: string, locale: Locale) {
  const result = await rpcRequest<Row[]>('get_my_partner_payout_accounts', { p_business_id: businessId });
  if (result.error) throw new Error(friendlyError(result.error, locale));
  return rows(result.data).map(mapAccount).filter((item): item is PayoutAccount => Boolean(item));
}

async function saveAccount(
  businessId: string,
  business: BusinessMeta,
  form: FormState,
  locale: Locale,
) {
  const result = await rpcRequest<Row | Row[]>('save_my_partner_payout_account', {
    p_business_id: businessId,
    p_account_id: form.id || null,
    p_business_name: business.displayName.trim(),
    p_legal_name: business.legalName.trim(),
    p_bank_country: form.country.trim(),
    p_currency: form.currency.trim().toUpperCase(),
    p_bank_name: form.bankName.trim(),
    p_account_holder_name: form.holder.trim(),
    p_account_number: form.accountNumber.trim(),
    p_document_path: form.certificatePath ? normalizeDocumentPath(form.certificatePath) : null,
  });
  if (result.error) throw new Error(friendlyError(result.error, locale));
  const mapped = mapAccount(firstRow(result.data) ?? {});
  if (!mapped) throw new Error(locale === 'th' ? 'บันทึกข้อมูลรับเงินไม่สำเร็จ' : 'Unable to save payout information.');
  return mapped;
}

async function submitAccount(accountId: string, locale: Locale) {
  const result = await rpcRequest<Row | Row[]>('submit_my_partner_payout_account', { p_account_id: accountId });
  if (result.error) throw new Error(friendlyError(result.error, locale));
  const mapped = mapAccount(firstRow(result.data) ?? {});
  if (!mapped) throw new Error(locale === 'th' ? 'ส่งตรวจข้อมูลรับเงินไม่สำเร็จ' : 'Unable to submit payout information.');
  return mapped;
}

function maskAccount(value: string) {
  const compact = value.replace(/\s+/g, '');
  if (!compact) return '—';
  return `•••• •••• ${compact.slice(-4)}`;
}

function isThailand(value: string) {
  return ['thailand', 'thai', 'th', 'ประเทศไทย', 'ไทย'].includes(value.trim().toLowerCase());
}

function statusCopy(status: VerificationStatus, t: Copy) {
  if (status === 'approved') return { label: t.approved, detail: t.approvedDetail, tone: 'approved' };
  if (status === 'pending') return { label: t.pending, detail: t.pendingDetail, tone: 'pending' };
  if (status === 'revision_required') return { label: t.revision, detail: t.revisionDetail, tone: 'revision' };
  if (status === 'rejected') return { label: t.rejected, detail: t.rejectedDetail, tone: 'rejected' };
  return { label: t.draft, detail: t.draftDetail, tone: 'draft' };
}

function stripeCopy(status: StripeOnboardingStatus, t: Copy) {
  if (status === 'ready') return { label: t.stripeReady, tone: 'approved' };
  if (status === 'restricted') return { label: t.stripeRestricted, tone: 'revision' };
  if (status === 'pending') return { label: t.stripePending, tone: 'pending' };
  return { label: t.stripeNotStarted, tone: 'draft' };
}

const EMPTY: FormState = {
  id: '', country: 'Thailand', currency: 'THB', bankName: '', holder: '', accountNumber: '', certificatePath: '', certificateName: '',
};

export default function PartnerPayoutExperience() {
  const { locale: rawLocale } = useLocale();
  const locale = (rawLocale in COPY ? rawLocale : 'en') as Locale;
  const t = COPY[locale];
  const fileRef = useRef<HTMLInputElement>(null);

  const [access, setAccess] = useState<PartnerBusinessAccess | null>(null);
  const [business, setBusiness] = useState<BusinessMeta>({ displayName: '', legalName: '', country: 'Thailand' });
  const [accounts, setAccounts] = useState<PayoutAccount[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [documentUrl, setDocumentUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [bankPicker, setBankPicker] = useState(false);
  const [bankSearch, setBankSearch] = useState('');
  const [stripeStatus, setStripeStatus] = useState<StripeStatus | null>(null);
  const [stripeBusy, setStripeBusy] = useState(false);

  const selectedAccount = useMemo(
    () => accounts.find((item) => item.id === form.id) ?? null,
    [accounts, form.id],
  );
  const editable = !selectedAccount || ['draft', 'revision_required', 'rejected'].includes(selectedAccount.status);
  const approved = accounts.some((item) => item.status === 'approved');
  const selectedState = selectedAccount ? statusCopy(selectedAccount.status, t) : null;
  const provider = stripeCopy(stripeStatus?.onboardingStatus ?? 'not_started', t);

  const setFormFromAccount = useCallback(async (
    account: PayoutAccount | null,
    nextBusiness: BusinessMeta,
    nextAccess: PartnerBusinessAccess | null,
  ) => {
    const next: FormState = account ? {
      id: account.id,
      country: account.country || nextBusiness.country || 'Thailand',
      currency: account.currency || 'THB',
      bankName: account.bankName,
      holder: account.holder,
      accountNumber: account.accountNumber,
      certificatePath: account.certificatePath,
      certificateName: account.certificatePath.split('/').pop() || '',
    } : {
      ...EMPTY,
      country: nextBusiness.country || 'Thailand',
      holder: nextBusiness.legalName || nextAccess?.displayName || '',
    };
    setForm(next);
    setMessage('');
    setError('');
    if (account?.certificatePath) {
      const signed = await createSignedStorageUrl(PAYOUT_BUCKET, normalizeDocumentPath(account.certificatePath), 3600);
      setDocumentUrl(signed.error ? '' : signed.data || '');
    } else {
      setDocumentUrl('');
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const current = await getActivePartnerBusiness();
      setAccess(current);
      if (!current) {
        setAccounts([]);
        setForm(EMPTY);
        setStripeStatus(null);
        return;
      }

      const rawBusiness = await getPartnerBusiness(current.businessId).catch(() => null);
      const nextBusiness: BusinessMeta = {
        displayName: text(rawBusiness, 'display_name', current.displayName),
        legalName: text(rawBusiness, 'legal_name'),
        country: text(rawBusiness, 'country', 'Thailand'),
      };
      setBusiness(nextBusiness);

      if (!current.isOwner) {
        setAccounts([]);
        setForm(EMPTY);
        setStripeStatus(null);
        return;
      }

      const list = await loadAccounts(current.businessId, locale);
      setAccounts(list);
      const target = list.find((item) => item.status === 'approved' && item.isDefault)
        ?? list.find((item) => item.status === 'approved')
        ?? list.find((item) => item.isDefault)
        ?? list[0]
        ?? null;
      await setFormFromAccount(target, nextBusiness, current);

      if (list.some((item) => item.status === 'approved')) {
        const statusResult = await invokeEdgeFunction<Record<string, unknown>>('partner-connect-status', { businessId: current.businessId });
        if (!statusResult.error && statusResult.data?.success) {
          const data = statusResult.data;
          setStripeStatus({
            stripeAccountId: data.stripeAccountId ? String(data.stripeAccountId) : null,
            onboardingStatus: ['not_started', 'pending', 'restricted', 'ready'].includes(String(data.onboardingStatus))
              ? String(data.onboardingStatus) as StripeOnboardingStatus
              : 'not_started',
            detailsSubmitted: Boolean(data.detailsSubmitted),
            transfersEnabled: Boolean(data.transfersEnabled),
            payoutsEnabled: Boolean(data.payoutsEnabled),
            chargesEnabled: Boolean(data.chargesEnabled),
            requirementCount: Number(data.requirementCount ?? 0),
            lastError: data.lastError ? String(data.lastError) : null,
          });
        } else {
          setStripeStatus(null);
        }
      } else {
        setStripeStatus(null);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  }, [locale, setFormFromAccount]);

  useEffect(() => { void load(); }, [load]);

  const filteredBanks = useMemo(() => {
    const q = bankSearch.trim().toLowerCase();
    return q ? BANKS.filter((item) => item.join(' ').toLowerCase().includes(q)) : BANKS;
  }, [bankSearch]);

  async function chooseAccount(account: PayoutAccount) {
    await setFormFromAccount(account, business, access);
  }

  async function addAccount() {
    if (!access?.isOwner) return;
    if (accounts.length >= MAX_PAYOUT_ACCOUNTS) {
      setError(t.limit);
      return;
    }
    await setFormFromAccount(null, business, access);
  }

  async function upload(file: File) {
    if (!access?.isOwner || !editable || uploading) return;
    setUploading(true);
    setError('');
    try {
      const ext = (file.name.split('.').pop() || 'jpg').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'jpg';
      const path = `${access.businessId}/bank-${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
      const result = await uploadStorageObject(PAYOUT_BUCKET, path, file, file.type);
      if (result.error) throw new Error(result.error);
      setForm((current) => ({ ...current, certificatePath: path, certificateName: file.name }));
      const signed = await createSignedStorageUrl(PAYOUT_BUCKET, path, 3600);
      setDocumentUrl(signed.error ? URL.createObjectURL(file) : signed.data || URL.createObjectURL(file));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setUploading(false);
    }
  }

  function validateForSubmit() {
    return Boolean(
      form.country.trim()
      && form.currency.trim()
      && form.bankName.trim()
      && form.holder.trim()
      && form.accountNumber.trim().length >= 4
      && form.certificatePath.trim(),
    );
  }

  async function saveDraft(showSuccess = true) {
    if (!access?.isOwner || !editable || busy) return null;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const row = await saveAccount(access.businessId, business, form, locale);
      setAccounts((current) => current.some((item) => item.id === row.id)
        ? current.map((item) => item.id === row.id ? row : item)
        : [...current, row]);
      setForm((current) => ({ ...current, id: row.id }));
      if (showSuccess) setMessage(t.saved);
      return row;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!access?.isOwner || !editable || busy) return;
    if (!validateForSubmit()) {
      setError(t.required);
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const draft = await saveAccount(access.businessId, business, form, locale);
      const row = await submitAccount(draft.id, locale);
      setAccounts((current) => current.some((item) => item.id === row.id)
        ? current.map((item) => item.id === row.id ? row : item)
        : [...current, row]);
      setForm((current) => ({ ...current, id: row.id }));
      setMessage(t.submitted);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  async function makeDefault(account: PayoutAccount) {
    if (!access?.isOwner || account.status !== 'approved' || account.isDefault || busy) return;
    setBusy(true);
    setError('');
    try {
      const result = await rpcRequest('set_my_partner_default_payout_account', { p_account_id: account.id });
      if (result.error) throw new Error(friendlyError(result.error, locale));
      setAccounts((current) => current.map((item) => ({ ...item, isDefault: item.id === account.id })));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  async function removeAccount(account: PayoutAccount) {
    if (!access?.isOwner || !['draft', 'revision_required', 'rejected'].includes(account.status) || busy) return;
    if (!window.confirm(t.deleteConfirm)) return;
    setBusy(true);
    setError('');
    try {
      const result = await rpcRequest('delete_my_partner_payout_account', { p_account_id: account.id });
      if (result.error) throw new Error(friendlyError(result.error, locale));
      const next = accounts.filter((item) => item.id !== account.id);
      setAccounts(next);
      const target = next.find((item) => item.status === 'approved' && item.isDefault)
        ?? next.find((item) => item.isDefault)
        ?? next[0]
        ?? null;
      await setFormFromAccount(target, business, access);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  async function startStripe() {
    if (!access?.isOwner || !approved || stripeBusy) return;
    setStripeBusy(true);
    setError('');
    try {
      const response = await invokeEdgeFunction<Record<string, unknown>>('partner-connect-onboarding', {
        businessId: access.businessId,
        return_url: window.location.href,
        refresh_url: window.location.href,
      });
      if (response.error) throw new Error(response.error);
      const data = response.data || {};
      if (data.success === false) throw new Error(String(data.error || 'Unable to open payout setup.'));
      const url = String(data.url || '');
      if (!url) throw new Error(locale === 'th' ? 'ไม่พบลิงก์ตั้งค่ารับเงิน' : 'Payout setup link was not returned.');
      window.location.assign(url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setStripeBusy(false);
    }
  }

  async function openStripeDashboard() {
    if (!access?.isOwner || !approved || stripeBusy) return;
    setStripeBusy(true);
    setError('');
    try {
      const response = await invokeEdgeFunction<Record<string, unknown>>('partner-connect-dashboard', { businessId: access.businessId });
      if (response.error) throw new Error(response.error);
      const data = response.data || {};
      if (data.success === false) throw new Error(String(data.error || 'Unable to open Stripe Dashboard.'));
      const url = String(data.url || '');
      if (!url) throw new Error(locale === 'th' ? 'ไม่พบลิงก์ Stripe Dashboard' : 'Stripe Dashboard link was not returned.');
      window.location.assign(url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setStripeBusy(false);
    }
  }

  if (loading) {
    return <main className={styles.partnerPage}><div className={styles.loading}>{t.loading}</div></main>;
  }

  return (
    <main className={styles.partnerPage}>
      <PartnerModeHeader access={access} onBusinessChanged={() => void load()} />
      <section className={styles.partnerShell}>
        <header className={styles.pageTitle}>
          <div><small>{t.eyebrow}</small><h1>{t.title}</h1><p>{t.subtitle}</p></div>
        </header>

        {error ? <div className={styles.notice}>{error}</div> : null}
        {message ? <div className={styles.partnerSuccess}>{message}</div> : null}

        {!access ? (
          <section className={styles.payoutAccessCard}><h2>{t.noStore}</h2><p>{t.noStoreHint}</p></section>
        ) : !access.isOwner ? (
          <section className={styles.payoutAccessCard}><h2>{t.ownerOnly}</h2><p>{t.ownerOnlyHint}</p></section>
        ) : (
          <>
            <section className={styles.payoutAccountPanel}>
              <div className={styles.payoutPanelHead}>
                <div><h2>{t.accounts}</h2><p>{t.accountCount(accounts.length)}</p></div>
                <button type="button" className={styles.primaryButton} disabled={accounts.length >= MAX_PAYOUT_ACCOUNTS || busy} onClick={() => void addAccount()}>{t.add}</button>
              </div>
              {accounts.length ? (
                <div className={styles.payoutAccountGridV2}>
                  {accounts.map((account) => {
                    const state = statusCopy(account.status, t);
                    const active = account.id === form.id;
                    return (
                      <article key={account.id} className={styles.payoutAccountCardV2} data-active={active}>
                        <button type="button" className={styles.payoutAccountSelect} onClick={() => void chooseAccount(account)}>
                          <span className={styles.payoutBankIcon}>฿</span>
                          <div className={styles.payoutAccountCopy}>
                            <div className={styles.payoutAccountNameRow}>
                              <strong>{account.bankName || t.bank}</strong>
                              {account.isDefault && account.status === 'approved' ? <em>{t.defaultAccount}</em> : null}
                            </div>
                            <small>{account.holder || '—'} · {maskAccount(account.accountNumber)}</small>
                          </div>
                          <b className={styles.payoutAccountStatus} data-tone={state.tone}>{state.label}</b>
                        </button>
                        {account.status === 'approved' && !account.isDefault ? (
                          <button type="button" className={styles.payoutInlineAction} disabled={busy} onClick={() => void makeDefault(account)}>{t.setDefault}</button>
                        ) : null}
                        {['draft', 'revision_required', 'rejected'].includes(account.status) ? (
                          <button type="button" className={styles.payoutDeleteAction} disabled={busy} onClick={() => void removeAccount(account)}>{t.deleteAccount}</button>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              ) : <div className={styles.payoutEmpty}><span>฿</span><p>{t.empty}</p></div>}
            </section>

            <div className={styles.payoutWebLayout}>
              <div className={styles.payoutMainStack}>
                <section className={styles.payoutStatusCard} data-tone={selectedState?.tone || 'new'}>
                  <span className={styles.payoutStatusDot} />
                  <div>
                    <strong>{selectedAccount ? selectedState?.label : t.newAccount}</strong>
                    <p>{selectedAccount ? selectedState?.detail : t.newAccountDetail}</p>
                  </div>
                </section>

                {selectedAccount?.reviewerNotes ? (
                  <section className={styles.payoutReviewNote}>
                    <strong>{t.adminNote}</strong>
                    <p>{selectedAccount.reviewerNotes}</p>
                  </section>
                ) : null}

                <section className={styles.payoutFormCard}>
                  <div className={styles.payoutFormIntro}>
                    <span>●</span>
                    <div><h2>{selectedAccount ? t.detailTitle : t.newAccount}</h2><p>{t.detailHint}</p></div>
                  </div>

                  <div className={styles.payoutFormGrid}>
                    <label>
                      <span>{t.country} *</span>
                      <select value={form.country} disabled={!editable} onChange={(event) => setForm((current) => ({ ...current, country: event.target.value, bankName: event.target.value === current.country ? current.bankName : '' }))}>
                        {COUNTRIES.map((country) => <option key={country.value} value={country.value}>{country.labels[locale]}</option>)}
                      </select>
                    </label>
                    <label>
                      <span>{t.currency} *</span>
                      <input value={form.currency} disabled={!editable} maxLength={12} onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value.toUpperCase() }))} placeholder="THB" />
                    </label>

                    {isThailand(form.country) ? (
                      <label className={styles.payoutWide}>
                        <span>{t.bank} *</span>
                        <button type="button" className={styles.bankSelectButton} disabled={!editable} onClick={() => setBankPicker(true)}>
                          <b>฿</b><span>{form.bankName || t.selectBank}</span><em>⌄</em>
                        </button>
                      </label>
                    ) : (
                      <label className={styles.payoutWide}>
                        <span>{t.bank} *</span>
                        <input value={form.bankName} disabled={!editable} onChange={(event) => setForm((current) => ({ ...current, bankName: event.target.value }))} placeholder={t.bankName} />
                      </label>
                    )}

                    <label><span>{t.holder} *</span><input value={form.holder} disabled={!editable} onChange={(event) => setForm((current) => ({ ...current, holder: event.target.value }))} placeholder={t.holderPh} /></label>
                    <label><span>{t.account} *</span><input value={form.accountNumber} disabled={!editable} autoCapitalize="characters" onChange={(event) => setForm((current) => ({ ...current, accountNumber: event.target.value }))} placeholder={t.accountPh} /></label>

                    <label className={styles.payoutWide}>
                      <span>{t.certificate} *</span>
                      <input ref={fileRef} className={styles.hiddenFileInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); event.currentTarget.value = ''; }} />
                      <button type="button" className={styles.payoutDocumentBox} disabled={!editable || uploading} onClick={() => fileRef.current?.click()}>
                        {documentUrl ? <img src={documentUrl} alt={t.certificate} className={styles.payoutDocumentImage} /> : <span className={styles.payoutDocumentEmpty}><b>{uploading ? '…' : '＋'}</b><strong>{uploading ? t.uploading : t.chooseFile}</strong><small>{t.certificateHint}</small></span>}
                        {editable && documentUrl ? <em>{t.changeFile}</em> : null}
                      </button>
                    </label>
                  </div>

                  {editable ? (
                    <div className={styles.payoutFormActions}>
                      <button type="button" onClick={() => void saveDraft()} disabled={busy || uploading}>{t.saveDraft}</button>
                      <button type="button" className={styles.primaryButton} onClick={() => void submit()} disabled={busy || uploading}>{selectedAccount && ['revision_required', 'rejected'].includes(selectedAccount.status) ? t.resubmit : t.submit}</button>
                    </div>
                  ) : null}
                </section>
              </div>

              <aside className={styles.payoutSidebar}>
                <section className={styles.stripeCard}>
                  <div><span>STRIPE</span><b data-tone={provider.tone}>{provider.label}</b></div>
                  <h3>{t.stripe}</h3>
                  <p>{t.stripeHint}</p>
                  <div className={styles.payoutStripeRule}>{t.stripeRule}</div>
                  <div className={styles.payoutStripeActions}>
                    <button type="button" className={styles.primaryButton} disabled={!approved || stripeBusy} onClick={() => void startStripe()}>{stripeBusy ? t.opening : stripeStatus?.onboardingStatus === 'ready' ? t.updateStripe : t.setupStripe}</button>
                    {approved && stripeStatus?.stripeAccountId ? <button type="button" className={styles.secondaryButton} disabled={stripeBusy} onClick={() => void openStripeDashboard()}>{t.openStripeDashboard}</button> : null}
                  </div>
                </section>

                <section className={styles.payoutPrivacyCard}>
                  <h3>{t.privacy}</h3>
                  <p>{t.privacyBody}</p>
                </section>
              </aside>
            </div>
          </>
        )}
      </section>

      {bankPicker ? (
        <div className={styles.partnerModalBackdrop} onMouseDown={(event) => { if (event.target === event.currentTarget) setBankPicker(false); }}>
          <div className={`${styles.partnerModal} ${styles.bankPickerModal}`}>
            <button type="button" className={styles.partnerModalClose} onClick={() => setBankPicker(false)}>×</button>
            <small>MELO PARTNER</small><h2>{t.bankPicker}</h2><p>{t.bankPickerHint}</p>
            <input className={styles.bankSearchInput} value={bankSearch} onChange={(event) => setBankSearch(event.target.value)} placeholder={t.searchBank} />
            <div className={styles.bankPickerList}>
              {filteredBanks.map(([value, thai, detail]) => (
                <button type="button" key={value} data-selected={form.bankName === value} onClick={() => { setForm((current) => ({ ...current, bankName: value })); setBankPicker(false); }}>
                  <span>฿</span><div><strong>{locale === 'th' ? thai : value}</strong><small>{locale === 'th' ? detail : thai}</small></div><b>{form.bankName === value ? '✓' : ''}</b>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
