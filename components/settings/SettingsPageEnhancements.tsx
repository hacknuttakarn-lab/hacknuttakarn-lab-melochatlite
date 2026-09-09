'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocale } from '@/components/SiteProviders';
import { getCurrentUser, restSelect, restUpsert } from '@/lib/supabase/browser';
import styles from './SettingsExperience.module.css';

const COPY: Record<string, {
  title: string;
  description: string;
  placeholder: string;
  loading: string;
  saved: string;
  failed: string;
}> = {
  th: {
    title: 'แนะนำตัวเองสำหรับ Love',
    description: 'แยกจาก “เกี่ยวกับฉัน” ในหน้าโปรไฟล์ ข้อความนี้ใช้เฉพาะสำหรับการแนะนำตัวใน Love',
    placeholder: 'เล่าเกี่ยวกับตัวคุณ สิ่งที่ชอบ หรือความสัมพันธ์ที่คุณกำลังมองหา...',
    loading: 'กำลังโหลด...',
    saved: 'บันทึก Love แล้ว',
    failed: 'บันทึกแนะนำตัวสำหรับ Love ไม่สำเร็จ',
  },
  en: {
    title: 'Love introduction',
    description: 'Separate from About me on your profile. This text is used only for your Love introduction.',
    placeholder: 'Tell people about yourself, what you enjoy, or what kind of connection you are looking for...',
    loading: 'Loading...',
    saved: 'Love introduction saved',
    failed: 'Unable to save Love introduction',
  },
  de: {
    title: 'Love-Vorstellung',
    description: 'Getrennt von „Über mich“ im Profil. Dieser Text wird nur für deine Love-Vorstellung verwendet.',
    placeholder: 'Erzähle etwas über dich, deine Interessen oder welche Beziehung du suchst...',
    loading: 'Wird geladen...',
    saved: 'Love-Vorstellung gespeichert',
    failed: 'Love-Vorstellung konnte nicht gespeichert werden',
  },
  zh: {
    title: 'Love 自我介绍',
    description: '与个人资料中的“关于我”分开保存，此内容仅用于 Love 自我介绍。',
    placeholder: '介绍一下自己、你的兴趣，或你希望建立怎样的关系...',
    loading: '加载中...',
    saved: 'Love 自我介绍已保存',
    failed: '无法保存 Love 自我介绍',
  },
  ja: {
    title: 'Love向け自己紹介',
    description: 'プロフィールの「自己紹介」とは別のデータです。この文章はLove向けの自己紹介だけに使用します。',
    placeholder: 'あなたのこと、好きなこと、求めている関係について紹介してください...',
    loading: '読み込み中...',
    saved: 'Love向け自己紹介を保存しました',
    failed: 'Love向け自己紹介を保存できません',
  },
  ko: {
    title: 'Love 자기소개',
    description: '프로필의 “내 소개”와 별도로 저장되며 Love 자기소개에만 사용됩니다.',
    placeholder: '나에 대한 이야기, 좋아하는 것, 원하는 관계를 소개해 주세요...',
    loading: '불러오는 중...',
    saved: 'Love 자기소개 저장됨',
    failed: 'Love 자기소개를 저장하지 못했습니다',
  },
};

type ProfileLoveRow = {
  id?: string;
  love_intro?: string | null;
};

async function readLoveIntro(userId: string) {
  // IMPORTANT: Love introduction is intentionally independent from profile
  // bio/about. Never fall back to bio/about here.
  const result = await restSelect<ProfileLoveRow[]>(
    'profiles',
    `select=id,love_intro&id=eq.${encodeURIComponent(userId)}&limit=1`,
  );

  if (result.error) throw new Error(result.error);

  const row = Array.isArray(result.data) ? result.data[0] : null;
  return typeof row?.love_intro === 'string'
    ? row.love_intro.slice(0, 500)
    : '';
}

async function saveLoveIntro(userId: string, value: string) {
  // Partial upsert updates ONLY love_intro. It must never change bio/about.
  const result = await restUpsert<ProfileLoveRow[]>(
    'profiles',
    {
      id: userId,
      love_intro: value.trim().slice(0, 500) || null,
    },
    'id',
  );

  if (result.error) throw new Error(result.error);
}

function hideMovedAdminLinks() {
  document
    .querySelectorAll<HTMLAnchorElement>(
      'a[href="/admin/quest-rewards"],a[href="/admin/review-center"]',
    )
    .forEach((link) => {
      if (!link.closest(`.${styles.settingRows}`)) return;

      const href = link.getAttribute('href') || '';
      const label = (link.textContent || '').replace(/\s+/g, ' ').trim();

      if (href === '/admin/quest-rewards') {
        link.style.display = 'none';
        return;
      }

      // Keep Moderation Queue if it happens to share the same route.
      if (
        href === '/admin/review-center' &&
        label.includes('Admin Review Center')
      ) {
        link.style.display = 'none';
      }
    });
}

function findActiveLovePanel() {
  const tabs = document.querySelector<HTMLElement>(`.${styles.connectTabs}`);
  if (!tabs) return null;

  const buttons = Array.from(
    tabs.querySelectorAll<HTMLButtonElement>('button'),
  );

  if (buttons.length < 2 || buttons[1]?.dataset.active !== 'true') {
    return null;
  }

  let scope: HTMLElement | null = tabs.parentElement;
  for (let depth = 0; scope && depth < 5; depth += 1) {
    const panel = scope.querySelector<HTMLElement>(`.${styles.connectPanel}`);
    if (panel) return panel;
    scope = scope.parentElement;
  }

  return null;
}

function ensureLoveIntroMount() {
  const panel = findActiveLovePanel();
  if (!panel) return null;

  let mount = panel.querySelector<HTMLElement>(
    '[data-melo-love-intro-mount="true"]',
  );

  if (!mount) {
    mount = document.createElement('div');
    mount.dataset.meloLoveIntroMount = 'true';

    // Love hint -> Love intro -> relationship/gender/age/nationality.
    const hint = panel.querySelector<HTMLElement>(`.${styles.connectHint}`);
    if (hint) hint.insertAdjacentElement('afterend', mount);
    else panel.prepend(mount);
  }

  return mount;
}

function findConnectSaveButton() {
  return document.querySelector<HTMLButtonElement>(
    `.${styles.connectSaveBar} > button`,
  );
}

export default function SettingsPageEnhancements() {
  const { locale } = useLocale();
  const t = COPY[locale] ?? COPY.en;

  const [mount, setMount] = useState<HTMLElement | null>(null);
  const [userId, setUserId] = useState('');
  const [intro, setIntro] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');

  const introRef = useRef('');
  const saveButtonRef = useRef<HTMLButtonElement | null>(null);
  const savingRef = useRef(false);

  useEffect(() => {
    introRef.current = intro;
  }, [intro]);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const user = await getCurrentUser();
        if (!active || !user?.id) return;

        setUserId(user.id);

        const value = await readLoveIntro(user.id);
        if (!active) return;

        setIntro(value);
        introRef.current = value;
      } catch (cause) {
        if (active) {
          setStatus(cause instanceof Error ? cause.message : t.failed);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [t.failed]);

  async function saveIntro() {
    if (!userId || savingRef.current) return;

    savingRef.current = true;
    setSaving(true);
    setStatus('');

    try {
      await saveLoveIntro(userId, introRef.current);
      setStatus(t.saved);

      window.dispatchEvent(
        new CustomEvent('melo-love-intro-changed', {
          detail: {
            userId,
            loveIntro: introRef.current.trim().slice(0, 500),
          },
        }),
      );
    } catch (cause) {
      setStatus(cause instanceof Error ? cause.message : t.failed);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  function onSaveClick() {
    void saveIntro();
  }

  useEffect(() => {
    let frame = 0;

    const apply = () => {
      frame = 0;

      hideMovedAdminLinks();
      setMount(ensureLoveIntroMount());

      const saveButton = findConnectSaveButton();
      if (saveButtonRef.current === saveButton) return;

      if (saveButtonRef.current) {
        saveButtonRef.current.removeEventListener('click', onSaveClick);
      }

      saveButtonRef.current = saveButton;

      if (saveButton) {
        saveButton.addEventListener('click', onSaveClick);
      }
    };

    const queue = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(apply);
    };

    queue();

    const observer = new MutationObserver(queue);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-active'],
    });

    return () => {
      observer.disconnect();

      if (frame) {
        window.cancelAnimationFrame(frame);
      }

      if (saveButtonRef.current) {
        saveButtonRef.current.removeEventListener('click', onSaveClick);
      }
    };
  });

  if (!mount) return null;

  return createPortal(
    <div
      className={styles.formCard}
      data-melo-love-intro="true"
      style={{ marginBottom: 12 }}
    >
      <label>{t.title}</label>
      <p
        style={{
          margin: '5px 0 9px',
          color: 'var(--text-secondary)',
          fontSize: 11,
          lineHeight: 1.45,
        }}
      >
        {t.description}
      </p>

      <textarea
        maxLength={500}
        value={intro}
        disabled={loading || saving}
        onChange={(event) => {
          const value = event.target.value.slice(0, 500);
          setIntro(value);
          introRef.current = value;
          setStatus('');
        }}
        placeholder={t.placeholder}
      />

      <small>
        {loading
          ? t.loading
          : `${intro.length}/500${status ? ` · ${status}` : ''}`}
      </small>
    </div>,
    mount,
  );
}
