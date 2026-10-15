'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AuthFrame, authStyles as styles } from '@/components/auth/AuthFrame';
import { useLocale } from '@/components/SiteProviders';
import { authCopy } from '@/i18n/authUi';
import { isSupabaseConfigured, updatePassword, verifyRecoveryTokenHash } from '@/lib/supabase/browser';

function recoveryCopy(locale: string) {
  if (locale === 'th') {
    return {
      invalid: 'ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้องหรือหมดอายุแล้ว กรุณาขอลิงก์ใหม่',
      missing: 'ไม่พบข้อมูลยืนยันสำหรับรีเซ็ตรหัสผ่าน กรุณาขอลิงก์ใหม่',
      verifying: 'กำลังตรวจสอบลิงก์รีเซ็ตรหัสผ่าน…',
      requestNew: 'ขอลิงก์รีเซ็ตรหัสผ่านใหม่',
    };
  }
  if (locale === 'de') {
    return {
      invalid: 'Der Link zum Zurücksetzen des Passworts ist ungültig oder abgelaufen. Bitte fordere einen neuen Link an.',
      missing: 'Es wurden keine gültigen Wiederherstellungsdaten gefunden. Bitte fordere einen neuen Link an.',
      verifying: 'Link zum Zurücksetzen des Passworts wird geprüft…',
      requestNew: 'Neuen Link anfordern',
    };
  }
  return {
    invalid: 'This password reset link is invalid or has expired. Please request a new link.',
    missing: 'No valid password recovery information was found. Please request a new link.',
    verifying: 'Verifying password reset link…',
    requestNew: 'Request a new reset link',
  };
}

export default function ResetPasswordPage() {
  const { locale } = useLocale();
  const copy = authCopy[locale];
  const recovery = useMemo(() => recoveryCopy(locale), [locale]);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const supabaseReady = isSupabaseConfigured();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const query = new URLSearchParams(window.location.search);
    const errorCode = (hash.get('error_code') || query.get('error_code') || '').toLowerCase();
    const authError = hash.get('error') || query.get('error');
    if (errorCode === 'otp_expired' || authError === 'access_denied') {
      setError(recovery.invalid);
    }
  }, [recovery.invalid]);

  async function establishRecoverySession() {
    if (typeof window === 'undefined') return { ok: false, message: recovery.missing };

    // Backward compatibility for old Supabase recovery links that return an
    // authenticated recovery session in the URL hash.
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    if (hash.get('access_token') && hash.get('refresh_token')) return { ok: true, message: '' };

    // V51 recovery emails land on Melo Chat with a token_hash. Do not exchange
    // it on page load: link scanners can perform GET requests automatically.
    // The one-time token is verified only when the real user submits a new password.
    const query = new URLSearchParams(window.location.search);
    const type = query.get('type');
    const tokenHash = query.get('token_hash');
    if (!tokenHash || (type && type !== 'recovery')) return { ok: false, message: recovery.missing };

    const verified = await verifyRecoveryTokenHash(tokenHash);
    if (verified.error || !verified.data) return { ok: false, message: recovery.invalid };

    window.history.replaceState({}, document.title, '/reset-password');
    return { ok: true, message: '' };
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');
    if (!supabaseReady) return;
    if (password.length < 6) return setError(copy.passwordTooShort);
    if (password !== confirmPassword) return setError(copy.passwordMismatch);

    setBusy(true);
    const recoverySession = await establishRecoverySession();
    if (!recoverySession.ok) {
      setBusy(false);
      setError(recoverySession.message);
      return;
    }

    const { error: updateError } = await updatePassword(password);
    setBusy(false);
    if (updateError) return setError(updateError || copy.resetFailed);
    setSuccess(copy.passwordUpdated);
  }

  const visibilityCopy = locale === 'th'
    ? { show: 'แสดงรหัสผ่าน', hide: 'ซ่อนรหัสผ่าน' }
    : locale === 'de'
      ? { show: 'Passwort anzeigen', hide: 'Passwort ausblenden' }
      : { show: 'Show password', hide: 'Hide password' };

  return (
    <AuthFrame title={copy.resetTitle} body={copy.resetBody} mobileCardOnly centered hideKicker>
      <form className={styles.form} onSubmit={submit}>
        {!supabaseReady && <div className={styles.notice}>{copy.envMissing}</div>}
        {error && <div className={styles.error}>{error}</div>}
        {success && <div className={styles.success}>{success}</div>}
        <div className={styles.field}>
          <label htmlFor="password">{copy.newPassword}</label>
          <div className={styles.passwordField}>
            <input id="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            <button className={styles.passwordToggle} type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? visibilityCopy.hide : visibilityCopy.show} title={showPassword ? visibilityCopy.hide : visibilityCopy.show}>
              {showPassword ? (
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 10.7a2 2 0 002.7 2.7M9.9 4.3A10.8 10.8 0 0112 4c5.5 0 9.5 5.1 9.5 8 0 1.1-.6 2.5-1.8 3.9M6.2 6.2C3.9 7.7 2.5 10.1 2.5 12c0 2.9 4 8 9.5 8 1.8 0 3.4-.5 4.8-1.2"/></svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12S6 5 12 5s9.5 7 9.5 7S18 19 12 19 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/></svg>
              )}
            </button>
          </div>
        </div>
        <div className={styles.field}>
          <label htmlFor="confirmPassword">{copy.confirmPassword}</label>
          <div className={styles.passwordField}>
            <input id="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} />
            <button className={styles.passwordToggle} type="button" onClick={() => setShowConfirmPassword((value) => !value)} aria-label={showConfirmPassword ? visibilityCopy.hide : visibilityCopy.show} title={showConfirmPassword ? visibilityCopy.hide : visibilityCopy.show}>
              {showConfirmPassword ? (
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 10.7a2 2 0 002.7 2.7M9.9 4.3A10.8 10.8 0 0112 4c5.5 0 9.5 5.1 9.5 8 0 1.1-.6 2.5-1.8 3.9M6.2 6.2C3.9 7.7 2.5 10.1 2.5 12c0 2.9 4 8 9.5 8 1.8 0 3.4-.5 4.8-1.2"/></svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12S6 5 12 5s9.5 7 9.5 7S18 19 12 19 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/></svg>
              )}
            </button>
          </div>
        </div>
        <button className={styles.submit} type="submit" disabled={!supabaseReady || busy}>{busy ? recovery.verifying : copy.updatePassword}</button>
      </form>
      <p className={styles.bottomText}>
        <Link href="/forgot-password">{recovery.requestNew}</Link>
        {' · '}
        <Link href="/login">{copy.backToLogin}</Link>
      </p>
    </AuthFrame>
  );
}
