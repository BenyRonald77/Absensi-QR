import { StatusSesi } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination.dto.js';

export class SesiQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  trainingId?: string;

  @IsOptional()
  @IsEnum(StatusSesi)
  status?: StatusSesi;
}
