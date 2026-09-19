import { MEDIOS_PAGO } from '@/constantes/medios';

/**
 * Qué texto encabeza una fila del historial.
 *
 * El problema real que resuelve: en la lista aparecían filas tituladas
 * "Transferencia", "Efectivo" o "Cuenta", y el comercio de verdad ("Ara",
 * "Proteína", "Pasaje") quedaba en la línea pequeña de abajo. No era un dato
 * mal guardado: el título es el campo "Comercio o descripción", y ahí se había
 * escrito la forma de pago, mientras el comercio se había puesto como
 * categoría.
 *
 * En vez de obligar a nadie a registrar de otra manera, la fila se ordena
 * sola: si la descripción es solo una forma de pago —algo que la línea de
 * detalle ya dice— encabeza la categoría, y la descripción baja al detalle.
 * No se pierde nada de lo escrito, solo cambia el orden.
 */

/** Normaliza para comparar: sin acentos, minúsculas, sin espacios de sobra. */
function normalizar(texto: string): string {
  return texto
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Formas de pago y sinónimos que la gente escribe en la descripción. Son
 * palabras que la fila ya muestra por otro lado, así que como título sobran.
 */
const FORMAS_DE_PAGO = new Set<string>([
  ...MEDIOS_PAGO.map((m) => normalizar(m.nombre)),
  ...MEDIOS_PAGO.map((m) => normalizar(m.id)),
  'transferencia', 'transferencias', 'transf', 'efectivo', 'cuenta',
  'cuenta de ahorros', 'cuenta corriente', 'ahorros', 'tarjeta',
  'tarjeta debito', 'tarjeta credito', 'debito', 'credito', 'pse', 'qr',
  'nequi', 'daviplata', 'billetera', 'banco',
]);

export function esFormaDePago(texto: string): boolean {
  return FORMAS_DE_PAGO.has(normalizar(texto));
}

export type EtiquetasFila = {
  /** Texto principal de la fila. */
  titulo: string;
  /**
   * Descripción que va al detalle porque no encabeza. null cuando la
   * descripción ya es el título, para no repetirla.
   */
  extra: string | null;
  /** true si el título salió de la categoría: el detalle no debe repetirla. */
  tituloEsCategoria: boolean;
};

export function etiquetasFila(m: {
  tipo: string;
  descripcion?: string | null;
  categoriaNombre?: string | null;
}): EtiquetasFila {
  const desc = (m.descripcion ?? '').trim();
  const cat = (m.categoriaNombre ?? '').trim();
  const generico = m.tipo === 'transferencia'
    ? 'Transferencia'
    : m.tipo === 'ingreso' ? 'Ingreso' : 'Gasto';

  if (!desc) {
    return { titulo: cat || generico, extra: null, tituloEsCategoria: !!cat };
  }
  // Solo se cede el título si hay categoría que ponga algo mejor.
  if (cat && esFormaDePago(desc)) {
    return { titulo: cat, extra: desc, tituloEsCategoria: true };
  }
  return { titulo: desc, extra: null, tituloEsCategoria: false };
}
