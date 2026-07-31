/**
 * Cálculos nutricionais usados pelo plano alimentar e pela antropometria.
 *
 * As fórmulas abaixo são as de uso corrente na literatura e estão aqui em
 * funções puras justamente para poderem ser testadas e conferidas pela equipe
 * de Nutrição sem precisar subir o sistema.
 *
 * ATENÇÃO: nenhum valor calculado aqui substitui avaliação profissional. O
 * sistema apresenta o resultado como sugestão; a prescrição é do nutricionista.
 */

export type SexoReferencia = 'feminino' | 'masculino';

export type FormulaVet = 'mifflin_st_jeor' | 'harris_benedict';

export type NivelAtividade =
  | 'sedentario'
  | 'leve'
  | 'moderado'
  | 'intenso'
  | 'muito_intenso';

/**
 * Fatores de atividade física (múltiplos da taxa metabólica basal).
 * Referência clássica de Harris-Benedict, também usada com Mifflin-St Jeor.
 */
export const FATORES_ATIVIDADE: Record<NivelAtividade, number> = {
  sedentario: 1.2,
  leve: 1.375,
  moderado: 1.55,
  intenso: 1.725,
  muito_intenso: 1.9,
};

export const ROTULOS_ATIVIDADE: Record<NivelAtividade, string> = {
  sedentario: 'Sedentário (sem exercício regular)',
  leve: 'Leve (1 a 3 dias por semana)',
  moderado: 'Moderado (3 a 5 dias por semana)',
  intenso: 'Intenso (6 a 7 dias por semana)',
  muito_intenso: 'Muito intenso (treino pesado ou trabalho físico)',
};

/** Calorias por grama de cada macronutriente (fatores de Atwater). */
export const KCAL_POR_GRAMA = {
  carboidratos: 4,
  proteinas: 4,
  lipidios: 9,
} as const;

/**
 * Distribuição padrão de macronutrientes.
 *
 * A ADA (American Diabetes Association) não fixa uma proporção única para
 * diabetes: a conduta é individualizada. Estes valores são apenas o ponto de
 * partida da tela de cálculo, dentro das faixas aceitáveis de distribuição de
 * macronutrientes, e devem ser ajustados caso a caso pelo nutricionista.
 */
export const DISTRIBUICAO_PADRAO = {
  carboidratos: 50,
  proteinas: 20,
  lipidios: 30,
} as const;

export interface DadosCalculoVet {
  sexo: SexoReferencia;
  /** anos completos */
  idade: number;
  /** kg */
  peso: number;
  /** metros — ex: 1.74 */
  altura: number;
  nivelAtividade: NivelAtividade;
  formula?: FormulaVet;
}

export interface ResultadoVet {
  formula: FormulaVet;
  tmb: number;
  fatorAtividade: number;
  vet: number;
}

export interface DistribuicaoMacros {
  carboidratos: number;
  proteinas: number;
  lipidios: number;
}

export interface MacroCalculado {
  percentual: number;
  kcal: number;
  gramas: number;
}

export interface ResultadoMacros {
  carboidratos: MacroCalculado;
  proteinas: MacroCalculado;
  lipidios: MacroCalculado;
}

const arredondar = (valor: number, casas = 1): number => {
  const fator = 10 ** casas;
  return Math.round(valor * fator) / fator;
};

/** Idade em anos completos na data de referência (padrão: hoje). */
export function calcularIdade(
  dataNascimento: string | Date,
  referencia: Date = new Date(),
): number {
  const nasc =
    dataNascimento instanceof Date ? dataNascimento : new Date(dataNascimento);
  let idade = referencia.getUTCFullYear() - nasc.getUTCFullYear();
  const mes = referencia.getUTCMonth() - nasc.getUTCMonth();
  if (mes < 0 || (mes === 0 && referencia.getUTCDate() < nasc.getUTCDate())) {
    idade -= 1;
  }
  return idade;
}

/**
 * Taxa metabólica basal por Mifflin-St Jeor (1990).
 * É a fórmula recomendada pela Academy of Nutrition and Dietetics para
 * adultos, por errar menos que Harris-Benedict em pessoas com sobrepeso.
 */
export function tmbMifflinStJeor(
  peso: number,
  alturaCm: number,
  idade: number,
  sexo: SexoReferencia,
): number {
  const base = 10 * peso + 6.25 * alturaCm - 5 * idade;
  return arredondar(sexo === 'masculino' ? base + 5 : base - 161);
}

/** Taxa metabólica basal por Harris-Benedict revisada (Roza & Shizgal, 1984). */
export function tmbHarrisBenedict(
  peso: number,
  alturaCm: number,
  idade: number,
  sexo: SexoReferencia,
): number {
  const valor =
    sexo === 'masculino'
      ? 88.362 + 13.397 * peso + 4.799 * alturaCm - 5.677 * idade
      : 447.593 + 9.247 * peso + 3.098 * alturaCm - 4.33 * idade;
  return arredondar(valor);
}

export function fatorAtividade(nivel: NivelAtividade): number {
  return FATORES_ATIVIDADE[nivel] ?? FATORES_ATIVIDADE.sedentario;
}

/**
 * Necessidade energética total: TMB multiplicada pelo fator de atividade.
 * A altura entra em metros e é convertida aqui, para o chamador não precisar
 * lembrar da unidade de cada fórmula.
 */
export function calcularVet(dados: DadosCalculoVet): ResultadoVet {
  const formula = dados.formula ?? 'mifflin_st_jeor';
  const alturaCm = dados.altura * 100;

  const tmb =
    formula === 'harris_benedict'
      ? tmbHarrisBenedict(dados.peso, alturaCm, dados.idade, dados.sexo)
      : tmbMifflinStJeor(dados.peso, alturaCm, dados.idade, dados.sexo);

  const fator = fatorAtividade(dados.nivelAtividade);

  return {
    formula,
    tmb,
    fatorAtividade: fator,
    vet: arredondar(tmb * fator),
  };
}

/**
 * Converte o VET e os percentuais em kcal e gramas de cada macronutriente.
 * Os percentuais precisam somar 100 — a mesma regra que o banco garante na
 * constraint `chk_plano_macros_100`.
 */
export function calcularMacros(
  vet: number,
  distribuicao: DistribuicaoMacros = { ...DISTRIBUICAO_PADRAO },
): ResultadoMacros {
  const soma =
    distribuicao.carboidratos + distribuicao.proteinas + distribuicao.lipidios;
  if (Math.round(soma) !== 100) {
    throw new Error(
      `Os percentuais de macronutrientes devem somar 100 (recebido ${soma})`,
    );
  }

  const calcular = (percentual: number, kcalPorGrama: number): MacroCalculado => {
    const kcal = (vet * percentual) / 100;
    return {
      percentual: arredondar(percentual),
      kcal: arredondar(kcal),
      gramas: arredondar(kcal / kcalPorGrama),
    };
  };

  return {
    carboidratos: calcular(distribuicao.carboidratos, KCAL_POR_GRAMA.carboidratos),
    proteinas: calcular(distribuicao.proteinas, KCAL_POR_GRAMA.proteinas),
    lipidios: calcular(distribuicao.lipidios, KCAL_POR_GRAMA.lipidios),
  };
}

// =====================================================================
// Antropometria
// =====================================================================

export type ClassificacaoImc =
  | 'baixo_peso'
  | 'eutrofia'
  | 'sobrepeso'
  | 'obesidade_grau_1'
  | 'obesidade_grau_2'
  | 'obesidade_grau_3';

export const ROTULOS_IMC: Record<ClassificacaoImc, string> = {
  baixo_peso: 'Baixo peso',
  eutrofia: 'Eutrofia (peso adequado)',
  sobrepeso: 'Sobrepeso',
  obesidade_grau_1: 'Obesidade grau I',
  obesidade_grau_2: 'Obesidade grau II',
  obesidade_grau_3: 'Obesidade grau III',
};

export function calcularImc(peso: number, altura: number): number {
  if (altura <= 0) throw new Error('Altura deve ser maior que zero');
  return arredondar(peso / (altura * altura), 2);
}

/**
 * Classificação do IMC pelos pontos de corte da OMS para adultos.
 * Não vale para crianças, adolescentes, gestantes nem idosos — nesses casos a
 * referência é outra e a classificação precisa ser feita pelo profissional.
 */
export function classificarImc(imc: number): ClassificacaoImc {
  if (imc < 18.5) return 'baixo_peso';
  if (imc < 25) return 'eutrofia';
  if (imc < 30) return 'sobrepeso';
  if (imc < 35) return 'obesidade_grau_1';
  if (imc < 40) return 'obesidade_grau_2';
  return 'obesidade_grau_3';
}

export type RiscoCardiometabolico = 'baixo' | 'aumentado' | 'muito_aumentado';

/** Relação cintura-quadril. Pontos de corte da OMS (2008). */
export function relacaoCinturaQuadril(cintura: number, quadril: number): number {
  if (quadril <= 0) throw new Error('Circunferência do quadril deve ser maior que zero');
  return arredondar(cintura / quadril, 2);
}

export function classificarRcq(
  rcq: number,
  sexo: SexoReferencia,
): RiscoCardiometabolico {
  const limite = sexo === 'masculino' ? 0.9 : 0.85;
  return rcq >= limite ? 'aumentado' : 'baixo';
}

/** Risco pela circunferência da cintura isolada. Pontos de corte da OMS. */
export function classificarCircunferenciaCintura(
  cintura: number,
  sexo: SexoReferencia,
): RiscoCardiometabolico {
  const [aumentado, muito] = sexo === 'masculino' ? [94, 102] : [80, 88];
  if (cintura >= muito) return 'muito_aumentado';
  if (cintura >= aumentado) return 'aumentado';
  return 'baixo';
}

/**
 * Avaliação antropométrica completa a partir do que foi medido.
 * Cada bloco só aparece quando existem os dados que ele exige, para a tela
 * nunca mostrar um resultado calculado em cima de campo vazio.
 */
export function avaliarAntropometria(medidas: {
  peso?: number | null;
  altura?: number | null;
  circCintura?: number | null;
  circQuadril?: number | null;
  sexo?: SexoReferencia | null;
}) {
  const resultado: {
    imc?: number;
    classificacaoImc?: ClassificacaoImc;
    rotuloImc?: string;
    rcq?: number;
    riscoRcq?: RiscoCardiometabolico;
    riscoCintura?: RiscoCardiometabolico;
  } = {};

  if (medidas.peso && medidas.altura) {
    const imc = calcularImc(Number(medidas.peso), Number(medidas.altura));
    const classificacao = classificarImc(imc);
    resultado.imc = imc;
    resultado.classificacaoImc = classificacao;
    resultado.rotuloImc = ROTULOS_IMC[classificacao];
  }

  if (medidas.circCintura && medidas.circQuadril) {
    resultado.rcq = relacaoCinturaQuadril(
      Number(medidas.circCintura),
      Number(medidas.circQuadril),
    );
    if (medidas.sexo) {
      resultado.riscoRcq = classificarRcq(resultado.rcq, medidas.sexo);
    }
  }

  if (medidas.circCintura && medidas.sexo) {
    resultado.riscoCintura = classificarCircunferenciaCintura(
      Number(medidas.circCintura),
      medidas.sexo,
    );
  }

  return resultado;
}

// =====================================================================
// Somatório de porções da tabela de alimentos
// =====================================================================

export interface ValoresPorcao {
  porcaoG: number;
  kcal: number;
  carboidratosG: number;
  proteinasG: number;
  lipidiosG: number;
  fibrasG?: number | null;
}

/**
 * Regra de três entre a porção de referência do alimento (normalmente 100 g)
 * e a quantidade efetivamente consumida ou prescrita.
 */
export function valoresParaQuantidade(
  alimento: ValoresPorcao,
  quantidadeG: number,
) {
  const proporcao = quantidadeG / alimento.porcaoG;
  return {
    quantidadeG: arredondar(quantidadeG),
    kcal: arredondar(alimento.kcal * proporcao),
    carboidratosG: arredondar(alimento.carboidratosG * proporcao),
    proteinasG: arredondar(alimento.proteinasG * proporcao),
    lipidiosG: arredondar(alimento.lipidiosG * proporcao),
    fibrasG:
      alimento.fibrasG === null || alimento.fibrasG === undefined
        ? null
        : arredondar(alimento.fibrasG * proporcao),
  };
}

export function somarPorcoes(
  itens: Array<{ alimento: ValoresPorcao; quantidadeG: number }>,
) {
  return itens.reduce(
    (total, item) => {
      const v = valoresParaQuantidade(item.alimento, item.quantidadeG);
      return {
        kcal: arredondar(total.kcal + v.kcal),
        carboidratosG: arredondar(total.carboidratosG + v.carboidratosG),
        proteinasG: arredondar(total.proteinasG + v.proteinasG),
        lipidiosG: arredondar(total.lipidiosG + v.lipidiosG),
        fibrasG: arredondar(total.fibrasG + (v.fibrasG ?? 0)),
      };
    },
    { kcal: 0, carboidratosG: 0, proteinasG: 0, lipidiosG: 0, fibrasG: 0 },
  );
}
