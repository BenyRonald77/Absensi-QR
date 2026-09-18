import Link from 'next/link';
import styles from './page.module.css';

const masterLinks = [
  { href: '/admin/karyawan', title: 'Karyawan', description: 'Kelola akun dan status karyawan.' },
  { href: '/admin/training', title: 'Training', description: 'Kelola program training.' },
  { href: '/admin/departemen', title: 'Departemen', description: 'Kelola struktur departemen.' },
  { href: '/admin/sesi', title: 'Sesi', description: 'Buat dan lihat sesi training.' },
  {
    href: '/admin/compliance',
    title: 'Compliance training',
    description: 'Pantau pemenuhan jam training tahunan karyawan.',
  },
];

export default function AdminHomePage() {
  return (
    <>
      <p className={styles.eyebrow}>ADMINISTRASI</p>
      <h1 className={styles.title}>Data master</h1>
      <p className={styles.description}>Kelola data dasar perusahaan dan siapkan sesi training.</p>
      <section aria-label="Menu administrasi" className={styles.cards}>
        {masterLinks.map((item) => (
          <Link className={styles.card} href={item.href} key={item.href}>
            <span className={styles.arrow}>↗</span>
            <h2>{item.title}</h2>
            <p>{item.description}</p>
          </Link>
        ))}
      </section>
    </>
  );
}
