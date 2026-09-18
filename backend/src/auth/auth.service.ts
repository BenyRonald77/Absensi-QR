import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../database/prisma.service.js';
import type { AuthResponse, AuthenticatedUser } from './auth.types.js';

const accessTtl = process.env.JWT_ACCESS_TTL ?? '15m';
const refreshTtl = process.env.JWT_REFRESH_TTL ?? '7d';
const refreshCookieName = 'refresh_token';

function ttlToMilliseconds(value: string): number {
  const match = value.match(/^(\d+)(s|m|h|d)$/);
  if (!match) throw new Error(`Format durasi JWT tidak valid: ${value}`);

  const amount = Number(match[1]);
  const unit = match[2];
  const multiplier = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 }[
    unit as 's' | 'm' | 'h' | 'd'
  ];
  return amount * multiplier;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function publicUser(user: {
  id: string;
  nama: string;
  email: string;
  role: Role;
  departemen: { id: string; nama: string };
}): AuthResponse['user'] {
  return {
    id: user.id,
    nama: user.nama,
    email: user.email,
    role: user.role,
    departemen: user.departemen,
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.prisma.karyawan.findUnique({
      where: { email: email.toLowerCase() },
      include: { departemen: { select: { id: true, nama: true } } },
    });

    if (
      !user ||
      !user.aktif ||
      !(await bcrypt.compare(password, user.passwordHash))
    ) {
      throw new UnauthorizedException('Email atau kata sandi tidak valid.');
    }

    const tokens = await this.createTokenPair(user);
    await this.persistRefreshToken(user.id, tokens.refreshToken);
    return {
      response: this.toAuthResponse(user, tokens.accessToken),
      refreshToken: tokens.refreshToken,
    };
  }

  async refresh(refreshToken?: string) {
    if (!refreshToken)
      throw new UnauthorizedException('Refresh token tidak tersedia.');

    let payload: { sub: string; type: string; jti?: string };
    try {
      payload = await this.jwt.verifyAsync(refreshToken, {
        secret: this.requiredSecret('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException(
        'Refresh token tidak valid atau sudah kedaluwarsa.',
      );
    }

    if (payload.type !== 'refresh' || !payload.sub) {
      throw new UnauthorizedException('Refresh token tidak valid.');
    }

    const tokenHash = hashToken(refreshToken);
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        karyawan: {
          include: { departemen: { select: { id: true, nama: true } } },
        },
      },
    });

    if (
      !storedToken ||
      storedToken.revokedAt ||
      storedToken.expiresAt <= new Date() ||
      storedToken.karyawanId !== payload.sub ||
      !storedToken.karyawan.aktif
    ) {
      throw new UnauthorizedException(
        'Refresh token tidak valid atau sudah digunakan.',
      );
    }

    const tokens = await this.createTokenPair(storedToken.karyawan);
    const now = new Date();
    await this.prisma.$transaction(async (transaction) => {
      const revoked = await transaction.refreshToken.updateMany({
        where: { id: storedToken.id, revokedAt: null, expiresAt: { gt: now } },
        data: { revokedAt: now },
      });
      if (revoked.count !== 1) {
        throw new UnauthorizedException('Refresh token sudah digunakan.');
      }
      await transaction.refreshToken.create({
        data: {
          karyawanId: storedToken.karyawanId,
          tokenHash: hashToken(tokens.refreshToken),
          expiresAt: new Date(Date.now() + ttlToMilliseconds(refreshTtl)),
        },
      });
    });

    return {
      response: this.toAuthResponse(storedToken.karyawan, tokens.accessToken),
      refreshToken: tokens.refreshToken,
    };
  }

  async logout(refreshToken?: string): Promise<void> {
    if (!refreshToken) return;
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async getCurrentUser(
    userId: string,
  ): Promise<AuthenticatedUser & { departemen: { id: string; nama: string } }> {
    const user = await this.prisma.karyawan.findUnique({
      where: { id: userId },
      include: { departemen: { select: { id: true, nama: true } } },
    });
    if (!user || !user.aktif)
      throw new UnauthorizedException('Akun tidak aktif atau tidak ditemukan.');

    return {
      id: user.id,
      nama: user.nama,
      email: user.email,
      role: user.role,
      aktif: user.aktif,
      departemenId: user.departemenId,
      departemen: user.departemen,
    };
  }

  async verifyPassword(password: string, passwordHash: string) {
    return bcrypt.compare(password, passwordHash);
  }

  private async createTokenPair(user: {
    id: string;
    email: string;
    role: Role;
  }) {
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, email: user.email, role: user.role, type: 'access' },
      {
        secret: this.requiredSecret('JWT_ACCESS_SECRET'),
        expiresIn: accessTtl as `${number}${'s' | 'm' | 'h' | 'd'}`,
      },
    );
    const refreshToken = await this.jwt.signAsync(
      { sub: user.id, type: 'refresh', jti: randomUUID() },
      {
        secret: this.requiredSecret('JWT_REFRESH_SECRET'),
        expiresIn: refreshTtl as `${number}${'s' | 'm' | 'h' | 'd'}`,
      },
    );
    return { accessToken, refreshToken };
  }

  private async persistRefreshToken(userId: string, token: string) {
    await this.prisma.refreshToken.create({
      data: {
        karyawanId: userId,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + ttlToMilliseconds(refreshTtl)),
      },
    });
  }

  private toAuthResponse(
    user: {
      id: string;
      nama: string;
      email: string;
      role: Role;
      departemen: { id: string; nama: string };
    },
    accessToken: string,
  ): AuthResponse {
    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: accessTtl,
      user: publicUser(user),
    };
  }

  private requiredSecret(name: 'JWT_ACCESS_SECRET' | 'JWT_REFRESH_SECRET') {
    const value = process.env[name];
    if (!value || value.startsWith('replace-with-')) {
      throw new Error(`${name} belum dikonfigurasi dengan secret yang aman.`);
    }
    return value;
  }
}

export const AUTH_REFRESH_COOKIE = refreshCookieName;
export const AUTH_REFRESH_COOKIE_MAX_AGE = ttlToMilliseconds(refreshTtl);
