import {
  IsNumber,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateRefeicaoDto {
  /**
   * Opcional porque quem escolhe um alimento da tabela não precisa escrever
   * nada: a descrição sai do nome do alimento. O serviço recusa o registro que
   * chega sem descrição e sem alimento.
   */
  @IsOptional()
  @IsString()
  @MaxLength(300)
  descricao?: string;

  @IsString()
  tipo_refeicao!: string;

  /** Alimento da tabela nutricional, quando o paciente escolhe um. */
  @IsOptional()
  @IsNumberString()
  alimentoId?: string;

  /** Quantidade consumida, obrigatória junto com `alimentoId`. */
  @IsOptional()
  @IsNumber()
  @Min(0.1, { message: 'A quantidade deve ser maior que zero' })
  quantidadeG?: number;

  /**
   * Carboidratos informados de cabeça, para quem registra por texto livre.
   * Com um alimento escolhido este campo é ignorado: vale a conta da tabela.
   */
  @IsOptional()
  @IsNumber()
  @Min(0)
  carboidratos?: number;

  @IsOptional()
  @IsString()
  observacao?: string;
}
