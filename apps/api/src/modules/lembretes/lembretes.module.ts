import { Module } from '@nestjs/common';
import { VinculosModule } from '../vinculos/vinculos.module';
import { LembretesController } from './lembretes.controller';
import { LembretesService } from './lembretes.service';

@Module({
  imports: [VinculosModule],
  controllers: [LembretesController],
  providers: [LembretesService],
})
export class LembretesModule {}
