import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../../database/database.module';
import type { JwtPayload } from '../../common/guards/jwt.guard';
import { VinculosService } from '../vinculos/vinculos.service';
import {
  DISTRIBUICAO_PADRAO,
  FATORES_ATIVIDADE,
  ROTULOS_ATIVIDADE,
  calcularIdade,
  calcularMacros,
  calcularVet,
} from '../../common/nutricao/nutricao';
import type {
  FormulaVet,
  NivelAtividade,
  SexoReferencia,
} from '../../common/nutricao/nutricao';
import { CalcularVetDto } from './dto/calcular-vet.dto';

@Injectable()
export class NutricionalService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly vinculos: VinculosService,
  ) {}

  /** Tabela de referência que a tela usa para montar o seletor de atividade. */
  referencias() {
    return {
      niveisAtividade: (Object.keys(FATORES_ATIVIDADE) as NivelAtividade[]).map(
        (nivel) => ({
          valor: nivel,
          fator: FATORES_ATIVIDADE[nivel],
          rotulo: ROTULOS_ATIVIDADE[nivel],
        }),
      ),
      formulas: [
        { valor: 'mifflin_st_jeor', rotulo: 'Mifflin-St Jeor (recomendada)' },
        { valor: 'harris_benedict', rotulo: 'Harris-Benedict revisada' },
      ],
      distribuicaoPadrao: DISTRIBUICAO_PADRAO,
      observacao:
        'Os valores são sugestão de ponto de partida. A prescrição é do nutricionista.',
    };
  }

  private async dadosDoPaciente(idPaciente: string) {
    const { rows } = await this.pool.query(
      `SELECT p.peso, p.altura, p.data_nascimento, p.genero, p.nivel_atividade,
              u.nome
         FROM paciente p
         JOIN usuario u ON u.id_usuario = p.id_usuario
        WHERE p.id_paciente = $1`,
      [idPaciente],
    );
    if (!rows.length) throw new NotFoundException('Paciente não encontrado');
    return rows[0];
  }

  /**
   * Monta o cálculo a partir do cadastro do paciente, deixando o que vier no
   * corpo sobrescrever cada campo. Assim a mesma rota serve para o valor "real"
   * do paciente e para simulação.
   */
  async calcular(user: JwtPayload, dto: CalcularVetDto) {
    const { idPaciente } = await this.vinculos.resolverPacienteAlvo(
      user,
      dto.pacienteId,
    );
    const cadastro = await this.dadosDoPaciente(idPaciente);

    const faltando: string[] = [];

    const peso = dto.peso ?? (cadastro.peso !== null ? Number(cadastro.peso) : null);
    if (!peso) faltando.push('peso');

    const altura =
      dto.altura ?? (cadastro.altura !== null ? Number(cadastro.altura) : null);
    if (!altura) faltando.push('altura');

    const idade =
      dto.idade ??
      (cadastro.data_nascimento ? calcularIdade(cadastro.data_nascimento) : null);
    if (!idade) faltando.push('data de nascimento');

    // As fórmulas de TMB usam sexo como referência biológica e só têm as duas
    // variantes. Quem declarou "outro" precisa informar qual referência usar —
    // o sistema não escolhe por conta própria.
    const generoCadastro =
      cadastro.genero === 'feminino' || cadastro.genero === 'masculino'
        ? (cadastro.genero as SexoReferencia)
        : null;
    const sexo = dto.sexo ?? generoCadastro;
    if (!sexo) faltando.push('sexo de referência (informe no cálculo)');

    if (faltando.length) {
      throw new BadRequestException(
        `Não é possível calcular: falta ${faltando.join(', ')}. Complete o cadastro do paciente ou informe no cálculo.`,
      );
    }

    const nivelAtividade = (dto.nivelAtividade ??
      cadastro.nivel_atividade ??
      'sedentario') as NivelAtividade;

    const resultadoVet = calcularVet({
      peso: peso as number,
      altura: altura as number,
      idade: idade as number,
      sexo: sexo as SexoReferencia,
      nivelAtividade,
      formula: dto.formula as FormulaVet | undefined,
    });

    // Percentuais: ou vêm os três, ou nenhum. Aceitar um só levaria a uma
    // distribuição que não soma 100 sem o usuário perceber.
    const informados = [dto.percCarboidratos, dto.percProteinas, dto.percLipidios];
    const quantosInformados = informados.filter((v) => v !== undefined).length;
    if (quantosInformados > 0 && quantosInformados < 3) {
      throw new BadRequestException(
        'Informe os três percentuais (carboidratos, proteínas e lipídios) ou nenhum',
      );
    }

    const distribuicao =
      quantosInformados === 3
        ? {
            carboidratos: dto.percCarboidratos as number,
            proteinas: dto.percProteinas as number,
            lipidios: dto.percLipidios as number,
          }
        : { ...DISTRIBUICAO_PADRAO };

    let macros;
    try {
      macros = calcularMacros(resultadoVet.vet, distribuicao);
    } catch (erro) {
      // calcularMacros joga Error puro (é função pura, sem Nest).
      throw new BadRequestException((erro as Error).message);
    }

    return {
      paciente: { id: idPaciente, nome: cadastro.nome },
      dadosUsados: {
        peso,
        altura,
        idade,
        sexo,
        nivelAtividade,
        rotuloAtividade: ROTULOS_ATIVIDADE[nivelAtividade],
        origem: dto.peso || dto.altura || dto.idade ? 'simulacao' : 'cadastro',
      },
      ...resultadoVet,
      macros,
      observacao:
        'Valor sugerido pelo cálculo. A conduta final é definida pelo nutricionista.',
    };
  }
}
