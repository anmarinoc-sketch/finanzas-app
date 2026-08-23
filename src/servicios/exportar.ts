import { format } from 'date-fns';
import { bdNativa } from '@/db/cliente';
import { guardarYCompartir } from './archivos';
import type { Rango } from '@/core/fechas';
import { etiquetaCiclo } from '@/core/fechas';
import { formatoCOP } from '@/core/dinero';

const iso = (d: Date) => format(d, 'yyyy-MM-dd');

/** Escapa un campo para CSV (comillas dobles y separador). */
const csv = (v: unknown) => {
  const s = String(v ?? '');
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/**
 * Exporta los movimientos del rango a CSV.
 * Se usa `;` como separador porque Excel en español lo espera por defecto.
 */
export async function exportarCSV(r: Rango, diaInicio: number) {
  const filas = bdNativa.getAllSync<any>(
    `SELECT t.fecha, t.tipo, t.monto, COALESCE(c.nombre,'Sin categoría') AS categoria,
            COALESCE(p.nombre,'') AS categoriaPadre, t.medio_pago AS medio,
            COALESCE(cu.nombre,'') AS cuenta, COALESCE(ta.nombre,'') AS tarjeta,
            t.descripcion, COALESCE(t.notas,'') AS notas, t.etiquetas,
            t.cuotas, t.cuota_actual AS cuotaActual
       FROM transacciones t
       LEFT JOIN categorias c ON c.id = t.categoria_id
       LEFT JOIN categorias p ON p.id = c.padre_id
       LEFT JOIN cuentas cu ON cu.id = t.cuenta_id
       LEFT JOIN tarjetas ta ON ta.id = t.tarjeta_id
      WHERE t.fecha BETWEEN ? AND ? ORDER BY t.fecha DESC`,
    [iso(r.desde), iso(r.hasta)],
  );

  const encabezado = [
    'Fecha', 'Tipo', 'Monto', 'Categoría', 'Categoría padre', 'Medio de pago',
    'Cuenta', 'Tarjeta', 'Descripción', 'Notas', 'Etiquetas', 'Cuotas', 'Cuota actual',
  ].join(';');

  const cuerpo = filas.map((f) => [
    f.fecha, f.tipo, f.monto, f.categoria, f.categoriaPadre, f.medio,
    f.cuenta, f.tarjeta, f.descripcion, f.notas, f.etiquetas, f.cuotas, f.cuotaActual,
  ].map(csv).join(';')).join('\n');

  // BOM para que Excel reconozca los acentos.
  const contenido = '﻿' + encabezado + '\n' + cuerpo;
  const nombre = `movimientos-${iso(r.desde)}_${iso(r.hasta)}.csv`;
  await guardarYCompartir(nombre, contenido, 'text/csv');
  return { nombre, filas: filas.length, etiqueta: etiquetaCiclo(r, diaInicio), total: filas.reduce((a: number, f: any) => a + (f.tipo === 'gasto' ? f.monto : 0), 0) };
}

/** Copia de seguridad completa en JSON (todas las tablas). */
export async function exportarBackup() {
  const tablas = [
    'usuario', 'ingresos', 'bolsillos', 'categorias', 'cuentas', 'tarjetas',
    'transacciones', 'recurrentes', 'metas', 'aportes_meta', 'deudas',
  ];
  const datos: Record<string, any[]> = {};
  for (const t of tablas) datos[t] = bdNativa.getAllSync(`SELECT * FROM ${t}`);
  const payload = {
    app: 'MisFinanzas',
    version: 1,
    exportadoEn: new Date().toISOString(),
    datos,
  };
  const nombre = `misfinanzas-copia-${iso(new Date())}.json`;
  await guardarYCompartir(nombre, JSON.stringify(payload, null, 2), 'application/json');
  const total = Object.values(datos).reduce((a, v) => a + v.length, 0);
  return { nombre, registros: total };
}

/** Restaura una copia de seguridad reemplazando todo el contenido actual. */
export function importarBackup(json: string): { registros: number } {
  const payload = JSON.parse(json);
  if (payload?.app !== 'MisFinanzas' || !payload?.datos) {
    throw new Error('El archivo no es una copia de seguridad válida de Mis Finanzas.');
  }
  const datos: Record<string, any[]> = payload.datos;
  let total = 0;
  bdNativa.withTransactionSync(() => {
    const orden = [
      'transacciones', 'aportes_meta', 'metas', 'recurrentes', 'deudas',
      'tarjetas', 'cuentas', 'categorias', 'bolsillos', 'ingresos', 'usuario',
    ];
    for (const t of orden) bdNativa.runSync(`DELETE FROM ${t}`);
    for (const [tabla, filas] of Object.entries(datos)) {
      for (const fila of filas) {
        const cols = Object.keys(fila);
        if (!cols.length) continue;
        bdNativa.runSync(
          `INSERT OR REPLACE INTO ${tabla} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`,
          cols.map((c) => fila[c]),
        );
        total++;
      }
    }
  });
  return { registros: total };
}

export { formatoCOP };
