import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Sse,
  UseGuards,
} from '@nestjs/common';
import type { MessageEvent } from '@nestjs/common';
import type { Observable } from 'rxjs';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import type { JwtPayload } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateMensagemDto } from './dto/create-mensagem.dto';
import { MensagensEventosService } from './mensagens-eventos.service';
import { MensagensService } from './mensagens.service';

@Controller('mensagens')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MensagensController {
  constructor(
    private readonly mensagens: MensagensService,
    private readonly eventos: MensagensEventosService,
  ) {}

  @Get()
  listarConversas(@CurrentUser() user: JwtPayload) {
    return this.mensagens.listarConversas(user);
  }

  @Get('nao-lidas')
  contarNaoLidas(@CurrentUser() user: JwtPayload) {
    return this.mensagens.contarNaoLidas(user);
  }

  /**
   * Canal aberto (SSE) por onde a API empurra as mensagens novas assim que
   * elas chegam. Precisa ficar antes de `:contraparteId`, senão o parâmetro
   * dinâmico engole a rota `/mensagens/stream`.
   */
  @Sse('stream')
  stream(@CurrentUser() user: JwtPayload): Observable<MessageEvent> {
    return this.eventos.fluxoDoUsuario(user.sub);
  }

  @Get(':contraparteId')
  listarMensagens(
    @CurrentUser() user: JwtPayload,
    @Param('contraparteId') contraparteId: string,
    @Query('limite') limite?: string,
  ) {
    return this.mensagens.listarMensagens(
      user,
      contraparteId,
      limite ? Number(limite) : undefined,
    );
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  enviar(@CurrentUser() user: JwtPayload, @Body() dto: CreateMensagemDto) {
    return this.mensagens.enviar(user, dto);
  }
}
