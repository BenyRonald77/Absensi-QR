import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AssignmentController } from './assignment.controller.js';
import { AssignmentService } from './assignment.service.js';

@Module({
  imports: [AuthModule],
  controllers: [AssignmentController],
  providers: [AssignmentService],
})
export class AssignmentModule {}
