'use client';

import { usePathname } from 'next/navigation';
import { useLocale } from '@/components/SiteProviders';
import { selectableLocales } from '@/i18n/dictionaries';

type PublicLanguageSwitcherProps = {
  placement?: 'floating' | 'header';
};

export default function PublicLanguageSwitcher({
  placement = 'floating',
}: PublicLanguageSwitcherProps) {
  const pathname = usePathname();
  const hideHeaderOnMobileAuth = placement === 'header' && ['/login', '/register', '/forgot-password', '/reset-password'].includes(pathname);

  const {
    locale,
    setLocale,
    localeLabels,
    t,
  } = useLocale();

  const selectId =
    placement === 'header'
      ? 'melo-header-language'
      : 'melo-public-language';

  return (
    <div
      className={`meloPublicLanguageSwitcher ${
        placement === 'header' ? 'meloPublicLanguageSwitcherHeader' : ''
      } ${hideHeaderOnMobileAuth ? 'meloPublicLanguageSwitcherMobileAuthDuplicate' : ''}`}
    >
      <span
        className="meloPublicLanguageIcon"
        aria-hidden="true"
      >
        🌐
      </span>

      <label
        className="srOnly"
        htmlFor={selectId}
      >
        {t('common.language')}
      </label>

      <select
        id={selectId}
        aria-label={t('common.language')}
        value={locale}
        onChange={(event) =>
          setLocale(event.target.value as typeof locale)
        }
      >
        {selectableLocales.map((item) => (
          <option
            key={item}
            value={item}
          >
            {localeLabels[item]}
          </option>
        ))}
      </select>

      <style jsx>{`
        .meloPublicLanguageSwitcher {
          position: fixed;
          top: 84px;
          right: 24px;
          z-index: 1200;

          display: inline-flex;
          align-items: center;
          gap: 8px;

          min-height: 42px;
          padding: 0 12px;

          border: 1px solid var(--border);
          border-radius: 14px;

          background: color-mix(in srgb, var(--surface) 96%, transparent);
          color: var(--text);

          box-shadow:
            0 10px 28px color-mix(in srgb, var(--shadow) 82%, transparent),
            0 2px 8px color-mix(in srgb, var(--shadow) 45%, transparent);

          backdrop-filter: blur(14px);
        }

        .meloPublicLanguageSwitcherHeader {
          position: static;
          top: auto;
          right: auto;
          z-index: auto;

          min-height: 40px;
          padding: 0 10px;

          border-radius: 12px;
          background: var(--surface);
          box-shadow: 0 8px 24px var(--shadow);
          backdrop-filter: none;
        }

        .meloPublicLanguageIcon {
          display: inline-flex;
          align-items: center;
          justify-content: center;

          font-size: 16px;
          line-height: 1;
        }

        select {
          min-width: 104px;

          border: 0;
          outline: 0;

          background: transparent;
          color: var(--text);

          font: inherit;
          font-size: 14px;
          font-weight: 700;

          cursor: pointer;
        }

        .meloPublicLanguageSwitcherHeader select {
          min-width: 88px;
          max-width: 108px;
        }

        option {
          color: var(--text);
          background: var(--surface);
        }

        .srOnly {
          position: absolute;

          width: 1px;
          height: 1px;

          padding: 0;
          margin: -1px;

          overflow: hidden;
          clip: rect(0, 0, 0, 0);

          white-space: nowrap;

          border: 0;
        }

        @media (max-width: 900px) {
          .meloPublicLanguageSwitcherMobileAuthDuplicate {
            display: none;
          }

          .meloPublicLanguageSwitcher:not(.meloPublicLanguageSwitcherHeader) {
            display: none;
          }

          .meloPublicLanguageSwitcherHeader {
            flex: 1 1 auto;
            width: 100%;
            min-width: 0;
            box-shadow: none;
          }

          .meloPublicLanguageSwitcherHeader select {
            flex: 1 1 auto;
            min-width: 0;
            max-width: none;
          }
        }

        @media (max-width: 760px) {
          .meloPublicLanguageSwitcher:not(.meloPublicLanguageSwitcherHeader) {
            top: 76px;
            right: 12px;

            min-height: 40px;

            padding: 0 10px;
          }

          select {
            font-size: 13px;
          }
        }
      `}</style>
    </div>
  );
}
