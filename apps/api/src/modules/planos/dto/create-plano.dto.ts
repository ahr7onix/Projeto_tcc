import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNumberString,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

const HORA_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export class RefeicaoPlanoDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  nome!: string;

  @Matches(HORA_REGEX, { message: 'horario deve estar no formato HH:MM' })
  horario!: string;

  @IsString()
  @MinLength(2)
  itens!: string;
}

export class CreatePlanoDto {

  @IsNumberString({}, { message: 'pacienteId inválido' })
  pacienteId!: string;

  @IsDateString({}, { message: 'dataInicio deve ser uma data válida' })
  dataInicio!: string;

  @IsOptional()
  @IsDateString({}, { message: 'dataFim deve ser uma data válida' })
  dataFim?: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'informe ao menos uma refeição' })
  @ValidateNested({ each: true })
  @Type(() => RefeicaoPlanoDto)
  refeicoes!: RefeicaoPlanoDto[];
}
