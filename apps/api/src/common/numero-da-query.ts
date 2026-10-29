// `?dias=` e `?limite=` chegam como texto. Antes, `Number('abc')` (NaN), um
// negativo ou um número gigante iam direto para o SQL e a resposta era 500.
// Aqui o que não é inteiro positivo vira `undefined` (o serviço usa o padrão
// dele) e o que passa do teto é cortado.
const DIAS_MAXIMO = 3650;
const LIMITE_MAXIMO = 1000;

function inteiroPositivo(valor: string | undefined, maximo: number): number | undefined {
  if (!valor) return undefined;
  const numero = Number(valor);
  if (!Number.isInteger(numero) || numero <= 0) return undefined;
  return Math.min(numero, maximo);
}

export const diasDaQuery = (valor?: string) => inteiroPositivo(valor, DIAS_MAXIMO);

export const limiteDaQuery = (valor?: string) => inteiroPositivo(valor, LIMITE_MAXIMO);
