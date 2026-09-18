import { Role } from '@prisma/client';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: Role;
  type: 'access';
}

export interface AuthenticatedUser {
  id: string;
  nama: string;
  email: string;
  role: Role;
  aktif: boolean;
  departemenId: string;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
  user: Omit<AuthenticatedUser, 'aktif' | 'departemenId'> & {
    departemen: { id: string; nama: string };
  };
}
