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
  archivarCategoria, borrarBolsillo, crearBolsillo, crearTransaccion, cargaCuotasDelMes, comprasACuotas, crearIngreso,
  guardarDistribucion, guardarUsuario, listarBolsillos, listarCategorias,
  listarCategoriasRaiz, listarCuentas, listarDeudas, listarIngresos,
  listarMetas, listarMovimientos, listarRecurrentes, listarTarjetas, reemplazarIngresos,
  contarMovimientos,
  obtenerUsuario, recurrentesVencidos, saldoConsolidado,
} from '../src/db/crud';
import {
  fijosVsVariables, gastoPorCategoria, gastoPorDia, gastoPorDiaSemana,
  gastoPorMedio, topComercios, totalCategoriaEnRango, totalesPeriodo,
} from '../src/db/consultas';
import { cicloDe, moverCiclo, progresoCiclo, ultimosCiclos } from '../src/core/fechas';
import { bdNativa } from '../src/db/cliente';
import { ingresoMensualEstimado, mensualDeIngreso } from '../src/core/ingresos';
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

suite('reconfigurar sin duplicar ni resucitar', () => {
  test('reemplazarIngresos sustituye en bloque, no acumula', () => {
    reemplazarIngresos([
      { nombre: 'Salario', monto: 4_000_000, frecuencia: 'mensual', activo: 1, fechaInicio: '2026-08-23', cuentaId: null },
    ] as any);
    expect(listarIngresos()).toHaveLength(1);

    // Rehacer la configuración con los mismos datos no debe duplicarlos.
    reemplazarIngresos([
      { nombre: 'Salario', monto: 4_500_000, frecuencia: 'mensual', activo: 1, fechaInicio: '2026-08-23', cuentaId: null },
      { nombre: 'Arriendo', monto: 900_000, frecuencia: 'mensual', activo: 1, fechaInicio: '2026-08-23', cuentaId: null },
    ] as any);
    const tras = listarIngresos();
    expect(tras).toHaveLength(2);
    expect(tras.find((i) => i.nombre === 'Salario')?.monto).toBe(4_500_000);
  });

  test('archivar y desarchivar categorías es reversible', () => {
    const todas = () => listarCategorias(true).filter((c) => !c.padreId);
    const objetivo = todas().find((c) => c.nombre === 'Ropa')!;

    archivarCategoria(objetivo.id, true);
    expect(listarCategoriasRaiz().some((c) => c.id === objetivo.id)).toBe(false);
    expect(todas().find((c) => c.id === objetivo.id)?.archivada).toBe(1);

    archivarCategoria(objetivo.id, false);
    expect(listarCategoriasRaiz().some((c) => c.id === objetivo.id)).toBe(true);
  });
});

suite('un bolsillo borrado no vuelve', () => {
  test('borrarBolsillo lo saca de la base de inmediato y no reaparece', () => {
    // Autocontenida: crea el bolsillo que va a borrar, para no depender del
    // estado que dejaron las pruebas anteriores.
    crearBolsillo({
      nombre: 'Prueba borrado', porcentaje: 0, color: '#EF4444',
      icono: 'card-outline', tipo: 'personalizado', orden: 99,
    } as any);
    const creado = listarBolsillos().find((b) => b.nombre === 'Prueba borrado');
    expect(creado).toBeDefined();
    const antes = listarBolsillos().length;

    borrarBolsillo(creado!.id);
    expect(listarBolsillos().some((b) => b.nombre === 'Prueba borrado')).toBe(false);

    // sembrarCatalogos corre en cada arranque: no debe resucitar nada.
    sembrarCatalogos();
    expect(listarBolsillos().some((b) => b.nombre === 'Prueba borrado')).toBe(false);
    expect(listarBolsillos()).toHaveLength(antes - 1);
  });

  test('el bolsillo de deudas que se quitó en el onboarding sigue sin estar', () => {
    expect(listarBolsillos().some((b) => b.tipo === 'deudas')).toBe(false);
  });

  test('guardar la distribución después no lo trae de vuelta', () => {
    const actuales = listarBolsillos();
    guardarDistribucion(actuales.map((b, i) => ({
      id: b.id, nombre: b.nombre, porcentaje: Math.round(100 / actuales.length),
      color: b.color, icono: b.icono, tipo: b.tipo, orden: i,
    })));
    expect(listarBolsillos().some((b) => b.tipo === 'deudas')).toBe(false);
  });

  test('la migración v3 añadió la columna de la segunda quincena', () => {
    const cols = bdNativa.getAllSync<{ name: string }>('PRAGMA table_info(ingresos)').map((c) => c.name);
    expect(cols).toContain('monto_secundario');
  });

  test('el monto de la segunda quincena se guarda y se lee', () => {
    reemplazarIngresos([
      { nombre: 'Sueldo', monto: 1_800_000, montoSecundario: 2_400_000, frecuencia: 'quincenal', activo: 1, fechaInicio: '2026-08-24', cuentaId: null },
    ] as any);
    const i = listarIngresos()[0];
    expect(i.montoSecundario).toBe(2_400_000);
    expect(mensualDeIngreso(i)).toBe(4_200_000);
  });
});

suite('las migraciones no pueden dejar la app atrapada', () => {
  test('reintentar una migración ya aplicada no lanza', () => {
    // Escenario real que causó una pérdida de datos: la app murió entre
    // aplicar la migración y anotar la versión, y en el siguiente arranque
    // el ALTER TABLE fallaba con "duplicate column name". Desde entonces
    // cada migración y su versión van en la misma transacción, y la v3 es
    // repetible. Forzar la versión hacia atrás debe ser inofensivo.
    bdNativa.execSync('PRAGMA user_version = 2');
    expect(() => migrar()).not.toThrow();
    expect(bdNativa.getFirstSync<{ user_version: number }>('PRAGMA user_version')!.user_version).toBe(3);

    // Y desde cero también, varias veces seguidas.
    bdNativa.execSync('PRAGMA user_version = 0');
    expect(() => { migrar(); migrar(); migrar(); }).not.toThrow();
  });

  test('reintentar las migraciones no borra ningún dato', () => {
    const antes = contarMovimientos();
    const ingresosAntes = listarIngresos().length;
    bdNativa.execSync('PRAGMA user_version = 0');
    migrar();
    expect(contarMovimientos()).toBe(antes);
    expect(listarIngresos()).toHaveLength(ingresosAntes);
  });

  test('la columna de la segunda quincena sigue ahí tras reaplicar', () => {
    const cols = bdNativa.getAllSync<{ name: string }>('PRAGMA table_info(ingresos)').map((c) => c.name);
    expect(cols.filter((c) => c === 'monto_secundario')).toHaveLength(1);
  });
});

suite('reiniciar la configuración no borra los movimientos', () => {
  test('poner onboardingCompleto en 0 conserva todo lo registrado', () => {
    // Es lo que hace "volver a hacer la configuración" del modo recuperación.
    // El asistente vuelve a aparecer, pero los datos siguen ahí: de esa
    // confusión salió el susto de creer que se había perdido todo.
    // Un movimiento propio: esta suite no crea ninguno por su cuenta.
    crearTransaccion({
      tipo: 'gasto', monto: 45_000, fecha: '2026-09-18',
      categoriaId: listarCategoriasRaiz()[0].id, medioPago: 'efectivo',
      descripcion: 'Mercado de prueba', etiquetas: '', creadoEn: '2026-09-18',
    } as any);
    const antes = contarMovimientos();
    expect(antes).toBeGreaterThan(0);

    guardarUsuario({ onboardingCompleto: 0 });
    expect(obtenerUsuario()?.onboardingCompleto).toBe(0);
    expect(contarMovimientos()).toBe(antes);

    // Y volver a entrar sin reconfigurar tampoco toca nada.
    guardarUsuario({ onboardingCompleto: 1 });
    expect(contarMovimientos()).toBe(antes);
  });

  test('terminar el asistente otra vez no borra movimientos', () => {
    const antes = contarMovimientos();
    // Lo que hace finalizar(): reemplaza ingresos, distribución y categorías.
    reemplazarIngresos([
      { nombre: 'Otro sueldo', monto: 3_000_000, frecuencia: 'mensual', activo: 1, fechaInicio: '2026-09-18', cuentaId: null },
    ] as any);
    const bolsillos = listarBolsillos();
    guardarDistribucion(bolsillos.map((b, i) => ({
      id: b.id, nombre: b.nombre, porcentaje: Math.round(100 / bolsillos.length),
      color: b.color, icono: b.icono, tipo: b.tipo, orden: i,
    })));
    listarCategorias(true).filter((c) => !c.padreId).forEach((c) => archivarCategoria(c.id, false));

    expect(contarMovimientos()).toBe(antes);
  });
});
