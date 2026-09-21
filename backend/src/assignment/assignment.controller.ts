import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { CreateAssignmentsDto } from './dto/assignment.dto.js';
import { AssignmentService } from './assignment.service.js';

@Controller('sesi/:sesiId/assignments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AssignmentController {
  constructor(private readonly assignments: AssignmentService) {}

  @Get()
  @Roles(Role.ADMIN, Role.TRAINER)
  list(
    @Param('sesiId', ParseUUIDPipe) sesiId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.assignments.list(sesiId, actor);
  }

  @Post()
  @Roles(Role.ADMIN)
  add(
    @Param('sesiId', ParseUUIDPipe) sesiId: string,
    @Body() body: CreateAssignmentsDto,
  ) {
    return this.assignments.add(sesiId, body);
  }

  @Delete(':karyawanId')
  @Roles(Role.ADMIN)
  remove(
    @Param('sesiId', ParseUUIDPipe) sesiId: string,
    @Param('karyawanId', ParseUUIDPipe) karyawanId: string,
  ) {
    return this.assignments.remove(sesiId, karyawanId);
  }
}
