import React from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTema } from '../TemaProvider';
import { esp, radio } from '../tema';
import { Texto } from './Texto';

/** Navegador de ciclo: flecha atras / etiqueta / flecha adelante. */
export function SelectorPeriodo({
  etiqueta, onAnterior, onSiguiente, siguienteActivo = true, onPress,
}: {
  etiqueta: string; onAnterior: () => void; onSiguiente: () => void;
  siguienteActivo?: boolean; onPress?: () => void;
}) {
  const t = useTema();
  const Flecha = ({ dir, onP, activo }: { dir: 'back' | 'forward'; onP: () => void; activo: boolean }) => (
    <Pressable
      onPress={onP} disabled={!activo} hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={dir === 'back' ? 'Periodo anterior' : 'Periodo siguiente'}
      style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', opacity: activo ? 1 : 0.3 }}
    >
      <Ionicons name={dir === 'back' ? 'chevron-back' : 'chevron-forward'} size={20} color={t.texto} />
    </Pressable>
  );
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: t.superficie2, borderRadius: radio.full, padding: 4,
    }}>
      <Flecha dir="back" onP={onAnterior} activo />
      <Pressable onPress={onPress} style={{ flex: 1, alignItems: 'center' }} accessibilityRole="button">
        <Texto variante="etiqueta" style={{ fontSize: 14 }}>{etiqueta}</Texto>
      </Pressable>
      <Flecha dir="forward" onP={onSiguiente} activo={siguienteActivo} />
    </View>
  );
}

/** Control segmentado generico. */
export function Segmentado<T extends string | number>({
  opciones, valor, onChange,
}: { opciones: { valor: T; texto: string }[]; valor: T; onChange: (v: T) => void }) {
  const t = useTema();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: t.superficie2, borderRadius: radio.md, padding: 3 }}>
      {opciones.map((o) => {
        const activo = o.valor === valor;
        return (
          <Pressable
            key={String(o.valor)}
            onPress={() => onChange(o.valor)}
            accessibilityRole="button"
            accessibilityState={{ selected: activo }}
            style={{
              flex: 1, paddingVertical: 9, borderRadius: radio.sm, alignItems: 'center',
              backgroundColor: activo ? t.superficie : 'transparent',
              ...(activo ? t.sombra : {}),
            }}
          >
            <Texto variante="etiqueta" color={activo ? 'texto' : 'tenue'} numberOfLines={1}>{o.texto}</Texto>
          </Pressable>
        );
      })}
    </View>
  );
}
