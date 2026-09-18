import { IsUUID } from 'class-validator';

export class CreateSesiDto {
  @IsUUID()
  trainingId!: string;

  @IsUUID()
  trainerId!: string;
}
