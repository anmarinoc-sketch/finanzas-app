import React, { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTema } from '../TemaProvider';
import { esp, radio, NUM_TABULAR, TOQUE_MIN } from '../tema';

/**
 * Entrada de porcentaje con botones de menos y mas, y escritura directa.
 *
 * Sustituye al slider: con el dedo era imposible clavar un valor exacto, y en
 * una distribucion que debe sumar 100% eso importa. Manteniendo pulsado el
 * boton avanza de cinco en cinco.
 */
export function PasoPorcentaje({
  valor, onChange, color, min = 0, max = 100,
}: {
  valor: number; onChange: (v: number) => void;
  color?: string; min?: number; max?: number;
}) {
  const t = useTema();
  const acento = color ?? t.acento;
  const [editando, setEditando] = useState<string | null>(null);

  const fijar = (v: number) => {
    Haptics.selectionAsync().catch(() => {});
    onChange(Math.max(min, Math.min(max, Math.round(v))));
  };

  const boton = (icono: 'remove' | 'add', paso: number, etiqueta: string) => {
    const inactivo = paso < 0 ? valor <= min : valor >= max;
    return (
      <Pressable
        onPress={() => fijar(valor + paso)}
        onLongPress={() => fijar(valor + paso * 5)}
        delayLongPress={350}
        disabled={inactivo}
        accessibilityRole="button"
        accessibilityLabel={etiqueta}
        style={({ pressed }) => ({
          width: TOQUE_MIN, height: TOQUE_MIN, borderRadius: radio.md,
          backgroundColor: pressed ? acento : t.superficie2,
          borderWidth: 1, borderColor: t.borde,
          alignItems: 'center', justifyContent: 'center',
          opacity: inactivo ? 0.35 : 1,
        })}
      >
        <Ionicons name={icono} size={22} color={t.texto} />
      </Pressable>
    );
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: esp.sm }}>
      {boton('remove', -1, 'Disminuir un punto')}

      <View style={{
        flex: 1, height: TOQUE_MIN, borderRadius: radio.md,
        backgroundColor: t.superficie2, borderWidth: 1, borderColor: t.borde,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      }}>
        <TextInput
          value={editando ?? String(Math.round(valor))}
          onChangeText={(v) => setEditando(v.replace(/[^\d]/g, '').slice(0, 3))}
          onFocus={() => setEditando(String(Math.round(valor)))}
          onBlur={() => { fijar(Number(editando ?? valor) || 0); setEditando(null); }}
          keyboardType="number-pad"
          selectTextOnFocus
          accessibilityLabel="Porcentaje, se puede escribir directamente"
          style={{
            color: t.texto, fontSize: 18, fontWeight: '700',
            textAlign: 'right', minWidth: 44, paddingVertical: 0, ...NUM_TABULAR,
          }}
        />
        <Text style={{ color: t.textoSuave, fontSize: 18, fontWeight: '700', paddingLeft: 1 }}>%</Text>
      </View>

      {boton('add', 1, 'Aumentar un punto')}
    </View>
  );
}
