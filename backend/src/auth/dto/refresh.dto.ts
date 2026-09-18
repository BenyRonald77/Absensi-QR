import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RefreshDto {
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  refreshToken?: string;
}
