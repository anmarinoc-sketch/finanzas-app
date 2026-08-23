import React from 'react';
import { View } from 'react-native';
import { useTema } from '@/ui/TemaProvider';
import { Texto } from '@/ui/comp/Texto';
import { BarraProgreso } from '@/ui/comp/BarraProgreso';
import { esp } from '@/ui/tema';
import { formatoCOP } from '@/core/dinero';

export type ItemTop = { descripcion: string; total: number; veces: number; color?: string | null };

/** Top 10 de comercios: barra proporcional al mayor, no al total. */
export function TopComercios({ items }: { items: ItemTop[] }) {
  const t = useTema();
  const max = Math.max(1, ...items.map((i) => i.total));
  return (
    <View style={{ gap: esp.md }}>
      {items.map((i, idx) => (
        <View key={i.descripcion + idx} style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: esp.sm }}>
            <Texto variante="micro" color="tenue" style={{ width: 18 }}>{idx + 1}</Texto>
            <Texto variante="cuerpo" style={{ flex: 1 }} numberOfLines={1}>{i.descripcion}</Texto>
            <Texto variante="monto" style={{ fontSize: 14 }}>{formatoCOP(i.total)}</Texto>
          </View>
          <View style={{ paddingLeft: 26 }}>
            <BarraProgreso valor={i.total / max} color={i.color || t.acento} alto={6} />
          </View>
          <Texto variante="micro" color="tenue" style={{ paddingLeft: 26 }}>
            {i.veces} {i.veces === 1 ? 'movimiento' : 'movimientos'}
          </Texto>
        </View>
      ))}
    </View>
  );
}
