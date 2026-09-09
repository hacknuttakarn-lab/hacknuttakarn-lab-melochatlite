'use client';

import { useState } from 'react';
import { Header } from '@/components/Header';
import { useLocale } from '@/components/SiteProviders';
import { FriendsExperience } from './FriendsExperience';
import { LoveExperience } from './LoveExperience';
import styles from './ConnectHub.module.css';

type Mode = 'friend' | 'love';

const COPY = {
  th: {
    kicker: 'MELO CONNECT',
    title: 'Connect',
    subtitle: 'เลือกโหมดที่ต้องการ แล้วดูข้อมูลเพื่อนหรือคู่รักได้ในหน้าเดียวโดยไม่ต้องเปลี่ยนหน้า',
    friend: 'เพื่อน',
    love: 'คู่รัก',
  },
  en: {
    kicker: 'MELO CONNECT',
    title: 'Connect',
    subtitle: 'Switch between Friend and Love in one place without opening a separate page.',
    friend: 'Friend',
    love: 'Love',
  },
  de: {
    kicker: 'MELO CONNECT',
    title: 'Connect',
    subtitle: 'Wechsle direkt zwischen Freunde und Love, ohne eine separate Seite zu öffnen.',
    friend: 'Freunde',
    love: 'Love',
  },
  zh: {
    kicker: 'MELO CONNECT',
    title: 'Connect',
    subtitle: '在同一页面直接切换朋友与恋爱模式，无需打开单独页面。',
    friend: '朋友',
    love: '恋爱',
  },
  ja: {
    kicker: 'MELO CONNECT',
    title: 'Connect',
    subtitle: '別ページを開かず、この画面で友達モードと恋愛モードを切り替えられます。',
    friend: '友達',
    love: '恋愛',
  },
  ko: {
    kicker: 'MELO CONNECT',
    title: 'Connect',
    subtitle: '별도 페이지를 열지 않고 한 화면에서 친구와 연애 모드를 전환하세요.',
    friend: '친구',
    love: '연애',
  },
} as const;

export default function ConnectHub() {
  const { locale } = useLocale();
  const t = COPY[locale] ?? COPY.en;
  const [mode, setMode] = useState<Mode>('friend');
  const [mountedModes, setMountedModes] = useState<Record<Mode, boolean>>({
    friend: true,
    love: false,
  });

  function switchMode(next: Mode) {
    setMode(next);
    setMountedModes((current) => current[next] ? current : { ...current, [next]: true });
  }

  return (
    <main className={styles.page}>
      <Header />
      <section className={styles.shell}>
        <div className={styles.hero}>
          <div className={styles.heroCopy}>
            <span className={styles.kicker}>{t.kicker}</span>
            <h1>{t.title}</h1>
            <p>{t.subtitle}</p>
          </div>

          <div className={styles.modeSwitch} role="tablist" aria-label="Connect mode">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'friend'}
              className={`${styles.modeButton} ${mode === 'friend' ? styles.modeButtonActive : ''}`}
              onClick={() => switchMode('friend')}
            >
              <span className={styles.modeIcon}>☺</span>
              {t.friend}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'love'}
              className={`${styles.modeButton} ${mode === 'love' ? styles.modeButtonActiveLove : ''}`}
              onClick={() => switchMode('love')}
            >
              <span className={styles.modeIcon}>♡</span>
              {t.love}
            </button>
          </div>
        </div>

        <div className={styles.contentStage}>
          {mountedModes.friend ? (
            <div hidden={mode !== 'friend'} className={styles.modePanel} role="tabpanel">
              <FriendsExperience embedded />
            </div>
          ) : null}
          {mountedModes.love ? (
            <div hidden={mode !== 'love'} className={styles.modePanel} role="tabpanel">
              <LoveExperience embedded />
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
