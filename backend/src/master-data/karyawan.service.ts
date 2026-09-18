import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../database/prisma.service.js';
import {
  paginationResult,
  type PaginationQueryDto,
} from '../common/pagination.dto.js';
import { rethrowPrismaError } from '../common/prisma-error.js';
import type {
  CreateKaryawanDto,
  KaryawanListQueryDto,
  UpdateKaryawanDto,
} from './dto/karyawan.dto.js';

const publicKaryawanSelect = {
  id: true,
  nama: true,
  email: true,
  departemenId: true,
  role: true,
  aktif: true,
  createdAt: true,
  departemen: { select: { id: true, nama: true } },
} satisfies Prisma.KaryawanSelect;

@Injectable()
export class KaryawanService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateKaryawanDto) {
    const passwordHash = await bcrypt.hash(dto.password, 12);
    try {
      return await this.prisma.karyawan.create({
        data: {
          nama: dto.nama.trim(),
          email: dto.email.toLowerCase(),
          passwordHash,
          departemenId: dto.departemenId,
          role: dto.role ?? Role.KARYAWAN,
        },
        select: publicKaryawanSelect,
      });
    } catch (error) {
      rethrowPrismaError(error);
    }
  }

  async findAll(pagination: PaginationQueryDto, filter: KaryawanListQueryDto) {
    const where: Prisma.KaryawanWhereInput = filter.departemenId
      ? { departemenId: filter.departemenId }
      : {};
    const [data, total] = await this.prisma.$transaction([
      this.prisma.karyawan.findMany({
        where,
        select: publicKaryawanSelect,
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
        orderBy: { nama: 'asc' },
      }),
      this.prisma.karyawan.count({ where }),
    ]);
    return paginationResult(data, total, pagination.page, pagination.limit);
  }

  async findOne(id: string) {
    const employee = await this.prisma.karyawan.findUnique({
      where: { id },
      select: publicKaryawanSelect,
    });
    if (!employee) throw new NotFoundException('Karyawan tidak ditemukan.');
    return employee;
  }

  async update(id: string, dto: UpdateKaryawanDto) {
    const data: Prisma.KaryawanUncheckedUpdateInput = {};
    if (dto.nama !== undefined) data.nama = dto.nama.trim();
    if (dto.email !== undefined) data.email = dto.email.toLowerCase();
    if (dto.departemenId !== undefined) data.departemenId = dto.departemenId;
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.password !== undefined)
      data.passwordHash = await bcrypt.hash(dto.password, 12);

    try {
      return await this.prisma.karyawan.update({
        where: { id },
        data,
        select: publicKaryawanSelect,
      });
    } catch (error) {
      rethrowPrismaError(error);
    }
  }

  async deactivate(id: string) {
    try {
      return await this.prisma.karyawan.update({
        where: { id },
        data: { aktif: false },
        select: publicKaryawanSelect,
      });
    } catch (error) {
      rethrowPrismaError(error);
    }
  }

  async listTrainers({ page, limit }: PaginationQueryDto) {
    const where = { role: Role.TRAINER, aktif: true };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.karyawan.findMany({
        where,
        select: { id: true, nama: true, email: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { nama: 'asc' },
      }),
      this.prisma.karyawan.count({ where }),
    ]);
    return paginationResult(data, total, page, limit);
  }
}
