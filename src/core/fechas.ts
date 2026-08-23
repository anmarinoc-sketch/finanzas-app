import {
  addDays, addMonths, differenceInCalendarDays, endOfDay, format,
  getDaysInMonth, isAfter, isBefore, parseISO, startOfDay, subMonths,
} from 'date-fns';
import { es } from 'date-fns/locale';

export type Rango = { desde: Date; hasta: Date };

export const hoy = () => startOfDay(new Date());
export const aISO = (d: Date) => format(d, 'yyyy-MM-dd');
export const deISO = (s: string) => parseISO(s.length > 10 ? s.slice(0, 10) : s);

export const fmtCorta = (d: Date) => format(d, "d 'de' MMM", { locale: es });
export const fmtLarga = (d: Date) => format(d, "EEEE d 'de' MMMM 'de' yyyy", { locale: es });
export const fmtMes = (d: Date) => format(d, 'MMMM yyyy', { locale: es });
export const fmtMesCorto = (d: Date) => format(d, 'MMM', { locale: es });
export const fmtDiaSemana = (d: Date) => format(d, 'EEEE', { locale: es });

export const capitalizar = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/**
 * Ancla un dia de corte a un mes concreto. Si el ciclo empieza el 31 y el mes
 * tiene 30 dias, se usa el ultimo dia disponible.
 */
export function anclarDia(anio: number, mes0: number, dia: number): Date {
  const base = new Date(anio, mes0, 1);
  const max = getDaysInMonth(base);
  return startOfDay(new Date(anio, mes0, Math.min(Math.max(1, dia), max)));
}

/**
 * Ciclo financiero que contiene a `fecha`, empezando el dia `diaInicio`.
 * Con diaInicio = 1 coincide con el mes calendario.
 */
export function cicloDe(fecha: Date, diaInicio: number): Rango {
  const f = startOfDay(fecha);
  let inicio = anclarDia(f.getFullYear(), f.getMonth(), diaInicio);
  if (isBefore(f, inicio)) {
    const prev = subMonths(f, 1);
    inicio = anclarDia(prev.getFullYear(), prev.getMonth(), diaInicio);
  }
  const sig = addMonths(inicio, 1);
  const fin = endOfDay(addDays(anclarDia(sig.getFullYear(), sig.getMonth(), diaInicio), -1));
  return { desde: inicio, hasta: fin };
}

/** Desplaza un ciclo n posiciones (negativo = hacia atras). */
export function moverCiclo(rango: Rango, n: number, diaInicio: number): Rango {
  return cicloDe(addMonths(rango.desde, n), diaInicio);
}

/** Etiqueta legible del ciclo: "Agosto 2026" o "15 ago – 14 sep". */
export function etiquetaCiclo(r: Rango, diaInicio: number): string {
  if (diaInicio === 1) return capitalizar(fmtMes(r.desde));
  return `${format(r.desde, 'd MMM', { locale: es })} – ${format(r.hasta, 'd MMM', { locale: es })}`;
}

/** Progreso temporal del ciclo (0..1) y dias restantes, con `hoy` inyectable. */
export function progresoCiclo(r: Rango, ahora = new Date()) {
  const total = differenceInCalendarDays(r.hasta, r.desde) + 1;
  const transcurridos = Math.min(total, Math.max(0, differenceInCalendarDays(startOfDay(ahora), r.desde) + 1));
  const restantes = Math.max(0, total - transcurridos);
  return { total, transcurridos, restantes, fraccion: total > 0 ? transcurridos / total : 0 };
}

export const dentroDe = (d: Date, r: Rango) => !isBefore(d, r.desde) && !isAfter(d, r.hasta);

/** Ultimos n ciclos terminando en el que contiene a `ref` (mas antiguo primero). */
export function ultimosCiclos(n: number, diaInicio: number, ref = new Date()): Rango[] {
  const actual = cicloDe(ref, diaInicio);
  return Array.from({ length: n }, (_, i) => moverCiclo(actual, i - (n - 1), diaInicio));
}
