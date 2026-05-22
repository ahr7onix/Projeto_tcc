import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateRefeicaoDto {
  @IsString()
  descricao!: string;

  @IsString()
  tipo_refeicao!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  carboidratos?: number;

  @IsOptional()
  @IsString()
  observacao?: string;
}
