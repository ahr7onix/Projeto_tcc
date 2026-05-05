import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().min(1, 'Informe seu e-mail').email('E-mail inválido'),
  senha: z.string().min(1, 'Informe sua senha'),
});

const dataBrRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;

const dataNascimentoField = z
  .string()
  .min(1, 'Informe sua data de nascimento')
  .regex(dataBrRegex, 'Use o formato DD/MM/AAAA')
  .refine((value) => {
    const match = value.match(dataBrRegex);
    if (!match) return false;
    const [, dd, mm, yyyy] = match;
    const dia = Number(dd);
    const mes = Number(mm);
    const ano = Number(yyyy);
    const date = new Date(ano, mes - 1, dia);
    if (
      date.getFullYear() !== ano ||
      date.getMonth() !== mes - 1 ||
      date.getDate() !== dia
    ) {
      return false;
    }
    const hoje = new Date();
    const idade = hoje.getFullYear() - ano - (hoje < new Date(hoje.getFullYear(), mes - 1, dia) ? 1 : 0);
    return idade >= 13 && idade <= 120;
  }, 'Data inválida — você precisa ter pelo menos 13 anos');

export const cadastroSchema = z.object({
  nome: z.string().min(2, 'Nome muito curto').max(120, 'Nome muito longo'),
  email: z.string().min(1, 'Informe seu e-mail').email('E-mail inválido'),
  dataNascimento: dataNascimentoField,
  sexo: z.enum(['feminino', 'masculino', 'outro'], {
    required_error: 'Selecione uma opção',
  }),
  tipoDiabetes: z.enum(['tipo1', 'tipo2', 'gestacional', 'pre', 'outro'], {
    required_error: 'Selecione o tipo de diabetes',
  }),
  senha: z
    .string()
    .min(8, 'Use pelo menos 8 caracteres')
    .regex(/[a-zA-Z]/, 'Inclua ao menos uma letra')
    .regex(/[0-9]/, 'Inclua ao menos um número'),
  aceiteTermos: z.literal(true, {
    errorMap: () => ({ message: 'Você precisa aceitar os termos para continuar' }),
  }),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type CadastroFormValues = z.infer<typeof cadastroSchema>;
