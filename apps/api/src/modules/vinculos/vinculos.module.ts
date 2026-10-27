import { Module } from '@nestjs/common';
import { ConvitesController, VinculosController } from './vinculos.controller';
import { VinculosService } from './vinculos.service';

@Module({
  controllers: [VinculosController, ConvitesController],
  providers: [VinculosService],
  exports: [VinculosService],
})
export class VinculosModule {}
