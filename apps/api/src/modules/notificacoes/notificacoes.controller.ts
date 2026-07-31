import {
  Controller, Delete, Get, Param, Patch, Query, UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import type { JwtPayload } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { NotificacoesService } from './notificacoes.service';

@Controller('notificacoes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificacoesController {
  constructor(private readonly notificacoes: NotificacoesService) {}

  @Get()
  listar(
    @CurrentUser() user: JwtPayload,
    @Query('apenasNaoLidas') apenasNaoLidas?: string,
    @Query('limite') limite?: string,
  ) {
    return this.notificacoes.listar(user, {
      apenasNaoLidas: apenasNaoLidas === 'true',
      limite: limite ? Number(limite) : undefined,
    });
  }

  @Get('nao-lidas')
  naoLidas(@CurrentUser() user: JwtPayload) {
    return this.notificacoes.naoLidas(user);
  }

  @Patch('ler-todas')
  marcarTodasLidas(@CurrentUser() user: JwtPayload) {
    return this.notificacoes.marcarTodasLidas(user);
  }

  @Patch(':id/ler')
  marcarLida(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.notificacoes.marcarLida(user, id);
  }

  @Delete(':id')
  remover(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.notificacoes.remover(user, id);
  }
}
