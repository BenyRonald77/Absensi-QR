'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiRequest, AuthUser, clearSession, UserRole, roleHome } from '../../lib/api';
import styles from './role-landing.module.css';

export function RoleLanding({
  role,
  title,
  description,
}: {
  role: UserRole;
  title: string;
  description: string;
}) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    apiRequest<AuthUser>('/auth/me')
      .then((currentUser) => {
        if (currentUser.role !== role) {
          router.replace(roleHome(currentUser.role));
          return;
        }
        setUser(currentUser);
      })
      .catch(() => {
        clearSession();
        router.replace('/login');
      });
  }, [role, router]);

  async function logout() {
    await apiRequest<void>('/auth/logout', { method: 'POST' }).catch(() => undefined);
    clearSession();
    router.replace('/login');
  }

  if (!user) return <main className={styles.loading}>Memeriksa sesi masuk…</main>;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/">
          Absensi Training
        </Link>
        <button onClick={logout} type="button">
          Keluar
        </button>
      </header>
      <section className={styles.card}>
        <p className={styles.eyebrow}>{role}</p>
        <h1>{title}</h1>
        <p>{description}</p>
        <div className={styles.userInfo}>
          <strong>{user.nama}</strong>
          <span>{user.email}</span>
        </div>
        <p className={styles.placeholder}>
          Halaman ini akan dilengkapi pada tahap fitur berikutnya.
        </p>
      </section>
    </main>
  );
}
