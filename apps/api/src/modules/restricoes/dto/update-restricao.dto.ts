import { IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateRestricaoDto {
  @IsString()
  @MinLength(2, { message: 'Informe a restrição alimentar' })
  @MaxLength(160)
  descricao!: string;
}
