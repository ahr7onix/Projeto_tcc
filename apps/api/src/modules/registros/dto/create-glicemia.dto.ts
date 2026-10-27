import { IsIn, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateGlicemiaDto {
  @IsNumber({}, { message: 'Informe a glicemia em mg/dL' })
  @Min(1, { message: 'Glicemia deve ser de no mínimo 1 mg/dL' })
  @Max(999, { message: 'Glicemia deve ser de no máximo 999 mg/dL' })
  valor!: number;

  @IsIn(['jejum', 'pre', 'pos', 'pre_prandial', 'pos_prandial', 'antes_dormir', 'madrugada', 'aleatorio'], {
    message: 'Momento inválido (use jejum, pre, pos, pre_prandial, pos_prandial, antes_dormir, madrugada ou aleatorio)',
  })
  momento!: string;

  @IsOptional()
  @IsString()
  observacao?: string;
}
