'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';
import { apiRequest, AuthUser, clearSession, roleHome } from '../../lib/api';
import styles from './trainer.module.css';

export default function TrainerLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    apiRequest<AuthUser>('/auth/me')
      .then((currentUser) => {
        if (!active) return;
        if (currentUser.role !== 'TRAINER') {
          router.replace(roleHome(currentUser.role));
          return;
        }
        setUser(currentUser);
        setReady(true);
      })
      .catch(() => {
        clearSession();
        router.replace(`/login?returnTo=${encodeURIComponent(pathname)}`);
      });
    return () => {
      active = false;
    };
  }, [pathname, router]);

  async function logout() {
    await apiRequest<void>('/auth/logout', { method: 'POST' }).catch(() => undefined);
    clearSession();
    router.replace('/login');
  }

  if (!ready || !user) return <main className={styles.loading}>Memeriksa sesi Trainer…</main>;

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <Link className={styles.brand} href="/trainer">
          <span className={styles.brandMark}>AT</span>
          <span>Absensi Training</span>
        </Link>
        <p className={styles.navHeading}>RUANG TRAINER</p>
        <nav className={styles.navigation}>
          <Link
            aria-current={pathname === '/trainer' ? 'page' : undefined}
            className={pathname === '/trainer' ? styles.activeLink : styles.navLink}
            href="/trainer"
          >
            Sesi saya
          </Link>
        </nav>
        <div className={styles.sidebarFooter}>
          <div className={styles.userBadge}>{user.nama.slice(0, 1).toUpperCase()}</div>
          <div className={styles.userInfo}>
            <strong>{user.nama}</strong>
            <span>TRAINER</span>
          </div>
          <button aria-label="Keluar" className={styles.logout} onClick={logout} type="button">
            Keluar
          </button>
        </div>
      </aside>
      <main className={styles.content}>{children}</main>
    </div>
  );
}
