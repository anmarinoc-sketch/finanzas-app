import React from 'react';
import { View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { useTema } from '@/ui/TemaProvider';
import { Texto } from '@/ui/comp/Texto';
import { esp } from '@/ui/tema';
import { formatoCOP, formatoCorto } from '@/core/dinero';

/**
 * Acumulado real hasta hoy + proyeccion lineal hasta el cierre del ciclo.
 * La parte proyectada va punteada para no confundirla con datos reales.
 */
export function Proyeccion({
  acumulado, diasTotales, presupuesto, ancho,
}: { acumulado: number[]; diasTotales: number; presupuesto?: number; ancho: number }) {
  const t = useTema();
  const dias = acumulado.length;
  const hoyVal = dias ? acumulado[dias - 1] : 0;
  const ritmo = dias > 0 ? hoyVal / dias : 0;
  const cierre = Math.round(ritmo * diasTotales);

  // Linea punteada de ritmo constante: pasa por el punto de hoy y llega al cierre.
  // No se usa null en la serie porque gifted-charts calcula la escala sobre
  // todos los puntos y un null la contamina.
  const serieProyectada = Array.from({ length: diasTotales }, (_, i) => ({
    value: Math.round(ritmo * (i + 1)),
  }));

  const max = Math.max(1, cierre, presupuesto ?? 0);
  const excede = presupuesto ? cierre > presupuesto : false;

  return (
    <View style={{ gap: esp.md }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <View>
          <Texto variante="micro" color="tenue">HOY</Texto>
          <Texto variante="monto">{formatoCOP(hoyVal)}</Texto>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Texto variante="micro" color="tenue">CIERRE PROYECTADO</Texto>
          <Texto variante="monto" color={excede ? 'rojo' : 'texto'}>{formatoCOP(cierre)}</Texto>
        </View>
      </View>

      <LineChart
        data={acumulado.map((v) => ({ value: v }))}
        data2={serieProyectada}
        color1={t.acento}
        color2={excede ? t.rojo : t.textoTenue}
        thickness1={3}
        thickness2={2}
        strokeDashArray2={[6, 5]}
        hideDataPoints
        curved={false}
        maxValue={max * 1.12}
        noOfSections={4}
        yAxisThickness={0}
        xAxisThickness={0}
        rulesColor={t.borde}
        rulesType="dashed"
        yAxisTextStyle={{ color: t.textoTenue, fontSize: 10 }}
        formatYLabel={(v: string) => formatoCorto(Number(v))}
        showReferenceLine1={!!presupuesto}
        referenceLine1Position={presupuesto ?? 0}
        referenceLine1Config={{ color: t.ambar, dashWidth: 6, dashGap: 4, thickness: 1.5 }}
        isAnimated
        animationDuration={800}
        width={ancho - 76}
        height={150}
        initialSpacing={0}
        adjustToWidth
      />

      {presupuesto ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 14, height: 2, backgroundColor: t.ambar }} />
          <Texto variante="micro" color="tenue">
            Presupuesto total del ciclo: {formatoCOP(presupuesto)}
          </Texto>
        </View>
      ) : null}
    </View>
  );
}
