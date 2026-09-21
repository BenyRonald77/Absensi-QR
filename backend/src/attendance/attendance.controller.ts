import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { AttendanceService } from './attendance.service.js';
import { ConfirmAttendanceDto } from './dto/confirm-attendance.dto.js';

@Controller('absen')
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  @Get(':token')
  getPublic(@Param('token') token: string) {
    return this.attendance.getPublicToken(token);
  }

  @Get(':token/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.KARYAWAN)
  getStatus(
    @Param('token') token: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.attendance.getStatus(token, actor);
  }

  @Post(':token/confirm')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.KARYAWAN)
  confirm(
    @Param('token') token: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() body: ConfirmAttendanceDto,
  ) {
    return this.attendance.confirm(token, actor, body);
  }
}
