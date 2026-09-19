/**
 * Preparación de datos de los gráficos.
 *
 * Existe por el fallo que tumbaba la pantalla de Análisis y que acabó
 * provocando una pérdida de datos: react-native-gifted-charts lee
 * `stackItem.stacks[0].barWidth` sin comprobar que el elemento exista, así
 * que una columna sin tramos lanzaba "Cannot read property 'barWidth' of
 * undefined". Pasaba en cuanto había un periodo sin gasto.
 */
import { aColumnasApiladas, maximoApilado } from '../src/core/graficos';

const series = [
  { nombre: 'Mercado', color: '#22C55E', valores: [0, 0, 350_000, 400_000, 0, 120_000] },
  { nombre: 'Transporte', color: '#06B6D4', valores: [0, 0, 80_000, 90_000, 0, 30_000] },
];
const etiquetas = ['Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep'];

describe('columnas apiladas', () => {
  test('ninguna columna se queda sin tramos, ni con todo en cero', () => {
    const columnas = aColumnasApiladas(etiquetas, series);
    expect(columnas).toHaveLength(6);
    for (const c of columnas) {
      expect(c.stacks.length).toBeGreaterThan(0);
      expect(c.stacks[0]).toBeDefined();
      // Esto es lo que leía la librería y lo que rompía la pantalla.
      expect(c.stacks[0]).toHaveProperty('value');
    }
  });

  test('los periodos vacíos llevan un tramo invisible, no uno visible en cero', () => {
    const columnas = aColumnasApiladas(etiquetas, series);
    expect(columnas[0].stacks).toEqual([{ value: 0, color: 'transparent' }]);
    expect(columnas[4].stacks).toEqual([{ value: 0, color: 'transparent' }]);
  });

  test('los periodos con gasto conservan solo los tramos con valor', () => {
    const columnas = aColumnasApiladas(etiquetas, series);
    expect(columnas[2].stacks).toEqual([
      { value: 350_000, color: '#22C55E' },
      { value: 80_000, color: '#06B6D4' },
    ]);
  });

  test('sin ninguna serie tampoco deja columnas vacías', () => {
    const columnas = aColumnasApiladas(etiquetas, []);
    expect(columnas).toHaveLength(6);
    for (const c of columnas) expect(c.stacks).toHaveLength(1);
  });

  test('los valores negativos no se cuelan en el apilado', () => {
    const columnas = aColumnasApiladas(['X'], [{ nombre: 'raro', color: '#000', valores: [-500] }]);
    expect(columnas[0].stacks).toEqual([{ value: 0, color: 'transparent' }]);
  });

  test('faltar valores en una serie no rompe nada', () => {
    const columnas = aColumnasApiladas(etiquetas, [{ nombre: 'corta', color: '#000', valores: [100] }]);
    expect(columnas).toHaveLength(6);
    expect(columnas[0].stacks).toEqual([{ value: 100, color: '#000' }]);
    expect(columnas[5].stacks).toHaveLength(1);
  });

  test('el máximo nunca es cero, para no dividir por cero al escalar', () => {
    expect(maximoApilado(aColumnasApiladas(etiquetas, []))).toBe(1);
    expect(maximoApilado(aColumnasApiladas(etiquetas, series))).toBe(490_000);
  });

  test('sin etiquetas no hay columnas y el máximo sigue siendo seguro', () => {
    expect(aColumnasApiladas([], series)).toEqual([]);
    expect(maximoApilado([])).toBe(1);
  });
});
