import React from 'react';
import { View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { useTema } from '@/ui/TemaProvider';
import { Texto } from '@/ui/comp/Texto';
import { esp } from '@/ui/tema';
import { formatoCOP, formatoCorto } from '@/core/dinero';

/**
 * Gasto acumulado del ciclo actual superpuesto al del ciclo anterior.
 * Es la lectura mas util del dashboard: dice si vas mejor o peor que la
 * ultima vez, no solo cuanto llevas.
 */
export function LineaTendencia({
  actual, anterior, ancho, etiquetaActual = 'Este periodo', etiquetaAnterior = 'Periodo anterior',
}: {
  actual: number[]; anterior: number[]; ancho: number;
  etiquetaActual?: string; etiquetaAnterior?: string;
}) {
  const t = useTema();
  const finActual = actual.length ? actual[actual.length - 1] : 0;
  const mismoDia = anterior[Math.min(anterior.length - 1, Math.max(0, actual.length - 1))] ?? 0;
  const dif = finActual - mismoDia;
  const max = Math.max(1, ...actual, ...anterior);

  return (
    <View style={{ gap: esp.md }}>
      <View style={{ flexDirection: 'row', gap: esp.lg }}>
        <Leyenda color={t.acento} texto={etiquetaActual} monto={formatoCOP(finActual)} />
        <Leyenda color={t.textoTenue} texto={etiquetaAnterior} monto={formatoCOP(mismoDia)} />
      </View>

      {mismoDia > 0 ? (
        <Texto variante="etiqueta" color={dif > 0 ? 'rojo' : 'verde'}>
          {dif > 0 ? 'Vas ' : 'Vas '}
          {formatoCOP(Math.abs(dif))} {dif > 0 ? 'por encima' : 'por debajo'} del mismo día del periodo anterior.
        </Texto>
      ) : null}

      <LineChart
        data={actual.map((v) => ({ value: v }))}
        data2={anterior.map((v) => ({ value: v }))}
        color1={t.acento}
        color2={t.textoTenue}
        thickness1={3}
        thickness2={2}
        areaChart
        startFillColor1={t.acento}
        endFillColor1={t.acento}
        startOpacity={0.28}
        endOpacity={0.02}
        hideDataPoints
        curved
        maxValue={max * 1.1}
        noOfSections={4}
        yAxisThickness={0}
        xAxisThickness={0}
        rulesColor={t.borde}
        rulesType="dashed"
        yAxisTextStyle={{ color: t.textoTenue, fontSize: 10 }}
        formatYLabel={(v: string) => formatoCorto(Number(v))}
        isAnimated
        animationDuration={800}
        width={ancho - 76}
        height={160}
        initialSpacing={0}
        adjustToWidth
      />
    </View>
  );
}

function Leyenda({ color, texto, monto }: { color: string; texto: string; monto: string }) {
  return (
    <View style={{ gap: 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
        <Texto variante="micro" color="tenue">{texto.toUpperCase()}</Texto>
      </View>
      <Texto variante="monto">{monto}</Texto>
    </View>
  );
}
