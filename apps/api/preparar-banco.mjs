// Prepara o banco de dados para uso — pode ser executado quantas vezes for
// preciso, que ele só aplica o que ainda falta.
//
//   node preparar-banco.mjs                (a partir de apps/api)
//   node apps/api/preparar-banco.mjs       (a partir da raiz do projeto)
//
// Variáveis usadas:
//   DATABASE_URL   endereço do banco (obrigatória)
//   DATABASE_SSL   igual à da API: vazio decide sozinho, "no-verify" aceita
//                  certificado próprio do provedor
//   SEED_DEMO      "true" carrega os usuários e registros fictícios de
//                  demonstração (Dra. Camila, João, Maria)
//   ADMIN_SENHA    senha do administrador inicial no lugar da que está no README
//   SENHA_DEMO     senha das contas de demonstração no lugar da do seeds.sql
//
// As duas últimas existem porque o repositório é público: no ar, as contas do
// seed não podem continuar com a senha que qualquer um lê aqui.
//
// Por que este arquivo existe: o schema.sql cria tudo de uma vez e não tem
// "IF NOT EXISTS" em lugar nenhum, então rodá-lo duas vezes dá erro. Aqui a
// gente anota numa tabela de controle o que já foi aplicado.

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import pg from 'pg';

const AQUI = dirname(fileURLToPath(import.meta.url));
const DB_DIR = join(AQUI, '..', '..', 'database');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('ERRO: falta a variável DATABASE_URL.');
  process.exit(1);
}

// Os modos aceitos sao os mesmos da API (database.module.ts):
//   ""            decide pelo endereco: local sem TLS, remoto com verificacao
//   true|1|on     TLS com verificacao de certificado
//   no-verify     TLS sem verificar a cadeia (Render, Heroku e afins usam
//                 certificado proprio; sem isto a conexao e recusada)
//   false|0|off   sem TLS
function resolverSsl() {
  const modo = (process.env.DATABASE_SSL ?? '').trim().toLowerCase();
  if (['true', '1', 'on'].includes(modo)) return { rejectUnauthorized: true };
  if (modo === 'no-verify') return { rejectUnauthorized: false };
  if (['false', '0', 'off'].includes(modo)) return false;
  const local = /@(localhost|127\.0\.0\.1|\[::1\]|db|postgres)[:/]/.test(connectionString);
  return local ? false : { rejectUnauthorized: true };
}

const client = new pg.Client({ connectionString, ssl: resolverSsl() });

function ler(...partes) {
  return readFileSync(join(DB_DIR, ...partes), 'utf8');
}

async function jaAplicado(nome) {
  const r = await client.query('SELECT 1 FROM migracao_aplicada WHERE nome = $1', [nome]);
  return r.rowCount > 0;
}

async function registrar(nome) {
  await client.query(
    'INSERT INTO migracao_aplicada (nome) VALUES ($1) ON CONFLICT (nome) DO NOTHING',
    [nome],
  );
}

/** Aplica o arquivo só se ele ainda não tiver sido aplicado. */
async function aplicarUmaVez(nome, caminhoRelativo) {
  if (await jaAplicado(nome)) {
    console.log(`  pular   ${nome} (já aplicado)`);
    return;
  }
  await client.query(ler(...caminhoRelativo));
  await registrar(nome);
  console.log(`  aplicar ${nome}`);
}

/**
 * Troca a senha publicada no repositório pela da variável, só nas contas que
 * ainda a usam: quem já trocou a senha pelo painel fica como está. As sessões
 * abertas com a senha antiga são encerradas.
 */
async function trocarSenhaPublica(variavel, senhaPublica, emails) {
  const { rows } = await client.query(
    'SELECT id_usuario, email, senha FROM usuario WHERE email = ANY($1)',
    [emails],
  );
  const expostas = [];
  for (const conta of rows) {
    if (conta.senha && (await bcrypt.compare(senhaPublica, conta.senha))) expostas.push(conta);
  }
  if (expostas.length === 0) return;

  const nomes = expostas.map((c) => c.email).join(', ');
  const nova = process.env[variavel] ?? '';
  if (!nova) {
    // Em desenvolvimento a senha pública é o esperado; no ar, é um risco.
    if (process.env.NODE_ENV === 'production') {
      console.warn(`  AVISO   ${nomes} com a senha publicada no repositório: defina ${variavel}`);
    }
    return;
  }
  if (nova.length < 8 || nova === senhaPublica) {
    console.warn(`  AVISO   ${variavel} precisa de 8 caracteres ou mais e não pode ser a pública: nada trocado`);
    return;
  }

  const ids = expostas.map((c) => c.id_usuario);
  await client.query('UPDATE usuario SET senha = $1 WHERE id_usuario = ANY($2)', [
    await bcrypt.hash(nova, 10),
    ids,
  ]);
  await client.query(
    'UPDATE refresh_token SET revogado_em = NOW() WHERE id_usuario = ANY($1) AND revogado_em IS NULL',
    [ids],
  );
  console.log(`  trocar  senha pública de ${nomes} (${variavel})`);
}

async function main() {
  await client.connect();
  console.log('Conectado ao banco.');

  await client.query(`
    CREATE TABLE IF NOT EXISTS migracao_aplicada (
      nome         TEXT PRIMARY KEY,
      aplicada_em  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const migrations = existsSync(join(DB_DIR, 'migrations'))
    ? readdirSync(join(DB_DIR, 'migrations')).filter((f) => f.endsWith('.sql')).sort()
    : [];

  const bancoJaTemTabelas = (
    await client.query("SELECT to_regclass('public.usuario') AS t")
  ).rows[0].t !== null;

  if (!bancoJaTemTabelas) {
    console.log('Banco vazio — criando a estrutura a partir do schema.sql.');
    await client.query(ler('schema.sql'));
    await registrar('schema.sql');
  } else if (!(await jaAplicado('schema.sql'))) {
    // Banco criado por outro caminho (docker-compose, psql na mão).
    await registrar('schema.sql');
    console.log('Banco já existia — controle de migrations inicializado.');
  }

  // As migrations rodam sempre, inclusive logo depois do schema.sql.
  //
  // Antes elas eram apenas *marcadas* como aplicadas quando o banco nascia do
  // schema.sql, no pressuposto de que o schema já continha tudo o que elas
  // fazem. O pressuposto falhou em silencio: a tabela `mensagem` (003) nunca
  // entrou no schema.sql, então todo banco novo nascia sem ela e /mensagens
  // respondia 500. Como cada migration e idempotente (IF NOT EXISTS / ADD
  // COLUMN IF NOT EXISTS / DO $$ com guarda), rodá-las custa uma passada a
  // mais e elimina de vez esse tipo de divergência.
  console.log('Migrations:');
  for (const m of migrations) {
    await aplicarUmaVez(`migrations/${m}`, ['migrations', m]);
  }

  console.log('Dados iniciais:');
  // O seed do admin tem ON CONFLICT, então pode rodar sempre sem duplicar.
  await client.query(ler('seeds_admin.sql'));
  console.log('  ok      seeds_admin.sql (administrador inicial)');

  await aplicarUmaVez('seeds_alimentos.sql', ['seeds_alimentos.sql']);

  if ((process.env.SEED_DEMO ?? '').trim().toLowerCase() === 'true') {
    await aplicarUmaVez('seeds.sql', ['seeds.sql']);
  } else {
    console.log('  pular   seeds.sql (defina SEED_DEMO=true para carregar os dados fictícios)');
  }

  console.log('Senhas do seed:');
  await trocarSenhaPublica('ADMIN_SENHA', 'NutriCare@2026', ['admin@nutricare.local']);
  await trocarSenhaPublica('SENHA_DEMO', 'Senha123!', [
    'camila.souza@nutri.com',
    'joao.silva@email.com',
    'maria.oliveira@email.com',
  ]);

  console.log('\nBanco pronto.');
}

main()
  .catch((erro) => {
    console.error('\nERRO ao preparar o banco:', erro.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end().catch(() => {});
  });
