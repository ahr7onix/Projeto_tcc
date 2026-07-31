import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateReceitaDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  titulo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  resumo?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  ingredientes?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  modoPreparo?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  porcoes?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  tempoPreparoMin?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  kcalPorcao?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  carboidratosPorcao?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  proteinasPorcao?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  lipidiosPorcao?: number;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  categoria?: string;

  @IsOptional()
  @IsBoolean()
  publicado?: boolean;
}
