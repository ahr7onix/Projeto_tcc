-- Dados de demonstração: enche as telas do painel e do app com um consultório
-- fictício (25 pacientes, 5 nutricionistas, até 5 meses de uso). Passo a passo em
-- scripts/demo/README.md.
--
-- Rode DEPOIS de preparar o banco com SEED_DEMO=true e de importar a TACO: não
-- cria alimento nenhum, e para com erro se faltar um dos que o cardápio usa.
--
-- Pode rodar de novo (as datas são relativas a hoje, então vale refazer antes de
-- apresentar). Cada execução apaga e recria as contas @demo.nutricare.local e
-- refaz medições, planos, mensagens e notificações do João, da Maria e da Camila.
--
-- Tudo aqui é inventado e nada foi validado pela Nutrição. Todas as contas usam a
-- senha pública do seed (Senha123!): em site aberto, só rode combinando com a equipe.

SET client_encoding = 'UTF8';
SET TIME ZONE 'UTC';

BEGIN;

SELECT setseed(0.2026);

-- O servidor roda em UTC e a demonstração acontece no Brasil: sem converter, o
-- jejum das 7h apareceria na tela como 4h da manhã.
CREATE FUNCTION pg_temp.hoje() RETURNS date LANGUAGE sql STABLE AS
  $$ SELECT (NOW() AT TIME ZONE 'America/Sao_Paulo')::date $$;

CREATE FUNCTION pg_temp.em(dia date, hora time) RETURNS timestamptz LANGUAGE sql STABLE AS
  $$ SELECT (dia + hora) AT TIME ZONE 'America/Sao_Paulo' $$;

DO $$
BEGIN
  IF (SELECT count(*) FROM usuario
       WHERE email IN ('camila.souza@nutri.com', 'joao.silva@email.com', 'maria.oliveira@email.com')) < 3 THEN
    RAISE EXCEPTION 'Faltam as contas do seed: prepare o banco com SEED_DEMO=true antes.';
  END IF;
END $$;

-- ---------- Limpeza da execução anterior ----------
CREATE TEMP TABLE demo_limpar ON COMMIT DROP AS
  SELECT u.id_usuario, u.email, p.id_paciente, n.id_nutricionista
    FROM usuario u
    LEFT JOIN paciente p ON p.id_usuario = u.id_usuario
    LEFT JOIN nutricionista n ON n.id_usuario = u.id_usuario
   WHERE u.email LIKE '%@demo.nutricare.local'
      OR u.email IN ('camila.souza@nutri.com', 'joao.silva@email.com', 'maria.oliveira@email.com');

-- Estas tabelas têm ON DELETE RESTRICT: precisam sair antes das contas.
DELETE FROM plano_alimentar
 WHERE id_paciente IN (SELECT id_paciente FROM demo_limpar)
    OR id_nutricionista IN (SELECT id_nutricionista FROM demo_limpar WHERE email LIKE '%@demo.nutricare.local');
DELETE FROM anotacao_paciente
 WHERE id_paciente IN (SELECT id_paciente FROM demo_limpar)
    OR id_autor IN (SELECT id_usuario FROM demo_limpar WHERE email LIKE '%@demo.nutricare.local');
DELETE FROM conteudo_educativo
 WHERE id_autor IN (SELECT id_usuario FROM demo_limpar WHERE email LIKE '%@demo.nutricare.local');
DELETE FROM receita
 WHERE id_autor IN (SELECT id_usuario FROM demo_limpar WHERE email LIKE '%@demo.nutricare.local');

DELETE FROM registro_glicemia       WHERE id_paciente IN (SELECT id_paciente FROM demo_limpar);
DELETE FROM registro_refeicao       WHERE id_paciente IN (SELECT id_paciente FROM demo_limpar);
DELETE FROM registro_emocional      WHERE id_paciente IN (SELECT id_paciente FROM demo_limpar);
DELETE FROM registro_antropometrico WHERE id_paciente IN (SELECT id_paciente FROM demo_limpar);
DELETE FROM medicamento             WHERE id_paciente IN (SELECT id_paciente FROM demo_limpar);
DELETE FROM restricao_alimentar     WHERE id_paciente IN (SELECT id_paciente FROM demo_limpar);
DELETE FROM lembrete                WHERE id_paciente IN (SELECT id_paciente FROM demo_limpar);
DELETE FROM solicitacao_vinculo     WHERE id_paciente IN (SELECT id_paciente FROM demo_limpar);
DELETE FROM nutricionista_paciente  WHERE id_paciente IN (SELECT id_paciente FROM demo_limpar);
DELETE FROM notificacao             WHERE id_usuario  IN (SELECT id_usuario  FROM demo_limpar);
DELETE FROM usuario WHERE email LIKE '%@demo.nutricare.local';

-- ---------- Nutricionistas ----------
CREATE TEMP TABLE demo_nutri (
  chave text PRIMARY KEY, nome text, email text, crn text, especialidade text,
  dias_conta int, aprovado boolean,
  id_usuario bigint, id_nutricionista bigint
) ON COMMIT DROP;

INSERT INTO demo_nutri (chave, nome, email, crn, especialidade, dias_conta, aprovado) VALUES
  ('camila',   'Dra. Camila Souza',  'camila.souza@nutri.com', NULL, NULL, 200, TRUE),
  ('rafael',   'Dr. Rafael Mendes',  'rafael.mendes', 'CRN-3/23456', 'Nutrição esportiva e diabetes', 180, TRUE),
  ('beatriz',  'Dra. Beatriz Lima',  'beatriz.lima',  'CRN-5/34567', 'Nutrição materno-infantil',     140, TRUE),
  -- Sem aprovação: aparecem na fila de conferência de CRN da administração.
  ('lucas',    'Lucas Pereira',      'lucas.pereira',  'CRN-4/45678', 'Nutrição clínica',  2, FALSE),
  ('fernanda', 'Fernanda Alves',     'fernanda.alves', 'CRN-2/56789', 'Saúde coletiva',    1, FALSE);

UPDATE demo_nutri SET email = email || '@demo.nutricare.local' WHERE email NOT LIKE '%@%';

INSERT INTO usuario (nome, email, senha, tipo, criado_em)
SELECT nome, email, '$2a$10$KCN6lz1JkKCSywueeO7w.OTS149BPYWvmohLziUm4G7U2khHHrmMq', 'nutricionista',
       NOW() - dias_conta * INTERVAL '1 day'
  FROM demo_nutri WHERE chave <> 'camila';

UPDATE demo_nutri d SET id_usuario = u.id_usuario FROM usuario u WHERE u.email = d.email;

-- A Camila nasce no seed com a data de hoje e sem perfil completo, o que não
-- combina com pacientes de meses atrás nem com o CRN que ela tem.
UPDATE usuario u SET criado_em = NOW() - d.dias_conta * INTERVAL '1 day'
  FROM demo_nutri d WHERE d.chave = 'camila' AND u.id_usuario = d.id_usuario;
UPDATE nutricionista n SET perfil_completo = TRUE, criado_em = NOW() - d.dias_conta * INTERVAL '1 day'
  FROM demo_nutri d WHERE d.chave = 'camila' AND n.id_usuario = d.id_usuario;

INSERT INTO nutricionista (id_usuario, crn, especialidade, perfil_completo, aprovado_em, criado_em)
SELECT id_usuario, crn, especialidade, TRUE,
       CASE WHEN aprovado THEN NOW() - (dias_conta - 1) * INTERVAL '1 day' END,
       NOW() - dias_conta * INTERVAL '1 day'
  FROM demo_nutri WHERE chave <> 'camila';

UPDATE demo_nutri d SET id_nutricionista = n.id_nutricionista
  FROM nutricionista n WHERE n.id_usuario = d.id_usuario;

-- ---------- Pacientes ----------
-- base e dp: média e desvio-padrão da glicemia. perfil: forma da curva no tempo.
-- inicio_dias: há quanto tempo usa o sistema. parou_dias: há quanto tempo parou.
-- adesao: chance de registrar. delta_peso: kg que perde por mês (negativo = ganha).
-- restrito: não pode com o cardápio padrão (lactose, glúten, castanhas).
CREATE TEMP TABLE demo_pac (
  chave text PRIMARY KEY, nome text, email text, nascimento date, genero genero_tipo,
  diabetes tipo_diabetes, peso numeric, altura numeric, atividade nivel_atividade,
  alergias text, nutri text, perfil text, base numeric, dp numeric,
  inicio_dias int, parou_dias int, adesao numeric, delta_peso numeric,
  vet_manual numeric, restrito boolean,
  ordem serial, id_usuario bigint, id_paciente bigint
) ON COMMIT DROP;

INSERT INTO demo_pac (chave, nome, email, nascimento, genero, diabetes, peso, altura, atividade, alergias,
                      nutri, perfil, base, dp, inicio_dias, parou_dias, adesao, delta_peso, vet_manual, restrito) VALUES
  ('joao',     'João da Silva',         'joao.silva@email.com',     '1985-04-12', 'masculino', 'tipo2',       88.30, 1.78, 'leve',       'Sem alergias conhecidas',    'camila',  'melhorando',    135, 26, 175,  0, 0.90,  0.9, NULL, FALSE),
  ('maria',    'Maria Oliveira',        'maria.oliveira@email.com', '1992-09-30', 'feminino',  'tipo1',       62.10, 1.65, 'moderado',   'Lactose',                    'camila',  'hipo',          125, 46, 175,  0, 0.95,  0.1, NULL, TRUE),
  ('ana',      'Ana Paula Ribeiro',     'ana.ribeiro',              '1978-06-21', 'feminino',  'tipo2',       76.40, 1.62, 'leve',       'Sem alergias conhecidas',    'camila',  'estavel',       116, 20, 170,  0, 0.92,  0.4, NULL, FALSE),
  ('carlos',   'Carlos Eduardo Nunes',  'carlos.nunes',             '1961-11-03', 'masculino', 'tipo2',       94.20, 1.74, 'sedentario', 'Hipertensão: reduzir sódio', 'camila',  'descontrolado', 198, 50, 165,  0, 0.75,  0.0, NULL, FALSE),
  ('bianca',   'Bianca Campos',         'bianca.campos',            '1996-02-17', 'feminino',  'gestacional', 71.00, 1.66, 'leve',       'Sem alergias conhecidas',    'camila',  'estavel',       104, 16,  65,  0, 0.97, -1.4, 2200, FALSE),
  ('pedro',    'Pedro Henrique Araújo', 'pedro.araujo',             '2011-03-14', 'masculino', 'tipo1',       52.00, 1.66, 'moderado',   'Glúten',                     'camila',  'oscilante',     148, 52, 150,  0, 0.80, -0.3, 2300, TRUE),
  ('helena',   'Helena Martins',        'helena.martins',           '1952-07-09', 'feminino',  'tipo2',       68.50, 1.58, 'sedentario', 'Frutos do mar',              'camila',  'estavel',       122, 22, 168,  0, 0.88,  0.2, NULL, FALSE),
  ('roberto',  'Roberto Tavares',       'roberto.tavares',          '1958-01-25', 'masculino', 'tipo2',      101.30, 1.76, 'sedentario', 'Sem alergias conhecidas',    'camila',  'piorando',      150, 30, 160,  0, 0.82,  0.3, NULL, FALSE),
  ('juliana',  'Juliana Costa',         'juliana.costa',            '1989-12-05', 'feminino',  'pre',         82.00, 1.68, 'moderado',   'Sem alergias conhecidas',    'camila',  'estavel',       102, 12, 120,  0, 0.70,  0.8, NULL, FALSE),
  ('marcos',   'Marcos Vinícius Rocha', 'marcos.rocha',             '1975-05-30', 'masculino', 'tipo2',       97.00, 1.81, 'leve',       'Sem alergias conhecidas',    'camila',  'inativo',       172, 38, 150, 45, 0.60,  0.1, NULL, FALSE),
  ('sofia',    'Sofia Almeida',         'sofia.almeida',            '2003-10-11', 'feminino',  'tipo1',       58.40, 1.63, 'intenso',    'Castanhas',                  'camila',  'oscilante',     142, 50, 140,  0, 0.90,  0.0, NULL, TRUE),
  ('antonio',  'Antônio Ferreira',      'antonio.ferreira',         '1947-08-18', 'masculino', 'tipo2',       72.60, 1.69, 'leve',       'Sem alergias conhecidas',    'camila',  'melhorando',    140, 24, 172,  0, 0.85,  0.5, NULL, FALSE),
  ('lucia',    'Lúcia Barbosa',         'lucia.barbosa',            '1969-03-02', 'feminino',  'outro',       64.30, 1.60, 'leve',       'Amendoim',                   'camila',  'oscilante',     150, 42, 110,  0, 0.78,  0.1, NULL, FALSE),
  ('alex',     'Alex Moreira',          'alex.moreira',             '1991-04-27', 'outro',     'pre',         78.10, 1.72, 'moderado',   'Sem alergias conhecidas',    'camila',  'novo',          110, 18,   6,  0, 0.90,  0.0, NULL, FALSE),
  ('thiago',   'Thiago Lopes',          'thiago.lopes',             '1994-09-08', 'masculino', 'tipo1',       74.50, 1.80, 'intenso',    'Sem alergias conhecidas',    'rafael',  'oscilante',     135, 44, 140,  0, 0.92,  0.0, NULL, FALSE),
  ('simone',   'Simone Dias',           'simone.dias',              '1983-01-19', 'feminino',  'tipo2',       88.90, 1.64, 'leve',       'Sem alergias conhecidas',    'rafael',  'melhorando',    140, 26, 150,  0, 0.86,  1.1, NULL, FALSE),
  ('gustavo',  'Gustavo Prado',         'gustavo.prado',            '1972-12-14', 'masculino', 'tipo2',      110.20, 1.83, 'sedentario', 'Sem alergias conhecidas',    'rafael',  'descontrolado', 205, 54, 130,  0, 0.66,  0.0, NULL, FALSE),
  ('renata',   'Renata Freitas',        'renata.freitas',           '1987-07-23', 'feminino',  'tipo2',       69.70, 1.59, 'moderado',   'Lactose',                    'rafael',  'estavel',       118, 22, 118,  0, 0.90,  0.3, NULL, TRUE),
  ('eduardo',  'Eduardo Sales',         'eduardo.sales',            '1966-02-08', 'masculino', 'pre',         85.00, 1.75, 'leve',       'Sem alergias conhecidas',    'rafael',  'inativo',       112, 16, 100, 20, 0.60,  0.2, NULL, FALSE),
  ('larissa',  'Larissa Mota',          'larissa.mota',             '1998-11-29', 'feminino',  'gestacional', 66.20, 1.61, 'leve',       'Sem alergias conhecidas',    'beatriz', 'estavel',       101, 15,  50,  0, 0.95, -1.3, 2150, FALSE),
  ('vanessa',  'Vanessa Teixeira',      'vanessa.teixeira',         '1993-06-06', 'feminino',  'gestacional', 74.80, 1.67, 'leve',       'Sem alergias conhecidas',    'beatriz', 'oscilante',     125, 28,  72,  0, 0.90, -1.5, 2300, FALSE),
  ('davi',     'Davi Cardoso',          'davi.cardoso',             '2014-08-02', 'masculino', 'tipo1',       38.00, 1.48, 'moderado',   'Sem alergias conhecidas',    'beatriz', 'oscilante',     150, 55, 125,  0, 0.84, -0.4, 1900, FALSE),
  -- Sem nutricionista: Cláudia e Márcio têm convite pendente da Camila.
  ('claudia',  'Cláudia Reis',          'claudia.reis',             '1980-09-15', 'feminino',  'tipo2',       79.00, 1.65, 'leve',       'Sem alergias conhecidas',    NULL,      'novo',          160, 35,   4,  0, 0.70,  0.0, NULL, FALSE),
  ('marcio',   'Márcio Pinto',          'marcio.pinto',             '1970-04-04', 'masculino', 'tipo2',       92.40, 1.77, 'sedentario', NULL,                         NULL,      'novo',          170, 40,   9,  0, 0.60,  0.0, NULL, FALSE),
  -- Cadastro incompleto: é o "Não informado" dos gráficos da administração.
  ('patricia', 'Patrícia Nogueira',     'patricia.nogueira',        NULL,         NULL,        NULL,          NULL,  NULL, NULL,         NULL,                         NULL,      'sem_dados',     NULL, NULL, 2, 0, 0.00,  0.0, NULL, FALSE);

UPDATE demo_pac SET email = email || '@demo.nutricare.local' WHERE email NOT LIKE '%@%';

INSERT INTO usuario (nome, email, senha, tipo, criado_em)
SELECT nome, email, '$2a$10$KCN6lz1JkKCSywueeO7w.OTS149BPYWvmohLziUm4G7U2khHHrmMq', 'paciente',
       NOW() - inicio_dias * INTERVAL '1 day'
  FROM demo_pac WHERE email LIKE '%@demo.nutricare.local';

UPDATE usuario u SET criado_em = NOW() - p.inicio_dias * INTERVAL '1 day'
  FROM demo_pac p WHERE u.email = p.email AND p.chave IN ('joao', 'maria');

UPDATE demo_pac d SET id_usuario = u.id_usuario FROM usuario u WHERE u.email = d.email;

INSERT INTO paciente (id_usuario, data_nascimento, genero, tipo_diabetes, restricoes_alergias,
                      peso, altura, nivel_atividade, criado_em)
SELECT id_usuario, nascimento, genero, diabetes, alergias, peso, altura, atividade,
       NOW() - inicio_dias * INTERVAL '1 day'
  FROM demo_pac WHERE chave NOT IN ('joao', 'maria');

UPDATE paciente pa SET nivel_atividade = d.atividade
  FROM demo_pac d WHERE pa.id_usuario = d.id_usuario AND d.chave IN ('joao', 'maria');

UPDATE demo_pac d SET id_paciente = pa.id_paciente FROM paciente pa WHERE pa.id_usuario = d.id_usuario;

-- ---------- Vínculos e convites ----------
-- Todo vínculo vem com o convite aceito, como no sistema de verdade: o que
-- autoriza o nutricionista a ver dado de saúde é o aceite do paciente (LGPD).
INSERT INTO nutricionista_paciente (id_nutricionista, id_paciente, criado_em)
SELECT n.id_nutricionista, p.id_paciente, NOW() - p.inicio_dias * INTERVAL '1 day'
  FROM demo_pac p JOIN demo_nutri n ON n.chave = p.nutri;

-- Renata saiu da Camila antes de ir para o Rafael: a Camila não pode mais ver os dados dela.
INSERT INTO nutricionista_paciente (id_nutricionista, id_paciente, ativo, criado_em, encerrado_em)
SELECT n.id_nutricionista, p.id_paciente, FALSE,
       NOW() - INTERVAL '200 days', NOW() - (p.inicio_dias + 1) * INTERVAL '1 day'
  FROM demo_pac p, demo_nutri n WHERE p.chave = 'renata' AND n.chave = 'camila';

INSERT INTO solicitacao_vinculo (id_nutricionista, id_paciente, status, criado_em, respondido_em)
SELECT v.id_nutricionista, v.id_paciente, 'aceita', v.criado_em - INTERVAL '1 day', v.criado_em
  FROM nutricionista_paciente v JOIN demo_pac p ON p.id_paciente = v.id_paciente;

INSERT INTO solicitacao_vinculo (id_nutricionista, id_paciente, status, criado_em, respondido_em)
SELECT n.id_nutricionista, p.id_paciente, c.status, NOW() - c.dias * INTERVAL '1 day',
       CASE WHEN c.status <> 'pendente' THEN NOW() - (c.dias - 1) * INTERVAL '1 day' END
  FROM (VALUES ('claudia', 'camila',  'pendente',  1),
               ('marcio',  'camila',  'pendente',  3),
               ('marcio',  'rafael',  'recusada',  8),
               ('claudia', 'beatriz', 'cancelada', 3)) AS c(paciente, nutri, status, dias)
  JOIN demo_pac p ON p.chave = c.paciente
  JOIN demo_nutri n ON n.chave = c.nutri;

-- ---------- Medicamentos ----------
INSERT INTO medicamento (id_paciente, nome_medicamento, dosagem, frequencia, horario_inicial, observacoes, ativo, criado_em)
SELECT p.id_paciente, m.nome, m.dosagem, m.frequencia, m.hora::time, m.observacoes, m.ativo,
       NOW() - p.inicio_dias * INTERVAL '1 day'
  FROM (VALUES
    ('joao',    'Metformina',        '850 mg', '12 em 12h',            '08:00', 'Tomar junto com a refeição', TRUE),
    ('maria',   'Insulina glargina', '18 UI',  '1 vez ao dia',         '22:00', NULL, TRUE),
    ('maria',   'Insulina lispro',   '6 UI',   'Antes das refeições',  '07:30', 'Ajustar pela contagem de carboidratos', TRUE),
    ('maria',   'Insulina NPH',      '10 UI',  '8 em 8h',              '07:00', 'Substituída pela glargina', FALSE),
    ('ana',     'Metformina',        '500 mg', '12 em 12h',            '08:00', NULL, TRUE),
    ('carlos',  'Metformina',        '850 mg', '8 em 8h',              '07:00', 'Tomar junto com a refeição', TRUE),
    ('carlos',  'Gliclazida MR',     '60 mg',  '1 vez ao dia',         '07:30', NULL, TRUE),
    ('carlos',  'Losartana',         '50 mg',  '1 vez ao dia',         '08:00', 'Para a pressão', TRUE),
    ('pedro',   'Insulina glargina', '16 UI',  '1 vez ao dia',         '21:00', NULL, TRUE),
    ('pedro',   'Insulina asparte',  '4 UI',   'Antes das refeições',  '07:00', NULL, TRUE),
    ('helena',  'Metformina',        '500 mg', '1 vez ao dia',         '12:00', NULL, TRUE),
    ('helena',  'Sinvastatina',      '20 mg',  '1 vez ao dia',         '21:00', NULL, TRUE),
    ('roberto', 'Metformina',        '850 mg', '12 em 12h',            '08:00', NULL, TRUE),
    ('roberto', 'Dapagliflozina',    '10 mg',  '1 vez ao dia',         '08:00', NULL, TRUE),
    ('roberto', 'Glibenclamida',     '5 mg',   '1 vez ao dia',         '07:00', 'Suspensa por episódios de hipoglicemia', FALSE),
    ('marcos',  'Metformina',        '850 mg', '12 em 12h',            '08:00', NULL, TRUE),
    ('sofia',   'Insulina glargina', '20 UI',  '1 vez ao dia',         '22:00', NULL, TRUE),
    ('sofia',   'Insulina lispro',   '5 UI',   'Antes das refeições',  '07:00', 'Reduzir antes dos treinos longos', TRUE),
    ('antonio', 'Sitagliptina',      '100 mg', '1 vez ao dia',         '08:00', NULL, TRUE),
    ('antonio', 'Metformina',        '500 mg', '12 em 12h',            '08:00', NULL, TRUE),
    ('lucia',   'Insulina NPH',      '12 UI',  '12 em 12h',            '07:00', NULL, TRUE),
    ('thiago',  'Insulina glargina', '24 UI',  '1 vez ao dia',         '22:00', NULL, TRUE),
    ('thiago',  'Insulina lispro',   '7 UI',   'Antes das refeições',  '07:00', NULL, TRUE),
    ('simone',  'Metformina',        '850 mg', '12 em 12h',            '08:00', NULL, TRUE),
    ('gustavo', 'Metformina',        '850 mg', '8 em 8h',              '07:00', NULL, TRUE),
    ('gustavo', 'Insulina NPH',      '20 UI',  '1 vez ao dia',         '22:00', NULL, TRUE),
    ('gustavo', 'Empagliflozina',    '25 mg',  '1 vez ao dia',         '08:00', NULL, TRUE),
    ('renata',  'Metformina',        '500 mg', '12 em 12h',            '08:00', NULL, TRUE),
    ('vanessa', 'Insulina NPH',      '10 UI',  '1 vez ao dia',         '22:00', 'Conduta da obstetra', TRUE),
    ('davi',    'Insulina glargina', '12 UI',  '1 vez ao dia',         '21:00', NULL, TRUE),
    ('davi',    'Insulina asparte',  '3 UI',   'Antes das refeições',  '07:00', NULL, TRUE),
    ('claudia', 'Metformina',        '500 mg', '12 em 12h',            '08:00', NULL, TRUE)
  ) AS m(paciente, nome, dosagem, frequencia, hora, observacoes, ativo)
  JOIN demo_pac p ON p.chave = m.paciente;

-- ---------- Restrições alimentares ----------
INSERT INTO restricao_alimentar (id_paciente, descricao, criado_em)
SELECT p.id_paciente, r.descricao, NOW() - p.inicio_dias * INTERVAL '1 day'
  FROM (VALUES
    ('maria',   'Intolerância à lactose'),
    ('carlos',  'Reduzir sódio (hipertensão)'),
    ('pedro',   'Doença celíaca: sem glúten'),
    ('helena',  'Alergia a frutos do mar'),
    ('sofia',   'Alergia a castanhas'),
    ('lucia',   'Alergia a amendoim'),
    ('renata',  'Intolerância à lactose'),
    ('antonio', 'Prefere alimentos macios, por dificuldade de mastigação')
  ) AS r(paciente, descricao)
  JOIN demo_pac p ON p.chave = r.paciente;

-- ---------- Glicemia ----------
-- Em todo o script o sorteio vira coluna de uma subconsulta e o filtro fica por
-- fora dela. Com "WHERE random() < p.adesao" direto, o Postgres aplica o filtro
-- na leitura de demo_pac e sorteia uma vez por paciente, não uma vez por dia:
-- metade dos pacientes ficava sem nenhum registro.
--
-- desvio: quanto cada momento do dia se afasta da base do paciente.
CREATE TEMP TABLE demo_horario (momento momento_glicemia, hora time, chance numeric, desvio numeric) ON COMMIT DROP;
INSERT INTO demo_horario VALUES
  ('jejum',        '06:45', 0.90,  -8),
  ('pre_prandial', '11:50', 0.35,   0),
  ('pos_prandial', '14:10', 0.60,  38),
  ('pre_prandial', '18:50', 0.30,   2),
  ('pos_prandial', '21:00', 0.40,  30),
  ('antes_dormir', '22:30', 0.45,   6),
  ('madrugada',    '03:00', 0.03, -18),
  ('aleatorio',    '16:20', 0.10,  10);

INSERT INTO registro_glicemia (id_paciente, valor, data_hora, momento, observacao)
SELECT g.id_paciente, g.valor, g.data_hora, g.momento,
       CASE
         WHEN g.valor < 54 THEN (ARRAY['Tremores e suor frio, tomei suco de laranja', 'Tontura forte, pedi ajuda em casa', 'Passei mal e corrigi com mel'])[1 + floor(random() * 3)::int]
         WHEN g.valor < 70 THEN (ARRAY['Sentindo tremores leves', 'Fiz exercício sem lanchar antes', 'Atrasei a refeição'])[1 + floor(random() * 3)::int]
         WHEN g.valor > 250 THEN (ARRAY['Exagerei na sobremesa', 'Esqueci a medicação', 'Dia muito corrido, comi na rua'])[1 + floor(random() * 3)::int]
         WHEN random() < 0.04 THEN (ARRAY['Caminhada antes do jantar', 'Comemoração em família', 'Dormi mal esta noite', 'Dia tranquilo'])[1 + floor(random() * 4)::int]
       END
  FROM (
    SELECT b.id_paciente, b.momento,
           pg_temp.em(pg_temp.hoje() - b.d, b.hora) + random() * INTERVAL '50 minutes' AS data_hora,
           greatest(42, least(470, round((
             b.base + b.desvio
             + CASE b.perfil
                 WHEN 'melhorando' THEN 50.0 * b.d / 170                  -- era pior e veio caindo
                 WHEN 'piorando'   THEN 60.0 * greatest(0, 1 - b.d / 18.0) -- subiu nas últimas semanas
                 WHEN 'oscilante'  THEN 18 * sin(b.d / 6.0)
                 ELSE 0
               END
             -- Quedas são mais curtas que picos: sem isto, quem vive com a glicemia
             -- alta também batia no piso, e hipoglicemia grave virava rotina.
             + b.dp * CASE WHEN b.z < 0 THEN 0.6 ELSE 1 END * b.z
           )::numeric))) AS valor
      FROM (
        SELECT p.id_paciente, p.perfil, p.base, p.dp, h.momento, h.hora, h.desvio, d,
               h.chance * p.adesao AS chance, random() AS sorte,
               sqrt(-2 * ln(1 - random())) * cos(2 * pi() * random()) AS z
          FROM demo_pac p
          CROSS JOIN generate_series(0, 170) d
          CROSS JOIN demo_horario h
         WHERE p.base IS NOT NULL
           AND d BETWEEN p.parou_dias AND p.inicio_dias
      ) b
     WHERE b.sorte < b.chance
  ) g
 WHERE g.data_hora <= NOW();

-- A última medição é a que define a situação do paciente na tela Início. O
-- momento é "aleatorio" porque o script pode rodar a qualquer hora do dia.
INSERT INTO registro_glicemia (id_paciente, valor, data_hora, momento, observacao)
SELECT p.id_paciente, f.valor, NOW() - f.minutos * INTERVAL '1 minute', 'aleatorio', f.observacao
  FROM (VALUES
    ('carlos',  25, 286, 'Comi fora de casa e exagerei na massa'),
    ('maria',   50,  52, 'Tremores e suor frio, tomei suco de laranja'),
    ('roberto', 70, 232, 'Jantei bem mais tarde por causa do turno'),
    ('gustavo', 40, 301, NULL),
    ('sofia',   95,  64, 'Depois do treino'),
    ('lucia',  110, 196, NULL)
  ) AS f(paciente, minutos, valor, observacao)
  JOIN demo_pac p ON p.chave = f.paciente;

-- ---------- Cardápios ----------
-- Gramas de referência: cada plano escala pelo VET do paciente. O C não tem
-- leite, glúten nem castanhas, e é o que vai para quem tem restrição.
CREATE TEMP TABLE demo_cardapio (
  menu text, nome_refeicao text, horario time, tipo_refeicao text,
  rotulo text, alimento text, gramas numeric, id_alimento bigint, kcal_item numeric
) ON COMMIT DROP;

INSERT INTO demo_cardapio (menu, nome_refeicao, horario, tipo_refeicao, rotulo, alimento, gramas) VALUES
  ('A', 'Café da manhã',   '07:30', 'cafe',   'Pão integral',      'Pão, trigo, forma, integral',                 50),
  ('A', 'Café da manhã',   '07:30', 'cafe',   'Ovo cozido',        'Ovo, de galinha, inteiro, cozido/10minutos',  50),
  ('A', 'Café da manhã',   '07:30', 'cafe',   'Queijo minas',      'Queijo, minas, frescal',                      30),
  ('A', 'Café da manhã',   '07:30', 'cafe',   'Mamão papaia',      'Mamão, Papaia, cru',                         120),
  ('A', 'Café da manhã',   '07:30', 'cafe',   'Café sem açúcar',   'Café, infusão 10%',                          100),
  ('A', 'Lanche da manhã', '10:00', 'lanche', 'Maçã',              'Maçã, Fuji, com casca, crua',                130),
  ('A', 'Lanche da manhã', '10:00', 'lanche', 'Castanha-do-brasil','Castanha-do-Brasil, crua',                    15),
  ('A', 'Almoço',          '12:30', 'almoco', 'Alface',            'Alface, crespa, crua',                        40),
  ('A', 'Almoço',          '12:30', 'almoco', 'Tomate',            'Tomate, com semente, cru',                    60),
  ('A', 'Almoço',          '12:30', 'almoco', 'Arroz integral',    'Arroz, integral, cozido',                    120),
  ('A', 'Almoço',          '12:30', 'almoco', 'Feijão carioca',    'Feijão, carioca, cozido',                    100),
  ('A', 'Almoço',          '12:30', 'almoco', 'Frango grelhado',   'Frango, peito, sem pele, grelhado',          120),
  ('A', 'Almoço',          '12:30', 'almoco', 'Brócolis',          'Brócolis, cozido',                            80),
  ('A', 'Lanche da tarde', '16:00', 'lanche', 'Iogurte desnatado', 'Iogurte, natural, desnatado',                170),
  ('A', 'Lanche da tarde', '16:00', 'lanche', 'Aveia',             'Aveia, flocos, crua',                         30),
  ('A', 'Lanche da tarde', '16:00', 'lanche', 'Banana',            'Banana, prata, crua',                         60),
  ('A', 'Jantar',          '19:30', 'jantar', 'Batata-doce',       'Batata, doce, cozida',                       120),
  ('A', 'Jantar',          '19:30', 'jantar', 'Patinho grelhado',  'Carne, bovina, patinho, sem gordura, grelhado', 110),
  ('A', 'Jantar',          '19:30', 'jantar', 'Abobrinha',         'Abobrinha, italiana, refogada',              100),
  ('A', 'Jantar',          '19:30', 'jantar', 'Cenoura',           'Cenoura, cozida',                             50),
  ('A', 'Ceia',            '21:30', 'ceia',   'Iogurte natural',   'Iogurte, natural',                           120),
  ('A', 'Ceia',            '21:30', 'ceia',   'Aveia',             'Aveia, flocos, crua',                         15),

  ('B', 'Café da manhã',   '07:30', 'cafe',   'Cuscuz de milho',   'Cuscuz, de milho, cozido com sal',           100),
  ('B', 'Café da manhã',   '07:30', 'cafe',   'Ovo cozido',        'Ovo, de galinha, inteiro, cozido/10minutos',  50),
  ('B', 'Café da manhã',   '07:30', 'cafe',   'Laranja',           'Laranja, pêra, crua',                        130),
  ('B', 'Café da manhã',   '07:30', 'cafe',   'Café sem açúcar',   'Café, infusão 10%',                          100),
  ('B', 'Lanche da manhã', '10:00', 'lanche', 'Banana',            'Banana, prata, crua',                         90),
  ('B', 'Lanche da manhã', '10:00', 'lanche', 'Castanha-de-caju',  'Castanha-de-caju, torrada, salgada',          15),
  ('B', 'Almoço',          '12:30', 'almoco', 'Alface',            'Alface, americana, crua',                     40),
  ('B', 'Almoço',          '12:30', 'almoco', 'Cenoura ralada',    'Cenoura, crua',                               40),
  ('B', 'Almoço',          '12:30', 'almoco', 'Arroz branco',      'Arroz, tipo 1, cozido',                      100),
  ('B', 'Almoço',          '12:30', 'almoco', 'Feijão preto',      'Feijão, preto, cozido',                      100),
  ('B', 'Almoço',          '12:30', 'almoco', 'Patinho grelhado',  'Carne, bovina, patinho, sem gordura, grelhado', 110),
  ('B', 'Almoço',          '12:30', 'almoco', 'Abobrinha',         'Abobrinha, italiana, refogada',               80),
  ('B', 'Lanche da tarde', '16:00', 'lanche', 'Pão integral',      'Pão, trigo, forma, integral',                 50),
  ('B', 'Lanche da tarde', '16:00', 'lanche', 'Ricota',            'Queijo, ricota',                              40),
  ('B', 'Lanche da tarde', '16:00', 'lanche', 'Tomate',            'Tomate, com semente, cru',                    40),
  ('B', 'Jantar',          '19:30', 'jantar', 'Arroz integral',    'Arroz, integral, cozido',                     90),
  ('B', 'Jantar',          '19:30', 'jantar', 'Feijão carioca',    'Feijão, carioca, cozido',                     70),
  ('B', 'Jantar',          '19:30', 'jantar', 'Frango cozido',     'Frango, peito, sem pele, cozido',            110),
  ('B', 'Jantar',          '19:30', 'jantar', 'Brócolis',          'Brócolis, cozido',                            80),
  ('B', 'Ceia',            '21:30', 'ceia',   'Iogurte natural',   'Iogurte, natural',                           120),
  ('B', 'Ceia',            '21:30', 'ceia',   'Maçã',              'Maçã, Fuji, com casca, crua',                100),

  ('C', 'Café da manhã',   '07:30', 'cafe',   'Cuscuz de milho',   'Cuscuz, de milho, cozido com sal',           100),
  ('C', 'Café da manhã',   '07:30', 'cafe',   'Ovo cozido',        'Ovo, de galinha, inteiro, cozido/10minutos',  50),
  ('C', 'Café da manhã',   '07:30', 'cafe',   'Mamão papaia',      'Mamão, Papaia, cru',                         120),
  ('C', 'Café da manhã',   '07:30', 'cafe',   'Café sem açúcar',   'Café, infusão 10%',                          100),
  ('C', 'Lanche da manhã', '10:00', 'lanche', 'Banana',            'Banana, prata, crua',                         90),
  ('C', 'Almoço',          '12:30', 'almoco', 'Alface',            'Alface, crespa, crua',                        40),
  ('C', 'Almoço',          '12:30', 'almoco', 'Tomate',            'Tomate, com semente, cru',                    60),
  ('C', 'Almoço',          '12:30', 'almoco', 'Arroz integral',    'Arroz, integral, cozido',                    120),
  ('C', 'Almoço',          '12:30', 'almoco', 'Feijão carioca',    'Feijão, carioca, cozido',                    100),
  ('C', 'Almoço',          '12:30', 'almoco', 'Frango grelhado',   'Frango, peito, sem pele, grelhado',          120),
  ('C', 'Almoço',          '12:30', 'almoco', 'Cenoura',           'Cenoura, cozida',                             60),
  ('C', 'Lanche da tarde', '16:00', 'lanche', 'Maçã',              'Maçã, Fuji, com casca, crua',                130),
  ('C', 'Lanche da tarde', '16:00', 'lanche', 'Batata-doce',       'Batata, doce, cozida',                        80),
  ('C', 'Jantar',          '19:30', 'jantar', 'Arroz branco',      'Arroz, tipo 1, cozido',                       90),
  ('C', 'Jantar',          '19:30', 'jantar', 'Feijão preto',      'Feijão, preto, cozido',                       70),
  ('C', 'Jantar',          '19:30', 'jantar', 'Patinho grelhado',  'Carne, bovina, patinho, sem gordura, grelhado', 100),
  ('C', 'Jantar',          '19:30', 'jantar', 'Abobrinha',         'Abobrinha, italiana, refogada',               80),
  ('C', 'Ceia',            '21:30', 'ceia',   'Laranja',           'Laranja, pêra, crua',                        130);

UPDATE demo_cardapio c
   SET id_alimento = a.id_alimento, kcal_item = a.kcal * c.gramas / a.porcao_g
  FROM alimento a
 WHERE a.nome = c.alimento AND a.ativo AND a.fonte LIKE 'TACO%';

DO $$
DECLARE faltando text;
BEGIN
  SELECT string_agg(DISTINCT alimento, '; ') INTO faltando FROM demo_cardapio WHERE id_alimento IS NULL;
  IF faltando IS NOT NULL THEN
    RAISE EXCEPTION 'Importe a TACO antes. Alimentos não encontrados: %', faltando;
  END IF;
END $$;

-- ---------- Planos alimentares ----------
-- "Ativo" é calculado pelas datas, então o plano anterior termina na véspera do atual.
CREATE TEMP TABLE demo_plano (
  id_plano bigint, chave text, atual boolean, inicio date, fim date, menu text,
  vet numeric, formula text, fator numeric, pc numeric, pp numeric, pl numeric, observacoes text
) ON COMMIT DROP;

WITH base AS (
  SELECT p.*, pg_temp.hoje() - least(p.inicio_dias - 1, 25 + (p.ordem * 11) % 50) AS inicio_atual
    FROM demo_pac p
   WHERE p.nutri IS NOT NULL AND p.perfil <> 'novo'
), calculo AS (
  SELECT b.*,
         CASE b.atividade WHEN 'sedentario' THEN 1.2 WHEN 'leve' THEN 1.375 WHEN 'moderado' THEN 1.55
                          WHEN 'intenso' THEN 1.725 WHEN 'muito_intenso' THEN 1.9 END AS fator_ativ,
         10 * b.peso + 625 * b.altura - 5 * extract(year FROM age(b.nascimento))
           + CASE WHEN b.genero = 'masculino' THEN 5 ELSE -161 END AS tmb
    FROM base b
)
INSERT INTO demo_plano (chave, atual, inicio, fim, menu, vet, formula, fator, pc, pp, pl, observacoes)
-- Plano atual. O do Marcos venceu e não foi renovado: ele sumiu do acompanhamento.
SELECT c.chave, TRUE, c.inicio_atual,
       CASE WHEN c.chave = 'marcos' THEN pg_temp.hoje() - 15
            WHEN c.ordem % 3 = 0 THEN NULL
            ELSE c.inicio_atual + 180 END,
       CASE WHEN c.restrito THEN 'C' WHEN c.ordem % 2 = 0 THEN 'A' ELSE 'B' END,
       COALESCE(c.vet_manual, round(c.tmb * c.fator_ativ, 1)),
       CASE WHEN c.vet_manual IS NULL THEN 'mifflin_st_jeor' ELSE 'manual' END,
       CASE WHEN c.vet_manual IS NULL THEN c.fator_ativ END,
       CASE c.perfil WHEN 'descontrolado' THEN 40 ELSE CASE WHEN c.diabetes = 'pre' THEN 45 ELSE 50 END END,
       CASE WHEN c.perfil = 'descontrolado' OR c.diabetes = 'pre' THEN 25 ELSE 20 END,
       CASE c.perfil WHEN 'descontrolado' THEN 35 ELSE 30 END,
       CASE c.perfil
         WHEN 'descontrolado' THEN 'Reduzir carboidrato refinado e distribuir melhor ao longo do dia.'
         WHEN 'melhorando'    THEN 'Boa evolução: manter a distribuição e os horários.'
         WHEN 'hipo'          THEN 'Reforçar os lanches nos dias de treino para evitar queda da glicemia.'
         ELSE 'Plano individual. Ajustes no retorno.'
       END
  FROM calculo c
UNION ALL
-- Plano anterior, para quem está no sistema há tempo suficiente.
SELECT c.chave, FALSE, greatest(c.inicio_atual - 90, pg_temp.hoje() - c.inicio_dias), c.inicio_atual - 1,
       CASE WHEN c.restrito THEN 'C' WHEN c.ordem % 2 = 0 THEN 'B' ELSE 'A' END,
       COALESCE(c.vet_manual, round(c.tmb * c.fator_ativ, 1)) + 100,
       CASE WHEN c.vet_manual IS NULL THEN 'mifflin_st_jeor' ELSE 'manual' END,
       CASE WHEN c.vet_manual IS NULL THEN c.fator_ativ END,
       50, 20, 30, 'Plano inicial do acompanhamento.'
  FROM calculo c
 WHERE pg_temp.hoje() - c.inicio_dias < c.inicio_atual - 30;

INSERT INTO plano_alimentar (id_paciente, id_nutricionista, data_inicio, data_fim, vet_kcal, formula_vet,
                             fator_atividade, perc_carboidratos, perc_proteinas, perc_lipidios, observacoes, criado_em)
SELECT p.id_paciente, n.id_nutricionista, d.inicio, d.fim, d.vet, d.formula, d.fator, d.pc, d.pp, d.pl,
       d.observacoes, pg_temp.em(d.inicio, '10:00')
  FROM demo_plano d
  JOIN demo_pac p ON p.chave = d.chave
  JOIN demo_nutri n ON n.chave = p.nutri;

UPDATE demo_plano d SET id_plano = pa.id_plano
  FROM plano_alimentar pa JOIN demo_pac p ON p.id_paciente = pa.id_paciente
 WHERE p.chave = d.chave AND pa.data_inicio = d.inicio;

CREATE TEMP TABLE demo_porcao ON COMMIT DROP AS
  SELECT d.id_plano, c.nome_refeicao, c.horario, c.rotulo, c.id_alimento,
         greatest(5, round(c.gramas * d.vet / t.total / 5) * 5) AS quantidade_g
    FROM demo_plano d
    JOIN demo_cardapio c ON c.menu = d.menu
    JOIN (SELECT menu, sum(kcal_item) AS total FROM demo_cardapio GROUP BY menu) t ON t.menu = d.menu;

INSERT INTO refeicao (id_plano, nome_refeicao, horario, itens)
SELECT id_plano, nome_refeicao, horario,
       string_agg(rotulo || ' (' || quantidade_g::int || ' g)', ', ' ORDER BY id_alimento)
  FROM demo_porcao
 GROUP BY id_plano, nome_refeicao, horario;

INSERT INTO refeicao_item (id_refeicao, id_alimento, quantidade_g)
SELECT r.id_refeicao, c.id_alimento, c.quantidade_g
  FROM demo_porcao c
  JOIN refeicao r ON r.id_plano = c.id_plano AND r.nome_refeicao = c.nome_refeicao;

-- ---------- Registro de refeições ----------
-- Mesmo formato do app: um registro por alimento, com a conta feita pela tabela
-- (descrição "Nome (100 g)"), e registros de texto livre só com o carboidrato.
WITH feitas AS MATERIALIZED (
  SELECT s.id_paciente, s.id_refeicao, s.horario, s.d, s.tipo_refeicao
    FROM (
      SELECT p.id_paciente, r.id_refeicao, r.horario, d, c.tipo_refeicao,
             0.5 * p.adesao AS chance, random() AS sorte
        FROM demo_pac p
        JOIN demo_plano pl ON pl.chave = p.chave AND pl.atual
        JOIN refeicao r ON r.id_plano = pl.id_plano
        JOIN (SELECT DISTINCT nome_refeicao, tipo_refeicao FROM demo_cardapio) c USING (nome_refeicao)
        CROSS JOIN generate_series(0, 60) d
       WHERE d BETWEEN p.parou_dias AND p.inicio_dias
    ) s
   WHERE s.sorte < s.chance
)
INSERT INTO registro_refeicao (id_paciente, descricao, tipo_refeicao, carboidratos, proteinas, lipidios,
                               kcal, id_alimento, quantidade_g, data_hora)
SELECT s.id_paciente, s.descricao, s.tipo_refeicao, s.carboidratos, s.proteinas, s.lipidios,
       s.kcal, s.id_alimento, s.quantidade_g, s.data_hora
  FROM (
    SELECT f.id_paciente,
           a.nome || ' (' || ri.quantidade_g::int || ' g)' AS descricao,
           f.tipo_refeicao,
           round(a.carboidratos_g * ri.quantidade_g / a.porcao_g, 1) AS carboidratos,
           round(a.proteinas_g * ri.quantidade_g / a.porcao_g, 1) AS proteinas,
           round(a.lipidios_g * ri.quantidade_g / a.porcao_g, 1) AS lipidios,
           round(a.kcal * ri.quantidade_g / a.porcao_g, 1) AS kcal,
           a.id_alimento,
           ri.quantidade_g,
           pg_temp.em(pg_temp.hoje() - f.d, f.horario) + random() * INTERVAL '35 minutes' AS data_hora,
           random() AS sorte
      FROM feitas f
      JOIN refeicao_item ri ON ri.id_refeicao = f.id_refeicao
      JOIN alimento a ON a.id_alimento = ri.id_alimento
  ) s
 WHERE s.sorte < 0.6
   AND s.data_hora <= NOW();

INSERT INTO registro_refeicao (id_paciente, descricao, tipo_refeicao, carboidratos, observacao, data_hora)
SELECT s.id_paciente, s.descricao, s.tipo_refeicao, s.carboidratos, s.observacao, s.data_hora
  FROM (
    SELECT p.id_paciente, l.descricao, l.tipo_refeicao, l.carboidratos, l.observacao,
           pg_temp.em(pg_temp.hoje() - d, l.hora::time) + random() * INTERVAL '40 minutes' AS data_hora,
           random() AS sorte,
           CASE
             WHEN p.perfil = 'novo' THEN (CASE WHEN l.escapada THEN 0.03 ELSE 0.30 END)
             WHEN NOT l.escapada THEN 0
             WHEN p.perfil = 'descontrolado' THEN 0.04
             WHEN p.perfil IN ('oscilante', 'piorando') THEN 0.02
             ELSE 0.006
           END AS chance
      FROM (VALUES
        ('Café com leite e pão com manteiga',    'cafe',   38, '07:40', NULL, FALSE),
        ('Tapioca com queijo',                   'cafe',   42, '08:00', NULL, FALSE),
        ('Arroz, feijão, bife e salada',         'almoco', 62, '12:20', NULL, FALSE),
        ('Marmita do trabalho',                  'almoco', 58, '12:10', NULL, FALSE),
        ('Sopa de legumes',                      'jantar', 28, '19:40', NULL, FALSE),
        ('Pizza de calabresa com refrigerante',  'jantar', 96, '20:30', 'Saí com a família', TRUE),
        ('Hambúrguer com batata frita',          'jantar', 82, '20:10', 'Sem tempo para cozinhar', TRUE),
        ('Bolo de aniversário',                  'lanche', 55, '16:30', 'Aniversário no trabalho', TRUE),
        ('Feijoada de sábado',                   'almoco', 74, '13:00', NULL, TRUE),
        ('Sorvete de creme',                     'lanche', 38, '15:40', NULL, TRUE)
      ) AS l(descricao, tipo_refeicao, carboidratos, hora, observacao, escapada)
      CROSS JOIN demo_pac p
      CROSS JOIN generate_series(0, 60) d
     WHERE p.base IS NOT NULL
       AND NOT p.restrito
       AND d BETWEEN p.parou_dias AND p.inicio_dias
  ) s
 WHERE s.sorte < s.chance
   AND s.data_hora <= NOW();

-- ---------- Humor ----------
-- Acompanha a glicemia do dia, para a tela que põe humor e glicemia lado a lado
-- ter o que mostrar. Limites fixos aqui: só dão coerência ao dado inventado.
INSERT INTO registro_emocional (id_paciente, data_hora, estado, intensidade, fatores, observacao)
SELECT e.id_paciente, e.data_hora, e.estado::estado_emocional,
       least(5, greatest(1, round(abs(e.nota - 3) * 2 + 1)))::smallint,
       CASE
         WHEN e.nota < 2.8 THEN (ARRAY['noite mal dormida', 'estresse no trabalho', 'cansaço, dor de cabeça',
                                       'preocupação com a glicemia', 'estresse no trabalho, noite mal dormida',
                                       'problemas em casa'])[1 + floor(random() * 6)::int]
         WHEN e.nota > 3.8 THEN (ARRAY['atividade física', 'boa noite de sono', 'tempo com a família',
                                       'alimentação em dia', 'atividade física, boa noite de sono'])[1 + floor(random() * 5)::int]
       END,
       CASE
         WHEN e.nota < 2 THEN 'Dia difícil, sem disposição para nada.'
         WHEN e.nota > 4.6 THEN 'Dia muito bom, me senti com energia.'
       END
  FROM (
    SELECT n.id_paciente, n.nota, n.data_hora,
           CASE WHEN n.nota >= 4.4 THEN 'muito_bem' WHEN n.nota >= 3.5 THEN 'bem'
                WHEN n.nota >= 2.5 THEN 'neutro'    WHEN n.nota >= 1.6 THEN 'mal'
                ELSE 'muito_mal' END AS estado
      FROM (
        SELECT g.id_paciente,
               4.0 - 2.4 * g.fora + 0.7 * sqrt(-2 * ln(1 - random())) * cos(2 * pi() * random()) AS nota,
               pg_temp.em(g.dia, '20:15') + random() * INTERVAL '90 minutes' AS data_hora,
               0.6 * p.adesao AS chance, random() AS sorte
          FROM (
            SELECT rg.id_paciente,
                   (rg.data_hora AT TIME ZONE 'America/Sao_Paulo')::date AS dia,
                   avg((rg.valor < 70 OR rg.valor > 180)::int) AS fora
              FROM registro_glicemia rg
              JOIN demo_pac p ON p.id_paciente = rg.id_paciente
             GROUP BY 1, 2
          ) g
          JOIN demo_pac p ON p.id_paciente = g.id_paciente
      ) n
     WHERE n.sorte < n.chance
  ) e
 WHERE e.data_hora <= NOW();

-- ---------- Medidas ----------
-- A linha mais recente (m = 0) bate com paciente.peso, que é a última medição.
INSERT INTO registro_antropometrico (id_paciente, id_autor, data_medicao, peso, altura, circ_cintura,
                                     circ_quadril, circ_braco, circ_panturrilha, circ_pescoco, observacao, criado_em)
SELECT s.id_paciente, s.id_autor, s.data_medicao, s.peso, s.altura,
       round((18 + 2.6 * s.imc)::numeric, 1),
       round((30 + 2.6 * s.imc + CASE WHEN s.genero = 'masculino' THEN 0 ELSE 6 END)::numeric, 1),
       round((12 + 0.7 * s.imc)::numeric, 1),
       round((20 + 0.6 * s.imc)::numeric, 1),
       round((24 + 0.45 * s.imc)::numeric, 1),
       s.observacao, pg_temp.em(s.data_medicao, '10:30')
  FROM (
    SELECT t.*, t.peso / (t.altura * t.altura) AS imc
      FROM (
        SELECT p.id_paciente, p.genero, p.altura,
               COALESCE(n.id_usuario, p.id_usuario) AS id_autor,
               pg_temp.hoje() - (p.parou_dias + m * 30 + 2) AS data_medicao,
               round(p.peso + m * p.delta_peso + CASE WHEN m = 0 THEN 0 ELSE (random() - 0.5) * 0.6 END::numeric, 2) AS peso,
               CASE WHEN m = 0 AND p.delta_peso >= 0.8 THEN 'Boa evolução desde a última consulta.'
                    WHEN m = 0 AND p.delta_peso < -1 THEN 'Ganho de peso esperado para a gestação.' END AS observacao
          FROM demo_pac p
          LEFT JOIN demo_nutri n ON n.chave = p.nutri
          CROSS JOIN generate_series(0, 5) m
         WHERE p.peso IS NOT NULL
           AND p.parou_dias + m * 30 + 2 <= p.inicio_dias
      ) t
  ) s;

-- ---------- Anotações do nutricionista ----------
INSERT INTO anotacao_paciente (id_paciente, id_autor, tipo, texto, criado_em)
SELECT p.id_paciente, n.id_usuario, a.tipo, a.texto, NOW() - a.dias * INTERVAL '1 day'
  FROM (VALUES
    ('joao',    'observacao',   40, 'Vem perdendo peso de forma constante e a glicemia de jejum cai mês a mês.'),
    ('joao',    'recomendacao', 12, 'Manter a caminhada de 30 minutos depois do jantar, cinco vezes por semana.'),
    ('maria',   'limitacao',    60, 'Treina à noite e costuma ter queda de glicemia de madrugada.'),
    ('maria',   'recomendacao',  5, 'Reforçar o lanche da tarde nos dias de treino e deixar suco à mão para corrigir hipoglicemia.'),
    ('ana',     'complementar', 30, 'Trabalha em turno fixo e consegue manter os horários das refeições.'),
    ('carlos',  'restricao',    90, 'Hipertensão associada: orientar redução de sódio e de embutidos.'),
    ('carlos',  'limitacao',    30, 'Almoça em restaurante por quilo nos dias de trabalho.'),
    ('carlos',  'observacao',    7, 'Medições acima de 250 mg/dL depois de refeições fora de casa. Conversar com o médico que acompanha.'),
    ('bianca',  'complementar', 40, 'Gestante, acompanhada em conjunto com a obstetra.'),
    ('pedro',   'restricao',   140, 'Doença celíaca confirmada: plano sem glúten.'),
    ('pedro',   'complementar',100, 'A mãe ajuda nos registros do aplicativo.'),
    ('helena',  'limitacao',   120, 'Mora sozinha e precisa de refeições simples de preparar.'),
    ('roberto', 'observacao',    3, 'Glicemias subindo nas últimas duas semanas. Perguntar sobre mudança de rotina no retorno.'),
    ('juliana', 'recomendacao', 20, 'Pré-diabetes: foco em atividade física e redução do açúcar de adição.'),
    ('marcos',  'observacao',   30, 'Parou de registrar há algumas semanas. Tentar contato.'),
    ('sofia',   'complementar', 25, 'Corredora amadora. Ajustar o carboidrato antes dos treinos longos.'),
    ('antonio', 'limitacao',    80, 'Esquece as medições da tarde. A filha ajuda com os lembretes.'),
    ('lucia',   'observacao',   15, 'Tipo de diabetes em investigação com a endocrinologia.'),
    ('alex',    'complementar',  3, 'Primeira consulta feita. O plano sai depois de uma semana de registros.'),
    ('thiago',  'recomendacao', 18, 'Conferir a glicemia antes e depois dos treinos de força.'),
    ('simone',  'observacao',   22, 'Boa adesão ao plano. Relata menos fome no fim da tarde.'),
    ('gustavo', 'observacao',   10, 'Baixa adesão aos registros. Reforçar a importância da medição em jejum.'),
    ('renata',  'complementar', 60, 'Veio transferida de outra profissional e trouxe o histórico.'),
    ('eduardo', 'recomendacao', 35, 'Pré-diabetes: reavaliar exames em seis meses.'),
    ('larissa', 'complementar', 30, 'Gestante, sem intercorrências até aqui.'),
    ('vanessa', 'observacao',   14, 'Precisou iniciar insulina. Atenção às medições depois das refeições.'),
    ('davi',    'complementar', 70, 'Os pais fazem o registro. Combinar lanche para os dias de escola.')
  ) AS a(paciente, tipo, dias, texto)
  JOIN demo_pac p ON p.chave = a.paciente
  JOIN demo_nutri n ON n.chave = p.nutri;

-- ---------- Lembretes ----------
INSERT INTO lembrete (id_paciente, tipo_lembrete, id_uso, titulo, descricao, hora, dias_semana, recorrente, criado_em)
SELECT m.id_paciente, 'medicamento', m.id_uso, 'Tomar ' || m.nome_medicamento, m.dosagem, m.horario_inicial,
       ARRAY[0,1,2,3,4,5,6]::smallint[], TRUE, m.criado_em
  FROM medicamento m JOIN demo_pac p ON p.id_paciente = m.id_paciente
 WHERE m.ativo;

INSERT INTO lembrete (id_paciente, tipo_lembrete, titulo, descricao, hora, dias_semana, recorrente, criado_em)
SELECT p.id_paciente, 'glicemia'::tipo_lembrete, 'Medir glicemia em jejum', 'Antes do café da manhã', '06:45'::time,
       ARRAY[0,1,2,3,4,5,6]::smallint[], TRUE, NOW() - p.inicio_dias * INTERVAL '1 day'
  FROM demo_pac p WHERE p.base IS NOT NULL
UNION ALL
SELECT p.id_paciente, 'glicemia'::tipo_lembrete, 'Medir glicemia antes de dormir', NULL, '22:30'::time,
       ARRAY[0,1,2,3,4,5,6]::smallint[], TRUE, NOW() - p.inicio_dias * INTERVAL '1 day'
  FROM demo_pac p WHERE p.diabetes = 'tipo1'
UNION ALL
SELECT p.id_paciente, 'refeicao'::tipo_lembrete, 'Lanche da tarde', 'Conferir o plano alimentar', '16:00'::time,
       ARRAY[1,2,3,4,5]::smallint[], TRUE, NOW() - p.inicio_dias * INTERVAL '1 day'
  FROM demo_pac p JOIN demo_plano pl ON pl.chave = p.chave AND pl.atual;

INSERT INTO lembrete (id_paciente, tipo_lembrete, titulo, descricao, data_hora, recorrente, concluido, criado_em)
SELECT p.id_paciente, 'outro'::tipo_lembrete, 'Consulta de retorno', 'Retorno com ' || n.nome,
       pg_temp.em(pg_temp.hoje() + 3 + p.ordem % 14, '14:00'), FALSE, FALSE, NOW() - INTERVAL '10 days'
  FROM demo_pac p JOIN demo_nutri n ON n.chave = p.nutri
UNION ALL
SELECT p.id_paciente, 'outro'::tipo_lembrete, 'Exame de hemoglobina glicada', 'Levar o resultado para a consulta',
       pg_temp.em(pg_temp.hoje() - 20, '08:00'), FALSE, TRUE, NOW() - INTERVAL '35 days'
  FROM demo_pac p WHERE p.diabetes IN ('tipo1', 'tipo2') AND p.ordem % 2 = 1;

-- ---------- Mensagens ----------
CREATE TEMP TABLE demo_fala (tpl int, ordem int, quem char(1), minutos int, texto text) ON COMMIT DROP;
INSERT INTO demo_fala VALUES
  (1, 1, 'n',   0, 'Oi, {nome}! Vi que suas glicemias subiram bastante depois do almoço nesta semana. Aconteceu alguma coisa diferente na rotina?'),
  (1, 2, 'p',  40, 'Oi! Comi fora quase todo dia por causa do trabalho. Sei que exagerei na massa.'),
  (1, 3, 'n',  55, 'Entendo, acontece. Tente começar pela salada e pela proteína e deixar o carboidrato por último. Ajuda a segurar o pico.'),
  (1, 4, 'p',  70, 'Vou tentar. Posso trocar o arroz por batata-doce?'),
  (1, 5, 'n',  90, 'Pode, sim, na mesma quantidade do plano. Anota no app como ficou e a gente avalia no retorno.'),
  (1, 6, 'p', 300, 'Combinado. Hoje deu mais de 250 depois do almoço, isso me preocupou.'),

  (2, 1, 'p',   0, 'Bom dia! Tive uma hipoglicemia ontem à noite, deu 58. Comi uma fruta e melhorou.'),
  (2, 2, 'n',  25, 'Bom dia, {nome}! Que bom que você agiu rápido. Nessas horas prefira algo de absorção rápida, como suco, e meça de novo depois de 15 minutos.'),
  (2, 3, 'p',  35, 'Certo, vou deixar um suco na mesa de cabeceira.'),
  (2, 4, 'n',  50, 'Ótimo. Você jantou normalmente ontem? Fez exercício à tarde?'),
  (2, 5, 'p',  65, 'Jantei pouco e fiz uma caminhada mais longa.'),
  (2, 6, 'n',  80, 'Deve ter sido isso. Nos dias de exercício, vamos reforçar o lanche da tarde. Já deixei anotado no seu acompanhamento.'),

  (3, 1, 'n',   0, '{nome}, passei para dizer que seus registros estão ótimos! A maioria das medições ficou dentro da faixa neste mês.'),
  (3, 2, 'p',  60, 'Que notícia boa! O plano novo está ajudando muito.'),
  (3, 3, 'n',  90, 'Continue assim. Nosso retorno fica para o mês que vem, tudo bem?'),
  (3, 4, 'p', 120, 'Perfeito, agradeço pelo retorno!'),

  (4, 1, 'p',   0, 'Oi! Posso trocar o lanche da tarde por uma fruta?'),
  (4, 2, 'n',  30, 'Pode sim, {nome}. Uma fruta média com uma colher de aveia fica equivalente.'),
  (4, 3, 'p',  45, 'E o café da manhã, tenho que comer sempre o mesmo?'),
  (4, 4, 'n',  60, 'Não precisa. Deixei receitas no app que entram no mesmo lugar do plano, dá uma olhada.'),
  (4, 5, 'p', 240, 'Vi a panqueca de aveia e banana, vou testar no fim de semana. Ela conta como o pão do plano?'),

  (5, 1, 'n',   0, 'Olá, {nome}! Recebi seu aceite no NutriCare. Para começar, tente registrar a glicemia em jejum e depois do almoço nesta semana.'),
  (5, 2, 'p',  90, 'Oi! Pode deixar. Preciso registrar o que como também?'),
  (5, 3, 'n', 110, 'Sim, é o que me ajuda a montar seu plano. Não precisa ser perfeito, o importante é registrar.'),

  (6, 1, 'n',   0, 'Oi, {nome}, tudo bem? Notei que faz um tempo que você não registra nada no app. Aconteceu alguma coisa?'),

  (7, 1, 'p',   0, 'Oi! Minha glicemia está subindo faz uns dias e não sei o motivo.'),
  (7, 2, 'n',  35, 'Oi, {nome}. Estou vendo aqui. Mudou alguma coisa na alimentação, no sono ou nos remédios?'),
  (7, 3, 'p', 180, 'Mudei de turno no trabalho e estou jantando bem mais tarde.'),
  (7, 4, 'p', 182, 'Isso pode atrapalhar?'),

  (8, 1, 'p',   0, 'Oi! Aqui é a mãe do {nome}. A escola vai fazer um passeio na sexta. Como fica o lanche?'),
  (8, 2, 'n',  40, 'Oi! Mande uma fruta e cuscuz de milho com ovo, tudo sem glúten. Vale levar um suco pequeno para corrigir uma queda.'),
  (8, 3, 'p',  55, 'Perfeito. E a insulina do almoço?'),
  (8, 4, 'n',  75, 'Essa parte é com a endocrinologista. Depois me conta como foi a glicemia, vou acompanhar pelo app.'),

  (9, 1, 'p',   0, 'Boa tarde! O {nome} teve uma queda na aula de educação física hoje, deu 66.'),
  (9, 2, 'n',  30, 'Boa tarde! Conseguiram corrigir na hora?'),
  (9, 3, 'p',  50, 'Sim, a professora deu suco e mediu de novo depois.'),
  (9, 4, 'n',  70, 'Ótimo. Nos dias de educação física, vamos incluir um lanche antes da aula. Já deixei anotado.'),

  (10, 1, 'p',  0, 'Bom dia! Esqueci de medir à tarde de novo esta semana.'),
  (10, 2, 'n', 45, 'Bom dia, {nome}! Acontece. Que tal um lembrete no app para as 16h? Sua filha pode ajudar a configurar.'),
  (10, 3, 'p', 90, 'Boa ideia, vou pedir para ela.'),
  (10, 4, 'n', 100, 'Combinado. Sua glicemia de jejum está melhorando bastante, continue assim.'),

  (11, 1, 'p',  0, 'Boa noite! Perdi mais um quilo este mês.'),
  (11, 2, 'n', 50, 'Que ótimo, {nome}! E a glicemia de jejum também caiu. A caminhada depois do jantar está fazendo diferença.'),
  (11, 3, 'p', 70, 'Estou gostando. Só sinto fome no fim da tarde.'),
  (11, 4, 'n', 95, 'Vamos ajustar o lanche da tarde no próximo plano. Por enquanto, capriche na fruta com aveia.'),

  (12, 1, 'p',  0, 'Vou correr 10 km no domingo. Preciso mudar alguma coisa no café da manhã?'),
  (12, 2, 'n', 35, 'Boa, {nome}! Faça um café com carboidrato umas duas horas antes e leve uma fruta para o percurso.'),
  (12, 3, 'p', 50, 'E depois da prova?'),
  (12, 4, 'n', 65, 'Uma refeição com carboidrato e proteína. Meça a glicemia antes e depois e registre no app.'),

  (13, 1, 'p',  0, 'Oi! A obstetra pediu para eu medir depois de todas as refeições. Posso anotar só no app?'),
  (13, 2, 'n', 40, 'Pode, {nome}, e fica ótimo, porque já vejo tudo por aqui. Leve o app aberto na próxima consulta com ela.'),
  (13, 3, 'p', 200, 'Ótimo! Hoje deu 150 depois do almoço, está bom?'),

  (14, 1, 'p',  0, 'Oi! Vou viajar no fim de semana. Como fica o plano?'),
  (14, 2, 'n', 30, 'Oi, {nome}! Mantenha os horários o quanto der e leve lanches prontos, como fruta e castanhas.'),
  (14, 3, 'p', 45, 'E se eu comer fora?'),
  (14, 4, 'n', 60, 'Sem problema. Monte o prato com metade de salada e registre no app o que der.'),
  (14, 5, 'p', 75, 'Combinado, agradeço!'),

  (15, 1, 'p',  0, 'Bom dia! Aquela sopa de legumes da receita deu certo, fiz para a semana toda.'),
  (15, 2, 'n', 60, 'Que bom, {nome}! Pode congelar em porções e deixar pronta para os dias corridos.'),
  (15, 3, 'p', 90, 'Vou fazer isso, agradeço a dica!'),

  (16, 1, 'n',  0, '{nome}, vi que você manteve os exercícios neste mês. Parabéns! Como está sendo?'),
  (16, 2, 'p', 80, 'Estou indo três vezes por semana. Até dormi melhor.'),
  (16, 3, 'n', 110, 'Excelente. Vamos repetir os exames no próximo retorno para ver a evolução.'),

  (17, 1, 'p',  0, 'Oi! Estou com mais fome à noite agora no fim da gestação. É normal?'),
  (17, 2, 'n', 45, 'É comum, {nome}. Podemos reforçar a ceia com iogurte e fruta. Suas medições estão ótimas.'),
  (17, 3, 'p', 60, 'Que alívio, muito bom saber.');

-- nao_lidas: quantas mensagens do fim da conversa ainda não foram abertas.
INSERT INTO mensagem (id_vinculo, id_remetente, conteudo, lida_em, criado_em)
SELECT v.id_vinculo,
       CASE f.quem WHEN 'p' THEN p.id_usuario ELSE n.id_usuario END,
       replace(f.texto, '{nome}', split_part(p.nome, ' ', 1)),
       CASE WHEN f.ordem <= t.total - c.nao_lidas
            THEN NOW() - c.dias * INTERVAL '1 day' + (f.minutos + 20) * INTERVAL '1 minute' END,
       NOW() - c.dias * INTERVAL '1 day' + f.minutos * INTERVAL '1 minute'
  FROM (VALUES
    ('carlos',  1,  1, 1), ('maria',   2,  1, 0), ('roberto', 7,  1, 2), ('sofia',  12,  6, 0),
    ('lucia',   4,  1, 1), ('joao',   11,  3, 0), ('ana',     3,  8, 0), ('helena', 15, 10, 0),
    ('juliana',16, 15, 0), ('antonio',10,  5, 0), ('pedro',   8,  4, 0), ('bianca', 17, 12, 0),
    ('alex',    5,  2, 0), ('marcos',  6, 25, 1), ('thiago',  2,  3, 0), ('simone', 14,  2, 1),
    ('gustavo', 1,  1, 1), ('renata',  3,  9, 0), ('eduardo', 6,  6, 1), ('larissa', 3,  7, 0),
    ('vanessa',13,  2, 1), ('davi',    9,  4, 0)
  ) AS c(paciente, tpl, dias, nao_lidas)
  JOIN demo_pac p ON p.chave = c.paciente
  JOIN demo_nutri n ON n.chave = p.nutri
  JOIN nutricionista_paciente v
    ON v.id_paciente = p.id_paciente AND v.id_nutricionista = n.id_nutricionista AND v.ativo
  JOIN demo_fala f ON f.tpl = c.tpl
  JOIN (SELECT tpl, count(*) AS total FROM demo_fala GROUP BY tpl) t ON t.tpl = c.tpl;

-- ---------- Conteúdos educativos ----------
CREATE TEMP TABLE demo_conteudo (
  autor text, titulo text, resumo text, categoria text, publico text, publicado boolean,
  agendar_dias int, dias int, conteudo text
) ON COMMIT DROP;

INSERT INTO demo_conteudo VALUES
  ('camila', 'Como medir a glicemia do jeito certo', 'Passo a passo simples para confiar no número que aparece no aparelho.',
   'autocuidado', 'todos', TRUE, NULL, 150,
   'Lave e seque bem as mãos antes de medir: resto de açúcar nos dedos altera o resultado.

Use uma fita dentro da validade, faça o furo na lateral do dedo e espere a gota se formar sem apertar demais.

Registre o valor no aplicativo logo depois, dizendo em que momento mediu: em jejum, antes ou depois da refeição, antes de dormir. O mesmo número pode ser bom em um momento e alto em outro.'),
  ('camila', 'Hipoglicemia: como reconhecer e o que fazer', 'Tremor, suor frio e confusão pedem ação rápida.',
   'autocuidado', 'pacientes_diabetes', TRUE, NULL, 120,
   'Os sinais mais comuns são tremor, suor frio, fome repentina, tontura, irritação e dificuldade para pensar.

Se a medição estiver abaixo de 70 mg/dL, consuma algo de absorção rápida, como meio copo de suco de laranja ou uma colher de sopa de mel, e meça de novo depois de 15 minutos.

Se a pessoa estiver confusa ou desmaiada, não ofereça comida ou bebida: procure atendimento de emergência. Conte ao seu nutricionista sempre que acontecer.'),
  ('camila', 'Contagem de carboidratos: por onde começar', 'Entenda o que é e por que ajuda no controle da glicemia.',
   'alimentacao', 'pacientes_diabetes', TRUE, NULL, 95,
   'O carboidrato é o nutriente que mais influencia a glicemia depois da refeição. Ele está no arroz, no pão, nas massas, nas frutas e nos doces.

Contar carboidratos é somar quantos gramas existem em cada refeição. No aplicativo, escolha o alimento e informe a quantidade: o sistema faz a conta.

Não existe alimento proibido. O objetivo é saber quanto se come para combinar melhor as refeições com o seu plano.'),
  ('beatriz', 'Como montar um prato equilibrado', 'Uma regra visual para usar em casa e no restaurante.',
   'alimentacao', 'todos', TRUE, NULL, 80,
   'Imagine o prato dividido em quatro partes. Metade dele fica com verduras e legumes.

Um quarto fica com uma proteína, como frango, peixe, carne magra, ovos ou leguminosas.

O outro quarto fica com carboidratos, de preferência integrais, como arroz integral ou batata-doce. Essa divisão ajuda a controlar a quantidade sem precisar pesar tudo.'),
  ('rafael', 'Caminhar depois das refeições ajuda?', 'Poucos minutos de movimento já fazem diferença.',
   'exercicio', 'todos', TRUE, NULL, 60,
   'Depois de comer, a glicemia tende a subir. Os músculos em movimento usam parte dessa glicose como energia.

Uma caminhada leve de 10 a 15 minutos depois do almoço ou do jantar é uma forma simples de começar.

Se você usa insulina ou remédio que pode causar hipoglicemia, meça antes de sair e leve algo para corrigir uma queda.'),
  ('rafael', 'Atividade física com segurança', 'O que conferir antes, durante e depois do treino.',
   'exercicio', 'adultos', TRUE, NULL, 45,
   'Antes de treinar, meça a glicemia. Valores muito baixos pedem um lanche, e valores muito altos pedem conversa com o profissional que acompanha você.

Durante o treino, beba água e leve um alimento de absorção rápida.

Depois do exercício, a glicemia pode continuar caindo por várias horas. Registre no aplicativo para entender como o seu corpo responde.'),
  ('camila', 'Guardando a insulina do jeito certo', 'Temperatura errada faz o medicamento perder o efeito.',
   'medicamento', 'pacientes_diabetes', TRUE, NULL, 30,
   'A insulina fechada fica na geladeira, longe do congelador e fora da porta, onde a temperatura varia mais.

Depois de aberta, siga a orientação da bula sobre temperatura e prazo de uso.

Não deixe o frasco ou a caneta no carro, ao sol ou perto do fogão. Em viagens, use uma bolsa térmica sem contato direto com gelo.'),
  ('beatriz', 'Esqueci de tomar o remédio. E agora?', 'O que fazer quando a dose fica para trás.',
   'medicamento', 'todos', TRUE, NULL, 21,
   'Não dobre a dose por conta própria. O que fazer depende do medicamento e do tempo que passou, e essa orientação vem de quem prescreveu.

Use os lembretes do aplicativo para criar um horário fixo. Associar o remédio a uma refeição também ajuda.

Se esquecer com frequência, conte ao seu nutricionista e ao médico: às vezes dá para ajustar os horários à sua rotina.'),
  ('camila', 'Cuidados com os pés no dia a dia', 'Pequenos hábitos evitam grandes problemas.',
   'autocuidado', 'pacientes_diabetes', TRUE, NULL, 14,
   'Olhe os pés todos os dias, inclusive entre os dedos e na sola. Use um espelho ou peça ajuda se precisar.

Lave com água morna, seque bem e hidrate, sem passar creme entre os dedos.

Prefira sapatos fechados e confortáveis e não ande descalço. Qualquer ferida que demore a cicatrizar precisa ser avaliada.'),
  ('rafael', 'Sono, estresse e glicemia', 'Por que uma noite ruim pode aparecer no número da manhã.',
   'geral', 'todos', TRUE, NULL, 7,
   'Dormir pouco e passar por momentos de estresse podem elevar a glicemia, mesmo sem mudança na alimentação.

Registrar como você se sente no aplicativo ajuda o seu nutricionista a enxergar essa relação nas consultas.

Manter horários regulares, reduzir telas antes de deitar e reservar um tempo para descansar são bons pontos de partida.'),
  ('camila', 'Lendo rótulos no supermercado', 'O que olhar primeiro na embalagem.',
   'alimentacao', 'todos', FALSE, NULL, 3,
   'Rascunho: falta revisar com a equipe de Nutrição antes de publicar.

Comece pela porção indicada, depois veja os carboidratos e os açúcares adicionados.'),
  ('camila', 'Festas de fim de ano sem culpa', 'Como aproveitar as comemorações cuidando da glicemia.',
   'geral', 'todos', TRUE, 15, 1,
   'Não pule refeições para compensar a ceia: isso aumenta o risco de exagero e de queda da glicemia.

Sirva primeiro as saladas e as proteínas, escolha uma sobremesa de que goste muito e aproveite com calma.

No dia seguinte, volte à rotina normal. Uma refeição não desfaz o seu cuidado.');

DELETE FROM conteudo_educativo c
 USING demo_conteudo d, demo_nutri n
 WHERE c.titulo = d.titulo AND n.chave = 'camila' AND c.id_autor = n.id_usuario;

INSERT INTO conteudo_educativo (id_autor, titulo, resumo, conteudo, categoria, publicado, publico, agendado_em, criado_em)
SELECT n.id_usuario, d.titulo, d.resumo, d.conteudo, d.categoria, d.publicado, d.publico,
       CASE WHEN d.agendar_dias IS NOT NULL THEN pg_temp.em(pg_temp.hoje() + d.agendar_dias, '09:00') END,
       NOW() - d.dias * INTERVAL '1 day'
  FROM demo_conteudo d JOIN demo_nutri n ON n.chave = d.autor;

-- ---------- Receitas ----------
CREATE TEMP TABLE demo_receita (
  autor text, titulo text, resumo text, categoria text, publicada boolean, dias int,
  porcoes int, tempo int, kcal numeric, carboidratos numeric, proteinas numeric, lipidios numeric,
  ingredientes text, modo_preparo text
) ON COMMIT DROP;

INSERT INTO demo_receita VALUES
  ('camila', 'Panqueca de aveia e banana', 'Rápida, sem açúcar e com as fibras da aveia.', 'Café da manhã', TRUE, 140, 2, 15, 212, 24.0, 11.5, 7.5,
   '1 banana prata madura
2 ovos
4 colheres de sopa de aveia em flocos
Canela a gosto',
   'Amasse a banana e misture com os ovos e a aveia até formar uma massa. Aqueça uma frigideira antiaderente, despeje pequenas porções e doure dos dois lados. Polvilhe canela.'),
  ('camila', 'Omelete de legumes', 'Proteína e fibras para começar bem o dia.', 'Café da manhã', TRUE, 120, 1, 10, 195, 6.0, 14.5, 12.5,
   '2 ovos
2 colheres de sopa de abobrinha ralada
1 tomate pequeno picado
Cheiro-verde e sal a gosto',
   'Bata os ovos, junte os legumes e tempere. Despeje em frigideira antiaderente e cozinhe em fogo baixo com tampa até firmar. Dobre ao meio e sirva.'),
  ('rafael', 'Cuscuz com ovo e tomate', 'Clássico nordestino, sem glúten e com boa saciedade.', 'Café da manhã', TRUE, 100, 1, 15, 268, 34.0, 12.0, 8.5,
   '1/2 xícara de flocos de milho
1 ovo
1 tomate picado
Sal e orégano a gosto',
   'Hidrate os flocos com água e sal por 5 minutos e cozinhe no vapor por 10 minutos. Prepare o ovo mexido com o tomate e sirva por cima.'),
  ('camila', 'Frango grelhado com legumes', 'Prato completo para o almoço do dia a dia.', 'Almoço', TRUE, 110, 2, 30, 310, 14.0, 38.0, 10.5,
   '2 filés de peito de frango
1 abobrinha em rodelas
1 cenoura em palitos
1 colher de sopa de azeite
Alho, limão e sal a gosto',
   'Tempere o frango com alho, limão e sal e deixe descansar por 10 minutos. Grelhe em frigideira quente. Na mesma frigideira, salteie os legumes com o azeite até ficarem macios e crocantes.'),
  ('beatriz', 'Arroz integral com brócolis', 'Acompanhamento rico em fibras.', 'Almoço', TRUE, 90, 4, 40, 165, 30.0, 5.0, 3.0,
   '1 xícara de arroz integral
2 xícaras de brócolis picado
1 dente de alho
1 colher de chá de azeite
Sal a gosto',
   'Refogue o alho no azeite, junte o arroz e cubra com água quente. Cozinhe até quase secar, acrescente o brócolis e tampe por 5 minutos.'),
  ('camila', 'Salada de grão-de-bico', 'Leguminosa, cor e frescor em uma tigela.', 'Almoço', TRUE, 70, 3, 20, 225, 28.0, 10.5, 7.5,
   '2 xícaras de grão-de-bico cozido
1 tomate picado
1 pepino picado
1/2 cebola roxa
Azeite, limão e salsinha a gosto',
   'Misture todos os ingredientes em uma tigela, tempere com azeite, limão e sal e deixe na geladeira por 15 minutos antes de servir.'),
  ('rafael', 'Tilápia assada com batata-doce', 'Jantar leve, feito em uma assadeira só.', 'Jantar', TRUE, 65, 2, 40, 330, 30.0, 32.0, 8.5,
   '2 filés de tilápia
2 batatas-doces médias em rodelas
1 colher de sopa de azeite
Limão, páprica e sal a gosto',
   'Distribua a batata-doce em uma assadeira, regue com azeite e asse por 20 minutos a 200 graus. Coloque os filés temperados por cima e asse por mais 15 minutos.'),
  ('camila', 'Sopa de legumes com frango', 'Reconfortante, boa para os dias mais frios.', 'Jantar', TRUE, 55, 4, 35, 190, 18.0, 20.0, 4.0,
   '200 g de peito de frango em cubos
1 cenoura
1 chuchu
1 abobrinha
1 cebola e 2 dentes de alho
Sal e salsinha a gosto',
   'Doure o frango com a cebola e o alho. Junte os legumes em cubos, cubra com água e cozinhe até ficarem macios. Finalize com salsinha.'),
  ('beatriz', 'Creme de abóbora com gengibre', 'Sopa cremosa sem creme de leite.', 'Jantar', TRUE, 40, 4, 30, 120, 22.0, 3.0, 2.5,
   '500 g de abóbora em cubos
1 cebola
1 pedaço pequeno de gengibre
1 colher de chá de azeite
Sal a gosto',
   'Refogue a cebola e o gengibre no azeite, junte a abóbora e cubra com água. Cozinhe até amaciar e bata no liquidificador até ficar cremoso.'),
  ('camila', 'Mousse de maracujá com iogurte', 'Sobremesa leve, sem açúcar adicionado.', 'Sobremesa', TRUE, 35, 4, 15, 95, 9.0, 7.0, 3.0,
   '2 potes de iogurte natural desnatado
1 envelope de gelatina sem sabor
Polpa de 2 maracujás
Adoçante a gosto',
   'Dissolva a gelatina conforme a embalagem. Bata com o iogurte, a polpa e o adoçante. Leve à geladeira por pelo menos 3 horas.'),
  ('beatriz', 'Gelatina com frutas vermelhas', 'Refrescante e pronta com antecedência.', 'Sobremesa', TRUE, 25, 4, 10, 45, 8.0, 2.0, 0.2,
   '1 envelope de gelatina sem açúcar
1 xícara de morangos picados
1/2 xícara de amoras',
   'Prepare a gelatina conforme a embalagem, distribua as frutas em potes, cubra com a gelatina e leve à geladeira até firmar.'),
  ('rafael', 'Homus de grão-de-bico', 'Pasta para lanches, com legumes crus.', 'Lanche', TRUE, 20, 6, 15, 110, 11.0, 4.5, 5.5,
   '2 xícaras de grão-de-bico cozido
2 colheres de sopa de tahine
Suco de 1 limão
1 dente de alho
Sal a gosto',
   'Bata tudo no processador com um pouco de água até virar um creme liso. Sirva com palitos de cenoura e pepino.'),
  ('camila', 'Muffin de banana e aveia', 'Lanche para levar na bolsa.', 'Lanche', TRUE, 12, 6, 30, 130, 18.0, 5.0, 4.5,
   '2 bananas maduras
2 ovos
1 xícara de aveia em flocos
1 colher de chá de fermento
Canela a gosto',
   'Amasse as bananas, misture com os ovos, a aveia e a canela e por último o fermento. Distribua em forminhas e asse a 180 graus por 20 minutos.'),
  ('camila', 'Chips de batata-doce assada', 'Rascunho: falta conferir os valores por porção.', 'Lanche', FALSE, 2, 2, 35, 140, 26.0, 2.0, 3.0,
   '2 batatas-doces médias
1 colher de chá de azeite
Sal e páprica a gosto',
   'Fatie bem fino, tempere e asse a 180 graus até dourar, virando na metade do tempo.');

DELETE FROM receita r
 USING demo_receita d, demo_nutri n
 WHERE r.titulo = d.titulo AND n.chave = 'camila' AND r.id_autor = n.id_usuario;

INSERT INTO receita (id_autor, titulo, resumo, ingredientes, modo_preparo, porcoes, tempo_preparo_min, kcal_porcao,
                     carboidratos_porcao, proteinas_porcao, lipidios_porcao, categoria, publicado, criado_em)
SELECT n.id_usuario, d.titulo, d.resumo, d.ingredientes, d.modo_preparo, d.porcoes, d.tempo, d.kcal,
       d.carboidratos, d.proteinas, d.lipidios, d.categoria, d.publicada, NOW() - d.dias * INTERVAL '1 day'
  FROM demo_receita d JOIN demo_nutri n ON n.chave = d.autor;

-- ---------- Notificações ----------
-- Os mesmos títulos e textos que registros.service.ts e convites.service.ts gravam.
INSERT INTO notificacao (id_usuario, tipo, titulo, mensagem, lida, criado_em)
SELECT n.id_usuario, 'alerta_glicemia', 'Alerta glicêmico crítico',
       format('Um paciente registrou %s mg/dL (%s).', rg.valor::int,
              CASE WHEN rg.valor < 54 THEN 'hipoglicemia grave' ELSE 'hiperglicemia grave' END),
       rg.data_hora < NOW() - INTERVAL '3 days', rg.data_hora
  FROM registro_glicemia rg
  JOIN demo_pac p ON p.id_paciente = rg.id_paciente
  JOIN demo_nutri n ON n.chave = p.nutri
 WHERE rg.data_hora > NOW() - INTERVAL '30 days'
   AND (rg.valor < 54 OR rg.valor > 250);

INSERT INTO notificacao (id_usuario, tipo, titulo, mensagem, lida, criado_em)
SELECT n.id_usuario, 'sistema', 'Convite aceito',
       p.nome || ' aceitou o acompanhamento e já aparece na sua lista de pacientes.',
       p.inicio_dias > 7, NOW() - p.inicio_dias * INTERVAL '1 day'
  FROM demo_pac p JOIN demo_nutri n ON n.chave = p.nutri
 WHERE p.inicio_dias <= 75;

INSERT INTO notificacao (id_usuario, tipo, titulo, mensagem, lida, criado_em)
SELECT n.id_usuario, 'sistema', 'Convite recusado',
       p.nome || ' recusou o convite de acompanhamento.', TRUE, NOW() - INTERVAL '7 days'
  FROM demo_pac p, demo_nutri n WHERE p.chave = 'marcio' AND n.chave = 'rafael';

INSERT INTO notificacao (id_usuario, tipo, titulo, mensagem, lida, criado_em)
SELECT n.id_usuario, 'sistema', 'Acompanhamento encerrado',
       p.nome || ' encerrou o acompanhamento com você.', TRUE, NOW() - (p.inicio_dias + 1) * INTERVAL '1 day'
  FROM demo_pac p, demo_nutri n WHERE p.chave = 'renata' AND n.chave = 'camila';

INSERT INTO notificacao (id_usuario, tipo, titulo, mensagem, criado_em)
SELECT p.id_usuario, 'sistema', 'Convite de acompanhamento',
       n.nome || ' quer acompanhar sua saúde pelo NutriCare. Abra o aplicativo para aceitar ou recusar.',
       s.criado_em
  FROM solicitacao_vinculo s
  JOIN demo_pac p ON p.id_paciente = s.id_paciente
  JOIN demo_nutri n ON n.id_nutricionista = s.id_nutricionista
 WHERE s.status = 'pendente';

COMMIT;

SELECT tabela, total FROM (VALUES
  (1,  'usuarios',       (SELECT count(*) FROM usuario)),
  (2,  'pacientes',      (SELECT count(*) FROM paciente)),
  (3,  'nutricionistas', (SELECT count(*) FROM nutricionista)),
  (4,  'vinculos_ativos',(SELECT count(*) FROM nutricionista_paciente WHERE ativo)),
  (5,  'convites',       (SELECT count(*) FROM solicitacao_vinculo)),
  (6,  'glicemias',      (SELECT count(*) FROM registro_glicemia)),
  (7,  'refeicoes',      (SELECT count(*) FROM registro_refeicao)),
  (8,  'humor',          (SELECT count(*) FROM registro_emocional)),
  (9,  'medidas',        (SELECT count(*) FROM registro_antropometrico)),
  (10, 'medicamentos',   (SELECT count(*) FROM medicamento)),
  (11, 'restricoes',     (SELECT count(*) FROM restricao_alimentar)),
  (12, 'anotacoes',      (SELECT count(*) FROM anotacao_paciente)),
  (13, 'planos',         (SELECT count(*) FROM plano_alimentar)),
  (14, 'refeicoes_plano',(SELECT count(*) FROM refeicao)),
  (15, 'itens_plano',    (SELECT count(*) FROM refeicao_item)),
  (16, 'lembretes',      (SELECT count(*) FROM lembrete)),
  (17, 'mensagens',      (SELECT count(*) FROM mensagem)),
  (18, 'conteudos',      (SELECT count(*) FROM conteudo_educativo)),
  (19, 'receitas',       (SELECT count(*) FROM receita)),
  (20, 'notificacoes',   (SELECT count(*) FROM notificacao))
) AS t(ordem, tabela, total)
ORDER BY ordem;
