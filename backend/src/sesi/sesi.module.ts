import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { SesiController } from './sesi.controller.js';
import { SesiService } from './sesi.service.js';

@Module({
  imports: [AuthModule],
  controllers: [SesiController],
  providers: [SesiService],
})
export class SesiModule {}
