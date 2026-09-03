import { Module } from '@nestjs/common';
import { VinculosModule } from '../vinculos/vinculos.module';
import { SaudeController } from './saude.controller';
import { SaudeService } from './saude.service';

@Module({
  imports: [VinculosModule],
  controllers: [SaudeController],
  providers: [SaudeService],
})
export class SaudeModule {}
