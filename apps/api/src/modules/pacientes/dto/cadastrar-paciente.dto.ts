import {
  IsEmail,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Cadastro feito pelo nutricionista, no consultório. Sem senha: o paciente
 * cria a sua pelo link que chega no e-mail. Peso e altura ficam para o
 * primeiro acesso ao aplicativo, que já pergunta.
 */
export class CadastrarPacienteDto {
  @IsString()
  @MinLength(2, { message: 'Nome muito curto' })
  @MaxLength(120, { message: 'Nome muito longo' })
  nome!: string;

  @IsEmail({}, { message: 'E-mail inválido' })
  email!: string;

  @IsOptional()
  @IsISO8601({ strict: true }, { message: 'Data de nascimento inválida' })
  dataNascimento?: string;

  @IsOptional()
  @IsIn(['feminino', 'masculino', 'outro'])
  sexo?: 'feminino' | 'masculino' | 'outro';

  @IsOptional()
  @IsIn(['tipo1', 'tipo2', 'gestacional', 'pre', 'outro'])
  tipoDiabetes?: 'tipo1' | 'tipo2' | 'gestacional' | 'pre' | 'outro';
}
