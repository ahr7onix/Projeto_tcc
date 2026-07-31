import { api } from '@/lib/api';

export interface RegistroAntropometrico {
  id: string;
  dataMedicao: string;
  peso: number | null;
  altura: number | null;
  imc: number | null;
  classificacaoImc: string | null;
  rotuloImc: string | null;
  circCintura: number | null;
  circQuadril: number | null;
  circBraco: number | null;
  circPanturrilha: number | null;
  circPescoco: number | null;
  rcq: number | null;
  riscoRcq: string | null;
  riscoCintura: string | null;
  observacao: string | null;
  autorNome: string | null;
  criadoEm: string;
}

export interface PontoSerie {
  data: string;
  valor: number;
}

export interface EvolucaoAntropometrica {
  peso: PontoSerie[];
  imc: PontoSerie[];
  circCintura: PontoSerie[];
  /** Diferença entre a primeira e a última pesagem; null com menos de duas medidas. */
  variacaoPeso: number | null;
}

export interface AntropometriaInput {
  peso?: number;
  /** Em metros (1.72), como a API espera — a tela converte o que o paciente digita. */
  altura?: number;
  circCintura?: number;
  circQuadril?: number;
  circBraco?: number;
  circPanturrilha?: number;
  circPescoco?: number;
  observacao?: string;
}

/**
 * Medidas do próprio paciente — a API recorta pelo usuário do token,
 * então não existe parâmetro de paciente para o app mandar.
 */
export async function listarAntropometria(limite?: number): Promise<RegistroAntropometrico[]> {
  const { data } = await api.get('/antropometria', { params: { limite } });
  return data.data;
}

export async function buscarEvolucao(): Promise<EvolucaoAntropometrica> {
  const { data } = await api.get('/antropometria/evolucao');
  return data;
}

export async function criarAntropometria(
  input: AntropometriaInput,
): Promise<RegistroAntropometrico> {
  const { data } = await api.post('/antropometria', input);
  return data;
}

const ROTULO_RISCO: Record<string, string> = {
  baixo: 'Risco baixo',
  moderado: 'Risco moderado',
  aumentado: 'Risco aumentado',
  muito_aumentado: 'Risco muito aumentado',
  elevado: 'Risco elevado',
};

export const rotuloRisco = (risco: string | null): string | null =>
  risco === null ? null : (ROTULO_RISCO[risco] ?? risco);
