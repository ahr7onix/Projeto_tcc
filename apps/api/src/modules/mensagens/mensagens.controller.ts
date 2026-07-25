import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import type { JwtPayload } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateMensagemDto } from './dto/create-mensagem.dto';
import { MensagensService } from './mensagens.service';

@Controller('mensagens')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MensagensController {
  constructor(private readonly mensagens: MensagensService) {}

  @Get()
  listarConversas(@CurrentUser() user: JwtPayload) {
    return this.mensagens.listarConversas(user);
  }

  @Get('nao-lidas')
  contarNaoLidas(@CurrentUser() user: JwtPayload) {
    return this.mensagens.contarNaoLidas(user);
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
