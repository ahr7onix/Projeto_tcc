import {
  IsDateString,
  IsIn,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const ESTADOS_EMOCIONAIS = [
  'muito_bem',
  'bem',
  'neutro',
  'mal',
  'muito_mal',
] as const;

export class CreateEmocionalDto {
  @IsOptional()
  @IsNumberString()
  pacienteId?: string;

  @IsIn(ESTADOS_EMOCIONAIS as unknown as string[], {
    message: `estado deve ser um de: ${ESTADOS_EMOCIONAIS.join(', ')}`,
  })
  estado!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5, { message: 'intensidade deve estar entre 1 e 5' })
  intensidade?: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  fatores?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observacao?: string;

  @IsOptional()
  @IsDateString({}, { message: 'dataHora deve ser uma data válida' })
  dataHora?: string;
}
