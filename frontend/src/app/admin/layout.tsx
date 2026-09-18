'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';
import { apiRequest, AuthUser, clearSession, roleHome } from '../../lib/api';
import styles from './admin.module.css';

const navigation = [
  { href: '/admin', label: 'Ringkasan' },
  { href: '/admin/karyawan', label: 'Karyawan' },
  { href: '/admin/training', label: 'Training' },
  { href: '/admin/departemen', label: 'Departemen' },
  { href: '/admin/sesi', label: 'Sesi' },
  { href: '/admin/compliance', label: 'Compliance' },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let current = true;
    apiRequest<AuthUser>('/auth/me')
      .then((currentUser) => {
        if (!current) return;
        if (currentUser.role !== 'ADMIN') {
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
      current = false;
    };
  }, [pathname, router]);

  async function logout() {
    await apiRequest<void>('/auth/logout', { method: 'POST' }).catch(() => undefined);
    clearSession();
    router.replace('/login');
  }

  if (!ready || !user) {
    return <main className={styles.loading}>Memeriksa sesi masuk…</main>;
  }

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <Link className={styles.brand} href="/admin">
          <span className={styles.brandMark}>AT</span>
          <span>Absensi Training</span>
        </Link>
        <p className={styles.navHeading}>ADMINISTRASI</p>
        <nav className={styles.navigation}>
          {navigation.map((item) => (
            <Link
              aria-current={pathname === item.href ? 'page' : undefined}
              className={pathname === item.href ? styles.activeLink : styles.navLink}
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className={styles.sidebarFooter}>
          <div className={styles.userBadge}>{user.nama.slice(0, 1).toUpperCase()}</div>
          <div className={styles.userInfo}>
            <strong>{user.nama}</strong>
            <span>ADMIN</span>
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
