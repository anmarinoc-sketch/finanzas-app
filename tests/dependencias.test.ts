/**
 * Guarda contra una clase de fallo que no detectan ni TypeScript ni el
 * empaquetado: una librería que hace `require` de un paquete opcional al
 * cargar el módulo y lanza si no está. Metro genera igualmente el bundle y
 * el error solo aparece al abrir la pantalla que usa esa librería.
 *
 * Fue exactamente lo que tumbaba el inicio: react-native-gifted-charts
 * necesita un paquete de degradados y no estaba instalado.
 */
import { createRequire } from 'node:module';
import pkg from '../package.json';

const require2 = createRequire(__filename);

/**
 * Peers que solo hacen falta para la versión web. Esta app es exclusivamente
 * Android, así que su ausencia es intencionada y no un error.
 */
const SOLO_WEB = new Set([
  '@expo/metro-runtime',
  '@expo/dom-webview',
  'react-native-webview',
  'react-native-web',
  'react-dom',
]);
const instalado = (nombre: string) => {
  try { require2.resolve(nombre + '/package.json'); return true; }
  catch { try { require2.resolve(nombre); return true; } catch { return false; } }
};

describe('dependencias en tiempo de ejecución', () => {
  test('la librería de gráficos encuentra su paquete de degradados', () => {
    // Replica la resolución que hace react-native-gifted-charts al cargarse.
    const hay = instalado('react-native-linear-gradient') || instalado('expo-linear-gradient');
    expect(hay).toBe(true);
  });

  test('cada dependencia con peers opcionales alternativos tiene al menos uno', () => {
    const directas = Object.keys(pkg.dependencies);
    const faltantes: string[] = [];

    for (const nombre of directas) {
      let meta: any;
      try { meta = require2(nombre + '/package.json'); } catch { continue; }
      const peers: Record<string, string> = meta.peerDependencies ?? {};
      const opcionalidad: Record<string, any> = meta.peerDependenciesMeta ?? {};

      // Peers obligatorios: deben estar todos.
      for (const peer of Object.keys(peers)) {
        if (opcionalidad[peer]?.optional) continue;
        if (peer === 'react' || peer === 'react-native') continue;
        if (SOLO_WEB.has(peer)) continue;
        if (!instalado(peer)) faltantes.push(`${nombre} necesita ${peer}`);
      }

      // Peers opcionales que son alternativas entre sí: hace falta uno.
      const opcionales = Object.keys(peers).filter((p) => opcionalidad[p]?.optional && !SOLO_WEB.has(p));
      if (opcionales.length >= 2 && !opcionales.some(instalado)) {
        faltantes.push(`${nombre} necesita alguno de: ${opcionales.join(' o ')}`);
      }
    }

    expect(faltantes).toEqual([]);
  });
});
