import { Module } from '@nestjs/common';
import { HealthModule } from '../health/health.module';
import { StatusController } from './status.controller';

@Module({
  imports: [HealthModule],
  controllers: [StatusController],
})
export class StatusModule {}
