import { IsBoolean, IsOptional } from 'class-validator';

export class DigitandoDto {
  /** `true` ao começar a escrever, `false` ao parar ou enviar. */
  @IsOptional()
  @IsBoolean()
  digitando?: boolean;
}
