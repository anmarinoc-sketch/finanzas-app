/**
 * Que las cifras conversen entre pantallas.
 *
 * El fallo que originó estas pruebas: el encabezado de Movimientos sumaba en
 * JavaScript la página cargada (60 filas), mientras el inicio sumaba en SQL
 * todo el ciclo. Con más de 60 movimientos en el mes, las dos pantallas
 * mostraban cifras distintas para lo mismo. Andrés lo vio y lo reportó así:
 * "acá se ve un desbalance, no conversan las cifras".
 *
 * La regla que se fija aquí: un mismo concepto en el mismo periodo da el mismo
 * número, venga de donde venga, y cada desglose suma exactamente el total.
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
  crearTransaccion, listarCategoriasRaiz, listarCuentas, listarMovimientos,
  totalesMovimientos,
} from '../src/db/crud';
import {
  gastoPorBolsillo, gastoPorCategoria, gastoPorDia, gastoPorMedio, topComercios,
  totalesPeriodo,
} from '../src/db/consultas';
import { bdNativa } from '../src/db/cliente';
import { esFormaDePago, etiquetasFila } from '../src/core/movimientos';

const suite = HAY_SQLITE ? describe : describe.skip;
const iso = (d: Date) => d.toISOString().slice(0, 10);

// Un ciclo completo y controlado: septiembre de 2026.
const RANGO = { desde: new Date(2026, 8, 1), hasta: new Date(2026, 8, 30) };
const MOVIMIENTOS = 140; // muy por encima de la página de 60

let gastoEsperado = 0;
let ingresoEsperado = 0;

beforeAll(() => {
  if (!HAY_SQLITE) return;
  migrar();
  sembrarCatalogos();
  bdNativa.execSync('DELETE FROM transacciones');

  const cuenta = listarCuentas()[0].id;
  const cats = listarCategoriasRaiz();
  const medios = ['efectivo', 'debito', 'credito', 'nequi'];

  // 140 gastos repartidos por todo el mes, categorías y medios variados.
  for (let i = 0; i < MOVIMIENTOS; i++) {
    const monto = 3_000 + i * 137;
    const dia = (i % 30) + 1;
    gastoEsperado += monto;
    crearTransaccion({
      tipo: 'gasto', monto, fecha: iso(new Date(2026, 8, dia)),
      categoriaId: cats[i % cats.length].id, cuentaId: cuenta,
      medioPago: medios[i % medios.length], descripcion: `Gasto ${i}`,
      etiquetas: '', creadoEn: iso(new Date(2026, 8, dia)),
    } as any);
  }

  // Dos ingresos al principio del mes: fuera de la primera página, que es
  // justo lo que hacía desaparecer los ingresos del encabezado.
  for (const monto of [4_621_992, 4_621_992]) {
    ingresoEsperado += monto;
    crearTransaccion({
      tipo: 'ingreso', monto, fecha: iso(new Date(2026, 8, 1)), cuentaId: cuenta,
      medioPago: 'transferencia', descripcion: 'Salario', etiquetas: '',
      creadoEn: iso(new Date(2026, 8, 1)),
    } as any);
  }

  // Una transferencia: no es gasto ni ingreso y no debe contar en ninguno.
  crearTransaccion({
    tipo: 'transferencia', monto: 500_000, fecha: iso(new Date(2026, 8, 15)),
    cuentaId: cuenta, medioPago: 'transferencia', descripcion: 'Pago tarjeta',
    etiquetas: '', creadoEn: iso(new Date(2026, 8, 15)),
  } as any);
});

suite('las cifras conversan entre pantallas', () => {
  test('hay más movimientos que una página, que es donde aparecía el fallo', () => {
    expect(listarMovimientos({ ...RANGO, limite: 60 }).length).toBe(60);
    expect(totalesMovimientos(RANGO).cuantos).toBe(MOVIMIENTOS + 3);
  });

  test('el encabezado de Movimientos da lo mismo que el del inicio', () => {
    const inicio = totalesPeriodo(RANGO);
    const historial = totalesMovimientos(RANGO);
    expect(historial.gastos).toBe(inicio.gastos);
    expect(historial.ingresos).toBe(inicio.ingresos);
    expect(historial.neto).toBe(inicio.neto);
  });

  test('los totales no dependen de cuánto se haya cargado en pantalla', () => {
    const base = totalesMovimientos(RANGO);
    expect(totalesMovimientos({ ...RANGO, limite: 5 })).toEqual(base);
    expect(totalesMovimientos({ ...RANGO, limite: 10_000 })).toEqual(base);
  });

  test('sumar la página cargada da un número distinto: por eso se suma en SQL', () => {
    // Esta prueba reproduce el fallo antiguo. Si alguien vuelve a sumar en JS
    // lo que hay en pantalla, la prueba de arriba falla y esta explica por qué.
    const pagina = listarMovimientos({ ...RANGO, limite: 60 }).reduce(
      (a, m) => {
        if (m.tipo === 'gasto') a.gastos += m.monto;
        if (m.tipo === 'ingreso') a.ingresos += m.monto;
        return a;
      },
      { gastos: 0, ingresos: 0 },
    );
    const real = totalesMovimientos(RANGO);
    expect(pagina.gastos).toBeLessThan(real.gastos);
    expect(pagina.ingresos).toBe(0); // los ingresos del día 1 quedan fuera de la página
  });

  test('las cifras son las que se registraron, sin perder ni inventar un peso', () => {
    const tot = totalesPeriodo(RANGO);
    expect(tot.gastos).toBe(gastoEsperado);
    expect(tot.ingresos).toBe(ingresoEsperado);
  });

  test('cada desglose del gasto suma exactamente el total del periodo', () => {
    const total = totalesPeriodo(RANGO).gastos;
    const suma = (xs: { total: number }[]) => xs.reduce((a, x) => a + x.total, 0);
    expect(suma(gastoPorCategoria(RANGO))).toBe(total);
    expect(suma(gastoPorMedio(RANGO).map((m) => ({ total: m.total })))).toBe(total);
    expect(suma(gastoPorBolsillo(RANGO))).toBe(total);
    expect(suma(gastoPorDia(RANGO))).toBe(total);
  });

  test('filtrar por medio de pago da lo mismo en el historial y en el desglose', () => {
    for (const { medio, total } of gastoPorMedio(RANGO)) {
      expect(totalesMovimientos({ ...RANGO, medios: [medio] }).gastos).toBe(total);
    }
  });

  test('el top de comercios suma todo el gasto y no llama comercio a un medio de pago', () => {
    const total = totalesPeriodo(RANGO).gastos;
    const todos = topComercios(RANGO, 10_000);
    expect(todos.reduce((a, x) => a + x.total, 0)).toBe(total);
    // Ninguna etiqueta del top puede ser una forma de pago cuando hay categoría.
    const cat = listarCategoriasRaiz()[0];
    crearTransaccion({
      tipo: 'gasto', monto: 99_000, fecha: iso(new Date(2026, 8, 20)),
      categoriaId: cat.id, medioPago: 'debito', descripcion: 'Transferencia',
      etiquetas: '', creadoEn: iso(new Date(2026, 8, 20)),
    } as any);
    const conMedio = topComercios(RANGO, 10_000);
    expect(conMedio.some((x) => x.descripcion === 'Transferencia')).toBe(false);
    expect(conMedio.find((x) => x.descripcion === cat.nombre)).toBeDefined();
    // Y el total sigue cuadrando con el gasto del periodo.
    expect(conMedio.reduce((a, x) => a + x.total, 0)).toBe(totalesPeriodo(RANGO).gastos);
    bdNativa.runSync('DELETE FROM transacciones WHERE descripcion = ?', ['Transferencia']);
  });

  test('una transferencia no cuenta como gasto ni como ingreso', () => {
    const tot = totalesMovimientos(RANGO);
    expect(tot.gastos + tot.ingresos).toBe(gastoEsperado + ingresoEsperado);
    // Pero sí aparece en el historial: el dinero se movió y debe verse.
    expect(totalesMovimientos({ ...RANGO, tipos: ['transferencia'] }).cuantos).toBe(1);
  });
});

/**
 * Etiquetas de la fila del historial. Función pura, sin base de datos: se
 * prueba siempre, también en Node sin node:sqlite.
 */
describe('qué encabeza una fila del historial', () => {
  const fila = (descripcion: string, categoriaNombre: string | null, tipo = 'gasto') =>
    etiquetasFila({ tipo, descripcion, categoriaNombre });

  test('encabeza el comercio cuando está escrito', () => {
    const r = fila('Ara', 'Alimentación');
    expect(r.titulo).toBe('Ara');
    expect(r.extra).toBeNull();
    expect(r.tituloEsCategoria).toBe(false);
  });

  test('si la descripción es la forma de pago, encabeza la categoría', () => {
    // El caso real: "Transferencia · 18 sep · Ara · Tarjeta débito".
    const r = fila('Transferencia', 'Ara');
    expect(r.titulo).toBe('Ara');
    expect(r.extra).toBe('Transferencia');
    expect(r.tituloEsCategoria).toBe(true);
  });

  test('reconoce las formas de pago con y sin tilde, en cualquier caja', () => {
    for (const t of ['Efectivo', 'EFECTIVO', 'tarjeta débito', 'Tarjeta Debito',
      'Cuenta', 'nequi', 'Daviplata', 'transf', ' crédito ']) {
      expect(esFormaDePago(t)).toBe(true);
    }
  });

  test('no confunde un comercio con una forma de pago', () => {
    for (const t of ['Ara', 'Tienda El Esquinazo', 'Almuerzo en la calle',
      'Proteína', 'Pasaje', 'Banco de la esquina', 'Cuenta de cobro del gas']) {
      expect(esFormaDePago(t)).toBe(false);
    }
  });

  test('nunca se pierde lo que se escribió: o encabeza o va al detalle', () => {
    const r = fila('Efectivo', 'Mercado');
    expect([r.titulo, r.extra]).toContain('Efectivo');
  });

  test('sin descripción ni categoría queda una etiqueta genérica según el tipo', () => {
    expect(fila('', null).titulo).toBe('Gasto');
    expect(fila('', null, 'ingreso').titulo).toBe('Ingreso');
    expect(fila('', null, 'transferencia').titulo).toBe('Transferencia');
    expect(fila('', 'Mercado').titulo).toBe('Mercado');
  });

  test('sin categoría se respeta la descripción aunque sea la forma de pago', () => {
    // No hay nada mejor que poner: quitarla dejaría la fila sin título.
    expect(fila('Efectivo', null).titulo).toBe('Efectivo');
  });
});
