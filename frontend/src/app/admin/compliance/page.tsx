'use client';

import { FormEvent, useEffect, useState } from 'react';
import { apiRequest, ComplianceStatus, PageResult } from '../../../lib/api';
import styles from './compliance.module.css';

interface Department {
  id: string;
  nama: string;
}

interface ComplianceEmployee {
  id: string;
  nama: string;
  email: string;
  aktif: boolean;
  departemen: Department;
  totalHours: number;
  targetHours: number;
  status: ComplianceStatus;
  progressPercent: number;
}

interface ComplianceDashboard {
  data: ComplianceEmployee[];
  meta: { page: number; limit: number; total: number; totalPages: number };
  summary: {
    year: number;
    targetHours: number;
    totalKaryawan: number;
    sudahMemenuhi: number;
    belumMemenuhi: number;
  };
}

interface ComplianceSetting {
  targetHours: number;
  updatedAt: string;
}

function currentJakartaYear() {
  return Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
    }).format(new Date()),
  );
}

function statusLabel(status: ComplianceStatus) {
  return status === 'SUDAH_MEMENUHI' ? 'Sudah Memenuhi' : 'Belum Memenuhi';
}

export default function AdminCompliancePage() {
  const [year, setYear] = useState(String(currentJakartaYear()));
  const [departmentId, setDepartmentId] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [dashboard, setDashboard] = useState<ComplianceDashboard | null>(null);
  const [targetInput, setTargetInput] = useState('6');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const yearNumber = Number(year);
  const yearValid = Number.isInteger(yearNumber) && yearNumber >= 1000 && yearNumber <= 9998;

  useEffect(() => {
    let active = true;
    apiRequest<PageResult<Department>>('/departemen?page=1&limit=100')
      .then((result) => {
        if (active) setDepartments(result.data);
      })
      .catch((requestError: unknown) => {
        if (active)
          setError(
            requestError instanceof Error ? requestError.message : 'Departemen gagal dimuat.',
          );
      });
    apiRequest<ComplianceSetting>('/compliance/setting')
      .then((setting) => {
        if (active) setTargetInput(String(setting.targetHours));
      })
      .catch((requestError: unknown) => {
        if (active)
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'Pengaturan compliance gagal dimuat.',
          );
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (!yearValid) return;
    const params = new URLSearchParams({
      year: String(yearNumber),
      page: String(page),
      limit: '20',
    });
    if (departmentId) params.set('departemenId', departmentId);
    if (status) params.set('status', status);

    apiRequest<ComplianceDashboard>(`/compliance?${params.toString()}`)
      .then((result) => {
        if (!active) return;
        setDashboard(result);
        setTargetInput(String(result.summary.targetHours));
        setError('');
      })
      .catch((requestError: unknown) => {
        if (active)
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'Dashboard compliance gagal dimuat.',
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [departmentId, page, refreshKey, status, year, yearNumber, yearValid]);

  async function saveTarget(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const targetHours = Number(targetInput);
    if (!Number.isFinite(targetHours) || targetHours <= 0 || targetHours > 99999.99) {
      setError('Target harus lebih dari 0 dan maksimal 99.999,99 jam.');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const saved = await apiRequest<ComplianceSetting>('/compliance/setting', {
        method: 'PUT',
        body: JSON.stringify({ targetHours }),
      });
      setTargetInput(String(saved.targetHours));
      setNotice('Target compliance berhasil disimpan.');
      setLoading(true);
      setRefreshKey((value) => value + 1);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : 'Target compliance gagal disimpan.',
      );
    } finally {
      setSaving(false);
    }
  }

  const summary = dashboard?.summary;
  const totalPages = dashboard?.meta.totalPages ?? 0;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>PEMANTAUAN HR</p>
          <h1>Compliance training</h1>
          <p className={styles.description}>
            Jam dihitung dari sesi tahun kalender WIB dengan Absensi berstatus HADIR.
          </p>
        </div>
        <button
          className={styles.refreshButton}
          onClick={() => {
            setLoading(true);
            setRefreshKey((value) => value + 1);
          }}
          type="button"
        >
          Muat ulang
        </button>
      </header>

      <form className={styles.targetForm} onSubmit={saveTarget}>
        <div>
          <label htmlFor="targetHours">Target jam per tahun</label>
          <p>Perubahan ini dipakai untuk status semua karyawan.</p>
        </div>
        <div className={styles.targetControls}>
          <input
            id="targetHours"
            max="99999.99"
            min="0.01"
            onChange={(event) => setTargetInput(event.target.value)}
            step="0.01"
            type="number"
            value={targetInput}
          />
          <span>jam</span>
          <button disabled={saving} type="submit">
            {saving ? 'Menyimpan…' : 'Simpan target'}
          </button>
        </div>
      </form>

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

      <section aria-label="Ringkasan compliance" className={styles.summaryGrid}>
        <article className={styles.summaryCard}>
          <span>Tahun</span>
          <strong>{summary?.year ?? year}</strong>
          <small>Target {summary?.targetHours.toFixed(2) ?? '—'} jam</small>
        </article>
        <article className={styles.summaryCard}>
          <span>Sudah memenuhi</span>
          <strong>{loading ? '—' : (summary?.sudahMemenuhi ?? 0)}</strong>
          <small>Karyawan mencapai target</small>
        </article>
        <article className={styles.summaryCard}>
          <span>Belum memenuhi</span>
          <strong>{loading ? '—' : (summary?.belumMemenuhi ?? 0)}</strong>
          <small>Karyawan di bawah target</small>
        </article>
        <article className={styles.summaryCard}>
          <span>Total karyawan</span>
          <strong>{loading ? '—' : (summary?.totalKaryawan ?? 0)}</strong>
          <small>Role KARYAWAN</small>
        </article>
      </section>

      <section aria-label="Filter compliance" className={styles.filterPanel}>
        <label>
          Tahun
          <input
            max="9998"
            min="1000"
            onChange={(event) => {
              const value = event.target.value;
              setYear(value);
              const parsedYear = Number(value);
              if (Number.isInteger(parsedYear) && parsedYear >= 1000 && parsedYear <= 9998) {
                setLoading(true);
                setPage(1);
              } else {
                setLoading(false);
              }
            }}
            type="number"
            value={year}
          />
          {!yearValid && (
            <small className={styles.fieldError}>Masukkan tahun antara 1000 dan 9998.</small>
          )}
        </label>
        <label>
          Departemen
          <select
            onChange={(event) => {
              setLoading(true);
              setDepartmentId(event.target.value);
              setPage(1);
            }}
            value={departmentId}
          >
            <option value="">Semua departemen</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.nama}
              </option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select
            onChange={(event) => {
              setLoading(true);
              setStatus(event.target.value);
              setPage(1);
            }}
            value={status}
          >
            <option value="">Semua status</option>
            <option value="SUDAH_MEMENUHI">Sudah Memenuhi</option>
            <option value="BELUM_MEMENUHI">Belum Memenuhi</option>
          </select>
        </label>
      </section>

      <section aria-label="Daftar compliance karyawan" className={styles.tableCard}>
        <div className={styles.tableHeading}>
          <div>
            <h2>Progress karyawan</h2>
            <p>{dashboard?.meta.total ?? 0} hasil sesuai filter</p>
          </div>
          <span>{summary?.year ?? year}</span>
        </div>
        <div className={styles.tableScroll}>
          <table>
            <thead>
              <tr>
                <th>Karyawan</th>
                <th>Departemen</th>
                <th>Total jam</th>
                <th>Progress</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {dashboard?.data.map((employee) => (
                <tr key={employee.id}>
                  <td>
                    <strong>{employee.nama}</strong>
                    <span>{employee.email}</span>
                    {!employee.aktif && <em>Nonaktif</em>}
                  </td>
                  <td>{employee.departemen.nama}</td>
                  <td className={styles.hours}>
                    {employee.totalHours.toFixed(2)}
                    <small> / {employee.targetHours.toFixed(2)} jam</small>
                  </td>
                  <td>
                    <div
                      aria-label={`${employee.progressPercent}% dari target`}
                      aria-valuemax={100}
                      aria-valuemin={0}
                      aria-valuenow={employee.progressPercent}
                      className={styles.progressTrack}
                      role="meter"
                    >
                      <span style={{ width: `${employee.progressPercent}%` }} />
                    </div>
                    <small className={styles.percent}>{employee.progressPercent}%</small>
                  </td>
                  <td>
                    <span
                      className={
                        employee.status === 'SUDAH_MEMENUHI'
                          ? styles.compliant
                          : styles.notCompliant
                      }
                    >
                      {statusLabel(employee.status)}
                    </span>
                  </td>
                </tr>
              ))}
              {!loading && dashboard?.data.length === 0 && (
                <tr>
                  <td className={styles.empty} colSpan={5}>
                    Tidak ada karyawan untuk filter ini.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td className={styles.empty} colSpan={5}>
                    Memuat data compliance…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <footer className={styles.pagination}>
          <span>
            Halaman {page} dari {Math.max(totalPages, 1)}
          </span>
          <div>
            <button
              disabled={page <= 1 || loading}
              onClick={() => {
                setLoading(true);
                setPage((value) => value - 1);
              }}
              type="button"
            >
              Sebelumnya
            </button>
            <button
              disabled={page >= totalPages || loading}
              onClick={() => {
                setLoading(true);
                setPage((value) => value + 1);
              }}
              type="button"
            >
              Berikutnya
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
