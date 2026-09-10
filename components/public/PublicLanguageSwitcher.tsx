'use client';

import { useLocale } from '@/components/SiteProviders';

export default function PublicLanguageSwitcher() {
  const {
    locale,
    setLocale,
    localeLabels,
    supportedLocales,
    t,
  } = useLocale();

  return (
    <div className="meloPublicLanguageSwitcher">
      <span
        className="meloPublicLanguageIcon"
        aria-hidden="true"
      >
        🌐
      </span>

      <label
        className="srOnly"
        htmlFor="melo-public-language"
      >
        {t('common.language')}
      </label>

      <select
        id="melo-public-language"
        aria-label={t('common.language')}
        value={locale}
        onChange={(event) =>
          setLocale(event.target.value as typeof locale)
        }
      >
        {supportedLocales.map((item) => (
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

          border: 1px solid rgba(148, 163, 184, 0.24);
          border-radius: 14px;

          background: rgba(255, 255, 255, 0.96);

          box-shadow:
            0 10px 28px rgba(15, 23, 42, 0.1),
            0 2px 8px rgba(15, 23, 42, 0.05);

          backdrop-filter: blur(14px);
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
          color: #172033;

          font: inherit;
          font-size: 14px;
          font-weight: 700;

          cursor: pointer;
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

        :global(html[data-theme='dark'])
          .meloPublicLanguageSwitcher {
          border-color: rgba(148, 163, 184, 0.22);

          background: rgba(20, 27, 40, 0.94);

          box-shadow:
            0 12px 30px rgba(0, 0, 0, 0.28),
            0 2px 8px rgba(0, 0, 0, 0.18);
        }

        :global(html[data-theme='dark']) select {
          color: #f8fafc;
        }

        :global(html[data-theme='dark']) option {
          color: #0f172a;
          background: #ffffff;
        }

        @media (max-width: 900px) {
          .meloPublicLanguageSwitcher {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}