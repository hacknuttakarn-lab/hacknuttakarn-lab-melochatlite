'use client';

import { useEffect, useState } from 'react';
import { useLocale } from '@/components/SiteProviders';
import accountStyles from '@/components/HeaderAccount.module.css';
import { loadSettingsAccountSnapshot } from '@/components/settings/settingsWebData';

const LABELS: Record<string, string> = {
  th: 'การจัดการของแอดมิน',
  en: 'Admin management',
  de: 'Admin-Verwaltung',
  zh: '管理员管理',
  ja: '管理者メニュー',
  ko: '관리자 관리',
};

function buildMenuLink(label: string) {
  const link = document.createElement('a');
  link.href = '/admin/management';
  link.dataset.meloAdminManagement = 'true';
  link.setAttribute('role', 'menuitem');

  const icon = document.createElement('span');
  icon.textContent = '⚙';
  const text = document.createElement('strong');
  text.textContent = label;

  link.append(icon, text);
  return link;
}

function ensureMenuLink(container: ParentNode | null, partnerSelector: string, label: string) {
  if (!container) return;
  const partner = container.querySelector<HTMLElement>(partnerSelector);
  if (!partner) return;

  const existing = container.querySelector<HTMLAnchorElement>('a[data-melo-admin-management="true"]');
  if (existing) {
    const labelNode = existing.querySelector('strong');
    if (labelNode) labelNode.textContent = label;
    return;
  }

  partner.insertAdjacentElement('afterend', buildMenuLink(label));
}

function removeMenuLinks() {
  document.querySelectorAll('a[data-melo-admin-management="true"]').forEach((node) => node.remove());
}

export default function AdminHeaderMenuBridge() {
  const { locale } = useLocale();
  const [allowed, setAllowed] = useState(false);
  const label = LABELS[locale] ?? LABELS.en;

  useEffect(() => {
    let active = true;

    async function checkAccess() {
      try {
        const account = await loadSettingsAccountSnapshot();
        if (!active) return;
        setAllowed(Boolean(account.adminHasReviewAccess || account.canQuestRewardAdmin || account.canModerate));
      } catch {
        if (active) setAllowed(false);
      }
    }

    void checkAccess();
    const onAuth = () => void checkAccess();
    window.addEventListener('melo-auth-changed', onAuth);
    window.addEventListener('storage', onAuth);

    return () => {
      active = false;
      window.removeEventListener('melo-auth-changed', onAuth);
      window.removeEventListener('storage', onAuth);
    };
  }, []);

  useEffect(() => {
    if (!allowed) {
      removeMenuLinks();
      return;
    }

    let queued = false;
    const apply = () => {
      queued = false;
      const desktop = document.querySelector<HTMLElement>(`.${accountStyles.dropdown}`);
      ensureMenuLink(desktop, `.${accountStyles.partnerModeMenuButton}`, label);

      const mobile = document.querySelector<HTMLElement>(`.${accountStyles.mobileAccountMenu}`);
      ensureMenuLink(mobile, `.${accountStyles.mobilePartnerModeButton}`, label);
    };

    const queue = () => {
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(apply);
    };

    queue();
    const observer = new MutationObserver(queue);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [allowed, label]);

  return null;
}
