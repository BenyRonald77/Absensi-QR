import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { DepartemenController } from './departemen.controller.js';
import { DepartemenService } from './departemen.service.js';
import { KaryawanController } from './karyawan.controller.js';
import { KaryawanService } from './karyawan.service.js';
import { TrainingController } from './training.controller.js';
import { TrainingService } from './training.service.js';

@Module({
  imports: [AuthModule],
  controllers: [DepartemenController, KaryawanController, TrainingController],
  providers: [DepartemenService, KaryawanService, TrainingService],
  exports: [KaryawanService],
})
export class MasterDataModule {}
