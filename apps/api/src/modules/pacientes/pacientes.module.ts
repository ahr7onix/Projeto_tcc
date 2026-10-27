import { Module } from '@nestjs/common';
import { ContasModule } from '../contas/contas.module';
import { VinculosModule } from '../vinculos/vinculos.module';
import { PacientesController } from './pacientes.controller';
import { PacientesService } from './pacientes.service';

@Module({
  imports: [ContasModule, VinculosModule],
  controllers: [PacientesController],
  providers: [PacientesService],
})
export class PacientesModule {}
