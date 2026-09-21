'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  apiRequest,
  apiStream,
  AssignmentRow,
  SessionControlState,
  SessionRow,
} from '../../../../lib/api';
import styles from './page.module.css';

type StreamMessage = SessionControlState & { type: 'update' | 'closed' };

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function statusText(attendance: AssignmentRow['absensi']) {
  if (!attendance) return 'Belum hadir';
  return attendance.status === 'HADIR' ? 'Hadir' : 'Alpha';
}

export default function TrainerSessionPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [state, setState] = useState<SessionControlState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [clock, setClock] = useState(() => Date.now());
  const streamController = useRef<AbortController | null>(null);

  const connectStream = useCallback(() => {
    streamController.current?.abort();
    const controller = new AbortController();
    streamController.current = controller;
    void apiStream<StreamMessage>(
      `/sesi/${id}/stream`,
      (message) => {
        if (message.type === 'closed') {
          setState((current) => (current ? { ...current, qr: null } : current));
          return;
        }
        setState(message);
        setError('');
      },
      controller.signal,
    ).catch((streamError: unknown) => {
      if (controller.signal.aborted) return;
      setError(streamError instanceof Error ? streamError.message : 'Koneksi live terputus.');
    });
  }, [id]);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const [session, participants] = await Promise.all([
          apiRequest<SessionRow>(`/sesi/${id}`),
          apiRequest<AssignmentRow[]>(`/sesi/${id}/participants`),
        ]);
        if (!active) return;
        setState({ session, participants, qr: null });
        if (session.status === 'DIBUKA') connectStream();
      } catch (requestError) {
        if (active)
          setError(requestError instanceof Error ? requestError.message : 'Sesi gagal dimuat.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
      streamController.current?.abort();
    };
  }, [connectStream, id]);

  useEffect(() => {
    if (!state?.qr) return;
    const update = () => setClock(Date.now());
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [state?.qr]);

  async function openSession() {
    setBusy(true);
    setError('');
    try {
      const opened = await apiRequest<SessionControlState>(`/sesi/${id}/buka`, { method: 'POST' });
      setState(opened);
      connectStream();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Sesi gagal dibuka.');
    } finally {
      setBusy(false);
    }
  }

  async function closeSession() {
    setBusy(true);
    setError('');
    try {
      const closed = await apiRequest<SessionControlState>(`/sesi/${id}/tutup`, { method: 'POST' });
      streamController.current?.abort();
      setState(closed);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Sesi gagal ditutup.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className={styles.loading}>Memuat kontrol sesi…</div>;
  if (!state) return <div className={styles.error}>Sesi tidak dapat ditampilkan. {error}</div>;

  const qrUrl =
    state.qr && typeof window !== 'undefined'
      ? `${window.location.origin}/absen/${state.qr.token}`
      : '';
  const secondsLeft = state.qr
    ? Math.max(0, Math.ceil((new Date(state.qr.expiredAt).getTime() - clock) / 1000))
    : 0;
  const hadir = state.participants.filter(
    (participant) => participant.absensi?.status === 'HADIR',
  ).length;
  const belum = state.participants.length - hadir;

  return (
    <div className={styles.page}>
      <Link className={styles.back} href="/trainer">
        ← Kembali ke sesi
      </Link>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>KONTROL SESI</p>
          <h1>{state.session.training.nama}</h1>
          <p className={styles.description}>
            Sesi {state.session.id.slice(0, 8)} · {state.session.trainer.nama}
          </p>
        </div>
        <span className={`${styles.status} ${styles[state.session.status.toLowerCase()]}`}>
          {state.session.status === 'DIBUKA'
            ? 'Sedang dibuka'
            : state.session.status === 'DITUTUP'
              ? 'Selesai'
              : 'Draft'}
        </span>
      </header>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <div className={styles.controlGrid}>
        <section className={styles.qrPanel} aria-label="QR absensi">
          <div className={styles.panelHeading}>
            <div>
              <h2>QR absensi</h2>
              <p>QR berganti otomatis setiap interval yang dikonfigurasi.</p>
            </div>
            {state.session.status === 'DRAFT' && (
              <button disabled={busy} onClick={openSession} type="button">
                {busy ? 'Membuka…' : 'Buka sesi'}
              </button>
            )}
            {state.session.status === 'DIBUKA' && (
              <button
                className={styles.closeButton}
                disabled={busy}
                onClick={closeSession}
                type="button"
              >
                {busy ? 'Menutup…' : 'Tutup sesi'}
              </button>
            )}
          </div>
          {state.session.status === 'DIBUKA' && state.qr && qrUrl ? (
            <div className={styles.qrStage}>
              <div className={styles.qrFrame}>
                <QRCodeSVG
                  bgColor="#ffffff"
                  fgColor="#173f34"
                  includeMargin
                  level="M"
                  size={244}
                  value={qrUrl}
                />
              </div>
              <strong>Scan untuk mencatat kehadiran</strong>
              <span>QR baru dalam {secondsLeft} detik</span>
              <code>{qrUrl}</code>
            </div>
          ) : state.session.status === 'DITUTUP' ? (
            <div className={styles.qrEmpty}>
              <strong>Sesi sudah ditutup</strong>
              <span>QR tidak lagi dapat digunakan.</span>
              <small>
                Durasi {state.session.durasiJam ?? '0.00'} jam · ditutup{' '}
                {formatDate(state.session.waktuTutup)}
              </small>
            </div>
          ) : (
            <div className={styles.qrEmpty}>
              <strong>Sesi belum dibuka</strong>
              <span>Tekan “Buka sesi” saat peserta siap melakukan scan.</span>
            </div>
          )}
        </section>

        <section className={styles.infoPanel} aria-label="Ringkasan sesi">
          <p className={styles.infoLabel}>RINGKASAN KEHADIRAN</p>
          <div className={styles.countRow}>
            <div>
              <span>Hadir</span>
              <strong>{hadir}</strong>
            </div>
            <div>
              <span>Belum hadir</span>
              <strong>{belum}</strong>
            </div>
          </div>
          <dl>
            <div>
              <dt>Peserta ditugaskan</dt>
              <dd>{state.participants.length}</dd>
            </div>
            <div>
              <dt>Dibuka</dt>
              <dd>{formatDate(state.session.waktuBuka)}</dd>
            </div>
            <div>
              <dt>Durasi</dt>
              <dd>{state.session.durasiJam ? `${state.session.durasiJam} jam` : 'Berjalan'}</dd>
            </div>
          </dl>
        </section>
      </div>

      <section className={styles.participantPanel} aria-label="Daftar peserta">
        <div className={styles.panelHeading}>
          <div>
            <h2>Peserta sesi</h2>
            <p>Daftar ini diperbarui saat ada scan baru.</p>
          </div>
          <span className={styles.liveLabel}>
            {state.session.status === 'DIBUKA' ? 'Live' : 'Arsip'}
          </span>
        </div>
        <div className={styles.tableScroll}>
          <table>
            <thead>
              <tr>
                <th>Peserta</th>
                <th>Departemen</th>
                <th>Status</th>
                <th>Waktu scan</th>
                <th>Lokasi</th>
              </tr>
            </thead>
            <tbody>
              {state.participants.map((participant) => (
                <tr key={participant.id}>
                  <td>
                    <strong>{participant.karyawan.nama}</strong>
                    <span>{participant.karyawan.email}</span>
                  </td>
                  <td>{participant.karyawan.departemen?.nama ?? '—'}</td>
                  <td>
                    <span
                      className={
                        participant.absensi?.status === 'HADIR' ? styles.attended : styles.pending
                      }
                    >
                      {statusText(participant.absensi)}
                    </span>
                  </td>
                  <td>{formatDate(participant.absensi?.waktuScan)}</td>
                  <td>
                    {participant.absensi?.latitude != null
                      ? `${participant.absensi.latitude}, ${participant.absensi.longitude}`
                      : 'Tidak dibagikan'}
                  </td>
                </tr>
              ))}
              {state.participants.length === 0 && (
                <tr>
                  <td className={styles.empty} colSpan={5}>
                    Belum ada peserta. Admin perlu membuat Assignment terlebih dahulu.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
