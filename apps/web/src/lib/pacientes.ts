import { api } from './api'

export interface CadastroPacientePayload {
  nome: string
  email: string
  /** AAAA-MM-DD, como o campo de data do navegador devolve. */
  dataNascimento?: string
  sexo?: 'feminino' | 'masculino' | 'outro'
  tipoDiabetes?: 'tipo1' | 'tipo2' | 'gestacional' | 'pre' | 'outro'
}

export interface CadastroPacienteResultado {
  paciente: { id: string; nome: string; email: string }
  /** Falso quando o servidor não tem e-mail de verdade configurado. */
  emailEnviado: boolean
  /** Só vem fora de produção, para testar sem caixa de e-mail. */
  linkDefinirSenha?: string
}

/**
 * Cria a conta do paciente e um convite de acompanhamento. O link para criar
 * a senha vai para o e-mail do paciente, nunca para o painel: quem tem o link
 * define a senha da conta.
 */
export async function cadastrarPaciente(
  payload: CadastroPacientePayload,
): Promise<CadastroPacienteResultado> {
  const { data } = await api.post('/pacientes', payload)
  return data
}
