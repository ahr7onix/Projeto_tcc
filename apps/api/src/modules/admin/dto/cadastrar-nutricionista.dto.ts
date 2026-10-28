import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Cadastro feito pelo administrador. A conta já nasce aprovada — quem
 * cadastra é quem aprovaria — e sem senha: o nutricionista cria a sua pelo
 * link que chega no e-mail.
 */
export class CadastrarNutricionistaDto {
  @IsString()
  @MinLength(2, { message: 'Nome muito curto' })
  @MaxLength(120, { message: 'Nome muito longo' })
  nome!: string;

  @IsEmail({}, { message: 'E-mail inválido' })
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'CRN muito longo' })
  crn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  especialidade?: string;
}
