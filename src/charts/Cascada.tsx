import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { G, Line, Rect, Text as SvgText } from 'react-native-svg';
import { useTema } from '@/ui/TemaProvider';
import { Texto } from '@/ui/comp/Texto';
import { esp } from '@/ui/tema';
import { formatoCOP, formatoCorto } from '@/core/dinero';

export type PasoCascada = {
  etiqueta: string;
  /** Positivo suma, negativo resta. En los pasos `total` se ignora. */
  delta: number;
  color: string;
  /** true = barra que arranca desde 0 (ingreso inicial y sobrante final). */
  total?: boolean;
};

/**
 * Cascada Ingreso -> fijos -> variables -> ahorro -> sobrante.
 * gifted-charts no trae waterfall, asi que se dibuja con react-native-svg:
 * cada barra arranca donde termino la anterior.
 */
export function Cascada({ pasos, ancho, alto = 230 }: { pasos: PasoCascada[]; ancho: number; alto?: number }) {
  const t = useTema();
  const [sel, setSel] = useState<number | null>(null);

  const margenIzq = 0;
  const margenInf = 46;
  const margenSup = 14;
  const w = Math.max(200, ancho);
  const areaAlto = alto - margenInf - margenSup;

  // Cada barra arranca donde termino la anterior; las marcadas como `total`
  // arrancan desde cero y fijan el acumulado.
  let acumulado = 0;
  const barras = pasos.map((p) => {
    if (p.total) {
      const fin = p.delta !== 0 ? p.delta : acumulado;
      acumulado = fin;
      return { ...p, inicio: 0, fin };
    }
    const inicio = acumulado;
    acumulado = inicio + p.delta;
    return { ...p, inicio, fin: acumulado };
  });

  const valores = barras.flatMap((b) => [b.inicio, b.fin, 0]);
  const maxV = Math.max(...valores);
  const minV = Math.min(...valores);
  const span = Math.max(1, maxV - minV);
  const y = (v: number) => margenSup + ((maxV - v) / span) * areaAlto;

  const paso = w / barras.length;
  const anchoBarra = Math.min(46, paso * 0.6);

  return (
    <View style={{ gap: esp.md }}>
      <View style={{ height: alto }}>
      <Svg width={w} height={alto}>
        {/* Linea del cero */}
        <Line x1={0} y1={y(0)} x2={w} y2={y(0)} stroke={t.borde} strokeWidth={1} />
        {barras.map((b, i) => {
          const cx = margenIzq + paso * i + paso / 2;
          const y1 = y(Math.max(b.inicio, b.fin));
          const y2 = y(Math.min(b.inicio, b.fin));
          const h = Math.max(3, y2 - y1);
          const activo = sel === i;
          return (
            <G key={b.etiqueta + i}>
              {i > 0 && !barras[i].total ? (
                <Line
                  x1={margenIzq + paso * (i - 1) + paso / 2 + anchoBarra / 2}
                  y1={y(b.inicio)}
                  x2={cx - anchoBarra / 2}
                  y2={y(b.inicio)}
                  stroke={t.textoTenue}
                  strokeWidth={1}
                  strokeDasharray="3,3"
                />
              ) : null}
              <Rect
                x={cx - anchoBarra / 2}
                y={y1}
                width={anchoBarra}
                height={h}
                rx={6}
                fill={b.color}
                opacity={sel == null || activo ? 1 : 0.4}
              />
              <SvgText
                x={cx} y={alto - margenInf + 16} fontSize={10} fill={t.textoTenue}
                textAnchor="middle"
              >
                {b.etiqueta}
              </SvgText>
              <SvgText
                x={cx} y={alto - margenInf + 30} fontSize={10} fontWeight="700"
                fill={b.delta < 0 && !b.total ? t.rojo : t.texto} textAnchor="middle"
              >
                {formatoCorto(b.total ? b.fin : b.delta)}
              </SvgText>
            </G>
          );
        })}
      </Svg>

      {/* Zonas tactiles superpuestas: en Android el onPress por nodo SVG es poco fiable. */}
      <View style={{ position: 'absolute', left: 0, top: 0, right: 0, height: alto, flexDirection: 'row' }}>
        {barras.map((b, i) => (
          <Pressable
            key={`toque-${i}`}
            style={{ flex: 1 }}
            accessibilityRole="button"
            accessibilityLabel={`${b.etiqueta}: ${formatoCOP(b.total ? b.fin : b.delta)}`}
            onPress={() => setSel(sel === i ? null : i)}
          />
        ))}
      </View>
      </View>

      {sel != null ? (
        <View style={{ backgroundColor: t.superficie2, borderRadius: 12, padding: esp.md }}>
          <Texto variante="etiqueta">{barras[sel].etiqueta}</Texto>
          <Texto variante="monto" color={barras[sel].delta < 0 && !barras[sel].total ? 'rojo' : 'texto'}>
            {formatoCOP(barras[sel].total ? barras[sel].fin : barras[sel].delta, { signo: !barras[sel].total })}
          </Texto>
        </View>
      ) : (
        <Texto variante="micro" color="tenue">Toca una barra para ver el detalle.</Texto>
      )}
    </View>
  );
}
