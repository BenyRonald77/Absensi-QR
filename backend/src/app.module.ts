import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { DatabaseModule } from './database/database.module.js';
import { ComplianceModule } from './compliance/compliance.module.js';
import { AssignmentModule } from './assignment/assignment.module.js';
import { AttendanceModule } from './attendance/attendance.module.js';
import { MasterDataModule } from './master-data/master-data.module.js';
import { SesiModule } from './sesi/sesi.module.js';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    MasterDataModule,
    SesiModule,
    ComplianceModule,
    AssignmentModule,
    AttendanceModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
