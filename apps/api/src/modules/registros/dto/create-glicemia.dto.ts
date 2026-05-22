import { IsIn, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateGlicemiaDto {
  @IsNumber()
  @Min(1)
  @Max(999)
  valor!: number;

  @IsIn(['jejum', 'pre', 'pos', 'pre_prandial', 'pos_prandial', 'antes_dormir', 'madrugada', 'aleatorio'])
  momento!: string;

  @IsOptional()
  @IsString()
  observacao?: string;
}
