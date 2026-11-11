-- =====================================================================
-- Migration 018 — Convite guardado pelo e-mail digitado
--
-- Antes, convidar um e-mail sem conta de paciente respondia 404, e convidar
-- um paciente devolvia o nome dele. A nutricionista descobria quem usa o
-- NutriCare, e num serviço de diabetes isso já é dado de saúde por
-- associação (correção CO-03 do parecer de 02/11/2026).
--
-- Agora o convite é gravado com o e-mail digitado, exista ou não a conta, e
-- a resposta é sempre a mesma. Sem conta, id_paciente fica vazio até alguém
-- se cadastrar com esse e-mail e aceitar o convite pelo aplicativo. O vínculo
-- continua nascendo só do aceite.
-- =====================================================================

BEGIN;

ALTER TABLE solicitacao_vinculo ADD COLUMN IF NOT EXISTS email_convidado VARCHAR(160);
ALTER TABLE solicitacao_vinculo ALTER COLUMN id_paciente DROP NOT NULL;

-- Convites já existentes: o e-mail é o da conta convidada.
UPDATE solicitacao_vinculo s
   SET email_convidado = u.email
  FROM paciente p
  JOIN usuario u ON u.id_usuario = p.id_usuario
 WHERE s.id_paciente = p.id_paciente
   AND s.email_convidado IS NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_solicitacao_destino'
    ) THEN
        ALTER TABLE solicitacao_vinculo ADD CONSTRAINT chk_solicitacao_destino
            CHECK (id_paciente IS NOT NULL OR email_convidado IS NOT NULL);
    END IF;
END $$;

-- Um convite pendente por e-mail, como já era um por paciente.
CREATE UNIQUE INDEX IF NOT EXISTS idx_solicitacao_pendente_email
    ON solicitacao_vinculo (id_nutricionista, email_convidado) WHERE status = 'pendente';
CREATE INDEX IF NOT EXISTS idx_solicitacao_email
    ON solicitacao_vinculo (email_convidado) WHERE status = 'pendente';

COMMIT;
