-- =====================================================================
-- Migration 013 — Desativação de conta (soft delete)
--
-- O paciente pode encerrar a própria conta pelo app. Em vez de apagar a
-- linha (o que levaria junto glicemias, refeições, mensagens e prontuário
-- por CASCADE), marcamos a data da desativação: o acesso é bloqueado no
-- login e no refresh, e a conta some das listas do nutricionista, mas o
-- histórico clínico continua íntegro.
--
-- NULL = conta ativa. Segura para rodar em banco já existente.
-- =====================================================================

BEGIN;

ALTER TABLE usuario ADD COLUMN IF NOT EXISTS desativado_em TIMESTAMPTZ;

-- A maioria absoluta das consultas quer só as contas ativas.
CREATE INDEX IF NOT EXISTS idx_usuario_ativo
    ON usuario(id_usuario) WHERE desativado_em IS NULL;

COMMIT;
