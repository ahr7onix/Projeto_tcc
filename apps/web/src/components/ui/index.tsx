import React from 'react'

/*
 * Componentes compartilhados do painel.
 *
 * Todos leem as variáveis de `index.css` — nenhum fixa cor no código. Trocar a
 * identidade visual do sistema é mexer só naquele arquivo.
 */

/* ─── Card ─── */
interface CardProps {
  title?: string
  /** Linha de apoio abaixo do título, para explicar o que a tabela mostra. */
  subtitle?: string
  action?: React.ReactNode
  children: React.ReactNode
  style?: React.CSSProperties
  /** Remove o respiro interno — para cards que abrigam uma tabela inteira. */
  flush?: boolean
}
export function Card({ title, subtitle, action, children, style, flush }: CardProps) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-card)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      ...style,
    }}>
      {(title || action) && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 12, padding: '14px 18px',
          borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ minWidth: 0 }}>
            {title && <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{title}</div>}
            {subtitle && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{subtitle}</div>}
          </div>
          {action && <div style={{ flexShrink: 0 }}>{action}</div>}
        </div>
      )}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 14,
        padding: flush ? 0 : '18px',
        minWidth: 0,
      }}>
        {children}
      </div>
    </div>
  )
}

/* ─── Tons semânticos ─── */
type Tint = 'primary' | 'success' | 'warning' | 'danger' | 'neutral'
const tintMap: Record<Tint, { bg: string; fg: string }> = {
  primary: { bg: 'var(--primary-soft)', fg: 'var(--primary)' },
  success: { bg: 'var(--success-soft)', fg: 'var(--success)' },
  warning: { bg: 'var(--warning-soft)', fg: 'var(--warning)' },
  danger: { bg: 'var(--danger-soft)', fg: 'var(--danger)' },
  neutral: { bg: 'var(--surface-alt)', fg: 'var(--text-soft)' },
}

/* ─── StatTile ─── */
interface StatTileProps {
  label: string
  value: string | number
  icon: React.ReactNode
  tint?: Tint
  sub?: string
  onClick?: () => void
}
export function StatTile({ label, value, icon, tint = 'primary', sub, onClick }: StatTileProps) {
  const t = tintMap[tint]
  const conteudo = (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: t.fg, display: 'flex' }}>{icon}</span>
        <span style={{
          fontSize: 12, fontWeight: 500, color: 'var(--text-soft)',
          letterSpacing: '0.01em',
        }}>{label}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: sub ? t.fg : 'transparent', fontWeight: 500 }}>{sub || '—'}</div>
    </>
  )

  const base: React.CSSProperties = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-card)',
    padding: '16px 18px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    flex: 1,
    minWidth: 0,
    textAlign: 'left',
  }

  if (!onClick) return <div style={base}>{conteudo}</div>
  return (
    <button type="button" onClick={onClick} style={{ ...base, cursor: 'pointer', font: 'inherit' }}>
      {conteudo}
    </button>
  )
}

/* ─── EmptyState ─── */
interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  message?: string
  action?: React.ReactNode
}
export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 6, padding: '36px 20px', textAlign: 'center',
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 'var(--radius-lg)',
        background: 'var(--surface-alt)', color: 'var(--text-muted)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 6,
      }}>{icon}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{title}</div>
      {message && <div style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 320 }}>{message}</div>}
      {action && <div style={{ marginTop: 10 }}>{action}</div>}
    </div>
  )
}

/* ─── PageHeader ─── */
interface PageHeaderProps {
  eyebrow?: string
  title: string
  subtitle?: string
  action?: React.ReactNode
}
export function PageHeader({ eyebrow, title, subtitle, action }: PageHeaderProps) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      gap: 16, marginBottom: 22, flexWrap: 'wrap',
    }}>
      <div style={{ minWidth: 0 }}>
        {eyebrow && (
          <div style={{
            fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
            letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6,
          }}>{eyebrow}</div>
        )}
        <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1.25 }}>
          {title}
        </h1>
        {subtitle && <p style={{ fontSize: 14, color: 'var(--text-soft)', marginTop: 4 }}>{subtitle}</p>}
      </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  )
}

/* ─── Badge ─── */
interface BadgeProps { label: string; tint?: Tint; dot?: boolean }
export function Badge({ label, tint = 'neutral', dot }: BadgeProps) {
  const t = tintMap[tint]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 9px', borderRadius: 'var(--radius-pill)',
      fontSize: 12, fontWeight: 500, lineHeight: '18px',
      background: t.bg, color: t.fg,
      whiteSpace: 'nowrap',
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />}
      {label}
    </span>
  )
}

/* ─── Btn ─── */
interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: React.ReactNode
}
// Cor chapada, sem degradê: o botão principal se destaca por ser o único cheio.
const btnStyles: Record<string, React.CSSProperties> = {
  primary: { background: 'var(--primary)', color: 'var(--text-inverse)', border: '1px solid var(--primary)' },
  secondary: { background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border-strong)' },
  danger: { background: 'var(--surface)', color: 'var(--danger)', border: '1px solid var(--danger)' },
  ghost: { background: 'transparent', color: 'var(--text-soft)', border: '1px solid transparent' },
}
const sizeStyles: Record<string, React.CSSProperties> = {
  sm: { padding: '5px 10px', fontSize: 13, borderRadius: 'var(--radius-md)' },
  md: { padding: '8px 14px', fontSize: 14, borderRadius: 'var(--radius-md)' },
  lg: { padding: '11px 20px', fontSize: 15, borderRadius: 'var(--radius-md)' },
}
export function Btn({ variant = 'primary', size = 'md', loading, icon, children, style, disabled, ...props }: BtnProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
        fontWeight: 500, lineHeight: 1.4, whiteSpace: 'nowrap',
        cursor: (disabled || loading) ? 'not-allowed' : 'pointer',
        opacity: (disabled || loading) ? 0.55 : 1,
        transition: 'background 0.12s, border-color 0.12s, opacity 0.12s',
        ...btnStyles[variant],
        ...sizeStyles[size],
        ...style,
      }}
    >
      {icon && <span style={{ display: 'flex' }}>{icon}</span>}
      {loading ? 'Carregando...' : children}
    </button>
  )
}

/* ─── Campos de formulário ─── */
const campoBase: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  background: 'var(--surface)',
  border: '1px solid var(--border-strong)',
  borderRadius: 'var(--radius-md)',
  fontSize: 14,
  color: 'var(--text)',
  outline: 'none',
  transition: 'border-color 0.12s, box-shadow 0.12s',
}
const anelFoco = '0 0 0 3px var(--primary-soft)'

function Rotulo({ children }: { children: React.ReactNode }) {
  return <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-soft)' }}>{children}</label>
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: React.ReactNode
}
export function Input({ label, error, icon, style, ...props }: InputProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && <Rotulo>{label}</Rotulo>}
      <div style={{ position: 'relative' }}>
        {icon && (
          <span style={{
            position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text-muted)', display: 'flex', pointerEvents: 'none',
          }}>{icon}</span>
        )}
        <input
          {...props}
          style={{
            ...campoBase,
            paddingLeft: icon ? 38 : 12,
            borderColor: error ? 'var(--danger)' : 'var(--border-strong)',
            ...style,
          }}
          onFocus={(e) => {
            e.target.style.borderColor = 'var(--primary)'
            e.target.style.boxShadow = anelFoco
            props.onFocus?.(e)
          }}
          onBlur={(e) => {
            e.target.style.borderColor = error ? 'var(--danger)' : 'var(--border-strong)'
            e.target.style.boxShadow = 'none'
            props.onBlur?.(e)
          }}
        />
      </div>
      {error && <span style={{ fontSize: 12, color: 'var(--danger)' }}>{error}</span>}
    </div>
  )
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
}
export function Textarea({ label, style, ...props }: TextareaProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && <Rotulo>{label}</Rotulo>}
      <textarea
        {...props}
        style={{ ...campoBase, resize: 'vertical', minHeight: 88, fontFamily: 'inherit', ...style }}
        onFocus={(e) => {
          e.target.style.borderColor = 'var(--primary)'
          e.target.style.boxShadow = anelFoco
          props.onFocus?.(e)
        }}
        onBlur={(e) => {
          e.target.style.borderColor = 'var(--border-strong)'
          e.target.style.boxShadow = 'none'
          props.onBlur?.(e)
        }}
      />
    </div>
  )
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: { value: string; label: string }[]
}
export function Select({ label, options, style, ...props }: SelectProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && <Rotulo>{label}</Rotulo>}
      <select
        {...props}
        style={{ ...campoBase, cursor: 'pointer', appearance: 'none', paddingRight: 32,
          // Seta desenhada em CSS para o campo ficar igual em todos os navegadores.
          backgroundImage: 'linear-gradient(45deg, transparent 50%, var(--text-muted) 50%), linear-gradient(135deg, var(--text-muted) 50%, transparent 50%)',
          backgroundPosition: 'calc(100% - 17px) 51%, calc(100% - 12px) 51%',
          backgroundSize: '5px 5px, 5px 5px',
          backgroundRepeat: 'no-repeat',
          ...style }}
        onFocus={(e) => {
          e.target.style.borderColor = 'var(--primary)'
          e.target.style.boxShadow = anelFoco
          props.onFocus?.(e)
        }}
        onBlur={(e) => {
          e.target.style.borderColor = 'var(--border-strong)'
          e.target.style.boxShadow = 'none'
          props.onBlur?.(e)
        }}
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

/* ─── ChipGroup ─── */
interface ChipGroupProps {
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}
export function ChipGroup({ options, value, onChange }: ChipGroupProps) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {options.map((o) => {
        const active = value === o.value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            style={{
              padding: '6px 12px', borderRadius: 'var(--radius-md)',
              fontWeight: 500, fontSize: 13,
              border: `1px solid ${active ? 'var(--primary)' : 'var(--border-strong)'}`,
              background: active ? 'var(--primary-soft)' : 'var(--surface)',
              color: active ? 'var(--primary)' : 'var(--text-soft)',
              cursor: 'pointer', transition: 'all 0.12s',
            }}
          >{o.label}</button>
        )
      })}
    </div>
  )
}

/* ─── Divider ─── */
export function Divider({ label }: { label?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      {label && <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{label}</span>}
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  )
}

/* ─── ProgressBar ─── */
export function ProgressBar({ value, tint = 'primary' }: { value: number; tint?: Tint }) {
  const t = tintMap[tint]
  return (
    <div style={{ height: 6, background: 'var(--surface-alt)', borderRadius: 999, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.max(value * 100, 4)}%`, background: t.fg, borderRadius: 999, transition: 'width 0.3s ease' }} />
    </div>
  )
}

/* ─── AlertBanner ─── */
export function AlertBanner({ message, type = 'danger' }: { message: string; type?: 'danger' | 'success' }) {
  const t = type === 'danger' ? tintMap.danger : tintMap.success
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '10px 14px', borderRadius: 'var(--radius-md)',
      background: t.bg, color: t.fg,
      border: `1px solid ${t.fg}`,
      fontSize: 13, fontWeight: 500,
    }}>
      <span style={{ display: 'flex', flexShrink: 0 }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {type === 'danger'
            ? <><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></>
            : <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></>}
        </svg>
      </span>
      {message}
    </div>
  )
}

/* ─── Paginacao ─── */
/**
 * Divide uma lista já carregada em páginas.
 *
 * A paginação é feita no cliente porque as telas do painel buscam o histórico
 * inteiro do paciente de uma vez (a API não tem `offset`). Isso mantém o
 * contador honesto: o total exibido é o número real de itens recebidos.
 *
 * A página volta para 1 sempre que a lista muda de tamanho — trocar de paciente
 * ou de filtro deixaria o nutricionista parado numa página que não existe mais.
 * Quando a troca de filtro pode devolver uma lista do mesmo tamanho, passe o
 * filtro em `chaveReset` para forçar a volta ao início.
 */
export function usePaginacao<T>(itens: T[], porPagina = 20, chaveReset?: string) {
  const [pagina, setPagina] = React.useState(1)

  const totalPaginas = Math.max(1, Math.ceil(itens.length / porPagina))
  const paginaAtual = Math.min(pagina, totalPaginas)

  React.useEffect(() => {
    setPagina(1)
  }, [itens.length, chaveReset])

  const inicio = (paginaAtual - 1) * porPagina
  const visiveis = itens.slice(inicio, inicio + porPagina)

  return {
    visiveis,
    pagina: paginaAtual,
    totalPaginas,
    total: itens.length,
    primeiro: itens.length === 0 ? 0 : inicio + 1,
    ultimo: Math.min(inicio + porPagina, itens.length),
    irPara: setPagina,
  }
}

interface PaginacaoProps {
  pagina: number
  totalPaginas: number
  total: number
  primeiro: number
  ultimo: number
  onChange: (pagina: number) => void
  /** Nome do que está sendo listado, no plural. Ex.: "medidas". */
  rotulo?: string
}
export function Paginacao({ pagina, totalPaginas, total, primeiro, ultimo, onChange, rotulo = 'itens' }: PaginacaoProps) {
  // Uma página só não precisa de controle: o contador viraria ruído na tela.
  if (totalPaginas <= 1) return null

  const btn = (ativo: boolean): React.CSSProperties => ({
    padding: '5px 12px', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 500,
    border: '1px solid var(--border-strong)',
    background: 'var(--surface)',
    color: ativo ? 'var(--text)' : 'var(--text-muted)',
    cursor: ativo ? 'pointer' : 'default',
    opacity: ativo ? 1 : 0.5,
    transition: 'opacity 0.12s',
  })

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 12, flexWrap: 'wrap',
      paddingTop: 14, marginTop: 4, borderTop: '1px solid var(--border)',
    }}>
      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
        {primeiro}–{ultimo} de {total} {rotulo}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          type="button"
          onClick={() => onChange(pagina - 1)}
          disabled={pagina <= 1}
          aria-label="Página anterior"
          style={btn(pagina > 1)}
        >‹ Anterior</button>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 78, textAlign: 'center' }}>
          Página {pagina} de {totalPaginas}
        </span>
        <button
          type="button"
          onClick={() => onChange(pagina + 1)}
          disabled={pagina >= totalPaginas}
          aria-label="Próxima página"
          style={btn(pagina < totalPaginas)}
        >Próxima ›</button>
      </div>
    </div>
  )
}
