import { api } from '@/lib/api';

export type SeveridadeAlerta = 'critico' | 'atencao' | 'normal';

export type ClassificacaoGlicemia =
  | 'hipoglicemia_grave'
  | 'hipoglicemia'
  | 'normal'
  | 'hiperglicemia'
  | 'hiperglicemia_grave';

export interface AvaliacaoGlicemia {
  classificacao: ClassificacaoGlicemia;
  severidade: SeveridadeAlerta;
  mensagem: string;
  faixaReferencia: { min: number; max: number };
}

export interface GlicemiaResponse {
  id: string;
  tipo: 'glicemia';
  valor: number;
  momento: string;
  observacao: string | null;
  dataHora: string;
  alerta: AvaliacaoGlicemia;
}

export interface GlicemiaInput {
  valor: number;
  momento: 'jejum' | 'pre' | 'pos' | 'aleatorio';
  observacao?: string;
}

export interface RefeicaoInput {
  descricao: string;
  tipo_refeicao: string;
  carboidratos?: number;
  observacao?: string;
}

export async function createGlicemia(input: GlicemiaInput): Promise<GlicemiaResponse> {
  const { data } = await api.post('/registros/glicemia', input);
  return data;
}

export async function createRefeicao(input: RefeicaoInput) {
  const { data } = await api.post('/registros/refeicao', input);
  return data;
}
