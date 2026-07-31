import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsNumber,
  IsNumberString,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

const HORA_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export const FORMULAS_PLANO = [
  'mifflin_st_jeor',
  'harris_benedict',
  'manual',
] as const;

/**
 * Item estruturado da refeição. Ou aponta para a tabela de alimentos
 * (`alimentoId`), e aí o sistema sabe somar calorias e macronutrientes, ou é
 * texto livre (`descricao`), para o que não está na tabela.
 */
export class ItemRefeicaoDto {
  @IsOptional()
  @IsNumberString({}, { message: 'alimentoId inválido' })
  alimentoId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  descricao?: string;

  @IsNumber()
  @Min(0.01, { message: 'quantidadeG deve ser maior que zero' })
  quantidadeG!: number;
}

export class RefeicaoPlanoDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  nome!: string;

  @Matches(HORA_REGEX, { message: 'horario deve estar no formato HH:MM' })
  horario!: string;

  /** Descrição legível. Quando vem só a lista estruturada, é montada a partir dela. */
  @IsOptional()
  @IsString()
  @MinLength(2)
  itens?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemRefeicaoDto)
  alimentos?: ItemRefeicaoDto[];
}

export class CreatePlanoDto {

  @IsNumberString({}, { message: 'pacienteId inválido' })
  pacienteId!: string;

  @IsDateString({}, { message: 'dataInicio deve ser uma data válida' })
  dataInicio!: string;

  @IsOptional()
  @IsDateString({}, { message: 'dataFim deve ser uma data válida' })
  dataFim?: string;

  // ---- Necessidade energética e distribuição de macronutrientes ----
  // Gravados no plano porque são a conduta daquele plano, não do paciente.

  @IsOptional()
  @IsNumber()
  @Min(500, { message: 'vetKcal fora de faixa plausível' })
  @Max(9000, { message: 'vetKcal fora de faixa plausível' })
  vetKcal?: number;

  @IsOptional()
  @IsIn(FORMULAS_PLANO as unknown as string[], {
    message: `formulaVet deve ser um de: ${FORMULAS_PLANO.join(', ')}`,
  })
  formulaVet?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(2.5)
  fatorAtividade?: number;

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

  @IsArray()
  @ArrayMinSize(1, { message: 'informe ao menos uma refeição' })
  @ValidateNested({ each: true })
  @Type(() => RefeicaoPlanoDto)
  refeicoes!: RefeicaoPlanoDto[];
}
