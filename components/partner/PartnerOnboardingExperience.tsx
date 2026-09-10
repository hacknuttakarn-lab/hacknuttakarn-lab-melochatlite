'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/components/SiteProviders';
import { rpcRequest } from '@/lib/supabase/browser';
import { getPartnerCategoryLabel, type PartnerBusinessCategory } from '@/i18n/partnersUi';
import PartnerModeHeader from './PartnerModeHeader';
import { saveMyBusinessAccountDraft, submitMyBusinessAccountForReview } from './partnerModeWeb';
import styles from './PartnerMode.module.css';

const BUSINESS_TYPES: PartnerBusinessCategory[] = [
  'accommodation',
  'food_drink',
  'tours_guides',
  'transport_rental',
  'activities_experiences',
  'sports_outdoor',
  'attractions',
  'events_entertainment',
  'wellness_lifestyle',
  'shopping_equipment',
  'traveler_services',
  'local_other',
];

const COPY = {
  th: {
    title: 'สร้างบัญชีธุรกิจ', body: 'กรอกข้อมูลหลักของร้านเพื่อส่งให้ Admin ตรวจสอบ', save: 'บันทึกและส่งตรวจ', sent: 'ส่งข้อมูลให้ Admin ตรวจสอบแล้ว',
    businessType: 'ประเภทธุรกิจ', primaryLanguage: 'ภาษาหลัก', legalName: 'ชื่อจดทะเบียน', displayName: 'ชื่อที่แสดง', province: 'จังหวัด / รัฐ / ภูมิภาค', district: 'อำเภอ / เขต / เมือง', country: 'ประเทศ', phone: 'โทรศัพท์', email: 'อีเมล', website: 'เว็บไซต์', address: 'รายละเอียดที่อยู่', description: 'เกี่ยวกับธุรกิจและบริการ',
  },
  en: {
    title: 'Create business account', body: 'Enter your business details and submit them for admin review.', save: 'Save & submit for review', sent: 'Submitted for admin review',
    businessType: 'Business type', primaryLanguage: 'Primary language', legalName: 'Legal name', displayName: 'Display name', province: 'Province / State / Region', district: 'District / City', country: 'Country', phone: 'Phone', email: 'Email', website: 'Website', address: 'Address details', description: 'Business & services',
  },
  de: {
    title: 'Geschäftskonto erstellen', body: 'Geschäftsdaten eingeben und zur Prüfung senden.', save: 'Speichern & senden', sent: 'Zur Prüfung gesendet',
    businessType: 'Geschäftstyp', primaryLanguage: 'Hauptsprache', legalName: 'Rechtlicher Name', displayName: 'Anzeigename', province: 'Region / Bundesland', district: 'Bezirk / Stadt', country: 'Land', phone: 'Telefon', email: 'E-Mail', website: 'Webseite', address: 'Adressdetails', description: 'Geschäft & Dienstleistungen',
  },
  zh: {
    title: '创建商家账号', body: '填写商家资料并提交管理员审核。', save: '保存并提交审核', sent: '已提交管理员审核',
    businessType: '商家类型', primaryLanguage: '主要语言', legalName: '注册名称', displayName: '显示名称', province: '省 / 州 / 地区', district: '区 / 市', country: '国家', phone: '电话', email: '电子邮件', website: '网站', address: '详细地址', description: '商家与服务介绍',
  },
  ja: {
    title: 'ビジネスアカウント作成', body: '店舗情報を入力してAdmin審査へ送信します。', save: '保存して審査へ送信', sent: '審査へ送信しました',
    businessType: 'ビジネスカテゴリー', primaryLanguage: 'メイン言語', legalName: '登録名', displayName: '表示名', province: '都道府県 / 州', district: '市区町村 / 都市', country: '国', phone: '電話', email: 'メール', website: 'ウェブサイト', address: '住所詳細', description: 'ビジネス・サービス紹介',
  },
  ko: {
    title: '비즈니스 계정 만들기', body: '매장 정보를 입력하고 관리자 검토를 요청하세요.', save: '저장 및 검토 요청', sent: '관리자 검토를 요청했습니다',
    businessType: '비즈니스 유형', primaryLanguage: '기본 언어', legalName: '등록 상호', displayName: '표시 이름', province: '도 / 주 / 지역', district: '구 / 시', country: '국가', phone: '전화', email: '이메일', website: '웹사이트', address: '상세 주소', description: '비즈니스 및 서비스 소개',
  },
} as const;

type FormState = {
  businessType: PartnerBusinessCategory;
  legalName: string;
  displayName: string;
  description: string;
  address: string;
  province: string;
  district: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  primaryLanguage: 'th' | 'en' | 'de' | 'zh' | 'ja' | 'ko';
  partnershipModes: string[];
};

export default function PartnerOnboardingExperience() {
  const { locale } = useLocale();
  const t = COPY[locale] ?? COPY.en;
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState<FormState>({
    businessType: 'food_drink',
    legalName: '',
    displayName: '',
    description: '',
    address: '',
    province: '',
    district: '',
    city: '',
    country: 'Thailand',
    phone: '',
    email: '',
    website: '',
    primaryLanguage: locale,
    partnershipModes: ['partner'],
  });

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function setDistrict(value: string) {
    setForm((current) => ({ ...current, district: value, city: value || current.province }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage('');
    try {
      const id = await saveMyBusinessAccountDraft(form);
      const locationResult = await rpcRequest('save_my_business_location_details', {
        p_business_id: id,
        p_province: form.province.trim(),
        p_district: form.district.trim(),
      });
      if (locationResult.error) throw new Error(locationResult.error);
      await submitMyBusinessAccountForReview(id);
      setMessage(t.sent);
      window.setTimeout(() => router.replace('/partner'), 900);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={styles.partnerPage}>
      <PartnerModeHeader access={null} />
      <section className={styles.partnerShell}>
        <header className={styles.pageTitle}>
          <div><small>MELO PARTNER</small><h1>{t.title}</h1><p>{t.body}</p></div>
        </header>
        <form className={styles.partnerOnboarding} onSubmit={submit}>
          <div className={styles.partnerFormGrid}>
            <label>{t.businessType}
              <select value={form.businessType} onChange={(event) => set('businessType', event.target.value as PartnerBusinessCategory)}>
                {BUSINESS_TYPES.map((type) => <option key={type} value={type}>{getPartnerCategoryLabel(type, locale)}</option>)}
              </select>
            </label>
            <label>{t.primaryLanguage}
              <select value={form.primaryLanguage} onChange={(event) => set('primaryLanguage', event.target.value as FormState['primaryLanguage'])}>
                <option value="th">ไทย</option><option value="en">English</option><option value="de">Deutsch</option><option value="zh">中文</option><option value="ja">日本語</option><option value="ko">한국어</option>
              </select>
            </label>
            <label>{t.legalName}<input required value={form.legalName} onChange={(event) => set('legalName', event.target.value)} /></label>
            <label>{t.displayName}<input required value={form.displayName} onChange={(event) => set('displayName', event.target.value)} /></label>
            <label>{t.province}<input required value={form.province} onChange={(event) => set('province', event.target.value)} /></label>
            <label>{t.district}<input required value={form.district} onChange={(event) => setDistrict(event.target.value)} /></label>
            <label>{t.country}<input required value={form.country} onChange={(event) => set('country', event.target.value)} /></label>
            <label>{t.phone}<input required value={form.phone} onChange={(event) => set('phone', event.target.value)} /></label>
            <label>{t.email}<input type="email" required value={form.email} onChange={(event) => set('email', event.target.value)} /></label>
            <label>{t.website}<input value={form.website} onChange={(event) => set('website', event.target.value)} /></label>
            <label>{t.address}<input required value={form.address} onChange={(event) => set('address', event.target.value)} /></label>
          </div>
          <label>{t.description}<textarea value={form.description} onChange={(event) => set('description', event.target.value)} /></label>
          {message ? <div className={styles.notice}>{message}</div> : null}
          <button className={styles.primaryButton} disabled={busy || !form.displayName.trim() || !form.legalName.trim() || !form.province.trim() || !form.district.trim()}>{t.save}</button>
        </form>
      </section>
    </main>
  );
}
