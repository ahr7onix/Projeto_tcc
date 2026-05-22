import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { SaudeService } from './saude.service';

@Controller('saude')
@UseGuards(JwtAuthGuard)
export class SaudeController {
  constructor(private readonly saude: SaudeService) {}

  @Get(':pacienteId')
  findByPaciente(@Param('pacienteId') pacienteId: string) {
    return this.saude.findByPaciente(pacienteId);
  }
}
