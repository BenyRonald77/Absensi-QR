import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../database/prisma.service.js';
import type { AccessTokenPayload, AuthenticatedUser } from './auth.types.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret || secret.startsWith('replace-with-')) {
      throw new Error(
        'JWT_ACCESS_SECRET belum dikonfigurasi dengan secret yang aman.',
      );
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: AccessTokenPayload): Promise<AuthenticatedUser> {
    if (payload.type !== 'access' || !payload.sub)
      throw new UnauthorizedException();
    const user = await this.prisma.karyawan.findUnique({
      where: { id: payload.sub },
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
    };
  }
}
