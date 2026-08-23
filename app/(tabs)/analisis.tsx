import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { eachDayOfInterval, endOfYear, startOfYear } from 'date-fns';

import { useTema } from '@/ui/TemaProvider';
import { Texto } from '@/ui/comp/Texto';
import { Tarjeta } from '@/ui/comp/Tarjeta';
import { Chip } from '@/ui/comp/Chip';
import { Boton } from '@/ui/comp/Boton';
import { BarraProgreso } from '@/ui/comp/BarraProgreso';
import { IconoCategoria } from '@/ui/comp/IconoCategoria';
import { esp } from '@/ui/tema';

import { Grafico } from '@/charts/Contenedor';
import { Dona } from '@/charts/Dona';
import { BarrasMeses } from '@/charts/BarrasMeses';
import { LineaTendencia } from '@/charts/LineaTendencia';
import { Cascada } from '@/charts/Cascada';
import { BarrasApiladas } from '@/charts/BarrasApiladas';
import { MapaCalor } from '@/charts/MapaCalor';
import { AnillosMetas } from '@/charts/AnillosMetas';
import { TopComercios } from '@/charts/TopComercios';
import { Proyeccion } from '@/charts/Proyeccion';

import { formatoCOP, formatoPct } from '@/core/dinero';
import { calcularMeta } from '@/core/metas';
import { capitalizar, fmtMesCorto, ultimosCiclos, type Rango } from '@/core/fechas';
import {
  gastoPorCategoria, gastoPorDia, gastoPorMedio, topComercios,
  totalCategoriaEnRango, totalesPeriodo,
} from '@/db/consultas';
import { MEDIOS_PAGO } from '@/constantes/medios';
import { useResumen, acumuladoDiario } from '@/hooks/useResumen';
import { useAjustes } from '@/store/ajustes';
import { useDatos } from '@/store/datos';

type Alcance = 'ciclo' | '3m' | '6m' | '12m' | 'anio';

const ALCANCES: { id: Alcance; texto: string }[] = [
  { id: 'ciclo', texto: 'Ciclo' },
  { id: '3m', texto: '3 meses' },
  { id: '6m', texto: '6 meses' },
  { id: '12m', texto: '12 meses' },
  { id: 'anio', texto: 'Año' },
];

export default function Analisis() {
  const t = useTema();
  const { width } = useWindowDimensions();
  const ancho = width - esp.lg * 2;
  const diaInicio = useAjustes((s) => s.diaInicioCiclo);
  const { metas, revision, refrescar } = useDatos();
  const r = useResumen();

  const [alcance, setAlcance] = useState<Alcance>('ciclo');
  const [medio, setMedio] = useState<string | null>(null);

  useFocusEffect(useCallback(() => { refrescar(); }, [refrescar]));

  /** Rango efectivo segun el alcance elegido. */
  const rango: Rango = useMemo(() => {
    if (alcance === 'ciclo') return r.rango;
    if (alcance === 'anio') return { desde: startOfYear(new Date()), hasta: endOfYear(new Date()) };
    const n = alcance === '3m' ? 3 : alcance === '6m' ? 6 : 12;
    const ciclos = ultimosCiclos(n, diaInicio);
    return { desde: ciclos[0].desde, hasta: ciclos[ciclos.length - 1].hasta };
  }, [alcance, r.rango, diaInicio]);

  const etiquetaRango = alcance === 'ciclo' ? r.etiqueta : ALCANCES.find((a) => a.id === alcance)!.texto;

  const categorias = useMemo(
    () => gastoPorCategoria(rango, medio ? [medio] : undefined),
    [rango, revision, medio],
  );
  const totales = useMemo(() => totalesPeriodo(rango), [rango, revision]);
  const top = useMemo(() => topComercios(rango, 10), [rango, revision]);
  const medios = useMemo(() => gastoPorMedio(rango), [rango, revision]);

  // Barras mes a mes: 6 ciclos si el alcance es corto, 12 si es largo.
  const nCiclos = alcance === '12m' || alcance === 'anio' ? 12 : 6;
  const ciclos = useMemo(() => ultimosCiclos(nCiclos, diaInicio), [nCiclos, diaInicio]);
  const barrasMes = useMemo(
    () => ciclos.map((c) => ({
      etiqueta: capitalizar(fmtMesCorto(c.desde)),
      valor: totalesPeriodo(c).gastos,
    })),
    [ciclos, revision],
  );

  // Barras apiladas: las 5 categorias mas grandes + "Otras".
  const apiladas = useMemo(() => {
    const top5 = categorias.slice(0, 5);
    const series = top5.map((c) => ({
      nombre: c.nombre, color: c.color,
      valores: ciclos.map((ci) => totalCategoriaEnRango(c.categoriaId, ci)),
    }));
    const otras = ciclos.map((ci, i) => {
      const total = totalesPeriodo(ci).gastos;
      const cubierto = series.reduce((a, s) => a + s.valores[i], 0);
      return Math.max(0, total - cubierto);
    });
    if (otras.some((v) => v > 0)) series.push({ nombre: 'Otras', color: t.textoTenue, valores: otras });
    return series;
  }, [categorias, ciclos, revision, t.textoTenue]);

  const diasCalor = useMemo(() => {
    const filas = gastoPorDia(r.rango);
    const mapa = new Map(filas.map((f) => [f.fecha, f.total]));
    return eachDayOfInterval({ start: r.rango.desde, end: r.rango.hasta }).map((d) => {
      const clave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return { fecha: d, total: mapa.get(clave) ?? 0 };
    });
  }, [r.rango, revision]);

  const acumulado = useMemo(() => acumuladoDiario(r.rango), [r.rango, revision]);
  const acumuladoAnterior = useMemo(() => acumuladoDiario(r.anterior, false), [r.anterior, revision]);

  const anillos = metas.map((m) => ({
    id: m.id, nombre: m.nombre, color: m.color, icono: m.icono,
    progreso: calcularMeta({
      montoObjetivo: m.montoObjetivo, montoActual: m.montoActual,
      fechaLimite: m.fechaLimite ? new Date(m.fechaLimite + 'T00:00:00') : null,
      fechaCreacion: new Date(m.fechaCreacion + 'T00:00:00'),
    }).progreso,
    montoActual: m.montoActual, montoObjetivo: m.montoObjetivo,
  }));


  const cascada = useMemo(() => {
    const ingreso = totales.ingresos || r.ingresoMensual;
    const { fijos, variables } = r.fijos;
    const ahorro = totales.ahorro;
    const sobrante = ingreso - fijos - variables - ahorro;
    return [
      { etiqueta: 'Ingreso', delta: ingreso, color: t.verde, total: true },
      { etiqueta: 'Fijos', delta: -fijos, color: t.azul },
      { etiqueta: 'Variables', delta: -variables, color: t.ambar },
      { etiqueta: 'Ahorro', delta: -ahorro, color: t.acento },
      { etiqueta: 'Sobrante', delta: 0, color: sobrante >= 0 ? t.verde : t.rojo, total: true },
    ];
  }, [totales, r.fijos, r.ingresoMensual, t]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.fondo }} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: esp.lg, gap: esp.md, paddingBottom: esp.xxl }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: esp.md }}>
          <Texto variante="titulo" style={{ flex: 1 }}>Análisis</Texto>
          <Pressable
            onPress={() => router.push('/insights')}
            accessibilityRole="button" accessibilityLabel="Insights"
            style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: t.acentoFondo, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="bulb-outline" size={20} color={t.acento} />
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: esp.sm }}>
          {ALCANCES.map((a) => (
            <Chip key={a.id} texto={a.texto} compacto activo={alcance === a.id} onPress={() => setAlcance(a.id)} />
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: esp.sm }}>
          <Chip texto="Todos los medios" compacto activo={!medio} onPress={() => setMedio(null)} />
          {MEDIOS_PAGO.map((m) => (
            <Chip key={m.id} texto={m.nombre} compacto color={m.color} activo={medio === m.id} onPress={() => setMedio(medio === m.id ? null : m.id)} />
          ))}
        </ScrollView>

        <Tarjeta style={{ gap: esp.sm }}>
          <Texto variante="micro" color="tenue">{etiquetaRango.toUpperCase()}</Texto>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: esp.md }}>
            <View style={{ flex: 1 }}>
              <Texto variante="montoHero" style={{ fontSize: 32 }}>{formatoCOP(totales.gastos)}</Texto>
              <Texto variante="micro" color="tenue">gastado en el periodo</Texto>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Texto variante="monto" color="verde">{formatoCOP(totales.ingresos)}</Texto>
              <Texto variante="micro" color="tenue">ingresos</Texto>
            </View>
          </View>
        </Tarjeta>

        {/* 1. Dona por categoria */}
        <Grafico
          titulo="Distribución por categoría"
          bajada={medio ? `Solo ${MEDIOS_PAGO.find((m) => m.id === medio)?.nombre}` : etiquetaRango}
          hayDatos={categorias.length > 0}
        >
          <Dona
            items={categorias.map((c) => ({
              id: c.categoriaId, nombre: c.nombre, color: c.color, icono: c.icono, total: c.total,
            }))}
            onSeleccionar={() => {}}
          />
        </Grafico>

        {/* 2. Barras mes a mes con promedio */}
        <Grafico titulo="Gasto mes a mes" bajada={`Últimos ${nCiclos} ciclos`} hayDatos={barrasMes.some((b) => b.valor > 0)}>
          <BarrasMeses datos={barrasMes} ancho={ancho} />
        </Grafico>

        {/* 3. Tendencia acumulada */}
        <Grafico
          titulo="Acumulado del ciclo"
          bajada={`${r.etiqueta} vs. ${r.etiquetaAnterior}`}
          hayDatos={acumulado.length > 1}
        >
          <LineaTendencia
            actual={acumulado} anterior={acumuladoAnterior} ancho={ancho}
            etiquetaActual={r.etiqueta} etiquetaAnterior={r.etiquetaAnterior}
          />
        </Grafico>

        {/* 4. Cascada: a donde se fue la plata */}
        <Grafico
          titulo="¿A dónde se fue la plata?"
          bajada="Ingreso → fijos → variables → ahorro → sobrante"
          hayDatos={totales.ingresos > 0 || r.ingresoMensual > 0}
        >
          <Cascada pasos={cascada} ancho={ancho - esp.lg * 2} />
        </Grafico>

        {/* 5. Barras apiladas */}
        <Grafico titulo="Composición por categoría" bajada={`Últimos ${nCiclos} ciclos`} hayDatos={apiladas.length > 0}>
          <BarrasApiladas
            etiquetas={ciclos.map((c) => capitalizar(fmtMesCorto(c.desde)))}
            series={apiladas}
            ancho={ancho}
          />
        </Grafico>

        {/* 6. Presupuestado vs real, ordenado por desviacion */}
        <Grafico
          titulo="Presupuestado vs. real"
          bajada="Ordenado por qué tanto te desviaste"
          hayDatos={r.presupuestos.length > 0}
          mensajeVacio="Asigna presupuestos a tus categorías para ver esta comparación."
          accion={
            <Pressable onPress={() => router.push('/ajustes/presupuestos')} accessibilityRole="button">
              <Texto variante="etiqueta" color="acento">Editar</Texto>
            </Pressable>
          }
        >
          <View style={{ gap: esp.md }}>
            {r.presupuestos.map((p) => (
              <View key={p.categoriaId ?? p.nombre} style={{ gap: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: esp.sm }}>
                  <IconoCategoria icono={p.icono} color={p.color} tam={26} />
                  <Texto variante="cuerpo" style={{ flex: 1 }} numberOfLines={1}>{p.nombre}</Texto>
                  <Texto variante="etiqueta" style={{ color: p.estado.color }}>
                    {formatoPct(p.estado.fraccion * 100)}
                  </Texto>
                </View>
                <BarraProgreso valor={p.estado.fraccion} color={p.estado.color} />
                <View style={{ flexDirection: 'row' }}>
                  <Texto variante="micro" color="tenue" style={{ flex: 1 }}>
                    {formatoCOP(p.total)} de {formatoCOP(p.presupuesto)}
                  </Texto>
                  <Texto variante="micro" color={p.estado.restante < 0 ? 'rojo' : 'verde'}>
                    {p.estado.restante < 0 ? 'Excedido ' : 'Quedan '}{formatoCOP(Math.abs(p.estado.restante))}
                  </Texto>
                </View>
              </View>
            ))}
          </View>
        </Grafico>

        {/* 7. Mapa de calor por dia */}
        <Grafico
          titulo="Mapa de calor del ciclo"
          bajada="Intensidad del gasto día a día"
          hayDatos={diasCalor.some((d) => d.total > 0)}
        >
          <MapaCalor dias={diasCalor} ancho={ancho - esp.lg * 2} />
        </Grafico>

        {/* 8. Anillos de metas */}
        <Grafico
          titulo="Progreso de tus metas"
          hayDatos={anillos.length > 0}
          mensajeVacio="Crea una meta de ahorro y verás su progreso aquí."
          accion={
            <Pressable onPress={() => router.push('/metas')} accessibilityRole="button">
              <Texto variante="etiqueta" color="acento">Ver</Texto>
            </Pressable>
          }
        >
          <AnillosMetas metas={anillos} onPress={(id) => router.push(`/meta/${id}`)} />
        </Grafico>

        {/* 9. Top 10 comercios */}
        <Grafico titulo="Donde más gastas" bajada="Top 10 del periodo" hayDatos={top.length > 0}>
          <TopComercios items={top} />
        </Grafico>

        {/* 10. Proyeccion de cierre */}
        <Grafico
          titulo="Proyección de cierre"
          bajada="Si sigues al ritmo actual"
          hayDatos={acumulado.length > 2}
          mensajeVacio="Necesitamos algunos días de movimientos para proyectar el cierre."
        >
          <Proyeccion
            acumulado={acumulado}
            diasTotales={r.prog.total}
            presupuesto={r.presupuestoTotal > 0 ? r.presupuestoTotal : undefined}
            ancho={ancho}
          />
        </Grafico>

        {/* Medios de pago */}
        <Grafico titulo="Por medio de pago" hayDatos={medios.length > 0}>
          <View style={{ gap: esp.md }}>
            {medios.map((m) => {
              const info = MEDIOS_PAGO.find((x) => x.id === m.medio);
              const total = medios.reduce((a, x) => a + x.total, 0);
              return (
                <View key={m.medio} style={{ gap: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: esp.sm }}>
                    <Ionicons name={(info?.icono as any) ?? 'ellipsis-horizontal'} size={16} color={info?.color ?? t.textoTenue} />
                    <Texto variante="cuerpo" style={{ flex: 1 }}>{info?.nombre ?? m.medio}</Texto>
                    <Texto variante="etiqueta">{formatoCOP(m.total)}</Texto>
                  </View>
                  <BarraProgreso valor={m.total / Math.max(1, total)} color={info?.color ?? t.acento} alto={6} />
                </View>
              );
            })}
          </View>
        </Grafico>

        <Boton
          titulo="Exportar este periodo"
          icono="download-outline"
          variante="secundario"
          ancho
          onPress={() => router.push('/ajustes/datos')}
        />
        <View style={{ height: esp.lg }} />
      </ScrollView>
    </SafeAreaView>
  );
}
