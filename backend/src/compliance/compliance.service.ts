import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { Prisma, StatusAbsensi } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';

const JAKARTA_UTC_OFFSET_MS = 7 * 60 * 60 * 1000;
const SETTING_ID = 1;

export function getJakartaCalendarYearRange(year: number) {
  return {
    start: new Date(Date.UTC(year, 0, 1) - JAKARTA_UTC_OFFSET_MS),
    end: new Date(Date.UTC(year + 1, 0, 1) - JAKARTA_UTC_OFFSET_MS),
  };
}

export function getCurrentJakartaYear() {
  return Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
    }).format(new Date()),
  );
}

@Injectable()
export class ComplianceService {
  constructor(private readonly prisma: PrismaService) {}

  async getEmployeeSummary(employeeId: string, requestedYear?: number) {
    const year =
      requestedYear === undefined
        ? getCurrentJakartaYear()
        : Number(requestedYear);
    if (!Number.isInteger(year) || year < 1000 || year > 9998) {
      throw new BadRequestException(
        'Tahun harus berupa bilangan bulat 1000–9998.',
      );
    }
    const { start, end } = getJakartaCalendarYearRange(year);
    const [setting, attendance] = await Promise.all([
      this.prisma.complianceSetting.findUnique({
        where: { id: SETTING_ID },
        select: { targetHours: true },
      }),
      this.prisma.absensi.findMany({
        where: {
          karyawanId: employeeId,
          status: StatusAbsensi.HADIR,
          sesi: {
            is: {
              waktuBuka: { gte: start, lt: end },
              durasiJam: { not: null },
            },
          },
        },
        select: { sesi: { select: { durasiJam: true } } },
      }),
    ]);

    if (!setting) {
      throw new InternalServerErrorException(
        'Pengaturan target compliance belum tersedia. Jalankan seed database.',
      );
    }

    const total = attendance.reduce(
      (sum, row) => (row.sesi.durasiJam ? sum.add(row.sesi.durasiJam) : sum),
      new Prisma.Decimal(0),
    );
    const target = setting.targetHours;
    const progressPercent = total.gte(target)
      ? 100
      : total.div(target).mul(100).toDecimalPlaces(2).toNumber();

    return {
      employeeId,
      year,
      totalHours: total.toNumber(),
      targetHours: target.toNumber(),
      status: total.gte(target) ? 'SUDAH_MEMENUHI' : 'BELUM_MEMENUHI',
      progressPercent,
      attendedSessionsCount: attendance.length,
    };
  }

  async getSetting() {
    const setting = await this.prisma.complianceSetting.findUnique({
      where: { id: SETTING_ID },
      select: { targetHours: true, updatedAt: true },
    });
    if (!setting) {
      throw new InternalServerErrorException(
        'Pengaturan target compliance belum tersedia. Jalankan seed database.',
      );
    }

    return {
      targetHours: setting.targetHours.toNumber(),
      updatedAt: setting.updatedAt,
    };
  }

  async updateTarget(targetHours: number) {
    const setting = await this.prisma.complianceSetting.upsert({
      where: { id: SETTING_ID },
      create: { id: SETTING_ID, targetHours: new Prisma.Decimal(targetHours) },
      update: { targetHours: new Prisma.Decimal(targetHours) },
      select: { targetHours: true, updatedAt: true },
    });

    return {
      targetHours: setting.targetHours.toNumber(),
      updatedAt: setting.updatedAt,
    };
  }
}
