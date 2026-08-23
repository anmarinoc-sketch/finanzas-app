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

export type IngresoCalculo = { monto: number; frecuencia: Frecuencia; activo?: boolean };

/** Ingreso mensual estimado: suma de los ingresos recurrentes activos. */
export function ingresoMensualEstimado(ingresos: IngresoCalculo[]): number {
  return Math.round(
    ingresos.filter((i) => i.activo !== false).reduce((t, i) => t + aMensual(i.monto, i.frecuencia), 0),
  );
}

/** Promedio mensual de los ingresos ocasionales observados en los ultimos meses. */
export function promedioOcasional(montos: number[], meses: number): number {
  if (meses <= 0) return 0;
  return Math.round(montos.reduce((a, b) => a + b, 0) / meses);
}
