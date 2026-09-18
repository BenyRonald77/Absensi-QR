import styles from './page.module.css';
import Link from 'next/link';

const foundationLayers = [
  {
    number: '01',
    title: 'Web app',
    description: 'Next.js dan TypeScript untuk antarmuka aplikasi.',
    detail: 'frontend/',
  },
  {
    number: '02',
    title: 'API',
    description: 'NestJS sebagai fondasi layanan backend.',
    detail: 'backend/',
  },
  {
    number: '03',
    title: 'Data',
    description: 'PostgreSQL dengan model data yang dikelola Prisma.',
    detail: 'backend/prisma/',
  },
];

export default function Home() {
  return (
    <main className={styles.page}>
      <div className={styles.frame}>
        <header className={styles.header}>
          <Link aria-label="Beranda" className={styles.brand} href="/">
            <span className={styles.brandMark}>AT</span>
            <span className={styles.brandName}>Absensi Training</span>
          </Link>
          <span className={styles.phase}>Fondasi proyek</span>
        </header>

        <section className={styles.hero}>
          <p className={styles.eyebrow}>
            <span aria-hidden="true" className={styles.statusDot} />
            SISTEM INTERNAL · TAHAP 1
          </p>
          <h1>
            Fondasi sistem
            <br />
            <span>telah disiapkan.</span>
          </h1>
          <p className={styles.intro}>
            Struktur aplikasi, API, dan database sudah tersedia sebagai dasar untuk tahap
            pengembangan berikutnya.
          </p>
        </section>

        <section aria-label="Lapisan aplikasi" className={styles.layers}>
          {foundationLayers.map((layer) => (
            <article className={styles.layer} key={layer.number}>
              <p className={styles.layerNumber}>{layer.number}</p>
              <h2>{layer.title}</h2>
              <p className={styles.layerDescription}>{layer.description}</p>
              <p className={styles.layerDetail}>{layer.detail}</p>
            </article>
          ))}
        </section>

        <footer className={styles.footer}>
          <span>Portal internal perusahaan</span>
          <span>Absensi Training Karyawan</span>
        </footer>
      </div>
    </main>
  );
}
