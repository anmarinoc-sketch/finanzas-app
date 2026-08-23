import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useTema } from '@/ui/TemaProvider';
import { Texto } from '@/ui/comp/Texto';
import { esp } from '@/ui/tema';
import { formatoCOP } from '@/core/dinero';

export type AnilloMeta = {
  id: number; nombre: string; color: string; icono?: string | null;
  progreso: number; montoActual: number; montoObjetivo: number;
};

/** Anillo de progreso individual. */
export function Anillo({
  progreso, color, tam = 84, grosor = 8, children,
}: { progreso: number; color: string; tam?: number; grosor?: number; children?: React.ReactNode }) {
  const t = useTema();
  const r = (tam - grosor) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, progreso));
  return (
    <View style={{ width: tam, height: tam, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={tam} height={tam} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={tam / 2} cy={tam / 2} r={r} stroke={t.superficie2} strokeWidth={grosor} fill="none" />
        <Circle
          cx={tam / 2} cy={tam / 2} r={r} stroke={color} strokeWidth={grosor} fill="none"
          strokeDasharray={`${c * p} ${c}`} strokeLinecap="round"
        />
      </Svg>
      {children}
    </View>
  );
}

/** Fila horizontal de anillos, una por meta. */
export function AnillosMetas({ metas, onPress }: { metas: AnilloMeta[]; onPress?: (id: number) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: esp.lg }}>
      {metas.map((m) => (
        <Pressable
          key={m.id}
          onPress={() => onPress?.(m.id)}
          accessibilityRole="button"
          accessibilityLabel={`${m.nombre}: ${Math.round(m.progreso * 100)} por ciento`}
          style={{ alignItems: 'center', width: 104, gap: 6 }}
        >
          <Anillo progreso={m.progreso} color={m.color}>
            <Ionicons name={(m.icono as any) || 'flag-outline'} size={24} color={m.color} />
          </Anillo>
          <Texto variante="etiqueta" numberOfLines={1} style={{ textAlign: 'center' }}>{m.nombre}</Texto>
          <Texto variante="micro" color="tenue">{Math.round(m.progreso * 100)}% · {formatoCOP(m.montoActual)}</Texto>
        </Pressable>
      ))}
      <View style={{ width: esp.sm }} />
      {metas.length === 0 ? <Texto variante="cuerpo" color="tenue">Sin metas todavía.</Texto> : null}
    </ScrollView>
  );
}
