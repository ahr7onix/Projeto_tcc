import { Module } from '@nestjs/common';
import { ContasModule } from '../contas/contas.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [ContasModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
