import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/**
 * Escribe un archivo en el directorio de cache y abre la hoja de compartir.
 * Se usa cache porque son archivos de salida: el sistema puede limpiarlos.
 */
export async function guardarYCompartir(nombre: string, contenido: string, mime: string) {
  const dir = new Directory(Paths.cache, 'exportes');
  if (!dir.exists) dir.create({ intermediates: true });
  const archivo = new File(dir, nombre);
  if (archivo.exists) archivo.delete();
  archivo.create();
  archivo.write(contenido);
  await compartirUri(archivo.uri, mime, nombre);
  return archivo.uri;
}

export async function compartirUri(uri: string, mime: string, titulo: string) {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Este dispositivo no permite compartir archivos.');
  }
  await Sharing.shareAsync(uri, { mimeType: mime, dialogTitle: titulo, UTI: mime });
}

/** Lee un archivo de texto elegido por el usuario (restaurar copia de seguridad). */
export async function leerTexto(uri: string): Promise<string> {
  const f = new File(uri);
  return f.textSync();
}
