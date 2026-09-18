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
import { CreateTrainingDto, UpdateTrainingDto } from './dto/training.dto.js';
import { TrainingService } from './training.service.js';

@Controller('training')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class TrainingController {
  constructor(private readonly training: TrainingService) {}

  @Post()
  create(@Body() body: CreateTrainingDto) {
    return this.training.create(body);
  }

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.training.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.training.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateTrainingDto,
  ) {
    return this.training.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.training.remove(id);
  }
}
