import { IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class CreateTrainingDto {
  @IsString()
  @Length(1, 180)
  nama!: string;

  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  deskripsi?: string;
}

export class UpdateTrainingDto {
  @IsOptional()
  @IsString()
  @Length(1, 180)
  nama?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  deskripsi?: string | null;
}
