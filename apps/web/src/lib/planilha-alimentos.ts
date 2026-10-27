import type { ItemImportacao } from './alimentos'

/**
 * Leitura da planilha de alimentos (RF01), feita no navegador: a API recebe
 * só os números já convertidos, e a nutricionista vê os problemas antes de
 * enviar qualquer coisa.
 */

type Campo = keyof ItemImportacao

/**
 * Nomes de coluna aceitos para cada campo, já normalizados (sem acento, em
 * minúsculas, com _ no lugar de espaço e símbolo). Cobre o modelo do sistema
 * e os cabeçalhos da TACO, como "Energia (kcal)" e "Lipídeos (g)".
 */
const SINONIMOS: Record<Campo, string[]> = {
  nome: ['nome', 'alimento', 'descricao', 'descricao_do_alimento', 'descricao_dos_alimentos'],
  grupo: ['grupo', 'categoria'],
  porcaoG: ['porcao_g', 'porcao', 'porcao_de_referencia', 'porcao_de_referencia_g'],
  kcal: ['kcal', 'energia', 'energia_kcal', 'calorias', 'calorias_kcal'],
  carboidratosG: ['carboidratos_g', 'carboidratos', 'carboidrato', 'carboidrato_g', 'carboidrato_total_g'],
  proteinasG: ['proteinas_g', 'proteinas', 'proteina', 'proteina_g'],
  lipidiosG: ['lipidios_g', 'lipidios', 'lipideos', 'lipideos_g', 'gordura', 'gordura_total_g'],
  fibrasG: ['fibras_g', 'fibras', 'fibra', 'fibra_g', 'fibra_alimentar', 'fibra_alimentar_g'],
  indiceGlicemico: ['indice_glicemico', 'ig'],
  medidaCaseira: ['medida_caseira'],
  medidaCaseiraG: ['medida_caseira_g', 'peso_da_medida_g', 'gramas_da_medida'],
}

const ROTULOS: Record<Campo, string> = {
  nome: 'nome',
  grupo: 'grupo',
  porcaoG: 'porção',
  kcal: 'calorias',
  carboidratosG: 'carboidratos',
  proteinasG: 'proteínas',
  lipidiosG: 'lipídios',
  fibrasG: 'fibras',
  indiceGlicemico: 'índice glicêmico',
  medidaCaseira: 'medida caseira',
  medidaCaseiraG: 'gramas da medida caseira',
}

const OBRIGATORIOS: Campo[] = ['nome', 'kcal', 'carboidratosG', 'proteinasG', 'lipidiosG']
const NUMERICOS: Campo[] = [
  'porcaoG', 'kcal', 'carboidratosG', 'proteinasG', 'lipidiosG',
  'fibrasG', 'indiceGlicemico', 'medidaCaseiraG',
]

export interface LinhaPlanilha {
  /** Número da linha no arquivo, contando o cabeçalho como linha 1. */
  linha: number
  nome: string
  item: ItemImportacao | null
  problemas: string[]
}

export interface PlanilhaLida {
  /** Colunas obrigatórias que o cabeçalho não tem — sem elas nada é lido. */
  colunasFaltando: string[]
  /** Colunas do arquivo que o sistema não reconheceu e vai ignorar. */
  colunasIgnoradas: string[]
  linhas: LinhaPlanilha[]
}

const normalizar = (texto: string): string =>
  texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

/** O Excel em português separa com ";", o resto do mundo com ",". */
function detectarSeparador(primeiraLinha: string): string {
  const contagem = [';', ',', '\t'].map((s) => ({ s, n: primeiraLinha.split(s).length }))
  contagem.sort((a, b) => b.n - a.n)
  return contagem[0].n > 1 ? contagem[0].s : ';'
}

/** CSV com campos entre aspas, aspas dobradas, CRLF e o BOM que o Excel grava. */
export function lerCsv(texto: string): string[][] {
  const limpo = texto.replace(/^﻿/, '')
  const separador = detectarSeparador(limpo.split(/\r?\n/, 1)[0] ?? '')
  const linhas: string[][] = []
  let linha: string[] = []
  let campo = ''
  let entreAspas = false

  for (let i = 0; i < limpo.length; i++) {
    const c = limpo[i]
    if (entreAspas) {
      if (c === '"' && limpo[i + 1] === '"') {
        campo += '"'
        i++
      } else if (c === '"') {
        entreAspas = false
      } else {
        campo += c
      }
    } else if (c === '"') {
      entreAspas = true
    } else if (c === separador) {
      linha.push(campo)
      campo = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && limpo[i + 1] === '\n') i++
      linha.push(campo)
      linhas.push(linha)
      linha = []
      campo = ''
    } else {
      campo += c
    }
  }
  if (campo || linha.length) {
    linha.push(campo)
    linhas.push(linha)
  }
  return linhas
}

/**
 * Converte "28,1", "28.1" e "1.234,5". Devolve `undefined` para célula vazia e
 * `NaN` para texto que não é número.
 *
 * Na TACO, "Tr" (traço) é quantidade pequena demais para medir e vale zero;
 * "NA" e "*" são valor não analisado e contam como célula vazia.
 */
export function lerNumero(texto: string): number | undefined {
  const limpo = texto.trim()
  if (!limpo || /^(na|n\/a|\*|-)$/i.test(limpo)) return undefined
  if (/^tr$/i.test(limpo)) return 0
  const decimal =
    limpo.includes(',') && limpo.includes('.')
      ? limpo.replace(/\./g, '').replace(',', '.')
      : limpo.replace(',', '.')
  return /^-?\d+(\.\d+)?$/.test(decimal) ? Number(decimal) : NaN
}

export function lerPlanilha(texto: string): PlanilhaLida {
  const linhasCsv = lerCsv(texto)
  const cabecalho = (linhasCsv[0] ?? []).map(normalizar)

  const colunaDe = new Map<Campo, number>()
  const reconhecidas = new Set<number>()
  for (const campo of Object.keys(SINONIMOS) as Campo[]) {
    const indice = cabecalho.findIndex((c) => SINONIMOS[campo].includes(c))
    if (indice >= 0) {
      colunaDe.set(campo, indice)
      reconhecidas.add(indice)
    }
  }

  const colunasFaltando = OBRIGATORIOS.filter((c) => !colunaDe.has(c)).map((c) => ROTULOS[c])
  const colunasIgnoradas = (linhasCsv[0] ?? [])
    .filter((c, i) => c.trim() && !reconhecidas.has(i))
    .map((c) => c.trim())
  if (colunasFaltando.length) return { colunasFaltando, colunasIgnoradas, linhas: [] }

  const primeiraLinhaDoNome = new Map<string, number>()
  const linhas: LinhaPlanilha[] = []

  linhasCsv.slice(1).forEach((celulas, i) => {
    if (!celulas.some((c) => c.trim())) return
    const numeroLinha = i + 2
    const celula = (campo: Campo) => {
      const indice = colunaDe.get(campo)
      return indice === undefined ? '' : (celulas[indice] ?? '').trim()
    }

    const problemas: string[] = []
    const nome = celula('nome')
    if (nome.length < 2) problemas.push('nome ausente')

    const numeros: Partial<Record<Campo, number>> = {}
    for (const campo of NUMERICOS) {
      const valor = lerNumero(celula(campo))
      if (valor === undefined) {
        if (OBRIGATORIOS.includes(campo)) problemas.push(`falta ${ROTULOS[campo]}`)
      } else if (Number.isNaN(valor) || valor < 0) {
        problemas.push(`${ROTULOS[campo]} inválido`)
      } else {
        numeros[campo] = valor
      }
    }

    const medidaCaseira = celula('medidaCaseira')
    if (medidaCaseira && numeros.medidaCaseiraG === undefined) {
      problemas.push('medida caseira sem os gramas')
    }
    if (numeros.indiceGlicemico !== undefined && numeros.indiceGlicemico > 150) {
      problemas.push('índice glicêmico acima de 150')
    }
    // Mesma regra da API: os macros não podem pesar mais que a porção.
    const somaMacros =
      (numeros.carboidratosG ?? 0) + (numeros.proteinasG ?? 0) + (numeros.lipidiosG ?? 0)
    if (somaMacros > (numeros.porcaoG ?? 100)) {
      problemas.push('carboidratos, proteínas e lipídios somam mais que a porção')
    }

    const chave = nome.toLowerCase()
    const repetida = primeiraLinhaDoNome.get(chave)
    if (nome && repetida !== undefined) problemas.push(`repete a linha ${repetida}`)
    else if (nome) primeiraLinhaDoNome.set(chave, numeroLinha)

    const item: ItemImportacao | null = problemas.length
      ? null
      : {
          nome,
          grupo: celula('grupo') || undefined,
          porcaoG: numeros.porcaoG,
          kcal: numeros.kcal as number,
          carboidratosG: numeros.carboidratosG as number,
          proteinasG: numeros.proteinasG as number,
          lipidiosG: numeros.lipidiosG as number,
          fibrasG: numeros.fibrasG,
          // O banco guarda o índice glicêmico como inteiro.
          indiceGlicemico:
            numeros.indiceGlicemico === undefined ? undefined : Math.round(numeros.indiceGlicemico),
          medidaCaseira: medidaCaseira || undefined,
          medidaCaseiraG: medidaCaseira ? numeros.medidaCaseiraG : undefined,
        }

    linhas.push({ linha: numeroLinha, nome, item, problemas })
  })

  return { colunasFaltando, colunasIgnoradas, linhas }
}

/**
 * Lê o arquivo como UTF-8 e, se não for, como Windows-1252: o "CSV (separado
 * por vírgulas)" do Excel em português grava nessa codificação, e sem isto
 * "Feijão" chegava como "Feij�o".
 */
export async function lerArquivoTexto(arquivo: File): Promise<string> {
  const bytes = await arquivo.arrayBuffer()
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return new TextDecoder('windows-1252').decode(bytes)
  }
}

/**
 * Modelo para baixar: ";" e vírgula decimal, que é como o Excel em português
 * abre e salva sem pedir nada. As duas linhas mostram o formato, não são dado.
 */
export function modeloCsv(): string {
  return [
    'nome;grupo;porcao_g;kcal;carboidratos_g;proteinas_g;lipidios_g;fibras_g;indice_glicemico;medida_caseira;medida_caseira_g',
    'Arroz, integral, cozido;Cereais;100;124;25,8;2,6;1,0;2,7;;1 colher de servir;45',
    'Banana, prata, crua;Frutas;100;98;26,0;1,3;0,1;2,0;;1 unidade média;70',
  ].join('\r\n')
}

export function baixarModeloCsv(): void {
  // O BOM faz o Excel abrir o arquivo em UTF-8, com os acentos certos.
  const url = URL.createObjectURL(
    new Blob(['﻿' + modeloCsv()], { type: 'text/csv;charset=utf-8' }),
  )
  const link = document.createElement('a')
  link.href = url
  link.download = 'modelo-tabela-alimentos.csv'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
