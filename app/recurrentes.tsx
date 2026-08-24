import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { differenceInCalendarDays, format } from 'date-fns';
import { es } from 'date-fns/locale';

import { useTema } from '@/ui/TemaProvider';
import { Encabezado } from '@/ui/comp/Encabezado';
import { Texto } from '@/ui/comp/Texto';
import { Tarjeta } from '@/ui/comp/Tarjeta';
import { Boton } from '@/ui/comp/Boton';
import { Interruptor } from '@/ui/comp/Campo';
import { EstadoVacio } from '@/ui/comp/EstadoVacio';
import { IconoCategoria } from '@/ui/comp/IconoCategoria';
import { Segmentado } from '@/ui/comp/SelectorPeriodo';
import { esp, radio } from '@/ui/tema';

import { formatoCOP } from '@/core/dinero';
import { costoAnual, costoMensual } from '@/core/recurrentes';
import {
  actualizarRecurrente, borrarRecurrente, confirmarRecurrente, omitirRecurrente,
} from '@/db/crud';
import { useDatos, conRefresco, categoriaPorId } from '@/store/datos';
import { recordarRecurrente } from '@/servicios/notificaciones';

export default function Recurrentes() {
  const t = useTema();
  const { recurrentes, revision, refrescar } = useDatos();
  const [filtro, setFiltro] = useState<'todos' | 'suscripciones'>('todos');

  useFocusEffect(useCallback(() => { refrescar(); }, [refrescar]));

  const lista = useMemo(() => {
    const base = filtro === 'suscripciones' ? recurrentes.filter((r) => r.esSuscripcion) : recurrentes;
    return [...base].sort((a, b) => a.proximaFecha.localeCompare(b.proximaFecha));
  }, [recurrentes, filtro, revision]);

  const activos = recurrentes.filter((r) => r.activo);
  const suscripciones = activos.filter((r) => r.esSuscripcion);
  const totalMensual = activos.reduce((a, r) => a + costoMensual(r.monto, r.frecuencia), 0);
  const suscAnual = suscripciones.reduce((a, r) => a + costoAnual(r.monto, r.frecuencia), 0);

  /** Suscripciones sin uso marcado en los ultimos 60 dias. */
  const sinUso = suscripciones.filter((r) => {
    if (!r.ultimoUso) return true;
    return differenceInCalendarDays(new Date(), new Date(r.ultimoUso + 'T00:00:00')) > 60;
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.fondo }} edges={['top', 'bottom']}>
      <Encabezado titulo="Gastos recurrentes" subtitulo="Cargos fijos y suscripciones" />
      <ScrollView contentContainerStyle={{ padding: esp.lg, gap: esp.md, paddingBottom: esp.xxl }}>
        <View style={{ flexDirection: 'row', gap: esp.md }}>
          <Tarjeta style={{ flex: 1, gap: 4 }}>
            <Texto variante="micro" color="tenue">TOTAL MENSUAL</Texto>
            <Texto variante="montoGrande" style={{ fontSize: 20 }}>{formatoCOP(totalMensual)}</Texto>
            <Texto variante="micro" color="tenue">{activos.length} cargos activos</Texto>
          </Tarjeta>
          <Tarjeta style={{ flex: 1, gap: 4 }}>
            <Texto variante="micro" color="tenue">SUSCRIPCIONES AL AÑO</Texto>
            <Texto variante="montoGrande" style={{ fontSize: 20 }} color="ambar">{formatoCOP(suscAnual)}</Texto>
            <Texto variante="micro" color="tenue">{suscripciones.length} suscripciones</Texto>
          </Tarjeta>
        </View>

        {suscAnual > 0 ? (
          <Tarjeta style={{ flexDirection: 'row', gap: esp.md, borderLeftWidth: 4, borderLeftColor: t.ambar }}>
            <Ionicons name="cash-outline" size={22} color={t.ambar} />
            <Texto variante="cuerpo" color="suave" style={{ flex: 1, lineHeight: 20 }}>
              Tus suscripciones te cuestan {formatoCOP(suscAnual)} al año. Cancelar una sola de {formatoCOP(50_000)} al mes
              te devolvería {formatoCOP(600_000)} anuales.
            </Texto>
          </Tarjeta>
        ) : null}

        {sinUso.length ? (
          <Tarjeta style={{ gap: esp.sm, borderLeftWidth: 4, borderLeftColor: t.rojo }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: esp.sm }}>
              <Ionicons name="help-circle-outline" size={20} color={t.rojo} />
              <Texto variante="seccion" style={{ flex: 1 }}>¿Sigues usando estas?</Texto>
            </View>
            <Texto variante="micro" color="suave">
              No has marcado uso reciente en {sinUso.length} {sinUso.length === 1 ? 'suscripción' : 'suscripciones'}.
              Márcalas como usadas o cancélalas.
            </Texto>
            {sinUso.map((r) => (
              <View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', gap: esp.sm, paddingVertical: 4 }}>
                <Texto variante="cuerpo" style={{ flex: 1 }}>{r.descripcion}</Texto>
                <Pressable
                  onPress={() => conRefresco(() => actualizarRecurrente(r.id, { ultimoUso: format(new Date(), 'yyyy-MM-dd') }))}
                  accessibilityRole="button"
                  style={{ paddingHorizontal: esp.md, paddingVertical: 6, borderRadius: 999, backgroundColor: t.verdeFondo }}
                >
                  <Texto variante="micro" color="verde">La uso</Texto>
                </Pressable>
              </View>
            ))}
          </Tarjeta>
        ) : null}

        <Segmentado
          valor={filtro}
          onChange={setFiltro}
          opciones={[{ valor: 'todos', texto: 'Todos' }, { valor: 'suscripciones', texto: 'Suscripciones' }]}
        />

        {lista.length === 0 ? (
          <Tarjeta>
            <EstadoVacio
              titulo="Sin cargos recurrentes"
              mensaje="Cuando registres un gasto puedes marcarlo como recurrente; aparecerá aquí con su próxima fecha de cobro."
            />
          </Tarjeta>
        ) : lista.map((r) => {
          const cat = categoriaPorId(r.categoriaId);
          const fecha = new Date(r.proximaFecha + 'T00:00:00');
          const dias = differenceInCalendarDays(fecha, new Date());
          const vencido = dias <= 0;
          return (
            <Tarjeta key={r.id} style={{ gap: esp.md, opacity: r.activo ? 1 : 0.55 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: esp.md }}>
                <IconoCategoria icono={cat?.icono ?? 'repeat-outline'} color={cat?.color ?? t.acento} />
                <View style={{ flex: 1 }}>
                  <Texto variante="cuerpo" numberOfLines={1}>{r.descripcion}</Texto>
                  <Texto variante="micro" color="tenue">
                    {cat?.nombre ?? 'Sin categoría'} · {r.frecuencia}
                    {r.esSuscripcion ? ' · suscripción' : ''}
                  </Texto>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Texto variante="monto">{formatoCOP(r.monto)}</Texto>
                  <Texto variante="micro" color="tenue">{formatoCOP(costoAnual(r.monto, r.frecuencia))}/año</Texto>
                </View>
              </View>

              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: esp.sm,
                backgroundColor: vencido ? t.ambarFondo : t.superficie2,
                borderRadius: radio.md, paddingHorizontal: esp.md, paddingVertical: esp.sm,
              }}>
                <Ionicons name="calendar-outline" size={16} color={vencido ? t.ambar : t.textoSuave} />
                <Texto variante="micro" color={vencido ? 'ambar' : 'suave'} style={{ flex: 1 }}>
                  {vencido
                    ? 'Cobro pendiente de confirmar'
                    : `Próximo cobro el ${format(fecha, "d 'de' MMMM", { locale: es })} (${dias} días)`}
                </Texto>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: esp.sm }}>
                {vencido && r.activo ? (
                  <>
                    <Boton titulo="Confirmar" icono="checkmark" onPress={() => conRefresco(() => confirmarRecurrente(r))} />
                    <Boton titulo="Omitir" variante="secundario" onPress={() => conRefresco(() => omitirRecurrente(r))} />
                  </>
                ) : (
                  <Boton
                    titulo="Recordarme"
                    icono="notifications-outline"
                    variante="fantasma"
                    onPress={async () => {
                      await recordarRecurrente(r.id, r.descripcion, r.monto, fecha);
                      Alert.alert('Listo', 'Te avisaremos dos días antes del cobro.');
                    }}
                  />
                )}
                <View style={{ flex: 1 }} />
                <Interruptor
                  valor={!!r.activo}
                  onChange={(v) => conRefresco(() => actualizarRecurrente(r.id, { activo: v ? 1 : 0 }))}
                />
                <Pressable
                  onPress={() => Alert.alert('Eliminar cargo', `¿Borrar "${r.descripcion}"?`, [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Eliminar', style: 'destructive', onPress: () => conRefresco(() => borrarRecurrente(r.id)) },
                  ])}
                  hitSlop={10} accessibilityRole="button" accessibilityLabel={`Eliminar ${r.descripcion}`}
                  style={{ padding: 6 }}
                >
                  <Ionicons name="trash-outline" size={18} color={t.textoTenue} />
                </Pressable>
              </View>
            </Tarjeta>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
