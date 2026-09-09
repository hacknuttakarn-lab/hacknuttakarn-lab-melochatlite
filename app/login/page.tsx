'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthFrame, authStyles as styles } from '@/components/auth/AuthFrame';
import { useLocale } from '@/components/SiteProviders';
import { authCopy } from '@/i18n/authUi';
import { isSupabaseConfigured, signInWithPassword } from '@/lib/supabase/browser';

export default function LoginPage() {
  const { locale } = useLocale();
  const copy = authCopy[locale];
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const supabaseReady = isSupabaseConfigured();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabaseReady) return;
    setBusy(true);
    setError('');
    const { error: signInError } = await signInWithPassword(email.trim(), password);
    setBusy(false);
    if (signInError) {
      setError(signInError || copy.loginFailed);
      return;
    }
    router.replace('/account');
    router.refresh();
  }

  return (
    <AuthFrame title={copy.login} body={copy.webAccess}>
      <form className={styles.form} onSubmit={submit}>
        {!supabaseReady && <div className={styles.notice}>{copy.envMissing}</div>}
        {error && <div className={styles.error}>{error}</div>}
        <div className={styles.field}>
          <label htmlFor="email">{copy.email}</label>
          <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className={styles.field}>
          <div className={styles.row}><label htmlFor="password">{copy.password}</label><Link className={styles.link} href="/forgot-password">{copy.forgotPassword}</Link></div>
          <div className={styles.passwordWrap}>
            <input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button className={styles.reveal} type="button" onClick={() => setShowPassword((value) => !value)} aria-label="Show password">{showPassword ? '◉' : '○'}</button>
          </div>
        </div>
        <button className={styles.submit} type="submit" disabled={!supabaseReady || busy}>{busy ? copy.signingIn : copy.signIn}</button>
      </form>
      <p className={styles.bottomText}>{copy.noAccount}<Link href="/register">{copy.createAccount}</Link></p>
    </AuthFrame>
  );
}
