import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Request } from 'express';
import { LimitePorMinutoGuard } from '../../common/guards/limite-por-minuto.guard';
import { LimiteTentativas } from '../../common/limite-tentativas';
import { AuthService } from './auth.service';
import { CadastroDto } from './dto/cadastro.dto';
import { EsqueciSenhaDto } from './dto/esqueci-senha.dto';
import { LoginGoogleDto } from './dto/login-google.dto';
import { LoginDto } from './dto/login.dto';
import { RedefinirSenhaDto } from './dto/redefinir-senha.dto';
import { RefreshDto } from './dto/refresh.dto';

/**
 * Dois limites, cada um no seu lugar:
 *
 * - o login conta só as FALHAS (`LimiteTentativas`): quem erra a senha de uma
 *   conta muitas vezes fica bloqueado, e um login certo zera a contagem;
 * - as outras rotas que criam conta ou mandam e-mail (cadastros, Google,
 *   esqueci e redefinir senha) aceitam 5 pedidos por minuto
 *   (`LimitePorMinutoGuard`), para ninguém disparar e-mails ou contas em massa.
 *
 * Renovar e encerrar a sessão ficam de fora dos dois: o app renova o token a
 * cada 15 minutos e não pode ser barrado por isso.
 */
@Controller('auth')
@UseGuards(LimitePorMinutoGuard)
export class AuthController {
  private readonly tentativas = new LimiteTentativas();

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
  @SkipThrottle()
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const chave = `${req.ip}|${dto.email.trim().toLowerCase()}`;
    this.tentativas.verificar(chave);
    try {
      const sessao = await this.auth.login(dto);
      this.tentativas.sucesso(chave);
      return sessao;
    } catch (err) {
      if (err instanceof UnauthorizedException) this.tentativas.falhou(chave);
      throw err;
    }
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
  @SkipThrottle()
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post('logout')
  @SkipThrottle()
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
