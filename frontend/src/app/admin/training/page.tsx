import { CrudField, MasterCrudPage } from '../../../components/admin/master-crud-page';

const fields: CrudField[] = [
  { name: 'nama', label: 'Nama training', required: true },
  { name: 'deskripsi', label: 'Deskripsi', type: 'textarea' },
];

export default function TrainingPage() {
  return (
    <MasterCrudPage
      columns={[
        { key: 'nama', label: 'Nama training' },
        { key: 'deskripsi', label: 'Deskripsi' },
        { key: '_count.sesi', label: 'Jumlah sesi' },
      ]}
      description="Kelola katalog program training perusahaan."
      endpoint="/training"
      fields={fields}
      title="Training"
    />
  );
}
