import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import type { JwtPayload } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AlertasService } from './alertas.service';
import { diasDaQuery } from '../../common/numero-da-query';

@Controller('alertas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AlertasController {
  constructor(private readonly alertas: AlertasService) {}

  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('dias') dias?: string,
    @Query('pacienteId') pacienteId?: string,
    @Query('severidade') severidade?: string,
  ) {
    return this.alertas.findAll(user, {
      dias: diasDaQuery(dias),
      pacienteId,
      severidade,
    });
  }

  @Get('resumo')
  resumo(@CurrentUser() user: JwtPayload, @Query('dias') dias?: string) {
    return this.alertas.resumo(user, diasDaQuery(dias));
  }
}
