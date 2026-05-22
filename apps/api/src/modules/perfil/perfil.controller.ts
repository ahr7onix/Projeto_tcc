import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard, type JwtPayload } from '../../common/guards/jwt.guard';
import { PerfilService } from './perfil.service';

class UpdatePerfilDto {
  @IsOptional()
  @IsString()
  nome?: string;

  @IsOptional()
  @IsString()
  senhaAtual?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  novaSenha?: string;
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
}
