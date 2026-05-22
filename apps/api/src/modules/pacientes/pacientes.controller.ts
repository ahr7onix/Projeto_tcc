import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { PacientesService } from './pacientes.service';

@Controller('pacientes')
@UseGuards(JwtAuthGuard)
export class PacientesController {
  constructor(private readonly pacientes: PacientesService) {}

  @Get()
  findAll(@Query('busca') busca?: string) {
    return this.pacientes.findAll(busca);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const paciente = await this.pacientes.findOne(id);
    if (!paciente) throw new NotFoundException('Paciente não encontrado');
    return paciente;
  }
}
