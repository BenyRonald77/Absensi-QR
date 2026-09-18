import { CrudField, MasterCrudPage } from '../../../components/admin/master-crud-page';

const fields: CrudField[] = [
  { name: 'nama', label: 'Nama lengkap', required: true },
  { name: 'email', label: 'Email', type: 'email', required: true },
  { name: 'password', label: 'Kata sandi', type: 'password', requiredOnCreate: true },
  {
    name: 'departemenId',
    label: 'Departemen',
    type: 'select',
    required: true,
    optionsEndpoint: '/departemen?limit=100',
  },
  {
    name: 'role',
    label: 'Role',
    type: 'select',
    required: true,
    options: [
      { value: 'ADMIN', label: 'Admin' },
      { value: 'TRAINER', label: 'Trainer' },
      { value: 'KARYAWAN', label: 'Karyawan' },
    ],
  },
];

export default function KaryawanPage() {
  return (
    <MasterCrudPage
      columns={[
        { key: 'nama', label: 'Nama' },
        { key: 'email', label: 'Email' },
        { key: 'departemen.nama', label: 'Departemen' },
        { key: 'role', label: 'Role' },
        { key: 'aktif', label: 'Status' },
      ]}
      description="Kelola akun, role, departemen, dan status aktif karyawan."
      endpoint="/karyawan"
      fields={fields}
      title="Karyawan"
    />
  );
}
