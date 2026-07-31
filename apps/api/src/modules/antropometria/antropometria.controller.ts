import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, Post, Query, UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import type { JwtPayload } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateAntropometriaDto } from './dto/create-antropometria.dto';
import { AntropometriaService } from './antropometria.service';

@Controller('antropometria')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AntropometriaController {
  constructor(private readonly antropometria: AntropometriaService) {}

  @Get()
  listar(
    @CurrentUser() user: JwtPayload,
    @Query('pacienteId') pacienteId?: string,
    @Query('limite') limite?: string,
  ) {
    return this.antropometria.listar(
      user,
      pacienteId,
      limite ? Number(limite) : undefined,
    );
  }

  @Get('evolucao')
  evolucao(@CurrentUser() user: JwtPayload, @Query('pacienteId') pacienteId?: string) {
    return this.antropometria.evolucao(user, pacienteId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  criar(@CurrentUser() user: JwtPayload, @Body() dto: CreateAntropometriaDto) {
    return this.antropometria.criar(user, dto);
  }

  @Delete(':id')
  remover(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Query('pacienteId') pacienteId?: string,
  ) {
    return this.antropometria.remover(user, id, pacienteId);
  }
}
