import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  Role,
  StatusAbsensi,
  StatusAssignment,
  StatusSesi,
} from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { Observable } from 'rxjs';
import { paginationResult } from '../common/pagination.dto.js';
import { PrismaService } from '../database/prisma.service.js';
import type { CreateSesiDto } from './dto/create-sesi.dto.js';
import type { SesiQueryDto } from './dto/sesi-query.dto.js';

const sessionRelations = {
  training: { select: { id: true, nama: true, deskripsi: true } },
  trainer: { select: { id: true, nama: true, email: true } },
  _count: {
    select: {
      assignments: true,
      absensi: { where: { status: StatusAbsensi.HADIR } },
    },
  },
} as const;

function qrIntervalMs() {
  const configured = Number(process.env.QR_TOKEN_INTERVAL_SECONDS ?? 15);
  return (
    Math.max(3, Math.min(300, Number.isFinite(configured) ? configured : 15)) *
    1000
  );
}

@Injectable()
export class SesiService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSesiDto) {
    const trainer = await this.prisma.karyawan.findUnique({
      where: { id: dto.trainerId },
      select: { id: true, role: true, aktif: true },
    });
    if (!trainer) throw new NotFoundException('Trainer tidak ditemukan.');
    if (trainer.role !== Role.TRAINER || !trainer.aktif) {
      throw new BadRequestException(
        'Sesi harus ditugaskan kepada akun Trainer yang aktif.',
      );
    }

    const trainingExists = await this.prisma.training.findUnique({
      where: { id: dto.trainingId },
      select: { id: true },
    });
    if (!trainingExists)
      throw new NotFoundException('Training tidak ditemukan.');

    return this.prisma.sesi.create({
      data: {
        trainingId: dto.trainingId,
        trainerId: dto.trainerId,
      },
      include: sessionRelations,
    });
  }

  async findAll(query: SesiQueryDto, actor: { id: string; role: Role }) {
    const where: Prisma.SesiWhereInput = {
      ...(query.trainingId ? { trainingId: query.trainingId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(actor.role === Role.TRAINER ? { trainerId: actor.id } : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.sesi.findMany({
        where,
        include: sessionRelations,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { id: 'desc' },
      }),
      this.prisma.sesi.count({ where }),
    ]);
    return paginationResult(data, total, query.page, query.limit);
  }

  async findOne(id: string, actor: { id: string; role: Role }) {
    const session = await this.prisma.sesi.findUnique({
      where: { id },
      include: sessionRelations,
    });
    if (!session) throw new NotFoundException('Sesi tidak ditemukan.');
    if (actor.role === Role.TRAINER && session.trainerId !== actor.id) {
      throw new ForbiddenException('Anda tidak memiliki akses ke sesi ini.');
    }
    return session;
  }

  private async assertCanControl(
    id: string,
    actor: { id: string; role: Role },
  ) {
    const session = await this.prisma.sesi.findUnique({
      where: { id },
      select: { id: true, status: true, trainerId: true },
    });
    if (!session) throw new NotFoundException('Sesi tidak ditemukan.');
    if (actor.role === Role.TRAINER && session.trainerId !== actor.id) {
      throw new ForbiddenException('Anda tidak memiliki akses ke sesi ini.');
    }
    return session;
  }

  private async createQrToken(sesiId: string, now = new Date()) {
    const token = randomUUID();
    const expiredAt = new Date(now.getTime() + qrIntervalMs());
    const created = await this.prisma.$transaction(async (transaction) => {
      await transaction.qrToken.deleteMany({ where: { sesiId } });
      return transaction.qrToken.create({
        data: { sesiId, token, expiredAt },
        select: { token: true, expiredAt: true },
      });
    });
    return created;
  }

  private async getQrToken(sesiId: string) {
    return this.prisma.qrToken.findFirst({
      where: { sesiId },
      orderBy: { createdAt: 'desc' },
      select: { token: true, expiredAt: true },
    });
  }

  async open(id: string, actor: { id: string; role: Role }) {
    const session = await this.assertCanControl(id, actor);
    if (session.status !== StatusSesi.DRAFT) {
      throw new BadRequestException(
        'Sesi hanya dapat dibuka dari status DRAFT.',
      );
    }
    const now = new Date();
    await this.prisma.sesi.update({
      where: { id },
      data: {
        status: StatusSesi.DIBUKA,
        waktuBuka: now,
        waktuTutup: null,
        durasiJam: null,
      },
    });
    const qr = await this.createQrToken(id, now);
    return this.getControlState(id, actor, qr);
  }

  async close(id: string, actor: { id: string; role: Role }) {
    const session = await this.assertCanControl(id, actor);
    if (session.status !== StatusSesi.DIBUKA) {
      throw new BadRequestException(
        'Sesi hanya dapat ditutup dari status DIBUKA.',
      );
    }
    const now = new Date();
    const opened = await this.prisma.sesi.findUnique({
      where: { id },
      select: { waktuBuka: true },
    });
    if (!opened?.waktuBuka)
      throw new BadRequestException('Waktu buka sesi belum tersedia.');
    const duration = new Prisma.Decimal(
      ((now.getTime() - opened.waktuBuka.getTime()) / 3_600_000).toFixed(2),
    );

    await this.prisma.$transaction(async (transaction) => {
      const assignments = await transaction.assignment.findMany({
        where: { sesiId: id },
        select: { karyawanId: true },
      });
      const existing = await transaction.absensi.findMany({
        where: { sesiId: id, status: StatusAbsensi.HADIR },
        select: { karyawanId: true },
      });
      const attendedIds = new Set(
        existing.map((attendance) => attendance.karyawanId),
      );
      await transaction.absensi.createMany({
        data: assignments
          .filter((assignment) => !attendedIds.has(assignment.karyawanId))
          .map((assignment) => ({
            karyawanId: assignment.karyawanId,
            sesiId: id,
            status: StatusAbsensi.ALPHA,
          })),
        skipDuplicates: true,
      });
      await transaction.assignment.updateMany({
        where: { sesiId: id, status: StatusAssignment.DITUGASKAN },
        data: { status: StatusAssignment.SELESAI },
      });
      await transaction.qrToken.deleteMany({ where: { sesiId: id } });
      await transaction.sesi.update({
        where: { id },
        data: {
          status: StatusSesi.DITUTUP,
          waktuTutup: now,
          durasiJam: duration,
        },
      });
    });
    return this.getControlState(id, actor);
  }

  async getParticipants(id: string, actor: { id: string; role: Role }) {
    await this.assertCanControl(id, actor);
    const assignments = await this.prisma.assignment.findMany({
      where: { sesiId: id },
      include: {
        karyawan: {
          select: {
            id: true,
            nama: true,
            email: true,
            departemen: { select: { nama: true } },
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
      },
      orderBy: { karyawan: { nama: 'asc' } },
    });
    return assignments.map((assignment) => ({
      id: assignment.id,
      status: assignment.status,
      karyawan: assignment.karyawan,
      absensi: assignment.absensi,
    }));
  }

  private async getControlState(
    id: string,
    actor: { id: string; role: Role },
    qr?: { token: string; expiredAt: Date },
  ) {
    const session = await this.findOne(id, actor);
    const currentQr =
      qr ??
      (session.status === StatusSesi.DIBUKA ? await this.getQrToken(id) : null);
    return {
      session,
      qr: currentQr,
      participants: await this.getParticipants(id, actor),
    };
  }

  async stream(id: string, actor: { id: string; role: Role }) {
    await this.assertCanControl(id, actor);
    return new Observable<{ data: unknown }>((subscriber) => {
      let stopped = false;
      const emit = async () => {
        try {
          const session = await this.prisma.sesi.findUnique({
            where: { id },
            select: { status: true },
          });
          if (!session || session.status !== StatusSesi.DIBUKA) {
            subscriber.next({ data: { type: 'closed' } });
            subscriber.complete();
            return;
          }
          const qr = await this.createQrToken(id);
          const state = await this.getControlState(id, actor, qr);
          subscriber.next({ data: { type: 'update', ...state } });
        } catch (error) {
          subscriber.error(error);
        }
      };
      void emit();
      const timer = setInterval(() => {
        if (!stopped) void emit();
      }, qrIntervalMs());
      return () => {
        stopped = true;
        clearInterval(timer);
      };
    });
  }
}
