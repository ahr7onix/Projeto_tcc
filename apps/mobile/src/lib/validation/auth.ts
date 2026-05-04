import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().min(1, 'Informe seu e-mail').email('E-mail inválido'),
  senha: z.string().min(1, 'Informe sua senha'),
});

export const cadastroSchema = z.object({
  nome: z.string().min(2, 'Nome muito curto').max(120, 'Nome muito longo'),
  email: z.string().min(1, 'Informe seu e-mail').email('E-mail inválido'),
  senha: z.string().min(8, 'A senha precisa ter pelo menos 8 caracteres'),
  role: z.enum(['paciente', 'nutricionista'], {
    required_error: 'Selecione o tipo de conta',
  }),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type CadastroFormValues = z.infer<typeof cadastroSchema>;
