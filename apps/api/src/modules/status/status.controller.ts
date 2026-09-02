import { Controller, Get } from '@nestjs/common';
import { HealthService } from '../health/health.service';

/**
 * Rota pública usada pelo servidor de hospedagem para saber se a API está de pé
 * (é o `healthCheckPath` do render.yaml). Não expõe nenhum dado — só responde
 * se o processo e o banco estão respondendo.
 *
 * Não confundir com o módulo `saude`, que guarda os dados de saúde do paciente
 * e exige autenticação.
 *
 * A verificação em si é a do `HealthService`. Antes daqui saía um `SELECT 1`
 * próprio, sem timeout e com o erro engolido num `catch` vazio: um banco que
 * respondia em 40 s aparecia como `ok` e nada era registrado. Agora é a mesma
 * medição de `/health`, com limite de 3 s e log do tipo do erro.
 */
@Controller('status')
export class StatusController {
  constructor(private readonly health: HealthService) {}

  @Get()
  async status() {
    const banco = await this.health.verificarBanco();

    return {
      status: 'ok',
      servico: 'nutricare-api',
      banco: banco === 'connected' ? 'ok' : 'indisponivel',
      horario: new Date().toISOString(),
    };
  }
}
