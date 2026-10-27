import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import type { JwtPayload } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ConvidarPacienteDto } from './dto/convidar-paciente.dto';
import { ConvitesService } from './convites.service';
import { VinculosService } from './vinculos.service';

/**
 * O vínculo nasce de um convite aceito (LGPD): não existe mais rota que
 * vincule um paciente direto, sem a resposta dele.
 */
@Controller('vinculos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VinculosController {
  constructor(
    private readonly vinculos: VinculosService,
    private readonly convites: ConvitesService,
  ) {}

  @Get()
  @Roles('nutricionista')
  listar(@CurrentUser() user: JwtPayload) {
    return this.vinculos.listarPacientes(user.sub);
  }

  @Get('convites')
  @Roles('nutricionista', 'paciente')
  listarConvites(@CurrentUser() user: JwtPayload) {
    return this.convites.listarPendentes(user);
  }

  @Post('convites')
  @Roles('nutricionista')
  @HttpCode(HttpStatus.CREATED)
  convidar(@CurrentUser() user: JwtPayload, @Body() dto: ConvidarPacienteDto) {
    return this.convites.convidar(user.sub, dto.email);
  }

  @Patch('convites/:id/aceitar')
  @Roles('paciente')
  aceitar(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.convites.responder(user.sub, id, true);
  }

  @Patch('convites/:id/recusar')
  @Roles('paciente')
  recusar(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.convites.responder(user.sub, id, false);
  }

  @Delete('convites/:id')
  @Roles('nutricionista')
  cancelarConvite(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.convites.cancelar(user.sub, id);
  }

  @Get('nutricionistas')
  @Roles('paciente')
  meusNutricionistas(@CurrentUser() user: JwtPayload) {
    return this.convites.listarNutricionistasDoPaciente(user.sub);
  }

  @Delete('nutricionistas/:nutricionistaId')
  @Roles('paciente')
  encerrar(
    @CurrentUser() user: JwtPayload,
    @Param('nutricionistaId') nutricionistaId: string,
  ) {
    return this.convites.encerrarPeloPaciente(user.sub, nutricionistaId);
  }

  @Delete(':pacienteId')
  @Roles('nutricionista')
  desvincular(
    @CurrentUser() user: JwtPayload,
    @Param('pacienteId') pacienteId: string,
  ) {
    return this.vinculos.desvincular(user.sub, pacienteId);
  }
}
