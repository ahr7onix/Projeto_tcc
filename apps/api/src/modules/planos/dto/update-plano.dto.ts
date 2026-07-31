import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { FORMULAS_PLANO, RefeicaoPlanoDto } from './create-plano.dto';

export class UpdatePlanoDto {
  @IsOptional()
  @IsDateString({}, { message: 'dataInicio deve ser uma data válida' })
  dataInicio?: string;

  @IsOptional()
  @IsDateString({}, { message: 'dataFim deve ser uma data válida' })
  dataFim?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(500, { message: 'vetKcal fora de faixa plausível' })
  @Max(9000, { message: 'vetKcal fora de faixa plausível' })
  vetKcal?: number | null;

  @IsOptional()
  @IsIn(FORMULAS_PLANO as unknown as string[], {
    message: `formulaVet deve ser um de: ${FORMULAS_PLANO.join(', ')}`,
  })
  formulaVet?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(2.5)
  fatorAtividade?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  percCarboidratos?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  percProteinas?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  percLipidios?: number;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  observacoes?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'informe ao menos uma refeição' })
  @ValidateNested({ each: true })
  @Type(() => RefeicaoPlanoDto)
  refeicoes?: RefeicaoPlanoDto[];
}
