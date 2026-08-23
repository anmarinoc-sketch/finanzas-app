import { useMemo } from 'react';
import { differenceInCalendarDays, eachDayOfInterval, isAfter } from 'date-fns';
import { useAjustes } from '@/store/ajustes';
import { useDatos } from '@/store/datos';
import { usePeriodo, rangoActual } from '@/store/periodo';
import {
  fijosVsVariables, gastoPorCategoria, gastoPorDia, gastoPorDiaSemana,
  totalesPeriodo,
} from '@/db/consultas';
import { cargaCuotasDelMes, comprasACuotas } from '@/db/crud';
import { etiquetaCiclo, moverCiclo, progresoCiclo, type Rango } from '@/core/fechas';
import { evaluarPresupuesto } from '@/core/presupuesto';
import { costoAnual } from '@/core/recurrentes';

/** Serie acumulada dia a dia de un rango, rellenando los dias sin gasto. */
export function acumuladoDiario(r: Rango, hastaHoy = true): number[] {
  const filas = gastoPorDia(r);
  const mapa = new Map(filas.map((f) => [f.fecha, f.total]));
  const hoy = new Date();
  const dias = eachDayOfInterval({ start: r.desde, end: r.hasta });
  const salida: number[] = [];
  let acc = 0;
  for (const d of dias) {
    if (hastaHoy && isAfter(d, hoy)) break;
    const clave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    acc += mapa.get(clave) ?? 0;
    salida.push(acc);
  }
  return salida;
}

/**
 * Agregados del ciclo visible. Se recalcula cuando cambia la revision del
 * store de datos o el periodo seleccionado.
 */
export function useResumen() {
  const diaInicio = useAjustes((s) => s.diaInicioCiclo);
  const offset = usePeriodo((s) => s.offset);
  const revision = useDatos((s) => s.revision);
  const { bolsillos, ingresoMensual, recurrentes, deudas } = useDatos();

  return useMemo(() => {
    const rango = rangoActual(diaInicio, offset);
    const anterior = moverCiclo(rango, -1, diaInicio);
    const prog = progresoCiclo(rango);
    const totales = totalesPeriodo(rango);
    const totalesAnterior = totalesPeriodo(anterior);
    const categorias = gastoPorCategoria(rango);
    const fijos = fijosVsVariables(rango);

    // Estado presupuestal por categoria, ordenado por desviacion.
    const presupuestos = categorias
      .filter((c) => c.presupuesto > 0)
      .map((c) => ({
        ...c,
        estado: evaluarPresupuesto(c.presupuesto, c.total, prog.transcurridos, prog.total),
      }))
      .sort((a, b) => b.estado.fraccion - a.estado.fraccion);

    const presupuestoTotal = categorias.reduce((a, c) => a + c.presupuesto, 0);

    // Disponible del ciclo: presupuesto total si existe, si no el ingreso estimado.
    const techo = presupuestoTotal > 0 ? presupuestoTotal : ingresoMensual;
    const global = evaluarPresupuesto(techo, totales.gastos, prog.transcurridos, prog.total);

    const suscripciones = recurrentes.filter((r) => r.activo && r.esSuscripcion);
    const suscripcionesAnual = suscripciones.reduce((a, r) => a + costoAnual(r.monto, r.frecuencia), 0);
    const cuotasTarjeta = cargaCuotasDelMes();
    const cuotasDeuda = deudas.reduce((a, d) => a + d.cuotaMensual, 0);

    const porDiaSemana = Array(7).fill(0);
    for (const f of gastoPorDiaSemana(rango)) porDiaSemana[Number(f.dow)] = f.total;

    return {
      rango, anterior, prog, totales, totalesAnterior, categorias, presupuestos,
      presupuestoTotal, global, fijos, bolsillos, ingresoMensual,
      etiqueta: etiquetaCiclo(rango, diaInicio),
      etiquetaAnterior: etiquetaCiclo(anterior, diaInicio),
      diasRestantes: prog.restantes,
      suscripciones, suscripcionesAnual,
      cuotasTarjeta, cuotasDeuda,
      cargaMensualDeuda: cuotasTarjeta + cuotasDeuda,
      comprasDiferidas: comprasACuotas(),
      porDiaSemana,
      esCicloActual: offset === 0,
      diasDesdeInicio: differenceInCalendarDays(new Date(), rango.desde) + 1,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diaInicio, offset, revision, ingresoMensual]);
}
