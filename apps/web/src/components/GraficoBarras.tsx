export type TintBarra = 'primary' | 'success' | 'warning' | 'danger' | 'neutro'

export interface BarraDados {
  rotulo: string
  valor: number
  /** Cor só quando a barra carrega estado clínico; senão a série toda é de um tom. */
  tint?: TintBarra
  /** Linha de apoio sob o rótulo, quando o número precisa de contexto. */
  nota?: string
}

interface Props {
  dados: BarraDados[]
  /** Sufixo do valor exibido: " paciente(s)", "%", " medições". */
  unidade?: string
  /**
   * Base da escala. Sem isto a maior barra ocupa a linha inteira, o que faz
   * duas categorias parecidas parecerem muito diferentes.
   */
  maximo?: number
  vazio?: string
}

const COR: Record<TintBarra, string> = {
  primary: 'var(--primary)',
  success: 'var(--success)',
  warning: 'var(--warning)',
  danger: 'var(--danger)',
  neutro: 'var(--border-strong)',
}

/**
 * Barras horizontais para comparar categorias.
 *
 * Horizontal, e não pizza: comparar comprimento é mais fácil do que comparar
 * ângulo, e o rótulo cabe por extenso ao lado sem legenda separada.
 *
 * O valor aparece sempre escrito ao lado da barra. Isso não é enfeite: as
 * cores de estado do sistema (atenção e crítico) são vermelho e âmbar, que
 * ninguém com deuteranopia distingue. Com o número e o rótulo ao lado, a
 * leitura nunca depende só da cor.
 */
export default function GraficoBarras({
  dados,
  unidade = '',
  maximo,
  vazio = 'Sem dados no período.',
}: Props) {
  const teto = Math.max(maximo ?? 0, ...dados.map((d) => d.valor), 1)

  if (!dados.length) {
    return <div style={mensagemVazia}>{vazio}</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {dados.map((d) => {
        const proporcao = d.valor / teto
        return (
          <div key={d.rotulo}>
            <div style={linhaTopo}>
              <span style={rotulo}>{d.rotulo}</span>
              <span style={valor}>
                {d.valor}
                {unidade}
              </span>
            </div>
            <div
              style={trilho}
              role="img"
              aria-label={`${d.rotulo}: ${d.valor}${unidade}`}
              title={`${d.rotulo}: ${d.valor}${unidade}`}
            >
              {/* Zero não desenha nada: uma barra mínima faria "nenhum caso"
                  parecer "poucos casos". */}
              {d.valor > 0 && (
                <div
                  style={{
                    height: '100%',
                    width: `${Math.max(proporcao * 100, 1.5)}%`,
                    background: COR[d.tint ?? 'primary'],
                    borderRadius: 999,
                    transition: 'width 0.3s ease',
                  }}
                />
              )}
            </div>
            {d.nota && <div style={nota}>{d.nota}</div>}
          </div>
        )
      })}
    </div>
  )
}

const linhaTopo: React.CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: 12,
  marginBottom: 6,
}

const rotulo: React.CSSProperties = {
  fontSize: 13,
  color: 'var(--text)',
}

const valor: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--text-soft)',
  whiteSpace: 'nowrap',
}

const trilho: React.CSSProperties = {
  height: 8,
  background: 'var(--surface-alt)',
  borderRadius: 999,
  overflow: 'hidden',
}

const nota: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--text-muted)',
  marginTop: 4,
}

const mensagemVazia: React.CSSProperties = {
  padding: 24,
  textAlign: 'center',
  fontSize: 13,
  color: 'var(--text-muted)',
}
