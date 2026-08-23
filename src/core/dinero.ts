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
