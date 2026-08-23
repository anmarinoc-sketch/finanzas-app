import { and, asc, desc, eq, isNull } from 'drizzle-orm';
import { format } from 'date-fns';
import { db, bdNativa } from './cliente';
import {
  aportesMeta, bolsillos, categorias, cuentas, deudas, ingresos, metas,
  recurrentes, tarjetas, transacciones, usuario,
} from './schema';
import type {
  Bolsillo, Categoria, Cuenta, Deuda, Ingreso, Meta, NuevaTransaccion,
  Recurrente, Tarjeta, Transaccion, Usuario,
} from './schema';
import { repartirCuotas } from '@/core/cuotas';
import { siguienteFecha } from '@/core/recurrentes';

const iso = (d: Date) => format(d, 'yyyy-MM-dd');
const ahoraISO = () => format(new Date(), "yyyy-MM-dd'T'HH:mm:ss");

/* ------------------------------- usuario ------------------------------- */

export function obtenerUsuario(): Usuario | undefined {
  return db.select().from(usuario).where(eq(usuario.id, 1)).get();
}

export function guardarUsuario(datos: Partial<Usuario>) {
  const actual = obtenerUsuario();
  if (!actual) {
    db.insert(usuario).values({ id: 1, creadoEn: iso(new Date()), ...datos } as any).run();
  } else {
    db.update(usuario).set(datos as any).where(eq(usuario.id, 1)).run();
  }
}

/* ------------------------------- ingresos ------------------------------ */

export const listarIngresos = (): Ingreso[] =>
  db.select().from(ingresos).orderBy(desc(ingresos.monto)).all();

export const crearIngreso = (v: Omit<Ingreso, 'id'>) =>
  db.insert(ingresos).values(v).run();

export const actualizarIngreso = (id: number, v: Partial<Ingreso>) =>
  db.update(ingresos).set(v as any).where(eq(ingresos.id, id)).run();

export const borrarIngreso = (id: number) =>
  db.delete(ingresos).where(eq(ingresos.id, id)).run();

/* ------------------------------ bolsillos ------------------------------ */

export const listarBolsillos = (): Bolsillo[] =>
  db.select().from(bolsillos).orderBy(asc(bolsillos.orden)).all();

export const crearBolsillo = (v: Omit<Bolsillo, 'id'>) =>
  db.insert(bolsillos).values(v).run();

export const actualizarBolsillo = (id: number, v: Partial<Bolsillo>) =>
  db.update(bolsillos).set(v as any).where(eq(bolsillos.id, id)).run();

export const borrarBolsillo = (id: number) => {
  db.update(categorias).set({ bolsilloId: null }).where(eq(categorias.bolsilloId, id)).run();
  db.delete(bolsillos).where(eq(bolsillos.id, id)).run();
};

/** Reemplaza toda la distribucion conservando ids para no romper el vinculo con categorias. */
export function guardarDistribucion(lista: (Omit<Bolsillo, 'id'> & { id?: number })[]) {
  bdNativa.withTransactionSync(() => {
    const previos = listarBolsillos();
    const porClave = new Map(previos.map((b) => [b.tipo + '|' + b.nombre, b.id]));
    db.delete(bolsillos).run();
    lista.forEach((b, i) => {
      const id = b.id ?? porClave.get(b.tipo + '|' + b.nombre);
      const valores: any = { ...b, orden: i };
      if (id) valores.id = id;
      db.insert(bolsillos).values(valores).run();
    });
    // Si se elimino un bolsillo, las categorias que apuntaban a el quedarian
    // con un id colgado: se dejan sin asignar en vez de romper los agregados.
    bdNativa.runSync(
      `UPDATE categorias SET bolsillo_id = NULL
        WHERE bolsillo_id IS NOT NULL
          AND bolsillo_id NOT IN (SELECT id FROM bolsillos)`,
    );
  });
}

/* ------------------------------ categorias ----------------------------- */

export const listarCategorias = (incluirArchivadas = false): Categoria[] =>
  db.select().from(categorias)
    .where(incluirArchivadas ? undefined : eq(categorias.archivada, 0))
    .orderBy(asc(categorias.orden), asc(categorias.nombre)).all();

export const listarCategoriasRaiz = (): Categoria[] =>
  db.select().from(categorias)
    .where(and(eq(categorias.archivada, 0), isNull(categorias.padreId)))
    .orderBy(asc(categorias.orden), asc(categorias.nombre)).all();

export const listarSubcategorias = (padreId: number): Categoria[] =>
  db.select().from(categorias)
    .where(and(eq(categorias.archivada, 0), eq(categorias.padreId, padreId)))
    .orderBy(asc(categorias.nombre)).all();

export const crearCategoria = (v: Omit<Categoria, 'id'>): number =>
  Number(db.insert(categorias).values(v).run().lastInsertRowId);

export const actualizarCategoria = (id: number, v: Partial<Categoria>) =>
  db.update(categorias).set(v as any).where(eq(categorias.id, id)).run();

export const archivarCategoria = (id: number, archivada = true) =>
  db.update(categorias).set({ archivada: archivada ? 1 : 0 }).where(eq(categorias.id, id)).run();

/** Borrado seguro: los movimientos quedan sin categoria en vez de desaparecer. */
export const borrarCategoria = (id: number) => {
  bdNativa.withTransactionSync(() => {
    db.update(transacciones).set({ categoriaId: null }).where(eq(transacciones.categoriaId, id)).run();
    db.delete(categorias).where(eq(categorias.padreId, id)).run();
    db.delete(categorias).where(eq(categorias.id, id)).run();
  });
};

export function reordenarCategorias(ids: number[]) {
  bdNativa.withTransactionSync(() => {
    ids.forEach((id, i) => db.update(categorias).set({ orden: i }).where(eq(categorias.id, id)).run());
  });
}

/* -------------------------------- cuentas ------------------------------ */

export const listarCuentas = (): Cuenta[] =>
  db.select().from(cuentas).where(eq(cuentas.archivada, 0)).orderBy(asc(cuentas.id)).all();

export const crearCuenta = (v: Omit<Cuenta, 'id'>) => db.insert(cuentas).values(v).run();
export const actualizarCuenta = (id: number, v: Partial<Cuenta>) =>
  db.update(cuentas).set(v as any).where(eq(cuentas.id, id)).run();
export const borrarCuenta = (id: number) => db.delete(cuentas).where(eq(cuentas.id, id)).run();

/** Saldo = saldo inicial + ingresos + transferencias recibidas - gastos - transferencias enviadas. */
export function saldoCuenta(id: number): number {
  const c = db.select().from(cuentas).where(eq(cuentas.id, id)).get();
  if (!c) return 0;
  const r = bdNativa.getFirstSync<{ mov: number }>(
    `SELECT COALESCE(SUM(
        CASE
          WHEN tipo = 'ingreso' AND cuenta_id = ?1 THEN monto
          WHEN tipo = 'gasto' AND cuenta_id = ?1 THEN -monto
          WHEN tipo = 'transferencia' AND cuenta_destino_id = ?1 THEN monto
          WHEN tipo = 'transferencia' AND cuenta_id = ?1 THEN -monto
          ELSE 0 END), 0) AS mov
     FROM transacciones WHERE cuenta_id = ?1 OR cuenta_destino_id = ?1`,
    [id],
  );
  return c.saldoInicial + (r?.mov ?? 0);
}

export const saldoConsolidado = () =>
  listarCuentas().reduce((t, c) => t + saldoCuenta(c.id), 0);

/* ------------------------------- tarjetas ------------------------------ */

export const listarTarjetas = (): Tarjeta[] =>
  db.select().from(tarjetas).where(eq(tarjetas.archivada, 0)).all();

export const obtenerTarjeta = (id: number) =>
  db.select().from(tarjetas).where(eq(tarjetas.id, id)).get();

export const crearTarjeta = (v: Omit<Tarjeta, 'id'>) => db.insert(tarjetas).values(v).run();
export const actualizarTarjeta = (id: number, v: Partial<Tarjeta>) =>
  db.update(tarjetas).set(v as any).where(eq(tarjetas.id, id)).run();

export const borrarTarjeta = (id: number) => {
  bdNativa.withTransactionSync(() => {
    db.update(transacciones).set({ tarjetaId: null }).where(eq(transacciones.tarjetaId, id)).run();
    db.delete(tarjetas).where(eq(tarjetas.id, id)).run();
  });
};

/**
 * Saldo de la tarjeta: cuotas causadas desde el inicio del ciclo vigente mas
 * todas las cuotas futuras, menos los pagos registrados contra la tarjeta.
 * Es "lo que todavia le debo al banco" en terminos utiles para el usuario.
 */
export function saldoTarjeta(tarjetaId: number, desde: Date): number {
  const r = bdNativa.getFirstSync<{ gastos: number; pagos: number }>(
    `SELECT
       COALESCE(SUM(CASE WHEN tipo = 'gasto' AND fecha >= ?2 THEN monto ELSE 0 END), 0) AS gastos,
       COALESCE(SUM(CASE WHEN tipo = 'transferencia' AND fecha >= ?2 THEN monto ELSE 0 END), 0) AS pagos
     FROM transacciones WHERE tarjeta_id = ?1`,
    [tarjetaId, iso(desde)],
  );
  return Math.max(0, (r?.gastos ?? 0) - (r?.pagos ?? 0));
}

export type CompraDiferida = {
  grupoId: number; descripcion: string; total: number; cuotas: number;
  fecha: string; tarjetaId: number | null; pendientes: number; cuota: number;
};

/** Compras diferidas con cuotas todavia vivas (hoy o en el futuro). */
export function comprasACuotas(tarjetaId?: number): CompraDiferida[] {
  const filas = bdNativa.getAllSync<any>(
    `SELECT grupo_id AS grupoId, MIN(descripcion) AS descripcion, SUM(monto) AS total,
            MAX(cuotas) AS cuotas, MIN(fecha) AS fecha, MAX(tarjeta_id) AS tarjetaId,
            SUM(CASE WHEN fecha >= date('now','localtime','start of month') THEN 1 ELSE 0 END) AS pendientes,
            MAX(monto) AS cuota
       FROM transacciones
      WHERE grupo_id IS NOT NULL AND cuotas > 1 AND tipo = 'gasto'
        AND (?1 IS NULL OR tarjeta_id = ?1)
      GROUP BY grupo_id
      HAVING pendientes > 0
      ORDER BY fecha DESC`,
    [tarjetaId ?? null],
  );
  return filas as CompraDiferida[];
}

/** Suma de las cuotas que se causan este mes por compras diferidas. */
export function cargaCuotasDelMes(tarjetaId?: number): number {
  const r = bdNativa.getFirstSync<{ total: number }>(
    `SELECT COALESCE(SUM(monto), 0) AS total FROM transacciones
      WHERE cuotas > 1 AND tipo = 'gasto'
        AND strftime('%Y-%m', fecha) = strftime('%Y-%m', date('now','localtime'))
        AND (?1 IS NULL OR tarjeta_id = ?1)`,
    [tarjetaId ?? null],
  );
  return r?.total ?? 0;
}

/* ----------------------------- transacciones --------------------------- */

export const obtenerTransaccion = (id: number) =>
  db.select().from(transacciones).where(eq(transacciones.id, id)).get();

/**
 * Guarda un movimiento. Si es una compra a credito diferida (cuotas > 1)
 * genera una fila por cuota, una por mes, agrupadas por `grupoId`.
 * Asi los presupuestos y los graficos de cada mes ya quedan correctos sin
 * calculos especiales en la capa de presentacion.
 */
export function crearTransaccion(v: NuevaTransaccion): number {
  const base: NuevaTransaccion = { ...v, creadoEn: ahoraISO() };
  if ((v.cuotas ?? 1) > 1 && v.tipo === 'gasto') {
    const partes = repartirCuotas(v.monto, v.cuotas!);
    let primerId = 0;
    bdNativa.withTransactionSync(() => {
      partes.forEach((monto, i) => {
        const f = new Date(v.fecha);
        const fechaCuota = new Date(f.getFullYear(), f.getMonth() + i, Math.min(f.getDate(), 28));
        const r = db.insert(transacciones).values({
          ...base, monto, fecha: iso(fechaCuota), cuotaActual: i + 1,
          grupoId: primerId || undefined,
        }).run();
        if (i === 0) {
          primerId = Number(r.lastInsertRowId);
          db.update(transacciones).set({ grupoId: primerId }).where(eq(transacciones.id, primerId)).run();
        }
      });
    });
    return primerId;
  }
  return Number(db.insert(transacciones).values(base).run().lastInsertRowId);
}

export const actualizarTransaccion = (id: number, v: Partial<Transaccion>) =>
  db.update(transacciones).set(v as any).where(eq(transacciones.id, id)).run();

/** Borra el movimiento; si pertenece a una compra diferida borra todas sus cuotas. */
export function borrarTransaccion(id: number) {
  const t = obtenerTransaccion(id);
  if (!t) return;
  if (t.grupoId) db.delete(transacciones).where(eq(transacciones.grupoId, t.grupoId)).run();
  else db.delete(transacciones).where(eq(transacciones.id, id)).run();
}

export type FiltroMovimientos = {
  desde?: Date; hasta?: Date;
  tipos?: string[];
  categoriaIds?: number[];
  medios?: string[];
  cuentaIds?: number[];
  texto?: string;
  montoMin?: number; montoMax?: number;
  limite?: number; offset?: number;
};

export type MovimientoVista = Transaccion & {
  categoriaNombre: string | null;
  categoriaColor: string | null;
  categoriaIcono: string | null;
  cuentaNombre: string | null;
  tarjetaNombre: string | null;
};

/**
 * Consulta principal del historial. Se arma en SQL (no en JS) para que siga
 * siendo fluida con decenas de miles de filas: el indice idx_tx_fecha hace
 * el trabajo y solo viaja a JS la pagina visible.
 */
export function listarMovimientos(f: FiltroMovimientos = {}): MovimientoVista[] {
  const cond: string[] = ['1=1'];
  const args: any[] = [];
  const push = (sqlFrag: string, ...vals: any[]) => { cond.push(sqlFrag); args.push(...vals); };

  if (f.desde) push('t.fecha >= ?', iso(f.desde));
  if (f.hasta) push('t.fecha <= ?', iso(f.hasta));
  if (f.tipos?.length) push(`t.tipo IN (${f.tipos.map(() => '?').join(',')})`, ...f.tipos);
  if (f.categoriaIds?.length)
    push(`t.categoria_id IN (${f.categoriaIds.map(() => '?').join(',')})`, ...f.categoriaIds);
  if (f.medios?.length) push(`t.medio_pago IN (${f.medios.map(() => '?').join(',')})`, ...f.medios);
  if (f.cuentaIds?.length) push(`t.cuenta_id IN (${f.cuentaIds.map(() => '?').join(',')})`, ...f.cuentaIds);
  if (f.texto) {
    push('(t.descripcion LIKE ? OR t.notas LIKE ? OR t.etiquetas LIKE ?)',
      `%${f.texto}%`, `%${f.texto}%`, `%${f.texto}%`);
  }
  if (f.montoMin != null) push('t.monto >= ?', f.montoMin);
  if (f.montoMax != null) push('t.monto <= ?', f.montoMax);

  args.push(f.limite ?? 300, f.offset ?? 0);
  return bdNativa.getAllSync<any>(
    `SELECT t.*, c.nombre AS categoriaNombre, c.color AS categoriaColor, c.icono AS categoriaIcono,
            cu.nombre AS cuentaNombre, ta.nombre AS tarjetaNombre
       FROM transacciones t
       LEFT JOIN categorias c ON c.id = t.categoria_id
       LEFT JOIN cuentas cu ON cu.id = t.cuenta_id
       LEFT JOIN tarjetas ta ON ta.id = t.tarjeta_id
      WHERE ${cond.join(' AND ')}
      ORDER BY t.fecha DESC, t.id DESC
      LIMIT ? OFFSET ?`,
    args,
  ).map(normalizarFila);
}

/** expo-sqlite devuelve las columnas con su nombre SQL: las llevamos al modelo. */
function normalizarFila(r: any): MovimientoVista {
  return {
    id: r.id, tipo: r.tipo, monto: r.monto, fecha: r.fecha,
    categoriaId: r.categoria_id, subcategoriaId: r.subcategoria_id,
    cuentaId: r.cuenta_id, cuentaDestinoId: r.cuenta_destino_id,
    tarjetaId: r.tarjeta_id, metaId: r.meta_id, medioPago: r.medio_pago,
    descripcion: r.descripcion, notas: r.notas, etiquetas: r.etiquetas,
    fotoUri: r.foto_uri, recurrenteId: r.recurrente_id, grupoId: r.grupo_id,
    cuotas: r.cuotas, cuotaActual: r.cuota_actual, creadoEn: r.creado_en,
    categoriaNombre: r.categoriaNombre ?? null,
    categoriaColor: r.categoriaColor ?? null,
    categoriaIcono: r.categoriaIcono ?? null,
    cuentaNombre: r.cuentaNombre ?? null,
    tarjetaNombre: r.tarjetaNombre ?? null,
  };
}

export function contarMovimientos(): number {
  return bdNativa.getFirstSync<{ n: number }>('SELECT COUNT(*) AS n FROM transacciones')?.n ?? 0;
}

/* ------------------------------ recurrentes ---------------------------- */

export const listarRecurrentes = (): Recurrente[] =>
  db.select().from(recurrentes).orderBy(asc(recurrentes.proximaFecha)).all();

export const crearRecurrente = (v: Omit<Recurrente, 'id'>) =>
  Number(db.insert(recurrentes).values(v).run().lastInsertRowId);

export const actualizarRecurrente = (id: number, v: Partial<Recurrente>) =>
  db.update(recurrentes).set(v as any).where(eq(recurrentes.id, id)).run();

export const borrarRecurrente = (id: number) =>
  db.delete(recurrentes).where(eq(recurrentes.id, id)).run();

/** Recurrentes activos cuya proxima fecha ya llego o paso. */
export function recurrentesVencidos(ahora = new Date()): Recurrente[] {
  return bdNativa.getAllSync<any>(
    `SELECT id, descripcion, monto, frecuencia, categoria_id AS categoriaId,
            cuenta_id AS cuentaId, tarjeta_id AS tarjetaId, medio_pago AS medioPago,
            proxima_fecha AS proximaFecha, activo, es_suscripcion AS esSuscripcion,
            ultimo_uso AS ultimoUso, tipo
       FROM recurrentes WHERE activo = 1 AND proxima_fecha <= ?
       ORDER BY proxima_fecha ASC`,
    [iso(ahora)],
  ) as Recurrente[];
}

/** Confirma un cargo recurrente: crea el movimiento y adelanta la proxima fecha. */
export function confirmarRecurrente(r: Recurrente): number {
  let id = 0;
  bdNativa.withTransactionSync(() => {
    id = crearTransaccion({
      tipo: r.tipo, monto: r.monto, fecha: r.proximaFecha,
      categoriaId: r.categoriaId, cuentaId: r.cuentaId, tarjetaId: r.tarjetaId,
      medioPago: r.medioPago, descripcion: r.descripcion, recurrenteId: r.id,
      etiquetas: 'recurrente', creadoEn: ahoraISO(),
    } as NuevaTransaccion);
    const prox = siguienteFecha(new Date(r.proximaFecha + 'T00:00:00'), r.frecuencia);
    db.update(recurrentes)
      .set({ proximaFecha: iso(prox), ultimoUso: iso(new Date()) })
      .where(eq(recurrentes.id, r.id)).run();
  });
  return id;
}

/** Omitir un cargo: no crea movimiento pero adelanta la fecha. */
export function omitirRecurrente(r: Recurrente) {
  const prox = siguienteFecha(new Date(r.proximaFecha + 'T00:00:00'), r.frecuencia);
  db.update(recurrentes).set({ proximaFecha: iso(prox) }).where(eq(recurrentes.id, r.id)).run();
}

/* --------------------------------- metas ------------------------------- */

export const listarMetas = (): Meta[] =>
  db.select().from(metas).where(eq(metas.archivada, 0)).orderBy(asc(metas.prioridad)).all();

export const obtenerMeta = (id: number) => db.select().from(metas).where(eq(metas.id, id)).get();

export const crearMeta = (v: Omit<Meta, 'id'>) =>
  Number(db.insert(metas).values(v).run().lastInsertRowId);

export const actualizarMeta = (id: number, v: Partial<Meta>) =>
  db.update(metas).set(v as any).where(eq(metas.id, id)).run();

export const borrarMeta = (id: number) => {
  bdNativa.withTransactionSync(() => {
    db.delete(aportesMeta).where(eq(aportesMeta.metaId, id)).run();
    db.delete(metas).where(eq(metas.id, id)).run();
  });
};

export const listarAportes = (metaId: number) =>
  db.select().from(aportesMeta).where(eq(aportesMeta.metaId, metaId))
    .orderBy(desc(aportesMeta.fecha), desc(aportesMeta.id)).all();

/**
 * Registra un aporte o retiro y recalcula el acumulado de la meta.
 * El acumulado se guarda desnormalizado en `metas.monto_actual` porque se lee
 * en cada tarjeta de la lista; se recalcula siempre desde los aportes para
 * que nunca se desincronice.
 */
export function registrarAporte(metaId: number, monto: number, tipo: 'aporte' | 'retiro', nota?: string, fecha = new Date()) {
  bdNativa.withTransactionSync(() => {
    db.insert(aportesMeta).values({ metaId, monto: Math.abs(monto), fecha: iso(fecha), tipo, nota }).run();
    recalcularMeta(metaId);
  });
}

export function borrarAporte(id: number, metaId: number) {
  bdNativa.withTransactionSync(() => {
    db.delete(aportesMeta).where(eq(aportesMeta.id, id)).run();
    recalcularMeta(metaId);
  });
}

export function recalcularMeta(metaId: number) {
  const r = bdNativa.getFirstSync<{ total: number }>(
    `SELECT COALESCE(SUM(CASE WHEN tipo = 'aporte' THEN monto ELSE -monto END), 0) AS total
       FROM aportes_meta WHERE meta_id = ?`, [metaId],
  );
  const total = Math.max(0, r?.total ?? 0);
  const m = obtenerMeta(metaId);
  const estado = m && total >= m.montoObjetivo ? 'cumplida' : 'en_curso';
  db.update(metas).set({ montoActual: total, estado }).where(eq(metas.id, metaId)).run();
}

/* --------------------------------- deudas ------------------------------ */

export const listarDeudas = (): Deuda[] =>
  db.select().from(deudas).where(eq(deudas.activa, 1)).all();

export const crearDeuda = (v: Omit<Deuda, 'id'>) => db.insert(deudas).values(v).run();
export const actualizarDeuda = (id: number, v: Partial<Deuda>) =>
  db.update(deudas).set(v as any).where(eq(deudas.id, id)).run();
export const borrarDeuda = (id: number) => db.delete(deudas).where(eq(deudas.id, id)).run();
