import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import { useTema } from '../TemaProvider';
import { radio } from '../tema';

/** Barra de consumo con animacion de entrada. `valor` es 0..1 (puede exceder 1). */
export function BarraProgreso({
  valor, color, alto = 8, fondo, animar = true,
}: { valor: number; color: string; alto?: number; fondo?: string; animar?: boolean }) {
  const t = useTema();
  const p = useSharedValue(animar ? 0 : Math.min(1, Math.max(0, valor)));

  useEffect(() => {
    p.value = withTiming(Math.min(1, Math.max(0, valor)), {
      duration: 750, easing: Easing.out(Easing.cubic),
    });
  }, [valor, p]);

  const estilo = useAnimatedStyle(() => ({ width: `${p.value * 100}%` }));

  return (
    <View style={{ height: alto, borderRadius: radio.full, backgroundColor: fondo ?? t.superficie2, overflow: 'hidden' }}>
      <Animated.View style={[{ height: alto, borderRadius: radio.full, backgroundColor: color }, estilo]} />
    </View>
  );
}

/** Barra segmentada: se usa para la distribucion por bolsillos del onboarding. */
export function BarraSegmentada({
  segmentos, alto = 14,
}: { segmentos: { valor: number; color: string }[]; alto?: number }) {
  const t = useTema();
  const total = segmentos.reduce((a, s) => a + s.valor, 0);
  return (
    <View style={{ flexDirection: 'row', height: alto, borderRadius: radio.full, overflow: 'hidden', backgroundColor: t.superficie2 }}>
      {segmentos.map((s, i) => (
        <View key={i} style={{ flex: Math.max(0.0001, s.valor), backgroundColor: s.color }} />
      ))}
      {total < 100 ? <View style={{ flex: Math.max(0.0001, 100 - total) }} /> : null}
    </View>
  );
}
