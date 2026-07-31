import { Module } from '@nestjs/common';
import { NotificacoesController } from './notificacoes.controller';
import { NotificacoesService } from './notificacoes.service';

@Module({
  controllers: [NotificacoesController],
  providers: [NotificacoesService],
  // Exportado para os alertas de glicemia e a publicação de conteúdo
  // registrarem o que foi avisado.
  exports: [NotificacoesService],
})
export class NotificacoesModule {}
