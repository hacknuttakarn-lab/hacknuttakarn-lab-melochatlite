'use client';

import { useEffect } from 'react';
import styles from './SettingsExperience.module.css';

function hideMovedAdminRows() {
  const settingsRows = document.querySelectorAll<HTMLElement>(
    `.${styles.settingRows}`,
  );

  for (const container of settingsRows) {
    for (const link of container.querySelectorAll<HTMLAnchorElement>(
      'a[href="/admin/quest-rewards"], a[href="/admin/review-center"]',
    )) {
      const href = link.getAttribute('href') || '';
      const label = (link.textContent || '').replace(/\s+/g, ' ').trim();

      // Quest & Reward Admin is always moved to Admin Management.
      if (href === '/admin/quest-rewards') {
        link.style.display = 'none';
        link.dataset.meloMovedAdminRow = 'true';
        continue;
      }

      // Hide ONLY the explicitly named Admin Review Center row.
      // The separate Moderation Queue can use the same route and must remain.
      if (
        href === '/admin/review-center' &&
        label.includes('Admin Review Center')
      ) {
        link.style.display = 'none';
        link.dataset.meloMovedAdminRow = 'true';
      }
    }
  }
}

export default function SettingsAdminCleanup() {
  useEffect(() => {
    let frame = 0;

    const queue = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        hideMovedAdminRows();
      });
    };

    queue();

    const observer = new MutationObserver(queue);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
