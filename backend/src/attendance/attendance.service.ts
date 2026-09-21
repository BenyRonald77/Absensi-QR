import {
  ConflictException,
  ForbiddenException,
  GoneException,
  Injectable,
} from '@nestjs/common';
import {
  Prisma,
  Role,
  StatusAbsensi,
  StatusAssignment,
  StatusSesi,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';
import type { ConfirmAttendanceDto } from './dto/confirm-attendance.dto.js';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  private async getValidToken(token: string) {
    const qr = await this.prisma.qrToken.findUnique({
      where: { token },
      include: {
        sesi: {
          select: {
            id: true,
            status: true,
            waktuBuka: true,
            training: { select: { id: true, nama: true, deskripsi: true } },
            trainer: { select: { id: true, nama: true } },
          },
        },
      },
    });
    if (
      !qr ||
      qr.expiredAt <= new Date() ||
      qr.sesi.status !== StatusSesi.DIBUKA
    ) {
      throw new GoneException(
        'QR sudah kedaluwarsa atau sesi sudah ditutup. Silakan scan QR terbaru.',
      );
    }
    return qr;
  }

  async getPublicToken(token: string) {
    const qr = await this.getValidToken(token);
    return {
      token: qr.token,
      expiredAt: qr.expiredAt,
      sesiId: qr.sesi.id,
      waktuBuka: qr.sesi.waktuBuka,
      training: qr.sesi.training,
      trainer: qr.sesi.trainer,
    };
  }

  async getStatus(token: string, actor: { id: string; role: Role }) {
    const qr = await this.getValidToken(token);
    if (actor.role !== Role.KARYAWAN) {
      throw new ForbiddenException(
        'Hanya Karyawan yang dapat melakukan absensi.',
      );
    }
    const assignment = await this.prisma.assignment.findUnique({
      where: {
        karyawanId_sesiId: { karyawanId: actor.id, sesiId: qr.sesi.id },
      },
      select: { status: true },
    });
    if (!assignment || assignment.status === StatusAssignment.DIBATALKAN) {
      return {
        eligible: false,
        alreadyAttended: false,
        message: 'Anda tidak terdaftar sebagai peserta pada training ini.',
      };
    }
    const attendance = await this.prisma.absensi.findUnique({
      where: {
        karyawanId_sesiId: { karyawanId: actor.id, sesiId: qr.sesi.id },
      },
      select: { id: true, status: true, waktuScan: true },
    });
    return {
      eligible: true,
      alreadyAttended: Boolean(attendance),
      attendance,
      message: attendance
        ? 'Anda sudah tercatat hadir pada sesi ini.'
        : 'Anda dapat mengonfirmasi kehadiran.',
    };
  }

  async confirm(
    token: string,
    actor: { id: string; role: Role },
    dto: ConfirmAttendanceDto,
  ) {
    const qr = await this.getValidToken(token);
    if (actor.role !== Role.KARYAWAN) {
      throw new ForbiddenException(
        'Hanya Karyawan yang dapat melakukan absensi.',
      );
    }
    const assignment = await this.prisma.assignment.findUnique({
      where: {
        karyawanId_sesiId: { karyawanId: actor.id, sesiId: qr.sesi.id },
      },
      select: { status: true },
    });
    if (!assignment || assignment.status === StatusAssignment.DIBATALKAN) {
      throw new ForbiddenException(
        'Anda tidak terdaftar sebagai peserta pada training ini.',
      );
    }
    try {
      const attendance = await this.prisma.absensi.create({
        data: {
          karyawanId: actor.id,
          sesiId: qr.sesi.id,
          latitude: dto.latitude,
          longitude: dto.longitude,
          status: StatusAbsensi.HADIR,
        },
        select: {
          id: true,
          status: true,
          waktuScan: true,
          latitude: true,
          longitude: true,
        },
      });
      return { message: 'Kehadiran berhasil dicatat.', attendance };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Anda sudah tercatat hadir pada sesi ini.');
      }
      throw error;
    }
  }
}
