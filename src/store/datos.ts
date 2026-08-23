import { create } from 'zustand';
import {
  listarBolsillos, listarCategorias, listarCategoriasRaiz, listarCuentas,
  listarDeudas, listarIngresos, listarMetas, listarRecurrentes, listarTarjetas,
} from '@/db/crud';
import type {
  Bolsillo, Categoria, Cuenta, Deuda, Ingreso, Meta, Recurrente, Tarjeta,
} from '@/db/schema';
import { ingresoMensualEstimado } from '@/core/ingresos';

type EstadoDatos = {
  /** Cambia con cada escritura: las pantallas dependen de el para recalcular. */
  revision: number;
  categorias: Categoria[];
  categoriasRaiz: Categoria[];
  bolsillos: Bolsillo[];
  cuentas: Cuenta[];
  tarjetas: Tarjeta[];
  metas: Meta[];
  recurrentes: Recurrente[];
  deudas: Deuda[];
  ingresos: Ingreso[];
  ingresoMensual: number;

  refrescar: () => void;
};

/**
 * Catalogos que se leen en casi todas las pantallas. Se mantienen en memoria
 * porque son pocos registros; las transacciones NO se cachean aqui: siempre
 * se consultan a SQLite con filtros para que escale a miles de movimientos.
 */
export const useDatos = create<EstadoDatos>((set, get) => ({
  revision: 0,
  categorias: [],
  categoriasRaiz: [],
  bolsillos: [],
  cuentas: [],
  tarjetas: [],
  metas: [],
  recurrentes: [],
  deudas: [],
  ingresos: [],
  ingresoMensual: 0,

  refrescar: () => {
    const ingresos = listarIngresos();
    set({
      revision: get().revision + 1,
      categorias: listarCategorias(),
      categoriasRaiz: listarCategoriasRaiz(),
      bolsillos: listarBolsillos(),
      cuentas: listarCuentas(),
      tarjetas: listarTarjetas(),
      metas: listarMetas(),
      recurrentes: listarRecurrentes(),
      deudas: listarDeudas(),
      ingresos,
      ingresoMensual: ingresoMensualEstimado(
        ingresos.map((i) => ({ monto: i.monto, frecuencia: i.frecuencia, activo: !!i.activo })),
      ),
    });
  },
}));

/** Azucar: ejecuta una escritura y refresca los catalogos. */
export function conRefresco<T>(fn: () => T): T {
  const r = fn();
  useDatos.getState().refrescar();
  return r;
}

/** Busca una categoria (incluidas subcategorias) por id. */
export function categoriaPorId(id?: number | null): Categoria | undefined {
  if (id == null) return undefined;
  return useDatos.getState().categorias.find((c) => c.id === id);
}
