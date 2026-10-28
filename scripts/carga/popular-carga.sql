-- Volume sintético para o teste de carga (docs/ANALISE_DESEMPENHO.md).
-- SÓ em banco descartável, preparado antes com SEED_DEMO=true: a senha de todos
-- os usuários criados aqui é a da Camila do seed (Senha123!).
--
-- 20 nutricionistas x 50 pacientes = 1000 pacientes, 90 dias de uso:
-- 5 glicemias e 4 refeições por dia, 1 humor por dia, 20 mensagens por vínculo.
-- Logins: nutri1..nutri20@carga.local e pac1..pac1000@carga.local.
BEGIN;

CREATE TEMP TABLE hash AS
  SELECT senha FROM usuario WHERE email = 'camila.souza@nutri.com';

INSERT INTO usuario (nome, email, senha, tipo)
SELECT 'Nutri Carga ' || n, 'nutri' || n || '@carga.local', (SELECT senha FROM hash), 'nutricionista'
  FROM generate_series(1, 20) n;

INSERT INTO nutricionista (id_usuario, crn, perfil_completo, aprovado_em)
SELECT id_usuario, 'CRN-C' || substring(email from 'nutri(\d+)@'), TRUE, NOW()
  FROM usuario WHERE email LIKE 'nutri%@carga.local';

INSERT INTO usuario (nome, email, senha, tipo)
SELECT 'Paciente Carga ' || p, 'pac' || p || '@carga.local', (SELECT senha FROM hash), 'paciente'
  FROM generate_series(1, 1000) p;

INSERT INTO paciente (id_usuario, data_nascimento, genero, tipo_diabetes, peso, altura, nivel_atividade)
SELECT id_usuario, DATE '1970-01-01' + (random() * 15000)::int, 'feminino', 'tipo2', 70 + random() * 30, 1.55 + random() * 0.3, 'leve'
  FROM usuario WHERE email LIKE 'pac%@carga.local';

-- paciente N fica com o nutricionista ((N-1) / 50) + 1
INSERT INTO nutricionista_paciente (id_nutricionista, id_paciente, criado_em)
SELECT n.id_nutricionista, p.id_paciente, NOW() - INTERVAL '120 days'
  FROM paciente p
  JOIN usuario up ON up.id_usuario = p.id_usuario AND up.email LIKE 'pac%@carga.local'
  JOIN usuario un ON un.email = 'nutri' || (((substring(up.email from 'pac(\d+)@')::int - 1) / 50) + 1) || '@carga.local'
  JOIN nutricionista n ON n.id_usuario = un.id_usuario;

CREATE TEMP TABLE pac AS
  SELECT p.id_paciente, p.id_usuario FROM paciente p
  JOIN usuario u ON u.id_usuario = p.id_usuario AND u.email LIKE 'pac%@carga.local';

INSERT INTO registro_glicemia (id_paciente, valor, momento, data_hora)
SELECT pac.id_paciente,
       round((60 + random() * 220)::numeric, 1),
       (ARRAY['jejum','pre_prandial','pos_prandial','antes_dormir','aleatorio']::momento_glicemia[])[m],
       date_trunc('day', NOW()) - d * INTERVAL '1 day' + (6 + m * 3) * INTERVAL '1 hour'
  FROM pac, generate_series(0, 89) d, generate_series(1, 5) m;

INSERT INTO registro_refeicao (id_paciente, descricao, tipo_refeicao, carboidratos, kcal, data_hora)
SELECT pac.id_paciente, 'Refeição de teste',
       (ARRAY['cafe','almoco','lanche','jantar'])[m],
       round((20 + random() * 60)::numeric, 1), round((200 + random() * 500)::numeric, 1),
       date_trunc('day', NOW()) - d * INTERVAL '1 day' + (7 + m * 3) * INTERVAL '1 hour'
  FROM pac, generate_series(0, 89) d, generate_series(1, 4) m;

INSERT INTO registro_emocional (id_paciente, estado, intensidade, data_hora)
SELECT pac.id_paciente, 'bem', 3, date_trunc('day', NOW()) - d * INTERVAL '1 day' + INTERVAL '20 hours'
  FROM pac, generate_series(0, 89) d;

INSERT INTO medicamento (id_paciente, nome_medicamento, dosagem, frequencia, horario_inicial)
SELECT pac.id_paciente, 'Metformina', '500 mg', '12 em 12h', TIME '08:00' FROM pac;

INSERT INTO lembrete (id_paciente, tipo_lembrete, titulo, hora, dias_semana, recorrente)
SELECT pac.id_paciente, 'glicemia', 'Medir glicemia', TIME '07:00' + h * INTERVAL '4 hours', ARRAY[0,1,2,3,4,5,6]::smallint[], TRUE
  FROM pac, generate_series(0, 3) h;

INSERT INTO plano_alimentar (id_paciente, id_nutricionista, data_inicio, vet_kcal, perc_carboidratos, perc_proteinas, perc_lipidios)
SELECT np.id_paciente, np.id_nutricionista, CURRENT_DATE - 30, 1800, 50, 20, 30
  FROM nutricionista_paciente np JOIN pac ON pac.id_paciente = np.id_paciente;

INSERT INTO refeicao (id_plano, nome_refeicao, horario, itens)
SELECT pl.id_plano, (ARRAY['café da manhã','almoço','lanche','jantar','ceia'])[r], TIME '07:00' + r * INTERVAL '3 hours', 'itens'
  FROM plano_alimentar pl JOIN pac ON pac.id_paciente = pl.id_paciente, generate_series(1, 5) r;

INSERT INTO refeicao_item (id_refeicao, id_alimento, quantidade_g)
SELECT rf.id_refeicao, (SELECT min(id_alimento) FROM alimento) + i, 50 * i
  FROM refeicao rf JOIN plano_alimentar pl ON pl.id_plano = rf.id_plano JOIN pac ON pac.id_paciente = pl.id_paciente,
       generate_series(1, 3) i;

-- 20 mensagens por vínculo, alternando remetente; as 2 últimas do paciente sem ler
INSERT INTO mensagem (id_vinculo, id_remetente, conteudo, criado_em, lida_em)
SELECT np.id_vinculo,
       CASE WHEN k % 2 = 0 THEN n.id_usuario ELSE p.id_usuario END,
       'Mensagem de teste ' || k,
       NOW() - (20 - k) * INTERVAL '1 hour',
       CASE WHEN k >= 19 THEN NULL ELSE NOW() - (20 - k) * INTERVAL '1 hour' END
  FROM nutricionista_paciente np
  JOIN pac p ON p.id_paciente = np.id_paciente
  JOIN nutricionista n ON n.id_nutricionista = np.id_nutricionista,
       generate_series(1, 20) k;

INSERT INTO notificacao (id_usuario, tipo, titulo, mensagem, lida, criado_em)
SELECT n.id_usuario, 'alerta_glicemia', 'Alerta glicêmico crítico', 'Um paciente registrou 45 mg/dL.', k > 10, NOW() - k * INTERVAL '1 day'
  FROM nutricionista n JOIN usuario u ON u.id_usuario = n.id_usuario AND u.email LIKE 'nutri%@carga.local',
       generate_series(1, 60) k;

COMMIT;
ANALYZE;
