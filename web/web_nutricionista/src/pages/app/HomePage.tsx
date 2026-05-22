import React from 'react'
import { PageHeader } from '../../components/ui'

export default function HomePage() {
  return (
    <div>
      <PageHeader
        eyebrow="Visão Geral"
        title="Início"
        subtitle="Bem-vindo ao painel do nutricionista."
      />
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
        <p>A página inicial está em branco por enquanto.</p>
        <p>Acesse a aba de <strong>Pacientes</strong> para gerenciar seus clientes.</p>
      </div>
    </div>
  )
}
