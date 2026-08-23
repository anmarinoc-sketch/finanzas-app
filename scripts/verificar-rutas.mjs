/**
 * Detecta rutas duplicadas de expo-router.
 *
 * Los grupos entre paréntesis no añaden segmento a la URL, así que
 * app/index.tsx y app/(tabs)/index.tsx resuelven los dos a "/". Cuando eso
 * pasa, una redirección entre ambos entra en bucle infinito y la app se
 * congela en cada arranque. Ya ocurrió una vez; este script lo impide.
 *
 * Uso:  npm run rutas
 */
import fs from 'node:fs';
import path from 'node:path';

function listar(dir, base = '') {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { out.push(...listar(p, base + '/' + e.name)); continue; }
    if (!/\.(tsx|ts|jsx|js)$/.test(e.name)) continue;
    const nombre = e.name.replace(/\.\w+$/, '');
    if (nombre.startsWith('_') || nombre.startsWith('+')) continue;
    const url = (base + '/' + nombre).replace(/\/\([^)]+\)/g, '').replace(/\/index$/, '') || '/';
    out.push({ url, archivo: p.split(path.sep).join('/') });
  }
  return out;
}

const rutas = listar('app');
const porUrl = {};
for (const r of rutas) (porUrl[r.url] ??= []).push(r.archivo);

console.log(`Rutas: ${rutas.length}`);
console.log(`La raíz "/" la sirve: ${porUrl['/']?.join(', ') ?? '(ninguna)'}`);

const duplicadas = Object.entries(porUrl).filter(([, v]) => v.length > 1);
if (duplicadas.length) {
  console.error('\nRUTAS DUPLICADAS:');
  for (const [url, archivos] of duplicadas) console.error(`  ${url} <- ${archivos.join(' + ')}`);
  process.exit(1);
}
if (!porUrl['/']) {
  console.error('\nNo hay ninguna ruta para "/": la app no tendría pantalla inicial.');
  process.exit(1);
}
console.log('Sin rutas duplicadas.');
