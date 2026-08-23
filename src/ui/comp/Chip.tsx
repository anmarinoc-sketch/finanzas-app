import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTema } from '../TemaProvider';
import { esp, radio } from '../tema';
import { Texto } from './Texto';

export function Chip({
  texto, activo, onPress, color, icono, compacto,
}: {
  texto: string; activo?: boolean; onPress?: () => void;
  color?: string; icono?: keyof typeof Ionicons.glyphMap; compacto?: boolean;
}) {
  const t = useTema();
  const c = color ?? t.acento;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!activo }}
      onPress={onPress}
      style={({ pressed }) => ({
        paddingHorizontal: compacto ? esp.md : esp.lg,
        paddingVertical: compacto ? 6 : 10,
        borderRadius: radio.full,
        backgroundColor: activo ? c : t.superficie2,
        borderWidth: 1,
        borderColor: activo ? c : t.borde,
        flexDirection: 'row', alignItems: 'center', gap: 6,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      {icono ? <Ionicons name={icono} size={14} color={activo ? '#FFF' : t.textoSuave} /> : null}
      <Texto variante="etiqueta" style={{ color: activo ? '#FFF' : t.textoSuave }}>{texto}</Texto>
    </Pressable>
  );
}

/** Fila horizontal de chips con scroll. */
export function FilaChips({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: esp.sm, paddingHorizontal: esp.lg }}
    >
      {children}
      <View style={{ width: esp.sm }} />
    </ScrollView>
  );
}
