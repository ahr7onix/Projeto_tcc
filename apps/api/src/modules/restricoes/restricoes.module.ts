import { Module } from '@nestjs/common';
import { VinculosModule } from '../vinculos/vinculos.module';
import { RestricoesController } from './restricoes.controller';
import { RestricoesService } from './restricoes.service';

@Module({
  imports: [VinculosModule],
  controllers: [RestricoesController],
  providers: [RestricoesService],
})
export class RestricoesModule {}
