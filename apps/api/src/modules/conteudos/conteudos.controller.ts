import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import type { JwtPayload } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateConteudoDto } from './dto/create-conteudo.dto';
import { UpdateConteudoDto } from './dto/update-conteudo.dto';
import { ConteudosService } from './conteudos.service';

@Controller('conteudos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ConteudosController {
  constructor(private readonly conteudos: ConteudosService) {}

  @Get()
  listar(
    @CurrentUser() user: JwtPayload,
    @Query('categoria') categoria?: string,
    @Query('todos') todos?: string,
  ) {
    return this.conteudos.listar(user, { categoria, todos: todos === 'true' });
  }

  @Get(':id')
  buscar(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.conteudos.buscar(user, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  criar(@CurrentUser() user: JwtPayload, @Body() dto: CreateConteudoDto) {
    return this.conteudos.criar(user, dto);
  }

  @Patch(':id')
  atualizar(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateConteudoDto,
  ) {
    return this.conteudos.atualizar(user, id, dto);
  }

  @Delete(':id')
  remover(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.conteudos.remover(user, id);
  }
}
