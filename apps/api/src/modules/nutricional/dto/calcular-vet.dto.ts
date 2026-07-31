import {
  IsIn,
  IsInt,
  IsNumber,
  IsNumberString,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { FATORES_ATIVIDADE } from '../../../common/nutricao/nutricao';

export const FORMULAS_VET = ['mifflin_st_jeor', 'harris_benedict'] as const;
export const NIVEIS_ATIVIDADE = Object.keys(FATORES_ATIVIDADE);

/**
 * Todos os campos são opcionais: o que não vier é lido do cadastro do paciente.
 * Serve para a nutricionista simular ("e se ele passar a treinar 5x por
 * semana?") sem alterar o cadastro.
 */
export class CalcularVetDto {
  @IsOptional()
  @IsNumberString()
  pacienteId?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(399)
  peso?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.51, { message: 'Altura deve estar em metros (ex: 1.70)' })
  @Max(2.59, { message: 'Altura deve estar em metros (ex: 1.70)' })
  altura?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(120)
  idade?: number;

  @IsOptional()
  @IsIn(['feminino', 'masculino'], {
    message: 'sexo aceita feminino ou masculino (referência das fórmulas)',
  })
  sexo?: 'feminino' | 'masculino';

  @IsOptional()
  @IsIn(NIVEIS_ATIVIDADE, {
    message: `nivelAtividade deve ser um de: ${NIVEIS_ATIVIDADE.join(', ')}`,
  })
  nivelAtividade?: string;

  @IsOptional()
  @IsIn(FORMULAS_VET as unknown as string[], {
    message: `formula deve ser um de: ${FORMULAS_VET.join(', ')}`,
  })
  formula?: string;

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
}
