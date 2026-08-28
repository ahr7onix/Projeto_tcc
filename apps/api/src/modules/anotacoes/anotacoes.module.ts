import { Module } from '@nestjs/common';
import { VinculosModule } from '../vinculos/vinculos.module';
import { AnotacoesController } from './anotacoes.controller';
import { AnotacoesService } from './anotacoes.service';

@Module({
  imports: [VinculosModule],
  controllers: [AnotacoesController],
  providers: [AnotacoesService],
})
export class AnotacoesModule {}
