import type { MedioPago } from '@/db/schema';

export type InfoMedio = {
  id: MedioPago;
  nombre: string;
  icono: string;
  color: string;
  /** Aclaración corta para los casos en que el nombre no se explica solo. */
  detalle?: string;
};

/**
 * Medios de pago que se ofrecen al registrar un movimiento.
 *
 * Son solo tres a propósito: es como paga Andrés en la práctica, y una lista
 * corta se elige de un toque. Registrar un gasto tiene que caber en menos de
 * cinco segundos, y cada opción de más es una decisión de más.
 */
export const MEDIOS_PAGO: InfoMedio[] = [
  { id: 'efectivo', nombre: 'Efectivo', icono: 'cash-outline', color: '#22C55E' },
  { id: 'transferencia', nombre: 'Transferencia', icono: 'swap-horizontal-outline', color: '#6366F1' },
  {
    id: 'mixto', nombre: 'Mixto', icono: 'shuffle-outline', color: '#14B8A6',
    detalle: 'Efectivo y transferencia',
  },
];

/**
 * La tarjeta de crédito no está en la lista de arriba, pero sigue existiendo:
 * se ofrece solo si hay alguna tarjeta registrada. Sin esto, el módulo de
 * tarjetas y cuotas quedaría sin ninguna forma de alimentarlo.
 */
export const MEDIO_CREDITO: InfoMedio = {
  id: 'credito', nombre: 'Tarjeta crédito', icono: 'card', color: '#EF4444',
};

/**
 * Medios que la app ofreció antes y ya no se eligen.
 *
 * Tienen que seguir aquí porque los movimientos ya registrados los usan: sin
 * esta lista, un pago hecho con tarjeta débito aparecería como "Otro" en el
 * historial y en los gráficos. Nada de lo ya registrado se toca ni se
 * reinterpreta.
 */
export const MEDIOS_ANTERIORES: InfoMedio[] = [
  MEDIO_CREDITO,
  { id: 'debito', nombre: 'Tarjeta débito', icono: 'card-outline', color: '#3B82F6' },
  { id: 'nequi', nombre: 'Nequi', icono: 'phone-portrait-outline', color: '#EC4899' },
  { id: 'daviplata', nombre: 'Daviplata', icono: 'phone-portrait', color: '#F43F5E' },
  { id: 'otro', nombre: 'Otro', icono: 'ellipsis-horizontal', color: '#64748B' },
];

export const TODOS_LOS_MEDIOS: InfoMedio[] = [...MEDIOS_PAGO, ...MEDIOS_ANTERIORES];

export const infoMedio = (id?: string | null) => TODOS_LOS_MEDIOS.find((m) => m.id === id);
export const nombreMedio = (id?: string | null) => infoMedio(id)?.nombre ?? 'Otro';
export const iconoMedio = (id?: string | null) => infoMedio(id)?.icono ?? 'ellipsis-horizontal';

/**
 * Medios que deben aparecer en los filtros: los que se pueden elegir hoy, más
 * los antiguos que de verdad aparecen en el historial. Así no se puede filtrar
 * por algo que no existe, ni queda gasto imposible de encontrar por su medio.
 */
export function mediosParaFiltro(usados: (string | null | undefined)[]): InfoMedio[] {
  const vistos = new Set(usados.filter(Boolean) as string[]);
  const visibles = new Set(MEDIOS_PAGO.map((m) => m.id));
  return [
    ...MEDIOS_PAGO,
    ...MEDIOS_ANTERIORES.filter((m) => vistos.has(m.id) && !visibles.has(m.id)),
  ];
}
