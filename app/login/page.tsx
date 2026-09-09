'use client';

import Link from 'next/link';
import {
  FormEvent,
  useEffect,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';

import {
  AuthFrame,
  authStyles as styles,
} from '@/components/auth/AuthFrame';

import PublicLanguageSwitcher from '@/components/public/PublicLanguageSwitcher';

import { useLocale } from '@/components/SiteProviders';
import { authCopy } from '@/i18n/authUi';

import {
  isSupabaseConfigured,
  signInWithPassword,
} from '@/lib/supabase/browser';

function createNumericCaptcha() {
  return String(
    Math.floor(
      100000 +
        Math.random() * 900000,
    ),
  );
}

export default function LoginPage() {
  const { locale } = useLocale();

  const copy =
    authCopy[locale];

  const router =
    useRouter();

  const [email, setEmail] =
    useState('');

  const [
    password,
    setPassword,
  ] = useState('');

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    captchaCode,
    setCaptchaCode,
  ] = useState('');

  const [
    captchaInput,
    setCaptchaInput,
  ] = useState('');

  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState('');

  const supabaseReady =
    isSupabaseConfigured();

  function refreshCaptcha() {
    setCaptchaCode(
      createNumericCaptcha(),
    );

    setCaptchaInput('');
  }

  useEffect(() => {
    refreshCaptcha();
  }, []);

  async function submit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      !supabaseReady ||
      busy
    ) {
      return;
    }

    if (
      !captchaCode ||
      !captchaInput.trim()
    ) {
      setError(
        copy.captchaRequired,
      );

      return;
    }

    if (
      captchaInput.trim() !==
      captchaCode
    ) {
      setError(
        copy.captchaIncorrect,
      );

      refreshCaptcha();

      return;
    }

    setBusy(true);

    setError('');

    const {
      error: signInError,
    } =
      await signInWithPassword(
        email.trim(),
        password,
      );

    setBusy(false);

    if (signInError) {
      setError(
        signInError ||
          copy.loginFailed,
      );

      refreshCaptcha();

      return;
    }

    router.replace(
      '/account',
    );

    router.refresh();
  }

  return (
    <>
      <PublicLanguageSwitcher />

      <AuthFrame
        title={copy.login}
        body={copy.webAccess}
      >
        <form
          className={styles.form}
          onSubmit={submit}
        >
          {!supabaseReady && (
            <div
              className={
                styles.notice
              }
            >
              {copy.envMissing}
            </div>
          )}

          {error && (
            <div
              className={
                styles.error
              }
            >
              {error}
            </div>
          )}

          <div
            className={
              styles.field
            }
          >
            <label
              htmlFor="email"
            >
              {copy.email}
            </label>

            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(
                event,
              ) =>
                setEmail(
                  event.target
                    .value,
                )
              }
              required
            />
          </div>

          <div
            className={
              styles.field
            }
          >
            <div
              className={
                styles.row
              }
            >
              <label
                htmlFor="password"
              >
                {
                  copy.password
                }
              </label>

              <Link
                className={
                  styles.link
                }
                href="/forgot-password"
              >
                {
                  copy.forgotPassword
                }
              </Link>
            </div>

            <div
              className={
                styles.passwordWrap
              }
            >
              <input
                id="password"
                type={
                  showPassword
                    ? 'text'
                    : 'password'
                }
                autoComplete="current-password"
                value={
                  password
                }
                onChange={(
                  event,
                ) =>
                  setPassword(
                    event
                      .target
                      .value,
                  )
                }
                required
              />

              <button
                className={
                  styles.reveal
                }
                type="button"
                onClick={() =>
                  setShowPassword(
                    (value) =>
                      !value,
                  )
                }
                aria-label={
                  showPassword
                    ? copy.hidePassword
                    : copy.showPassword
                }
              >
                {showPassword
                  ? '◉'
                  : '○'}
              </button>
            </div>
          </div>

          <div
            className={
              styles.field
            }
          >
            <div
              className={
                styles.row
              }
            >
              <label
                htmlFor="captcha"
              >
                {
                  copy.captchaLabel
                }
              </label>

              <button
                className="captchaRefreshButton"
                type="button"
                onClick={
                  refreshCaptcha
                }
              >
                ↻{' '}
                {
                  copy.captchaRefresh
                }
              </button>
            </div>

            <div className="captchaGrid">
              <div
                className="captchaCode"
                aria-label={
                  copy.captchaCodeAria
                }
              >
                {captchaCode ||
                  '••••••'}
              </div>

              <input
                id="captcha"
                className="captchaInput"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                maxLength={6}
                value={
                  captchaInput
                }
                onChange={(
                  event,
                ) =>
                  setCaptchaInput(
                    event.target.value
                      .replace(
                        /\D/g,
                        '',
                      )
                      .slice(
                        0,
                        6,
                      ),
                  )
                }
                placeholder={
                  copy.captchaPlaceholder
                }
                required
              />
            </div>

            <small className="captchaHint">
              {
                copy.captchaHint
              }
            </small>
          </div>

          <button
            className={
              styles.submit
            }
            type="submit"
            disabled={
              !supabaseReady ||
              busy ||
              !captchaCode
            }
          >
            {busy
              ? copy.signingIn
              : copy.signIn}
          </button>
        </form>

        <p
          className={
            styles.bottomText
          }
        >
          {copy.noAccount}

          <Link href="/register">
            {
              copy.createAccount
            }
          </Link>
        </p>
      </AuthFrame>

      <style jsx>{`
        .captchaGrid {
          display: grid;

          grid-template-columns:
            168px minmax(
              0,
              1fr
            );

          gap: 12px;

          align-items: stretch;
        }

        .captchaCode {
          display: flex;

          align-items: center;
          justify-content: center;

          min-height: 50px;

          border: 1px solid
            rgba(
              59,
              130,
              246,
              0.22
            );

          border-radius: 14px;

          background:
            repeating-linear-gradient(
              -14deg,
              rgba(
                  59,
                  130,
                  246,
                  0.04
                )
                0,
              rgba(
                  59,
                  130,
                  246,
                  0.04
                )
                8px,
              transparent 8px,
              transparent 16px
            ),
            #eef5ff;

          color: #172033;

          font-size: 22px;
          font-weight: 900;

          letter-spacing: 8px;

          user-select: none;
        }

        .captchaInput {
          min-width: 0;

          text-align: center;

          letter-spacing: 4px;

          font-weight: 800;
        }

        .captchaRefreshButton {
          border: 0;

          padding: 0;

          background: transparent;

          color: #3b82f6;

          font: inherit;

          font-size: 12px;
          font-weight: 800;

          cursor: pointer;
        }

        .captchaRefreshButton:hover {
          text-decoration: underline;
        }

        .captchaHint {
          display: block;

          margin-top: 8px;

          color: #778197;

          font-size: 12px;

          line-height: 1.45;
        }

        :global(
            html[data-theme='dark']
          )
          .captchaCode {
          border-color:
            rgba(
              96,
              165,
              250,
              0.28
            );

          background:
            repeating-linear-gradient(
              -14deg,
              rgba(
                  96,
                  165,
                  250,
                  0.06
                )
                0,
              rgba(
                  96,
                  165,
                  250,
                  0.06
                )
                8px,
              transparent 8px,
              transparent 16px
            ),
            #1e293b;

          color: #f8fafc;
        }

        :global(
            html[data-theme='dark']
          )
          .captchaHint {
          color: #a8b2c5;
        }

        @media (
          max-width: 560px
        ) {
          .captchaGrid {
            grid-template-columns:
              1fr;
          }

          .captchaCode {
            min-height: 48px;
          }
        }
      `}</style>
    </>
  );
}