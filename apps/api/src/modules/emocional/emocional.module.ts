import { Module } from '@nestjs/common';
import { VinculosModule } from '../vinculos/vinculos.module';
import { EmocionalController } from './emocional.controller';
import { EmocionalService } from './emocional.service';

@Module({
  imports: [VinculosModule],
  controllers: [EmocionalController],
  providers: [EmocionalService],
})
export class EmocionalModule {}
