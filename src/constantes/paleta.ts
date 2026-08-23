/** Colores por categoria. Se usan igual en listas y en todos los graficos. */
export const COLORES_CATEGORIA = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16', '#22C55E',
  '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1',
  '#8B5CF6', '#A855F7', '#D946EF', '#EC4899', '#F43F5E', '#78716C',
  '#64748B', '#0F766E',
] as const;

/** Colores de los bolsillos (distribucion del ingreso). */
export const COLORES_BOLSILLO: Record<string, string> = {
  necesidades: '#3B82F6',
  ocio: '#F59E0B',
  ahorro: '#10B981',
  imprevistos: '#8B5CF6',
  deudas: '#EF4444',
  personalizado: '#14B8A6',
};
