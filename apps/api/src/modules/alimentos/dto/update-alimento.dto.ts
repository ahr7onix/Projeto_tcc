import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateAlimentoDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  nome?: string;

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
  @Min(0.01)
  medidaCaseiraG?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  porcaoG?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  kcal?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  carboidratosG?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  proteinasG?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  lipidiosG?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fibrasG?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(150)
  indiceGlicemico?: number;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  fonte?: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
