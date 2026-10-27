import { Module } from '@nestjs/common';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';
import { PushModule } from '../push/push.module';
import { ConvitesService } from './convites.service';
import { VinculosController } from './vinculos.controller';
import { VinculosService } from './vinculos.service';

@Module({
  imports: [NotificacoesModule, PushModule],
  controllers: [VinculosController],
  providers: [VinculosService, ConvitesService],
  exports: [VinculosService, ConvitesService],
})
export class VinculosModule {}
