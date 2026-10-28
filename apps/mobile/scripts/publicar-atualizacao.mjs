// Publica uma atualização pela internet (EAS Update) para o APK de demonstração.
//
// Uso, dentro de apps/mobile:  npm run atualizar -- "o que mudou"
//
// As variáveis EXPO_PUBLIC_* vêm do perfil "preview" do eas.json, as mesmas do
// APK. Sem isso o `eas update` usaria o .env da máquina e a atualização poderia
// sair apontando para a API local de quem rodou o comando.
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const eas = JSON.parse(readFileSync(new URL('../eas.json', import.meta.url), 'utf8'));
const mensagem = process.argv.slice(2).join(' ').trim();

if (!mensagem) {
  console.error('Diga o que mudou: npm run atualizar -- "texto curto"');
  process.exit(1);
}

const resultado = spawnSync(
  'npx',
  ['eas-cli@latest', 'update', '--channel', 'preview', '--message', JSON.stringify(mensagem)],
  { stdio: 'inherit', shell: true, env: { ...process.env, ...eas.build.preview.env } },
);
process.exit(resultado.status ?? 1);
