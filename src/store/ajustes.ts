import { create } from 'zustand';
import { guardarUsuario, obtenerUsuario } from '@/db/crud';
import type { Usuario } from '@/db/schema';

type Tema = 'sistema' | 'claro' | 'oscuro';

type EstadoAjustes = {
  cargado: boolean;
  onboardingCompleto: boolean;
  tema: Tema;
  diaInicioCiclo: number;
  pinActivo: boolean;
  pin: string | null;
  biometria: boolean;
  notificaciones: boolean;
  nombre: string;
  /** Se pone en true tras pasar el bloqueo; no se persiste. */
  desbloqueado: boolean;

  cargar: () => void;
  aplicar: (parcial: Partial<Usuario>) => void;
  setDesbloqueado: (v: boolean) => void;
};

/**
 * Preferencias del usuario. La fuente de verdad es SQLite; el store es el
 * espejo en memoria para que el tema y el bloqueo reaccionen al instante.
 */
export const useAjustes = create<EstadoAjustes>((set) => ({
  cargado: false,
  onboardingCompleto: false,
  tema: 'sistema',
  diaInicioCiclo: 1,
  pinActivo: false,
  pin: null,
  biometria: false,
  notificaciones: true,
  nombre: '',
  desbloqueado: false,

  cargar: () => {
    const u = obtenerUsuario();
    if (!u) {
      set({ cargado: true, onboardingCompleto: false, desbloqueado: true });
      return;
    }
    set({
      cargado: true,
      onboardingCompleto: !!u.onboardingCompleto,
      tema: (u.tema as Tema) ?? 'sistema',
      diaInicioCiclo: u.diaInicioCiclo ?? 1,
      pinActivo: !!u.pinActivo,
      pin: u.pin ?? null,
      biometria: !!u.biometria,
      notificaciones: !!u.notificaciones,
      nombre: u.nombre ?? '',
      desbloqueado: !u.pinActivo && !u.biometria,
    });
  },

  aplicar: (parcial) => {
    guardarUsuario(parcial);
    const u = obtenerUsuario();
    if (!u) return;
    set({
      onboardingCompleto: !!u.onboardingCompleto,
      tema: (u.tema as Tema) ?? 'sistema',
      diaInicioCiclo: u.diaInicioCiclo ?? 1,
      pinActivo: !!u.pinActivo,
      pin: u.pin ?? null,
      biometria: !!u.biometria,
      notificaciones: !!u.notificaciones,
      nombre: u.nombre ?? '',
    });
  },

  setDesbloqueado: (v) => set({ desbloqueado: v }),
}));
