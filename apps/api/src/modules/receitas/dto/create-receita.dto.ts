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

export class CreateReceitaDto {
  @IsString()
  @MinLength(3, { message: 'Informe o título da receita' })
  @MaxLength(160)
  titulo!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  resumo?: string;

  /** Texto livre, uma linha por ingrediente — é assim que a nutricionista escreve. */
  @IsString()
  @MinLength(3, { message: 'Informe os ingredientes' })
  ingredientes!: string;

  @IsString()
  @MinLength(3, { message: 'Informe o modo de preparo' })
  modoPreparo!: string;

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

  /** Enquanto falso, só o autor e o administrador veem. */
  @IsOptional()
  @IsBoolean()
  publicado?: boolean;
}
