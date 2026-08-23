import { useCallback, useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { useTema } from '@/ui/TemaProvider';
import { Texto } from '@/ui/comp/Texto';
import { Tarjeta } from '@/ui/comp/Tarjeta';
import { BarraProgreso } from '@/ui/comp/BarraProgreso';
import { Boton, BotonFlotante } from '@/ui/comp/Boton';
import { EstadoVacio } from '@/ui/comp/EstadoVacio';
import { Anillo } from '@/charts/AnillosMetas';
import { esp, radio } from '@/ui/tema';

import { formatoCOP } from '@/core/dinero';
import { cabeEnAhorro, calcularMeta, ESTADO_META_COLOR, ESTADO_META_TEXTO } from '@/core/metas';
import { useDatos } from '@/store/datos';

export default function Metas() {
  const t = useTema();
  const { metas, bolsillos, ingresoMensual, refrescar, revision } = useDatos();

  useFocusEffect(useCallback(() => { refrescar(); }, [refrescar]));

  const calculadas = useMemo(() => metas.map((m) => ({
    meta: m,
    calc: calcularMeta({
      montoObjetivo: m.montoObjetivo,
      montoActual: m.montoActual,
      fechaLimite: m.fechaLimite ? new Date(m.fechaLimite + 'T00:00:00') : null,
      fechaCreacion: new Date(m.fechaCreacion + 'T00:00:00'),
    }),
  })), [metas, revision]);

  const cupoAhorro = useMemo(() => {
    const b = bolsillos.find((x) => x.tipo === 'ahorro');
    return Math.round(ingresoMensual * (b?.porcentaje ?? 0) / 100);
  }, [bolsillos, ingresoMensual]);

  const capacidad = cabeEnAhorro(
    calculadas.filter((c) => c.calc.estado !== 'cumplida').map((c) => c.calc.aporteMensualNecesario),
    cupoAhorro,
  );

  const totalAhorrado = metas.reduce((a, m) => a + m.montoActual, 0);
  const totalObjetivo = metas.reduce((a, m) => a + m.montoObjetivo, 0);
  const progresoTotal = totalObjetivo > 0 ? totalAhorrado / totalObjetivo : 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.fondo }} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: esp.lg, gap: esp.md, paddingBottom: 120 }}
      >
        <Texto variante="titulo">Metas de ahorro</Texto>

        {metas.length ? (
          <Tarjeta style={{ gap: esp.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: esp.lg }}>
              <Anillo progreso={progresoTotal} color={t.acento} tam={80} grosor={9}>
                <Texto variante="etiqueta" style={{ fontSize: 15 }}>{Math.round(progresoTotal * 100)}%</Texto>
              </Anillo>
              <View style={{ flex: 1, gap: 2 }}>
                <Texto variante="micro" color="tenue">AHORRADO EN TOTAL</Texto>
                <Texto variante="montoGrande" style={{ fontSize: 24 }}>{formatoCOP(totalAhorrado)}</Texto>
                <Texto variante="micro" color="suave">de {formatoCOP(totalObjetivo)} en {metas.length} metas</Texto>
              </View>
            </View>

            <View style={{
              backgroundColor: capacidad.cabe ? t.verdeFondo : t.ambarFondo,
              borderRadius: radio.md, padding: esp.md, flexDirection: 'row', gap: esp.md,
            }}>
              <Ionicons
                name={capacidad.cabe ? 'checkmark-circle' : 'alert-circle'}
                size={20}
                color={capacidad.cabe ? t.verde : t.ambar}
              />
              <View style={{ flex: 1 }}>
                <Texto variante="etiqueta" color={capacidad.cabe ? 'verde' : 'ambar'}>
                  {capacidad.cabe ? 'Tus metas caben en tu ahorro' : 'Tus metas piden más de lo que ahorras'}
                </Texto>
                <Texto variante="micro" color="suave" style={{ marginTop: 2, lineHeight: 17 }}>
                  Necesitas {formatoCOP(capacidad.requerido)} al mes y tu bolsillo de ahorro es de {formatoCOP(capacidad.cupo)}.
                  {capacidad.cabe
                    ? ` Te sobran ${formatoCOP(capacidad.holgura)}.`
                    : ` Te faltan ${formatoCOP(capacidad.exceso)}: alarga una fecha límite o sube el % de ahorro.`}
                </Texto>
              </View>
            </View>
          </Tarjeta>
        ) : null}

        {calculadas.length === 0 ? (
          <Tarjeta>
            <EstadoVacio
              titulo="Todavía no tienes metas"
              mensaje="Un fondo de emergencia, un viaje, la cuota inicial de algo. Define el monto y la fecha, y la app calcula cuánto apartar cada mes."
              accion="Crear mi primera meta"
              onAccion={() => router.push('/meta/nueva')}
            />
          </Tarjeta>
        ) : (
          calculadas.map(({ meta: m, calc }) => (
            <Pressable key={m.id} onPress={() => router.push(`/meta/${m.id}`)} accessibilityRole="button">
              <Tarjeta style={{ gap: esp.md }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: esp.md }}>
                  <Anillo progreso={calc.progreso} color={m.color} tam={56} grosor={6}>
                    <Ionicons name={(m.icono as any) || 'flag-outline'} size={20} color={m.color} />
                  </Anillo>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Texto variante="seccion" numberOfLines={1}>{m.nombre}</Texto>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: t.superficie2 }}>
                        <Texto variante="micro" style={{ color: ESTADO_META_COLOR[calc.estado] }}>
                          {ESTADO_META_TEXTO[calc.estado]}
                        </Texto>
                      </View>
                      {m.fechaLimite ? (
                        <Texto variante="micro" color="tenue">
                          meta: {format(new Date(m.fechaLimite + 'T00:00:00'), 'd MMM yyyy', { locale: es })}
                        </Texto>
                      ) : null}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={t.textoTenue} />
                </View>

                <BarraProgreso valor={calc.progreso} color={m.color} alto={10} />

                <View style={{ flexDirection: 'row' }}>
                  <View style={{ flex: 1 }}>
                    <Texto variante="monto">{formatoCOP(m.montoActual)}</Texto>
                    <Texto variante="micro" color="tenue">de {formatoCOP(m.montoObjetivo)}</Texto>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Texto variante="etiqueta" color="suave">
                      {calc.estado === 'cumplida' ? '¡Meta cumplida!' : `Faltan ${formatoCOP(calc.faltante)}`}
                    </Texto>
                    {calc.estado !== 'cumplida' && calc.aporteMensualNecesario > 0 ? (
                      <Texto variante="micro" color="acento">
                        {formatoCOP(calc.aporteMensualNecesario)}/mes para llegar a tiempo
                      </Texto>
                    ) : null}
                  </View>
                </View>

                {calc.fechaProyectada && calc.estado !== 'cumplida' ? (
                  <Texto variante="micro" color="tenue">
                    Al ritmo actual la cumplirías el {format(calc.fechaProyectada, "d 'de' MMMM 'de' yyyy", { locale: es })}.
                  </Texto>
                ) : null}
              </Tarjeta>
            </Pressable>
          ))
        )}

        {metas.length ? (
          <Boton titulo="Nueva meta" icono="add" variante="secundario" ancho onPress={() => router.push('/meta/nueva')} />
        ) : null}
      </ScrollView>

      <BotonFlotante onPress={() => router.push('/meta/nueva')} />
    </SafeAreaView>
  );
}
