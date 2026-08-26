import type { Frecuencia } from '@/db/schema';

/**
 * Factor de conversion a base mensual.
 * - semanal: 52 semanas / 12 meses = 4,3333 pagos al mes (no 4; ignorarlo
 *   subestima el ingreso anual en casi un mes completo de sueldo).
 * - quincenal: 24 pagos al ano = 2 al mes.
 * - ocasional: no se proyecta como recurrente, aporta 0 al ingreso estimado.
 */
export const FACTOR_MENSUAL: Record<Frecuencia, number> = {
  diaria: 30.4375,
  semanal: 52 / 12,
  quincenal: 2,
  mensual: 1,
  bimestral: 1 / 2,
  trimestral: 1 / 3,
  semestral: 1 / 6,
  anual: 1 / 12,
  ocasional: 0,
};

export const aMensual = (monto: number, f: Frecuencia) => monto * (FACTOR_MENSUAL[f] ?? 0);

export type IngresoCalculo = {
  monto: number;
  frecuencia: Frecuencia;
  /** SQLite guarda los booleanos como 0/1, así que se aceptan ambos. */
  activo?: boolean | number;
  /**
   * Segunda quincena, cuando las dos no pagan lo mismo. Solo se usa con
   * frecuencia quincenal; en el resto se ignora.
   */
  montoSecundario?: number | null;
};

/**
 * Aporte mensual de un ingreso concreto.
 *
 * Un sueldo quincenal no siempre paga igual las dos veces: si se declara la
 * segunda quincena, se suman las dos en vez de multiplicar la primera por dos.
 * Suponer que ambas son iguales inflaba o desinflaba el ingreso estimado, y
 * con el ingreso se calculan bolsillos, presupuestos y metas.
 */
export function mensualDeIngreso(i: IngresoCalculo): number {
  if (i.activo === false || i.activo === 0) return 0;
  if (i.frecuencia === 'quincenal' && i.montoSecundario != null && i.montoSecundario > 0) {
    return i.monto + i.montoSecundario;
  }
  return aMensual(i.monto, i.frecuencia);
}

/** Ingreso mensual estimado: suma de los ingresos recurrentes activos. */
export function ingresoMensualEstimado(ingresos: IngresoCalculo[]): number {
  return Math.round(ingresos.reduce((t, i) => t + mensualDeIngreso(i), 0));
}

/** Promedio mensual de los ingresos ocasionales observados en los ultimos meses. */
export function promedioOcasional(montos: number[], meses: number): number {
  if (meses <= 0) return 0;
  return Math.round(montos.reduce((a, b) => a + b, 0) / meses);
}
