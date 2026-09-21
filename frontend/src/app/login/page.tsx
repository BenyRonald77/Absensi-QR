'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { AuthSession, getApiBaseUrl, roleHome, storeSession } from '../../lib/api';
import styles from './login.module.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const response = await fetch(`${getApiBaseUrl()}/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const result = (await response.json()) as AuthSession | { message?: string | string[] };
      if (!response.ok) {
        const message = 'message' in result ? result.message : undefined;
        throw new Error(Array.isArray(message) ? message.join(', ') : message || 'Login gagal.');
      }

      const session = result as AuthSession;
      storeSession(session);
      const requestedPath = new URLSearchParams(window.location.search).get('returnTo');
      const safeReturnPath = requestedPath?.startsWith('/') && !requestedPath.startsWith('//');
      window.location.assign(
        safeReturnPath && requestedPath ? requestedPath : roleHome(session.user.role),
      );
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Login gagal.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <Link className={styles.brand} href="/">
          <span className={styles.brandMark}>AT</span>
          <span>Absensi Training</span>
        </Link>
        <p className={styles.eyebrow}>PORTAL INTERNAL</p>
        <h1>Masuk ke akun</h1>
        <p className={styles.description}>Gunakan email dan kata sandi akun perusahaan Anda.</p>

        <form className={styles.form} onSubmit={handleSubmit} suppressHydrationWarning>
          <label htmlFor="email">Email</label>
          <input
            autoComplete="username"
            id="email"
            onChange={(event) => setEmail(event.target.value)}
            required
            suppressHydrationWarning
            type="email"
            value={email}
          />

          <label htmlFor="password">Kata sandi</label>
          <input
            autoComplete="current-password"
            id="password"
            onChange={(event) => setPassword(event.target.value)}
            required
            suppressHydrationWarning
            type="password"
            value={password}
          />

          {error && <p className={styles.error}>{error}</p>}

          <button disabled={submitting} type="submit">
            {submitting ? 'Memeriksa…' : 'Masuk'}
          </button>
        </form>

        <p className={styles.demo}>
          Akun demo tersedia di README. Kata sandi demo: <strong>TrainingDemo123!</strong>
        </p>
      </section>
    </main>
  );
}
