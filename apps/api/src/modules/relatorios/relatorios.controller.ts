import { Controller, Get, Header, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import type { JwtPayload } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RelatoriosService } from './relatorios.service';

@Controller('relatorios')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RelatoriosController {
  constructor(private readonly relatorios: RelatoriosService) {}

  @Get()
  gerar(
    @CurrentUser() user: JwtPayload,
    @Query('pacienteId') pacienteId?: string,
    @Query('dias') dias?: string,
  ) {
    return this.relatorios.gerar(user, pacienteId, dias ? Number(dias) : undefined);
  }

  @Get('csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async csv(
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: true }) res: Response,
    @Query('pacienteId') pacienteId?: string,
    @Query('dias') dias?: string,
  ) {
    const { nomeArquivo, conteudo } = await this.relatorios.gerarCsv(
      user,
      pacienteId,
      dias ? Number(dias) : undefined,
    );
    res.setHeader('Content-Disposition', `attachment; filename="${nomeArquivo}"`);
    return conteudo;
  }
}
