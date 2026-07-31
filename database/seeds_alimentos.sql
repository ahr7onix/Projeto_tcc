-- =====================================================================
-- Seed inicial da tabela de alimentos (RF01)
--
-- ATENÇÃO — LEIA ANTES DE USAR EM ATENDIMENTO REAL
--
-- Estes valores são APROXIMADOS e servem para o sistema não nascer vazio
-- durante o desenvolvimento e a demonstração. Eles NÃO substituem uma
-- tabela nutricional oficial e ainda não foram conferidos pela equipe de
-- Nutrição. Por isso a coluna `fonte` está marcada como 'exemplo': a tela
-- de alimentos exibe esse rótulo, e o cadastro de alimentos permite gravar
-- os itens da tabela oficial (TACO, IBGE ou outra) com a fonte correta,
-- convivendo com estes até a substituição.
--
-- A conferência pendente está organizada em docs/CONFERENCIA_NUTRICAO.md.
--
-- Todos os valores são por 100 g do alimento na forma indicada no nome.
-- =====================================================================

INSERT INTO alimento
    (nome, grupo, medida_caseira, medida_caseira_g, porcao_g,
     kcal, carboidratos_g, proteinas_g, lipidios_g, fibras_g, fonte)
VALUES
    -- Cereais, pães, massas e tubérculos
    ('Arroz branco cozido',        'cereais',    '1 colher de servir', 60,  100, 128, 28.1,  2.5,  0.2, 1.6, 'exemplo'),
    ('Arroz integral cozido',      'cereais',    '1 colher de servir', 60,  100, 124, 25.8,  2.6,  1.0, 2.7, 'exemplo'),
    ('Macarrão cozido',            'cereais',    '1 pegador',          80,  100, 158, 30.9,  5.8,  1.3, 1.8, 'exemplo'),
    ('Pão francês',                'paes',       '1 unidade',          50,  100, 300, 58.6,  8.0,  3.1, 2.3, 'exemplo'),
    ('Pão de forma integral',      'paes',       '1 fatia',            25,  100, 253, 49.9,  9.4,  3.7, 6.9, 'exemplo'),
    ('Aveia em flocos',            'cereais',    '1 colher de sopa',   15,  100, 394, 66.6, 13.9,  8.5, 9.1, 'exemplo'),
    ('Tapioca (goma hidratada)',   'cereais',    '1 unidade média',    60,  100, 240, 60.0,  0.2,  0.1, 0.5, 'exemplo'),
    ('Batata cozida',              'tuberculos', '1 unidade média',    90,  100,  52, 11.9,  1.2,  0.1, 1.3, 'exemplo'),
    ('Batata doce cozida',         'tuberculos', '1 pedaço médio',     80,  100,  77, 18.4,  0.6,  0.1, 2.2, 'exemplo'),
    ('Mandioca cozida',            'tuberculos', '1 pedaço médio',     80,  100, 125, 30.1,  0.6,  0.3, 1.6, 'exemplo'),

    -- Leguminosas
    ('Feijão carioca cozido',      'leguminosas','1 concha média',     80,  100,  76, 13.6,  4.8,  0.5, 8.5, 'exemplo'),
    ('Feijão preto cozido',        'leguminosas','1 concha média',     80,  100,  77, 14.0,  4.5,  0.5, 8.4, 'exemplo'),
    ('Lentilha cozida',            'leguminosas','1 concha média',     80,  100,  93, 16.3,  6.3,  0.5, 7.9, 'exemplo'),
    ('Grão-de-bico cozido',        'leguminosas','1 concha média',     80,  100, 130, 21.2,  8.4,  2.1, 7.6, 'exemplo'),

    -- Carnes, ovos e pescados
    ('Peito de frango grelhado',   'carnes',     '1 filé médio',      100,  100, 159,  0.0, 32.0,  2.5, 0.0, 'exemplo'),
    ('Patinho bovino grelhado',    'carnes',     '1 bife médio',      100,  100, 219,  0.0, 35.9,  7.3, 0.0, 'exemplo'),
    ('Filé de tilápia grelhado',   'pescados',   '1 filé médio',      100,  100,  96,  0.0, 20.0,  1.7, 0.0, 'exemplo'),
    ('Ovo de galinha cozido',      'ovos',       '1 unidade',          50,  100, 146,  0.6, 13.3,  9.5, 0.0, 'exemplo'),

    -- Leite e derivados
    ('Leite integral',             'laticinios', '1 copo',            200,  100,  61,  4.7,  3.2,  3.3, 0.0, 'exemplo'),
    ('Leite desnatado',            'laticinios', '1 copo',            200,  100,  35,  4.9,  3.4,  0.2, 0.0, 'exemplo'),
    ('Iogurte natural integral',   'laticinios', '1 pote',            170,  100,  61,  4.7,  3.5,  3.3, 0.0, 'exemplo'),
    ('Queijo minas frescal',       'laticinios', '1 fatia',            30,  100, 264,  3.2, 17.4, 20.2, 0.0, 'exemplo'),

    -- Frutas
    ('Banana prata',               'frutas',     '1 unidade média',    70,  100,  98, 26.0,  1.3,  0.1, 2.0, 'exemplo'),
    ('Maçã com casca',             'frutas',     '1 unidade média',   130,  100,  56, 15.2,  0.3,  0.0, 1.3, 'exemplo'),
    ('Mamão papaia',               'frutas',     '1 fatia média',     100,  100,  40, 10.4,  0.5,  0.1, 1.8, 'exemplo'),
    ('Laranja pera',               'frutas',     '1 unidade média',   130,  100,  37,  8.9,  1.0,  0.1, 0.8, 'exemplo'),
    ('Melancia',                   'frutas',     '1 fatia média',     200,  100,  33,  8.1,  0.9,  0.0, 0.1, 'exemplo'),
    ('Abacate',                    'frutas',     '1 colher de sopa',  30,   100,  96,  6.0,  1.2,  8.4, 6.3, 'exemplo'),

    -- Hortaliças
    ('Alface crespa crua',         'hortalicas', '1 prato de sobremesa', 40, 100,  15,  2.9,  1.4,  0.2, 1.8, 'exemplo'),
    ('Tomate cru',                 'hortalicas', '1 unidade média',    90,  100,  15,  3.1,  1.1,  0.2, 1.2, 'exemplo'),
    ('Cenoura crua',               'hortalicas', '1 unidade média',    70,  100,  34,  7.7,  1.3,  0.2, 3.2, 'exemplo'),
    ('Brócolis cozido',            'hortalicas', '1 colher de sopa',   25,  100,  25,  4.4,  2.1,  0.5, 3.4, 'exemplo'),
    ('Abóbora cozida',             'hortalicas', '1 colher de sopa',   30,  100,  48, 12.0,  0.9,  0.1, 2.5, 'exemplo'),

    -- Óleos, oleaginosas e açúcares
    ('Azeite de oliva',            'oleos',      '1 colher de sopa',    8,  100, 884,  0.0,  0.0,100.0, 0.0, 'exemplo'),
    ('Castanha-do-pará',           'oleaginosas','1 unidade',           5,  100, 643, 15.1, 14.5, 63.5, 7.9, 'exemplo'),
    ('Açúcar refinado',            'acucares',   '1 colher de chá',     5,  100, 387, 99.5,  0.0,  0.0, 0.0, 'exemplo')
ON CONFLICT DO NOTHING;
