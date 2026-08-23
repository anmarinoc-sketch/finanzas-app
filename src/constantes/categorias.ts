/**
 * Catalogo precargado. `bolsillo` es la clave del bolsillo por defecto al que
 * queda vinculada la categoria; el usuario puede cambiarla despues.
 */
export type SemillaCategoria = {
  nombre: string;
  icono: string;
  color: string;
  bolsillo: 'necesidades' | 'ocio' | 'ahorro' | 'imprevistos' | 'deudas';
  subcategorias?: string[];
};

export const CATEGORIAS_BASE: SemillaCategoria[] = [
  { nombre: 'Alimentación',        icono: 'fast-food-outline',    color: '#F97316', bolsillo: 'necesidades' },
  { nombre: 'Mercado',             icono: 'cart-outline',         color: '#22C55E', bolsillo: 'necesidades' },
  { nombre: 'Servicios públicos',  icono: 'flash-outline',        color: '#EAB308', bolsillo: 'necesidades',
    subcategorias: ['Energía', 'Agua', 'Gas', 'Internet', 'Celular'] },
  { nombre: 'Arriendo / Vivienda', icono: 'home-outline',         color: '#3B82F6', bolsillo: 'necesidades' },
  { nombre: 'Transporte',          icono: 'bus-outline',          color: '#06B6D4', bolsillo: 'necesidades',
    subcategorias: ['Taxi / App', 'Transporte público', 'Parqueadero', 'Peajes'] },
  { nombre: 'Combustible',         icono: 'car-sport-outline',    color: '#0EA5E9', bolsillo: 'necesidades' },
  { nombre: 'Gimnasio',            icono: 'barbell-outline',      color: '#84CC16', bolsillo: 'ocio' },
  { nombre: 'Salud y medicamentos',icono: 'medkit-outline',       color: '#14B8A6', bolsillo: 'necesidades',
    subcategorias: ['EPS / Medicina prepagada', 'Medicamentos', 'Consultas', 'Odontología'] },
  { nombre: 'Suscripciones',       icono: 'repeat-outline',       color: '#8B5CF6', bolsillo: 'ocio' },
  { nombre: 'Tarjeta de crédito',  icono: 'card-outline',         color: '#EF4444', bolsillo: 'deudas' },
  { nombre: 'Educación',           icono: 'school-outline',       color: '#6366F1', bolsillo: 'necesidades' },
  { nombre: 'Ropa',                icono: 'shirt-outline',        color: '#D946EF', bolsillo: 'ocio' },
  { nombre: 'Ocio y entretenimiento', icono: 'game-controller-outline', color: '#A855F7', bolsillo: 'ocio' },
  { nombre: 'Restaurantes',        icono: 'restaurant-outline',   color: '#F43F5E', bolsillo: 'ocio' },
  { nombre: 'Mascotas',            icono: 'paw-outline',          color: '#78716C', bolsillo: 'necesidades' },
  { nombre: 'Regalos',             icono: 'gift-outline',         color: '#EC4899', bolsillo: 'ocio' },
  { nombre: 'Impuestos',           icono: 'document-text-outline', color: '#64748B', bolsillo: 'imprevistos' },
  { nombre: 'Seguros',             icono: 'shield-checkmark-outline', color: '#0F766E', bolsillo: 'imprevistos' },
  { nombre: 'Ahorro',              icono: 'wallet-outline',       color: '#10B981', bolsillo: 'ahorro' },
  { nombre: 'Otros',               icono: 'apps-outline',         color: '#94A3B8', bolsillo: 'necesidades' },
];

/** Iconos disponibles al crear o editar una categoria. */
export const ICONOS_DISPONIBLES = [
  'fast-food-outline', 'cart-outline', 'flash-outline', 'home-outline', 'bus-outline',
  'car-sport-outline', 'barbell-outline', 'medkit-outline', 'repeat-outline', 'card-outline',
  'school-outline', 'shirt-outline', 'game-controller-outline', 'restaurant-outline', 'paw-outline',
  'gift-outline', 'document-text-outline', 'shield-checkmark-outline', 'wallet-outline', 'apps-outline',
  'airplane-outline', 'beer-outline', 'bicycle-outline', 'book-outline', 'briefcase-outline',
  'brush-outline', 'build-outline', 'cafe-outline', 'camera-outline', 'cut-outline',
  'desktop-outline', 'film-outline', 'football-outline', 'headset-outline', 'heart-outline',
  'ice-cream-outline', 'leaf-outline', 'musical-notes-outline', 'people-outline', 'phone-portrait-outline',
  'pizza-outline', 'rocket-outline', 'star-outline', 'sunny-outline', 'ticket-outline',
  'train-outline', 'trophy-outline', 'umbrella-outline', 'water-outline', 'wine-outline',
];
