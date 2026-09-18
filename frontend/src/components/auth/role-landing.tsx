'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  apiRequest,
  AuthUser,
  clearSession,
  ComplianceSummary,
  UserRole,
  roleHome,
} from '../../lib/api';
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
  const [compliance, setCompliance] = useState<ComplianceSummary | null>(null);
  const [complianceError, setComplianceError] = useState('');

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

  useEffect(() => {
    if (!user || role !== 'KARYAWAN') return;
    let current = true;
    apiRequest<ComplianceSummary>('/compliance/me')
      .then((summary) => {
        if (current) setCompliance(summary);
      })
      .catch((error: unknown) => {
        if (current)
          setComplianceError(error instanceof Error ? error.message : 'Progres belum tersedia.');
      });
    return () => {
      current = false;
    };
  }, [role, user]);

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
        {role === 'KARYAWAN' && (
          <section aria-label="Progres compliance training" className={styles.compliance}>
            <div className={styles.complianceHeading}>
              <div>
                <span className={styles.complianceLabel}>TAHUN {compliance?.year ?? '—'}</span>
                <h2>Progres jam training</h2>
              </div>
              {compliance && (
                <span
                  className={
                    compliance.status === 'SUDAH_MEMENUHI' ? styles.compliant : styles.notCompliant
                  }
                >
                  {compliance.status === 'SUDAH_MEMENUHI' ? 'Memenuhi' : 'Belum memenuhi'}
                </span>
              )}
            </div>
            {compliance ? (
              <>
                <div className={styles.progressTrack}>
                  <div
                    className={styles.progressValue}
                    style={{ width: `${compliance.progressPercent}%` }}
                  />
                </div>
                <div className={styles.progressMeta}>
                  <strong>
                    {compliance.totalHours.toFixed(2)} / {compliance.targetHours.toFixed(2)} jam
                  </strong>
                  <span>{compliance.progressPercent}%</span>
                </div>
                <p className={styles.sessionCount}>
                  {compliance.attendedSessionsCount} sesi berstatus hadir
                </p>
              </>
            ) : (
              <p className={styles.sessionCount}>{complianceError || 'Memuat progres…'}</p>
            )}
          </section>
        )}
        {role !== 'KARYAWAN' && (
          <p className={styles.placeholder}>
            Halaman ini akan dilengkapi pada tahap fitur berikutnya.
          </p>
        )}
      </section>
    </main>
  );
}
