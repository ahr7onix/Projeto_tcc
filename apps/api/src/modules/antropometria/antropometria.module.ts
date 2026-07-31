import { Module } from '@nestjs/common';
import { VinculosModule } from '../vinculos/vinculos.module';
import { AntropometriaController } from './antropometria.controller';
import { AntropometriaService } from './antropometria.service';

@Module({
  imports: [VinculosModule],
  controllers: [AntropometriaController],
  providers: [AntropometriaService],
})
export class AntropometriaModule {}
