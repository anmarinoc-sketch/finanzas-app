import { addDays, differenceInCalendarDays, differenceInCalendarMonths, startOfDay } from 'date-fns';

export type EstadoMeta = 'en_curso' | 'adelantada' | 'atrasada' | 'cumplida' | 'vencida';

export const ESTADO_META_TEXTO: Record<EstadoMeta, string> = {
  en_curso: 'En curso',
  adelantada: 'Adelantada',
  atrasada: 'Atrasada',
  cumplida: 'Cumplida',
  vencida: 'Vencida',
};

export const ESTADO_META_COLOR: Record<EstadoMeta, string> = {
  en_curso: '#3B82F6',
  adelantada: '#10B981',
  atrasada: '#F59E0B',
  cumplida: '#10B981',
  vencida: '#EF4444',
};

export type EntradaMeta = {
  montoObjetivo: number;
  montoActual: number;
  fechaLimite: Date | null;
  fechaCreacion: Date;
};

export type CalculoMeta = {
  progreso: number;            // 0..1
  faltante: number;
  mesesRestantes: number | null;
  aporteMensualNecesario: number;
  /** Ritmo real observado (pesos por dia) desde que se creo la meta. */
  ritmoDiario: number;
  fechaProyectada: Date | null;
  estado: EstadoMeta;
  /** Diferencia entre lo aportado y lo que "deberia" llevar segun el plan. */
  desfase: number;
};

/**
 * Motor de una meta de ahorro.
 * - aporteMensualNecesario reparte lo que falta entre los meses que quedan.
 * - fechaProyectada extrapola el ritmo real de aportes, que casi nunca
 *   coincide con el plan: por eso se muestran las dos fechas.
 */
export function calcularMeta(m: EntradaMeta, ahora = new Date()): CalculoMeta {
  const hoy = startOfDay(ahora);
  const objetivo = Math.max(0, m.montoObjetivo);
  const actual = Math.max(0, m.montoActual);
  const faltante = Math.max(0, objetivo - actual);
  const progreso = objetivo > 0 ? Math.min(1, actual / objetivo) : 0;

  const meses = m.fechaLimite ? Math.max(0, differenceInCalendarMonths(m.fechaLimite, hoy)) : null;
  const mesesParaPlan = meses === null ? null : Math.max(1, meses);
  const aporteMensualNecesario = mesesParaPlan === null ? 0 : Math.ceil(faltante / mesesParaPlan);

  const diasVividos = Math.max(1, differenceInCalendarDays(hoy, startOfDay(m.fechaCreacion)));
  const ritmoDiario = actual / diasVividos;
  const fechaProyectada =
    faltante <= 0 ? hoy
    : ritmoDiario > 0 ? addDays(hoy, Math.ceil(faltante / ritmoDiario))
    : null;

  // Lo que "deberia" llevar hoy segun el plan lineal creacion -> fecha limite.
  let desfase = 0;
  if (m.fechaLimite) {
    const totalPlan = Math.max(1, differenceInCalendarDays(m.fechaLimite, startOfDay(m.fechaCreacion)));
    const esperado = objetivo * Math.min(1, diasVividos / totalPlan);
    desfase = Math.round(actual - esperado);
  }

  let estado: EstadoMeta = 'en_curso';
  if (faltante <= 0) estado = 'cumplida';
  else if (m.fechaLimite && hoy > startOfDay(m.fechaLimite)) estado = 'vencida';
  else if (m.fechaLimite && desfase >= objetivo * 0.03) estado = 'adelantada';
  else if (m.fechaLimite && desfase <= -objetivo * 0.03) estado = 'atrasada';

  return {
    progreso, faltante, mesesRestantes: meses, aporteMensualNecesario,
    ritmoDiario, fechaProyectada, estado, desfase,
  };
}

/**
 * Valida si la suma de aportes mensuales necesarios cabe dentro del bolsillo
 * de ahorro definido en el onboarding.
 */
export function cabeEnAhorro(aportesNecesarios: number[], cupoAhorroMensual: number) {
  const requerido = aportesNecesarios.reduce((a, b) => a + b, 0);
  return {
    requerido,
    cupo: cupoAhorroMensual,
    cabe: requerido <= cupoAhorroMensual,
    exceso: Math.max(0, requerido - cupoAhorroMensual),
    holgura: Math.max(0, cupoAhorroMensual - requerido),
  };
}
