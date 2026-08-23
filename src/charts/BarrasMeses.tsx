import React, { useState } from 'react';
import { View } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { useTema } from '@/ui/TemaProvider';
import { Texto } from '@/ui/comp/Texto';
import { esp } from '@/ui/tema';
import { formatoCOP, formatoCorto } from '@/core/dinero';
import { hexAlpha } from '@/ui/comp/IconoCategoria';

export type BarraMes = { etiqueta: string; valor: number };

/** Barras mes a mes con linea de promedio y detalle al tocar. */
export function BarrasMeses({ datos, ancho }: { datos: BarraMes[]; ancho: number }) {
  const t = useTema();
  const [sel, setSel] = useState<number | null>(null);
  const promedio = datos.length ? datos.reduce((a, d) => a + d.valor, 0) / datos.length : 0;
  const max = Math.max(1, ...datos.map((d) => d.valor));
  const anchoBarra = Math.max(14, Math.min(30, (ancho - 60) / datos.length - 12));

  const barras = datos.map((d, i) => ({
    value: d.valor,
    label: d.etiqueta,
    frontColor: sel === i ? t.acento : hexAlpha(t.acento, t.oscuro ? 0.55 : 0.35),
    onPress: () => setSel(sel === i ? null : i),
  }));

  const activo = sel != null ? datos[sel] : null;

  return (
    <View style={{ gap: esp.md }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <View>
          <Texto variante="micro" color="tenue">{activo ? activo.etiqueta.toUpperCase() : 'PROMEDIO'}</Texto>
          <Texto variante="montoGrande" style={{ fontSize: 22 }}>
            {formatoCOP(activo ? activo.valor : promedio)}
          </Texto>
        </View>
        {activo && promedio > 0 ? (
          <Texto variante="etiqueta" color={activo.valor > promedio ? 'rojo' : 'verde'}>
            {activo.valor > promedio ? '+' : ''}
            {formatoCOP(Math.round(activo.valor - promedio))} vs promedio
          </Texto>
        ) : null}
      </View>

      <BarChart
        data={barras}
        barWidth={anchoBarra}
        spacing={Math.max(8, anchoBarra * 0.6)}
        initialSpacing={12}
        endSpacing={4}
        roundedTop
        barBorderRadius={6}
        hideRules={false}
        rulesColor={t.borde}
        rulesType="dashed"
        yAxisThickness={0}
        xAxisThickness={0}
        noOfSections={4}
        maxValue={max * 1.15}
        yAxisTextStyle={{ color: t.textoTenue, fontSize: 10 }}
        xAxisLabelTextStyle={{ color: t.textoTenue, fontSize: 10 }}
        formatYLabel={(v: string) => formatoCorto(Number(v))}
        showReferenceLine1
        referenceLine1Position={promedio}
        referenceLine1Config={{ color: t.ambar, dashWidth: 6, dashGap: 4, thickness: 1.5 }}
        isAnimated
        animationDuration={700}
        width={ancho - 56}
        height={170}
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View style={{ width: 14, height: 2, backgroundColor: t.ambar }} />
        <Texto variante="micro" color="tenue">Promedio del periodo mostrado</Texto>
      </View>
    </View>
  );
}
