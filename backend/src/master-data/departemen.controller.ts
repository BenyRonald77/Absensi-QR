import {
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
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { PaginationQueryDto } from '../common/pagination.dto.js';
import { DepartemenDto } from './dto/departemen.dto.js';
import { DepartemenService } from './departemen.service.js';

@Controller('departemen')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class DepartemenController {
  constructor(private readonly departemen: DepartemenService) {}

  @Post()
  create(@Body() body: DepartemenDto) {
    return this.departemen.create(body);
  }

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.departemen.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.departemen.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() body: DepartemenDto) {
    return this.departemen.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.departemen.remove(id);
  }
}
