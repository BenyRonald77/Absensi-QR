import { Transform } from 'class-transformer';
import { IsLatitude, IsLongitude, IsNumber, IsOptional } from 'class-validator';

function optionalCoordinate(value: unknown): unknown {
  if (value === null || value === undefined || value === '') return undefined;
  if (typeof value === 'number') return value;
  return Number(value);
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
