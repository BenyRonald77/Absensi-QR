'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { apiRequest, AssignmentRow, PageResult, SessionRow } from '../../../../lib/api';
import styles from './page.module.css';

interface Employee {
  id: string;
  nama: string;
  email: string;
  role: 'ADMIN' | 'TRAINER' | 'KARYAWAN';
  aktif: boolean;
  departemen: { nama: string };
}

export default function AdminSessionAssignmentsPage() {
  const { id } = useParams<{ id: string }>();
  const [session, setSession] = useState<SessionRow | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function load() {
    setLoading(true);
    try {
      const [sessionResult, employeeResult, assignmentResult] = await Promise.all([
        apiRequest<SessionRow>(`/sesi/${id}`),
        apiRequest<PageResult<Employee>>('/karyawan?limit=100'),
        apiRequest<AssignmentRow[]>(`/sesi/${id}/assignments`),
      ]);
      setSession(sessionResult);
      setEmployees(
        employeeResult.data.filter((employee) => employee.role === 'KARYAWAN' && employee.aktif),
      );
      setAssignments(assignmentResult);
      setSelected([]);
      setError('');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Data peserta gagal dimuat.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    Promise.all([
      apiRequest<SessionRow>(`/sesi/${id}`),
      apiRequest<AssignmentRow[]>(`/sesi/${id}/assignments`),
      apiRequest<PageResult<Employee>>('/karyawan?limit=100'),
    ])
      .then(([sessionResult, assignmentResult, employeeResult]) => {
        if (!active) return;
        setSession(sessionResult);
        setEmployees(
          employeeResult.data.filter((employee) => employee.role === 'KARYAWAN' && employee.aktif),
        );
        setAssignments(assignmentResult);
        setSelected([]);
        setError('');
      })
      .catch((requestError: unknown) => {
        if (active)
          setError(
            requestError instanceof Error ? requestError.message : 'Data peserta gagal dimuat.',
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  const assignedIds = useMemo(
    () => new Set(assignments.map((assignment) => assignment.karyawan.id)),
    [assignments],
  );
  const available = employees.filter((employee) => !assignedIds.has(employee.id));

  function toggle(idToToggle: string) {
    setSelected((current) =>
      current.includes(idToToggle)
        ? current.filter((idValue) => idValue !== idToToggle)
        : [...current, idToToggle],
    );
  }

  async function assignSelected() {
    if (!selected.length) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await apiRequest(`/sesi/${id}/assignments`, {
        method: 'POST',
        body: JSON.stringify({ karyawanIds: selected }),
      });
      setNotice(`${selected.length} karyawan berhasil ditambahkan ke sesi.`);
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Assignment gagal disimpan.');
    } finally {
      setSaving(false);
    }
  }

  async function removeAssignment(karyawanId: string) {
    setSaving(true);
    setError('');
    try {
      await apiRequest(`/sesi/${id}/assignments/${karyawanId}`, { method: 'DELETE' });
      setAssignments((current) =>
        current.filter((assignment) => assignment.karyawan.id !== karyawanId),
      );
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Assignment gagal dihapus.');
    } finally {
      setSaving(false);
    }
  }

  const canEdit = session?.status === 'DRAFT';

  return (
    <div className={styles.page}>
      <Link className={styles.back} href="/admin/sesi">
        ← Kembali ke Sesi
      </Link>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>PESERTA TRAINING</p>
          <h1>{session?.training.nama ?? 'Kelola peserta'}</h1>
          <p className={styles.description}>
            Tentukan karyawan yang wajib mengikuti sesi ini sebelum Trainer membukanya.
          </p>
        </div>
        {session && <span className={styles.status}>{session.status}</span>}
      </header>
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

      {loading ? (
        <div className={styles.empty}>Memuat data peserta…</div>
      ) : (
        <div className={styles.grid}>
          <section className={styles.panel} aria-label="Tambah peserta">
            <div className={styles.panelHeading}>
              <div>
                <h2>Tambah peserta</h2>
                <p>{available.length} karyawan aktif belum ditugaskan.</p>
              </div>
              <button
                disabled={!canEdit || saving || !selected.length}
                onClick={() => void assignSelected()}
                type="button"
              >
                {saving
                  ? 'Menyimpan…'
                  : `Tambahkan${selected.length ? ` (${selected.length})` : ''}`}
              </button>
            </div>
            {!canEdit && (
              <p className={styles.locked}>
                Assignment terkunci karena sesi sudah {session?.status.toLowerCase()}.
              </p>
            )}
            <div className={styles.employeeList}>
              {available.map((employee) => (
                <label className={styles.employeeOption} key={employee.id}>
                  <input
                    checked={selected.includes(employee.id)}
                    disabled={!canEdit || saving}
                    onChange={() => toggle(employee.id)}
                    type="checkbox"
                  />
                  <span>
                    <strong>{employee.nama}</strong>
                    <small>
                      {employee.email} · {employee.departemen.nama}
                    </small>
                  </span>
                </label>
              ))}
              {!available.length && (
                <div className={styles.emptySmall}>Semua karyawan aktif sudah ditugaskan.</div>
              )}
            </div>
          </section>
          <section className={styles.panel} aria-label="Peserta terdaftar">
            <div className={styles.panelHeading}>
              <div>
                <h2>Peserta terdaftar</h2>
                <p>{assignments.length} karyawan dalam daftar wajib hadir.</p>
              </div>
            </div>
            <div className={styles.assignedList}>
              {assignments.map((assignment) => (
                <div className={styles.assignedRow} key={assignment.id}>
                  <div>
                    <strong>{assignment.karyawan.nama}</strong>
                    <span>{assignment.karyawan.departemen?.nama ?? '—'}</span>
                  </div>
                  {canEdit ? (
                    <button
                      disabled={saving}
                      onClick={() => void removeAssignment(assignment.karyawan.id)}
                      type="button"
                    >
                      Hapus
                    </button>
                  ) : (
                    <span
                      className={
                        assignment.absensi?.status === 'HADIR' ? styles.attended : styles.waiting
                      }
                    >
                      {assignment.absensi?.status ?? 'Belum scan'}
                    </span>
                  )}
                </div>
              ))}
              {!assignments.length && (
                <div className={styles.emptySmall}>
                  Belum ada Assignment. Pilih karyawan di panel sebelah.
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
