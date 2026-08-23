import { formatoCOP } from './dinero';

export type NivelPresupuesto = 'sano' | 'atencion' | 'alerta' | 'excedido';

export const NIVEL_COLOR: Record<NivelPresupuesto, string> = {
  sano: '#10B981',
  atencion: '#F59E0B',
  alerta: '#EF4444',
  excedido: '#B91C1C',
};

export function nivelPorConsumo(fraccion: number): NivelPresupuesto {
  if (fraccion > 1) return 'excedido';
  if (fraccion > 0.9) return 'alerta';
  if (fraccion >= 0.7) return 'atencion';
  return 'sano';
}

export type EstadoPresupuesto = {
  presupuesto: number;
  gastado: number;
  restante: number;
  fraccion: number;        // 0..n  (puede pasar de 1 si se excedio)
  nivel: NivelPresupuesto;
  color: string;
  /** Proyeccion de cierre extrapolando el ritmo actual al total del ciclo. */
  proyeccion: number;
  /** Diferencia entre la proyeccion y el presupuesto (positivo = sobregiro). */
  desvioProyectado: number;
  /** Cuanto se puede gastar por dia con lo que queda del presupuesto. */
  disponibleDiario: number;
  /** true si va gastando mas rapido que el paso del tiempo. */
  ritmoAlto: boolean;
  fraccionTiempo: number;
};

/**
 * Nucleo del control presupuestal. Todo el modulo de alertas se apoya aqui.
 * `diasTranscurridos` cuenta el dia de hoy como transcurrido (1-indexado).
 */
export function evaluarPresupuesto(
  presupuesto: number,
  gastado: number,
  diasTranscurridos: number,
  diasTotales: number,
): EstadoPresupuesto {
  const p = Math.max(0, presupuesto);
  const g = Math.max(0, gastado);
  const dt = Math.max(1, diasTranscurridos);
  const total = Math.max(1, diasTotales);
  const fraccion = p > 0 ? g / p : 0;
  const nivel = p > 0 ? nivelPorConsumo(fraccion) : 'sano';
  const proyeccion = Math.round((g / dt) * total);
  const restante = p - g;
  const diasRestantes = Math.max(1, total - dt + 1);
  return {
    presupuesto: p,
    gastado: g,
    restante,
    fraccion,
    nivel,
    color: NIVEL_COLOR[nivel],
    proyeccion,
    desvioProyectado: Math.round(proyeccion - p),
    disponibleDiario: Math.max(0, Math.round(restante / diasRestantes)),
    ritmoAlto: p > 0 && fraccion > dt / total + 0.05,
    fraccionTiempo: dt / total,
  };
}

/**
 * Frase de alerta de ritmo, como la pide el brief:
 * "Vas en el 68% de tu presupuesto de Alimentación y solo ha pasado el 40% del mes..."
 * Devuelve null cuando no hay nada que advertir.
 */
export function fraseRitmo(nombre: string, e: EstadoPresupuesto): string | null {
  if (e.presupuesto <= 0 || e.gastado <= 0) return null;
  const pctGasto = Math.round(e.fraccion * 100);
  const pctTiempo = Math.round(e.fraccionTiempo * 100);
  if (e.fraccion > 1) {
    return `Te pasaste del presupuesto de ${nombre} en ${formatoCOP(Math.abs(e.restante))}.`;
  }
  if (!e.ritmoAlto) return null;
  return (
    `Vas en el ${pctGasto}% de tu presupuesto de ${nombre} y solo ha pasado el ${pctTiempo}% del ciclo. ` +
    `A este ritmo terminarás en ${formatoCOP(e.proyeccion)}, es decir ${formatoCOP(e.desvioProyectado)} por encima.`
  );
}
