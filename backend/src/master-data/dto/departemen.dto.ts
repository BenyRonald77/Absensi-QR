import { IsString, Length } from 'class-validator';

export class DepartemenDto {
  @IsString()
  @Length(1, 120)
  nama!: string;
}
