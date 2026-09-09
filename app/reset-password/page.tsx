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

  return (
    <AuthFrame title={copy.resetTitle} body={copy.resetBody}>
      <form className={styles.form} onSubmit={submit}>
        {!supabaseReady && <div className={styles.notice}>{copy.envMissing}</div>}
        {error && <div className={styles.error}>{error}</div>}
        {success && <div className={styles.success}>{success}</div>}
        <div className={styles.field}><label htmlFor="password">{copy.newPassword}</label><input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} /></div>
        <div className={styles.field}><label htmlFor="confirmPassword">{copy.confirmPassword}</label><input id="confirmPassword" type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} /></div>
        <button className={styles.submit} type="submit" disabled={!supabaseReady || busy}>{busy ? copy.updating : copy.updatePassword}</button>
      </form>
      <p className={styles.bottomText}><Link href="/login">{copy.backToLogin}</Link></p>
    </AuthFrame>
  );
}
