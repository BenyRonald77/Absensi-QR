import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export function rethrowPrismaError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002')
      throw new ConflictException('Data dengan nilai tersebut sudah tersedia.');
    if (error.code === 'P2003') {
      throw new ConflictException(
        'Data masih digunakan oleh relasi lain dan tidak dapat dihapus.',
      );
    }
    if (error.code === 'P2025')
      throw new NotFoundException('Data tidak ditemukan.');
  }
  throw error;
}
