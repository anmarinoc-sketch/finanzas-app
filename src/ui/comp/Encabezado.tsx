import React from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTema } from '../TemaProvider';
import { esp } from '../tema';
import { Texto } from './Texto';

/** Encabezado de las pantallas apiladas (fuera de las tabs). */
export function Encabezado({
  titulo, subtitulo, accion, onAccion, iconoAccion = 'ellipsis-horizontal',
}: {
  titulo: string; subtitulo?: string;
  accion?: string; onAccion?: () => void;
  iconoAccion?: keyof typeof Ionicons.glyphMap;
}) {
  const t = useTema();
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: esp.md,
      paddingHorizontal: esp.lg, paddingVertical: esp.md,
    }}>
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        hitSlop={12} accessibilityRole="button" accessibilityLabel="Volver"
        style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: t.superficie2, alignItems: 'center', justifyContent: 'center' }}
      >
        <Ionicons name="chevron-back" size={22} color={t.texto} />
      </Pressable>
      <View style={{ flex: 1 }}>
        <Texto variante="titulo" numberOfLines={1}>{titulo}</Texto>
        {subtitulo ? <Texto variante="etiqueta" color="tenue">{subtitulo}</Texto> : null}
      </View>
      {onAccion ? (
        <Pressable
          onPress={onAccion} hitSlop={12} accessibilityRole="button" accessibilityLabel={accion ?? 'Opciones'}
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: t.superficie2, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name={iconoAccion} size={20} color={t.texto} />
        </Pressable>
      ) : null}
    </View>
  );
}
