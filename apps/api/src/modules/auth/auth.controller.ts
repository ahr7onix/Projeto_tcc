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
import { RedefinirSenhaDto } from './dto/redefinir-senha.dto';
import { RefreshDto } from './dto/refresh.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** App mobile — sempre cria paciente. */
  @Post('cadastro/paciente')
  @HttpCode(HttpStatus.CREATED)
  cadastroPaciente(@Body() dto: CadastroDto) {
    return this.auth.cadastro(dto, 'paciente');
  }

  /** Painel web — sempre cria nutricionista. */
  @Post('cadastro/nutricionista')
  @HttpCode(HttpStatus.CREATED)
  cadastroNutricionista(@Body() dto: CadastroDto) {
    return this.auth.cadastro(dto, 'nutricionista');
  }

  /**
   * Compatível com clientes antigos que ainda mandam `role` no corpo.
   * Preferir `/cadastro/paciente` ou `/cadastro/nutricionista`.
   */
  @Post('cadastro')
  @HttpCode(HttpStatus.CREATED)
  cadastro(@Body() dto: CadastroDto & { role?: string }) {
    const papel =
      dto.role === 'nutricionista' ? 'nutricionista' : 'paciente';
    return this.auth.cadastro(dto, papel);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  // O app mobile envia `idToken`; o botão da web (Google Identity Services)
  // devolve o mesmo token no campo `credential`. Aceitamos os dois nomes.
  @Post('google/paciente')
  @HttpCode(HttpStatus.OK)
  loginGooglePaciente(@Body() dto: LoginGoogleDto) {
    return this.auth.loginGoogle(dto.idToken ?? dto.credential ?? '', 'paciente');
  }

  @Post('google/nutricionista')
  @HttpCode(HttpStatus.OK)
  loginGoogleNutricionista(@Body() dto: LoginGoogleDto) {
    return this.auth.loginGoogle(
      dto.idToken ?? dto.credential ?? '',
      'nutricionista',
    );
  }

  /** Compat: padrão paciente (app mobile). Preferir rotas específicas. */
  @Post('google')
  @HttpCode(HttpStatus.OK)
  loginGoogle(@Body() dto: LoginGoogleDto) {
    return this.auth.loginGoogle(
      dto.idToken ?? dto.credential ?? '',
      dto.perfilCadastro === 'nutricionista' ? 'nutricionista' : 'paciente',
    );
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

  @Post('redefinir-senha')
  @HttpCode(HttpStatus.OK)
  redefinirSenha(@Body() dto: RedefinirSenhaDto) {
    return this.auth.redefinirSenha(dto.token, dto.novaSenha);
  }
}
