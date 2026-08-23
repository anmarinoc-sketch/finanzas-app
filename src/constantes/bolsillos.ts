import type { TipoBolsillo } from '@/db/schema';

/** Distribución por defecto: 50/30/20 ampliada con imprevistos y deudas. */
export const BOLSILLOS_BASE: {
  nombre: string; tipo: TipoBolsillo; porcentaje: number; icono: string;
}[] = [
  { nombre: 'Necesidades', tipo: 'necesidades', porcentaje: 50, icono: 'home-outline' },
  { nombre: 'Ocio', tipo: 'ocio', porcentaje: 20, icono: 'game-controller-outline' },
  { nombre: 'Ahorro', tipo: 'ahorro', porcentaje: 15, icono: 'wallet-outline' },
  { nombre: 'Imprevistos', tipo: 'imprevistos', porcentaje: 10, icono: 'umbrella-outline' },
  { nombre: 'Deudas', tipo: 'deudas', porcentaje: 5, icono: 'card-outline' },
];
