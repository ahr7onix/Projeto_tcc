import { IsBoolean, IsIn, IsISO8601, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateConteudoDto {
  @IsString()
  @MinLength(3, { message: 'Título muito curto' })
  @MaxLength(160)
  titulo!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  resumo?: string;

  @IsString()
  @MinLength(10, { message: 'O conteúdo precisa ter ao menos 10 caracteres' })
  conteudo!: string;

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

  @IsOptional()
  @IsISO8601()
  agendadoEm?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  imagemCapa?: string;
}
