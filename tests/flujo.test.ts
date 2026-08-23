/**
 * Prueba de integración del camino que fallaba: terminar el onboarding y
 * entrar al dashboard. Ejecuta el repositorio y las consultas reales contra
 * un SQLite de verdad, con el mismo esquema que usa la app en el teléfono.
 */
import { HAY_SQLITE } from './apoyo/expoSqliteFalso';

// El mock se iza por encima de los imports, así que la instancia se crea
// dentro del propio factory: si no, la capa de datos se cargaría antes.
jest.mock('expo-sqlite', () => {
  const { BaseFalsa } = require('./apoyo/expoSqliteFalso');
  const instancia = new BaseFalsa();
  return { openDatabaseSync: () => instancia };
});

import { migrar } from '../src/db/bootstrap';
import { sembrarCatalogos } from '../src/db/seed';
import {
  archivarCategoria, cargaCuotasDelMes, comprasACuotas, crearIngreso,
  guardarDistribucion, guardarUsuario, listarBolsillos, listarCategorias,
  listarCategoriasRaiz, listarCuentas, listarDeudas, listarIngresos,
  listarMetas, listarMovimientos, listarRecurrentes, listarTarjetas,
  obtenerUsuario, recurrentesVencidos, saldoConsolidado,
} from '../src/db/crud';
import {
  fijosVsVariables, gastoPorCategoria, gastoPorDia, gastoPorDiaSemana,
  gastoPorMedio, topComercios, totalCategoriaEnRango, totalesPeriodo,
} from '../src/db/consultas';
import { cicloDe, moverCiclo, progresoCiclo, ultimosCiclos } from '../src/core/fechas';
import { ingresoMensualEstimado } from '../src/core/ingresos';
import { evaluarPresupuesto } from '../src/core/presupuesto';

beforeAll(() => {
  if (!HAY_SQLITE) return;
  migrar();
  sembrarCatalogos();
});

const suite = HAY_SQLITE ? describe : describe.skip;
suite('arranque en frío', () => {
  test('las migraciones y los catálogos base se crean', () => {
    expect(listarBolsillos().length).toBe(5);
    expect(listarCategoriasRaiz().length).toBe(20);
    expect(listarCuentas().length).toBe(3);
    expect(obtenerUsuario()).toBeUndefined();
  });
});

suite('terminar el onboarding', () => {
  test('el flujo completo no lanza y deja el estado consistente', () => {
    // 1. Un solo ingreso, que es el caso mínimo que debe bastar.
    crearIngreso({
      nombre: 'Salario', monto: 4_000_000, frecuencia: 'mensual',
      activo: 1, fechaInicio: '2026-08-23', cuentaId: null,
    } as any);

    // 2. Distribución, incluyendo el borrado de un bolsillo por defecto.
    const bolsillos = listarBolsillos()
      .filter((b) => b.tipo !== 'deudas')
      .map((b, i) => ({
        nombre: b.nombre, porcentaje: [50, 20, 20, 10][i] ?? 0,
        color: b.color, icono: b.icono, tipo: b.tipo, orden: i,
      }));
    guardarDistribucion(bolsillos);
    expect(listarBolsillos().length).toBe(4);

    // 3. Categorías desactivadas.
    const gimnasio = listarCategoriasRaiz().find((c) => c.nombre === 'Gimnasio')!;
    archivarCategoria(gimnasio.id, true);

    // 4. Preferencias y marca de onboarding completo.
    guardarUsuario({
      nombre: 'Andrés', diaInicioCiclo: 1, tema: 'sistema',
      biometria: 0, notificaciones: 1, onboardingCompleto: 1,
      creadoEn: '2026-08-23',
    } as any);

    const u = obtenerUsuario();
    expect(u?.onboardingCompleto).toBe(1);
    expect(ingresoMensualEstimado(listarIngresos().map((i) => ({ monto: i.monto, frecuencia: i.frecuencia, activo: !!i.activo })))).toBe(4_000_000);
  });

  test('ninguna categoría queda apuntando a un bolsillo borrado', () => {
    const ids = new Set(listarBolsillos().map((b) => b.id));
    const colgadas = listarCategorias(true).filter((c) => c.bolsilloId != null && !ids.has(c.bolsilloId));
    expect(colgadas).toEqual([]);
  });
});

suite('primer render del dashboard, sin ningún movimiento', () => {
  const diaInicio = 1;

  test('todas las consultas del resumen responden sin lanzar', () => {
    const rango = cicloDe(new Date(), diaInicio);
    const anterior = moverCiclo(rango, -1, diaInicio);

    expect(() => {
      totalesPeriodo(rango);
      totalesPeriodo(anterior);
      gastoPorCategoria(rango);
      gastoPorCategoria(rango, ['efectivo']);
      gastoPorDia(rango);
      gastoPorDiaSemana(rango);
      gastoPorMedio(rango);
      topComercios(rango, 10);
      fijosVsVariables(rango);
      comprasACuotas();
      cargaCuotasDelMes();
      listarMovimientos({ limite: 5 });
      recurrentesVencidos();
      saldoConsolidado();
      listarMetas();
      listarTarjetas();
      listarDeudas();
      listarRecurrentes();
      ultimosCiclos(6, diaInicio).forEach((c) => {
        totalesPeriodo(c);
        totalCategoriaEnRango(null, c);
      });
    }).not.toThrow();
  });

  test('los totales de un periodo vacío son cero, no NaN ni undefined', () => {
    const t = totalesPeriodo(cicloDe(new Date(), diaInicio));
    expect(t).toEqual({ gastos: 0, ingresos: 0, ahorro: 0, neto: 0 });
    expect(Number.isFinite(t.gastos)).toBe(true);
  });

  test('el presupuesto global sin datos no divide por cero', () => {
    const prog = progresoCiclo(cicloDe(new Date(), diaInicio));
    const e = evaluarPresupuesto(0, 0, prog.transcurridos, prog.total);
    expect(Number.isFinite(e.fraccion)).toBe(true);
    expect(Number.isFinite(e.proyeccion)).toBe(true);
    expect(Number.isFinite(e.disponibleDiario)).toBe(true);
  });

  test('las listas vacías no rompen los agregados de los gráficos', () => {
    const rango = cicloDe(new Date(), diaInicio);
    expect(gastoPorCategoria(rango)).toEqual([]);
    expect(topComercios(rango)).toEqual([]);
    expect(comprasACuotas()).toEqual([]);
    expect(cargaCuotasDelMes()).toBe(0);
    expect(listarMovimientos({ limite: 5 })).toEqual([]);
  });
});
