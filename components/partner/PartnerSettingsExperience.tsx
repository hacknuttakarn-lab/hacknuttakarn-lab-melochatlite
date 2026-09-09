'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useLocale } from '@/components/SiteProviders';
import PartnerModeHeader from './PartnerModeHeader';
import PartnerSettingsControls from './PartnerSettingsControls';
import { getActivePartnerBusiness, type PartnerBusinessAccess } from './partnerModeWeb';
import styles from './PartnerMode.module.css';

const COPY={
  th:{eyebrow:'MELO PARTNER',title:'ตั้งค่า',subtitle:'จัดการข้อมูลร้านค้า ข้อมูลรับเงิน ทีมร้านค้า ภาษา และรูปแบบการแสดงผลของ Partner Mode',editStore:'แก้ไขข้อมูลร้านค้า',editStoreBody:'จัดการรูปภาพ ข้อมูลธุรกิจ ที่อยู่ เวลาเปิด ช่องทางติดต่อ และข้อมูลยืนยันธุรกิจ',payout:'ข้อมูลรับเงิน',payoutBody:'ตรวจสอบบัญชีธนาคาร สถานะการยืนยัน และตั้งค่าการรับเงินจริงของร้าน',staff:'พนักงานและแอดมิน',staffBody:'เพิ่มผู้ใช้ Melo Chat ด้วยอีเมล กำหนดบทบาท และสิทธิ์ของทีมร้านค้า',open:'เปิดการตั้งค่า'},
  en:{eyebrow:'MELO PARTNER',title:'Settings',subtitle:'Manage store information, payouts, store access, language and Partner Mode appearance',editStore:'Edit store information',editStoreBody:'Manage media, business details, location, opening hours, contact channels and verification',payout:'Payout information',payoutBody:'Verify bank accounts, review payout status and configure real store payouts',staff:'Staff and admins',staffBody:'Add Melo Chat users by email and assign store roles and permissions',open:'Open settings'},
  de:{eyebrow:'MELO PARTNER',title:'Einstellungen',subtitle:'Store-Daten, Auszahlungen, Zugriff, Sprache und Partner-Ansicht verwalten',editStore:'Store-Daten bearbeiten',editStoreBody:'Medien, Unternehmensdaten, Standort, Öffnungszeiten, Kontakte und Prüfung verwalten',payout:'Auszahlungsdaten',payoutBody:'Bankkonten prüfen, Auszahlungsstatus ansehen und echte Auszahlungen einrichten',staff:'Mitarbeiter und Admins',staffBody:'Melo-Chat-Nutzer per E-Mail hinzufügen und Rollen sowie Rechte zuweisen',open:'Einstellungen öffnen'},
  zh:{eyebrow:'MELO PARTNER',title:'设置',subtitle:'管理店铺资料、收款、权限、语言和合作伙伴模式外观',editStore:'编辑店铺信息',editStoreBody:'管理图片、企业资料、位置、营业时间、联系方式和验证信息',payout:'收款信息',payoutBody:'验证银行账户、查看收款状态并设置店铺实际收款',staff:'员工和管理员',staffBody:'通过邮箱添加 Melo Chat 用户并分配店铺角色和权限',open:'打开设置'},
  ja:{eyebrow:'MELO PARTNER',title:'設定',subtitle:'店舗情報、入金、アクセス、言語、Partner Mode の表示を管理します',editStore:'店舗情報を編集',editStoreBody:'画像、事業情報、場所、営業時間、連絡先、確認情報を管理します',payout:'入金情報',payoutBody:'銀行口座の確認、入金ステータス、実際の入金設定を管理します',staff:'スタッフと管理者',staffBody:'メールで Melo Chat ユーザーを追加し、役割と権限を設定します',open:'設定を開く'},
  ko:{eyebrow:'MELO PARTNER',title:'설정',subtitle:'매장 정보, 정산, 접근 권한, 언어 및 Partner Mode 화면을 관리합니다',editStore:'매장 정보 수정',editStoreBody:'이미지, 비즈니스 정보, 위치, 영업시간, 연락처 및 인증 정보를 관리합니다',payout:'정산 정보',payoutBody:'은행 계좌 인증, 정산 상태 및 실제 지급 설정을 관리합니다',staff:'직원 및 관리자',staffBody:'이메일로 Melo Chat 사용자를 추가하고 역할과 권한을 지정합니다',open:'설정 열기'},
} as const;

export default function PartnerSettingsExperience(){
  const {locale}=useLocale(); const t=COPY[locale]??COPY.en;
  const [access,setAccess]=useState<PartnerBusinessAccess|null>(null); const [loading,setLoading]=useState(true); const [error,setError]=useState('');
  const load=useCallback(async()=>{setLoading(true);setError('');try{setAccess(await getActivePartnerBusiness());}catch(e){setError(e instanceof Error?e.message:String(e));}finally{setLoading(false);}},[]);
  useEffect(()=>{void load();},[load]);
  if(loading)return <main className={styles.partnerPage}><div className={styles.loading}>Loading Partner Mode…</div></main>;
  return <main className={styles.partnerPage}>
    <PartnerModeHeader access={access} onBusinessChanged={next=>setAccess(next)}/>
    <section className={styles.partnerShell}>
      <header className={styles.pageTitle}><div><small>{t.eyebrow}</small><h1>{t.title}</h1><p>{t.subtitle}</p></div></header>
      {error?<div className={styles.notice}>{error}</div>:null}
      <div className={styles.partnerSettingsLayout}>
        <div className={styles.partnerSettingsGrid}>
          {access?.isOwner?<Link href="/partner/store/edit" className={styles.partnerSettingCard}><span className={styles.partnerSettingIcon}>✎</span><div><strong>{t.editStore}</strong><p>{t.editStoreBody}</p></div><em>{t.open} ›</em></Link>:null}
          <Link href="/partner/payout" className={styles.partnerSettingCard}><span className={styles.partnerSettingIcon}>฿</span><div><strong>{t.payout}</strong><p>{t.payoutBody}</p></div><em>{t.open} ›</em></Link>
          <Link href="/partner/staff" className={styles.partnerSettingCard}><span className={styles.partnerSettingIcon}>♟</span><div><strong>{t.staff}</strong><p>{t.staffBody}</p></div><em>{t.open} ›</em></Link>
        </div>
        <PartnerSettingsControls />
      </div>
    </section>
  </main>;
}
