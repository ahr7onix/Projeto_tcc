import { Module } from '@nestjs/common';
import { VinculosModule } from '../vinculos/vinculos.module';
import { NutricionalController } from './nutricional.controller';
import { NutricionalService } from './nutricional.service';

@Module({
  imports: [VinculosModule],
  controllers: [NutricionalController],
  providers: [NutricionalService],
})
export class NutricionalModule {}
