import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import type { JwtPayload } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { VincularPacienteDto } from './dto/vincular-paciente.dto';
import { VinculosService } from './vinculos.service';

@Controller('vinculos')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('nutricionista')
export class VinculosController {
  constructor(private readonly vinculos: VinculosService) {}

  @Get()
  listar(@CurrentUser() user: JwtPayload) {
    return this.vinculos.listarPacientes(user.sub);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  vincular(@CurrentUser() user: JwtPayload, @Body() dto: VincularPacienteDto) {
    return this.vinculos.vincular(user.sub, dto.pacienteId);
  }

  @Delete(':pacienteId')
  desvincular(
    @CurrentUser() user: JwtPayload,
    @Param('pacienteId') pacienteId: string,
  ) {
    return this.vinculos.desvincular(user.sub, pacienteId);
  }
}
