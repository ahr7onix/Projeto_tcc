-- =====================================================================
-- Projeto TCC — Seeds de exemplo
-- Rode DEPOIS de schema.sql.
-- Senhas abaixo são hash bcrypt de "Senha123!" (apenas para desenvolvimento).
-- O hash foi gerado com o bcryptjs da API e conferido com compareSync — o valor
-- anterior era um placeholder que não batia com senha nenhuma, então ninguém
-- conseguia entrar com os usuários de exemplo.
-- =====================================================================

BEGIN;

-- ---------- Usuários ----------
INSERT INTO usuario (nome, email, senha, tipo) VALUES
    ('Dra. Camila Souza',  'camila.souza@nutri.com',     '$2a$10$KCN6lz1JkKCSywueeO7w.OTS149BPYWvmohLziUm4G7U2khHHrmMq', 'nutricionista'),
    ('João da Silva',      'joao.silva@email.com',       '$2a$10$KCN6lz1JkKCSywueeO7w.OTS149BPYWvmohLziUm4G7U2khHHrmMq', 'paciente'),
    ('Maria Oliveira',     'maria.oliveira@email.com',   '$2a$10$KCN6lz1JkKCSywueeO7w.OTS149BPYWvmohLziUm4G7U2khHHrmMq', 'paciente');

-- ---------- Nutricionista ----------
INSERT INTO nutricionista (id_usuario, crn, especialidade)
SELECT id_usuario, 'CRN-3/12345', 'Nutrição clínica e diabetes'
FROM usuario WHERE email = 'camila.souza@nutri.com';

-- ---------- Pacientes ----------
INSERT INTO paciente (id_usuario, data_nascimento, genero, tipo_diabetes, restricoes_alergias, peso, altura)
SELECT id_usuario, '1985-04-12', 'masculino', 'tipo2', 'Sem alergias conhecidas', 88.30, 1.78
FROM usuario WHERE email = 'joao.silva@email.com';

INSERT INTO paciente (id_usuario, data_nascimento, genero, tipo_diabetes, restricoes_alergias, peso, altura)
SELECT id_usuario, '1992-09-30', 'feminino', 'tipo1', 'Lactose', 62.10, 1.65
FROM usuario WHERE email = 'maria.oliveira@email.com';

-- ---------- Vínculos nutricionista ↔ paciente ----------
-- Sem isto os dois pacientes existem no banco mas não aparecem para a Dra.
-- Camila, porque o painel só mostra quem está vinculado (RN02). A tela de
-- demonstração ficaria vazia.
INSERT INTO nutricionista_paciente (id_nutricionista, id_paciente)
SELECT n.id_nutricionista, p.id_paciente
FROM nutricionista n
JOIN usuario un ON un.id_usuario = n.id_usuario AND un.email = 'camila.souza@nutri.com'
CROSS JOIN (
    SELECT p.id_paciente
    FROM paciente p
    JOIN usuario u USING(id_usuario)
    WHERE u.email IN ('joao.silva@email.com', 'maria.oliveira@email.com')
) p;

-- ---------- Registros de glicemia (João) ----------
INSERT INTO registro_glicemia (id_paciente, valor, data_hora, momento, observacao)
SELECT p.id_paciente, 110, NOW() - INTERVAL '2 days' + TIME '07:00', 'jejum', NULL
FROM paciente p JOIN usuario u USING(id_usuario) WHERE u.email = 'joao.silva@email.com';

INSERT INTO registro_glicemia (id_paciente, valor, data_hora, momento, observacao)
SELECT p.id_paciente, 165, NOW() - INTERVAL '2 days' + TIME '12:30', 'pos_prandial', 'Almoço com arroz'
FROM paciente p JOIN usuario u USING(id_usuario) WHERE u.email = 'joao.silva@email.com';

INSERT INTO registro_glicemia (id_paciente, valor, data_hora, momento, observacao)
SELECT p.id_paciente, 98, NOW() - INTERVAL '1 day' + TIME '07:15', 'jejum', NULL
FROM paciente p JOIN usuario u USING(id_usuario) WHERE u.email = 'joao.silva@email.com';

-- ---------- Registros de glicemia (Maria) ----------
INSERT INTO registro_glicemia (id_paciente, valor, data_hora, momento, observacao)
SELECT p.id_paciente, 142, NOW() - INTERVAL '1 day' + TIME '08:00', 'pre_prandial', NULL
FROM paciente p JOIN usuario u USING(id_usuario) WHERE u.email = 'maria.oliveira@email.com';

INSERT INTO registro_glicemia (id_paciente, valor, data_hora, momento, observacao)
SELECT p.id_paciente, 78, NOW() - INTERVAL '3 hours', 'antes_dormir', 'Sentindo tremores leves'
FROM paciente p JOIN usuario u USING(id_usuario) WHERE u.email = 'maria.oliveira@email.com';

-- ---------- Medicamentos ----------
INSERT INTO medicamento (id_paciente, nome_medicamento, dosagem, frequencia, horario_inicial)
SELECT p.id_paciente, 'Metformina', '850 mg', '12 em 12h', '08:00'
FROM paciente p JOIN usuario u USING(id_usuario) WHERE u.email = 'joao.silva@email.com';

INSERT INTO medicamento (id_paciente, nome_medicamento, dosagem, frequencia, horario_inicial)
SELECT p.id_paciente, 'Insulina NPH', '10 UI', '8 em 8h', '07:00'
FROM paciente p JOIN usuario u USING(id_usuario) WHERE u.email = 'maria.oliveira@email.com';

-- ---------- Plano alimentar para João ----------
WITH n AS (SELECT id_nutricionista FROM nutricionista LIMIT 1),
     p AS (SELECT p.id_paciente FROM paciente p JOIN usuario u USING(id_usuario) WHERE u.email = 'joao.silva@email.com')
INSERT INTO plano_alimentar (id_paciente, id_nutricionista, data_inicio, data_fim)
SELECT p.id_paciente, n.id_nutricionista, CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE + INTERVAL '30 days'
FROM p, n;

-- ---------- Refeições do plano do João ----------
WITH plano AS (
    SELECT pa.id_plano
    FROM plano_alimentar pa
    JOIN paciente p   ON p.id_paciente = pa.id_paciente
    JOIN usuario  u   ON u.id_usuario  = p.id_usuario
    WHERE u.email = 'joao.silva@email.com'
    ORDER BY pa.criado_em DESC
    LIMIT 1
)
INSERT INTO refeicao (id_plano, nome_refeicao, horario, itens)
-- O cast ::TIME e obrigatorio: dentro de um UNION ALL o Postgres resolve os
-- literais como text antes de chegar no INSERT, e a coercao para TIME nao
-- acontece mais. Sem ele o seed falha com "column horario is of type time
-- without time zone but expression is of type text".
SELECT id_plano, 'Café da manhã', '07:30'::TIME, '1 fatia de pão integral, 1 ovo mexido, 1 fruta, café sem açúcar' FROM plano
UNION ALL
SELECT id_plano, 'Almoço',        '12:00'::TIME, 'Salada verde, 100g frango grelhado, 4 colheres de arroz integral, feijão' FROM plano
UNION ALL
SELECT id_plano, 'Lanche',        '16:00'::TIME, 'Iogurte natural com castanhas' FROM plano
UNION ALL
SELECT id_plano, 'Jantar',        '19:30'::TIME, 'Sopa de legumes com proteína magra' FROM plano;

-- ---------- Lembretes ----------
-- Lembrete de medicamento (João — Metformina)
INSERT INTO lembrete (id_paciente, tipo_lembrete, id_uso, descricao, data_hora, concluido)
SELECT m.id_paciente, 'medicamento', m.id_uso, 'Tomar Metformina', NOW() + INTERVAL '4 hours', FALSE
FROM medicamento m JOIN paciente p ON p.id_paciente = m.id_paciente
JOIN usuario u ON u.id_usuario = p.id_usuario
WHERE u.email = 'joao.silva@email.com' AND m.nome_medicamento = 'Metformina';

-- Lembrete de glicemia (Maria — antes de dormir)
INSERT INTO lembrete (id_paciente, tipo_lembrete, id_glicemia, descricao, data_hora, concluido)
SELECT g.id_paciente, 'glicemia', g.id_glicemia, 'Conferir glicemia antes de dormir', NOW() + INTERVAL '1 day', FALSE
FROM registro_glicemia g
JOIN paciente p ON p.id_paciente = g.id_paciente
JOIN usuario  u ON u.id_usuario  = p.id_usuario
WHERE u.email = 'maria.oliveira@email.com'
ORDER BY g.data_hora DESC LIMIT 1;

-- Lembrete de refeição (João — almoço amanhã)
INSERT INTO lembrete (id_paciente, tipo_lembrete, id_refeicao, descricao, data_hora, concluido)
SELECT pa.id_paciente, 'refeicao', r.id_refeicao, 'Hora do almoço — siga o plano', (CURRENT_DATE + INTERVAL '1 day' + TIME '12:00')::TIMESTAMPTZ, FALSE
FROM refeicao r
JOIN plano_alimentar pa ON pa.id_plano = r.id_plano
JOIN paciente p ON p.id_paciente = pa.id_paciente
JOIN usuario  u ON u.id_usuario  = p.id_usuario
WHERE u.email = 'joao.silva@email.com' AND r.nome_refeicao = 'Almoço';

COMMIT;
