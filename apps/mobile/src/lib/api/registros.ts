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

export interface RegistroItem {
  id: string;
  tipo: 'glicemia' | 'refeicao';
  valor: number | null;
  alerta: AvaliacaoGlicemia | null;
  momento: string | null;
  descricao: string | null;
  tipoRefeicao: string | null;
  carboidratos: number | null;
  observacao: string | null;
  dataHora: string;
}

export interface RegistrosResponse {
  data: RegistroItem[];
  meta: { glicemiaCount: number; refeicaoCount: number; total: number };
}

/**
 * Histórico do próprio paciente — a API recorta pelo usuário do token,
 * então não existe parâmetro de paciente para o app mandar.
 */
export async function listarRegistros(dias = 30): Promise<RegistrosResponse> {
  const { data } = await api.get('/registros', { params: { dias } });
  return data;
}

export async function createGlicemia(input: GlicemiaInput): Promise<GlicemiaResponse> {
  const { data } = await api.post('/registros/glicemia', input);
  return data;
}

export async function createRefeicao(input: RefeicaoInput) {
  const { data } = await api.post('/registros/refeicao', input);
  return data;
}
