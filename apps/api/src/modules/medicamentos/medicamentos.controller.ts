import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import type { JwtPayload } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateMedicamentoDto } from './dto/create-medicamento.dto';
import { UpdateMedicamentoDto } from './dto/update-medicamento.dto';
import { MedicamentosService } from './medicamentos.service';

@Controller('medicamentos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MedicamentosController {
  constructor(private readonly medicamentos: MedicamentosService) {}

  @Get()
  listar(
    @CurrentUser() user: JwtPayload,
    @Query('pacienteId') pacienteId?: string,
    @Query('incluirInativos') incluirInativos?: string,
  ) {
    return this.medicamentos.listar(user, {
      pacienteId,
      incluirInativos: incluirInativos === 'true',
    });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  criar(@CurrentUser() user: JwtPayload, @Body() dto: CreateMedicamentoDto) {
    return this.medicamentos.criar(user, dto);
  }

  @Patch(':id')
  atualizar(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateMedicamentoDto,
    @Query('pacienteId') pacienteId?: string,
  ) {
    return this.medicamentos.atualizar(user, id, dto, pacienteId);
  }

  @Delete(':id')
  suspender(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Query('pacienteId') pacienteId?: string,
  ) {
    return this.medicamentos.suspender(user, id, pacienteId);
  }
}
