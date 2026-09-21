'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { BrowserQRCodeReader, IScannerControls } from '@zxing/browser';
import { apiRequest, AuthUser, clearSession, roleHome } from '../../../lib/api';
import styles from './page.module.css';

function attendancePath(value: string) {
  try {
    const parsed = new URL(value.trim(), window.location.origin);
    const match = parsed.pathname.match(/^\/absen\/([^/]+)$/);
    return match ? `/absen/${match[1]}` : null;
  } catch {
    return null;
  }
}

export default function EmployeeScannerPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [cameraError, setCameraError] = useState('');
  const [manualValue, setManualValue] = useState('');
  const [manualError, setManualError] = useState('');

  useEffect(() => {
    let active = true;
    apiRequest<AuthUser>('/auth/me')
      .then((currentUser) => {
        if (!active) return;
        if (currentUser.role !== 'KARYAWAN') {
          router.replace(roleHome(currentUser.role));
          return;
        }
        setUser(currentUser);
      })
      .catch(() => {
        clearSession();
        router.replace('/login?returnTo=/karyawan/scan');
      })
      .finally(() => {
        if (active) setCheckingAuth(false);
      });
    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!user || !videoElement) return;
    let active = true;
    const reader = new BrowserQRCodeReader();

    async function startCamera() {
      if (!window.isSecureContext && window.location.hostname !== 'localhost') {
        setCameraError(
          'Kamera dalam browser memerlukan HTTPS. Untuk testing HTTP lokal, gunakan kamera HP biasa atau masukkan link QR di bawah.',
        );
        return;
      }
      try {
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: 'environment' } }, audio: false },
          videoElement as HTMLVideoElement,
          (result) => {
            if (!active || !result) return;
            const path = attendancePath(result.getText());
            if (!path) {
              setCameraError('QR ini bukan QR absensi training. Arahkan kamera ke QR Trainer.');
              return;
            }
            controls.stop();
            controlsRef.current = null;
            router.push(path);
          },
        );
        if (!active) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
      } catch {
        if (active) {
          setCameraError(
            'Kamera tidak dapat dibuka. Izinkan akses kamera atau gunakan kolom link manual di bawah.',
          );
        }
      }
    }

    void startCamera();
    return () => {
      active = false;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [router, user]);

  function submitManual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const path = attendancePath(manualValue);
    if (!path) {
      setManualError('Masukkan URL dari QR absensi Trainer yang valid.');
      return;
    }
    setManualError('');
    router.push(path);
  }

  if (checkingAuth || !user) {
    return <main className={styles.loading}>Memeriksa akun karyawan…</main>;
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/karyawan">
          ← Riwayat training
        </Link>
        <span className={styles.userLabel}>{user.nama}</span>
      </header>
      <section className={styles.card}>
        <p className={styles.eyebrow}>ABSENSI TRAINING</p>
        <h1>Scan QR Trainer</h1>
        <p className={styles.description}>
          Arahkan kamera ke QR yang tampil di layar Trainer. Setelah terbaca, Anda akan dibawa ke
          halaman konfirmasi kehadiran.
        </p>

        <div className={styles.cameraFrame}>
          <video aria-label="Kamera pemindai QR" autoPlay muted playsInline ref={videoRef} />
          <div className={styles.scanCorners} aria-hidden="true" />
        </div>
        <p className={styles.cameraHint}>
          Izinkan akses kamera jika browser memintanya. QR yang sudah kedaluwarsa akan ditolak oleh
          sistem.
        </p>

        {cameraError && (
          <p className={styles.error} role="alert">
            {cameraError}
          </p>
        )}

        <div className={styles.divider}>
          <span>atau masukkan link QR</span>
        </div>
        <form className={styles.manualForm} onSubmit={submitManual}>
          <label htmlFor="qr-link">Link dari QR Trainer</label>
          <input
            id="qr-link"
            onChange={(event) => setManualValue(event.target.value)}
            placeholder="http://192.168.1.29:3000/absen/..."
            type="url"
            value={manualValue}
          />
          {manualError && <p className={styles.error}>{manualError}</p>}
          <button type="submit">Lanjutkan ke absensi</button>
        </form>
      </section>
    </main>
  );
}
