import { NOMBRE_BD } from '@/db/cliente';

/**
 * Copia en bruto del archivo de la base de datos.
 *
 * Es la red de seguridad de más abajo nivel que hay en la app: no interpreta
 * nada, no serializa nada, no depende de que el esquema sea legible. Copia los
 * bytes. Sirve exactamente para el caso en que el respaldo en JSON no serviría:
 * una migración que deja el esquema a medias.
 *
 * `expo-file-system` se carga con require dentro de la función a propósito, para
 * que este módulo pueda importarse desde la capa de datos sin arrastrar nada
 * nativo a las pruebas de Node. Si algo falla, devuelve null y sigue: una copia
 * que no se pudo hacer nunca debe impedir que la app abra.
 */

const CARPETA = 'respaldos';
/** Cuántas copias en bruto se conservan. Pesan poco: son la base entera. */
const MAXIMO = 4;

export function copiarArchivoBd(etiqueta: string): string | null {
  try {
    const { Directory, File, Paths } = require('expo-file-system');

    const origen = new File(Paths.document, 'SQLite', NOMBRE_BD);
    if (!origen.exists) return null;

    const dir = new Directory(Paths.document, CARPETA);
    if (!dir.exists) dir.create({ intermediates: true });

    const marca = new Date().toISOString().replace(/[:.]/g, '-');
    const destino = new File(dir, `bd-${marca}-${etiqueta}.db`);
    if (destino.exists) destino.delete();
    origen.copy(destino);

    podar(Directory, File, Paths);
    return destino.uri;
  } catch {
    return null;
  }
}

/** Copias en bruto guardadas, de la más reciente a la más antigua. */
export function listarCopiasBd(): { nombre: string; uri: string; bytes: number }[] {
  try {
    const { Directory, File, Paths } = require('expo-file-system');
    return listar(Directory, File, Paths);
  } catch {
    return [];
  }
}

function listar(Directory: any, File: any, Paths: any) {
  const dir = new Directory(Paths.document, CARPETA);
  if (!dir.exists) return [];
  return dir.list()
    .filter((f: any) => f instanceof File && f.name.endsWith('.db'))
    .map((f: any) => ({ nombre: f.name, uri: f.uri, bytes: Number(f.size ?? 0) }))
    .sort((a: any, b: any) => (a.nombre < b.nombre ? 1 : -1));
}

function podar(Directory: any, File: any, Paths: any) {
  for (const vieja of listar(Directory, File, Paths).slice(MAXIMO)) {
    try { new File(vieja.uri).delete(); } catch { /* da igual */ }
  }
}
