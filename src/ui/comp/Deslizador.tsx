import React, { useRef, useState } from 'react';
import { LayoutChangeEvent, PanResponder, View } from 'react-native';
import { useTema } from '../TemaProvider';
import { radio } from '../tema';

/**
 * Slider propio con PanResponder: no agrega dependencias nativas y funciona
 * igual en Android 8 que en Android 14. El valor se emite en vivo mientras
 * se arrastra, que es lo que necesita la pantalla de distribucion.
 */
export function Deslizador({
  valor, min = 0, max = 100, paso = 1, color, onChange, onSoltar,
}: {
  valor: number; min?: number; max?: number; paso?: number;
  color?: string; onChange: (v: number) => void; onSoltar?: (v: number) => void;
}) {
  const t = useTema();
  const [ancho, setAncho] = useState(0);
  const anchoRef = useRef(0);
  const valorRef = useRef(valor);
  const inicioRef = useRef(0);
  valorRef.current = valor;

  const c = color ?? t.acento;
  const frac = max > min ? (valor - min) / (max - min) : 0;

  const desdeX = (x: number) => {
    const w = anchoRef.current || 1;
    const f = Math.max(0, Math.min(1, x / w));
    const bruto = min + f * (max - min);
    return Math.round(bruto / paso) * paso;
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      // Solo tomamos el gesto si es horizontal: asi el ScrollView sigue funcionando.
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderGrant: (e) => {
        // Al tocar, el pulgar salta al punto tocado; luego se mueve con el desplazamiento
        // acumulado (locationX no es fiable durante el arrastre en Android).
        inicioRef.current = e.nativeEvent.locationX;
        onChange(desdeX(inicioRef.current));
      },
      onPanResponderMove: (_e, gesto) => onChange(desdeX(inicioRef.current + gesto.dx)),
      onPanResponderRelease: () => onSoltar?.(valorRef.current),
    }),
  ).current;

  const alLayout = (e: LayoutChangeEvent) => {
    anchoRef.current = e.nativeEvent.layout.width;
    setAncho(e.nativeEvent.layout.width);
  };

  return (
    <View
      onLayout={alLayout}
      {...pan.panHandlers}
      accessibilityRole="adjustable"
      accessibilityValue={{ min, max, now: valor }}
      style={{ height: 40, justifyContent: 'center' }}
    >
      <View style={{ height: 8, borderRadius: radio.full, backgroundColor: t.superficie2, overflow: 'hidden' }}>
        <View style={{ width: `${frac * 100}%`, height: 8, backgroundColor: c }} />
      </View>
      <View
        style={{
          position: 'absolute',
          left: Math.max(0, Math.min(ancho - 24, frac * ancho - 12)),
          width: 24, height: 24, borderRadius: 12,
          backgroundColor: '#FFF', borderWidth: 3, borderColor: c,
          elevation: 3, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4,
        }}
      />
    </View>
  );
}
