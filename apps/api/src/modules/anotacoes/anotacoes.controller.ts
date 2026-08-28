import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import type { JwtPayload } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AnotacoesService } from './anotacoes.service';
import { CreateAnotacaoDto } from './dto/create-anotacao.dto';

@Controller('anotacoes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnotacoesController {
  constructor(private readonly anotacoes: AnotacoesService) {}

  @Get(':pacienteId')
  listar(@CurrentUser() user: JwtPayload, @Param('pacienteId') pacienteId: string) {
    return this.anotacoes.listar(user, pacienteId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  criar(@CurrentUser() user: JwtPayload, @Body() dto: CreateAnotacaoDto) {
    return this.anotacoes.criar(user, dto);
  }
}
