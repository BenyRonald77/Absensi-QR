import { ArrayNotEmpty, ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class CreateAssignmentsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  karyawanIds!: string[];
}
