-- =====================================================================
-- Migration 017 — Aprovação do nutricionista pela administração
--
-- O CRN é digitado livremente no cadastro e não existe consulta pública
-- automatizada ao conselho. Sem conferência, qualquer pessoa que se
-- cadastrasse como nutricionista passava a convidar pacientes. Agora o
-- acesso ao painel só abre depois que um administrador confere o registro
-- e aprova.
--
-- NULL = aguardando aprovação. Quem já usava o painel continua entrando:
-- a migration aprova os nutricionistas existentes com a data do próprio
-- cadastro — e só na execução que cria a coluna, para que rodar de novo
-- não aprove sem querer quem estiver aguardando.
-- =====================================================================

BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_name = 'nutricionista' AND column_name = 'aprovado_em'
    ) THEN
        ALTER TABLE nutricionista ADD COLUMN aprovado_em TIMESTAMPTZ;
        UPDATE nutricionista SET aprovado_em = criado_em;
    END IF;
END $$;

COMMIT;
