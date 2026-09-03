import { IsBoolean, IsIn, IsISO8601, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateConteudoDto {
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
  @MinLength(10)
  conteudo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  categoria?: string;

  @IsOptional()
  @IsBoolean()
  publicado?: boolean;

  @IsOptional()
  @IsIn(['todos', 'pacientes_diabetes', 'adultos'])
  publico?: string;

  // Aceitam `null` para limpar o valor. `@IsOptional` já deixa passar null e
  // undefined sem validar, e o serviço distingue os dois: ausente mantém o que
  // está gravado, null apaga.
  @IsOptional()
  @IsISO8601()
  agendadoEm?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  imagemCapa?: string | null;
}
