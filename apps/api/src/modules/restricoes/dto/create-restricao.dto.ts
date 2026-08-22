import { IsNumberString, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateRestricaoDto {
  /** Só o nutricionista informa: o paciente sempre cadastra para si. */
  @IsOptional()
  @IsNumberString()
  pacienteId?: string;

  @IsString()
  @MinLength(2, { message: 'Informe a restrição alimentar' })
  @MaxLength(160)
  descricao!: string;
}
