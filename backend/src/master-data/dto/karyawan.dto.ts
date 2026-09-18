import { Role } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination.dto.js';

export class CreateKaryawanDto {
  @IsString()
  @Length(1, 150)
  nama!: string;

  @IsEmail()
  @MaxLength(255)
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;

  @IsUUID()
  departemenId!: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}

export class UpdateKaryawanDto {
  @IsOptional()
  @IsString()
  @Length(1, 150)
  nama?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password?: string;

  @IsOptional()
  @IsUUID()
  departemenId?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}

export class KaryawanListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  departemenId?: string;
}
