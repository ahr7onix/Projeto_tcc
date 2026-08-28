import { IsIn, IsNumberString, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export const TIPOS_ANOTACAO = [
  'limitacao',
  'restricao',
  'observacao',
  'recomendacao',
  'complementar',
] as const;

export class CreateAnotacaoDto {
  @IsOptional()
  @IsNumberString()
  pacienteId?: string;

  @IsIn(TIPOS_ANOTACAO)
  tipo!: string;

  @IsString()
  @MinLength(2, { message: 'Informe o conteúdo da anotação' })
  @MaxLength(2000)
  texto!: string;
}
