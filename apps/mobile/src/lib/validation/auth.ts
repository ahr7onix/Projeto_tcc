import { z } from 'zod';

const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Informe seu e-mail')
  .email('E-mail inválido');

export const loginSchema = z.object({
  email: emailField,
  senha: z.string().min(1, 'Informe sua senha'),
});

export const esqueciSenhaSchema = z.object({
  email: emailField,
});

export const cadastroSchema = z.object({
  nome: z
    .string()
    .trim()
    .transform((value) => value.replace(/\s+/g, ' '))
    .pipe(
      z
        .string()
        .min(2, 'Nome muito curto')
        .max(120, 'Nome muito longo'),
    ),
  email: emailField,
  role: z.enum(['paciente', 'nutricionista'], {
    required_error: 'Selecione o tipo de conta',
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

const dataNascimentoField = z
  .string()
  .trim()
  .regex(/^\d{2}\/\d{2}\/\d{4}$/, 'Use o formato DD/MM/AAAA')
  .refine((value) => {
    const [d, m, y] = value.split('/').map(Number);
    const date = new Date(y, m - 1, d);
    return (
      date.getFullYear() === y &&
      date.getMonth() === m - 1 &&
      date.getDate() === d &&
      y >= 1900 &&
      date < new Date()
    );
  }, 'Data inválida');

const decimalField = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .min(1, `Informe ${label}`)
    .transform((value) => Number(value.replace(',', '.')))
    .pipe(
      z
        .number({ invalid_type_error: `Informe ${label} válido` })
        .min(min, `${label} muito baixo`)
        .max(max, `${label} muito alto`),
    );

export const onboardingPacienteSchema = z.object({
  dataNascimento: dataNascimentoField,
  sexo: z.enum(['feminino', 'masculino', 'outro'], {
    required_error: 'Selecione uma opção',
  }),
  tipoDiabetes: z.enum(['tipo1', 'tipo2', 'gestacional', 'pre', 'outro'], {
    required_error: 'Selecione uma opção',
  }),
  peso: decimalField('o peso', 20, 400),
  altura: decimalField('a altura', 0.5, 2.5),
  restricoesAlergias: z.string().trim().max(500).optional(),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type CadastroFormValues = z.infer<typeof cadastroSchema>;
export type EsqueciSenhaFormValues = z.infer<typeof esqueciSenhaSchema>;
export type OnboardingPacienteValues = z.input<typeof onboardingPacienteSchema>;
export type OnboardingPacienteOutput = z.output<typeof onboardingPacienteSchema>;
