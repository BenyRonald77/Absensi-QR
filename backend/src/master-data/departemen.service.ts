import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { paginationResult } from '../common/pagination.dto.js';
import { rethrowPrismaError } from '../common/prisma-error.js';
import type { PaginationQueryDto } from '../common/pagination.dto.js';
import type { DepartemenDto } from './dto/departemen.dto.js';

@Injectable()
export class DepartemenService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: DepartemenDto) {
    try {
      return await this.prisma.departemen.create({
        data: { nama: dto.nama.trim() },
      });
    } catch (error) {
      rethrowPrismaError(error);
    }
  }

  async findAll({ page, limit }: PaginationQueryDto) {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.departemen.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { nama: 'asc' },
        include: { _count: { select: { karyawan: true } } },
      }),
      this.prisma.departemen.count(),
    ]);
    return paginationResult(data, total, page, limit);
  }

  async findOne(id: string) {
    const department = await this.prisma.departemen.findUnique({
      where: { id },
      include: { _count: { select: { karyawan: true } } },
    });
    if (!department) throw new NotFoundException('Departemen tidak ditemukan.');
    return department;
  }

  async update(id: string, dto: DepartemenDto) {
    try {
      return await this.prisma.departemen.update({
        where: { id },
        data: { nama: dto.nama.trim() },
      });
    } catch (error) {
      rethrowPrismaError(error);
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.departemen.delete({ where: { id } });
      return { message: 'Departemen berhasil dihapus.' };
    } catch (error) {
      rethrowPrismaError(error);
    }
  }
}
