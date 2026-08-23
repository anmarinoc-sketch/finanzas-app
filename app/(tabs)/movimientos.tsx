import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, TextInput, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { useTema } from '@/ui/TemaProvider';
import { Texto } from '@/ui/comp/Texto';
import { Tarjeta } from '@/ui/comp/Tarjeta';
import { Chip } from '@/ui/comp/Chip';
import { Hoja } from '@/ui/comp/Hoja';
import { Campo } from '@/ui/comp/Campo';
import { Boton, BotonFlotante } from '@/ui/comp/Boton';
import { EstadoVacio } from '@/ui/comp/EstadoVacio';
import { SelectorPeriodo } from '@/ui/comp/SelectorPeriodo';
import { FilaMovimiento } from '@/ui/comp/FilaMovimiento';
import { IconoCategoria } from '@/ui/comp/IconoCategoria';
import { esp, radio, TOQUE_MIN } from '@/ui/tema';

import { formatoCOP, parsearMonto, separarMiles } from '@/core/dinero';
import { MEDIOS_PAGO } from '@/constantes/medios';
import { listarMovimientos, type MovimientoVista } from '@/db/crud';
import { useDatos } from '@/store/datos';
import { usePeriodo, rangoActual } from '@/store/periodo';
import { useAjustes } from '@/store/ajustes';
import { etiquetaCiclo } from '@/core/fechas';

const PAGINA = 60;

export default function Movimientos() {
  const t = useTema();
  const params = useLocalSearchParams<{ categoria?: string }>();
  const diaInicio = useAjustes((s) => s.diaInicioCiclo);
  const { offset, mover } = usePeriodo();
  const { categoriasRaiz, revision, refrescar } = useDatos();

  const [texto, setTexto] = useState('');
  const [tipos, setTipos] = useState<string[]>([]);
  const [cats, setCats] = useState<number[]>(params.categoria ? [Number(params.categoria)] : []);
  const [medios, setMedios] = useState<string[]>([]);
  const [montoMin, setMontoMin] = useState('');
  const [montoMax, setMontoMax] = useState('');
  const [todoElHistorial, setTodoElHistorial] = useState(false);
  const [limite, setLimite] = useState(PAGINA);
  const [hojaFiltros, setHojaFiltros] = useState(false);

  useFocusEffect(useCallback(() => { refrescar(); }, [refrescar]));

  const rango = rangoActual(diaInicio, offset);

  const filtro = useMemo(() => ({
    desde: todoElHistorial ? undefined : rango.desde,
    hasta: todoElHistorial ? undefined : rango.hasta,
    tipos: tipos.length ? tipos : undefined,
    categoriaIds: cats.length ? cats : undefined,
    medios: medios.length ? medios : undefined,
    texto: texto.trim() || undefined,
    montoMin: montoMin ? parsearMonto(montoMin) : undefined,
    montoMax: montoMax ? parsearMonto(montoMax) : undefined,
    limite,
  }), [rango.desde, rango.hasta, todoElHistorial, tipos, cats, medios, texto, montoMin, montoMax, limite]);

  const movimientos = useMemo(() => listarMovimientos(filtro), [filtro, revision]);

  // Totales de lo filtrado (sobre la pagina cargada, que es lo que se ve).
  const totales = useMemo(() => movimientos.reduce(
    (a, m) => {
      if (m.tipo === 'gasto') a.gastos += m.monto;
      if (m.tipo === 'ingreso') a.ingresos += m.monto;
      return a;
    },
    { gastos: 0, ingresos: 0 },
  ), [movimientos]);

  // Encabezados de dia intercalados en la lista.
  const filas = useMemo(() => {
    const out: ({ tipo: 'fecha'; fecha: string } | { tipo: 'mov'; m: MovimientoVista })[] = [];
    let ultima = '';
    for (const m of movimientos) {
      if (m.fecha !== ultima) { out.push({ tipo: 'fecha', fecha: m.fecha }); ultima = m.fecha; }
      out.push({ tipo: 'mov', m });
    }
    return out;
  }, [movimientos]);

  const filtrosActivos = tipos.length + cats.length + medios.length + (montoMin ? 1 : 0) + (montoMax ? 1 : 0);

  const alternar = <T,>(lista: T[], v: T, set: (l: T[]) => void) =>
    set(lista.includes(v) ? lista.filter((x) => x !== v) : [...lista, v]);

  const limpiar = () => { setTipos([]); setCats([]); setMedios([]); setMontoMin(''); setMontoMax(''); };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.fondo }} edges={['top']}>
      <View style={{ padding: esp.lg, paddingBottom: esp.sm, gap: esp.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: esp.md }}>
          <Texto variante="titulo" style={{ flex: 1 }}>Movimientos</Texto>
          <Pressable
            onPress={() => setHojaFiltros(true)}
            accessibilityRole="button" accessibilityLabel="Filtros"
            style={{
              width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center',
              backgroundColor: filtrosActivos ? t.acento : t.superficie,
              borderWidth: 1, borderColor: filtrosActivos ? t.acento : t.borde,
            }}
          >
            <Ionicons name="options-outline" size={20} color={filtrosActivos ? '#FFF' : t.texto} />
          </Pressable>
        </View>

        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: esp.sm,
          backgroundColor: t.superficie, borderRadius: radio.md,
          paddingHorizontal: esp.md, borderWidth: 1, borderColor: t.borde,
          minHeight: TOQUE_MIN,
        }}>
          <Ionicons name="search" size={18} color={t.textoTenue} />
          <TextInput
            value={texto}
            onChangeText={(v) => { setTexto(v); setLimite(PAGINA); }}
            placeholder="Buscar comercio, nota o etiqueta"
            placeholderTextColor={t.textoTenue}
            style={{ flex: 1, color: t.texto, fontSize: 15, paddingVertical: esp.md }}
          />
          {texto ? (
            <Pressable onPress={() => setTexto('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Limpiar búsqueda">
              <Ionicons name="close-circle" size={18} color={t.textoTenue} />
            </Pressable>
          ) : null}
        </View>

        {todoElHistorial ? (
          <Pressable onPress={() => setTodoElHistorial(false)} accessibilityRole="button">
            <Texto variante="etiqueta" color="acento" style={{ textAlign: 'center' }}>
              Mostrando todo el historial · volver al ciclo
            </Texto>
          </Pressable>
        ) : (
          <SelectorPeriodo
            etiqueta={etiquetaCiclo(rango, diaInicio)}
            onAnterior={() => { mover(-1); setLimite(PAGINA); }}
            onSiguiente={() => { mover(1); setLimite(PAGINA); }}
            siguienteActivo={offset < 0}
            onPress={() => setTodoElHistorial(true)}
          />
        )}

        <View style={{ flexDirection: 'row', gap: esp.sm }}>
          <Resumen etiqueta="Gastos" valor={formatoCOP(totales.gastos)} color={t.rojo} />
          <Resumen etiqueta="Ingresos" valor={formatoCOP(totales.ingresos)} color={t.verde} />
          <Resumen etiqueta="Balance" valor={formatoCOP(totales.ingresos - totales.gastos)} color={t.texto} />
        </View>
      </View>

      <FlatList
        data={filas}
        keyExtractor={(f, i) => (f.tipo === 'fecha' ? `f-${f.fecha}` : `m-${f.m.id}-${i}`)}
        contentContainerStyle={{ paddingHorizontal: esp.lg, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        initialNumToRender={20}
        maxToRenderPerBatch={20}
        windowSize={11}
        removeClippedSubviews
        onEndReachedThreshold={0.4}
        onEndReached={() => { if (movimientos.length >= limite) setLimite((l) => l + PAGINA); }}
        ListEmptyComponent={
          <Tarjeta>
            <EstadoVacio
              titulo="Sin movimientos"
              mensaje={filtrosActivos || texto
                ? 'Ningún movimiento coincide con los filtros. Prueba a quitarlos o a ampliar el periodo.'
                : 'En este ciclo todavía no has registrado nada.'}
              accion={filtrosActivos ? 'Quitar filtros' : undefined}
              onAccion={filtrosActivos ? limpiar : undefined}
            />
          </Tarjeta>
        }
        renderItem={({ item }) =>
          item.tipo === 'fecha' ? (
            <Texto variante="micro" color="tenue" style={{ marginTop: esp.md, marginBottom: 2, paddingHorizontal: esp.sm }}>
              {format(new Date(item.fecha + 'T00:00:00'), "EEEE d 'de' MMMM", { locale: es }).toUpperCase()}
            </Texto>
          ) : (
            <FilaMovimiento m={item.m} onPress={() => router.push(`/registro?id=${item.m.id}`)} />
          )
        }
      />

      <BotonFlotante onPress={() => router.push('/registro')} />

      <Hoja visible={hojaFiltros} onCerrar={() => setHojaFiltros(false)} titulo="Filtros" alto="85%">
        <View style={{ gap: 6 }}>
          <Texto variante="etiqueta" color="suave">Tipo</Texto>
          <View style={{ flexDirection: 'row', gap: esp.sm }}>
            {[['gasto', 'Gastos'], ['ingreso', 'Ingresos'], ['transferencia', 'Transferencias']].map(([id, texto]) => (
              <Chip key={id} texto={texto} compacto activo={tipos.includes(id)} onPress={() => alternar(tipos, id, setTipos)} />
            ))}
          </View>
        </View>

        <View style={{ gap: 6 }}>
          <Texto variante="etiqueta" color="suave">Medio de pago</Texto>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: esp.sm }}>
            {MEDIOS_PAGO.map((m) => (
              <Chip key={m.id} texto={m.nombre} compacto color={m.color} activo={medios.includes(m.id)} onPress={() => alternar(medios, m.id, setMedios)} />
            ))}
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: esp.md }}>
          <View style={{ flex: 1 }}>
            <Campo
              etiqueta="Monto mínimo"
              value={montoMin ? separarMiles(parsearMonto(montoMin)) : ''}
              onChangeText={setMontoMin}
              keyboardType="number-pad" placeholder="0"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Campo
              etiqueta="Monto máximo"
              value={montoMax ? separarMiles(parsearMonto(montoMax)) : ''}
              onChangeText={setMontoMax}
              keyboardType="number-pad" placeholder="Sin límite"
            />
          </View>
        </View>

        <View style={{ gap: 6 }}>
          <Texto variante="etiqueta" color="suave">Categorías</Texto>
          {categoriasRaiz.map((c) => {
            const on = cats.includes(c.id);
            return (
              <Pressable
                key={c.id}
                onPress={() => alternar(cats, c.id, setCats)}
                accessibilityRole="checkbox" accessibilityState={{ checked: on }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: esp.md, paddingVertical: 8 }}
              >
                <IconoCategoria icono={c.icono} color={c.color} tam={32} />
                <Texto variante="cuerpo" style={{ flex: 1 }}>{c.nombre}</Texto>
                <Ionicons name={on ? 'checkbox' : 'square-outline'} size={22} color={on ? t.acento : t.textoTenue} />
              </Pressable>
            );
          })}
        </View>

        <View style={{ flexDirection: 'row', gap: esp.md }}>
          <Boton titulo="Limpiar" variante="secundario" onPress={limpiar} style={{ flex: 1 }} />
          <Boton titulo="Aplicar" onPress={() => { setLimite(PAGINA); setHojaFiltros(false); }} style={{ flex: 1 }} />
        </View>
      </Hoja>
    </SafeAreaView>
  );
}

function Resumen({ etiqueta, valor, color }: { etiqueta: string; valor: string; color: string }) {
  const t = useTema();
  return (
    <View style={{ flex: 1, backgroundColor: t.superficie, borderRadius: radio.md, padding: esp.md, borderWidth: 1, borderColor: t.borde }}>
      <Texto variante="micro" color="tenue">{etiqueta.toUpperCase()}</Texto>
      <Texto variante="monto" style={{ color, fontSize: 14 }} numberOfLines={1}>{valor}</Texto>
    </View>
  );
}
