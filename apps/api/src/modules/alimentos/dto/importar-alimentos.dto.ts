import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsObject,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Teto por requisição. O painel manda a planilha em lotes menores que isso:
 * o limite de corpo do Express é 100 kB, e a TACO inteira (597 alimentos)
 * passaria dele num envio só.
 */
export const MAX_ITENS_IMPORTACAO = 500;

export class ImportarAlimentosDto {
  @IsString()
  @MinLength(2, { message: 'Informe a fonte da tabela (ex: TACO 4ª edição)' })
  @MaxLength(80)
  fonte!: string;

  /**
   * Cada item é validado no service, linha a linha, com as regras do cadastro
   * manual. Validar aqui com @ValidateNested recusaria a planilha inteira por
   * causa de uma linha só.
   */
  @IsArray()
  @ArrayMinSize(1, { message: 'A planilha não tem nenhum alimento' })
  @ArrayMaxSize(MAX_ITENS_IMPORTACAO, {
    message: `Envie no máximo ${MAX_ITENS_IMPORTACAO} alimentos por vez`,
  })
  @IsObject({ each: true })
  itens!: Record<string, unknown>[];
}
