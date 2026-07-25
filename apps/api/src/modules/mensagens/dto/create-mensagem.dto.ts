import { IsNumberString, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateMensagemDto {
  @IsNumberString({}, { message: 'destinatarioId inválido' })
  destinatarioId!: string;

  @IsString()
  @MinLength(1, { message: 'A mensagem não pode ser vazia' })
  @MaxLength(2000, { message: 'A mensagem excede o limite de 2000 caracteres' })
  conteudo!: string;
}
