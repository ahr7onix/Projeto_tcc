import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CadastroDto } from './dto/cadastro.dto';
import { EsqueciSenhaDto } from './dto/esqueci-senha.dto';
import { LoginGoogleDto } from './dto/login-google.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('cadastro')
  @HttpCode(HttpStatus.CREATED)
  cadastro(@Body() dto: CadastroDto) {
    return this.auth.cadastro(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  // O app mobile envia `idToken`; o botão da web (Google Identity Services)
  // devolve o mesmo token no campo `credential`. Aceitamos os dois nomes.
  @Post('google')
  @HttpCode(HttpStatus.OK)
  loginGoogle(@Body() dto: LoginGoogleDto) {
    return this.auth.loginGoogle(dto.idToken ?? dto.credential ?? '');
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() dto: RefreshDto) {
    await this.auth.logout(dto.refreshToken);
  }

  @Post('esqueci-senha')
  @HttpCode(HttpStatus.OK)
  esqueciSenha(@Body() dto: EsqueciSenhaDto) {
    return this.auth.esqueciSenha(dto.email);
  }
}
