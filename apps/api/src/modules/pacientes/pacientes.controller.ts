import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import type { JwtPayload } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CadastrarPacienteDto } from './dto/cadastrar-paciente.dto';
import { PacientesService } from './pacientes.service';

@Controller('pacientes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('nutricionista')
export class PacientesController {
  constructor(private readonly pacientes: PacientesService) {}

  @Get()
  findAll(@CurrentUser() user: JwtPayload, @Query('busca') busca?: string) {
    return this.pacientes.findAll(user.sub, busca);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  cadastrar(@CurrentUser() user: JwtPayload, @Body() dto: CadastrarPacienteDto) {
    return this.pacientes.cadastrar(user.sub, dto);
  }

  @Get(':id')
  async findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    // Um id que não é número quebrava na conversão para bigint do Postgres e
    // virava 500 — inclusive o antigo /pacientes/disponiveis, que caiu aqui.
    if (!/^\d+$/.test(id)) throw new NotFoundException('Paciente não encontrado');
    const paciente = await this.pacientes.findOne(user.sub, id);
    if (!paciente) throw new NotFoundException('Paciente não encontrado');
    return paciente;
  }
}
