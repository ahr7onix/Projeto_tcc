import { useQuery } from '@tanstack/react-query';
import { getPacienteData } from '@/lib/api/perfil';

const IDADE_MINIMA_MODO_SIMPLIFICADO = 55;

function calcularIdade(dataNascimento: string): number {
  const nascimento = new Date(dataNascimento);
  const hoje = new Date();
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const aindaNaoFezAniversario =
    hoje.getMonth() < nascimento.getMonth() ||
    (hoje.getMonth() === nascimento.getMonth() && hoje.getDate() < nascimento.getDate());
  if (aindaNaoFezAniversario) idade -= 1;
  return idade;
}

/**
 * Modo simplificado (texto/botões maiores, menos informação por tela) para
 * pacientes com 55 anos ou mais, calculado a partir da data de nascimento
 * cadastrada no perfil — sem exigir nenhuma configuração manual.
 */
export function useAccessibleMode() {
  const { data } = useQuery({
    queryKey: ['perfil-paciente', 'accessible-mode'],
    queryFn: getPacienteData,
    staleTime: 5 * 60 * 1000,
  });

  const dataNascimento: string | null = data?.dataNascimento ?? null;
  const idade = dataNascimento ? calcularIdade(dataNascimento) : null;
  const isSimplified = idade != null && idade >= IDADE_MINIMA_MODO_SIMPLIFICADO;

  return {
    idade,
    isSimplified,
    scale: isSimplified ? 1.25 : 1,
  };
}
