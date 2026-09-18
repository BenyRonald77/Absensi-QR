import { MasterCrudPage, CrudField } from '../../../components/admin/master-crud-page';

const fields: CrudField[] = [{ name: 'nama', label: 'Nama departemen', required: true }];

export default function DepartemenPage() {
  return (
    <MasterCrudPage
      columns={[
        { key: 'nama', label: 'Departemen' },
        { key: '_count.karyawan', label: 'Jumlah karyawan' },
      ]}
      description="Buat dan perbarui daftar departemen perusahaan."
      endpoint="/departemen"
      fields={fields}
      title="Departemen"
    />
  );
}
