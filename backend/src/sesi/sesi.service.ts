import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { paginationResult } from '../common/pagination.dto.js';
import { PrismaService } from '../database/prisma.service.js';
import type { CreateSesiDto } from './dto/create-sesi.dto.js';
import type { SesiQueryDto } from './dto/sesi-query.dto.js';

const sessionRelations = {
  training: { select: { id: true, nama: true, deskripsi: true } },
  trainer: { select: { id: true, nama: true, email: true } },
  _count: { select: { assignments: true, absensi: true } },
} as const;

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
}
