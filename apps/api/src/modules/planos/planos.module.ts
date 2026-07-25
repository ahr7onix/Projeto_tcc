import { Module } from '@nestjs/common';
import { VinculosModule } from '../vinculos/vinculos.module';
import { PlanosController } from './planos.controller';
import { PlanosService } from './planos.service';

@Module({
  imports: [VinculosModule],
  controllers: [PlanosController],
  providers: [PlanosService],
})
export class PlanosModule {}
