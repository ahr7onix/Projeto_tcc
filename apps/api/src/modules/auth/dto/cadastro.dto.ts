import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Cadastro sem `role` no corpo — o papel é definido pela rota da API
 * (`/auth/cadastro/paciente` ou `/auth/cadastro/nutricionista`), para o
 * cliente não conseguir se auto-promover.
 */
export class CadastroDto {
  @IsString()
  @MinLength(2, { message: 'Nome muito curto' })
  @MaxLength(120, { message: 'Nome muito longo' })
  nome!: string;

  @IsEmail({}, { message: 'E-mail inválido' })
  email!: string;

  @IsString()
  @MinLength(8, { message: 'Use pelo menos 8 caracteres' })
  senha!: string;

  @IsOptional()
  @IsString()
  dataNascimento?: string;

  @IsOptional()
  @IsIn(['feminino', 'masculino', 'outro'])
  sexo?: 'feminino' | 'masculino' | 'outro';

  @IsOptional()
  @IsIn(['tipo1', 'tipo2', 'gestacional', 'pre', 'outro'])
  tipoDiabetes?: 'tipo1' | 'tipo2' | 'gestacional' | 'pre' | 'outro';

  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'CRN muito longo' })
  crn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  especialidade?: string;
}
