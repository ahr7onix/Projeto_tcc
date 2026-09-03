import { Module } from '@nestjs/common';
import { PushModule } from '../push/push.module';
import { MensagensController } from './mensagens.controller';
import { MensagensEventosService } from './mensagens-eventos.service';
import { MensagensService } from './mensagens.service';

@Module({
  imports: [PushModule],
  controllers: [MensagensController],
  providers: [MensagensService, MensagensEventosService],
})
export class MensagensModule {}
