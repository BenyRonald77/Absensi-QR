import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sistem Absensi Training Karyawan',
  description: 'Fondasi portal training karyawan.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
