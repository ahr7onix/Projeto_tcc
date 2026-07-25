-- Administrador inicial do sistema.
--
-- A senha correspondente ao hash abaixo esta documentada no README e, portanto,
-- e publica. Serve apenas para o primeiro acesso em ambiente de desenvolvimento.
-- Para gerar um hash proprio antes de qualquer uso real:
--
--     node database/gerar-hash-admin.js "sua-senha"
--
-- e substitua a string abaixo pelo hash impresso.
INSERT INTO usuario (nome, email, senha, tipo)
VALUES (
    'Administrador',
    'admin@nutricare.local',
    '$2a$10$16MzYBkLiv7l2Xx6Q3nIbu/0LpsATghWcjf6s9XOdlssIOu6A2hkS',
    'administrador'
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO administrador (id_usuario)
SELECT id_usuario FROM usuario WHERE email = 'admin@nutricare.local'
ON CONFLICT (id_usuario) DO NOTHING;
