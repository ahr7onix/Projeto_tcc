import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import type { JwtPayload } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CalcularVetDto } from './dto/calcular-vet.dto';
import { NutricionalService } from './nutricional.service';

@Controller('nutricional')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NutricionalController {
  constructor(private readonly nutricional: NutricionalService) {}

  @Get('referencias')
  referencias() {
    return this.nutricional.referencias();
  }

  /**
   * POST porque o cálculo aceita um corpo de simulação, mesmo não gravando
   * nada — o resultado só é persistido quando vira plano alimentar.
   */
  @Post('calcular')
  calcular(@CurrentUser() user: JwtPayload, @Body() dto: CalcularVetDto) {
    return this.nutricional.calcular(user, dto);
  }
}
