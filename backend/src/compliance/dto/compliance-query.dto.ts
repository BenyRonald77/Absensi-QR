import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination.dto.js';

export enum ComplianceStatus {
  SUDAH_MEMENUHI = 'SUDAH_MEMENUHI',
  BELUM_MEMENUHI = 'BELUM_MEMENUHI',
}

export class ComplianceQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1000)
  @Max(9998)
  year?: number;
}

export class ComplianceDashboardQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1000)
  @Max(9998)
  year?: number;

  @IsOptional()
  @IsUUID()
  departemenId?: string;

  @IsOptional()
  @IsEnum(ComplianceStatus)
  status?: ComplianceStatus;
}
