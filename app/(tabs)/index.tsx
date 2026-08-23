import { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View, useWindowDimensions } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTema } from '@/ui/TemaProvider';
import { Texto } from '@/ui/comp/Texto';
import { Tarjeta } from '@/ui/comp/Tarjeta';
import { BarraProgreso } from '@/ui/comp/BarraProgreso';
import { SelectorPeriodo } from '@/ui/comp/SelectorPeriodo';
import { IconoCategoria } from '@/ui/comp/IconoCategoria';
import { EstadoVacio } from '@/ui/comp/EstadoVacio';
import { AnillosMetas } from '@/charts/AnillosMetas';
import { LineaTendencia } from '@/charts/LineaTendencia';
import { Grafico } from '@/charts/Contenedor';
import { esp, radio } from '@/ui/tema';

import { formatoCOP, formatoPct } from '@/core/dinero';
import { fraseRitmo } from '@/core/presupuesto';
import { calcularMeta } from '@/core/metas';
import { nivelEndeudamiento } from '@/core/deudas';
import { useResumen, acumuladoDiario } from '@/hooks/useResumen';
import { usePeriodo } from '@/store/periodo';
import { useAjustes } from '@/store/ajustes';
import { useDatos, conRefresco } from '@/store/datos';
import { listarMovimientos, recurrentesVencidos, confirmarRecurrente, omitirRecurrente } from '@/db/crud';
import { FilaMovimiento } from '@/ui/comp/FilaMovimiento';

export default function Inicio() {
  const t = useTema();
  const { width } = useWindowDimensions();
  const nombre = useAjustes((s) => s.nombre);
  const { mover, offset } = usePeriodo();
  const { metas, tarjetas, revision, refrescar } = useDatos();
  const r = useResumen();
  const [refrescando, setRefrescando] = useState(false);

  useFocusEffect(useCallback(() => { refrescar(); }, [refrescar]));

  const acumulado = useMemo(() => acumuladoDiario(r.rango), [r.rango, revision]);
  const acumuladoAnterior = useMemo(() => acumuladoDiario(r.anterior, false), [r.anterior, revision]);
  const recientes = useMemo(() => listarMovimientos({ limite: 5 }), [revision]);
  const pendientes = useMemo(() => recurrentesVencidos(), [revision]);

  const alerta = r.presupuestos.map((p) => fraseRitmo(p.nombre, p.estado)).find(Boolean) ?? null;
  const endeudamiento = nivelEndeudamiento(r.cargaMensualDeuda, r.ingresoMensual);
  const saludo = new Date().getHours() < 12 ? 'Buenos días' : new Date().getHours() < 19 ? 'Buenas tardes' : 'Buenas noches';

  const anillos = metas.slice(0, 6).map((m) => ({
    id: m.id, nombre: m.nombre, color: m.color, icono: m.icono,
    progreso: calcularMeta({
      montoObjetivo: m.montoObjetivo, montoActual: m.montoActual,
      fechaLimite: m.fechaLimite ? new Date(m.fechaLimite + 'T00:00:00') : null,
      fechaCreacion: new Date(m.fechaCreacion + 'T00:00:00'),
    }).progreso,
    montoActual: m.montoActual, montoObjetivo: m.montoObjetivo,
  }));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.fondo }} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: esp.lg, gap: esp.md, paddingBottom: esp.xxl }}
        refreshControl={
          <RefreshControl
            refreshing={refrescando}
            tintColor={t.acento}
            onRefresh={() => { setRefrescando(true); refrescar(); setTimeout(() => setRefrescando(false), 400); }}
          />
        }
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: esp.md }}>
          <View style={{ flex: 1 }}>
            <Texto variante="micro" color="tenue">{saludo.toUpperCase()}</Texto>
            <Texto variante="titulo">{nombre || 'Tus finanzas'}</Texto>
          </View>
          <Pressable
            onPress={() => router.push('/ajustes')}
            accessibilityRole="button" accessibilityLabel="Ajustes"
            style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: t.superficie, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: t.borde }}
          >
            <Ionicons name="person-outline" size={20} color={t.texto} />
          </Pressable>
        </View>

        <SelectorPeriodo
          etiqueta={r.etiqueta}
          onAnterior={() => mover(-1)}
          onSiguiente={() => mover(1)}
          siguienteActivo={offset < 0}
        />

        {/* Tarjeta principal: balance del ciclo */}
        <Tarjeta style={{ gap: esp.lg }}>
          <View>
            <Texto variante="micro" color="tenue">GASTADO EN EL CICLO</Texto>
            <Texto variante="montoHero">{formatoCOP(r.totales.gastos)}</Texto>
          </View>

          <View style={{ gap: 8 }}>
            <BarraProgreso valor={r.global.fraccion} color={r.global.color} alto={10} />
            <View style={{ flexDirection: 'row' }}>
              <Texto variante="micro" color="tenue" style={{ flex: 1 }}>
                {r.presupuestoTotal > 0 ? 'Presupuesto del ciclo' : 'Sobre tu ingreso estimado'}: {formatoCOP(r.global.presupuesto)}
              </Texto>
              <Texto variante="micro" color={r.global.fraccion > 1 ? 'rojo' : 'suave'}>
                {formatoPct(r.global.fraccion * 100)}
              </Texto>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: esp.sm }}>
            <Dato etiqueta="Ingresos" valor={formatoCOP(r.totales.ingresos)} color={t.verde} />
            <Dato etiqueta="Balance" valor={formatoCOP(r.totales.neto)} color={r.totales.neto >= 0 ? t.texto : t.rojo} />
            <Dato etiqueta="Ahorrado" valor={formatoCOP(r.totales.ahorro)} color={t.acento} />
          </View>

          {r.esCicloActual ? (
            <View style={{
              backgroundColor: t.acentoFondo, borderRadius: radio.md, padding: esp.md,
              flexDirection: 'row', alignItems: 'center', gap: esp.md,
            }}>
              <Ionicons name="today-outline" size={22} color={t.acento} />
              <View style={{ flex: 1 }}>
                <Texto variante="etiqueta" color="acento">Disponible para hoy</Texto>
                <Texto variante="micro" color="suave">
                  Quedan {r.diasRestantes} {r.diasRestantes === 1 ? 'día' : 'días'} del ciclo
                </Texto>
              </View>
              <Texto variante="montoGrande" style={{ fontSize: 20 }} color="acento">
                {formatoCOP(r.global.disponibleDiario)}
              </Texto>
            </View>
          ) : null}
        </Tarjeta>

        {/* Cargos recurrentes pendientes de confirmar */}
        {pendientes.length ? (
          <Tarjeta style={{ gap: esp.md, borderLeftWidth: 4, borderLeftColor: t.ambar }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: esp.sm }}>
              <Ionicons name="repeat" size={18} color={t.ambar} />
              <Texto variante="seccion" style={{ flex: 1 }}>Cargos por confirmar</Texto>
              <Texto variante="micro" color="tenue">{pendientes.length}</Texto>
            </View>
            {pendientes.slice(0, 3).map((rec) => (
              <View key={rec.id} style={{ flexDirection: 'row', alignItems: 'center', gap: esp.sm }}>
                <View style={{ flex: 1 }}>
                  <Texto variante="cuerpo" numberOfLines={1}>{rec.descripcion}</Texto>
                  <Texto variante="micro" color="tenue">{formatoCOP(rec.monto)} · vencía el {rec.proximaFecha}</Texto>
                </View>
                <Pressable
                  onPress={() => conRefresco(() => omitirRecurrente(rec))}
                  hitSlop={8} accessibilityRole="button" accessibilityLabel="Omitir"
                  style={{ padding: 8 }}
                >
                  <Ionicons name="close" size={20} color={t.textoTenue} />
                </Pressable>
                <Pressable
                  onPress={() => conRefresco(() => confirmarRecurrente(rec))}
                  hitSlop={8} accessibilityRole="button" accessibilityLabel="Confirmar cargo"
                  style={{ padding: 8, borderRadius: 999, backgroundColor: t.verdeFondo }}
                >
                  <Ionicons name="checkmark" size={20} color={t.verde} />
                </Pressable>
              </View>
            ))}
            {pendientes.length > 3 ? (
              <Pressable onPress={() => router.push('/recurrentes')} accessibilityRole="button">
                <Texto variante="etiqueta" color="acento">Ver los {pendientes.length} cargos</Texto>
              </Pressable>
            ) : null}
          </Tarjeta>
        ) : null}

        {/* Alerta de ritmo de gasto */}
        {alerta ? (
          <Tarjeta style={{ flexDirection: 'row', gap: esp.md, borderLeftWidth: 4, borderLeftColor: t.ambar }}>
            <Ionicons name="speedometer-outline" size={22} color={t.ambar} />
            <Texto variante="cuerpo" color="suave" style={{ flex: 1, lineHeight: 20 }}>{alerta}</Texto>
          </Tarjeta>
        ) : null}

        {/* Tendencia del ciclo */}
        <Grafico
          titulo="Ritmo de gasto"
          bajada={`${r.etiqueta} vs. ${r.etiquetaAnterior}`}
          hayDatos={acumulado.length > 1}
          mensajeVacio="Con dos o tres movimientos ya podrás comparar tu ritmo contra el ciclo pasado."
        >
          <LineaTendencia
            actual={acumulado}
            anterior={acumuladoAnterior}
            ancho={width - esp.lg * 2}
            etiquetaActual={r.etiqueta}
            etiquetaAnterior={r.etiquetaAnterior}
          />
        </Grafico>

        {/* Presupuestos por categoria */}
        <Tarjeta style={{ gap: esp.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Texto variante="seccion" style={{ flex: 1 }}>Presupuestos</Texto>
            <Pressable onPress={() => router.push('/ajustes/presupuestos')} accessibilityRole="button">
              <Texto variante="etiqueta" color="acento">Editar</Texto>
            </Pressable>
          </View>
          {r.presupuestos.length === 0 ? (
            <EstadoVacio
              titulo="Sin presupuestos definidos"
              mensaje="Ponle un tope mensual a tus categorías principales y la app te avisa antes de que se te vaya la mano."
              accion="Definir presupuestos"
              onAccion={() => router.push('/ajustes/presupuestos')}
            />
          ) : (
            r.presupuestos.slice(0, 5).map((p) => (
              <Pressable
                key={p.categoriaId ?? p.nombre}
                onPress={() => router.push({ pathname: '/movimientos', params: { categoria: String(p.categoriaId ?? '') } })}
                accessibilityRole="button"
                style={{ gap: 6 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: esp.sm }}>
                  <IconoCategoria icono={p.icono} color={p.color} tam={28} />
                  <Texto variante="cuerpo" style={{ flex: 1 }} numberOfLines={1}>{p.nombre}</Texto>
                  <Texto variante="etiqueta" style={{ color: p.estado.color }}>
                    {formatoCOP(p.total)} / {formatoCOP(p.presupuesto)}
                  </Texto>
                </View>
                <BarraProgreso valor={p.estado.fraccion} color={p.estado.color} />
              </Pressable>
            ))
          )}
        </Tarjeta>

        {/* Distribucion por bolsillos */}
        {r.bolsillos.length ? (
          <Tarjeta style={{ gap: esp.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Texto variante="seccion" style={{ flex: 1 }}>Tus bolsillos</Texto>
              <Pressable onPress={() => router.push('/ajustes/bolsillos')} accessibilityRole="button">
                <Texto variante="etiqueta" color="acento">Ajustar</Texto>
              </Pressable>
            </View>
            {r.bolsillos.map((b) => {
              const asignado = Math.round(r.ingresoMensual * b.porcentaje / 100);
              const gastado = r.categorias
                .filter((c) => c.bolsilloId === b.id)
                .reduce((a, c) => a + c.total, 0);
              const frac = asignado > 0 ? gastado / asignado : 0;
              return (
                <View key={b.id} style={{ gap: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: esp.sm }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: b.color }} />
                    <Texto variante="cuerpo" style={{ flex: 1 }}>{b.nombre}</Texto>
                    <Texto variante="micro" color="tenue">{Math.round(b.porcentaje)}%</Texto>
                    <Texto variante="etiqueta" color={frac > 1 ? 'rojo' : 'suave'}>
                      {formatoCOP(gastado)} / {formatoCOP(asignado)}
                    </Texto>
                  </View>
                  <BarraProgreso valor={frac} color={frac > 1 ? t.rojo : b.color} alto={6} />
                </View>
              );
            })}
          </Tarjeta>
        ) : null}

        {/* Metas */}
        <Tarjeta style={{ gap: esp.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Texto variante="seccion" style={{ flex: 1 }}>Metas de ahorro</Texto>
            <Pressable onPress={() => router.push('/metas')} accessibilityRole="button">
              <Texto variante="etiqueta" color="acento">Ver todas</Texto>
            </Pressable>
          </View>
          {anillos.length ? (
            <AnillosMetas metas={anillos} onPress={(id) => router.push(`/meta/${id}`)} />
          ) : (
            <EstadoVacio
              titulo="Todavía no tienes metas"
              mensaje="Ponle nombre y fecha a lo que quieres lograr; la app calcula cuánto debes apartar cada mes."
              accion="Crear mi primera meta"
              onAccion={() => router.push('/meta/nueva')}
            />
          )}
        </Tarjeta>

        {/* Deuda y tarjetas */}
        {(tarjetas.length > 0 || r.cargaMensualDeuda > 0) ? (
          <Pressable onPress={() => router.push('/tarjetas')} accessibilityRole="button">
            <Tarjeta style={{ gap: esp.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Texto variante="seccion" style={{ flex: 1 }}>Tarjetas y deudas</Texto>
                <Ionicons name="chevron-forward" size={18} color={t.textoTenue} />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: esp.md }}>
                <View style={{ flex: 1 }}>
                  <Texto variante="micro" color="tenue">CARGA MENSUAL DE CUOTAS</Texto>
                  <Texto variante="montoGrande" style={{ fontSize: 22 }}>{formatoCOP(r.cargaMensualDeuda)}</Texto>
                </View>
                <View style={{
                  paddingHorizontal: esp.md, paddingVertical: 6, borderRadius: 999,
                  backgroundColor: t.superficie2,
                }}>
                  <Texto variante="etiqueta" style={{ color: endeudamiento.color }}>
                    {formatoPct(endeudamiento.porcentaje)} del ingreso
                  </Texto>
                </View>
              </View>
              <BarraProgreso valor={Math.min(1, endeudamiento.fraccion / 0.5)} color={endeudamiento.color} alto={6} />
              <Texto variante="micro" color="tenue">{endeudamiento.texto} · sano por debajo del 30%</Texto>
            </Tarjeta>
          </Pressable>
        ) : null}

        {/* Movimientos recientes */}
        <Tarjeta style={{ gap: esp.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Texto variante="seccion" style={{ flex: 1 }}>Últimos movimientos</Texto>
            <Pressable onPress={() => router.push('/movimientos')} accessibilityRole="button">
              <Texto variante="etiqueta" color="acento">Ver todos</Texto>
            </Pressable>
          </View>
          {recientes.length ? (
            recientes.map((m) => (
              <FilaMovimiento key={m.id} m={m} onPress={() => router.push(`/registro?id=${m.id}`)} />
            ))
          ) : (
            <EstadoVacio
              titulo="Aún no registras nada"
              mensaje="Toca el botón + y anota tu primer gasto. Toma menos de cinco segundos."
            />
          )}
        </Tarjeta>

        {/* Accesos rapidos */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: esp.sm }}>
          <Acceso icono="analytics-outline" texto="Insights" onPress={() => router.push('/insights')} />
          <Acceso icono="repeat-outline" texto="Recurrentes" onPress={() => router.push('/recurrentes')} />
          <Acceso icono="wallet-outline" texto="Cuentas" onPress={() => router.push('/cuentas')} />
          <Acceso icono="card-outline" texto="Tarjetas" onPress={() => router.push('/tarjetas')} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Dato({ etiqueta, valor, color }: { etiqueta: string; valor: string; color: string }) {
  const t = useTema();
  return (
    <View style={{ flex: 1, backgroundColor: t.superficie2, borderRadius: radio.md, padding: esp.md, gap: 2 }}>
      <Texto variante="micro" color="tenue">{etiqueta.toUpperCase()}</Texto>
      <Texto variante="monto" style={{ color, fontSize: 15 }} numberOfLines={1}>{valor}</Texto>
    </View>
  );
}

function Acceso({ icono, texto, onPress }: { icono: any; texto: string; onPress: () => void }) {
  const t = useTema();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        flexGrow: 1, flexBasis: '47%', minHeight: 56,
        backgroundColor: t.superficie, borderRadius: radio.md,
        borderWidth: 1, borderColor: t.borde,
        flexDirection: 'row', alignItems: 'center', gap: esp.sm,
        paddingHorizontal: esp.md, opacity: pressed ? 0.7 : 1,
      })}
    >
      <Ionicons name={icono} size={20} color={t.acento} />
      <Texto variante="etiqueta" style={{ flex: 1 }}>{texto}</Texto>
      <Ionicons name="chevron-forward" size={16} color={t.textoTenue} />
    </Pressable>
  );
}
