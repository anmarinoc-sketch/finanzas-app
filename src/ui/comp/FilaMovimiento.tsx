import React from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useTema } from '../TemaProvider';
import { Texto } from './Texto';
import { IconoCategoria } from './IconoCategoria';
import { esp } from '../tema';
import { formatoCOP } from '@/core/dinero';
import { nombreMedio } from '@/constantes/medios';
import { etiquetasFila } from '@/core/movimientos';
import type { MovimientoVista } from '@/db/crud';

/** Fila de la lista de movimientos. Se usa igual en Inicio y en Movimientos. */
export function FilaMovimiento({ m, onPress }: { m: MovimientoVista; onPress?: () => void }) {
  const t = useTema();
  const esIngreso = m.tipo === 'ingreso';
  const esTransf = m.tipo === 'transferencia';
  const color = esIngreso ? t.verde : esTransf ? t.azul : t.texto;
  const signo = esIngreso ? '+ ' : esTransf ? '' : '- ';

  // El titulo se decide en una funcion pura y probada: si la descripcion es
  // solo una forma de pago, encabeza la categoria y la descripcion baja al
  // detalle. Asi la fila dice "Ara" y no "Transferencia".
  const { titulo, extra, tituloEsCategoria } = etiquetasFila(m);

  const detalle = [
    format(new Date(m.fecha + 'T00:00:00'), "d MMM", { locale: es }),
    extra,
    tituloEsCategoria ? null : (m.categoriaNombre ?? (esTransf ? 'Entre cuentas' : null)),
    nombreMedio(m.medioPago),
    m.cuotas > 1 ? `Cuota ${m.cuotaActual}/${m.cuotas}` : null,
  ].filter(Boolean).join(' · ');

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${titulo}, ${formatoCOP(m.monto)}`}
      style={({ pressed }) => ({
        flexDirection: 'row', alignItems: 'center', gap: esp.md,
        paddingVertical: 10, paddingHorizontal: esp.sm, borderRadius: 12,
        backgroundColor: pressed ? t.superficie2 : 'transparent',
      })}
    >
      {esTransf ? (
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: t.superficie2, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="swap-horizontal" size={20} color={t.azul} />
        </View>
      ) : esIngreso ? (
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: t.verdeFondo, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="arrow-down" size={20} color={t.verde} />
        </View>
      ) : (
        <IconoCategoria icono={m.categoriaIcono} color={m.categoriaColor} />
      )}

      <View style={{ flex: 1 }}>
        <Texto variante="cuerpo" numberOfLines={1}>{titulo}</Texto>
        <Texto variante="micro" color="tenue" numberOfLines={1}>{detalle}</Texto>
      </View>

      <View style={{ alignItems: 'flex-end' }}>
        <Texto variante="monto" style={{ color }}>{signo}{formatoCOP(m.monto)}</Texto>
        {m.fotoUri ? <Ionicons name="image-outline" size={12} color={t.textoTenue} /> : null}
      </View>

      {/* Pista visible de que la fila se toca para editar o borrar. */}
      {onPress ? <Ionicons name="chevron-forward" size={16} color={t.textoTenue} /> : null}
    </Pressable>
  );
}
