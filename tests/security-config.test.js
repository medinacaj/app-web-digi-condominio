import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ignore = readFileSync(new URL('../.gitignore', import.meta.url), 'utf8');

test('la configuración no permite versionar secretos, bases locales ni respaldos', () => {
  const directives = new Set(ignore.split(/\r?\n/).map(line => line.trim()));
  for (const protectedPath of ['.env', '.env.*', '.data/', '*.sqlite', '*.sqlite-*', '*.db', '*.db-*', 'uploads/', 'private/', 'backups/', '*.pem', '*.key', 'node_modules/']) {
    assert.ok(directives.has(protectedPath), `Falta exclusión ${protectedPath}`);
  }
  assert.ok(directives.has('!.env.example'), 'Debe admitirse plantilla sin credenciales');
});

test('el servidor de desarrollo escucha solo en loopback', () => {
  const start = readFileSync(new URL('../server/start.js', import.meta.url), 'utf8');
  assert.match(start, /const host\s*=\s*['"]127\.0\.0\.1['"]/);
  assert.match(start, /server\.listen\(port,\s*host/);
});
