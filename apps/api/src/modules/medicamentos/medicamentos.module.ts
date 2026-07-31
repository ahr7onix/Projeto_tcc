import { Module } from '@nestjs/common';
import { VinculosModule } from '../vinculos/vinculos.module';
import { MedicamentosController } from './medicamentos.controller';
import { MedicamentosService } from './medicamentos.service';

@Module({
  imports: [VinculosModule],
  controllers: [MedicamentosController],
  providers: [MedicamentosService],
})
export class MedicamentosModule {}
