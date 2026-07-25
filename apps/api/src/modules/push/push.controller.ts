import { Body, Controller, Delete, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import type { JwtPayload } from '../../common/guards/jwt.guard';
import { RegistrarTokenDto } from './dto/registrar-token.dto';
import { PushService } from './push.service';

@Controller('push')
@UseGuards(JwtAuthGuard)
export class PushController {
  constructor(private readonly push: PushService) {}

  @Post('token')
  @HttpCode(HttpStatus.OK)
  registrar(@CurrentUser() user: JwtPayload, @Body() dto: RegistrarTokenDto) {
    return this.push.registrarToken(user.sub, dto.token, dto.plataforma);
  }

  @Delete('token')
  remover(@CurrentUser() user: JwtPayload, @Body() dto: RegistrarTokenDto) {
    return this.push.removerToken(user.sub, dto.token);
  }
}
