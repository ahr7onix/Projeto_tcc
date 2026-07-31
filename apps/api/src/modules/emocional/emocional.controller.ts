import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, Post, Query, UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import type { JwtPayload } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateEmocionalDto } from './dto/create-emocional.dto';
import { EmocionalService } from './emocional.service';

@Controller('emocional')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmocionalController {
  constructor(private readonly emocional: EmocionalService) {}

  @Get()
  listar(
    @CurrentUser() user: JwtPayload,
    @Query('pacienteId') pacienteId?: string,
    @Query('dias') dias?: string,
    @Query('limite') limite?: string,
  ) {
    return this.emocional.listar(user, {
      pacienteId,
      dias: dias ? Number(dias) : undefined,
      limite: limite ? Number(limite) : undefined,
    });
  }

  @Get('resumo')
  resumo(
    @CurrentUser() user: JwtPayload,
    @Query('pacienteId') pacienteId?: string,
    @Query('dias') dias?: string,
  ) {
    return this.emocional.resumo(user, pacienteId, dias ? Number(dias) : undefined);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  criar(@CurrentUser() user: JwtPayload, @Body() dto: CreateEmocionalDto) {
    return this.emocional.criar(user, dto);
  }

  @Delete(':id')
  remover(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.emocional.remover(user, id);
  }
}
