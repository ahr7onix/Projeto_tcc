import { Module } from '@nestjs/common';
import { VinculosModule } from '../vinculos/vinculos.module';
import { PacientesController } from './pacientes.controller';
import { PacientesService } from './pacientes.service';

@Module({
  imports: [VinculosModule],
  controllers: [PacientesController],
  providers: [PacientesService],
})
export class PacientesModule {}
