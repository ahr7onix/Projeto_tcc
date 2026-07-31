import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export const TIPOS_LEMBRETE = ['refeicao', 'glicemia', 'medicamento', 'outro'] as const;

const HORA_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreateLembreteDto {
  @IsOptional()
  @IsNumberString()
  pacienteId?: string;

  @IsIn(TIPOS_LEMBRETE as unknown as string[], {
    message: `tipo deve ser um de: ${TIPOS_LEMBRETE.join(', ')}`,
  })
  tipo!: string;

  @IsString()
  @MinLength(2, { message: 'Título muito curto' })
  @MaxLength(120)
  titulo!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  descricao?: string;

  @IsOptional()
  @IsBoolean()
  recorrente?: boolean;

  /** Obrigatória quando o lembrete é recorrente. */
  @IsOptional()
  @Matches(HORA_REGEX, { message: 'hora deve estar no formato HH:MM' })
  hora?: string;

  /** Obrigatória quando o lembrete é avulso. */
  @IsOptional()
  @IsDateString({}, { message: 'dataHora deve ser uma data válida' })
  dataHora?: string;

  /** 0 = domingo ... 6 = sábado. Vazio num recorrente significa todos os dias. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(7)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true, message: 'diasSemana aceita valores de 0 (domingo) a 6 (sábado)' })
  diasSemana?: number[];

  @IsOptional()
  @IsNumberString()
  medicamentoId?: string;
}
