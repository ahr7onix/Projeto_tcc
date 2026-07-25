import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import type { JwtPayload } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreatePlanoDto } from './dto/create-plano.dto';
import { UpdatePlanoDto } from './dto/update-plano.dto';
import { PlanosService } from './planos.service';

@Controller('planos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PlanosController {
  constructor(private readonly planos: PlanosService) {}

  @Get('ativo')
  findAtivo(
    @CurrentUser() user: JwtPayload,
    @Query('pacienteId') pacienteId?: string,
  ) {
    return this.planos.findAtivo(user, pacienteId);
  }

  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('pacienteId') pacienteId?: string,
  ) {
    return this.planos.findAll(user, pacienteId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.planos.findOne(id, user);
  }

  @Post()
  @Roles('nutricionista')
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreatePlanoDto) {
    return this.planos.create(user.sub, dto);
  }

  @Patch(':id')
  @Roles('nutricionista')
  update(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdatePlanoDto,
  ) {
    return this.planos.update(id, user, dto);
  }

  @Delete(':id')
  @Roles('nutricionista')
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.planos.remove(id, user);
  }
}
