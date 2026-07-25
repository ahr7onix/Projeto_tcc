INSERT INTO usuario (nome, email, senha, tipo)
VALUES (
    'Administrador',
    'admin@nutricare.local',
    '$2a$10$RyHnP0OsotCZX/Gko3eurO9YopLMk1jpV4pZ/d0Rz5TnARpPPMS.K',
    'administrador'
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO administrador (id_usuario)
SELECT id_usuario FROM usuario WHERE email = 'admin@nutricare.local'
ON CONFLICT (id_usuario) DO NOTHING;
