import { Directory, File, Paths } from 'expo-file-system';
import { importarBackup, volcarTodo } from './exportar';
import { escribirBandera, guardarError, leerBandera } from './diagnostico';

/**
 * Copias automáticas dentro del propio teléfono.
 *
 * Existe por una pérdida de datos real: la app quedó atrapada en modo
 * recuperación y el borrado que se ofrecía ahí no hacía copia previa. Ahora
 * nada destructivo ocurre sin dejar antes un respaldo en disco, y además se
 * guarda uno al día sin que el usuario tenga que acordarse de nada.
 *
 * Se guardan en el directorio de documentos, no en la caché: la caché la
 * puede vaciar Android, y un DELETE de la base no toca estos archivos.
 */

const CARPETA = 'respaldos';
const MAXIMO = 8;
const HORAS_ENTRE_AUTOMATICOS = 20;

function carpeta(): Directory {
  const d = new Directory(Paths.document, CARPETA);
  if (!d.exists) d.create({ intermediates: true });
  return d;
}

export type Respaldo = {
  nombre: string;
  uri: string;
  fecha: Date;
  motivo: string;
  registros: number;
};

/** Crea un respaldo y poda los más viejos. Nunca lanza. */
export function crearRespaldo(motivo: string): Respaldo | null {
  try {
    const payload = volcarTodo(motivo);
    // Sin datos no tiene sentido guardar nada: solo desplazaría a los buenos.
    if (payload.registros === 0) return null;

    const marca = payload.exportadoEn.replace(/[:.]/g, '-');
    const archivo = new File(carpeta(), `respaldo-${marca}-${motivo}.json`);
    if (archivo.exists) archivo.delete();
    archivo.create();
    archivo.write(JSON.stringify(payload));

    podar();
    return {
      nombre: archivo.name, uri: archivo.uri,
      fecha: new Date(payload.exportadoEn), motivo, registros: payload.registros,
    };
  } catch (e) {
    guardarError(e, 'creación de respaldo automático');
    return null;
  }
}

/** Respaldos guardados, del más reciente al más antiguo. */
export function listarRespaldos(): Respaldo[] {
  try {
    return carpeta().list()
      .filter((f): f is File => f instanceof File && f.name.endsWith('.json'))
      .map((f) => {
        try {
          const p = JSON.parse(f.textSync());
          return {
            nombre: f.name, uri: f.uri,
            fecha: new Date(p.exportadoEn ?? 0),
            motivo: String(p.motivo ?? 'desconocido'),
            registros: Number(p.registros ?? 0),
          };
        } catch { return null; }
      })
      .filter((r): r is Respaldo => r !== null)
      .sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
  } catch { return []; }
}

function podar() {
  const todos = listarRespaldos();
  for (const viejo of todos.slice(MAXIMO)) {
    try { new File(viejo.uri).delete(); } catch { /* da igual */ }
  }
}

/** Restaura un respaldo. Antes deja copia del estado actual, por si acaso. */
export function restaurarRespaldo(uri: string): { registros: number } {
  crearRespaldo('antes-de-restaurar');
  const texto = new File(uri).textSync();
  return importarBackup(texto);
}

/**
 * Un respaldo al día, sin que el usuario tenga que acordarse. Se llama al
 * abrir la app, ya con el arranque estabilizado.
 */
export function respaldoDiarioSiToca(): Respaldo | null {
  const ultimo = leerBandera('ultimo_respaldo_auto');
  if (ultimo) {
    const horas = (Date.now() - Number(ultimo)) / 3_600_000;
    if (horas < HORAS_ENTRE_AUTOMATICOS) return null;
  }
  const r = crearRespaldo('automático');
  if (r) escribirBandera('ultimo_respaldo_auto', String(Date.now()));
  return r;
}
