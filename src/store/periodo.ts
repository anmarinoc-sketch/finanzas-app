import { create } from 'zustand';
import { cicloDe, moverCiclo, type Rango } from '@/core/fechas';

type EstadoPeriodo = {
  /** Desplazamiento en ciclos respecto al actual (0 = ciclo vigente). */
  offset: number;
  mover: (n: number) => void;
  ir: (n: number) => void;
};

/** Periodo compartido entre Inicio, Movimientos y Analisis. */
export const usePeriodo = create<EstadoPeriodo>((set, get) => ({
  offset: 0,
  mover: (n) => set({ offset: Math.min(0, get().offset + n) }),
  ir: (n) => set({ offset: Math.min(0, n) }),
}));

export function rangoActual(diaInicio: number, offset: number): Rango {
  const base = cicloDe(new Date(), diaInicio);
  return offset === 0 ? base : moverCiclo(base, offset, diaInicio);
}
