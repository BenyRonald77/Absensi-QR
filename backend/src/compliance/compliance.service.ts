import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { Prisma, StatusAbsensi } from '@prisma/client';
import { paginationResult } from '../common/pagination.dto.js';
import { PrismaService } from '../database/prisma.service.js';
import {
  ComplianceDashboardQueryDto,
  ComplianceStatus,
} from './dto/compliance-query.dto.js';

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

function normalizedYear(requestedYear?: number) {
  const year =
    requestedYear === undefined
      ? getCurrentJakartaYear()
      : Number(requestedYear);
  if (!Number.isInteger(year) || year < 1000 || year > 9998) {
    throw new BadRequestException(
      'Tahun harus berupa bilangan bulat 1000–9998.',
    );
  }
  return year;
}

@Injectable()
export class ComplianceService {
  constructor(private readonly prisma: PrismaService) {}

  async getEmployeeSummary(employeeId: string, requestedYear?: number) {
    const year = normalizedYear(requestedYear);
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

  async getDashboard(query: ComplianceDashboardQueryDto) {
    const year = normalizedYear(query.year);
    const { start, end } = getJakartaCalendarYearRange(year);
    const [setting, employees] = await Promise.all([
      this.prisma.complianceSetting.findUnique({
        where: { id: SETTING_ID },
        select: { targetHours: true },
      }),
      this.prisma.karyawan.findMany({
        where: {
          role: 'KARYAWAN',
          ...(query.departemenId ? { departemenId: query.departemenId } : {}),
        },
        select: {
          id: true,
          nama: true,
          email: true,
          aktif: true,
          departemen: { select: { id: true, nama: true } },
        },
        orderBy: { nama: 'asc' },
      }),
    ]);
    if (!setting) {
      throw new InternalServerErrorException(
        'Pengaturan target compliance belum tersedia. Jalankan seed database.',
      );
    }

    const employeeIds = employees.map((employee) => employee.id);
    const attendance = employeeIds.length
      ? await this.prisma.absensi.findMany({
          where: {
            karyawanId: { in: employeeIds },
            status: StatusAbsensi.HADIR,
            sesi: {
              is: {
                waktuBuka: { gte: start, lt: end },
                durasiJam: { not: null },
              },
            },
          },
          select: {
            karyawanId: true,
            sesi: { select: { durasiJam: true } },
          },
        })
      : [];

    const hoursByEmployee = new Map(
      employeeIds.map((id) => [id, new Prisma.Decimal(0)]),
    );
    for (const record of attendance) {
      if (!record.sesi.durasiJam) continue;
      const current = hoursByEmployee.get(record.karyawanId);
      if (current) {
        hoursByEmployee.set(
          record.karyawanId,
          current.add(record.sesi.durasiJam),
        );
      }
    }

    const target = setting.targetHours;
    const rows = employees.map((employee) => {
      const total = hoursByEmployee.get(employee.id) ?? new Prisma.Decimal(0);
      const compliant = total.gte(target);
      return {
        id: employee.id,
        nama: employee.nama,
        email: employee.email,
        aktif: employee.aktif,
        departemen: employee.departemen,
        totalHours: total.toNumber(),
        targetHours: target.toNumber(),
        status: compliant
          ? ComplianceStatus.SUDAH_MEMENUHI
          : ComplianceStatus.BELUM_MEMENUHI,
        progressPercent: compliant
          ? 100
          : total.div(target).mul(100).toDecimalPlaces(2).toNumber(),
      };
    });

    const summary = {
      year,
      targetHours: target.toNumber(),
      totalKaryawan: rows.length,
      sudahMemenuhi: rows.filter(
        (row) => row.status === ComplianceStatus.SUDAH_MEMENUHI,
      ).length,
      belumMemenuhi: rows.filter(
        (row) => row.status === ComplianceStatus.BELUM_MEMENUHI,
      ).length,
    };
    const filteredRows = query.status
      ? rows.filter((row) => row.status === query.status)
      : rows;
    const result = paginationResult(
      filteredRows.slice(
        (query.page - 1) * query.limit,
        query.page * query.limit,
      ),
      filteredRows.length,
      query.page,
      query.limit,
    );

    return { ...result, summary };
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
