import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

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

  @IsIn(['paciente', 'nutricionista'])
  role!: 'paciente' | 'nutricionista';

  @IsOptional()
  @IsString()
  dataNascimento?: string;

  @IsOptional()
  @IsIn(['feminino', 'masculino', 'outro'])
  sexo?: 'feminino' | 'masculino' | 'outro';

  @IsOptional()
  @IsIn(['tipo1', 'tipo2', 'gestacional', 'pre', 'outro'])
  tipoDiabetes?: 'tipo1' | 'tipo2' | 'gestacional' | 'pre' | 'outro';
}
