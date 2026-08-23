import { Platform } from 'react-native';

/**
 * Sistema visual. Un acento fuerte (indigo), neutros graduados y semanticos
 * consistentes. Los mismos tokens alimentan pantallas y graficos para que
 * un color signifique siempre lo mismo.
 */
export const ACENTO = '#4F46E5';
export const ACENTO_SUAVE = '#6366F1';
export const VERDE = '#10B981';
export const ROJO = '#EF4444';
export const AMBAR = '#F59E0B';
export const AZUL = '#3B82F6';

export type Tema = {
  oscuro: boolean;
  fondo: string;
  fondoElevado: string;
  superficie: string;
  superficie2: string;
  borde: string;
  texto: string;
  textoSuave: string;
  textoTenue: string;
  acento: string;
  acentoSuave: string;
  acentoFondo: string;
  verde: string;
  rojo: string;
  ambar: string;
  azul: string;
  verdeFondo: string;
  rojoFondo: string;
  ambarFondo: string;
  sombra: object;
};

export const temaClaro: Tema = {
  oscuro: false,
  fondo: '#F4F5FA',
  fondoElevado: '#FFFFFF',
  superficie: '#FFFFFF',
  superficie2: '#EFF1F7',
  borde: '#E4E7F0',
  texto: '#0F1222',
  textoSuave: '#5B6273',
  textoTenue: '#9AA1B1',
  acento: ACENTO,
  acentoSuave: ACENTO_SUAVE,
  acentoFondo: '#EEF0FF',
  verde: '#059669',
  rojo: '#DC2626',
  ambar: '#D97706',
  azul: AZUL,
  verdeFondo: '#E7F8F1',
  rojoFondo: '#FDECEC',
  ambarFondo: '#FEF3E2',
  sombra: Platform.select({
    android: { elevation: 2 },
    default: {
      shadowColor: '#0F1222',
      shadowOpacity: 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
    },
  })!,
};

export const temaOscuro: Tema = {
  oscuro: true,
  fondo: '#0B0D14',
  fondoElevado: '#12151F',
  superficie: '#161A26',
  superficie2: '#1E2331',
  borde: '#262C3B',
  texto: '#F2F4FA',
  textoSuave: '#A7AEBF',
  textoTenue: '#6B7387',
  acento: '#7C7CFF',
  acentoSuave: '#9A9AFF',
  acentoFondo: '#1E1F3D',
  verde: '#34D399',
  rojo: '#F87171',
  ambar: '#FBBF24',
  azul: '#60A5FA',
  verdeFondo: '#0F2A22',
  rojoFondo: '#2C1417',
  ambarFondo: '#2C2110',
  sombra: Platform.select({
    android: { elevation: 3 },
    default: {
      shadowColor: '#000000',
      shadowOpacity: 0.4,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
    },
  })!,
};

/** Escala de espaciado de 4pt. */
export const esp = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radio = { sm: 10, md: 14, lg: 20, xl: 28, full: 999 };

/** Numeros tabulares: los montos deben alinearse verticalmente en las listas. */
export const NUM_TABULAR = { fontVariant: ['tabular-nums' as const] };

export const tipografia = {
  montoHero: { fontSize: 40, fontWeight: '800' as const, letterSpacing: -1.2, ...NUM_TABULAR },
  montoGrande: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.6, ...NUM_TABULAR },
  monto: { fontSize: 17, fontWeight: '700' as const, ...NUM_TABULAR },
  titulo: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.3 },
  seccion: { fontSize: 15, fontWeight: '700' as const, letterSpacing: 0.2 },
  cuerpo: { fontSize: 15, fontWeight: '500' as const },
  etiqueta: { fontSize: 13, fontWeight: '600' as const },
  micro: { fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.4 },
};

/** Area tactil minima accesible. */
export const TOQUE_MIN = 44;
