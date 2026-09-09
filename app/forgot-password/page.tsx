'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { AuthFrame, authStyles as styles } from '@/components/auth/AuthFrame';
import { useLocale } from '@/components/SiteProviders';
import { authCopy } from '@/i18n/authUi';
import { isSupabaseConfigured, sendPasswordReset } from '@/lib/supabase/browser';

export default function ForgotPasswordPage() {
  const { locale } = useLocale();
  const copy = authCopy[locale];
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const supabaseReady = isSupabaseConfigured();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabaseReady) return;
    setBusy(true); setError(''); setSuccess('');
    const { error: resetError } = await sendPasswordReset(email.trim(), `${window.location.origin}/reset-password`);
    setBusy(false);
    if (resetError) return setError(resetError || copy.resetFailed);
    setSuccess(copy.resetSent);
  }

  return (
    <AuthFrame title={copy.forgotTitle} body={copy.forgotBody}>
      <form className={styles.form} onSubmit={submit}>
        {!supabaseReady && <div className={styles.notice}>{copy.envMissing}</div>}
        {error && <div className={styles.error}>{error}</div>}
        {success && <div className={styles.success}>{success}</div>}
        <div className={styles.field}><label htmlFor="email">{copy.email}</label><input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
        <button className={styles.submit} type="submit" disabled={!supabaseReady || busy}>{busy ? copy.sending : copy.sendReset}</button>
      </form>
      <p className={styles.bottomText}><Link href="/login">{copy.backToLogin}</Link></p>
    </AuthFrame>
  );
}
