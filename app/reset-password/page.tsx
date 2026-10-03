'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { AuthFrame, authStyles as styles } from '@/components/auth/AuthFrame';
import { useLocale } from '@/components/SiteProviders';
import { authCopy } from '@/i18n/authUi';
import { isSupabaseConfigured, updatePassword } from '@/lib/supabase/browser';

export default function ResetPasswordPage() {
  const { locale } = useLocale();
  const copy = authCopy[locale];
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const supabaseReady = isSupabaseConfigured();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(''); setSuccess('');
    if (!supabaseReady) return;
    if (password.length < 6) return setError(copy.passwordTooShort);
    if (password !== confirmPassword) return setError(copy.passwordMismatch);
    setBusy(true);
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
        <button className={styles.submit} type="submit" disabled={!supabaseReady || busy}>{busy ? copy.updating : copy.updatePassword}</button>
      </form>
      <p className={styles.bottomText}><Link href="/login">{copy.backToLogin}</Link></p>
    </AuthFrame>
  );
}
