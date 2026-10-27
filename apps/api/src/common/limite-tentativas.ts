import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Limite simples de tentativas de login em memória: depois de `maximo` falhas
 * numa `janelaMs`, a chave fica bloqueada até a janela vencer. Em memória de
 * propósito (uma instância só); com várias réplicas, trocar por Redis.
 */
export class LimiteTentativas {
  private falhas = new Map<string, { total: number; desde: number }>();

  constructor(
    private readonly maximo = 10,
    private readonly janelaMs = 15 * 60 * 1000,
  ) {}

  verificar(chave: string): void {
    const f = this.falhas.get(chave);
    if (!f) return;
    if (Date.now() - f.desde > this.janelaMs) {
      this.falhas.delete(chave);
      return;
    }
    if (f.total >= this.maximo) {
      throw new HttpException(
        'Muitas tentativas de login. Aguarde alguns minutos e tente novamente.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  falhou(chave: string): void {
    const f = this.falhas.get(chave);
    if (!f || Date.now() - f.desde > this.janelaMs) {
      this.falhas.set(chave, { total: 1, desde: Date.now() });
    } else {
      f.total += 1;
    }
  }

  sucesso(chave: string): void {
    this.falhas.delete(chave);
  }
}
