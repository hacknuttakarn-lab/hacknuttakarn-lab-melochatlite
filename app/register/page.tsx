'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { AuthFrame, authStyles as styles } from '@/components/auth/AuthFrame';
import { useLocale } from '@/components/SiteProviders';
import { authCopy } from '@/i18n/authUi';
import { isSupabaseConfigured, signInWithGoogle, signUpWithPassword } from '@/lib/supabase/browser';

export default function RegisterPage() {
  const { locale } = useLocale();
  const copy = authCopy[locale];
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [googleBusy, setGoogleBusy] = useState(false);
  const supabaseReady = isSupabaseConfigured();

  async function signUpGoogle() {
    if (!supabaseReady || googleBusy) return;
    setError('');
    setSuccess('');
    setGoogleBusy(true);
    const result = await signInWithGoogle(`${window.location.origin}/onboarding`);
    if (result.error) {
      const message = result.code === "provider_disabled"
        ? (locale === "th"
          ? "ยังไม่ได้เปิดใช้งาน Google Login ใน Supabase กรุณาตั้งค่า Google Provider ก่อนใช้งาน"
          : locale === "de"
            ? "Google Login ist in Supabase noch nicht aktiviert. Bitte zuerst den Google-Provider konfigurieren."
            : "Google Login is not enabled in Supabase yet. Please configure the Google provider first.")
        : (locale === "th"
          ? "ไม่สามารถเชื่อมต่อ Google Login ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง"
          : locale === "de"
            ? "Google Login ist derzeit nicht verfügbar. Bitte versuche es erneut."
            : "Google Login is currently unavailable. Please try again.");
      setError(message);
      setGoogleBusy(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');
    if (!supabaseReady) return;
    if (password.length < 6) return setError(copy.passwordTooShort);
    if (password !== confirmPassword) return setError(copy.passwordMismatch);
    setBusy(true);
    const { error: signUpError } = await signUpWithPassword(email.trim(), password, `${window.location.origin}/onboarding`);
    setBusy(false);
    if (signUpError) return setError(signUpError || copy.registerFailed);
    setSuccess(copy.checkEmail);
  }

  return (
    <AuthFrame title={copy.registerTitle} body={copy.registerBody}>
      <button className={styles.googleButton} type="button" disabled={!supabaseReady || googleBusy} onClick={()=>void signUpGoogle()}>
        <span className={styles.googleMark} aria-hidden="true">G</span>
        {locale==="th"?(googleBusy?"กำลังเชื่อมต่อ Google…":"สมัครด้วย Google"):locale==="de"?(googleBusy?"Google wird geöffnet…":"Mit Google registrieren"):(googleBusy?"Opening Google…":"Sign up with Google")}
      </button>
      <div className={styles.oauthDivider}><span>{locale==="th"?"หรือ":locale==="de"?"oder":"or"}</span></div>
      <form className={styles.form} onSubmit={submit}>
        {!supabaseReady && <div className={styles.notice}>{copy.envMissing}</div>}
        {error && <div className={styles.error}>{error}</div>}
        {success && <div className={styles.success}>{success}</div>}
        <div className={styles.field}><label htmlFor="email">{copy.email}</label><input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
        <div className={styles.field}><label htmlFor="password">{copy.password}</label><div className={styles.passwordField}><input id="password" type={showPassword ? "text" : "password"} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} /><button type="button" className={styles.passwordToggle} onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword}>{showPassword ? "◉" : "◎"}</button></div></div>
        <div className={styles.field}><label htmlFor="confirmPassword">{copy.confirmPassword}</label><div className={styles.passwordField}><input id="confirmPassword" type={showConfirmPassword ? "text" : "password"} autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} /><button type="button" className={styles.passwordToggle} onClick={() => setShowConfirmPassword((value) => !value)} aria-label={showConfirmPassword ? "Hide password" : "Show password"} aria-pressed={showConfirmPassword}>{showConfirmPassword ? "◉" : "◎"}</button></div></div>
        <button className={styles.submit} type="submit" disabled={!supabaseReady || busy}>{busy ? copy.registering : copy.createAccount}</button>
      </form>
      <p className={styles.bottomText}>{copy.haveAccount}<Link href="/login">{copy.login}</Link></p>
    </AuthFrame>
  );
}
