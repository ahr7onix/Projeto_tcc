import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard, type JwtPayload } from '../../common/guards/jwt.guard';
import { PerfilService } from './perfil.service';

class UpdatePerfilDto {
  @IsOptional() @IsString() nome?: string;
  @IsOptional() @IsString() senhaAtual?: string;
  @IsOptional() @IsString() @MinLength(6) novaSenha?: string;
}

class UpdatePacienteDto {
  @IsOptional() @IsString() dataNascimento?: string;
  @IsOptional() @IsString() sexo?: string;
  @IsOptional() @IsString() tipoDiabetes?: string;
  @IsOptional() @IsNumber() @Min(0) peso?: number;
  @IsOptional() @IsNumber() @Min(0) altura?: number;
  @IsOptional() @IsString() restricoesAlergias?: string;
}

@Controller()
@UseGuards(JwtAuthGuard)
export class PerfilController {
  constructor(private readonly perfil: PerfilService) {}

  @Get('auth/me')
  getMe(@CurrentUser() user: JwtPayload) {
    return this.perfil.getMe(user.sub);
  }

  @Patch('perfil')
  @HttpCode(HttpStatus.OK)
  update(@CurrentUser() user: JwtPayload, @Body() dto: UpdatePerfilDto) {
    return this.perfil.update(user.sub, dto);
  }

  @Get('perfil/paciente')
  getPacienteData(@CurrentUser() user: JwtPayload) {
    return this.perfil.getPacienteData(user.sub);
  }

  @Patch('perfil/paciente')
  @HttpCode(HttpStatus.OK)
  updatePacienteData(@CurrentUser() user: JwtPayload, @Body() dto: UpdatePacienteDto) {
    return this.perfil.updatePacienteData(user.sub, dto);
  }
}
