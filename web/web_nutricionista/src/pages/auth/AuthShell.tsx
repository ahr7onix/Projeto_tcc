import React from 'react'

interface AuthShellProps {
  children: React.ReactNode
  title: string
  subtitle?: string
}

export default function AuthShell({ children, title, subtitle }: AuthShellProps) {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #F3EEFF 0%, #FAFAFB 60%, #E7F8F2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12,
            background: 'var(--primary)', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)', letterSpacing: '-0.2px' }}>NutriCare</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>Painel Profissional</div>
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: 'white', borderRadius: 20,
          padding: '28px 28px', border: '1px solid var(--border)',
          boxShadow: '0 4px 24px rgba(11,11,23,0.06)',
        }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 6, letterSpacing: '-0.4px' }}>{title}</h1>
          {subtitle && <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.5 }}>{subtitle}</p>}
          {children}
        </div>
      </div>
    </div>
  )
}
