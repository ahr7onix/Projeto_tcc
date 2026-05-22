# NutriCare Web — Painel do Nutricionista

Aplicação web React exclusiva para **nutricionistas**, construída com base nas telas do app mobile.

## Tecnologias

- React 18 + TypeScript
- Vite (bundler)
- React Router v6
- Axios

## Instalação

```bash
cd web_nutricionista
npm install
cp .env.example .env      # configure a URL da API
npm run dev
```

Acesse em `http://localhost:5173`

## Telas disponíveis

| Rota | Descrição |
|---|---|
| `/login` | Login exclusivo para nutricionistas |
| `/cadastro` | Cadastro com role = nutricionista fixo |
| `/esqueci-senha` | Recuperação de senha via e-mail |
| `/dashboard` | Visão geral: estatísticas, acesso rápido |
| `/pacientes` | Lista e gerenciamento de pacientes |
| `/registros` | Registros de glicemia e refeições |
| `/alimentacao` | Plano alimentar e refeições do dia |
| `/saude` | Antropometria, IMC, metas clínicas |
| `/perfil` | Dados do nutricionista e configurações |

## Notas

- O login verifica se o usuário tem `role === 'nutricionista'`. Contas de paciente são bloqueadas com mensagem explicativa.
- Conecta à mesma API NestJS do projeto (apps/api).
- O app mobile continua funcionando normalmente para pacientes e nutricionistas.
