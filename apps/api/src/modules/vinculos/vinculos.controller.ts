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
  convidar(@CurrentUser() user: JwtPayload, @Body() dto: VincularPacienteDto) {
    return this.vinculos.convidar(user.sub, dto.pacienteId);
  }

  @Get('convites')
  convitesEnviados(@CurrentUser() user: JwtPayload) {
    return this.vinculos.listarConvitesEnviados(user.sub);
  }

  @Delete('convites/:conviteId')
  cancelarConvite(
    @CurrentUser() user: JwtPayload,
    @Param('conviteId') conviteId: string,
  ) {
    return this.vinculos.cancelarConvite(user.sub, conviteId);
  }

  @Delete(':pacienteId')
  desvincular(
    @CurrentUser() user: JwtPayload,
    @Param('pacienteId') pacienteId: string,
  ) {
    return this.vinculos.desvincular(user.sub, pacienteId);
  }
}

/** Lado do paciente: vê os convites recebidos e aceita ou recusa. */
@Controller('convites')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('paciente')
export class ConvitesController {
  constructor(private readonly vinculos: VinculosService) {}

  @Get()
  listar(@CurrentUser() user: JwtPayload) {
    return this.vinculos.listarConvitesRecebidos(user.sub);
  }

  @Post(':conviteId/aceitar')
  @HttpCode(HttpStatus.OK)
  aceitar(@CurrentUser() user: JwtPayload, @Param('conviteId') conviteId: string) {
    return this.vinculos.responderConvite(user.sub, conviteId, true);
  }

  @Post(':conviteId/recusar')
  @HttpCode(HttpStatus.OK)
  recusar(@CurrentUser() user: JwtPayload, @Param('conviteId') conviteId: string) {
    return this.vinculos.responderConvite(user.sub, conviteId, false);
  }
}
