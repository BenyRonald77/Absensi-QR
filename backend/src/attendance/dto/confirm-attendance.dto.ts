import { Type } from 'class-transformer';
import { IsLatitude, IsLongitude, IsNumber, IsOptional } from 'class-validator';

export class ConfirmAttendanceDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 })
  @IsLatitude()
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 })
  @IsLongitude()
  longitude?: number;
}
