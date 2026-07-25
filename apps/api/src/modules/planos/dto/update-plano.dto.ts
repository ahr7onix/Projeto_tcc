import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { RefeicaoPlanoDto } from './create-plano.dto';

export class UpdatePlanoDto {
  @IsOptional()
  @IsDateString({}, { message: 'dataInicio deve ser uma data válida' })
  dataInicio?: string;

  @IsOptional()
  @IsDateString({}, { message: 'dataFim deve ser uma data válida' })
  dataFim?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'informe ao menos uma refeição' })
  @ValidateNested({ each: true })
  @Type(() => RefeicaoPlanoDto)
  refeicoes?: RefeicaoPlanoDto[];
}
