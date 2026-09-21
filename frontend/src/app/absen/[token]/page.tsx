'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiRequest, AuthUser } from '../../../lib/api';
import styles from './page.module.css';

interface TokenInfo {
  token: string;
  expiredAt: string;
  sesiId: string;
  waktuBuka: string | null;
  training: { id: string; nama: string; deskripsi?: string | null };
  trainer: { id: string; nama: string };
}

interface AttendanceStatus {
  eligible: boolean;
  alreadyAttended: boolean;
  message: string;
  attendance?: { status: string; waktuScan: string } | null;
}

type PageState = 'loading' | 'ready' | 'success' | 'error';

export default function AttendancePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AttendanceStatus | null>(null);
  const [pageState, setPageState] = useState<PageState>('loading');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const info = await apiRequest<TokenInfo>(`/absen/${token}`);
        if (!active) return;
        setTokenInfo(info);
        let currentUser: AuthUser;
        try {
          currentUser = await apiRequest<AuthUser>('/auth/me');
        } catch {
          router.replace(`/login?returnTo=${encodeURIComponent(`/absen/${token}`)}`);
          return;
        }
        if (currentUser.role !== 'KARYAWAN') {
          setUser(currentUser);
          setError('Akun Trainer atau Admin tidak dapat mencatat kehadiran sebagai peserta.');
          setPageState('error');
          return;
        }
        setUser(currentUser);
        const currentStatus = await apiRequest<AttendanceStatus>(`/absen/${token}/status`);
        if (!active) return;
        setStatus(currentStatus);
        setPageState('ready');
      } catch (requestError) {
        if (!active) return;
        setError(
          requestError instanceof Error ? requestError.message : 'QR tidak dapat digunakan.',
        );
        setPageState('error');
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [router, token]);

  function requestLocation(): Promise<{ latitude?: number; longitude?: number }> {
    if (!navigator.geolocation) return Promise.resolve({});
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) =>
          resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
        () => resolve({}),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
      );
    });
  }

  async function confirmAttendance() {
    setSubmitting(true);
    setError('');
    try {
      const location = await requestLocation();
      await apiRequest(`/absen/${token}/confirm`, {
        method: 'POST',
        body: JSON.stringify(location),
      });
      setPageState('success');
      setStatus((current) =>
        current
          ? { ...current, alreadyAttended: true, message: 'Kehadiran Anda sudah tercatat.' }
          : current,
      );
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Kehadiran gagal dicatat.');
    } finally {
      setSubmitting(false);
    }
  }

  const expiresLabel = tokenInfo
    ? new Intl.DateTimeFormat('id-ID', { timeStyle: 'short' }).format(new Date(tokenInfo.expiredAt))
    : '';

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/">
          Absensi Training
        </Link>
        <span className={styles.secureLabel}>ABSENSI TRAINING</span>
      </header>
      <section className={styles.card}>
        {pageState === 'loading' && <div className={styles.loading}>Memeriksa QR…</div>}
        {tokenInfo && (
          <>
            <p className={styles.eyebrow}>KONFIRMASI KEHADIRAN</p>
            <h1>{tokenInfo.training.nama}</h1>
            <p className={styles.description}>
              {tokenInfo.training.deskripsi || 'Konfirmasi kehadiran Anda untuk sesi training ini.'}
            </p>
            <div className={styles.sessionMeta}>
              <span>Trainer</span>
              <strong>{tokenInfo.trainer.nama}</strong>
              <small>QR berlaku sampai {expiresLabel}</small>
            </div>
          </>
        )}
        {pageState === 'error' && (
          <div className={styles.stateError}>
            <strong>QR tidak dapat digunakan</strong>
            <p>{error || 'Silakan scan QR terbaru yang tampil di layar Trainer.'}</p>
            {!user && (
              <Link
                className={styles.secondaryButton}
                href={`/login?returnTo=${encodeURIComponent(`/absen/${token}`)}`}
              >
                Masuk untuk melanjutkan
              </Link>
            )}
          </div>
        )}
        {pageState === 'ready' && status && (
          <>
            {status.alreadyAttended ? (
              <div className={styles.stateSuccess}>
                <strong>Anda sudah tercatat hadir</strong>
                <p>{status.message}</p>
              </div>
            ) : !status.eligible ? (
              <div className={styles.stateError}>
                <strong>Anda tidak terdaftar</strong>
                <p>{status.message}</p>
                <small className={styles.stateHint}>
                  Minta Admin menambahkan akun Anda ke peserta sesi sebelum sesi dibuka.
                </small>
              </div>
            ) : (
              <div className={styles.confirmBox}>
                <p>
                  Anda masuk sebagai <strong>{user?.nama}</strong>. Tekan tombol untuk mencatat
                  kehadiran.
                </p>
                <button
                  disabled={submitting}
                  onClick={() => void confirmAttendance()}
                  type="button"
                >
                  {submitting ? 'Mencatat kehadiran…' : 'Konfirmasi kehadiran'}
                </button>
                <small>
                  Lokasi akan diminta oleh browser. Jika izin ditolak, kehadiran tetap dicatat tanpa
                  lokasi.
                </small>
              </div>
            )}
          </>
        )}
        {pageState === 'success' && (
          <div className={styles.stateSuccess}>
            <strong>Kehadiran berhasil dicatat</strong>
            <p>Waktu dan status kehadiran Anda sudah tersimpan. Anda dapat menutup halaman ini.</p>
          </div>
        )}
        {error && pageState !== 'error' && (
          <p className={styles.inlineError} role="alert">
            {error}
          </p>
        )}
      </section>
    </main>
  );
}
