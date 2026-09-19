/**
 * Comprueba que ninguna pantalla ni ningún gráfico pueda tumbar la app.
 *
 * De dónde viene esta regla: un array vacío dentro de la librería de gráficos
 * lanzaba "Cannot read property 'barWidth' of undefined". Sin frontera de
 * error, ese fallo cerraba la app entera; tres cierres llevaban al modo
 * recuperación, y de ahí salió una pérdida de datos real. Con frontera, el
 * mismo fallo se queda dentro de una tarjeta y el resto sigue funcionando.
 *
 * Reglas:
 *  - Cada ruta de `app/` exporta su componente a través de `conFrontera(...)`.
 *    Se exceptúa `app/_layout.tsx`, que es la raíz y tiene su propio camino de
 *    recuperación (no puede protegerse con algo que vive dentro de sí misma).
 *  - Ninguna ruta usa ya `export default function` a secas.
 *  - El contenedor de gráficos envuelve a sus hijos en una `<Frontera>`.
 *  - Cada gráfico tiene su guarda de datos vacíos, y esa guarda va DESPUÉS de
 *    los hooks (si se salta un hook, React lanza "rendered fewer hooks than
 *    expected" en el render siguiente, que es cambiar un fallo por otro).
 *
 * Uso:  npm run fronteras
 */
import fs from 'node:fs';
import path from 'node:path';

const listar = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const p = path.join(dir, e.name);
  return e.isDirectory() ? listar(p) : (/\.tsx$/.test(e.name) ? [p] : []);
});

const norm = (p) => p.split(path.sep).join('/');
const EXENTAS = new Set(['app/_layout.tsx']);
const problemas = [];

let rutas = 0;
for (const archivo of listar('app')) {
  const rel = norm(archivo);
  if (EXENTAS.has(rel)) continue;
  const src = fs.readFileSync(archivo, 'utf8');
  if (!/export default/.test(src)) continue;
  rutas++;

  if (/export default function/.test(src)) {
    problemas.push(`${rel}: exporta el componente sin frontera (export default function).`);
    continue;
  }
  if (!/export default conFrontera\(/.test(src)) {
    problemas.push(`${rel}: el export default no pasa por conFrontera().`);
    continue;
  }
  if (!/from '@\/ui\/Frontera'/.test(src)) {
    problemas.push(`${rel}: usa conFrontera pero no lo importa de @/ui/Frontera.`);
  }
}

const frontera = fs.readFileSync('src/ui/Frontera.tsx', 'utf8');
if (!/registrarFalloDePantalla\(/.test(frontera)) {
  problemas.push('src/ui/Frontera.tsx: no registra el fallo con registrarFalloDePantalla(), '
    + 'así que un fallo atrapado seguiría contando como arranque fallido.');
}

// Cada grafico: guarda de datos vacios, y despues de los hooks.
const SIN_GUARDA = new Set(['Contenedor.tsx', 'AnillosMetas.tsx']);
for (const nombre of fs.readdirSync('src/charts')) {
  if (!nombre.endsWith('.tsx') || SIN_GUARDA.has(nombre)) continue;
  const rel = `src/charts/${nombre}`;
  const lineas = fs.readFileSync(rel, 'utf8').split('\n');
  const guarda = lineas.findIndex((l) => /return null;/.test(l));
  if (guarda === -1) {
    problemas.push(`${rel}: sin guarda de datos vacíos (falta un "return null" cuando no hay nada que dibujar).`);
    continue;
  }
  const ultimoHook = lineas.reduce((acc, l, i) => (/\buse[A-Z]\w*\(/.test(l) ? i : acc), -1);
  if (ultimoHook > guarda) {
    problemas.push(`${rel}: la guarda de la línea ${guarda + 1} está antes de un hook `
      + `(línea ${ultimoHook + 1}). Debe ir después, o React lanzará "rendered fewer hooks than expected".`);
  }
}

const contenedor = fs.readFileSync('src/charts/Contenedor.tsx', 'utf8');
if (!/<Frontera[\s\S]*\{children\}[\s\S]*<\/Frontera>/.test(contenedor)) {
  problemas.push('src/charts/Contenedor.tsx: los gráficos no están dentro de una <Frontera>.');
}

if (problemas.length) {
  console.error('\nFronteras de error incompletas:\n');
  for (const p of problemas) console.error(`  - ${p}`);
  console.error('\nCada pantalla debe terminar con:  export default conFrontera(Componente, \'Nombre\');\n');
  process.exit(1);
}

console.log(`Fronteras de error: ${rutas} pantallas protegidas, gráficos con guarda y dentro de su frontera.`);
