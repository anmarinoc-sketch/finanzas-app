import * as Print from 'expo-print';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { compartirUri } from './archivos';
import { formatoCOP, formatoPct } from '@/core/dinero';
import { etiquetaCiclo, type Rango } from '@/core/fechas';
import { gastoPorCategoria, gastoPorDia, topComercios, totalesPeriodo } from '@/db/consultas';

/** Barras SVG embebidas: el PDF no puede cargar librerias externas. */
function barrasSVG(items: { nombre: string; total: number; color: string }[]): string {
  if (!items.length) return '<p class="vacio">Sin datos en el periodo.</p>';
  const max = Math.max(...items.map((i) => i.total));
  const alto = items.length * 30 + 10;
  const filas = items.map((i, k) => {
    const w = Math.round((i.total / max) * 340);
    const y = k * 30;
    return `
      <text x="0" y="${y + 14}" font-size="11" fill="#334155">${escapar(i.nombre)}</text>
      <rect x="170" y="${y + 4}" width="${w}" height="14" rx="7" fill="${i.color}" />
      <text x="${175 + w}" y="${y + 15}" font-size="10" fill="#64748B">${formatoCOP(i.total)}</text>`;
  }).join('');
  return `<svg width="540" height="${alto}" xmlns="http://www.w3.org/2000/svg">${filas}</svg>`;
}

/** Dona SVG con arcos calculados a mano. */
function donaSVG(items: { nombre: string; total: number; color: string }[]): string {
  const total = items.reduce((a, i) => a + i.total, 0);
  if (total <= 0) return '';
  const R = 70, r = 44, cx = 90, cy = 90;
  let ang = -Math.PI / 2;
  const paths = items.map((i) => {
    const barrido = (i.total / total) * Math.PI * 2;
    const fin = ang + barrido;
    const grande = barrido > Math.PI ? 1 : 0;
    const p = [
      `M ${cx + R * Math.cos(ang)} ${cy + R * Math.sin(ang)}`,
      `A ${R} ${R} 0 ${grande} 1 ${cx + R * Math.cos(fin)} ${cy + R * Math.sin(fin)}`,
      `L ${cx + r * Math.cos(fin)} ${cy + r * Math.sin(fin)}`,
      `A ${r} ${r} 0 ${grande} 0 ${cx + r * Math.cos(ang)} ${cy + r * Math.sin(ang)}`,
      'Z',
    ].join(' ');
    ang = fin;
    return `<path d="${p}" fill="${i.color}" />`;
  }).join('');
  return `<svg width="180" height="180" xmlns="http://www.w3.org/2000/svg">${paths}</svg>`;
}

const escapar = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Genera el reporte mensual en PDF y abre la hoja de compartir. */
export async function generarReportePDF(r: Rango, diaInicio: number, ingresoMensual: number) {
  const totales = totalesPeriodo(r);
  const cats = gastoPorCategoria(r).slice(0, 12);
  const top = topComercios(r, 8);
  const dias = gastoPorDia(r);
  const etiqueta = etiquetaCiclo(r, diaInicio);
  const tasaAhorro = ingresoMensual > 0 ? (totales.ahorro / ingresoMensual) * 100 : 0;
  const diaPico = dias.slice().sort((a, b) => b.total - a.total)[0];

  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8" />
  <style>
    @page { margin: 28px; }
    body { font-family: -apple-system, Roboto, 'Helvetica Neue', sans-serif; color: #0F1222; }
    h1 { font-size: 22px; margin: 0; letter-spacing: -0.5px; }
    h2 { font-size: 14px; margin: 26px 0 10px; color: #4F46E5; text-transform: uppercase; letter-spacing: 1px; }
    .sub { color: #64748B; font-size: 12px; margin-top: 4px; }
    .kpis { display: flex; gap: 10px; margin-top: 18px; }
    .kpi { flex: 1; border: 1px solid #E4E7F0; border-radius: 12px; padding: 12px; }
    .kpi .l { font-size: 10px; color: #64748B; text-transform: uppercase; letter-spacing: 0.6px; }
    .kpi .v { font-size: 17px; font-weight: 700; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { text-align: left; color: #64748B; font-weight: 600; border-bottom: 1px solid #E4E7F0; padding: 6px 4px; }
    td { padding: 6px 4px; border-bottom: 1px solid #F1F3F9; }
    td.num { text-align: right; font-variant-numeric: tabular-nums; }
    .fila { display: flex; gap: 20px; align-items: center; }
    .vacio { color: #94A3B8; font-size: 12px; }
    footer { margin-top: 30px; font-size: 10px; color: #94A3B8; }
  </style></head><body>
    <h1>Reporte financiero — ${escapar(etiqueta)}</h1>
    <div class="sub">Generado el ${format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es })} · Mis Finanzas</div>

    <div class="kpis">
      <div class="kpi"><div class="l">Ingresos</div><div class="v">${formatoCOP(totales.ingresos)}</div></div>
      <div class="kpi"><div class="l">Gastos</div><div class="v">${formatoCOP(totales.gastos)}</div></div>
      <div class="kpi"><div class="l">Balance</div><div class="v">${formatoCOP(totales.neto)}</div></div>
      <div class="kpi"><div class="l">Ahorro</div><div class="v">${formatoCOP(totales.ahorro)}</div></div>
    </div>

    <h2>Distribución del gasto</h2>
    <div class="fila">
      ${donaSVG(cats.map((c) => ({ nombre: c.nombre, total: c.total, color: c.color })))}
      <div style="flex:1">${barrasSVG(cats.map((c) => ({ nombre: c.nombre, total: c.total, color: c.color })))}</div>
    </div>

    <h2>Presupuesto vs. real</h2>
    <table>
      <tr><th>Categoría</th><th class="num">Presupuesto</th><th class="num">Gastado</th><th class="num">Diferencia</th><th class="num">Uso</th></tr>
      ${cats.filter((c) => c.presupuesto > 0).map((c) => `
        <tr>
          <td>${escapar(c.nombre)}</td>
          <td class="num">${formatoCOP(c.presupuesto)}</td>
          <td class="num">${formatoCOP(c.total)}</td>
          <td class="num" style="color:${c.total > c.presupuesto ? '#DC2626' : '#059669'}">${formatoCOP(c.presupuesto - c.total, { signo: true })}</td>
          <td class="num">${formatoPct((c.total / c.presupuesto) * 100)}</td>
        </tr>`).join('') || '<tr><td colspan="5" class="vacio">Todavía no defines presupuestos por categoría.</td></tr>'}
    </table>

    <h2>Dónde más gastaste</h2>
    <table>
      <tr><th>Comercio o descripción</th><th class="num">Movimientos</th><th class="num">Total</th></tr>
      ${top.map((t) => `<tr><td>${escapar(t.descripcion)}</td><td class="num">${t.veces}</td><td class="num">${formatoCOP(t.total)}</td></tr>`).join('')}
    </table>

    <h2>Observaciones</h2>
    <ul style="font-size:12px; line-height:1.7; color:#334155">
      <li>Tasa de ahorro del periodo: <strong>${formatoPct(tasaAhorro, 1)}</strong> del ingreso mensual estimado.</li>
      ${diaPico ? `<li>El día de mayor gasto fue el <strong>${format(new Date(diaPico.fecha + 'T00:00:00'), "d 'de' MMMM", { locale: es })}</strong> con ${formatoCOP(diaPico.total)}.</li>` : ''}
      <li>Registraste movimientos en <strong>${dias.length}</strong> días del periodo.</li>
    </ul>

    <footer>Documento generado localmente en el dispositivo. Mis Finanzas no envía tus datos a ningún servidor.</footer>
  </body></html>`;

  const { uri } = await Print.printToFileAsync({ html, base64: false });
  await compartirUri(uri, 'application/pdf', `Reporte ${etiqueta}`);
  return uri;
}
