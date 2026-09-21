import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role, StatusSesi } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';
import type { CreateAssignmentsDto } from './dto/assignment.dto.js';

const assignmentInclude = {
  karyawan: {
    select: {
      id: true,
      nama: true,
      email: true,
      departemen: { select: { id: true, nama: true } },
    },
  },
  absensi: {
    select: {
      id: true,
      status: true,
      waktuScan: true,
      latitude: true,
      longitude: true,
    },
  },
} satisfies Prisma.AssignmentInclude;

@Injectable()
export class AssignmentService {
  constructor(private readonly prisma: PrismaService) {}

  private async getSession(sesiId: string, actor: { id: string; role: Role }) {
    const session = await this.prisma.sesi.findUnique({
      where: { id: sesiId },
      select: { id: true, status: true, trainerId: true },
    });
    if (!session) throw new NotFoundException('Sesi tidak ditemukan.');
    if (actor.role === Role.TRAINER && session.trainerId !== actor.id) {
      throw new ForbiddenException('Anda tidak memiliki akses ke sesi ini.');
    }
    return session;
  }

  async list(sesiId: string, actor: { id: string; role: Role }) {
    await this.getSession(sesiId, actor);
    return this.prisma.assignment.findMany({
      where: { sesiId },
      include: assignmentInclude,
      orderBy: { karyawan: { nama: 'asc' } },
    });
  }

  async add(sesiId: string, dto: CreateAssignmentsDto) {
    const session = await this.getSession(sesiId, { id: '', role: Role.ADMIN });
    if (session.status !== StatusSesi.DRAFT) {
      throw new BadRequestException(
        'Assignment hanya dapat diubah saat sesi masih DRAFT.',
      );
    }

    const employees = await this.prisma.karyawan.findMany({
      where: { id: { in: dto.karyawanIds } },
      select: { id: true, nama: true, role: true, aktif: true },
    });
    const validIds = new Set(
      employees
        .filter((employee) => employee.role === Role.KARYAWAN && employee.aktif)
        .map((employee) => employee.id),
    );
    const invalid = dto.karyawanIds.filter((id) => !validIds.has(id));
    if (invalid.length) {
      throw new BadRequestException(
        'Semua peserta harus berupa akun Karyawan aktif yang valid.',
      );
    }

    await this.prisma.assignment.createMany({
      data: dto.karyawanIds.map((karyawanId) => ({ karyawanId, sesiId })),
      skipDuplicates: true,
    });
    return this.list(sesiId, { id: '', role: Role.ADMIN });
  }

  async remove(sesiId: string, karyawanId: string) {
    const session = await this.getSession(sesiId, { id: '', role: Role.ADMIN });
    if (session.status !== StatusSesi.DRAFT) {
      throw new BadRequestException(
        'Assignment hanya dapat dihapus saat sesi masih DRAFT.',
      );
    }
    try {
      await this.prisma.assignment.delete({
        where: { karyawanId_sesiId: { karyawanId, sesiId } },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Assignment tidak ditemukan.');
      }
      throw error;
    }
    return { message: 'Assignment dihapus.' };
  }
}
