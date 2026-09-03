import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import type { JwtPayload } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateRestricaoDto } from './dto/create-restricao.dto';
import { UpdateRestricaoDto } from './dto/update-restricao.dto';
import { RestricoesService } from './restricoes.service';

@Controller('restricoes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RestricoesController {
  constructor(private readonly restricoes: RestricoesService) {}

  @Get()
  listar(
    @CurrentUser() user: JwtPayload,
    @Query('pacienteId') pacienteId?: string,
  ) {
    return this.restricoes.listar(user, pacienteId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  criar(@CurrentUser() user: JwtPayload, @Body() dto: CreateRestricaoDto) {
    return this.restricoes.criar(user, dto);
  }

  @Patch(':id')
  atualizar(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateRestricaoDto,
    @Query('pacienteId') pacienteId?: string,
  ) {
    return this.restricoes.atualizar(user, id, dto, pacienteId);
  }

  @Delete(':id')
  remover(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Query('pacienteId') pacienteId?: string,
  ) {
    return this.restricoes.remover(user, id, pacienteId);
  }
}
