import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { format, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { useTema } from '@/ui/TemaProvider';
import { Texto } from '@/ui/comp/Texto';
import { esp } from '@/ui/tema';
import { formatoCOP } from '@/core/dinero';
import { hexAlpha } from '@/ui/comp/IconoCategoria';

export type DiaCalor = { fecha: Date; total: number };

const DIAS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

/**
 * Mapa de calor tipo calendario. La intensidad es relativa al dia de mayor
 * gasto del periodo, con 5 niveles: sirve para ver quincenas y fines de semana.
 * Se dibuja con Views (no SVG) para que cada celda sea tactil y accesible.
 */
export function MapaCalor({ dias, ancho }: { dias: DiaCalor[]; ancho: number }) {
  const t = useTema();
  const [sel, setSel] = useState<DiaCalor | null>(null);
  const max = Math.max(1, ...dias.map((d) => d.total));
  const celda = Math.floor((ancho - 6 * 6) / 7);

  // Alineamos la primera semana: getDay() da 0 para domingo, aqui la semana empieza en lunes.
  const offset = (getDay(dias[0]?.fecha ?? new Date()) + 6) % 7;
  const huecos = Array.from({ length: offset }, (_, i) => i);

  const nivel = (v: number) => {
    if (v <= 0) return 0;
    const f = v / max;
    if (f < 0.2) return 1;
    if (f < 0.45) return 2;
    if (f < 0.7) return 3;
    return 4;
  };
  const colores = [
    t.superficie2,
    hexAlpha(t.acento, 0.22),
    hexAlpha(t.acento, 0.42),
    hexAlpha(t.acento, 0.66),
    t.acento,
  ];

  return (
    <View style={{ gap: esp.md }}>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {DIAS.map((d, i) => (
          <Texto key={i} variante="micro" color="tenue" style={{ width: celda, textAlign: 'center' }}>{d}</Texto>
        ))}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {huecos.map((h) => <View key={`h${h}`} style={{ width: celda, height: celda }} />)}
        {dias.map((d) => {
          const n = nivel(d.total);
          const activo = sel?.fecha.getTime() === d.fecha.getTime();
          return (
            <Pressable
              key={d.fecha.toISOString()}
              onPress={() => setSel(activo ? null : d)}
              accessibilityRole="button"
              accessibilityLabel={`${format(d.fecha, "d 'de' MMMM", { locale: es })}: ${formatoCOP(d.total)}`}
              style={{
                width: celda, height: celda, borderRadius: 7,
                backgroundColor: colores[n],
                borderWidth: activo ? 2 : 0, borderColor: t.texto,
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Texto variante="micro" style={{ fontSize: 9, color: n >= 3 ? '#FFF' : t.textoTenue }}>
                {format(d.fecha, 'd')}
              </Texto>
            </Pressable>
          );
        })}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Texto variante="micro" color="tenue">Menos</Texto>
        {colores.map((c, i) => (
          <View key={i} style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: c }} />
        ))}
        <Texto variante="micro" color="tenue">Más</Texto>
        <View style={{ flex: 1 }} />
        {sel ? (
          <Texto variante="micro">
            {format(sel.fecha, "d MMM", { locale: es })} · {formatoCOP(sel.total)}
          </Texto>
        ) : null}
      </View>
    </View>
  );
}
