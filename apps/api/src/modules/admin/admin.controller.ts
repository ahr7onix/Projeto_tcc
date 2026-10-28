import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import type { JwtPayload } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AdminService } from './admin.service';
import { CadastrarNutricionistaDto } from './dto/cadastrar-nutricionista.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('administrador')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('metricas')
  metricas() {
    return this.admin.metricas();
  }

  /** Analise do grupo atendido: perfil, controle glicemico e acompanhamento. */
  @Get('analise')
  analise(@Query('dias') dias?: string) {
    return this.admin.analise(dias ? Number(dias) : undefined);
  }

  @Get('usuarios')
  listarUsuarios(
    @Query('tipo') tipo?: string,
    @Query('busca') busca?: string,
    @Query('limite') limite?: string,
    @Query('pendentes') pendentes?: string,
  ) {
    return this.admin.listarUsuarios({
      tipo,
      busca,
      limite: limite ? Number(limite) : undefined,
      pendentes: pendentes === 'true',
    });
  }

  @Delete('usuarios/:id')
  removerUsuario(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.admin.removerUsuario(user.sub, id);
  }

  @Post('nutricionistas')
  @HttpCode(HttpStatus.CREATED)
  cadastrarNutricionista(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CadastrarNutricionistaDto,
  ) {
    return this.admin.cadastrarNutricionista(user.sub, dto);
  }

  @Patch('nutricionistas/:id/aprovar')
  aprovarNutricionista(@Param('id') id: string) {
    return this.admin.aprovarNutricionista(id);
  }
}
