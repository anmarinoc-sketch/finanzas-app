/**
 * Comprueba que ninguna pantalla quede debajo de las barras del sistema.
 *
 * La app usa edgeToEdgeEnabled, así que dibuja bajo la barra de estado y bajo
 * la de navegación de Android. En un Samsung con barra de tres botones eso
 * tapaba las etiquetas de las pestañas. Reglas:
 *
 *  - Las pantallas de pila deben proteger arriba Y abajo.
 *  - Las pantallas dentro de (tabs) protegen solo arriba: del borde inferior
 *    se encarga la barra de pestañas.
 *  - La barra de pestañas debe sumar el área segura a su altura.
 *
 * Uso:  npm run areas
 */
import fs from 'node:fs';
import path from 'node:path';

const listar = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const p = path.join(dir, e.name);
  return e.isDirectory() ? listar(p) : (/\.tsx$/.test(e.name) ? [p] : []);
});

const norm = (p) => p.split(path.sep).join('/');
const problemas = [];

for (const archivo of listar('app')) {
  const rel = norm(archivo);
  const src = fs.readFileSync(archivo, 'utf8');
  if (!src.includes('SafeAreaView')) continue;

  const esPantallaDeTab = rel.startsWith('app/(tabs)/') && !rel.endsWith('_layout.tsx');
  const edges = [...src.matchAll(/edges=\{(\[[^\]]*\])\}/g)].map((m) => m[1]);

  if (esPantallaDeTab) {
    for (const e of edges) {
      if (e.includes('bottom')) problemas.push(`${rel}: una pantalla de pestaña no debe proteger 'bottom' (lo hace la barra)`);
    }
    continue;
  }
  if (!edges.length) continue; // sin edges = protege todos los bordes, correcto
  for (const e of edges) {
    if (!e.includes('bottom')) problemas.push(`${rel}: edges=${e} deja el contenido bajo la barra de navegación; falta 'bottom'`);
  }
}

const layout = fs.readFileSync(path.join('app', '(tabs)', '_layout.tsx'), 'utf8');
if (!layout.includes('useSafeAreaInsets')) {
  problemas.push("app/(tabs)/_layout.tsx: la barra de pestañas no usa useSafeAreaInsets y quedará bajo la barra del sistema");
}
if (/height:\s*\d+\s*,/.test(layout) && !/height:\s*\d+\s*\+\s*insets\.bottom/.test(layout)) {
  problemas.push("app/(tabs)/_layout.tsx: la altura de la barra de pestañas es fija y no suma insets.bottom");
}

if (problemas.length) {
  console.error('PROBLEMAS DE ÁREA SEGURA:');
  for (const p of problemas) console.error('  ' + p);
  process.exit(1);
}
console.log('Áreas seguras correctas en todas las pantallas.');
