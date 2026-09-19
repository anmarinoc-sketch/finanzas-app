/**
 * Preparación de datos para los gráficos. Funciones puras, probables sin
 * montar nada de React ni de la librería de gráficos.
 */

export type SerieApilada = { nombre: string; color: string; valores: number[] };
export type TramoApilado = { value: number; color: string };
export type ColumnaApilada = { label: string; stacks: TramoApilado[] };

/**
 * Convierte series por categoría en las columnas que espera BarChart.
 *
 * Detalle que parece menor y no lo es: `stacks` NUNCA puede quedar vacío.
 * react-native-gifted-charts lee `stackItem.stacks[0].barWidth` sin
 * comprobar que el elemento exista, así que una columna sin tramos lanza
 * "Cannot read property 'barWidth' of undefined" y tumba toda la pantalla
 * de Análisis. Pasa en cuanto hay un periodo sin gasto, algo normalísimo en
 * los meses anteriores a empezar a usar la app.
 *
 * Por eso una columna vacía lleva un tramo de valor cero y color
 * transparente: no se dibuja nada, pero `stacks[0]` existe.
 */
export function aColumnasApiladas(etiquetas: string[], series: SerieApilada[]): ColumnaApilada[] {
  return etiquetas.map((label, i) => {
    const tramos = series
      .map((s) => ({ value: Math.max(0, s.valores[i] ?? 0), color: s.color }))
      .filter((s) => s.value > 0);
    return { label, stacks: tramos.length ? tramos : [{ value: 0, color: 'transparent' }] };
  });
}

/** Máximo de una columna apilada, con mínimo 1 para no dividir por cero. */
export function maximoApilado(columnas: ColumnaApilada[]): number {
  return Math.max(1, ...columnas.map((c) => c.stacks.reduce((a, s) => a + s.value, 0)));
}
