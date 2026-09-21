import { Transform } from 'class-transformer';
import { IsLatitude, IsLongitude, IsNumber, IsOptional } from 'class-validator';

function optionalCoordinate(value: unknown): unknown {
  if (value === null || value === undefined || value === '') return undefined;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? Number(value.toFixed(6)) : undefined;
  }
  if (typeof value !== 'string') return undefined;

  const numericValue = Number(value.trim());
  return Number.isFinite(numericValue) ? Number(numericValue.toFixed(6)) : undefined;
}

export class ConfirmAttendanceDto {
  @IsOptional()
  @Transform(({ value }) => optionalCoordinate(value))
  @IsNumber({ maxDecimalPlaces: 6 })
  @IsLatitude()
  latitude?: number;

  @IsOptional()
  @Transform(({ value }) => optionalCoordinate(value))
  @IsNumber({ maxDecimalPlaces: 6 })
  @IsLongitude()
  longitude?: number;
}
