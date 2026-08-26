/**
 * Pruebas de la logica financiera. Todo lo que se prueba aqui son funciones
 * puras: no tocan la base de datos ni React.
 *   npm test
 */
import { addMonths, subMonths } from 'date-fns';
import { formatoCOP, formatoCorto, parsearMonto, separarMiles } from '../src/core/dinero';
import { anclarDia, cicloDe, progresoCiclo, ultimosCiclos } from '../src/core/fechas';
import { aMensual, ingresoMensualEstimado, mensualDeIngreso } from '../src/core/ingresos';
import { evaluarPresupuesto, fraseRitmo, nivelPorConsumo } from '../src/core/presupuesto';
import { cuotaMensual, estadoCuotas, repartirCuotas } from '../src/core/cuotas';
import { amortizar, cuotaFrancesa, diasParaPago, eaAEm, mesesRestantes, nivelEndeudamiento } from '../src/core/deudas';
import { cabeEnAhorro, calcularMeta } from '../src/core/metas';
import { costoAnual, normalizarProxima, siguienteFecha } from '../src/core/recurrentes';
import { generarInsights } from '../src/core/insights';

describe('dinero', () => {
  test('formatea pesos colombianos con punto de miles', () => {
    expect(separarMiles(1250000)).toBe('1.250.000');
    expect(formatoCOP(1250000)).toBe('$ 1.250.000');
    expect(formatoCOP(-45000)).toBe('-$ 45.000');
    expect(formatoCOP(0)).toBe('$ 0');
  });

  test('formato corto para ejes de graficos', () => {
    expect(formatoCorto(1_250_000)).toBe('1,3 M');
    expect(formatoCorto(45_000)).toBe('45 k');
    expect(formatoCorto(320)).toBe('320');
  });

  test('parsea lo que teclea el usuario', () => {
    expect(parsearMonto('1.250.000')).toBe(1250000);
    expect(parsearMonto('$ 45.000')).toBe(45000);
    expect(parsearMonto('')).toBe(0);
    expect(parsearMonto('abc')).toBe(0);
  });
});

describe('ciclos financieros', () => {
  test('con dia 1 el ciclo es el mes calendario', () => {
    const r = cicloDe(new Date(2026, 7, 15), 1);
    expect(r.desde.getDate()).toBe(1);
    expect(r.desde.getMonth()).toBe(7);
    expect(r.hasta.getDate()).toBe(31);
  });

  test('con dia 15 el ciclo va del 15 al 14 del mes siguiente', () => {
    const r = cicloDe(new Date(2026, 7, 20), 15);
    expect(r.desde.getDate()).toBe(15);
    expect(r.hasta.getDate()).toBe(14);
    expect(r.hasta.getMonth()).toBe(8);
  });

  test('una fecha anterior al corte cae en el ciclo previo', () => {
    const r = cicloDe(new Date(2026, 7, 3), 15);
    expect(r.desde.getMonth()).toBe(6);
    expect(r.desde.getDate()).toBe(15);
  });

  test('el dia 31 se ancla al ultimo dia de los meses cortos', () => {
    expect(anclarDia(2026, 1, 31).getDate()).toBe(28); // febrero 2026
    expect(anclarDia(2024, 1, 31).getDate()).toBe(29); // bisiesto
    expect(anclarDia(2026, 3, 31).getDate()).toBe(30); // abril
  });

  test('progreso del ciclo cuenta hoy como transcurrido', () => {
    const r = cicloDe(new Date(2026, 7, 10), 1);
    const p = progresoCiclo(r, new Date(2026, 7, 10));
    expect(p.total).toBe(31);
    expect(p.transcurridos).toBe(10);
    expect(p.restantes).toBe(21);
  });

  test('ultimosCiclos devuelve n rangos terminando en el actual', () => {
    const cs = ultimosCiclos(6, 1, new Date(2026, 7, 15));
    expect(cs).toHaveLength(6);
    expect(cs[5].desde.getMonth()).toBe(7);
    expect(cs[0].desde.getMonth()).toBe(2);
  });
});

describe('ingresos', () => {
  test('convierte cada frecuencia a base mensual', () => {
    expect(aMensual(1_000_000, 'mensual')).toBe(1_000_000);
    expect(aMensual(1_000_000, 'quincenal')).toBe(2_000_000);
    expect(Math.round(aMensual(300_000, 'semanal'))).toBe(1_300_000);
    expect(aMensual(500_000, 'ocasional')).toBe(0);
  });

  test('el ingreso estimado ignora los inactivos y los ocasionales', () => {
    const total = ingresoMensualEstimado([
      { monto: 2_400_000, frecuencia: 'quincenal' },
      { monto: 900_000, frecuencia: 'mensual' },
      { monto: 500_000, frecuencia: 'ocasional' },
      { monto: 1_000_000, frecuencia: 'mensual', activo: false },
    ]);
    expect(total).toBe(5_700_000);
  });
});

describe('presupuestos', () => {
  test('los umbrales de color siguen el semaforo definido', () => {
    expect(nivelPorConsumo(0.5)).toBe('sano');
    expect(nivelPorConsumo(0.7)).toBe('atencion');
    expect(nivelPorConsumo(0.95)).toBe('alerta');
    expect(nivelPorConsumo(1.2)).toBe('excedido');
  });

  test('proyecta el cierre extrapolando el ritmo actual', () => {
    // 400.000 gastados en 12 de 30 dias -> 1.000.000 proyectados.
    const e = evaluarPresupuesto(800_000, 400_000, 12, 30);
    expect(e.proyeccion).toBe(1_000_000);
    expect(e.desvioProyectado).toBe(200_000);
    expect(e.ritmoAlto).toBe(true);
    expect(e.restante).toBe(400_000);
  });

  test('el disponible diario reparte lo que queda entre los dias que faltan', () => {
    const e = evaluarPresupuesto(600_000, 300_000, 10, 30);
    expect(e.disponibleDiario).toBe(Math.round(300_000 / 21));
  });

  test('sin presupuesto no hay alerta ni division por cero', () => {
    const e = evaluarPresupuesto(0, 500_000, 10, 30);
    expect(e.fraccion).toBe(0);
    expect(e.nivel).toBe('sano');
    expect(fraseRitmo('Mercado', e)).toBeNull();
  });

  test('la frase de ritmo aparece solo cuando se gasta mas rapido que el tiempo', () => {
    const rapido = evaluarPresupuesto(500_000, 340_000, 12, 30);
    expect(fraseRitmo('Alimentación', rapido)).toContain('Alimentación');
    const lento = evaluarPresupuesto(500_000, 100_000, 20, 30);
    expect(fraseRitmo('Alimentación', lento)).toBeNull();
  });
});

describe('cuotas de tarjeta de credito', () => {
  test('el reparto suma exactamente el monto original', () => {
    const partes = repartirCuotas(1_000_000, 3);
    expect(partes).toHaveLength(3);
    expect(partes.reduce((a, b) => a + b, 0)).toBe(1_000_000);
  });

  test('limita a 36 cuotas y a minimo 1', () => {
    expect(repartirCuotas(360_000, 99)).toHaveLength(36);
    expect(repartirCuotas(100_000, 0)).toHaveLength(1);
  });

  test('cuenta la primera cuota en el mes de la compra', () => {
    const compra = { id: 1, descripcion: 'Nevera', monto: 3_600_000, cuotas: 12, fecha: new Date(2026, 5, 10), tarjetaId: 1 };
    const e = estadoCuotas(compra, new Date(2026, 7, 20));
    expect(e.cuotaMensual).toBe(300_000);
    expect(e.cuotasPagadas).toBe(3);
    expect(e.cuotasRestantes).toBe(9);
    expect(e.saldoPendiente).toBe(2_700_000);
    expect(e.activa).toBe(true);
  });

  test('una compra terminada deja de estar activa', () => {
    const compra = { id: 1, descripcion: 'x', monto: 600_000, cuotas: 3, fecha: new Date(2026, 0, 5), tarjetaId: null };
    expect(estadoCuotas(compra, new Date(2026, 7, 1)).activa).toBe(false);
  });

  test('cuotaMensual redondea a pesos', () => {
    expect(cuotaMensual(1_000_000, 3)).toBe(333_333);
  });
});

describe('deudas', () => {
  test('semaforo de endeudamiento', () => {
    expect(nivelEndeudamiento(1_000_000, 5_000_000).nivel).toBe('sano');
    expect(nivelEndeudamiento(1_750_000, 5_000_000).nivel).toBe('alerta');
    expect(nivelEndeudamiento(2_500_000, 5_000_000).nivel).toBe('riesgo');
  });

  test('sin ingreso registrado no se divide por cero', () => {
    expect(nivelEndeudamiento(500_000, 0).porcentaje).toBe(0);
  });

  test('cuota francesa con tasa cero es el capital dividido en el plazo', () => {
    expect(cuotaFrancesa(1_200_000, 0, 12)).toBe(100_000);
  });

  test('cuota francesa con interes es mayor que la division simple', () => {
    const c = cuotaFrancesa(10_000_000, 1.5, 24);
    expect(c).toBeGreaterThan(10_000_000 / 24);
    expect(c).toBeLessThan(600_000);
  });

  test('conversion entre tasa efectiva anual y mensual', () => {
    expect(Number(eaAEm(26).toFixed(3))).toBeCloseTo(1.945, 2);
  });

  test('la amortizacion termina en saldo cero', () => {
    const tabla = amortizar(1_000_000, 1.5, cuotaFrancesa(1_000_000, 1.5, 12));
    expect(tabla[tabla.length - 1].saldo).toBe(0);
    expect(mesesRestantes(1_000_000, 1.5, cuotaFrancesa(1_000_000, 1.5, 12))).toBe(12);
  });

  test('una cuota que no cubre intereses nunca salda la deuda', () => {
    expect(mesesRestantes(10_000_000, 2, 100_000)).toBeNull();
  });

  test('los dias para el pago nunca son negativos', () => {
    expect(diasParaPago(5, new Date(2026, 7, 20))).toBeGreaterThan(0);
    expect(diasParaPago(20, new Date(2026, 7, 20))).toBe(0);
  });
});

describe('metas de ahorro', () => {
  const base = { montoObjetivo: 12_000_000, montoActual: 3_000_000, fechaCreacion: subMonths(new Date(), 6) };

  test('calcula el aporte mensual necesario', () => {
    const m = calcularMeta({ ...base, fechaLimite: addMonths(new Date(), 9) });
    expect(m.aporteMensualNecesario).toBe(Math.ceil(9_000_000 / 9));
    expect(m.progreso).toBeCloseTo(0.25, 5);
    expect(m.faltante).toBe(9_000_000);
  });

  test('una meta completada queda en estado cumplida', () => {
    const m = calcularMeta({ ...base, montoActual: 12_000_000, fechaLimite: addMonths(new Date(), 3) });
    expect(m.estado).toBe('cumplida');
    expect(m.faltante).toBe(0);
  });

  test('una meta sin aportes no tiene fecha proyectada', () => {
    const m = calcularMeta({ ...base, montoActual: 0, fechaLimite: addMonths(new Date(), 3) });
    expect(m.fechaProyectada).toBeNull();
    expect(m.estado).toBe('atrasada');
  });

  test('la fecha limite vencida marca la meta como vencida', () => {
    const m = calcularMeta({ ...base, fechaLimite: subMonths(new Date(), 1) });
    expect(m.estado).toBe('vencida');
  });

  test('valida si los aportes caben en el bolsillo de ahorro', () => {
    const ok = cabeEnAhorro([300_000, 200_000], 600_000);
    expect(ok.cabe).toBe(true);
    expect(ok.holgura).toBe(100_000);
    const no = cabeEnAhorro([500_000, 400_000], 600_000);
    expect(no.cabe).toBe(false);
    expect(no.exceso).toBe(300_000);
  });
});

describe('recurrentes', () => {
  test('avanza la fecha segun la frecuencia', () => {
    const f = new Date(2026, 0, 31);
    expect(siguienteFecha(f, 'mensual').getMonth()).toBe(1);
    expect(siguienteFecha(f, 'quincenal').getDate()).toBe(15);
    expect(siguienteFecha(f, 'anual').getFullYear()).toBe(2027);
  });

  test('normaliza una fecha vencida hasta el futuro', () => {
    const prox = normalizarProxima(new Date(2025, 0, 5), 'mensual', new Date(2026, 7, 20));
    expect(prox.getTime()).toBeGreaterThanOrEqual(new Date(2026, 7, 20).getTime());
  });

  test('el costo anual revela el peso real de una suscripcion', () => {
    expect(costoAnual(44_900, 'mensual')).toBe(538_800);
    expect(costoAnual(26_900, 'quincenal')).toBe(645_600);
    expect(costoAnual(1_450_000, 'anual')).toBe(1_450_000);
  });
});

describe('insights', () => {
  const datos = {
    ingresoMensual: 5_000_000,
    gastoPeriodo: 3_000_000,
    gastoFijos: 2_100_000,
    ahorroPeriodo: 800_000,
    categorias: [
      { nombre: 'Restaurantes', total: 615_000, promedio: 500_000 },
      { nombre: 'Mercado', total: 700_000, promedio: 690_000 },
    ],
    porDiaSemana: [100_000, 80_000, 90_000, 110_000, 120_000, 400_000, 380_000],
    metas: [{ nombre: 'Viaje', desfase: 340_000, estado: 'adelantada' }],
    suscripcionesAnual: 2_184_000,
    cuotasMensuales: 1_200_000,
    diasTranscurridos: 15,
    diasTotales: 30,
  };

  test('detecta el peso de los gastos fijos', () => {
    const out = generarInsights(datos);
    expect(out.find((i) => i.id === 'fijos')?.texto).toContain('42%');
  });

  test('detecta la categoria que se disparo y no la que no', () => {
    const out = generarInsights(datos);
    expect(out.some((i) => i.texto.includes('Restaurantes'))).toBe(true);
    expect(out.some((i) => i.texto.includes('Mercado'))).toBe(false);
  });

  test('detecta la concentracion de fin de semana', () => {
    const out = generarInsights(datos);
    expect(out.find((i) => i.id === 'finde')?.texto).toContain('viernes y sábados');
  });

  test('muestra el costo anual de las suscripciones', () => {
    const out = generarInsights(datos);
    expect(out.find((i) => i.id === 'suscripciones')?.texto).toContain('2.184.000');
  });

  test('sin datos no inventa observaciones', () => {
    const vacio = {
      ...datos, ingresoMensual: 0, gastoPeriodo: 0, gastoFijos: 0, ahorroPeriodo: 0,
      categorias: [], porDiaSemana: [0, 0, 0, 0, 0, 0, 0], metas: [],
      suscripcionesAnual: 0, cuotasMensuales: 0,
    };
    expect(generarInsights(vacio)).toHaveLength(0);
  });
});

describe('quincenas que no son iguales', () => {
  test('sin segunda quincena se asumen dos pagos iguales', () => {
    expect(mensualDeIngreso({ monto: 2_000_000, frecuencia: 'quincenal' })).toBe(4_000_000);
  });

  test('con segunda quincena se suman las dos, no se duplica la primera', () => {
    // Caso real: primera quincena fija, segunda con prima o comisiones.
    expect(mensualDeIngreso({
      monto: 1_800_000, frecuencia: 'quincenal', montoSecundario: 2_400_000,
    })).toBe(4_200_000);
  });

  test('la segunda quincena se ignora en frecuencias que no son quincenales', () => {
    expect(mensualDeIngreso({
      monto: 3_000_000, frecuencia: 'mensual', montoSecundario: 999_999,
    })).toBe(3_000_000);
  });

  test('una segunda quincena vacía o cero no rompe el cálculo', () => {
    expect(mensualDeIngreso({ monto: 2_000_000, frecuencia: 'quincenal', montoSecundario: null })).toBe(4_000_000);
    expect(mensualDeIngreso({ monto: 2_000_000, frecuencia: 'quincenal', montoSecundario: 0 })).toBe(4_000_000);
  });

  test('un ingreso inactivo no aporta, venga como false o como 0', () => {
    expect(mensualDeIngreso({ monto: 5_000_000, frecuencia: 'mensual', activo: false })).toBe(0);
    expect(mensualDeIngreso({ monto: 5_000_000, frecuencia: 'mensual', activo: 0 })).toBe(0);
  });

  test('el total mezcla quincenas iguales y distintas correctamente', () => {
    expect(ingresoMensualEstimado([
      { monto: 1_800_000, frecuencia: 'quincenal', montoSecundario: 2_400_000 },
      { monto: 900_000, frecuencia: 'mensual' },
      { monto: 500_000, frecuencia: 'ocasional' },
    ])).toBe(5_100_000);
  });
});
