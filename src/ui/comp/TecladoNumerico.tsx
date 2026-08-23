import React from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTema } from '../TemaProvider';
import { esp, radio } from '../tema';
import { Texto } from './Texto';

const TECLAS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0', 'del'];

/**
 * Teclado propio en vez del teclado del sistema: teclas grandes, sin
 * autocorrector y con "000" (en COP casi todos los montos terminan en miles).
 * Es lo que permite registrar un gasto en menos de 5 segundos.
 */
export function TecladoNumerico({
  onTecla, onBorrar, onLimpiar,
}: { onTecla: (d: string) => void; onBorrar: () => void; onLimpiar?: () => void }) {
  const t = useTema();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: esp.sm }}>
      {TECLAS.map((k) => (
        <Pressable
          key={k}
          accessibilityRole="button"
          accessibilityLabel={k === 'del' ? 'Borrar' : k}
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            if (k === 'del') onBorrar();
            else onTecla(k);
          }}
          onLongPress={() => { if (k === 'del') onLimpiar?.(); }}
          style={({ pressed }) => ({
            width: '31.5%', height: 58, borderRadius: radio.md,
            backgroundColor: pressed ? t.superficie2 : 'transparent',
            alignItems: 'center', justifyContent: 'center',
          })}
        >
          {k === 'del'
            ? <Ionicons name="backspace-outline" size={26} color={t.textoSuave} />
            : <Texto style={{ fontSize: 26, fontWeight: '600' }}>{k}</Texto>}
        </Pressable>
      ))}
    </View>
  );
}
