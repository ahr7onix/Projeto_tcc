import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import type { JwtPayload } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateReceitaDto } from './dto/create-receita.dto';
import { UpdateReceitaDto } from './dto/update-receita.dto';
import { ReceitasService } from './receitas.service';

@Controller('receitas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReceitasController {
  constructor(private readonly receitas: ReceitasService) {}

  @Get()
  listar(
    @CurrentUser() user: JwtPayload,
    @Query('busca') busca?: string,
    @Query('categoria') categoria?: string,
    @Query('apenasMinhas') apenasMinhas?: string,
    @Query('limite') limite?: string,
  ) {
    return this.receitas.listar(user, {
      busca,
      categoria,
      apenasMinhas: apenasMinhas === 'true',
      limite: limite ? Number(limite) : undefined,
    });
  }

  // Declarada antes de :id para a rota de parâmetro não engolir "categorias".
  @Get('categorias')
  categorias(@CurrentUser() user: JwtPayload) {
    return this.receitas.categorias(user);
  }

  @Get(':id')
  buscar(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.receitas.buscar(user, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  criar(@CurrentUser() user: JwtPayload, @Body() dto: CreateReceitaDto) {
    return this.receitas.criar(user, dto);
  }

  @Patch(':id')
  atualizar(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateReceitaDto,
  ) {
    return this.receitas.atualizar(user, id, dto);
  }

  @Delete(':id')
  remover(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.receitas.remover(user, id);
  }
}
