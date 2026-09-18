import { Body, Controller, Get, Put, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import {
  ComplianceDashboardQueryDto,
  ComplianceQueryDto,
} from './dto/compliance-query.dto.js';
import { UpdateComplianceSettingDto } from './dto/update-compliance-setting.dto.js';
import { ComplianceService } from './compliance.service.js';

@Controller('compliance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ComplianceController {
  constructor(private readonly compliance: ComplianceService) {}

  @Get()
  @Roles(Role.ADMIN)
  getDashboard(@Query() query: ComplianceDashboardQueryDto) {
    return this.compliance.getDashboard(query);
  }

  @Get('me')
  @Roles(Role.ADMIN, Role.TRAINER, Role.KARYAWAN)
  getMySummary(
    @CurrentUser() actor: AuthenticatedUser,
    @Query() query: ComplianceQueryDto,
  ) {
    return this.compliance.getEmployeeSummary(actor.id, query.year);
  }

  @Get('setting')
  @Roles(Role.ADMIN)
  getSetting() {
    return this.compliance.getSetting();
  }

  @Put('setting')
  @Roles(Role.ADMIN)
  updateSetting(@Body() body: UpdateComplianceSettingDto) {
    return this.compliance.updateTarget(body.targetHours);
  }
}
