'use client';

import Image from 'next/image';
import type { ReactNode } from 'react';
import { Header } from '@/components/Header';
import { useLocale } from '@/components/SiteProviders';
import { authCopy } from '@/i18n/authUi';
import styles from './AuthFrame.module.css';

export function AuthFrame({ title, body, children, mobileCardOnly = false }: { title: string; body: string; children: ReactNode; mobileCardOnly?: boolean }) {
  const { locale } = useLocale();
  const copy = authCopy[locale];
  const liteCopy = locale === 'th'
    ? { kicker: 'MELO CHAT LITE', title: 'พบเจอ จับคู่ และพูดคุยบนเว็บ', body: 'เข้าสู่ระบบเพื่อค้นหาคนใหม่ ดู Feed เชื่อมต่อ และแชทผ่าน Melo Chat Lite ได้จากเบราว์เซอร์ โดยไม่ต้องติดตั้งแอป', feature1: 'ใช้งานผ่านเว็บ ไม่ต้องติดตั้งแอป', feature2: 'รองรับ Light / Dark และ TH / EN / DE', feature3: 'ใช้งานได้บน Desktop / Tablet / Mobile' }
    : locale === 'de'
      ? { kicker: 'MELO CHAT LITE', title: 'Entdecken, matchen und direkt im Web chatten', body: 'Melde dich an, um Menschen zu entdecken, den Feed zu nutzen, Kontakte zu knüpfen und in Melo Chat Lite direkt im Browser zu chatten – ohne App-Installation.', feature1: 'Direkt im Web, keine App-Installation nötig', feature2: 'Light / Dark sowie TH / EN / DE', feature3: 'Für Desktop / Tablet / Mobile optimiert' }
      : { kicker: 'MELO CHAT LITE', title: 'Discover, match and chat on the web', body: 'Sign in to discover people, browse the Feed, connect and chat in Melo Chat Lite directly from your browser — no app installation required.', feature1: 'Web-only experience, no app installation needed', feature2: 'Light / Dark with TH / EN / DE', feature3: 'Responsive on Desktop / Tablet / Mobile' };

  return (
    <main className={styles.authMain}>
      <Header />
      <div className={`${styles.authShell} ${mobileCardOnly ? styles.mobileCardOnly : ''}`}>
        <section className={styles.authIntro}>
          <div className={styles.logoLine}>
            <Image src="/melo-logo.png" alt="Melo Chat" width={52} height={52} priority />
            <strong>Melo Chat</strong>
          </div>
          <span className={styles.kicker}>{liteCopy.kicker}</span>
          <h1>{liteCopy.title}</h1>
          <p>{liteCopy.body}</p>
          <div className={styles.introBullets}>
            <span><i>✓</i>{liteCopy.feature1}</span>
            <span><i>◐</i>{liteCopy.feature2}</span>
            <span><i>↔</i>{liteCopy.feature3}</span>
          </div>
        </section>
        <section className={styles.card}>
          <div className={styles.cardHeader}><h2>{title}</h2><p>{body}</p></div>
          {children}
        </section>
      </div>
    </main>
  );
}

export { styles as authStyles };
