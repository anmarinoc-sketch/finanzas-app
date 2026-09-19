/**
 * Medios de pago.
 *
 * Andrés pidió dejar solo tres: efectivo, transferencia y mixto. La parte
 * delicada no es quitarlos de la lista, es que los movimientos ya registrados
 * usan medios que ya no se ofrecen: si la app los olvidara, un pago hecho con
 * tarjeta débito pasaría a leerse como "Otro" en el historial y en los
 * gráficos. Eso sería reescribir el pasado, y aquí se prohíbe.
 */
jest.mock('expo-sqlite', () => {
  const { BaseFalsa } = require('./apoyo/expoSqliteFalso');
  const instancia = new BaseFalsa();
  return { openDatabaseSync: () => instancia };
});

import { HAY_SQLITE } from './apoyo/expoSqliteFalso';
import { migrar } from '../src/db/bootstrap';
import { sembrarCatalogos } from '../src/db/seed';
import { crearTransaccion, listarCuentas } from '../src/db/crud';
import { mediosUsados } from '../src/db/consultas';
import { bdNativa } from '../src/db/cliente';
import {
  MEDIOS_ANTERIORES, MEDIOS_PAGO, MEDIO_CREDITO, TODOS_LOS_MEDIOS,
  iconoMedio, mediosParaFiltro, nombreMedio,
} from '../src/constantes/medios';
import { esFormaDePago } from '../src/core/movimientos';

describe('qué medios se pueden elegir', () => {
  test('son exactamente los tres que pidió: efectivo, transferencia y mixto', () => {
    expect(MEDIOS_PAGO.map((m) => m.id)).toEqual(['efectivo', 'transferencia', 'mixto']);
  });

  test('mixto lleva su aclaración, porque el nombre solo no se explica', () => {
    expect(MEDIOS_PAGO.find((m) => m.id === 'mixto')?.detalle).toBe('Efectivo y transferencia');
  });

  test('la tarjeta de crédito no está en la lista, pero sigue existiendo', () => {
    // Se ofrece solo si hay tarjetas registradas: si desapareciera del todo,
    // el módulo de tarjetas y cuotas no tendría por dónde alimentarse.
    expect(MEDIOS_PAGO.map((m) => m.id)).not.toContain('credito');
    expect(TODOS_LOS_MEDIOS.map((m) => m.id)).toContain('credito');
    expect(MEDIO_CREDITO.id).toBe('credito');
  });

  test('ningún medio está duplicado entre las dos listas', () => {
    const ids = TODOS_LOS_MEDIOS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('los movimientos ya registrados no se reinterpretan', () => {
  test('un pago antiguo con tarjeta débito sigue llamándose así', () => {
    expect(nombreMedio('debito')).toBe('Tarjeta débito');
    expect(nombreMedio('nequi')).toBe('Nequi');
    expect(nombreMedio('daviplata')).toBe('Daviplata');
    expect(nombreMedio('credito')).toBe('Tarjeta crédito');
  });

  test('los medios nuevos y los antiguos tienen nombre e icono', () => {
    for (const m of TODOS_LOS_MEDIOS) {
      expect(nombreMedio(m.id)).toBe(m.nombre);
      expect(iconoMedio(m.id)).toBe(m.icono);
    }
    expect(nombreMedio('mixto')).toBe('Mixto');
  });

  test('un medio desconocido cae en "Otro" en vez de romper la fila', () => {
    expect(nombreMedio('bitcoin')).toBe('Otro');
    expect(nombreMedio(null)).toBe('Otro');
    expect(iconoMedio(undefined)).toBe('ellipsis-horizontal');
  });
});

describe('qué medios se ofrecen al filtrar', () => {
  test('sin historial, solo los tres elegibles', () => {
    expect(mediosParaFiltro([]).map((m) => m.id)).toEqual(['efectivo', 'transferencia', 'mixto']);
  });

  test('con historial antiguo, aparecen también los medios que de verdad se usaron', () => {
    const ids = mediosParaFiltro(['debito', 'efectivo', 'nequi']).map((m) => m.id);
    expect(ids).toEqual(['efectivo', 'transferencia', 'mixto', 'debito', 'nequi']);
  });

  test('no se ofrece un medio antiguo que nadie usó', () => {
    expect(mediosParaFiltro(['efectivo']).map((m) => m.id)).not.toContain('daviplata');
  });

  test('no duplica un medio que está en las dos listas', () => {
    const ids = mediosParaFiltro(['efectivo', 'transferencia', 'mixto']).map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('aguanta nulos sin quejarse', () => {
    expect(mediosParaFiltro([null, undefined, '']).map((m) => m.id)).toEqual(
      ['efectivo', 'transferencia', 'mixto'],
    );
  });
});

describe('mixto como forma de pago escrita', () => {
  test('se reconoce, para que no encabece una fila del historial', () => {
    expect(esFormaDePago('Mixto')).toBe(true);
    expect(esFormaDePago('efectivo y transferencia')).toBe(true);
  });
});

(HAY_SQLITE ? describe : describe.skip)('los medios usados salen del historial real', () => {
  beforeAll(() => {
    migrar();
    sembrarCatalogos();
    bdNativa.execSync('DELETE FROM transacciones');
    const cuenta = listarCuentas()[0].id;
    for (const medio of ['efectivo', 'mixto', 'debito']) {
      crearTransaccion({
        tipo: 'gasto', monto: 10_000, fecha: '2026-09-10', cuentaId: cuenta,
        medioPago: medio, descripcion: 'Prueba', etiquetas: '', creadoEn: '2026-09-10',
      } as any);
    }
  });

  test('devuelve los distintos, sin repetir', () => {
    const usados = mediosUsados();
    expect(usados.sort()).toEqual(['debito', 'efectivo', 'mixto']);
  });

  test('el filtro ofrece los tres elegibles más el débito que sí se usó', () => {
    expect(mediosParaFiltro(mediosUsados()).map((m) => m.id))
      .toEqual(['efectivo', 'transferencia', 'mixto', 'debito']);
  });
});
