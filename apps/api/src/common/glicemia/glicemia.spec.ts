import {
  FAIXAS_REFERENCIA,
  avaliarGlicemia,
  classificarGlicemia,
  faixaDoMomento,
  severidadeDaClassificacao,
} from './glicemia';

describe('classificarGlicemia', () => {
  it('should return hipoglicemia_grave when value is below 54', () => {
    expect(classificarGlicemia(53, 'jejum')).toBe('hipoglicemia_grave');
  });

  it('should return hipoglicemia when value is between 54 and 69', () => {
    expect(classificarGlicemia(69, 'jejum')).toBe('hipoglicemia');
    expect(classificarGlicemia(54, 'jejum')).toBe('hipoglicemia');
  });

  it('should return normal when value is inside the fasting range', () => {
    expect(classificarGlicemia(70, 'jejum')).toBe('normal');
    expect(classificarGlicemia(130, 'jejum')).toBe('normal');
  });

  it('should return hiperglicemia when value exceeds the fasting ceiling', () => {
    expect(classificarGlicemia(131, 'jejum')).toBe('hiperglicemia');
  });

  it('should return hiperglicemia_grave when value is above 250', () => {
    expect(classificarGlicemia(251, 'pos_prandial')).toBe('hiperglicemia_grave');
  });

  it('should consider 150 normal after meals but high when fasting', () => {
    expect(classificarGlicemia(150, 'pos_prandial')).toBe('normal');
    expect(classificarGlicemia(150, 'jejum')).toBe('hiperglicemia');
  });

  it('should prioritize severe hypoglycemia over the momento range', () => {
    expect(classificarGlicemia(40, 'antes_dormir')).toBe('hipoglicemia_grave');
  });

  it('should flag values under the momento floor even when above 70', () => {
    // Antes de dormir o alvo é 90–150: 78 mg/dL ainda não é hipoglicemia
    // absoluta, mas é baixo para o horário e merece alerta.
    expect(classificarGlicemia(78, 'antes_dormir')).toBe('hipoglicemia');
    expect(classificarGlicemia(90, 'antes_dormir')).toBe('normal');
    expect(classificarGlicemia(78, 'jejum')).toBe('normal');
  });
});

describe('faixaDoMomento', () => {
  it('should return the configured range for a known momento', () => {
    expect(faixaDoMomento('pos_prandial')).toEqual(FAIXAS_REFERENCIA.pos_prandial);
  });

  it('should fall back to the aleatorio range when momento is unknown', () => {
    expect(faixaDoMomento('inexistente')).toEqual(FAIXAS_REFERENCIA.aleatorio);
  });
});

describe('severidadeDaClassificacao', () => {
  it('should map severe classifications to critico', () => {
    expect(severidadeDaClassificacao('hipoglicemia_grave')).toBe('critico');
    expect(severidadeDaClassificacao('hiperglicemia_grave')).toBe('critico');
  });

  it('should map mild classifications to atencao', () => {
    expect(severidadeDaClassificacao('hipoglicemia')).toBe('atencao');
    expect(severidadeDaClassificacao('hiperglicemia')).toBe('atencao');
  });

  it('should map normal to normal', () => {
    expect(severidadeDaClassificacao('normal')).toBe('normal');
  });
});

describe('avaliarGlicemia', () => {
  it('should return classification, severity, message and range', () => {
    const resultado = avaliarGlicemia(300, 'jejum');
    expect(resultado.classificacao).toBe('hiperglicemia_grave');
    expect(resultado.severidade).toBe('critico');
    expect(resultado.mensagem).toBeTruthy();
    expect(resultado.faixaReferencia).toEqual({ min: 70, max: 130 });
  });
});
