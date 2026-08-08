import { IsString, MinLength } from 'class-validator';

export class RedefinirSenhaDto {
  @IsString()
  @MinLength(20, { message: 'Token inválido' })
  token!: string;

  @IsString()
  @MinLength(8, { message: 'A senha deve ter pelo menos 8 caracteres' })
  novaSenha!: string;
}
