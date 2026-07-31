import { useMemo } from 'react'

export interface PontoGrafico {
  data: string
  valor: number
}

interface Props {
  pontos: PontoGrafico[]
  unidade?: string
  /** Variável de cor do tema, para o gráfico acompanhar claro/escuro. */
  cor?: string
  altura?: number
  /** Mensagem exibida quando ainda não há medidas suficientes. */
  vazio?: string
}

const LARGURA = 640
const MARGEM = { topo: 18, direita: 14, base: 26, esquerda: 46 }

const formatarData = (iso: string): string => {
  const [, mes, dia] = iso.slice(0, 10).split('-')
  return `${dia}/${mes}`
}

/** Uma casa decimal só quando o número precisa: 72 e 72,4. */
const formatarValor = (valor: number): string =>
  Number.isInteger(valor) ? String(valor) : valor.toFixed(1).replace('.', ',')

/**
 * Gráfico de linha desenhado em SVG puro. O projeto não usa biblioteca de
 * gráficos: são poucas séries e assim o painel não carrega mais um pacote.
 */
export default function GraficoLinha({
  pontos,
  unidade = '',
  cor = 'var(--primary)',
  altura = 220,
  vazio = 'Sem medidas suficientes para montar o gráfico.',
}: Props) {
  const desenho = useMemo(() => {
    if (pontos.length === 0) return null

    const valores = pontos.map((p) => p.valor)
    const maior = Math.max(...valores)
    const menor = Math.min(...valores)
    // Série constante viraria uma linha colada na borda: abre uma folga fixa.
    const folga = maior === menor ? Math.max(1, maior * 0.05) : (maior - menor) * 0.15
    const topo = maior + folga
    const base = menor - folga

    const larguraUtil = LARGURA - MARGEM.esquerda - MARGEM.direita
    const alturaUtil = altura - MARGEM.topo - MARGEM.base

    const x = (i: number) =>
      pontos.length === 1
        ? MARGEM.esquerda + larguraUtil / 2
        : MARGEM.esquerda + (i / (pontos.length - 1)) * larguraUtil
    const y = (valor: number) =>
      MARGEM.topo + alturaUtil - ((valor - base) / (topo - base)) * alturaUtil

    const coordenadas = pontos.map((p, i) => ({ ...p, cx: x(i), cy: y(p.valor) }))
    const linha = coordenadas.map((p) => `${p.cx},${p.cy}`).join(' ')
    const area = `${MARGEM.esquerda},${MARGEM.topo + alturaUtil} ${linha} ${
      coordenadas[coordenadas.length - 1].cx
    },${MARGEM.topo + alturaUtil}`

    const marcas = [topo, (topo + base) / 2, base].map((valor) => ({
      valor,
      y: y(valor),
    }))

    return { coordenadas, linha, area, marcas }
  }, [pontos, altura])

  if (!desenho) {
    return (
      <div
        style={{
          height: altura,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 13,
          color: 'var(--text-muted)',
          textAlign: 'center',
          padding: 16,
        }}
      >
        {vazio}
      </div>
    )
  }

  const gradienteId = `grad-${cor.replace(/[^a-z]/gi, '')}`

  // Sem altura fixa no SVG: ele acompanha a largura do cartão sem esticar o texto.
  return (
    <svg
      viewBox={`0 0 ${LARGURA} ${altura}`}
      width="100%"
      style={{ display: 'block', height: 'auto' }}
      role="img"
      aria-label={`Evolução: ${desenho.coordenadas
        .map((p) => `${formatarData(p.data)} ${formatarValor(p.valor)}${unidade}`)
        .join(', ')}`}
    >
      <defs>
        <linearGradient id={gradienteId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={cor} stopOpacity="0.22" />
          <stop offset="100%" stopColor={cor} stopOpacity="0" />
        </linearGradient>
      </defs>

      {desenho.marcas.map((marca) => (
        <g key={marca.valor}>
          <line
            x1={MARGEM.esquerda}
            y1={marca.y}
            x2={LARGURA - MARGEM.direita}
            y2={marca.y}
            stroke="var(--border)"
            strokeWidth="1"
          />
          <text
            x={MARGEM.esquerda - 8}
            y={marca.y + 4}
            textAnchor="end"
            fontSize="11"
            fill="var(--text-muted)"
          >
            {formatarValor(Number(marca.valor.toFixed(1)))}
          </text>
        </g>
      ))}

      <polyline points={desenho.area} fill={`url(#${gradienteId})`} stroke="none" />
      <polyline
        points={desenho.linha}
        fill="none"
        stroke={cor}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />

      {desenho.coordenadas.map((p, i) => (
        <g key={`${p.data}-${i}`}>
          <circle cx={p.cx} cy={p.cy} r="4" fill="var(--surface)" stroke={cor} strokeWidth="2" />
          {/* Só as pontas ganham rótulo: com muitas medidas o eixo vira borrão. */}
          {(i === 0 || i === desenho.coordenadas.length - 1) && (
            <text
              x={p.cx}
              y={altura - 8}
              textAnchor={i === 0 ? 'start' : 'end'}
              fontSize="11"
              fill="var(--text-muted)"
            >
              {formatarData(p.data)}
            </text>
          )}
        </g>
      ))}
    </svg>
  )
}
