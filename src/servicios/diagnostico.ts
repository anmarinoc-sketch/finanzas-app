import { bdNativa } from '@/db/cliente';

/**
 * Detección de bucles de cierre y registro del último error.
 *
 * El problema que resuelve: si la app falla justo al abrir, el usuario queda
 * fuera y no hay forma de recuperarla salvo borrar los datos desde Android.
 * Aquí se lleva un contador de arranques que no llegaron a estabilizarse; al
 * segundo, la app arranca en modo recuperación en vez de volver a caer.
 */

const MAX_FALLOS = 2;
/** Segundos que la app debe sobrevivir para considerar el arranque bueno. */
export const SEGUNDOS_ESTABLE = 6;

function leer(clave: string): string | null {
  try {
    return bdNativa.getFirstSync<{ valor: string }>(
      'SELECT valor FROM diagnostico WHERE clave = ?', [clave],
    )?.valor ?? null;
  } catch { return null; }
}

function escribir(clave: string, valor: string) {
  try {
    bdNativa.runSync(
      'INSERT INTO diagnostico (clave, valor) VALUES (?, ?) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor',
      [clave, valor],
    );
  } catch { /* si ni esto se puede escribir, no hay nada que hacer */ }
}

/** Suma uno al contador de arranques y dice si toca entrar en recuperación. */
export function registrarArranque(): { fallos: number; recuperacion: boolean } {
  const fallos = Number(leer('arranques_sin_confirmar') ?? '0') + 1;
  escribir('arranques_sin_confirmar', String(fallos));
  return { fallos, recuperacion: fallos > MAX_FALLOS };
}

/** La app lleva un rato viva: el arranque fue bueno. */
export function confirmarArranque() {
  escribir('arranques_sin_confirmar', '0');
}

/** Banderas sueltas de configuracion que deben sobrevivir a los reinicios. */
export const leerBandera = (clave: string) => leer(clave);
export const escribirBandera = (clave: string, valor: string) => escribir(clave, valor);

export type ErrorRegistrado = {
  mensaje: string; pila: string; contexto: string; fecha: string; fatal: boolean;
};

export function guardarError(e: unknown, contexto: string, fatal = false) {
  const err = e as any;
  const registro: ErrorRegistrado = {
    mensaje: String(err?.message ?? err ?? 'Error desconocido'),
    pila: String(err?.stack ?? '').split('\n').slice(0, 12).join('\n'),
    contexto,
    fecha: new Date().toISOString(),
    fatal,
  };
  escribir('ultimo_error', JSON.stringify(registro));
}

export function leerUltimoError(): ErrorRegistrado | null {
  const crudo = leer('ultimo_error');
  if (!crudo) return null;
  try { return JSON.parse(crudo) as ErrorRegistrado; } catch { return null; }
}

export function limpiarError() { escribir('ultimo_error', ''); }

/**
 * Engancha el manejador global de errores de React Native para dejar rastro
 * de cualquier fallo, también los que ocurren fuera del render.
 */
export function instalarManejadorGlobal() {
  const g = globalThis as any;
  if (!g.ErrorUtils || g.__manejadorMisFinanzas) return;
  const anterior = g.ErrorUtils.getGlobalHandler?.();
  g.ErrorUtils.setGlobalHandler((error: unknown, fatal?: boolean) => {
    guardarError(error, 'manejador global', !!fatal);
    anterior?.(error, fatal);
  });
  g.__manejadorMisFinanzas = true;
}
