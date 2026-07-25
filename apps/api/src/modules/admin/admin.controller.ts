import { Controller, Delete, Get, Param, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import type { JwtPayload } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('administrador')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('metricas')
  metricas() {
    return this.admin.metricas();
  }

  @Get('usuarios')
  listarUsuarios(
    @Query('tipo') tipo?: string,
    @Query('busca') busca?: string,
    @Query('limite') limite?: string,
  ) {
    return this.admin.listarUsuarios({
      tipo,
      busca,
      limite: limite ? Number(limite) : undefined,
    });
  }

  @Delete('usuarios/:id')
  removerUsuario(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.admin.removerUsuario(user.sub, id);
  }
}
