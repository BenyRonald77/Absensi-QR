import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const demoPassword = 'TrainingDemo123!';

async function main() {
  const passwordHash = await bcrypt.hash(demoPassword, 12);
  const departments = await Promise.all([
    prisma.departemen.upsert({
      where: { nama: 'Human Resources' },
      update: {},
      create: { nama: 'Human Resources' },
    }),
    prisma.departemen.upsert({
      where: { nama: 'Teknologi Informasi' },
      update: {},
      create: { nama: 'Teknologi Informasi' },
    }),
    prisma.departemen.upsert({
      where: { nama: 'Operasional' },
      update: {},
      create: { nama: 'Operasional' },
    }),
  ]);

  const demoAccounts: Array<{
    nama: string;
    email: string;
    departemenId: string;
    role: Role;
  }> = [
    {
      nama: 'Admin Demo',
      email: 'admin@example.com',
      departemenId: departments[0].id,
      role: Role.ADMIN,
    },
    {
      nama: 'Trainer Demo',
      email: 'trainer@example.com',
      departemenId: departments[1].id,
      role: Role.TRAINER,
    },
    {
      nama: 'Karyawan Demo 1',
      email: 'karyawan1@example.com',
      departemenId: departments[2].id,
      role: Role.KARYAWAN,
    },
    {
      nama: 'Karyawan Demo 2',
      email: 'karyawan2@example.com',
      departemenId: departments[2].id,
      role: Role.KARYAWAN,
    },
    {
      nama: 'Karyawan Demo 3',
      email: 'karyawan3@example.com',
      departemenId: departments[0].id,
      role: Role.KARYAWAN,
    },
  ];

  for (const account of demoAccounts) {
    await prisma.karyawan.upsert({
      where: { email: account.email },
      update: {
        nama: account.nama,
        passwordHash,
        departemenId: account.departemenId,
        role: account.role,
        aktif: true,
      },
      create: { ...account, passwordHash },
    });
  }

  console.info(
    `Seed selesai: ${departments.length} departemen dan ${demoAccounts.length} akun demo.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
