import { create } from 'zustand';
import type { Frecuencia, TipoBolsillo } from '@/db/schema';
import { COLORES_BOLSILLO } from '@/constantes/paleta';
import { BOLSILLOS_BASE } from '@/constantes/bolsillos';

export type IngresoBorrador = {
  nombre: string; monto: number; frecuencia: Frecuencia;
  /** Segunda quincena, cuando las dos no son iguales. */
  montoSecundario?: number | null;
};
export type BolsilloBorrador = {
  /** Id en la base cuando el bolsillo ya existe; ausente si se acaba de crear. */
  id?: number;
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
  precargarDesdeBD: (datos: Omit<EstadoOnboarding,
    'agregarIngreso' | 'quitarIngreso' | 'setBolsillos' | 'aplicarPlantilla'
    | 'precargarDesdeBD' | 'alternarCategoria' | 'set' | 'reiniciar'>) => void;
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
   * Plantillas rapidas. Se aplican SOBRE los bolsillos que hay ahora: antes
   * se reconstruia la lista desde cero, lo que resucitaba los borrados y
   * eliminaba los personalizados.
   */
  aplicarPlantilla: (p) => {
    const mapa: Record<string, Partial<Record<TipoBolsillo, number>>> = {
      '50/30/20': { necesidades: 50, ocio: 30, ahorro: 12, imprevistos: 5, deudas: 3 },
      '60/20/20': { necesidades: 60, ocio: 20, ahorro: 12, imprevistos: 5, deudas: 3 },
    };
    const tabla = mapa[p];
    const conValores = get().bolsillos.map((b) => ({ ...b, porcentaje: tabla[b.tipo] ?? 0 }));

    // Si el usuario borro alguno de los bolsillos de la plantilla el total no
    // llega a 100: se reescala lo que queda para que siga cuadrando.
    const suma = conValores.reduce((a, b) => a + b.porcentaje, 0);
    let ajustados = conValores;
    if (suma > 0 && suma !== 100) {
      ajustados = conValores.map((b) => ({ ...b, porcentaje: Math.round((b.porcentaje * 100) / suma) }));
      const dif = 100 - ajustados.reduce((a, b) => a + b.porcentaje, 0);
      if (dif !== 0) {
        const may = ajustados.reduce((m, b, k, arr) => (b.porcentaje > arr[m].porcentaje ? k : m), 0);
        ajustados[may] = { ...ajustados[may], porcentaje: ajustados[may].porcentaje + dif };
      }
    }
    set({ bolsillos: ajustados });
  },

  /** Carga en el borrador lo ya guardado, para poder reconfigurar desde Ajustes. */
  precargarDesdeBD: (datos) => set(datos as any),

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
