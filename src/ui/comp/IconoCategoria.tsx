import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/** Circulo de color de la categoria con su icono. Mismo lenguaje en toda la app. */
export function IconoCategoria({
  icono, color, tam = 40, opacidadFondo = 0.16,
}: { icono?: string | null; color?: string | null; tam?: number; opacidadFondo?: number }) {
  const c = color || '#94A3B8';
  return (
    <View style={{
      width: tam, height: tam, borderRadius: tam / 2,
      backgroundColor: hexAlpha(c, opacidadFondo),
      alignItems: 'center', justifyContent: 'center',
    }}>
      <Ionicons name={(icono as any) || 'apps-outline'} size={tam * 0.5} color={c} />
    </View>
  );
}

/** Convierte #RRGGBB + alfa a rgba() (React Native no acepta #RRGGBBAA en Android antiguo). */
export function hexAlpha(hex: string, alfa: number): string {
  const h = hex.replace('#', '');
  const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return `rgba(148,163,184,${alfa})`;
  return `rgba(${r},${g},${b},${alfa})`;
}
