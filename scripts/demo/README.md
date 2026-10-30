# Dados de demonstração

O `popular-demo.sql` monta um consultório fictício para ver e apresentar o sistema com volume:
25 pacientes, 5 nutricionistas e até 5 meses de uso. Preenche glicemia, refeições, humor, medidas,
medicamentos, restrições, planos, lembretes, mensagens, convites, anotações, conteúdos, receitas
e notificações. Não cria alimentos: usa os da TACO.

Tudo é inventado. Os textos de conteúdos e receitas e os valores por porção não passaram pela
Nutrição.

## Logins

Senha de todos: `Senha123!` (o administrador usa a senha do `README.md` da raiz).

| Perfil | E-mail | Para ver |
|---|---|---|
| Nutricionista | `camila.souza@nutri.com` | 14 pacientes, 4 mensagens não lidas, 2 convites pendentes |
| Nutricionista | `rafael.mendes@demo.nutricare.local` | 5 pacientes, inclusive a Renata, que saiu da Camila |
| Nutricionista | `beatriz.lima@demo.nutricare.local` | 3 pacientes: gestantes e uma criança |
| Nutricionista | `lucas.pereira@demo.nutricare.local` | Login barrado: aguarda aprovação |
| Administração | `admin@nutricare.local` | 2 aprovações pendentes e os painéis do grupo |
| Paciente | `joao.silva@email.com` | Tipo 2, melhorando mês a mês |
| Paciente | `maria.oliveira@email.com` | Tipo 1, com hipoglicemia agora e intolerância à lactose |
| Paciente | `carlos.nunes@demo.nutricare.local` | Glicemia alta e alertas críticos |
| Paciente | `claudia.reis@demo.nutricare.local` | Convite da Camila para aceitar |
| Paciente | `marcos.rocha@demo.nutricare.local` | Parou de registrar há 45 dias |

O e-mail dos outros pacientes segue o padrão `nome.sobrenome@demo.nutricare.local`; a lista está
no início do script.

## Como rodar

Use um banco só para isso: desfazer é apagar o banco. Os exemplos usam o contêiner `tcc-pg-dev`
(porta 5440, usuário, senha e base `tcc`).

1. Crie e prepare o banco, na raiz do repositório:

   ```powershell
   docker exec tcc-pg-dev psql -U tcc -d postgres -c "CREATE DATABASE tcc_demo;"
   $env:DATABASE_URL='postgres://tcc:tcc@127.0.0.1:5440/tcc_demo'; $env:SEED_DEMO='true'
   node apps/api/preparar-banco.mjs
   ```

2. Importe a TACO pelo painel (`docs/LEIA_PRIMEIRO_IA.md`, armadilha "Tabela TACO"). Sem ela o
   script para e diz quais alimentos faltam.

3. Rode o script:

   ```powershell
   docker cp scripts/demo/popular-demo.sql tcc-pg-dev:/tmp/popular-demo.sql
   docker exec tcc-pg-dev psql -U tcc -d tcc_demo -v ON_ERROR_STOP=1 -q -f /tmp/popular-demo.sql
   ```

   No Windows, não mande o arquivo pela entrada do `psql` (`Get-Content ... | psql`): o PowerShell
   estraga os acentos.

## Como ver no painel

Em dois terminais, na raiz do repositório:

```powershell
$env:PORT='3010'; $env:DATABASE_URL='postgres://tcc:tcc@127.0.0.1:5440/tcc_demo'; npm --prefix apps/api run start:dev
```

```powershell
$env:VITE_API_URL='http://127.0.0.1:3010'; cd apps/web; npx vite --port 5174
```

Depois abra `http://localhost:5174`. Use `127.0.0.1` no endereço do banco: `localhost` pode
resolver para IPv6 e estourar o tempo de conexão.

## Para atualizar antes de apresentar

Repita o passo 3. As datas são relativas ao dia em que o script roda, então os dados voltam a
ficar recentes. Cada execução apaga e recria as contas `@demo.nutricare.local` e refaz os registros
de João e Maria e as notificações da Camila: o que foi digitado nessas contas se perde.

## Site publicado

O script foi feito para banco local. Em site aberto, todas essas contas ficariam com uma senha
conhecida, e não há como desfazer sem apagar o banco. Não rode no banco publicado sem combinar
com a equipe.
