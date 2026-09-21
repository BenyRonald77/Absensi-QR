import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Sse,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { CreateSesiDto } from './dto/create-sesi.dto.js';
import { SesiQueryDto } from './dto/sesi-query.dto.js';
import { SesiService } from './sesi.service.js';

@Controller('sesi')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SesiController {
  constructor(private readonly sesi: SesiService) {}

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() body: CreateSesiDto) {
    return this.sesi.create(body);
  }

  @Get()
  @Roles(Role.ADMIN, Role.TRAINER)
  findAll(
    @Query() query: SesiQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.sesi.findAll(query, actor);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.TRAINER)
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.sesi.findOne(id, actor);
  }

  @Post(':id/buka')
  @Roles(Role.ADMIN, Role.TRAINER)
  open(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.sesi.open(id, actor);
  }

  @Post(':id/tutup')
  @Roles(Role.ADMIN, Role.TRAINER)
  close(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.sesi.close(id, actor);
  }

  @Get(':id/participants')
  @Roles(Role.ADMIN, Role.TRAINER)
  participants(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.sesi.getParticipants(id, actor);
  }

  @Sse(':id/stream')
  @Roles(Role.ADMIN, Role.TRAINER)
  stream(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.sesi.stream(id, actor);
  }
}
