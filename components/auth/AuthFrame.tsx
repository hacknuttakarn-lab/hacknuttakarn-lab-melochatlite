'use client';

import Image from 'next/image';
import type { ReactNode } from 'react';
import { Header } from '@/components/Header';
import { useLocale } from '@/components/SiteProviders';
import { authCopy } from '@/i18n/authUi';
import styles from './AuthFrame.module.css';

export function AuthFrame({ title, body, children }: { title: string; body: string; children: ReactNode }) {
  const { locale } = useLocale();
  const copy = authCopy[locale];

  return (
    <main className={styles.authMain}>
      <Header />
      <div className={styles.authShell}>
        <section className={styles.authIntro}>
          <div className={styles.logoLine}>
            <Image src="/melo-logo.png" alt="Melo Chat" width={52} height={52} priority />
            <strong>Melo Chat</strong>
          </div>
          <span className={styles.kicker}>{copy.portalKicker}</span>
          <h1>{copy.portalTitle}</h1>
          <p>{copy.portalBody}</p>
          <div className={styles.introBullets}>
            <span><i>✓</i>{copy.portalFeature1}</span>
            <span><i>◐</i>{copy.portalFeature2}</span>
            <span><i>↔</i>{copy.portalFeature3}</span>
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
