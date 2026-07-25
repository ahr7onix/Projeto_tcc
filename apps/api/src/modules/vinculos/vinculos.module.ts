import { Module } from '@nestjs/common';
import { VinculosController } from './vinculos.controller';
import { VinculosService } from './vinculos.service';

@Module({
  controllers: [VinculosController],
  providers: [VinculosService],
  exports: [VinculosService],
})
export class VinculosModule {}
