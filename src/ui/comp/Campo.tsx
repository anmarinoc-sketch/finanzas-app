import React from 'react';
import { Pressable, TextInput, TextInputProps, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTema } from '../TemaProvider';
import { esp, radio, TOQUE_MIN } from '../tema';
import { Texto } from './Texto';

export function Campo({
  etiqueta, error, style, ...props
}: TextInputProps & { etiqueta?: string; error?: string | null }) {
  const t = useTema();
  return (
    <View style={{ gap: 6 }}>
      {etiqueta ? <Texto variante="etiqueta" color="suave">{etiqueta}</Texto> : null}
      <TextInput
        placeholderTextColor={t.textoTenue}
        {...props}
        style={[{
          minHeight: TOQUE_MIN,
          backgroundColor: t.superficie2,
          borderRadius: radio.md,
          paddingHorizontal: esp.md,
          paddingVertical: esp.md,
          color: t.texto,
          fontSize: 16,
          borderWidth: 1,
          borderColor: error ? t.rojo : t.borde,
        }, style]}
      />
      {error ? <Texto variante="micro" color="rojo">{error}</Texto> : null}
    </View>
  );
}

/** Campo que abre un selector en vez de teclado. */
export function CampoSelector({
  etiqueta, valor, placeholder, onPress, icono = 'chevron-down', color,
}: {
  etiqueta?: string; valor?: string | null; placeholder?: string;
  onPress: () => void; icono?: keyof typeof Ionicons.glyphMap; color?: string;
}) {
  const t = useTema();
  return (
    <View style={{ gap: 6 }}>
      {etiqueta ? <Texto variante="etiqueta" color="suave">{etiqueta}</Texto> : null}
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => ({
          minHeight: TOQUE_MIN,
          backgroundColor: t.superficie2,
          borderRadius: radio.md,
          paddingHorizontal: esp.md,
          flexDirection: 'row', alignItems: 'center', gap: esp.sm,
          borderWidth: 1, borderColor: t.borde,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        {color ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} /> : null}
        <Texto style={{ flex: 1, color: valor ? t.texto : t.textoTenue, fontSize: 16 }} numberOfLines={1}>
          {valor || placeholder || 'Seleccionar'}
        </Texto>
        <Ionicons name={icono} size={18} color={t.textoTenue} />
      </Pressable>
    </View>
  );
}

/** Interruptor simple, accesible y sin dependencias extra. */
export function Interruptor({ valor, onChange }: { valor: boolean; onChange: (v: boolean) => void }) {
  const t = useTema();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: valor }}
      onPress={() => onChange(!valor)}
      style={{
        width: 50, height: 30, borderRadius: 15, padding: 3,
        backgroundColor: valor ? t.acento : t.superficie2,
        borderWidth: 1, borderColor: valor ? t.acento : t.borde,
        justifyContent: 'center',
      }}
    >
      <View style={{
        width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFF',
        alignSelf: valor ? 'flex-end' : 'flex-start',
      }} />
    </Pressable>
  );
}
