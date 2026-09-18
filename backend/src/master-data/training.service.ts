import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import {
  paginationResult,
  type PaginationQueryDto,
} from '../common/pagination.dto.js';
import { rethrowPrismaError } from '../common/prisma-error.js';
import type {
  CreateTrainingDto,
  UpdateTrainingDto,
} from './dto/training.dto.js';

@Injectable()
export class TrainingService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTrainingDto) {
    return this.prisma.training.create({
      data: { nama: dto.nama.trim(), deskripsi: dto.deskripsi?.trim() || null },
    });
  }

  async findAll({ page, limit }: PaginationQueryDto) {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.training.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { sesi: true } } },
      }),
      this.prisma.training.count(),
    ]);
    return paginationResult(data, total, page, limit);
  }

  async findOne(id: string) {
    const training = await this.prisma.training.findUnique({
      where: { id },
      include: { _count: { select: { sesi: true } } },
    });
    if (!training) throw new NotFoundException('Training tidak ditemukan.');
    return training;
  }

  async update(id: string, dto: UpdateTrainingDto) {
    try {
      return await this.prisma.training.update({
        where: { id },
        data: {
          ...(dto.nama !== undefined ? { nama: dto.nama.trim() } : {}),
          ...(dto.deskripsi !== undefined
            ? { deskripsi: dto.deskripsi?.trim() || null }
            : {}),
        },
      });
    } catch (error) {
      rethrowPrismaError(error);
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.training.delete({ where: { id } });
      return { message: 'Training berhasil dihapus.' };
    } catch (error) {
      rethrowPrismaError(error);
    }
  }
}
