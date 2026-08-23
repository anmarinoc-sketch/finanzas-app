import { formatoCOP, formatoPct } from './dinero';

export type Insight = {
  id: string;
  texto: string;
  tono: 'bueno' | 'malo' | 'neutro' | 'alerta';
  icono: string;
};

export type DatosInsight = {
  ingresoMensual: number;
  gastoPeriodo: number;
  gastoFijos: number;
  ahorroPeriodo: number;
  /** [{ nombre, total, promedio }] por categoria del periodo vs su promedio historico. */
  categorias: { nombre: string; total: number; promedio: number }[];
  /** Gasto por dia de la semana, indice 0 = domingo. */
  porDiaSemana: number[];
  /** Metas con su desfase respecto al plan. */
  metas: { nombre: string; desfase: number; estado: string }[];
  /** Suscripciones activas y su costo anual total. */
  suscripcionesAnual: number;
  cuotasMensuales: number;
  diasTranscurridos: number;
  diasTotales: number;
};

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/**
 * Genera observaciones en lenguaje natural. Es una funcion pura: recibe los
 * agregados ya calculados y devuelve frases ordenadas por relevancia.
 */
export function generarInsights(d: DatosInsight): Insight[] {
  const out: Insight[] = [];

  // 1. Peso de los gastos fijos sobre el ingreso.
  if (d.ingresoMensual > 0 && d.gastoFijos > 0) {
    const pct = (d.gastoFijos / d.ingresoMensual) * 100;
    const bien = pct <= 50;
    out.push({
      id: 'fijos',
      tono: bien ? 'bueno' : 'malo',
      icono: bien ? 'checkmark-circle-outline' : 'alert-circle-outline',
      texto: `El ${formatoPct(pct)} de tu ingreso se va en gastos fijos. Lo recomendable es máximo 50%, ${bien ? 'vas bien' : 'estás por encima'}.`,
    });
  }

  // 2. Categorias que se desviaron de su propio promedio.
  const desviadas = d.categorias
    .filter((c) => c.promedio > 0 && c.total > 0)
    .map((c) => ({ ...c, variacion: ((c.total - c.promedio) / c.promedio) * 100 }))
    .filter((c) => Math.abs(c.variacion) >= 15)
    .sort((a, b) => Math.abs(b.variacion) - Math.abs(a.variacion))
    .slice(0, 3);
  for (const c of desviadas) {
    const sube = c.variacion > 0;
    out.push({
      id: `cat-${c.nombre}`,
      tono: sube ? 'malo' : 'bueno',
      icono: sube ? 'trending-up-outline' : 'trending-down-outline',
      texto: `Este periodo gastaste ${formatoPct(Math.abs(c.variacion))} ${sube ? 'más' : 'menos'} en ${c.nombre} que tu promedio de los últimos meses (${formatoCOP(c.promedio)}).`,
    });
  }

  // 3. Concentracion del gasto por dia de la semana.
  const totalSemana = d.porDiaSemana.reduce((a, b) => a + b, 0);
  if (totalSemana > 0) {
    const finde = d.porDiaSemana[5] + d.porDiaSemana[6];
    const pctFinde = (finde / totalSemana) * 100;
    if (pctFinde >= 35) {
      out.push({
        id: 'finde',
        tono: 'neutro',
        icono: 'calendar-outline',
        texto: `Tu gasto se concentra los viernes y sábados: ${formatoPct(pctFinde)} del total del periodo.`,
      });
    } else {
      const maxIdx = d.porDiaSemana.indexOf(Math.max(...d.porDiaSemana));
      const pctMax = (d.porDiaSemana[maxIdx] / totalSemana) * 100;
      if (pctMax >= 25) {
        out.push({
          id: 'diapico',
          tono: 'neutro',
          icono: 'calendar-outline',
          texto: `Los ${DIAS[maxIdx]} concentran el ${formatoPct(pctMax)} de tu gasto.`,
        });
      }
    }
  }

  // 4. Tasa de ahorro real del periodo.
  if (d.ingresoMensual > 0) {
    const tasa = (d.ahorroPeriodo / d.ingresoMensual) * 100;
    if (d.ahorroPeriodo > 0) {
      out.push({
        id: 'ahorro',
        tono: tasa >= 20 ? 'bueno' : tasa >= 10 ? 'neutro' : 'malo',
        icono: 'wallet-outline',
        texto: `Ahorraste ${formatoCOP(d.ahorroPeriodo)} este periodo, el ${formatoPct(tasa)} de tu ingreso.`,
      });
    } else {
      out.push({
        id: 'ahorro0',
        tono: 'malo',
        icono: 'wallet-outline',
        texto: 'Todavía no registras aportes a tus metas de ahorro en este periodo.',
      });
    }
  }

  // 5. Metas adelantadas o atrasadas.
  for (const m of d.metas.slice(0, 2)) {
    if (m.estado === 'cumplida') continue;
    if (Math.abs(m.desfase) < 1000) continue;
    const adelanta = m.desfase > 0;
    out.push({
      id: `meta-${m.nombre}`,
      tono: adelanta ? 'bueno' : 'alerta',
      icono: adelanta ? 'flag-outline' : 'hourglass-outline',
      texto: `En tu meta "${m.nombre}" vas ${formatoCOP(Math.abs(m.desfase))} ${adelanta ? 'adelantado' : 'atrasado'} frente al plan.`,
    });
  }

  // 6. Costo anual de suscripciones: el numero grande es el que despierta.
  if (d.suscripcionesAnual > 0) {
    out.push({
      id: 'suscripciones',
      tono: 'alerta',
      icono: 'repeat-outline',
      texto: `Tus suscripciones te cuestan ${formatoCOP(d.suscripcionesAnual)} al año.`,
    });
  }

  // 7. Carga de cuotas sobre el ingreso.
  if (d.ingresoMensual > 0 && d.cuotasMensuales > 0) {
    const pct = (d.cuotasMensuales / d.ingresoMensual) * 100;
    out.push({
      id: 'cuotas',
      tono: pct < 30 ? 'bueno' : pct <= 40 ? 'alerta' : 'malo',
      icono: 'card-outline',
      texto: `Tus cuotas y deudas suman ${formatoCOP(d.cuotasMensuales)} al mes, el ${formatoPct(pct)} de tu ingreso.`,
    });
  }

  // 8. Proyeccion de cierre del periodo.
  if (d.gastoPeriodo > 0 && d.diasTranscurridos > 2 && d.diasTranscurridos < d.diasTotales) {
    const proyeccion = Math.round((d.gastoPeriodo / d.diasTranscurridos) * d.diasTotales);
    const excede = d.ingresoMensual > 0 && proyeccion > d.ingresoMensual;
    out.push({
      id: 'proyeccion',
      tono: excede ? 'malo' : 'neutro',
      icono: 'analytics-outline',
      texto: excede
        ? `Al ritmo actual cerrarías el periodo en ${formatoCOP(proyeccion)}, por encima de tu ingreso de ${formatoCOP(d.ingresoMensual)}.`
        : `Al ritmo actual cerrarías el periodo gastando ${formatoCOP(proyeccion)}.`,
    });
  }

  return out;
}

/** Resumen del cierre de un periodo, para la tarjeta de "mes anterior". */
export function resumenCierre(params: {
  gastos: number; ingresos: number; ahorro: number;
  excedidas: { nombre: string; exceso: number }[];
  etiquetaPeriodo: string;
}): string {
  const { gastos, ingresos, ahorro, excedidas, etiquetaPeriodo } = params;
  const balance = ingresos - gastos;
  const partes = [
    `${etiquetaPeriodo}: gastaste ${formatoCOP(gastos)} de ${formatoCOP(ingresos)} de ingreso.`,
    balance >= 0 ? `Te sobraron ${formatoCOP(balance)}.` : `Te faltaron ${formatoCOP(Math.abs(balance))}.`,
  ];
  if (ahorro > 0) partes.push(`Ahorro efectivo: ${formatoCOP(ahorro)}.`);
  if (excedidas.length) {
    partes.push(
      `Se pasaron ${excedidas.length} ${excedidas.length === 1 ? 'categoría' : 'categorías'}: ` +
      excedidas.slice(0, 3).map((e) => `${e.nombre} (+${formatoCOP(e.exceso)})`).join(', ') + '.',
    );
  }
  return partes.join(' ');
}
