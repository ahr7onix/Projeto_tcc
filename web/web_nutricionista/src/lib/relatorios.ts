import { api } from './api'

export interface RelatorioRegistroGlicemia {
  id: string
  valor: number
  momento: string
  observacao: string | null
  dataHora: string
  classificacao: string
  severidade: 'critico' | 'atencao' | 'normal'
}

export interface RelatorioRegistroRefeicao {
  id: string
  descricao: string
  tipoRefeicao: string
  carboidratos: number | null
  observacao: string | null
  dataHora: string
}

export interface RelatorioAnotacao {
  id: string
  tipo: string
  texto: string
  criadoEm: string
  autorNome: string
}

export interface Relatorio {
  paciente: {
    id: string
    nome: string
    email: string
    peso: number | null
    altura: number | null
    imc: number | null
    tipoDiabetes: string | null
    dataNascimento: string | null
    restricoesAlergias: string | null
  }
  periodo: { dias: number; geradoEm: string }
  glicemia: {
    total: number
    media: number | null
    minimo: number | null
    maximo: number | null
    desvioPadrao: number | null
    percentualNaFaixa: number | null
    hipoglicemias: number
    hiperglicemias: number
    criticos: number
    porMomento: { momento: string; total: number; media: number | null }[]
    registros: RelatorioRegistroGlicemia[]
  }
  alimentacao: {
    total: number
    carboidratosMedia: number | null
    registros: RelatorioRegistroRefeicao[]
  }
  anotacoes: RelatorioAnotacao[]
}

export async function gerarRelatorio(pacienteId: string, dias = 30, completo = false): Promise<Relatorio> {
  const { data } = await api.get('/relatorios', { params: { pacienteId, dias, completo } })
  return data
}

export async function baixarCsv(pacienteId: string, dias = 30): Promise<void> {
  const response = await api.get('/relatorios/csv', {
    params: { pacienteId, dias },
    responseType: 'blob',
  })

  const disposition = response.headers['content-disposition'] as string | undefined
  const match = disposition?.match(/filename="(.+)"/)
  const nomeArquivo = match ? match[1] : `relatorio_${dias}d.csv`

  const url = URL.createObjectURL(new Blob([response.data], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = nomeArquivo
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
