import { IsNumberString } from 'class-validator';

export class VincularPacienteDto {
  @IsNumberString({}, { message: 'pacienteId inválido' })
  pacienteId!: string;
}
