'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { apiRequest, PageResult } from '../../lib/api';
import styles from './master-crud-page.module.css';

export interface CrudOption {
  value: string;
  label: string;
}

export interface CrudField {
  name: string;
  label: string;
  type?: 'text' | 'email' | 'password' | 'textarea' | 'select';
  required?: boolean;
  requiredOnCreate?: boolean;
  options?: CrudOption[];
  optionsEndpoint?: string;
}

export interface CrudColumn {
  key: string;
  label: string;
}

interface MasterCrudPageProps {
  title: string;
  description: string;
  endpoint: string;
  fields: CrudField[];
  columns: CrudColumn[];
}

type DataRow = Record<string, unknown>;
type PageMeta = PageResult<DataRow>['meta'];

function getPath(value: DataRow, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (!current || typeof current !== 'object') return undefined;
    return (current as Record<string, unknown>)[key];
  }, value);
}

function displayValue(value: unknown) {
  if (typeof value === 'boolean') return value ? 'Aktif' : 'Nonaktif';
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

export function MasterCrudPage({
  title,
  description,
  endpoint,
  fields,
  columns,
}: MasterCrudPageProps) {
  const [rows, setRows] = useState<DataRow[]>([]);
  const [meta, setMeta] = useState<PageMeta>({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [page, setPage] = useState(1);
  const [optionsByField, setOptionsByField] = useState<Record<string, CrudOption[]>>({});
  const [values, setValues] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const requestRows = useCallback(
    () => apiRequest<PageResult<DataRow>>(`${endpoint}?page=${page}&limit=10`),
    [endpoint, page],
  );

  const loadRows = useCallback(async () => {
    try {
      const result = await requestRows();
      setRows(result.data);
      setMeta(result.meta);
      setError('');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Data gagal dimuat.');
    } finally {
      setLoading(false);
    }
  }, [requestRows]);

  useEffect(() => {
    let active = true;
    requestRows()
      .then((result) => {
        if (!active) return;
        setRows(result.data);
        setMeta(result.meta);
        setError('');
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Data gagal dimuat.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [requestRows]);

  useEffect(() => {
    let active = true;
    const optionFields = fields.filter((field) => field.type === 'select' && field.optionsEndpoint);
    Promise.all(
      optionFields.map(async (field) => {
        const result = await apiRequest<PageResult<DataRow> | DataRow[]>(field.optionsEndpoint!);
        const data = Array.isArray(result) ? result : result.data;
        return [
          field.name,
          data.map((item) => ({ value: String(item.id), label: String(item.nama) })),
        ] as const;
      }),
    )
      .then((entries) => {
        if (active) setOptionsByField(Object.fromEntries(entries));
      })
      .catch((optionError: unknown) => {
        if (active)
          setError(
            optionError instanceof Error ? optionError.message : 'Pilihan form gagal dimuat.',
          );
      });
    return () => {
      active = false;
    };
  }, [fields]);

  function resetForm() {
    setEditingId(null);
    setValues({});
    setError('');
    setNotice('');
  }

  function beginEdit(row: DataRow) {
    const formValues: Record<string, string> = {};
    for (const field of fields) {
      if (field.type === 'password') {
        formValues[field.name] = '';
        continue;
      }
      const raw = getPath(row, field.name);
      formValues[field.name] = raw === undefined || raw === null ? '' : String(raw);
    }
    setEditingId(String(row.id));
    setValues(formValues);
    setError('');
    setNotice('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    const body: Record<string, string> = {};
    for (const field of fields) {
      const value = values[field.name] ?? '';
      if (field.type === 'password' && editingId && !value) continue;
      if (value !== '') body[field.name] = value;
    }

    try {
      await apiRequest(editingId ? `${endpoint}/${editingId}` : endpoint, {
        method: editingId ? 'PATCH' : 'POST',
        body: JSON.stringify(body),
      });
      resetForm();
      setNotice(editingId ? 'Perubahan berhasil disimpan.' : 'Data berhasil ditambahkan.');
      if (page !== 1) {
        setLoading(true);
        setPage(1);
      } else await loadRows();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Data gagal disimpan.');
    } finally {
      setSaving(false);
    }
  }

  async function removeRow(row: DataRow) {
    const verb = endpoint === '/karyawan' ? 'menonaktifkan' : 'menghapus';
    if (!window.confirm(`Yakin ingin ${verb} ${String(row.nama ?? 'data ini')}?`)) return;
    try {
      await apiRequest(`${endpoint}/${String(row.id)}`, { method: 'DELETE' });
      setNotice(endpoint === '/karyawan' ? 'Karyawan dinonaktifkan.' : 'Data berhasil dihapus.');
      await loadRows();
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : 'Data gagal dihapus.');
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>DATA MASTER</p>
          <h1>{title}</h1>
          <p className={styles.description}>{description}</p>
        </div>
      </header>

      <section className={styles.formCard}>
        <div className={styles.sectionHeading}>
          <div>
            <h2>{editingId ? 'Edit data' : `Tambah ${title.toLowerCase()}`}</h2>
            <p>
              {editingId
                ? 'Simpan perubahan data berikut.'
                : 'Isi formulir untuk menambahkan data baru.'}
            </p>
          </div>
          {editingId && (
            <button className={styles.cancelButton} onClick={resetForm} type="button">
              Batal edit
            </button>
          )}
        </div>

        <form className={styles.form} onSubmit={submitForm}>
          {fields.map((field) => {
            const required = field.required ?? (field.requiredOnCreate && !editingId) ?? false;
            const commonProps = {
              id: field.name,
              name: field.name,
              onChange: (
                event: React.ChangeEvent<
                  HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
                >,
              ) => setValues((current) => ({ ...current, [field.name]: event.target.value })),
              required,
              value: values[field.name] ?? '',
            };
            return (
              <label className={styles.field} htmlFor={field.name} key={field.name}>
                <span>{field.label}</span>
                {field.type === 'textarea' ? (
                  <textarea {...commonProps} rows={3} />
                ) : field.type === 'select' ? (
                  <select {...commonProps}>
                    <option value="">Pilih {field.label.toLowerCase()}</option>
                    {[...(field.options ?? []), ...(optionsByField[field.name] ?? [])].map(
                      (option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ),
                    )}
                  </select>
                ) : (
                  <input
                    {...commonProps}
                    autoComplete={field.type === 'password' ? 'new-password' : undefined}
                    placeholder={
                      field.type === 'password' && editingId
                        ? 'Kosongkan jika tidak diubah'
                        : undefined
                    }
                    type={field.type ?? 'text'}
                  />
                )}
              </label>
            );
          })}
          <div className={styles.formActions}>
            <button className={styles.submitButton} disabled={saving} type="submit">
              {saving ? 'Menyimpan…' : editingId ? 'Simpan perubahan' : 'Tambah data'}
            </button>
          </div>
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

      <section className={styles.tableCard}>
        <div className={styles.sectionHeading}>
          <div>
            <h2>Daftar {title.toLowerCase()}</h2>
            <p>{meta.total} data</p>
          </div>
        </div>
        <div className={styles.tableScroll}>
          <table>
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column.key}>{column.label}</th>
                ))}
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className={styles.empty} colSpan={columns.length + 1}>
                    Memuat data…
                  </td>
                </tr>
              ) : rows.length ? (
                rows.map((row) => (
                  <tr key={String(row.id)}>
                    {columns.map((column) => (
                      <td key={column.key}>{displayValue(getPath(row, column.key))}</td>
                    ))}
                    <td>
                      <div className={styles.rowActions}>
                        <button onClick={() => beginEdit(row)} type="button">
                          Edit
                        </button>
                        <button
                          className={styles.deleteButton}
                          onClick={() => void removeRow(row)}
                          type="button"
                        >
                          {endpoint === '/karyawan' ? 'Nonaktifkan' : 'Hapus'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className={styles.empty} colSpan={columns.length + 1}>
                    Belum ada data.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className={styles.pagination}>
          <span>
            Halaman {meta.page} dari {Math.max(meta.totalPages, 1)}
          </span>
          <div>
            <button
              disabled={page <= 1}
              onClick={() => {
                setLoading(true);
                setPage((value) => value - 1);
              }}
              type="button"
            >
              Sebelumnya
            </button>
            <button
              disabled={page >= meta.totalPages}
              onClick={() => {
                setLoading(true);
                setPage((value) => value + 1);
              }}
              type="button"
            >
              Berikutnya
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
