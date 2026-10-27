-- =====================================================================
-- Migration 016 — Consentimento do paciente no vínculo (LGPD)
--
-- Dado de saúde é dado sensível (LGPD, art. 11): o nutricionista só pode
-- ver o histórico de um paciente que autorizou isso. Até aqui o cadastro
-- vinculava o paciente novo a todos os nutricionistas do sistema, sem
-- perguntar nada.
--
-- Agora o nutricionista convida e o paciente responde pelo aplicativo. O
-- vínculo em nutricionista_paciente só nasce quando o convite é aceito, e
-- por isso as consultas que já filtram `ativo = TRUE` continuam valendo
-- sem nenhuma mudança.
--
-- Os vínculos que já existem não são tocados. Segura para rodar em banco
-- já existente.
-- =====================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS solicitacao_vinculo (
    id_solicitacao   BIGSERIAL   PRIMARY KEY,
    id_nutricionista BIGINT      NOT NULL
        REFERENCES nutricionista(id_nutricionista) ON DELETE CASCADE,
    id_paciente      BIGINT      NOT NULL
        REFERENCES paciente(id_paciente) ON DELETE CASCADE,
    status           VARCHAR(12) NOT NULL DEFAULT 'pendente'
        CHECK (status IN ('pendente', 'aceita', 'recusada', 'cancelada')),
    criado_em        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    respondido_em    TIMESTAMPTZ,
    -- Convite pendente ainda não tem resposta; os outros três têm.
    CONSTRAINT chk_solicitacao_resposta
        CHECK ((status = 'pendente') = (respondido_em IS NULL))
);

-- Um convite pendente por par: convidar de novo enquanto o primeiro espera
-- não cria um segundo cartão no aplicativo do paciente.
CREATE UNIQUE INDEX IF NOT EXISTS idx_solicitacao_pendente_unica
    ON solicitacao_vinculo (id_nutricionista, id_paciente) WHERE status = 'pendente';
CREATE INDEX IF NOT EXISTS idx_solicitacao_paciente
    ON solicitacao_vinculo (id_paciente) WHERE status = 'pendente';

COMMIT;
