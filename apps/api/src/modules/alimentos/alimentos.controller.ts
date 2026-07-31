import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import type { JwtPayload } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateAlimentoDto } from './dto/create-alimento.dto';
import { UpdateAlimentoDto } from './dto/update-alimento.dto';
import { AlimentosService } from './alimentos.service';

@Controller('alimentos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AlimentosController {
  constructor(private readonly alimentos: AlimentosService) {}

  @Get()
  listar(
    @Query('busca') busca?: string,
    @Query('grupo') grupo?: string,
    @Query('incluirInativos') incluirInativos?: string,
    @Query('limite') limite?: string,
  ) {
    return this.alimentos.listar({
      busca,
      grupo,
      incluirInativos: incluirInativos === 'true',
      limite: limite ? Number(limite) : undefined,
    });
  }

  @Get('grupos')
  grupos() {
    return this.alimentos.grupos();
  }

  @Get(':id')
  buscar(@Param('id') id: string) {
    return this.alimentos.buscar(id);
  }

  @Get(':id/porcao')
  porcao(@Param('id') id: string, @Query('quantidadeG') quantidadeG: string) {
    return this.alimentos.calcularPorcao(id, Number(quantidadeG));
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  criar(@CurrentUser() user: JwtPayload, @Body() dto: CreateAlimentoDto) {
    return this.alimentos.criar(user, dto);
  }

  @Patch(':id')
  atualizar(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateAlimentoDto,
  ) {
    return this.alimentos.atualizar(user, id, dto);
  }

  @Delete(':id')
  desativar(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.alimentos.desativar(user, id);
  }
}
