'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Header } from '@/components/Header';
import { AuthFrame, authStyles as styles } from '@/components/auth/AuthFrame';
import PublicLanguageSwitcher from '@/components/public/PublicLanguageSwitcher';
import { useLocale } from '@/components/SiteProviders';
import { authCopy } from '@/i18n/authUi';
import { isSupabaseConfigured, signInWithGoogle, signInWithPassword } from '@/lib/supabase/browser';
import { loadOwnProfile } from '@/components/profile/profileWebData';

function createNumericCaptcha() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function captchaDigitStyle(code: string, index: number) {
  const digit = Number(code[index] || 0);
  const rotate = ((digit * 7 + index * 5) % 15) - 7;
  const y = 43 + ((digit + index) % 3) * 4;
  return {
    x: 26 + index * 36,
    y,
    rotate,
  };
}

export default function LoginPage() {
  const { locale } = useLocale();
  const copy = authCopy[locale];
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [captchaCode, setCaptchaCode] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [googleBusy, setGoogleBusy] = useState(false);

  const captchaDigits = useMemo(
    () => (captchaCode || '000000').split('').map((_, index) => captchaDigitStyle(captchaCode, index)),
    [captchaCode],
  );

  const supabaseReady = isSupabaseConfigured();

  function refreshCaptcha() {
    setCaptchaCode(createNumericCaptcha());
    setCaptchaInput('');
  }

  useEffect(() => {
    refreshCaptcha();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabaseReady || busy) return;

    if (!captchaCode || !captchaInput.trim()) {
      setError(copy.captchaRequired);
      return;
    }

    if (captchaInput.trim() !== captchaCode) {
      setError(copy.captchaIncorrect);
      refreshCaptcha();
      return;
    }

    setBusy(true);
    setError('');

    const { error: signInError } = await signInWithPassword(
      email.trim(),
      password,
    );

    setBusy(false);

    if (signInError) {
      setError(signInError || copy.loginFailed);
      refreshCaptcha();
      return;
    }

    const profile = await loadOwnProfile();
    router.replace(profile.data?.profile?.onboarding_completed === false ? '/onboarding' : '/account');
    router.refresh();
  }

  async function signInGoogle() {
    if (!supabaseReady || googleBusy) return;
    setError('');
    setGoogleBusy(true);
    const result = await signInWithGoogle(`${window.location.origin}/onboarding`);
    if (result.error) {
      setError(result.error);
      setGoogleBusy(false);
    }
  }

  function renderLoginContent(prefix: 'desktop' | 'mobile') {
    const emailId = `${prefix}-email`;
    const passwordId = `${prefix}-password`;
    const captchaId = `${prefix}-captcha`;

    return (
      <>
        <button className={styles.googleButton} type="button" disabled={!supabaseReady || googleBusy} onClick={()=>void signInGoogle()}>
          <span className={styles.googleMark} aria-hidden="true">G</span>
          {locale==="th"?(googleBusy?"กำลังเชื่อมต่อ Google…":"เข้าสู่ระบบด้วย Google"):locale==="de"?(googleBusy?"Google wird geöffnet…":"Mit Google anmelden"):(googleBusy?"Opening Google…":"Continue with Google")}
        </button>
        <div className={styles.oauthDivider}><span>{locale==="th"?"หรือ":locale==="de"?"oder":"or"}</span></div>

        <form
          className={`${styles.form} ${prefix === 'mobile' ? 'mobileLoginForm' : ''}`}
          onSubmit={submit}
        >
          {!supabaseReady && <div className={styles.notice}>{copy.envMissing}</div>}
          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.field}>
            <label htmlFor={emailId}>{copy.email}</label>
            <input
              id={emailId}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div className={styles.field}>
            <div className={styles.row}>
              <label htmlFor={passwordId}>{copy.password}</label>
              <Link className={styles.link} href="/forgot-password">
                {copy.forgotPassword}
              </Link>
            </div>

            <div className={styles.passwordWrap}>
              <input
                id={passwordId}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <button
                className={styles.reveal}
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? copy.hidePassword : copy.showPassword}
              >
                {showPassword ? '◉' : '○'}
              </button>
            </div>
          </div>

          <div className={styles.field}>
            <div className={styles.row}>
              <label htmlFor={captchaId}>{copy.captchaLabel}</label>
              <button
                className="captchaRefreshButton"
                type="button"
                onClick={refreshCaptcha}
              >
                ↻ {copy.captchaRefresh}
              </button>
            </div>

            <div className="captchaGrid">
              <div className="captchaCode">
                {captchaCode ? (
                  <svg
                    className="captchaImage"
                    viewBox="0 0 240 72"
                    role="img"
                    aria-label={copy.captchaCodeAria}
                    preserveAspectRatio="xMidYMid meet"
                  >
                    <rect className="captchaImageBackground" x="0" y="0" width="240" height="72" rx="12" fill="transparent" />
                    <path className="captchaNoiseLine captchaNoiseLineA" d="M8 54 C48 12, 92 70, 138 25 S208 18, 232 50" fill="none" stroke="currentColor" />
                    <path className="captchaNoiseLine captchaNoiseLineB" d="M4 23 C48 58, 100 4, 146 50 S210 63, 236 20" fill="none" stroke="currentColor" />
                    <circle className="captchaNoiseDot" cx="17" cy="18" r="2.5" fill="currentColor" />
                    <circle className="captchaNoiseDot" cx="104" cy="14" r="2" fill="currentColor" />
                    <circle className="captchaNoiseDot" cx="218" cy="57" r="2.5" fill="currentColor" />
                    {captchaCode.split('').map((digit, index) => {
                      const style = captchaDigits[index];
                      return (
                        <text
                          key={`${digit}-${index}`}
                          className="captchaDigit"
                          x={style.x}
                          y={style.y}
                          transform={`rotate(${style.rotate} ${style.x} ${style.y})`}
                          textAnchor="middle"
                          fill="currentColor"
                        >
                          {digit}
                        </text>
                      );
                    })}
                  </svg>
                ) : (
                  <span className="captchaLoading">••••••</span>
                )}
              </div>
              <input
                id={captchaId}
                className="captchaInput"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                maxLength={6}
                value={captchaInput}
                onChange={(event) =>
                  setCaptchaInput(
                    event.target.value.replace(/\D/g, '').slice(0, 6),
                  )
                }
                placeholder={copy.captchaPlaceholder}
                required
              />
            </div>

            <small className="captchaHint">{copy.captchaHint}</small>
          </div>

          <button
            className={styles.submit}
            type="submit"
            disabled={!supabaseReady || busy || !captchaCode}
          >
            {busy ? copy.signingIn : copy.signIn}
          </button>
        </form>

        <p className={`${styles.bottomText} ${prefix === 'mobile' ? 'mobileLoginBottomText' : ''}`}>
          {copy.noAccount}
          <Link href="/register">{copy.createAccount}</Link>
        </p>
      </>
    );
  }

  return (
    <>
      <div className="desktopLoginOnly">
        <PublicLanguageSwitcher />
        <AuthFrame title={copy.login} body={copy.webAccess}>
          {renderLoginContent('desktop')}
        </AuthFrame>
      </div>

      <div className="mobileLoginOnly">
        <Header />
        <main className="mobileLoginMain">
          <section className="mobileLoginCard" aria-labelledby="mobile-login-title">
            <h1 id="mobile-login-title">{copy.login}</h1>
            {renderLoginContent('mobile')}
          </section>
        </main>
      </div>

      <style jsx global>{`
        .desktopLoginOnly {
          display: contents;
        }

        .mobileLoginOnly {
          display: none;
        }

        .captchaGrid {
          display: grid;
          grid-template-columns: 168px minmax(0, 1fr);
          gap: 12px;
          align-items: stretch;
        }

        .captchaCode {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 58px;
          overflow: hidden;
          border: 1px solid color-mix(in srgb, var(--primary) 28%, var(--border));
          border-radius: 14px;
          background: var(--primary-soft);
          color: var(--primary);
          user-select: none;
        }

        .captchaImage {
          display: block;
          width: 100%;
          height: 58px;
          color: inherit;
          pointer-events: none;
          user-select: none;
        }

        .captchaImageBackground {
          fill: transparent;
        }

        .captchaDigit {
          fill: currentColor;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 30px;
          font-weight: 900;
          letter-spacing: 0;
        }

        .captchaNoiseLine {
          fill: none;
          stroke: currentColor;
          stroke-width: 1.5;
          opacity: 0.22;
        }

        .captchaNoiseLineB {
          opacity: 0.14;
          stroke-dasharray: 5 7;
        }

        .captchaNoiseDot {
          fill: currentColor;
          opacity: 0.25;
        }

        .captchaLoading {
          color: var(--primary);
          font-size: 20px;
          font-weight: 900;
          letter-spacing: 7px;
        }

        .captchaInput {
          min-width: 0;
          text-align: center;
          letter-spacing: 4px;
          font-weight: 800;
        }

        .captchaRefreshButton {
          min-height: 32px;
          padding: 0 10px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--border);
          border-radius: 10px;
          background: var(--surface-2);
          color: var(--primary);
          box-shadow: 0 5px 16px color-mix(in srgb, var(--shadow) 70%, transparent);
          font: inherit;
          font-size: 12px;
          font-weight: 800;
          line-height: 1;
          cursor: pointer;
          transition:
            background .18s ease,
            border-color .18s ease,
            transform .18s ease;
        }

        .captchaRefreshButton:hover {
          border-color: color-mix(in srgb, var(--primary) 36%, var(--border));
          background: var(--primary-soft);
          transform: translateY(-1px);
        }

        .captchaRefreshButton:active {
          transform: translateY(0);
        }

        .captchaHint {
          display: block;
          margin-top: 8px;
          color: #778197;
          font-size: 12px;
          line-height: 1.45;
        }

        html[data-theme='dark'] .captchaLoading {
          color: var(--text);
        }

        html[data-theme='dark'] .captchaHint {
          color: var(--text-secondary);
        }

        @media (max-width: 760px) {
          .desktopLoginOnly {
            display: none;
          }

          .mobileLoginOnly {
            display: block;
            min-height: 100dvh;
            background: var(--background);
          }

          .mobileLoginMain {
            width: 100%;
            min-height: calc(100dvh - 66px);
            padding: 22px 16px 36px;
            display: flex;
            align-items: flex-start;
            justify-content: center;
          }

          .mobileLoginCard {
            width: min(100%, 480px);
            padding: 24px 20px 22px;
            border: 1px solid var(--border);
            border-radius: 24px;
            background: var(--surface);
            box-shadow: 0 18px 50px var(--shadow);
          }

          .mobileLoginCard h1 {
            margin: 0 0 22px;
            color: var(--text);
            font-size: clamp(30px, 9vw, 40px);
            line-height: 1.05;
            letter-spacing: -0.04em;
          }

          :global(.mobileLoginForm) {
            gap: 18px;
          }

          :global(.mobileLoginBottomText) {
            margin-top: 18px;
          }

          .captchaGrid {
            grid-template-columns: 1fr;
          }

          .captchaCode {
            min-height: 48px;
          }
        }
      `}</style>
    </>
  );
}
