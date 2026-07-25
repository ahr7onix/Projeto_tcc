/**
 * Gera o hash bcrypt da senha do administrador para o seeds_admin.sql.
 *
 * Uso (a partir da raiz do projeto):
 *   node database/gerar-hash-admin.js "minha-senha-forte"
 *
 * Depende do bcryptjs, que ja e dependencia da API. Rode `npm install` em
 * apps/api antes, se ainda nao rodou.
 */
const path = require('path');

const senha = process.argv[2];

if (!senha) {
  console.error('Informe a senha: node database/gerar-hash-admin.js "minha-senha"');
  process.exit(1);
}

let bcrypt;
try {
  bcrypt = require(path.join(__dirname, '..', 'apps', 'api', 'node_modules', 'bcryptjs'));
} catch {
  console.error('bcryptjs nao encontrado. Rode `npm install` em apps/api primeiro.');
  process.exit(1);
}

const hash = bcrypt.hashSync(senha, 10);

console.log('\nSubstitua o hash em database/seeds_admin.sql por:\n');
console.log(`    '${hash}'\n`);
console.log('Se o banco ja existe, atualize direto:\n');
console.log(
  `    UPDATE usuario SET senha = '${hash}' WHERE email = 'admin@nutricare.local';\n`,
);
