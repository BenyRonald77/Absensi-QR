import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { PaginationQueryDto } from '../common/pagination.dto.js';
import {
  CreateKaryawanDto,
  KaryawanListQueryDto,
  UpdateKaryawanDto,
} from './dto/karyawan.dto.js';
import { KaryawanService } from './karyawan.service.js';

@Controller('karyawan')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class KaryawanController {
  constructor(private readonly karyawan: KaryawanService) {}

  @Post()
  create(@Body() body: CreateKaryawanDto) {
    return this.karyawan.create(body);
  }

  @Get()
  findAll(@Query() query: KaryawanListQueryDto) {
    return this.karyawan.findAll(query, query);
  }

  @Get('trainers')
  findTrainers(@Query() query: PaginationQueryDto) {
    return this.karyawan.listTrainers(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.karyawan.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateKaryawanDto,
  ) {
    return this.karyawan.update(id, body);
  }

  @Delete(':id')
  deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    if (id === actor.id)
      throw new BadRequestException(
        'Akun Admin tidak dapat menonaktifkan dirinya sendiri.',
      );
    return this.karyawan.deactivate(id);
  }
}
