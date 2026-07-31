import {
  DISTRIBUICAO_PADRAO,
  FATORES_ATIVIDADE,
  avaliarAntropometria,
  calcularIdade,
  calcularImc,
  calcularMacros,
  calcularVet,
  classificarCircunferenciaCintura,
  classificarImc,
  classificarRcq,
  relacaoCinturaQuadril,
  somarPorcoes,
  tmbHarrisBenedict,
  tmbMifflinStJeor,
  valoresParaQuantidade,
} from './nutricao';

describe('tmbMifflinStJeor', () => {
  it('should add 5 for men', () => {
    // 10*80 + 6.25*180 - 5*30 + 5
    expect(tmbMifflinStJeor(80, 180, 30, 'masculino')).toBe(1780);
  });

  it('should subtract 161 for women', () => {
    // 10*60 + 6.25*165 - 5*40 - 161
    expect(tmbMifflinStJeor(60, 165, 40, 'feminino')).toBeCloseTo(1270.3, 1);
  });
});

describe('tmbHarrisBenedict', () => {
  it('should apply the revised male equation', () => {
    expect(tmbHarrisBenedict(80, 180, 30, 'masculino')).toBeCloseTo(1853.6, 1);
  });

  it('should apply the revised female equation', () => {
    expect(tmbHarrisBenedict(60, 165, 40, 'feminino')).toBeCloseTo(1340.4, 1);
  });
});

describe('calcularVet', () => {
  const base = {
    sexo: 'masculino' as const,
    idade: 30,
    peso: 80,
    altura: 1.8,
  };

  it('should default to Mifflin-St Jeor', () => {
    const r = calcularVet({ ...base, nivelAtividade: 'moderado' });
    expect(r.formula).toBe('mifflin_st_jeor');
    expect(r.tmb).toBe(1780);
    expect(r.fatorAtividade).toBe(1.55);
    expect(r.vet).toBe(2759);
  });

  it('should use Harris-Benedict when asked', () => {
    const r = calcularVet({
      ...base,
      nivelAtividade: 'sedentario',
      formula: 'harris_benedict',
    });
    expect(r.formula).toBe('harris_benedict');
    expect(r.tmb).toBeCloseTo(1853.6, 1);
    expect(r.vet).toBeCloseTo(2224.3, 1);
  });

  it('should convert height from meters to centimeters', () => {
    const emMetros = calcularVet({ ...base, nivelAtividade: 'sedentario' });
    expect(emMetros.tmb).toBe(tmbMifflinStJeor(80, 180, 30, 'masculino'));
  });

  it('should grow the VET as the activity level rises', () => {
    const niveis = Object.keys(FATORES_ATIVIDADE) as Array<
      keyof typeof FATORES_ATIVIDADE
    >;
    const vets = niveis.map(
      (nivel) => calcularVet({ ...base, nivelAtividade: nivel }).vet,
    );
    const ordenado = [...vets].sort((a, b) => a - b);
    expect(vets).toEqual(ordenado);
  });
});

describe('calcularMacros', () => {
  it('should split the VET using the default distribution', () => {
    const r = calcularMacros(2000);
    expect(r.carboidratos).toEqual({ percentual: 50, kcal: 1000, gramas: 250 });
    expect(r.proteinas).toEqual({ percentual: 20, kcal: 400, gramas: 100 });
    expect(r.lipidios.kcal).toBe(600);
    expect(r.lipidios.gramas).toBeCloseTo(66.7, 1);
  });

  it('should accept a custom distribution', () => {
    const r = calcularMacros(2000, {
      carboidratos: 45,
      proteinas: 25,
      lipidios: 30,
    });
    expect(r.carboidratos.kcal).toBe(900);
    expect(r.carboidratos.gramas).toBe(225);
    expect(r.proteinas.gramas).toBe(125);
  });

  it('should reject a distribution that does not sum 100', () => {
    expect(() =>
      calcularMacros(2000, { carboidratos: 50, proteinas: 20, lipidios: 40 }),
    ).toThrow(/somar 100/);
  });

  it('should keep the default distribution consistent', () => {
    const soma =
      DISTRIBUICAO_PADRAO.carboidratos +
      DISTRIBUICAO_PADRAO.proteinas +
      DISTRIBUICAO_PADRAO.lipidios;
    expect(soma).toBe(100);
  });
});

describe('calcularIdade', () => {
  it('should not count a birthday that has not happened yet', () => {
    expect(calcularIdade('1996-07-30', new Date('2026-07-29'))).toBe(29);
  });

  it('should count the birthday on the day itself', () => {
    expect(calcularIdade('1996-07-29', new Date('2026-07-29'))).toBe(30);
  });
});

describe('calcularImc e classificarImc', () => {
  it('should compute the IMC with two decimals', () => {
    expect(calcularImc(80, 1.8)).toBe(24.69);
  });

  it('should reject a height of zero', () => {
    expect(() => calcularImc(80, 0)).toThrow(/maior que zero/);
  });

  it('should classify by the WHO cutoffs for adults', () => {
    expect(classificarImc(18.4)).toBe('baixo_peso');
    expect(classificarImc(18.5)).toBe('eutrofia');
    expect(classificarImc(24.9)).toBe('eutrofia');
    expect(classificarImc(25)).toBe('sobrepeso');
    expect(classificarImc(29.9)).toBe('sobrepeso');
    expect(classificarImc(30)).toBe('obesidade_grau_1');
    expect(classificarImc(35)).toBe('obesidade_grau_2');
    expect(classificarImc(40)).toBe('obesidade_grau_3');
  });
});

describe('relacao cintura-quadril', () => {
  it('should compute the ratio', () => {
    expect(relacaoCinturaQuadril(90, 100)).toBe(0.9);
  });

  it('should use a different cutoff for each sex', () => {
    expect(classificarRcq(0.89, 'masculino')).toBe('baixo');
    expect(classificarRcq(0.89, 'feminino')).toBe('aumentado');
    expect(classificarRcq(0.9, 'masculino')).toBe('aumentado');
  });
});

describe('classificarCircunferenciaCintura', () => {
  it('should apply the male cutoffs', () => {
    expect(classificarCircunferenciaCintura(93, 'masculino')).toBe('baixo');
    expect(classificarCircunferenciaCintura(94, 'masculino')).toBe('aumentado');
    expect(classificarCircunferenciaCintura(102, 'masculino')).toBe('muito_aumentado');
  });

  it('should apply the female cutoffs', () => {
    expect(classificarCircunferenciaCintura(79, 'feminino')).toBe('baixo');
    expect(classificarCircunferenciaCintura(80, 'feminino')).toBe('aumentado');
    expect(classificarCircunferenciaCintura(88, 'feminino')).toBe('muito_aumentado');
  });
});

describe('avaliarAntropometria', () => {
  it('should return only what the measures allow', () => {
    const r = avaliarAntropometria({ peso: 80, altura: 1.8 });
    expect(r.imc).toBe(24.69);
    expect(r.classificacaoImc).toBe('eutrofia');
    expect(r.rcq).toBeUndefined();
    expect(r.riscoCintura).toBeUndefined();
  });

  it('should skip the IMC when the weight is missing', () => {
    const r = avaliarAntropometria({ altura: 1.8, circCintura: 95, sexo: 'masculino' });
    expect(r.imc).toBeUndefined();
    expect(r.riscoCintura).toBe('aumentado');
  });

  it('should not classify the RCQ without the sex reference', () => {
    const r = avaliarAntropometria({ circCintura: 90, circQuadril: 100 });
    expect(r.rcq).toBe(0.9);
    expect(r.riscoRcq).toBeUndefined();
  });
});

describe('valoresParaQuantidade e somarPorcoes', () => {
  const arroz = {
    porcaoG: 100,
    kcal: 200,
    carboidratosG: 30,
    proteinasG: 10,
    lipidiosG: 5,
    fibrasG: 2,
  };

  it('should scale the reference portion', () => {
    expect(valoresParaQuantidade(arroz, 50)).toEqual({
      quantidadeG: 50,
      kcal: 100,
      carboidratosG: 15,
      proteinasG: 5,
      lipidiosG: 2.5,
      fibrasG: 1,
    });
  });

  it('should keep fibras null when the food has no value', () => {
    const semFibra = { ...arroz, fibrasG: null };
    expect(valoresParaQuantidade(semFibra, 200).fibrasG).toBeNull();
  });

  it('should sum every item of a meal', () => {
    const total = somarPorcoes([
      { alimento: arroz, quantidadeG: 100 },
      { alimento: arroz, quantidadeG: 50 },
    ]);
    expect(total).toEqual({
      kcal: 300,
      carboidratosG: 45,
      proteinasG: 15,
      lipidiosG: 7.5,
      fibrasG: 3,
    });
  });

  it('should return zeros for an empty meal', () => {
    expect(somarPorcoes([]).kcal).toBe(0);
  });
});
