import { addMonths, differenceInCalendarMonths, startOfMonth } from 'date-fns';

/**
 * Reparte un monto en n cuotas de pesos enteros. La ultima cuota absorbe el
 * residuo para que la suma sea exactamente el monto original.
 */
export function repartirCuotas(monto: number, n: number): number[] {
  const cuotas = Math.max(1, Math.min(36, Math.trunc(n)));
  const base = Math.floor(monto / cuotas);
  const arr = Array<number>(cuotas).fill(base);
  arr[cuotas - 1] = monto - base * (cuotas - 1);
  return arr;
}

export const cuotaMensual = (monto: number, n: number) =>
  Math.round(monto / Math.max(1, Math.min(36, n)));

export type CompraCuotas = {
  id: number;
  descripcion: string;
  monto: number;
  cuotas: number;
  fecha: Date;
  tarjetaId: number | null;
};

export type EstadoCuotas = {
  compra: CompraCuotas;
  cuotaMensual: number;
  cuotasPagadas: number;
  cuotasRestantes: number;
  saldoPendiente: number;
  fechaUltimaCuota: Date;
  activa: boolean;
};

/**
 * Estado de una compra diferida. La cuota 1 se causa en el mes de la compra,
 * por eso el numero de cuotas pagadas es la diferencia de meses + 1.
 */
export function estadoCuotas(compra: CompraCuotas, ahora = new Date()): EstadoCuotas {
  const n = Math.max(1, compra.cuotas || 1);
  const transcurridos = differenceInCalendarMonths(startOfMonth(ahora), startOfMonth(compra.fecha));
  const pagadas = Math.min(n, Math.max(0, transcurridos + 1));
  const restantes = Math.max(0, n - pagadas);
  const cuota = cuotaMensual(compra.monto, n);
  return {
    compra,
    cuotaMensual: cuota,
    cuotasPagadas: pagadas,
    cuotasRestantes: restantes,
    saldoPendiente: Math.max(0, compra.monto - cuota * pagadas),
    fechaUltimaCuota: addMonths(startOfMonth(compra.fecha), n - 1),
    activa: restantes > 0,
  };
}

/** Carga mensual total de cuotas vivas (lo que hay que pagar este mes si o si). */
export function cargaMensualCuotas(compras: CompraCuotas[], ahora = new Date()): number {
  return compras
    .map((c) => estadoCuotas(c, ahora))
    .filter((e) => e.activa || e.cuotasPagadas === e.compra.cuotas)
    .filter((e) => e.cuotasRestantes > 0)
    .reduce((t, e) => t + e.cuotaMensual, 0);
}
