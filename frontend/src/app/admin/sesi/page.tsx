'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { apiRequest, PageResult } from '../../../lib/api';
import styles from './sesi.module.css';

interface SelectItem {
  id: string;
  nama: string;
  email?: string;
}

interface SessionRow {
  id: string;
  status: string;
  training: { nama: string };
  trainer: { nama: string };
  _count: { assignments: number };
}

export default function AdminSesiPage() {
  const [trainings, setTrainings] = useState<SelectItem[]>([]);
  const [trainers, setTrainers] = useState<SelectItem[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [trainingId, setTrainingId] = useState('');
  const [trainerId, setTrainerId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const requestData = useCallback(
    () =>
      Promise.all([
        apiRequest<PageResult<SelectItem>>('/training?limit=100'),
        apiRequest<PageResult<SelectItem>>('/karyawan/trainers?limit=100'),
        apiRequest<PageResult<SessionRow>>('/sesi?limit=100'),
      ]),
    [],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [trainingPage, trainerList, sessionPage] = await requestData();
      setTrainings(trainingPage.data);
      setTrainers(trainerList.data);
      setSessions(sessionPage.data);
      setError('');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Data sesi gagal dimuat.');
    } finally {
      setLoading(false);
    }
  }, [requestData]);

  useEffect(() => {
    let active = true;
    requestData()
      .then(([trainingPage, trainerList, sessionPage]) => {
        if (!active) return;
        setTrainings(trainingPage.data);
        setTrainers(trainerList.data);
        setSessions(sessionPage.data);
        setError('');
      })
      .catch((loadError: unknown) => {
        if (active)
          setError(loadError instanceof Error ? loadError.message : 'Data sesi gagal dimuat.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [requestData]);

  async function createSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await apiRequest('/sesi', {
        method: 'POST',
        body: JSON.stringify({ trainingId, trainerId }),
      });
      setTrainingId('');
      setTrainerId('');
      setNotice('Sesi berhasil dibuat dengan status DRAFT.');
      setLoading(true);
      await loadData();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Sesi gagal dibuat.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.page}>
      <p className={styles.eyebrow}>JADWAL TRAINING</p>
      <h1>Sesi</h1>
      <p className={styles.description}>Buat sesi dasar dan pilih program serta Trainer.</p>

      <section className={styles.card}>
        <h2>Buat sesi</h2>
        <form className={styles.form} onSubmit={createSession}>
          <label>
            <span>Training</span>
            <select
              onChange={(event) => setTrainingId(event.target.value)}
              required
              value={trainingId}
            >
              <option value="">Pilih training</option>
              {trainings.map((training) => (
                <option key={training.id} value={training.id}>
                  {training.nama}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Trainer</span>
            <select
              onChange={(event) => setTrainerId(event.target.value)}
              required
              value={trainerId}
            >
              <option value="">Pilih Trainer</option>
              {trainers.map((trainer) => (
                <option key={trainer.id} value={trainer.id}>
                  {trainer.nama}
                </option>
              ))}
            </select>
          </label>
          <button disabled={saving || !trainings.length || !trainers.length} type="submit">
            {saving ? 'Menyimpan…' : 'Buat sesi DRAFT'}
          </button>
        </form>
      </section>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      )}

      <section className={styles.card}>
        <div className={styles.listHeading}>
          <div>
            <h2>Daftar sesi</h2>
            <p>{sessions.length} sesi</p>
          </div>
          <button
            className={styles.refresh}
            onClick={() => {
              setLoading(true);
              void loadData();
            }}
            type="button"
          >
            Muat ulang
          </button>
        </div>
        <div className={styles.tableScroll}>
          <table>
            <thead>
              <tr>
                <th>Training</th>
                <th>Trainer</th>
                <th>Status</th>
                <th>Peserta ditugaskan</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className={styles.empty} colSpan={5}>
                    Memuat data…
                  </td>
                </tr>
              ) : sessions.length ? (
                sessions.map((session) => (
                  <tr key={session.id}>
                    <td>{session.training.nama}</td>
                    <td>{session.trainer.nama}</td>
                    <td>
                      <span className={styles.status}>{session.status}</span>
                    </td>
                    <td>{session._count.assignments}</td>
                    <td>
                      <Link className={styles.actionLink} href={`/admin/sesi/${session.id}`}>
                        Kelola peserta
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className={styles.empty} colSpan={5}>
                    Belum ada sesi.
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
