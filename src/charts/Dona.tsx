import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { useTema } from '@/ui/TemaProvider';
import { Texto } from '@/ui/comp/Texto';
import { IconoCategoria } from '@/ui/comp/IconoCategoria';
import { esp } from '@/ui/tema';
import { formatoCOP, formatoPct } from '@/core/dinero';

export type ItemDona = {
  id: number | null; nombre: string; color: string; icono?: string | null; total: number;
};

/**
 * Dona de distribucion por categoria. Al tocar un segmento (o su fila en la
 * leyenda) se enfoca y el centro muestra el detalle de esa categoria.
 */
export function Dona({
  items, onSeleccionar,
}: { items: ItemDona[]; onSeleccionar?: (it: ItemDona | null) => void }) {
  const t = useTema();
  const [foco, setFoco] = useState<number | null>(null);
  const total = items.reduce((a, i) => a + i.total, 0);

  const seleccionar = (idx: number | null) => {
    setFoco(idx);
    onSeleccionar?.(idx == null ? null : items[idx]);
  };

  const datos = items.map((i, idx) => ({
    value: i.total,
    color: i.color,
    focused: foco === idx,
  }));

  const activo = foco != null ? items[foco] : null;

  return (
    <View style={{ gap: esp.lg }}>
      <View style={{ alignItems: 'center' }}>
        <PieChart
          data={datos}
          donut
          radius={104}
          innerRadius={72}
          sectionAutoFocus
          focusOnPress
          innerCircleColor={t.superficie}
          onPress={(_item: any, index: number) => seleccionar(foco === index ? null : index)}
          centerLabelComponent={() => (
            <View style={{ alignItems: 'center', paddingHorizontal: 8 }}>
              <Texto variante="micro" color="tenue" numberOfLines={1}>
                {activo ? activo.nombre.toUpperCase() : 'TOTAL'}
              </Texto>
              <Texto variante="montoGrande" style={{ fontSize: 20 }} numberOfLines={1}>
                {formatoCOP(activo ? activo.total : total)}
              </Texto>
              {activo ? (
                <Texto variante="micro" color="acento">
                  {formatoPct((activo.total / Math.max(1, total)) * 100, 1)}
                </Texto>
              ) : null}
            </View>
          )}
        />
      </View>

      <View style={{ gap: 2 }}>
        {items.map((i, idx) => {
          const pct = (i.total / Math.max(1, total)) * 100;
          const sel = foco === idx;
          return (
            <Pressable
              key={`${i.id}-${i.nombre}`}
              onPress={() => seleccionar(sel ? null : idx)}
              accessibilityRole="button"
              accessibilityLabel={`${i.nombre}, ${formatoCOP(i.total)}, ${formatoPct(pct)}`}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: esp.md,
                paddingVertical: 9, paddingHorizontal: esp.sm, borderRadius: 12,
                backgroundColor: sel ? t.superficie2 : 'transparent',
              }}
            >
              <IconoCategoria icono={i.icono} color={i.color} tam={30} />
              <Texto variante="cuerpo" style={{ flex: 1 }} numberOfLines={1}>{i.nombre}</Texto>
              <View style={{ alignItems: 'flex-end' }}>
                <Texto variante="monto" style={{ fontSize: 15 }}>{formatoCOP(i.total)}</Texto>
                <Texto variante="micro" color="tenue">{formatoPct(pct, 1)}</Texto>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
