import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  Max,
  MinLength,
} from 'class-validator';

export class CreateAlimentoDto {
  @IsString()
  @MinLength(2, { message: 'Nome do alimento muito curto' })
  @MaxLength(160)
  nome!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  grupo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  medidaCaseira?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.01, { message: 'A medida caseira deve ter peso maior que zero' })
  medidaCaseiraG?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.01, { message: 'A porção de referência deve ser maior que zero' })
  porcaoG?: number;

  @IsNumber()
  @Min(0)
  kcal!: number;

  @IsNumber()
  @Min(0)
  carboidratosG!: number;

  @IsNumber()
  @Min(0)
  proteinasG!: number;

  @IsNumber()
  @Min(0)
  lipidiosG!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fibrasG?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(150, { message: 'Índice glicêmico deve estar entre 0 e 150' })
  indiceGlicemico?: number;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  fonte?: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
