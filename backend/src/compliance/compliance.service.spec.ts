import { Prisma, StatusAbsensi } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../database/prisma.service.js';
import {
  ComplianceService,
  getJakartaCalendarYearRange,
} from './compliance.service.js';

function createService() {
  const prisma = {
    complianceSetting: { findUnique: vi.fn(), upsert: vi.fn() },
    absensi: { findMany: vi.fn() },
  };
  return {
    prisma,
    service: new ComplianceService(prisma as unknown as PrismaService),
  };
}

describe('getJakartaCalendarYearRange', () => {
  it('uses inclusive Jan 1 and exclusive next Jan 1 in Jakarta time', () => {
    expect(getJakartaCalendarYearRange(2026)).toEqual({
      start: new Date('2025-12-31T17:00:00.000Z'),
      end: new Date('2026-12-31T17:00:00.000Z'),
    });
  });
});

describe('ComplianceService', () => {
  it('sums stored session durations exactly for HADIR rows in the selected year', async () => {
    const { prisma, service } = createService();
    prisma.complianceSetting.findUnique.mockResolvedValue({
      targetHours: new Prisma.Decimal('6.00'),
    });
    prisma.absensi.findMany.mockResolvedValue([
      { sesi: { durasiJam: new Prisma.Decimal('0.10') } },
      { sesi: { durasiJam: new Prisma.Decimal('0.20') } },
      { sesi: { durasiJam: new Prisma.Decimal('2.35') } },
    ]);

    const result = await service.getEmployeeSummary('employee-1', 2026);

    expect(prisma.absensi.findMany).toHaveBeenCalledWith({
      where: {
        karyawanId: 'employee-1',
        status: StatusAbsensi.HADIR,
        sesi: {
          is: {
            waktuBuka: {
              gte: new Date('2025-12-31T17:00:00.000Z'),
              lt: new Date('2026-12-31T17:00:00.000Z'),
            },
            durasiJam: { not: null },
          },
        },
      },
      select: { sesi: { select: { durasiJam: true } } },
    });
    expect(result).toEqual({
      employeeId: 'employee-1',
      year: 2026,
      totalHours: 2.65,
      targetHours: 6,
      status: 'BELUM_MEMENUHI',
      progressPercent: 44.17,
      attendedSessionsCount: 3,
    });
  });

  it('marks an employee compliant at the exact target and caps progress at 100%', async () => {
    const { prisma, service } = createService();
    prisma.complianceSetting.findUnique.mockResolvedValue({
      targetHours: new Prisma.Decimal('6.00'),
    });
    prisma.absensi.findMany.mockResolvedValue([
      { sesi: { durasiJam: new Prisma.Decimal('3.33') } },
      { sesi: { durasiJam: new Prisma.Decimal('2.67') } },
      { sesi: { durasiJam: new Prisma.Decimal('0.25') } },
    ]);

    const result = await service.getEmployeeSummary('employee-2', 2025);

    expect(result.totalHours).toBe(6.25);
    expect(result.status).toBe('SUDAH_MEMENUHI');
    expect(result.progressPercent).toBe(100);
  });

  it('persists the configurable target instead of changing a code constant', async () => {
    const { prisma, service } = createService();
    prisma.complianceSetting.upsert.mockResolvedValue({
      targetHours: new Prisma.Decimal('8.50'),
      updatedAt: new Date('2026-09-18T00:00:00.000Z'),
    });

    const result = await service.updateTarget(8.5);

    expect(prisma.complianceSetting.upsert).toHaveBeenCalledWith({
      where: { id: 1 },
      create: { id: 1, targetHours: new Prisma.Decimal('8.5') },
      update: { targetHours: new Prisma.Decimal('8.5') },
      select: { targetHours: true, updatedAt: true },
    });
    expect(result.targetHours).toBe(8.5);
  });
});
