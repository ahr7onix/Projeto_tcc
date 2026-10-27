import { BadRequestException } from '@nestjs/common';

/**
 * Converte a data de nascimento (DD/MM/AAAA ou AAAA-MM-DD) para ISO.
 * Recusa data inexistente (31/02), futura ou de mais de 120 anos, que antes
 * viravam 500 no banco ou idade negativa no cálculo do VET.
 */
export function normalizarDataNascimento(valor?: string | null): string | null {
  if (!valor) return null;
  const br = valor.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const iso = br ? `${br[3]}-${br[2]}-${br[1]}` : valor;
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const data = m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null;
  const existe =
    data !== null &&
    data.getUTCFullYear() === +m![1] &&
    data.getUTCMonth() === +m![2] - 1 &&
    data.getUTCDate() === +m![3];
  const hoje = new Date();
  const limite = Date.UTC(hoje.getUTCFullYear() - 120, hoje.getUTCMonth(), hoje.getUTCDate());
  if (!existe || data!.getTime() > hoje.getTime() || data!.getTime() < limite) {
    throw new BadRequestException('Data de nascimento inválida');
  }
  return `${m![1]}-${m![2]}-${m![3]}`;
}
