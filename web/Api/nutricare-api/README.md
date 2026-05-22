# NutriCare API

Backend completo para o **Painel do Nutricionista NutriCare**.

## Stack
- **Node.js** + **Express**
- **JWT** para autenticação (access token 15min + refresh token 7d)
- **bcryptjs** para hash de senhas
- Banco de dados **em memória** (perfeito para desenvolvimento; para produção, adicione PostgreSQL/MongoDB)

## Instalação

```bash
cd nutricare-api
npm install
npm start
```

A API sobe em `http://localhost:3000`

## Login de demonstração (já criado automaticamente)

```
E-mail: demo@nutricare.com
Senha:  Demo@1234
```

## Endpoints

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| GET | `/health` | Status da API | ❌ |
| POST | `/auth/login` | Login | ❌ |
| POST | `/auth/cadastro` | Cadastro de nutricionista | ❌ |
| POST | `/auth/refresh` | Renovar access token | ❌ |
| POST | `/auth/esqueci-senha` | Recuperação de senha | ❌ |
| GET | `/auth/me` | Dados do usuário logado | ✅ |
| GET | `/pacientes` | Lista pacientes (busca, status) | ✅ |
| POST | `/pacientes` | Cadastrar paciente | ✅ |
| GET | `/pacientes/:id` | Buscar paciente | ✅ |
| PATCH | `/pacientes/:id` | Editar paciente | ✅ |
| DELETE | `/pacientes/:id` | Remover paciente | ✅ |
| GET | `/registros` | Lista registros (tipo, pacienteId, dias) | ✅ |
| POST | `/registros/glicemia` | Adicionar glicemia | ✅ |
| POST | `/registros/refeicao` | Adicionar refeição | ✅ |
| GET | `/alimentacao` | Planos alimentares | ✅ |
| POST | `/alimentacao` | Criar plano | ✅ |
| GET | `/saude/:pacienteId` | Dados de saúde do paciente | ✅ |
| POST | `/saude/:pacienteId` | Adicionar dado de saúde | ✅ |
| GET | `/perfil` | Perfil do nutricionista | ✅ |
| PATCH | `/perfil` | Editar perfil / trocar senha | ✅ |

## Conectar com o frontend

No projeto `web_nutricionista`, edite o arquivo `.env`:

```env
VITE_API_URL=http://localhost:3000
```

## Variáveis de ambiente (opcionais)

```env
PORT=3000
JWT_SECRET=seu-segredo-aqui
JWT_REFRESH_SECRET=outro-segredo-aqui
```

## Para produção

Para persistir dados entre reinicializações, substitua o `db` em memória por:
- **PostgreSQL** com Prisma ou TypeORM
- **MongoDB** com Mongoose
- **SQLite** com better-sqlite3 (mais simples)

A estrutura de rotas e lógica permanece igual.
