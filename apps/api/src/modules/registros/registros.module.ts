import { Module } from '@nestjs/common';
import { PushModule } from '../push/push.module';
import { VinculosModule } from '../vinculos/vinculos.module';
import { RegistrosController } from './registros.controller';
import { RegistrosService } from './registros.service';

@Module({
  imports: [PushModule, VinculosModule],
  controllers: [RegistrosController],
  providers: [RegistrosService],
})
export class RegistrosModule {}
