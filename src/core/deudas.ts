/** Semaforo de endeudamiento sobre ingreso mensual. */
export type NivelDeuda = 'sano' | 'alerta' | 'riesgo';

export function nivelEndeudamiento(cuotasMensuales: number, ingresoMensual: number) {
  const fraccion = ingresoMensual > 0 ? cuotasMensuales / ingresoMensual : 0;
  const nivel: NivelDeuda = fraccion < 0.3 ? 'sano' : fraccion <= 0.4 ? 'alerta' : 'riesgo';
  const color = nivel === 'sano' ? '#10B981' : nivel === 'alerta' ? '#F59E0B' : '#EF4444';
  const texto =
    nivel === 'sano' ? 'Endeudamiento sano'
    : nivel === 'alerta' ? 'Endeudamiento en alerta'
    : 'Endeudamiento en riesgo';
  return { fraccion, porcentaje: fraccion * 100, nivel, color, texto };
}

/**
 * Cuota fija de un credito (sistema frances):
 *   C = P * i / (1 - (1+i)^-n)
 * `tasaMensual` viene en porcentaje (ej: 1.8 = 1,8% E.M.).
 */
export function cuotaFrancesa(principal: number, tasaMensual: number, meses: number): number {
  const n = Math.max(1, Math.trunc(meses));
  const i = tasaMensual / 100;
  if (i <= 0) return Math.round(principal / n);
  return Math.round((principal * i) / (1 - Math.pow(1 + i, -n)));
}

/** Tasa efectiva anual -> tasa efectiva mensual, ambas en porcentaje. */
export const eaAEm = (ea: number) => (Math.pow(1 + ea / 100, 1 / 12) - 1) * 100;
export const emAEa = (em: number) => (Math.pow(1 + em / 100, 12) - 1) * 100;

export type FilaAmortizacion = {
  mes: number; cuota: number; interes: number; abonoCapital: number; saldo: number;
};

/** Tabla de amortizacion. Se usa para proyectar cuando se acaba una deuda. */
export function amortizar(saldo: number, tasaMensual: number, cuota: number, maxMeses = 600): FilaAmortizacion[] {
  const filas: FilaAmortizacion[] = [];
  let s = saldo;
  const i = tasaMensual / 100;
  for (let mes = 1; mes <= maxMeses && s > 0.5; mes++) {
    const interes = Math.round(s * i);
    // Si la cuota no cubre ni los intereses la deuda nunca se paga: cortamos.
    if (cuota <= interes) break;
    let abono = Math.min(s, cuota - interes);
    // La ultima cuota absorbe el residuo del redondeo a pesos enteros: sin esto
    // quedaria un mes extra por unos pocos pesos, que no es como opera un banco.
    const residuo = s - abono;
    if (residuo > 0 && residuo <= Math.max(1, Math.round(cuota * 0.01))) abono = s;
    s = Math.round(s - abono);
    filas.push({ mes, cuota: Math.min(cuota, abono + interes), interes, abonoCapital: abono, saldo: Math.max(0, s) });
  }
  return filas;
}

/** Meses que faltan para saldar la deuda al ritmo de la cuota actual. */
export function mesesRestantes(saldo: number, tasaMensual: number, cuota: number): number | null {
  const tabla = amortizar(saldo, tasaMensual, cuota);
  if (!tabla.length || tabla[tabla.length - 1].saldo > 0.5) return null;
  return tabla.length;
}

/** Dias que faltan para el proximo dia de pago de una tarjeta. */
export function diasParaPago(diaPago: number, ahora = new Date()): number {
  const dia = Math.min(Math.max(1, diaPago), 28);
  const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  let proximo = new Date(hoy.getFullYear(), hoy.getMonth(), dia);
  if (proximo < hoy) proximo = new Date(hoy.getFullYear(), hoy.getMonth() + 1, dia);
  return Math.round((proximo.getTime() - hoy.getTime()) / 86400000);
}
