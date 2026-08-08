import React from 'react'

/* ─── Card ─── */
interface CardProps {
  title?: string
  action?: React.ReactNode
  children: React.ReactNode
  style?: React.CSSProperties
}
export function Card({ title, action, children, style }: CardProps) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      ...style
    }}>
      {(title || action) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {title && <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{title}</span>}
          {action}
        </div>
      )}
      {children}
    </div>
  )
}

/* ─── StatTile ─── */
type Tint = 'primary' | 'success' | 'warning' | 'danger'
interface StatTileProps {
  label: string
  value: string | number
  icon: React.ReactNode
  tint?: Tint
  sub?: string
}
const tintMap: Record<Tint, { bg: string; fg: string }> = {
  primary: { bg: 'var(--primary-soft)', fg: 'var(--primary)' },
  success: { bg: 'var(--success-soft)', fg: 'var(--success)' },
  warning: { bg: 'var(--warning-soft)', fg: 'var(--warning)' },
  danger: { bg: 'var(--danger-soft)', fg: 'var(--danger)' },
}
export function StatTile({ label, value, icon, tint = 'primary', sub }: StatTileProps) {
  const t = tintMap[tint]
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '20px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '14px',
      flex: 1,
      minWidth: 0,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 'var(--radius-md)',
        background: t.bg, color: t.fg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>{icon}</div>
      <div>
        <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.5px' }}>{value}</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
        {sub && <div style={{ fontSize: 12, color: t.fg, fontWeight: 600, marginTop: 4 }}>{sub}</div>}
      </div>
    </div>
  )
}

/* ─── EmptyState ─── */
interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  message?: string
}
export function EmptyState({ icon, title, message }: EmptyStateProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '24px 0', textAlign: 'center' }}>
      <div style={{ color: 'var(--text-muted)', opacity: 0.5, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-soft)' }}>{title}</div>
      {message && <div style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 280 }}>{message}</div>}
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
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 28 }}>
      <div>
        {eyebrow && <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 4 }}>{eyebrow}</div>}
        <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.5px', lineHeight: 1.2 }}>{title}</h1>
        {subtitle && <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 6 }}>{subtitle}</p>}
      </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  )
}

/* ─── Badge ─── */
interface BadgeProps { label: string; tint?: Tint }
export function Badge({ label, tint = 'primary' }: BadgeProps) {
  const t = tintMap[tint]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 10px', borderRadius: 999,
      fontSize: 11, fontWeight: 700,
      background: t.bg, color: t.fg,
    }}>{label}</span>
  )
}

/* ─── Btn ─── */
interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: React.ReactNode
}
const btnStyles: Record<string, React.CSSProperties> = {
  primary: {
    background: 'linear-gradient(90deg, #6c22bd, #9d4edd)',
    color: 'white',
    border: 'none',
    boxShadow: '0 8px 18px rgba(108, 34, 189, 0.35)',
  },
  secondary: { background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' },
  danger: { background: 'var(--danger-soft)', color: 'var(--danger)', border: 'none' },
  ghost: { background: 'transparent', color: 'var(--text-soft)', border: '1px solid var(--border)' },
}
const sizeStyles: Record<string, React.CSSProperties> = {
  sm: { padding: '6px 12px', fontSize: 13, borderRadius: 'var(--radius-md)' },
  md: { padding: '10px 18px', fontSize: 14, borderRadius: 'var(--radius-md)' },
  lg: { padding: '13px 24px', fontSize: 15, borderRadius: 'var(--radius-pill)' },
}
export function Btn({ variant = 'primary', size = 'md', loading, icon, children, style, disabled, ...props }: BtnProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 7,
        fontWeight: 600, cursor: 'pointer', outline: 'none',
        opacity: (disabled || loading) ? 0.65 : 1,
        transition: 'opacity 0.15s',
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

/* ─── Input ─── */
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: React.ReactNode
}
export function Input({ label, error, icon, style, ...props }: InputProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-soft)' }}>{label}</label>}
      <div style={{ position: 'relative' }}>
        {icon && (
          <span style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text-muted)', display: 'flex', pointerEvents: 'none',
          }}>{icon}</span>
        )}
        <input
          {...props}
          style={{
            width: '100%', padding: icon ? '10px 12px 10px 40px' : '10px 14px',
            background: 'var(--bg)', border: `1px solid ${error ? 'var(--danger)' : 'var(--border)'}`,
            borderRadius: 'var(--radius-md)', fontSize: 14, color: 'var(--text)',
            outline: 'none', transition: 'border-color 0.15s',
            ...style,
          }}
          onFocus={(e) => { e.target.style.borderColor = 'var(--primary)'; props.onFocus?.(e) }}
          onBlur={(e) => { e.target.style.borderColor = error ? 'var(--danger)' : 'var(--border)'; props.onBlur?.(e) }}
        />
      </div>
      {error && <span style={{ fontSize: 12, color: 'var(--danger)' }}>{error}</span>}
    </div>
  )
}

/* ─── Textarea ─── */
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
}
export function Textarea({ label, style, ...props }: TextareaProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-soft)' }}>{label}</label>}
      <textarea
        {...props}
        style={{
          width: '100%', padding: '10px 14px',
          background: 'var(--bg)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)', fontSize: 14, color: 'var(--text)',
          outline: 'none', resize: 'vertical', minHeight: 88,
          fontFamily: 'inherit',
          ...style,
        }}
      />
    </div>
  )
}

/* ─── Select ─── */
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: { value: string; label: string }[]
}
export function Select({ label, options, style, ...props }: SelectProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-soft)' }}>{label}</label>}
      <select
        {...props}
        style={{
          width: '100%', padding: '10px 14px',
          background: 'var(--bg)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)', fontSize: 14, color: 'var(--text)',
          outline: 'none', cursor: 'pointer',
          ...style,
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
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {options.map((o) => {
        const active = value === o.value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            style={{
              padding: '7px 16px', borderRadius: 'var(--radius-pill)', fontWeight: 600, fontSize: 13,
              border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
              background: active ? 'var(--primary)' : 'var(--surface)',
              color: active ? 'white' : 'var(--text-soft)',
              cursor: 'pointer', transition: 'all 0.15s',
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
  const tint = type === 'danger' ? { bg: 'var(--danger-soft)', fg: 'var(--danger)' } : { bg: 'var(--success-soft)', fg: 'var(--success)' }
  return (
    <div style={{
      padding: '10px 14px', borderRadius: 'var(--radius-md)',
      background: tint.bg, color: tint.fg,
      fontSize: 13, fontWeight: 600,
    }}>{message}</div>
  )
}
