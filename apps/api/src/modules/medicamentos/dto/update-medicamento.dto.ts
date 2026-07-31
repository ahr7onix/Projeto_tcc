import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { HORA_REGEX } from './create-medicamento.dto';

export class UpdateMedicamentoDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  nome?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  dosagem?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  frequencia?: string;

  @IsOptional()
  @Matches(HORA_REGEX, { message: 'horarioInicial deve estar no formato HH:MM' })
  horarioInicial?: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
