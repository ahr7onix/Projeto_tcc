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
import { TIPOS_LEMBRETE } from './create-lembrete.dto';

const HORA_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export class UpdateLembreteDto {
  // O app manda o formulário inteiro ao editar, com tipo e remédio. Sem estes
  // dois campos o ValidationPipe recusava o pedido e nenhuma edição salvava.
  @IsOptional()
  @IsIn(TIPOS_LEMBRETE as unknown as string[], {
    message: `tipo deve ser um de: ${TIPOS_LEMBRETE.join(', ')}`,
  })
  tipo?: string;

  @IsOptional()
  @IsNumberString()
  medicamentoId?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  titulo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  descricao?: string;

  @IsOptional()
  @IsBoolean()
  recorrente?: boolean;

  @IsOptional()
  @Matches(HORA_REGEX, { message: 'hora deve estar no formato HH:MM' })
  hora?: string;

  @IsOptional()
  @IsDateString()
  dataHora?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(7)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  diasSemana?: number[];

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;

  @IsOptional()
  @IsBoolean()
  concluido?: boolean;
}
