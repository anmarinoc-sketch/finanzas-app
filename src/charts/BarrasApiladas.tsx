import React from 'react';
import { View } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { useTema } from '@/ui/TemaProvider';
import { Texto } from '@/ui/comp/Texto';
import { esp } from '@/ui/tema';
import { formatoCorto } from '@/core/dinero';

export type SerieApilada = { nombre: string; color: string; valores: number[] };

/** Composicion del gasto por categoria a lo largo de los periodos. */
export function BarrasApiladas({
  etiquetas, series, ancho,
}: { etiquetas: string[]; series: SerieApilada[]; ancho: number }) {
  const t = useTema();
  const anchoBarra = Math.max(16, Math.min(34, (ancho - 70) / Math.max(1, etiquetas.length) - 10));

  const stackData = etiquetas.map((etq, i) => ({
    label: etq,
    stacks: series
      .map((s) => ({ value: s.valores[i] ?? 0, color: s.color }))
      .filter((s) => s.value > 0),
  }));

  const max = Math.max(1, ...stackData.map((d) => d.stacks.reduce((a, s) => a + s.value, 0)));

  return (
    <View style={{ gap: esp.md }}>
      <BarChart
        stackData={stackData}
        barWidth={anchoBarra}
        spacing={Math.max(10, anchoBarra * 0.55)}
        initialSpacing={12}
        maxValue={max * 1.1}
        noOfSections={4}
        yAxisThickness={0}
        xAxisThickness={0}
        rulesColor={t.borde}
        rulesType="dashed"
        yAxisTextStyle={{ color: t.textoTenue, fontSize: 10 }}
        xAxisLabelTextStyle={{ color: t.textoTenue, fontSize: 10 }}
        formatYLabel={(v: string) => formatoCorto(Number(v))}
        isAnimated
        animationDuration={700}
        width={ancho - 56}
        height={190}
        barBorderTopLeftRadius={5}
        barBorderTopRightRadius={5}
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: esp.md }}>
        {series.map((s) => (
          <View key={s.nombre} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 9, height: 9, borderRadius: 3, backgroundColor: s.color }} />
            <Texto variante="micro" color="suave">{s.nombre}</Texto>
          </View>
        ))}
      </View>
    </View>
  );
}
