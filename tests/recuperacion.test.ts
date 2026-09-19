/**
 * El camino que llevó a una pérdida de datos real, convertido en prueba.
 *
 * La cadena fue: un gráfico lanza -> se cierra la app entera -> tres cierres
 * seguidos -> modo recuperación -> allí el borrado parece la única salida.
 * Estas pruebas fijan los dos eslabones que la rompen:
 *
 *  1. Un fallo atrapado por la frontera de error NO cuenta como arranque
 *     fallido, así que visitar veinte veces una pantalla rota nunca lleva al
 *     modo recuperación.
 *  2. El modo recuperación sigue apareciendo cuando de verdad toca: cuando la
 *     app no llega a estabilizarse varias veces seguidas.
 */
jest.mock('expo-sqlite', () => {
  const { BaseFalsa } = require('./apoyo/expoSqliteFalso');
  const instancia = new BaseFalsa();
  return { openDatabaseSync: () => instancia };
});

import { HAY_SQLITE } from './apoyo/expoSqliteFalso';
import { migrar } from '../src/db/bootstrap';
import {
  confirmarArranque, leerUltimoError, limpiarError,
  registrarArranque, registrarFalloDePantalla,
} from '../src/servicios/diagnostico';

const suite = HAY_SQLITE ? describe : describe.skip;

beforeAll(() => { if (HAY_SQLITE) migrar(); });
beforeEach(() => { if (HAY_SQLITE) { confirmarArranque(); limpiarError(); } });

suite('modo recuperación', () => {
  test('tres arranques sin estabilizar llevan a recuperación', () => {
    expect(registrarArranque().recuperacion).toBe(false);
    expect(registrarArranque().recuperacion).toBe(false);
    expect(registrarArranque().recuperacion).toBe(true);
  });

  test('un arranque bueno reinicia el contador', () => {
    registrarArranque();
    registrarArranque();
    confirmarArranque();
    expect(registrarArranque().recuperacion).toBe(false);
  });

  test('una pantalla que falla muchas veces nunca lleva a recuperación', () => {
    // Abrir la app y entrar veinte veces en la pantalla rota.
    expect(registrarArranque().recuperacion).toBe(false);
    for (let i = 0; i < 20; i++) {
      registrarFalloDePantalla(new Error('Cannot read property \'barWidth\' of undefined'), 'Análisis');
      // Cada nueva apertura de la app parte de cero, porque la frontera ya
      // confirmó el arranque: el contador no se acumula.
      expect(registrarArranque().recuperacion).toBe(false);
      confirmarArranque();
    }
  });

  test('el fallo atrapado queda registrado con su pantalla', () => {
    registrarFalloDePantalla(new Error('barWidth'), 'Análisis');
    const err = leerUltimoError();
    expect(err?.mensaje).toContain('barWidth');
    expect(err?.contexto).toBe('pantalla: Análisis');
    // No fatal: la app siguió funcionando.
    expect(err?.fatal).toBe(false);
  });
});
