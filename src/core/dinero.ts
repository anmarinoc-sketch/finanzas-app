/**
 * Formato de moneda colombiana.
 * No usamos Intl porque el soporte de locales en Hermes/Android es irregular
 * segun el dispositivo; el formato COP es simple y deterministico.
 */

/** 1250000 -> "1.250.000" */
export function separarMiles(n: number): string {
  const entero = Math.trunc(Math.abs(n));
  return entero.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export type OpcionesMoneda = { decimales?: boolean; signo?: boolean; simbolo?: boolean };

/** 1250000 -> "$ 1.250.000" */
export function formatoCOP(n: number, opts: OpcionesMoneda = {}): string {
  const { decimales = false, signo = false, simbolo = true } = opts;
  const negativo = n < 0;
  const abs = Math.abs(n);
  let cuerpo = separarMiles(abs);
  if (decimales) {
    const dec = Math.round((abs - Math.trunc(abs)) * 100).toString().padStart(2, '0');
    cuerpo += ',' + dec;
  }
  const prefijo = negativo ? '-' : signo ? '+' : '';
  return `${prefijo}${simbolo ? '$ ' : ''}${cuerpo}`;
}

/** Version corta para ejes de graficos: 1250000 -> "1,25 M" */
export function formatoCorto(n: number): string {
  const abs = Math.abs(n);
  const s = n < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${s}${(abs / 1_000_000_000).toFixed(1).replace('.', ',')} MM`;
  if (abs >= 1_000_000) return `${s}${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1).replace('.', ',')} M`;
  if (abs >= 1_000) return `${s}${Math.round(abs / 1_000)} k`;
  return `${s}${Math.round(abs)}`;
}

/** Convierte lo que el usuario teclea ("1.250.000" o "1250000,50") a numero. */
export function parsearMonto(texto: string): number {
  if (!texto) return 0;
  const limpio = texto.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
  const n = Number(limpio);
  return Number.isFinite(n) ? n : 0;
}

/** Redondeo a pesos enteros (COP no usa centavos en la practica). */
export const aPesos = (n: number) => Math.round(n);

export const porcentaje = (parte: number, total: number) =>
  total <= 0 ? 0 : (parte / total) * 100;

/** "68%" con maximo un decimal cuando aporta informacion. */
export function formatoPct(p: number, decimales = 0): string {
  if (!Number.isFinite(p)) return '0%';
  return `${p.toFixed(decimales).replace('.', ',')}%`;
}

/* ------------------------------------------------------------------ *
 * Edición del monto con cursor
 *
 * El monto se muestra formateado ("1.250.000") pero por dentro son solo
 * dígitos ("1250000"). Para poder tocar el número y borrar un dígito
 * concreto hay que traducir entre la posición del cursor en el texto
 * formateado y la posición en la cadena de dígitos.
 * ------------------------------------------------------------------ */

/** Dígitos que hay antes del cursor en el texto formateado. */
export function digitosAntesDelCursor(formateado: string, cursor: number): number {
  let n = 0;
  for (let i = 0; i < Math.min(cursor, formateado.length); i++) {
    if (formateado[i] >= '0' && formateado[i] <= '9') n++;
  }
  return n;
}

/** Posición del cursor que deja `cuantos` dígitos a su izquierda. */
export function cursorTrasDigitos(formateado: string, cuantos: number): number {
  if (cuantos <= 0) return 0;
  let n = 0;
  for (let i = 0; i < formateado.length; i++) {
    if (formateado[i] >= '0' && formateado[i] <= '9') {
      n++;
      if (n === cuantos) return i + 1;
    }
  }
  return formateado.length;
}

/** Inserta un dígito (o varios, como "000") en la posición indicada. */
export function insertarDigitos(digitos: string, posicion: number, nuevos: string): string {
  const p = Math.max(0, Math.min(posicion, digitos.length));
  const resultado = digitos.slice(0, p) + nuevos + digitos.slice(p);
  // Sin ceros a la izquierda, y con un techo razonable para un monto en pesos.
  return resultado.replace(/^0+(?=\d)/, '').slice(0, 12);
}

/** Borra el dígito que está justo antes de la posición indicada. */
export function borrarDigito(digitos: string, posicion: number): string {
  const p = Math.max(0, Math.min(posicion, digitos.length));
  if (p === 0) return digitos;
  return digitos.slice(0, p - 1) + digitos.slice(p);
}
