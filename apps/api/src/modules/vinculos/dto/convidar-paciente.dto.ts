import { IsEmail } from 'class-validator';

/**
 * O nutricionista convida pelo e-mail exato do paciente. Antes ele escolhia
 * numa lista de todos os pacientes do sistema, o que mostrava nome e e-mail de
 * quem nunca tinha autorizado nada.
 */
export class ConvidarPacienteDto {
  @IsEmail({}, { message: 'Informe um e-mail válido' })
  email!: string;
}
