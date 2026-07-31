import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import type { JwtPayload } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateLembreteDto } from './dto/create-lembrete.dto';
import { UpdateLembreteDto } from './dto/update-lembrete.dto';
import { LembretesService } from './lembretes.service';

@Controller('lembretes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LembretesController {
  constructor(private readonly lembretes: LembretesService) {}

  @Get()
  listar(
    @CurrentUser() user: JwtPayload,
    @Query('pacienteId') pacienteId?: string,
    @Query('apenasAtivos') apenasAtivos?: string,
  ) {
    return this.lembretes.listar(user, {
      pacienteId,
      apenasAtivos: apenasAtivos === 'true',
    });
  }

  @Get('hoje')
  doDia(@CurrentUser() user: JwtPayload, @Query('pacienteId') pacienteId?: string) {
    return this.lembretes.doDia(user, pacienteId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  criar(@CurrentUser() user: JwtPayload, @Body() dto: CreateLembreteDto) {
    return this.lembretes.criar(user, dto);
  }

  @Patch(':id')
  atualizar(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateLembreteDto,
    @Query('pacienteId') pacienteId?: string,
  ) {
    return this.lembretes.atualizar(user, id, dto, pacienteId);
  }

  @Patch(':id/concluir')
  concluir(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.lembretes.concluir(user, id);
  }

  @Delete(':id')
  remover(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Query('pacienteId') pacienteId?: string,
  ) {
    return this.lembretes.remover(user, id, pacienteId);
  }
}
