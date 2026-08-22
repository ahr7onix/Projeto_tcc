-- =====================================================================
-- Migration 010 — Observações no cadastro de medicamento
--
-- Permite ao paciente (ou nutricionista) registrar uma observação livre
-- junto do medicamento (ex: "tomar com alimento", "suspenso pelo médico
-- em 10/08"). Campo opcional, não afeta cadastros existentes.
--
-- Segura para rodar em banco já existente.
-- =====================================================================

BEGIN;

ALTER TABLE medicamento ADD COLUMN IF NOT EXISTS observacoes TEXT;

COMMIT;
