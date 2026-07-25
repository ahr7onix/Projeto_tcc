import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import type { JwtPayload } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
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

  @Get('disponiveis')
  findDisponiveis(
    @CurrentUser() user: JwtPayload,
    @Query('busca') busca?: string,
  ) {
    return this.pacientes.findDisponiveis(user.sub, busca);
  }

  @Get(':id')
  async findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    const paciente = await this.pacientes.findOne(user.sub, id);
    if (!paciente) throw new NotFoundException('Paciente não encontrado');
    return paciente;
  }
}
