import {
  IsNumberString,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export const HORA_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreateMedicamentoDto {
  /** Só o nutricionista informa: o paciente sempre cadastra para si. */
  @IsOptional()
  @IsNumberString()
  pacienteId?: string;

  @IsString()
  @MinLength(2, { message: 'Informe o nome do medicamento' })
  @MaxLength(160)
  nome!: string;

  /** Texto livre porque a unidade varia: "10 UI", "500 mg", "1 comprimido". */
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  dosagem!: string;

  /** Texto livre: "8 em 8h", "1x ao dia", "antes das refeições". */
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  frequencia!: string;

  @Matches(HORA_REGEX, { message: 'horarioInicial deve estar no formato HH:MM' })
  horarioInicial!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observacoes?: string;
}
