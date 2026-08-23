import { create } from 'zustand';
import type { Frecuencia, TipoBolsillo } from '@/db/schema';
import { COLORES_BOLSILLO } from '@/constantes/paleta';
import { BOLSILLOS_BASE } from '@/db/seed';

export type IngresoBorrador = { nombre: string; monto: number; frecuencia: Frecuencia };
export type BolsilloBorrador = {
  nombre: string; tipo: TipoBolsillo; porcentaje: number; color: string; icono: string;
};

type EstadoOnboarding = {
  ingresos: IngresoBorrador[];
  bolsillos: BolsilloBorrador[];
  categoriasDesactivadas: number[];
  diaInicioCiclo: number;
  tema: 'sistema' | 'claro' | 'oscuro';
  biometria: boolean;
  notificaciones: boolean;
  nombre: string;

  agregarIngreso: (i: IngresoBorrador) => void;
  quitarIngreso: (idx: number) => void;
  setBolsillos: (b: BolsilloBorrador[]) => void;
  aplicarPlantilla: (p: '50/30/20' | '60/20/20') => void;
  alternarCategoria: (id: number) => void;
  set: (p: Partial<EstadoOnboarding>) => void;
  reiniciar: () => void;
};

const inicial = (): BolsilloBorrador[] =>
  BOLSILLOS_BASE.map((b) => ({
    nombre: b.nombre, tipo: b.tipo, porcentaje: b.porcentaje,
    color: COLORES_BOLSILLO[b.tipo], icono: b.icono,
  }));

/** Borrador del onboarding: nada toca la base hasta el ultimo paso. */
export const useOnboarding = create<EstadoOnboarding>((set, get) => ({
  ingresos: [],
  bolsillos: inicial(),
  categoriasDesactivadas: [],
  diaInicioCiclo: 1,
  tema: 'sistema',
  biometria: false,
  notificaciones: true,
  nombre: '',

  agregarIngreso: (i) => set({ ingresos: [...get().ingresos, i] }),
  quitarIngreso: (idx) => set({ ingresos: get().ingresos.filter((_, k) => k !== idx) }),
  setBolsillos: (b) => set({ bolsillos: b }),

  /**
   * Plantillas rapidas. 50/30/20 mapea necesidades/ocio/ahorro; el resto de
   * bolsillos se reparte dentro del bloque de ahorro para no romper el 100%.
   */
  aplicarPlantilla: (p) => {
    const mapa: Record<string, Record<TipoBolsillo, number>> = {
      '50/30/20': { necesidades: 50, ocio: 30, ahorro: 12, imprevistos: 5, deudas: 3, personalizado: 0 },
      '60/20/20': { necesidades: 60, ocio: 20, ahorro: 12, imprevistos: 5, deudas: 3, personalizado: 0 },
    };
    const tabla = mapa[p];
    set({
      bolsillos: inicial().map((b) => ({ ...b, porcentaje: tabla[b.tipo] ?? 0 })),
    });
  },

  alternarCategoria: (id) => {
    const act = get().categoriasDesactivadas;
    set({ categoriasDesactivadas: act.includes(id) ? act.filter((x) => x !== id) : [...act, id] });
  },

  set: (p) => set(p as any),
  reiniciar: () => set({
    ingresos: [], bolsillos: inicial(), categoriasDesactivadas: [],
    diaInicioCiclo: 1, tema: 'sistema', biometria: false, notificaciones: true, nombre: '',
  }),
}));
