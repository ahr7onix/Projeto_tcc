export type MomentoGlicemia =
  | 'jejum'
  | 'pre_prandial'
  | 'pos_prandial'
  | 'antes_dormir'
  | 'madrugada'
  | 'aleatorio';

export type ClassificacaoGlicemia =
  | 'hipoglicemia_grave'
  | 'hipoglicemia'
  | 'normal'
  | 'hiperglicemia'
  | 'hiperglicemia_grave';

export type SeveridadeAlerta = 'critico' | 'atencao' | 'normal';

export interface FaixaReferencia {
  min: number;
  max: number;
}

export const LIMITE_HIPO_GRAVE = 54;
export const LIMITE_HIPO = 70;
export const LIMITE_HIPER_GRAVE = 250;

export const FAIXAS_REFERENCIA: Record<MomentoGlicemia, FaixaReferencia> = {
  jejum: { min: 70, max: 180 },
  pre_prandial: { min: 70, max: 180 },
  pos_prandial: { min: 70, max: 180 },
  antes_dormir: { min: 90, max: 150 },
  madrugada: { min: 70, max: 140 },
  aleatorio: { min: 70, max: 180 },
};

export function faixaDoMomento(momento: string): FaixaReferencia {
  return FAIXAS_REFERENCIA[momento as MomentoGlicemia] ?? FAIXAS_REFERENCIA.aleatorio;
}

export function classificarGlicemia(
  valor: number,
  momento: string,
): ClassificacaoGlicemia {
  if (valor < LIMITE_HIPO_GRAVE) return 'hipoglicemia_grave';
  if (valor < LIMITE_HIPO) return 'hipoglicemia';
  if (valor > LIMITE_HIPER_GRAVE) return 'hiperglicemia_grave';

  const faixa = faixaDoMomento(momento);
  if (valor > faixa.max) return 'hiperglicemia';
  // O piso da faixa também vale: antes de dormir o alvo começa em 90 justamente
  // para dar margem contra a hipoglicemia noturna. Sem esta linha, 78 mg/dL às
  // 22h era exibido como "normal" ao lado do alvo "90–150", que se contradiz.
  if (valor < faixa.min) return 'hipoglicemia';
  return 'normal';
}

export function severidadeDaClassificacao(
  classificacao: ClassificacaoGlicemia,
): SeveridadeAlerta {
  if (classificacao === 'hipoglicemia_grave' || classificacao === 'hiperglicemia_grave') {
    return 'critico';
  }
  if (classificacao === 'normal') return 'normal';
  return 'atencao';
}

const MENSAGENS: Record<ClassificacaoGlicemia, string> = {
  hipoglicemia_grave:
    'Hipoglicemia grave. Procure atendimento e comunique seu nutricionista.',
  hipoglicemia: 'Glicemia abaixo do esperado para este momento.',
  normal: 'Glicemia dentro da faixa de referência.',
  hiperglicemia: 'Glicemia acima do esperado para este momento.',
  hiperglicemia_grave:
    'Hiperglicemia grave. Procure atendimento e comunique seu nutricionista.',
};

export function mensagemClassificacao(classificacao: ClassificacaoGlicemia): string {
  return MENSAGENS[classificacao];
}

export function avaliarGlicemia(valor: number, momento: string) {
  const classificacao = classificarGlicemia(valor, momento);
  return {
    classificacao,
    severidade: severidadeDaClassificacao(classificacao),
    mensagem: mensagemClassificacao(classificacao),
    faixaReferencia: faixaDoMomento(momento),
  };
}
