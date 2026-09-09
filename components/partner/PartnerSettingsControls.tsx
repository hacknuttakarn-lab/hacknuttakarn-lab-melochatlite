'use client';

import { useLocale } from '@/components/SiteProviders';
import styles from './PartnerMode.module.css';

const COPY={
  th:{preferences:'การแสดงผลเว็บ',language:'ภาษาเว็บ',theme:'โหมดสี',system:'ตามระบบ',light:'สว่าง',dark:'มืด'},
  en:{preferences:'Web appearance',language:'Website language',theme:'Color mode',system:'System',light:'Light',dark:'Dark'},
  de:{preferences:'Web-Darstellung',language:'Websprache',theme:'Farbmodus',system:'System',light:'Hell',dark:'Dunkel'},
  zh:{preferences:'网页显示',language:'网页语言',theme:'颜色模式',system:'跟随系统',light:'浅色',dark:'深色'},
  ja:{preferences:'Web表示',language:'Webサイトの言語',theme:'カラーモード',system:'システム',light:'ライト',dark:'ダーク'},
  ko:{preferences:'웹 표시',language:'웹 언어',theme:'색상 모드',system:'시스템',light:'라이트',dark:'다크'},
} as const;

export default function PartnerSettingsControls({compact=false}:{compact?:boolean}){
  const {locale,setLocale,localeLabels,supportedLocales,themeMode,setThemeMode}=useLocale();
  const t=COPY[locale]??COPY.en;
  return <section className={compact?styles.partnerPreferenceCompact:styles.partnerPreferencePanel}>
    <div className={styles.partnerPreferenceHeading}><span>◐</span><div><strong>{t.preferences}</strong>{compact?null:<small>{t.language} · {t.theme}</small>}</div></div>
    <label className={styles.partnerPreferenceField}><span>{t.language}</span><select value={locale} onChange={event=>setLocale(event.target.value as typeof locale)}>{supportedLocales.map(item=><option value={item} key={item}>{localeLabels[item]}</option>)}</select></label>
    <label className={styles.partnerPreferenceField}><span>{t.theme}</span><select value={themeMode} onChange={event=>setThemeMode(event.target.value as 'system'|'light'|'dark')}><option value="system">{t.system}</option><option value="light">{t.light}</option><option value="dark">{t.dark}</option></select></label>
  </section>;
}
