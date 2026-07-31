import {
  IsDateString,
  IsNumber,
  IsNumberString,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateAntropometriaDto {
  /** Obrigatório quando quem grava é o nutricionista. */
  @IsOptional()
  @IsNumberString()
  pacienteId?: string;

  @IsOptional()
  @IsDateString({}, { message: 'dataMedicao deve estar no formato AAAA-MM-DD' })
  dataMedicao?: string;

  @IsOptional()
  @IsNumber()
  @Min(1, { message: 'Peso fora do intervalo aceito' })
  @Max(399, { message: 'Peso fora do intervalo aceito' })
  peso?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.51, { message: 'Altura deve estar em metros (ex: 1.70)' })
  @Max(2.59, { message: 'Altura deve estar em metros (ex: 1.70)' })
  altura?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  circCintura?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  circQuadril?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  circBraco?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  circPanturrilha?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  circPescoco?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observacao?: string;
}
