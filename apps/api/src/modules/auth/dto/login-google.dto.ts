import { IsIn, IsOptional, IsString } from 'class-validator';

// O token do Google chega com nomes diferentes conforme a origem:
// o app mobile manda `idToken`, o botão da web manda `credential`.
export class LoginGoogleDto {
  @IsOptional()
  @IsString()
  idToken?: string;

  @IsOptional()
  @IsString()
  credential?: string;

  /**
   * Só vale na 1ª criação da conta. Web manda `nutricionista`;
   * mobile manda `paciente` (padrão). Conta já existente mantém o tipo.
   */
  @IsOptional()
  @IsIn(['paciente', 'nutricionista'])
  perfilCadastro?: 'paciente' | 'nutricionista';
}
