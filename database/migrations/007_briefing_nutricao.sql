

BEGIN;

-- ---------- Tipos novos ----------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_emocional') THEN
        CREATE TYPE estado_emocional AS ENUM
            ('muito_bem', 'bem', 'neutro', 'mal', 'muito_mal');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'nivel_atividade') THEN
        CREATE TYPE nivel_atividade AS ENUM
            ('sedentario', 'leve', 'moderado', 'intenso', 'muito_intenso');
    END IF;
END $$;

-- =====================================================================
-- RF01 — Tabela de alimentos
-- Os valores nutricionais são sempre relativos a `porcao_g` gramas
-- (padrão 100 g, como nas tabelas TACO e IBGE).
-- =====================================================================
CREATE TABLE IF NOT EXISTS alimento (
    id_alimento      BIGSERIAL     PRIMARY KEY,
    nome             VARCHAR(160)  NOT NULL CHECK (length(trim(nome)) > 0),
    grupo            VARCHAR(60)   NOT NULL DEFAULT 'outros',
    medida_caseira   VARCHAR(80),                    -- ex: "1 fatia média"
    medida_caseira_g NUMERIC(7,2),                   -- quantos gramas tem essa medida
    porcao_g         NUMERIC(7,2)  NOT NULL DEFAULT 100 CHECK (porcao_g > 0),
    kcal             NUMERIC(7,2)  NOT NULL CHECK (kcal >= 0),
    carboidratos_g   NUMERIC(7,2)  NOT NULL CHECK (carboidratos_g >= 0),
    proteinas_g      NUMERIC(7,2)  NOT NULL CHECK (proteinas_g >= 0),
    lipidios_g       NUMERIC(7,2)  NOT NULL CHECK (lipidios_g >= 0),
    fibras_g         NUMERIC(7,2)  CHECK (fibras_g IS NULL OR fibras_g >= 0),
    indice_glicemico SMALLINT      CHECK (indice_glicemico IS NULL
                                          OR indice_glicemico BETWEEN 0 AND 150),
    fonte            VARCHAR(80)   NOT NULL DEFAULT 'manual',  -- TACO, IBGE, manual
    id_autor         BIGINT        REFERENCES usuario(id_usuario) ON DELETE SET NULL,
    ativo            BOOLEAN       NOT NULL DEFAULT TRUE,
    criado_em        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    atualizado_em    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
-- Evita duplicar o mesmo alimento ao reimportar a tabela
CREATE UNIQUE INDEX IF NOT EXISTS idx_alimento_nome_fonte
    ON alimento (lower(trim(nome)), fonte);
CREATE INDEX IF NOT EXISTS idx_alimento_grupo ON alimento (grupo) WHERE ativo = TRUE;

-- =====================================================================
-- RF02 — Parâmetros individuais para o cálculo de necessidade energética
-- =====================================================================
ALTER TABLE paciente
    ADD COLUMN IF NOT EXISTS nivel_atividade nivel_atividade;

-- =====================================================================
-- RF02 / RF03 — VET e distribuição de macronutrientes no plano
-- Os percentuais ficam gravados no plano porque podem variar por paciente;
-- as fórmulas usadas ficam identificadas em `formula_vet` para rastreio.
-- =====================================================================
ALTER TABLE plano_alimentar
    ADD COLUMN IF NOT EXISTS vet_kcal          NUMERIC(7,1),
    ADD COLUMN IF NOT EXISTS formula_vet       VARCHAR(40),
    ADD COLUMN IF NOT EXISTS fator_atividade   NUMERIC(3,2),
    ADD COLUMN IF NOT EXISTS perc_carboidratos NUMERIC(4,1),
    ADD COLUMN IF NOT EXISTS perc_proteinas    NUMERIC(4,1),
    ADD COLUMN IF NOT EXISTS perc_lipidios     NUMERIC(4,1),
    ADD COLUMN IF NOT EXISTS observacoes       TEXT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_plano_macros_100'
    ) THEN
        ALTER TABLE plano_alimentar ADD CONSTRAINT chk_plano_macros_100 CHECK (
            (perc_carboidratos IS NULL AND perc_proteinas IS NULL AND perc_lipidios IS NULL)
            OR (perc_carboidratos IS NOT NULL AND perc_proteinas IS NOT NULL
                AND perc_lipidios IS NOT NULL
                AND round(perc_carboidratos + perc_proteinas + perc_lipidios) = 100)
        );
    END IF;
END $$;

-- ---------- RF03 — itens de refeição ligados à tabela de alimentos ----------
-- `refeicao.itens` continua existindo como descrição legível do que foi
-- prescrito; os itens estruturados abaixo é que permitem somar macros.
ALTER TABLE refeicao ALTER COLUMN itens DROP NOT NULL;

CREATE TABLE IF NOT EXISTS refeicao_item (
    id_item      BIGSERIAL     PRIMARY KEY,
    id_refeicao  BIGINT        NOT NULL
        REFERENCES refeicao(id_refeicao) ON DELETE CASCADE,
    id_alimento  BIGINT        REFERENCES alimento(id_alimento) ON DELETE RESTRICT,
    descricao    VARCHAR(160),                       -- usado quando não vem da tabela
    quantidade_g NUMERIC(7,2)  NOT NULL CHECK (quantidade_g > 0),
    CHECK (id_alimento IS NOT NULL OR descricao IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_refeicao_item_refeicao ON refeicao_item(id_refeicao);

-- ---------- Macros no registro diário do paciente ----------
ALTER TABLE registro_refeicao
    ADD COLUMN IF NOT EXISTS proteinas   NUMERIC(6,1),
    ADD COLUMN IF NOT EXISTS lipidios    NUMERIC(6,1),
    ADD COLUMN IF NOT EXISTS kcal        NUMERIC(7,1),
    ADD COLUMN IF NOT EXISTS id_alimento BIGINT
        REFERENCES alimento(id_alimento) ON DELETE SET NULL;

-- =====================================================================
-- RF04 — Histórico antropométrico
-- O IMC é coluna gerada: nunca fica dessincronizado de peso e altura.
-- =====================================================================
CREATE TABLE IF NOT EXISTS registro_antropometrico (
    id_antropometria BIGSERIAL    PRIMARY KEY,
    id_paciente      BIGINT       NOT NULL
        REFERENCES paciente(id_paciente) ON DELETE CASCADE,
    id_autor         BIGINT       REFERENCES usuario(id_usuario) ON DELETE SET NULL,
    data_medicao     DATE         NOT NULL DEFAULT CURRENT_DATE,
    peso             NUMERIC(5,2) CHECK (peso IS NULL OR (peso > 0 AND peso < 400)),
    altura           NUMERIC(4,2) CHECK (altura IS NULL OR (altura > 0.5 AND altura < 2.6)),
    imc              NUMERIC(5,2) GENERATED ALWAYS AS (
        CASE WHEN peso IS NOT NULL AND altura IS NOT NULL AND altura > 0
             THEN round(peso / (altura * altura), 2) END
    ) STORED,
    circ_cintura     NUMERIC(5,1) CHECK (circ_cintura     IS NULL OR circ_cintura     > 0),
    circ_quadril     NUMERIC(5,1) CHECK (circ_quadril     IS NULL OR circ_quadril     > 0),
    circ_braco       NUMERIC(5,1) CHECK (circ_braco       IS NULL OR circ_braco       > 0),
    circ_panturrilha NUMERIC(5,1) CHECK (circ_panturrilha IS NULL OR circ_panturrilha > 0),
    circ_pescoco     NUMERIC(5,1) CHECK (circ_pescoco     IS NULL OR circ_pescoco     > 0),
    observacao       TEXT,
    criado_em        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    -- uma medição não pode vir vazia
    CHECK (peso IS NOT NULL OR altura IS NOT NULL OR circ_cintura IS NOT NULL
           OR circ_quadril IS NOT NULL OR circ_braco IS NOT NULL
           OR circ_panturrilha IS NOT NULL OR circ_pescoco IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_antropometria_paciente
    ON registro_antropometrico(id_paciente, data_medicao DESC);

-- Traz para o histórico o peso/altura que hoje estão soltos em `paciente`,
-- para que os gráficos não comecem vazios em quem já usava o sistema.
INSERT INTO registro_antropometrico (id_paciente, data_medicao, peso, altura, observacao)
SELECT p.id_paciente, COALESCE(p.atualizado_em::date, CURRENT_DATE), p.peso, p.altura,
       'Medição inicial importada do cadastro'
  FROM paciente p
 WHERE (p.peso IS NOT NULL OR p.altura IS NOT NULL)
   AND NOT EXISTS (
        SELECT 1 FROM registro_antropometrico r WHERE r.id_paciente = p.id_paciente
   );

-- =====================================================================
-- RF06 — Registro emocional
-- Escala de 5 pontos + fatores em texto livre. O formato definitivo cabe
-- à equipe de Nutrição validar; a estrutura suporta trocar a escala sem
-- perder o histórico (o enum é a referência, `intensidade` é o grau).
-- =====================================================================
CREATE TABLE IF NOT EXISTS registro_emocional (
    id_emocional BIGSERIAL        PRIMARY KEY,
    id_paciente  BIGINT           NOT NULL
        REFERENCES paciente(id_paciente) ON DELETE CASCADE,
    data_hora    TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    estado       estado_emocional NOT NULL,
    intensidade  SMALLINT         CHECK (intensidade IS NULL
                                         OR intensidade BETWEEN 1 AND 5),
    fatores      TEXT,                       -- ex: "noite mal dormida, trabalho"
    observacao   TEXT
);
CREATE INDEX IF NOT EXISTS idx_emocional_paciente_data
    ON registro_emocional(id_paciente, data_hora DESC);

-- =====================================================================
-- RF07 — Lembretes configuráveis
--
-- A modelagem anterior só permitia lembrete de glicemia apontando para um
-- `registro_glicemia` já existente, o que invertia a ordem dos fatos: o
-- lembrete serve justamente para a medição que ainda não aconteceu. O
-- CHECK antigo é substituído por um que aceita as FKs como opcionais.
-- =====================================================================
ALTER TABLE lembrete
    ADD COLUMN IF NOT EXISTS titulo      VARCHAR(120),
    ADD COLUMN IF NOT EXISTS hora        TIME,
    ADD COLUMN IF NOT EXISTS dias_semana SMALLINT[],  -- 0 = domingo ... 6 = sábado
    ADD COLUMN IF NOT EXISTS recorrente  BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS ativo       BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE lembrete ALTER COLUMN data_hora DROP NOT NULL;
ALTER TABLE lembrete DROP CONSTRAINT IF EXISTS lembrete_check;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_lembrete_vinculo'
    ) THEN
        ALTER TABLE lembrete ADD CONSTRAINT chk_lembrete_vinculo CHECK (
            (tipo_lembrete = 'refeicao'    AND id_glicemia IS NULL AND id_uso IS NULL) OR
            (tipo_lembrete = 'glicemia'    AND id_refeicao IS NULL AND id_uso IS NULL) OR
            (tipo_lembrete = 'medicamento' AND id_refeicao IS NULL AND id_glicemia IS NULL) OR
            (tipo_lembrete = 'outro'       AND id_refeicao IS NULL AND id_glicemia IS NULL
                                           AND id_uso IS NULL)
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_lembrete_quando'
    ) THEN
        ALTER TABLE lembrete ADD CONSTRAINT chk_lembrete_quando CHECK (
            (recorrente = TRUE  AND hora      IS NOT NULL) OR
            (recorrente = FALSE AND data_hora IS NOT NULL)
        );
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_lembrete_ativo
    ON lembrete(id_paciente, hora) WHERE ativo = TRUE AND recorrente = TRUE;

-- =====================================================================
-- RF09 — Repositório de receitas
-- =====================================================================
CREATE TABLE IF NOT EXISTS receita (
    id_receita          BIGSERIAL    PRIMARY KEY,
    id_autor            BIGINT       NOT NULL
        REFERENCES usuario(id_usuario) ON DELETE RESTRICT,
    titulo              VARCHAR(160) NOT NULL CHECK (length(trim(titulo)) > 0),
    resumo              VARCHAR(300),
    ingredientes        TEXT         NOT NULL CHECK (length(trim(ingredientes)) > 0),
    modo_preparo        TEXT         NOT NULL CHECK (length(trim(modo_preparo)) > 0),
    porcoes             SMALLINT     CHECK (porcoes IS NULL OR porcoes > 0),
    tempo_preparo_min   SMALLINT     CHECK (tempo_preparo_min IS NULL OR tempo_preparo_min > 0),
    kcal_porcao         NUMERIC(7,2),
    carboidratos_porcao NUMERIC(7,2),
    proteinas_porcao    NUMERIC(7,2),
    lipidios_porcao     NUMERIC(7,2),
    categoria           VARCHAR(60)  NOT NULL DEFAULT 'geral',
    publicado           BOOLEAN      NOT NULL DEFAULT FALSE,
    criado_em           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    atualizado_em       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_receita_publicada
    ON receita(publicado, criado_em DESC);

-- =====================================================================
-- Entidade Notificacao — histórico do que foi avisado ao usuário
-- (o push_token guarda para onde enviar; isto guarda o que foi enviado)
-- =====================================================================
CREATE TABLE IF NOT EXISTS notificacao (
    id_notificacao BIGSERIAL    PRIMARY KEY,
    id_usuario     BIGINT       NOT NULL
        REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    tipo           VARCHAR(40)  NOT NULL,   -- alerta_glicemia, lembrete, conteudo, sistema
    titulo         VARCHAR(160) NOT NULL,
    mensagem       TEXT         NOT NULL,
    lida           BOOLEAN      NOT NULL DEFAULT FALSE,
    criado_em      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notificacao_usuario
    ON notificacao(id_usuario, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_notificacao_nao_lida
    ON notificacao(id_usuario) WHERE lida = FALSE;

-- ---------- Triggers de atualizado_em nas tabelas novas ----------
DROP TRIGGER IF EXISTS alimento_set_atualizado_em ON alimento;
CREATE TRIGGER alimento_set_atualizado_em
    BEFORE UPDATE ON alimento
    FOR EACH ROW EXECUTE FUNCTION trg_set_atualizado_em();

DROP TRIGGER IF EXISTS receita_set_atualizado_em ON receita;
CREATE TRIGGER receita_set_atualizado_em
    BEFORE UPDATE ON receita
    FOR EACH ROW EXECUTE FUNCTION trg_set_atualizado_em();

COMMIT;
