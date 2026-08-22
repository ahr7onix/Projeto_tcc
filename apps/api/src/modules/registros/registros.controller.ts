import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import type { JwtPayload } from '../../common/guards/jwt.guard';
import { CreateGlicemiaDto } from './dto/create-glicemia.dto';
import { CreateRefeicaoDto } from './dto/create-refeicao.dto';
import { RegistrosService } from './registros.service';

@Controller('registros')
@UseGuards(JwtAuthGuard)
export class RegistrosController {
  constructor(private readonly registros: RegistrosService) {}

  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('pacienteId') pacienteId?: string,
    @Query('dias') dias?: string,
    @Query('tipo') tipo?: string,
  ) {
    return this.registros.findAll(user, {
      pacienteId,
      dias: dias ? Number(dias) : undefined,
      tipo,
    });
  }

  @Get('glicemia/ultimo')
  ultimaGlicemia(
    @CurrentUser() user: JwtPayload,
    @Query('pacienteId') pacienteId?: string,
  ) {
    return this.registros.ultimaGlicemia(user, pacienteId);
  }

  @Post('glicemia')
  @HttpCode(HttpStatus.CREATED)
  createGlicemia(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateGlicemiaDto,
  ) {
    return this.registros.createGlicemia(user.sub, dto);
  }

  @Post('refeicao')
  @HttpCode(HttpStatus.CREATED)
  createRefeicao(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateRefeicaoDto,
  ) {
    return this.registros.createRefeicao(user.sub, dto);
  }
}
