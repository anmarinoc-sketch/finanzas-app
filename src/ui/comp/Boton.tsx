import React from 'react';
import { ActivityIndicator, Pressable, StyleProp, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTema } from '../TemaProvider';
import { esp, radio, TOQUE_MIN } from '../tema';
import { Texto } from './Texto';

type Variante = 'primario' | 'secundario' | 'fantasma' | 'peligro';

export function Boton({
  titulo, onPress, variante = 'primario', icono, deshabilitado, cargando,
  ancho, style, haptico = true,
}: {
  titulo: string;
  onPress?: () => void;
  variante?: Variante;
  icono?: keyof typeof Ionicons.glyphMap;
  deshabilitado?: boolean;
  cargando?: boolean;
  ancho?: boolean;
  style?: StyleProp<ViewStyle>;
  haptico?: boolean;
}) {
  const t = useTema();
  const fondos: Record<Variante, string> = {
    primario: t.acento,
    secundario: t.superficie2,
    fantasma: 'transparent',
    peligro: t.rojoFondo,
  };
  const colores: Record<Variante, string> = {
    primario: '#FFFFFF',
    secundario: t.texto,
    fantasma: t.acento,
    peligro: t.rojo,
  };
  const inactivo = deshabilitado || cargando;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={titulo}
      accessibilityState={{ disabled: !!inactivo }}
      disabled={inactivo}
      onPress={() => {
        if (haptico) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress?.();
      }}
      style={({ pressed }) => [
        {
          minHeight: TOQUE_MIN,
          paddingHorizontal: esp.lg,
          paddingVertical: esp.md,
          borderRadius: radio.md,
          backgroundColor: fondos[variante],
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: esp.sm,
          opacity: inactivo ? 0.45 : pressed ? 0.8 : 1,
          alignSelf: ancho ? 'stretch' : 'flex-start',
          borderWidth: variante === 'fantasma' ? 1 : 0,
          borderColor: t.borde,
        },
        style,
      ]}
    >
      {cargando ? (
        <ActivityIndicator color={colores[variante]} />
      ) : (
        <>
          {icono ? <Ionicons name={icono} size={18} color={colores[variante]} /> : null}
          <Texto variante="etiqueta" style={{ color: colores[variante], fontSize: 15 }}>{titulo}</Texto>
        </>
      )}
    </Pressable>
  );
}

/** Boton flotante (+) presente en las pantallas principales. */
export function BotonFlotante({ onPress, icono = 'add' }: { onPress: () => void; icono?: keyof typeof Ionicons.glyphMap }) {
  const t = useTema();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Registrar movimiento"
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        onPress();
      }}
      style={({ pressed }) => [{
        position: 'absolute', right: esp.lg, bottom: esp.lg + 8,
        width: 60, height: 60, borderRadius: 30,
        backgroundColor: t.acento, alignItems: 'center', justifyContent: 'center',
        transform: [{ scale: pressed ? 0.94 : 1 }],
        shadowColor: t.acento, shadowOpacity: 0.45, shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 }, elevation: 8,
      }]}
    >
      <View><Ionicons name={icono} size={30} color="#FFFFFF" /></View>
    </Pressable>
  );
}
