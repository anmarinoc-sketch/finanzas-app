import { addDays, addMonths, addWeeks, addYears, isBefore, startOfDay } from 'date-fns';
import type { Frecuencia } from '@/db/schema';

/** Avanza una fecha un periodo segun la frecuencia. */
export function siguienteFecha(fecha: Date, f: Frecuencia): Date {
  switch (f) {
    case 'diaria': return addDays(fecha, 1);
    case 'semanal': return addWeeks(fecha, 1);
    case 'quincenal': return addDays(fecha, 15);
    case 'mensual': return addMonths(fecha, 1);
    case 'bimestral': return addMonths(fecha, 2);
    case 'trimestral': return addMonths(fecha, 3);
    case 'semestral': return addMonths(fecha, 6);
    case 'anual': return addYears(fecha, 1);
    default: return addMonths(fecha, 1);
  }
}

/** Avanza la proxima fecha hasta que quede en el futuro (por si la app estuvo cerrada meses). */
export function normalizarProxima(proxima: Date, f: Frecuencia, ahora = new Date()): Date {
  if (f === 'ocasional') return proxima;
  let d = startOfDay(proxima);
  let guarda = 0;
  while (isBefore(d, startOfDay(ahora)) && guarda++ < 500) d = siguienteFecha(d, f);
  return d;
}

/** Costo anual equivalente de un cargo recurrente. */
export const costoAnual = (monto: number, f: Frecuencia): number => {
  const veces: Record<Frecuencia, number> = {
    diaria: 365, semanal: 52, quincenal: 24, mensual: 12, bimestral: 6,
    trimestral: 4, semestral: 2, anual: 1, ocasional: 0,
  };
  return Math.round(monto * (veces[f] ?? 0));
};

export const costoMensual = (monto: number, f: Frecuencia) => Math.round(costoAnual(monto, f) / 12);

/** Cargos que vencen dentro de los proximos `dias`. */
export function porVencer<T extends { proximaFecha: string; activo: number | boolean }>(
  lista: T[], dias = 7, ahora = new Date(),
): T[] {
  const limite = addDays(startOfDay(ahora), dias);
  return lista.filter((r) => {
    if (!r.activo) return false;
    const f = startOfDay(new Date(r.proximaFecha));
    return !isBefore(limite, f);
  });
}
