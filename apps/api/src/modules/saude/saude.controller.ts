import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import type { JwtPayload } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SaudeService } from './saude.service';

@Controller('saude')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SaudeController {
  constructor(private readonly saude: SaudeService) {}

  /**
   * O `pacienteId` da URL não é mais aceito como verdade: quem manda é o token.
   * Antes bastava estar autenticado para ler o resumo clínico de qualquer
   * paciente trocando o número na URL. A conferência é a mesma que
   * `anotacoes` e `antropometria` já usavam.
   */
  @Get(':pacienteId')
  findByPaciente(
    @CurrentUser() user: JwtPayload,
    @Param('pacienteId') pacienteId: string,
  ) {
    return this.saude.findByPaciente(user, pacienteId);
  }
}
