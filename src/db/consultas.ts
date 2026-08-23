import { format } from 'date-fns';
import { bdNativa } from './cliente';
import type { Rango } from '@/core/fechas';

const iso = (d: Date) => format(d, 'yyyy-MM-dd');

export type TotalesPeriodo = { gastos: number; ingresos: number; ahorro: number; neto: number };

/** Totales del periodo. Las transferencias nunca cuentan como gasto ni ingreso. */
export function totalesPeriodo(r: Rango): TotalesPeriodo {
  const f = bdNativa.getFirstSync<{ gastos: number; ingresos: number }>(
    `SELECT
       COALESCE(SUM(CASE WHEN tipo = 'gasto' THEN monto ELSE 0 END), 0) AS gastos,
       COALESCE(SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE 0 END), 0) AS ingresos
     FROM transacciones WHERE fecha BETWEEN ? AND ?`,
    [iso(r.desde), iso(r.hasta)],
  );
  const ahorroFila = bdNativa.getFirstSync<{ total: number }>(
    `SELECT COALESCE(SUM(CASE WHEN tipo = 'aporte' THEN monto ELSE -monto END), 0) AS total
       FROM aportes_meta WHERE fecha BETWEEN ? AND ?`,
    [iso(r.desde), iso(r.hasta)],
  );
  const gastos = f?.gastos ?? 0;
  const ingresos = f?.ingresos ?? 0;
  return { gastos, ingresos, ahorro: ahorroFila?.total ?? 0, neto: ingresos - gastos };
}

export type FilaCategoria = {
  categoriaId: number | null; nombre: string; color: string; icono: string;
  total: number; presupuesto: number; bolsilloId: number | null;
};

/**
 * Gasto agrupado por categoria raiz (las subcategorias suben al padre).
 * `medios` permite filtrar por medio de pago sin duplicar la consulta.
 */
export function gastoPorCategoria(r: Rango, medios?: string[]): FilaCategoria[] {
  const filtroMedio = medios?.length
    ? ` AND t.medio_pago IN (${medios.map(() => '?').join(',')})`
    : '';
  return bdNativa.getAllSync<FilaCategoria>(
    `SELECT COALESCE(p.id, c.id) AS categoriaId,
            COALESCE(p.nombre, c.nombre, 'Sin categoría') AS nombre,
            COALESCE(p.color, c.color, '#94A3B8') AS color,
            COALESCE(p.icono, c.icono, 'help-outline') AS icono,
            COALESCE(p.presupuesto_mensual, c.presupuesto_mensual, 0) AS presupuesto,
            COALESCE(p.bolsillo_id, c.bolsillo_id) AS bolsilloId,
            SUM(t.monto) AS total
       FROM transacciones t
       LEFT JOIN categorias c ON c.id = t.categoria_id
       LEFT JOIN categorias p ON p.id = c.padre_id
      WHERE t.tipo = 'gasto' AND t.fecha BETWEEN ? AND ?${filtroMedio}
      GROUP BY categoriaId
      ORDER BY total DESC`,
    [iso(r.desde), iso(r.hasta), ...(medios ?? [])],
  );
}

/** Gasto agrupado por bolsillo, para la cascada y el control de la distribucion. */
export function gastoPorBolsillo(r: Rango) {
  return bdNativa.getAllSync<{ bolsilloId: number | null; nombre: string; color: string; total: number }>(
    `SELECT b.id AS bolsilloId, COALESCE(b.nombre, 'Sin asignar') AS nombre,
            COALESCE(b.color, '#94A3B8') AS color, SUM(t.monto) AS total
       FROM transacciones t
       LEFT JOIN categorias c ON c.id = t.categoria_id
       LEFT JOIN categorias p ON p.id = c.padre_id
       LEFT JOIN bolsillos b ON b.id = COALESCE(p.bolsillo_id, c.bolsillo_id)
      WHERE t.tipo = 'gasto' AND t.fecha BETWEEN ? AND ?
      GROUP BY b.id ORDER BY total DESC`,
    [iso(r.desde), iso(r.hasta)],
  );
}

/** Gasto por medio de pago. */
export function gastoPorMedio(r: Rango) {
  return bdNativa.getAllSync<{ medio: string; total: number }>(
    `SELECT medio_pago AS medio, SUM(monto) AS total FROM transacciones
      WHERE tipo = 'gasto' AND fecha BETWEEN ? AND ?
      GROUP BY medio_pago ORDER BY total DESC`,
    [iso(r.desde), iso(r.hasta)],
  );
}

/** Serie diaria de gasto dentro de un rango (base del mapa de calor y del acumulado). */
export function gastoPorDia(r: Rango) {
  return bdNativa.getAllSync<{ fecha: string; total: number }>(
    `SELECT fecha, SUM(monto) AS total FROM transacciones
      WHERE tipo = 'gasto' AND fecha BETWEEN ? AND ?
      GROUP BY fecha ORDER BY fecha ASC`,
    [iso(r.desde), iso(r.hasta)],
  );
}

/** Gasto por dia de la semana (0 = domingo), para el insight de fines de semana. */
export function gastoPorDiaSemana(r: Rango) {
  return bdNativa.getAllSync<{ dow: string; total: number }>(
    `SELECT strftime('%w', fecha) AS dow, SUM(monto) AS total FROM transacciones
      WHERE tipo = 'gasto' AND fecha BETWEEN ? AND ?
      GROUP BY dow ORDER BY dow`,
    [iso(r.desde), iso(r.hasta)],
  );
}

/** Top de comercios / descripciones donde mas se gasta. */
export function topComercios(r: Rango, limite = 10) {
  return bdNativa.getAllSync<{ descripcion: string; total: number; veces: number; color: string | null }>(
    `SELECT CASE WHEN TRIM(t.descripcion) = '' THEN 'Sin descripción' ELSE TRIM(t.descripcion) END AS descripcion,
            SUM(t.monto) AS total, COUNT(*) AS veces, MAX(c.color) AS color
       FROM transacciones t LEFT JOIN categorias c ON c.id = t.categoria_id
      WHERE t.tipo = 'gasto' AND t.fecha BETWEEN ? AND ?
      GROUP BY descripcion ORDER BY total DESC LIMIT ?`,
    [iso(r.desde), iso(r.hasta), limite],
  );
}

/** Totales de gasto e ingreso para cada uno de los rangos dados (barras mes a mes). */
export function totalesPorRangos(rangos: Rango[]) {
  return rangos.map((r) => ({ rango: r, ...totalesPeriodo(r) }));
}

/** Gasto de una categoria en cada uno de los rangos (barras apiladas). */
export function totalCategoriaEnRango(categoriaId: number | null, r: Rango): number {
  if (categoriaId == null) {
    return bdNativa.getFirstSync<{ t: number }>(
      `SELECT COALESCE(SUM(t.monto),0) AS t FROM transacciones t
        LEFT JOIN categorias c ON c.id = t.categoria_id
        WHERE t.tipo='gasto' AND t.categoria_id IS NULL AND t.fecha BETWEEN ? AND ?`,
      [iso(r.desde), iso(r.hasta)],
    )?.t ?? 0;
  }
  return bdNativa.getFirstSync<{ t: number }>(
    `SELECT COALESCE(SUM(t.monto),0) AS t FROM transacciones t
       LEFT JOIN categorias c ON c.id = t.categoria_id
      WHERE t.tipo='gasto' AND t.fecha BETWEEN ? AND ?
        AND COALESCE(c.padre_id, c.id) = ?`,
    [iso(r.desde), iso(r.hasta), categoriaId],
  )?.t ?? 0;
}

/** Promedio mensual de gasto de una categoria en los ultimos `meses` meses cerrados. */
export function promedioCategoria(categoriaId: number, rangos: Rango[]): number {
  if (!rangos.length) return 0;
  const suma = rangos.reduce((t, r) => t + totalCategoriaEnRango(categoriaId, r), 0);
  return Math.round(suma / rangos.length);
}

/** Fecha del primer movimiento registrado (para acotar los filtros). */
export function primeraFecha(): string | null {
  return bdNativa.getFirstSync<{ f: string }>('SELECT MIN(fecha) AS f FROM transacciones')?.f ?? null;
}

/** Gasto fijo vs variable: fijo = lo que viene de un recurrente o del bolsillo de necesidades. */
export function fijosVsVariables(r: Rango) {
  const f = bdNativa.getFirstSync<{ fijos: number; variables: number }>(
    `SELECT
        COALESCE(SUM(CASE WHEN t.recurrente_id IS NOT NULL OR b.tipo = 'necesidades' THEN t.monto ELSE 0 END), 0) AS fijos,
        COALESCE(SUM(CASE WHEN t.recurrente_id IS NULL AND (b.tipo IS NULL OR b.tipo <> 'necesidades') THEN t.monto ELSE 0 END), 0) AS variables
       FROM transacciones t
       LEFT JOIN categorias c ON c.id = t.categoria_id
       LEFT JOIN categorias p ON p.id = c.padre_id
       LEFT JOIN bolsillos b ON b.id = COALESCE(p.bolsillo_id, c.bolsillo_id)
      WHERE t.tipo = 'gasto' AND t.fecha BETWEEN ? AND ?`,
    [iso(r.desde), iso(r.hasta)],
  );
  return { fijos: f?.fijos ?? 0, variables: f?.variables ?? 0 };
}
