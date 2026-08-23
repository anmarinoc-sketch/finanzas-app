/**
 * Integridad del dinero. Cada prueba comprueba una identidad contable que
 * debe cumplirse siempre, con datos reales en SQLite. Es la respuesta al
 * problema de "a fin de mes no me cuadra con la tarjeta": si alguna de estas
 * se rompe, la app estaría perdiendo o inventando pesos.
 */
jest.mock('expo-sqlite', () => {
  const { BaseFalsa } = require('./apoyo/expoSqliteFalso');
  const instancia = new BaseFalsa();
  return { openDatabaseSync: () => instancia };
});

import { HAY_SQLITE } from './apoyo/expoSqliteFalso';
import { migrar } from '../src/db/bootstrap';
import { sembrarCatalogos } from '../src/db/seed';
import {
  borrarCategoria, conciliarCuenta, crearTransaccion, listarCategoriasRaiz,
  listarCuentas, listarMovimientos, saldoCuenta, saldosTarjeta, crearTarjeta,
  listarTarjetas, contarMovimientos,
} from '../src/db/crud';
import { totalesPeriodo } from '../src/db/consultas';
import { repartirCuotas } from '../src/core/cuotas';
import { bdNativa } from '../src/db/cliente';

const suite = HAY_SQLITE ? describe : describe.skip;
const hoy = new Date();
const iso = (d: Date) => d.toISOString().slice(0, 10);
const RANGO = { desde: new Date(2000, 0, 1), hasta: new Date(2100, 0, 1) };

let cuentaA = 0, cuentaB = 0;

beforeAll(() => {
  if (!HAY_SQLITE) return;
  migrar();
  sembrarCatalogos();
  const ctas = listarCuentas();
  cuentaA = ctas[0].id;
  cuentaB = ctas[1].id;
});

suite('ningún peso se pierde', () => {
  test('una compra a cuotas suma exactamente el monto original', () => {
    // El caso clásico de descuadre: 1.000.000 en 3 cuotas no es 333.333 x 3.
    for (const [monto, n] of [[1_000_000, 3], [3_600_000, 12], [999_999, 7], [50_000, 36]] as const) {
      const partes = repartirCuotas(monto, n);
      expect(partes).toHaveLength(n);
      expect(partes.reduce((a, b) => a + b, 0)).toBe(monto);
    }
  });

  test('las cuotas guardadas en la base suman el total de la compra', () => {
    const cat = listarCategoriasRaiz()[0];
    crearTarjeta({
      nombre: 'Visa prueba', banco: 'Banco', cupoTotal: 10_000_000,
      diaCorte: 15, diaPago: 5, tasaInteres: 26, color: '#4F46E5', archivada: 0,
    } as any);
    const tarjeta = listarTarjetas()[0];

    crearTransaccion({
      tipo: 'gasto', monto: 1_000_000, fecha: iso(hoy), categoriaId: cat.id,
      tarjetaId: tarjeta.id, medioPago: 'credito', descripcion: 'Compra diferida',
      cuotas: 3, etiquetas: '', creadoEn: iso(hoy),
    } as any);

    const suma = bdNativa.getFirstSync<{ t: number }>(
      'SELECT COALESCE(SUM(monto),0) AS t FROM transacciones WHERE tarjeta_id = ? AND cuotas > 1', [tarjeta.id],
    )!.t;
    expect(suma).toBe(1_000_000);

    const s = saldosTarjeta(tarjeta.id);
    expect(s.causado + s.futuro - s.pagos).toBe(s.deudaTotal);
    expect(s.causado + s.futuro).toBe(1_000_000);
  });

  test('un pago a la tarjeta reduce el saldo exactamente en lo pagado', () => {
    const tarjeta = listarTarjetas()[0];
    const antes = saldosTarjeta(tarjeta.id);
    crearTransaccion({
      tipo: 'transferencia', monto: 300_000, fecha: iso(hoy),
      cuentaId: cuentaA, tarjetaId: tarjeta.id, medioPago: 'transferencia',
      descripcion: 'Pago tarjeta', etiquetas: '', creadoEn: iso(hoy),
    } as any);
    const despues = saldosTarjeta(tarjeta.id);
    expect(despues.deudaTotal).toBe(antes.deudaTotal - 300_000);
    expect(despues.pagos).toBe(antes.pagos + 300_000);
  });
});

suite('identidades contables', () => {
  test('el saldo de una cuenta es exactamente inicial + entradas - salidas', () => {
    const inicial = listarCuentas().find((c) => c.id === cuentaA)!.saldoInicial;
    const partida = saldoCuenta(cuentaA);

    crearTransaccion({ tipo: 'ingreso', monto: 2_500_000, fecha: iso(hoy), cuentaId: cuentaA, medioPago: 'transferencia', descripcion: 'Salario', etiquetas: '', creadoEn: iso(hoy) } as any);
    crearTransaccion({ tipo: 'gasto', monto: 137_450, fecha: iso(hoy), cuentaId: cuentaA, categoriaId: listarCategoriasRaiz()[0].id, medioPago: 'debito', descripcion: 'Mercado', etiquetas: '', creadoEn: iso(hoy) } as any);

    expect(saldoCuenta(cuentaA)).toBe(partida + 2_500_000 - 137_450);
    expect(typeof inicial).toBe('number');
  });

  test('una transferencia mueve el dinero sin crear ni destruir nada', () => {
    const a = saldoCuenta(cuentaA);
    const b = saldoCuenta(cuentaB);
    const totalAntes = totalesPeriodo(RANGO);

    crearTransaccion({
      tipo: 'transferencia', monto: 400_000, fecha: iso(hoy),
      cuentaId: cuentaA, cuentaDestinoId: cuentaB, medioPago: 'transferencia',
      descripcion: 'Paso a Nequi', etiquetas: '', creadoEn: iso(hoy),
    } as any);

    // El dinero cambia de sitio...
    expect(saldoCuenta(cuentaA)).toBe(a - 400_000);
    expect(saldoCuenta(cuentaB)).toBe(b + 400_000);
    // ...y la suma de las dos cuentas no cambia.
    expect(saldoCuenta(cuentaA) + saldoCuenta(cuentaB)).toBe(a + b);
    // ...y no cuenta como gasto ni como ingreso.
    const totalDespues = totalesPeriodo(RANGO);
    expect(totalDespues.gastos).toBe(totalAntes.gastos);
    expect(totalDespues.ingresos).toBe(totalAntes.ingresos);
  });

  test('borrar una categoría no borra ni un peso de los movimientos', () => {
    const cat = listarCategoriasRaiz().find((c) => c.nombre === 'Regalos')!;
    crearTransaccion({ tipo: 'gasto', monto: 88_800, fecha: iso(hoy), categoriaId: cat.id, cuentaId: cuentaA, medioPago: 'efectivo', descripcion: 'Detalle', etiquetas: '', creadoEn: iso(hoy) } as any);

    const antes = totalesPeriodo(RANGO);
    const nAntes = contarMovimientos();
    const saldoAntes = saldoCuenta(cuentaA);

    borrarCategoria(cat.id);

    const despues = totalesPeriodo(RANGO);
    expect(despues.gastos).toBe(antes.gastos);
    expect(contarMovimientos()).toBe(nAntes);
    expect(saldoCuenta(cuentaA)).toBe(saldoAntes);
    // El movimiento sigue ahí, solo que sin categoría.
    expect(listarMovimientos({ texto: 'Detalle', limite: 5 })[0]?.categoriaId).toBeNull();
  });

  test('los totales del periodo son la suma exacta de los movimientos', () => {
    const movs = listarMovimientos({ limite: 10_000 });
    const gastos = movs.filter((m) => m.tipo === 'gasto').reduce((a, m) => a + m.monto, 0);
    const ingresos = movs.filter((m) => m.tipo === 'ingreso').reduce((a, m) => a + m.monto, 0);
    const t = totalesPeriodo(RANGO);
    expect(t.gastos).toBe(gastos);
    expect(t.ingresos).toBe(ingresos);
    expect(t.neto).toBe(ingresos - gastos);
  });

  test('conciliar deja la diferencia registrada, no escondida', () => {
    const antes = saldoCuenta(cuentaB);
    const real = antes - 25_300; // faltaba registrar un gasto de 25.300

    const r = conciliarCuenta(cuentaB, real);
    expect(r.diferencia).toBe(-25_300);
    expect(saldoCuenta(cuentaB)).toBe(real);

    // Queda un movimiento visible y etiquetado, no un cambio silencioso.
    const ajuste = listarMovimientos({ texto: 'Ajuste de saldo', limite: 5 })[0];
    expect(ajuste.monto).toBe(25_300);
    expect(ajuste.tipo).toBe('gasto');
    expect(ajuste.etiquetas).toContain('ajuste');
  });

  test('conciliar cuando ya cuadra no inventa movimientos', () => {
    const n = contarMovimientos();
    const r = conciliarCuenta(cuentaB, saldoCuenta(cuentaB));
    expect(r.diferencia).toBe(0);
    expect(contarMovimientos()).toBe(n);
  });

  test('los montos se guardan como enteros: nada de decimales perdidos', () => {
    const filas = bdNativa.getAllSync<{ monto: number }>('SELECT monto FROM transacciones');
    expect(filas.length).toBeGreaterThan(0);
    for (const f of filas) expect(Number.isInteger(f.monto)).toBe(true);
  });
});
