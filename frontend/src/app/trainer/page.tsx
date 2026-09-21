'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiRequest, PageResult, SessionRow } from '../../lib/api';
import styles from './page.module.css';

function sessionLabel(status: SessionRow['status']) {
  if (status === 'DIBUKA') return 'Sedang dibuka';
  if (status === 'DITUTUP') return 'Selesai';
  return 'Draft';
}

export default function TrainerHomePage() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadSessions() {
    setLoading(true);
    try {
      const result = await apiRequest<PageResult<SessionRow>>('/sesi?limit=100');
      setSessions(result.data);
      setError('');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Sesi gagal dimuat.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    apiRequest<PageResult<SessionRow>>('/sesi?limit=100')
      .then((result) => {
        if (!active) return;
        setSessions(result.data);
        setError('');
      })
      .catch((requestError: unknown) => {
        if (active)
          setError(requestError instanceof Error ? requestError.message : 'Sesi gagal dimuat.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>RUANG TRAINER</p>
          <h1>Sesi training</h1>
          <p className={styles.description}>
            Buka sesi untuk menampilkan QR dan pantau kehadiran peserta secara live.
          </p>
        </div>
        <button className={styles.refresh} onClick={() => void loadSessions()} type="button">
          Muat ulang
        </button>
      </header>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <section aria-label="Daftar sesi training" className={styles.sessionList}>
        {loading ? (
          <div className={styles.empty}>Memuat sesi Trainer…</div>
        ) : sessions.length === 0 ? (
          <div className={styles.empty}>
            <strong>Belum ada sesi training</strong>
            <span>Admin perlu membuat Sesi dan menugaskan Anda sebagai Trainer.</span>
          </div>
        ) : (
          sessions.map((session) => (
            <article className={styles.sessionCard} key={session.id}>
              <div className={styles.sessionMain}>
                <div className={styles.sessionTopline}>
                  <span className={`${styles.status} ${styles[session.status.toLowerCase()]}`}>
                    {sessionLabel(session.status)}
                  </span>
                  <span className={styles.sessionId}>Sesi {session.id.slice(0, 8)}</span>
                </div>
                <h2>{session.training.nama}</h2>
                <p>{session.training.deskripsi || 'Tidak ada deskripsi training.'}</p>
              </div>
              <div className={styles.sessionMeta}>
                <div>
                  <span>Peserta</span>
                  <strong>{session._count?.assignments ?? 0}</strong>
                </div>
                <div>
                  <span>Hadir</span>
                  <strong>{session._count?.absensi ?? 0}</strong>
                </div>
                <Link className={styles.openButton} href={`/trainer/sesi/${session.id}`}>
                  Kelola sesi
                </Link>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
