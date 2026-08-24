import { useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useTema } from '@/ui/TemaProvider';
import { Encabezado } from '@/ui/comp/Encabezado';
import { Texto } from '@/ui/comp/Texto';
import { Tarjeta } from '@/ui/comp/Tarjeta';
import { EstadoVacio } from '@/ui/comp/EstadoVacio';
import { esp, radio } from '@/ui/tema';

import { generarInsights, resumenCierre, type Insight } from '@/core/insights';
import { calcularMeta } from '@/core/metas';
import { ultimosCiclos, moverCiclo, etiquetaCiclo } from '@/core/fechas';
import { gastoPorCategoria, totalCategoriaEnRango, totalesPeriodo } from '@/db/consultas';
import { useResumen } from '@/hooks/useResumen';
import { useAjustes } from '@/store/ajustes';
import { useDatos } from '@/store/datos';

export default function Insights() {
  const t = useTema();
  const diaInicio = useAjustes((s) => s.diaInicioCiclo);
  const { metas, revision } = useDatos();
  const r = useResumen();

  const insights = useMemo<Insight[]>(() => {
    // Promedio de cada categoria en los 3 ciclos anteriores (sin contar el actual).
    const previos = ultimosCiclos(4, diaInicio).slice(0, 3);
    const categorias = r.categorias.map((c) => ({
      nombre: c.nombre,
      total: c.total,
      promedio: previos.length
        ? Math.round(previos.reduce((a, ci) => a + totalCategoriaEnRango(c.categoriaId, ci), 0) / previos.length)
        : 0,
    }));

    return generarInsights({
      ingresoMensual: r.ingresoMensual || r.totales.ingresos,
      gastoPeriodo: r.totales.gastos,
      gastoFijos: r.fijos.fijos,
      ahorroPeriodo: r.totales.ahorro,
      categorias,
      porDiaSemana: r.porDiaSemana,
      metas: metas.map((m) => {
        const c = calcularMeta({
          montoObjetivo: m.montoObjetivo, montoActual: m.montoActual,
          fechaLimite: m.fechaLimite ? new Date(m.fechaLimite + 'T00:00:00') : null,
          fechaCreacion: new Date(m.fechaCreacion + 'T00:00:00'),
        });
        return { nombre: m.nombre, desfase: c.desfase, estado: c.estado };
      }),
      suscripcionesAnual: r.suscripcionesAnual,
      cuotasMensuales: r.cargaMensualDeuda,
      diasTranscurridos: r.prog.transcurridos,
      diasTotales: r.prog.total,
    });
  }, [r, metas, diaInicio, revision]);

  // Cierre del ciclo anterior.
  const cierre = useMemo(() => {
    const anterior = moverCiclo(r.rango, -1, diaInicio);
    const tot = totalesPeriodo(anterior);
    if (tot.gastos === 0 && tot.ingresos === 0) return null;
    const excedidas = gastoPorCategoria(anterior)
      .filter((c) => c.presupuesto > 0 && c.total > c.presupuesto)
      .map((c) => ({ nombre: c.nombre, exceso: c.total - c.presupuesto }))
      .sort((a, b) => b.exceso - a.exceso);
    return resumenCierre({
      gastos: tot.gastos, ingresos: tot.ingresos, ahorro: tot.ahorro,
      excedidas, etiquetaPeriodo: etiquetaCiclo(anterior, diaInicio),
    });
  }, [r.rango, diaInicio, revision]);

  const colorTono = (tono: Insight['tono']) =>
    tono === 'bueno' ? t.verde : tono === 'malo' ? t.rojo : tono === 'alerta' ? t.ambar : t.azul;
  const fondoTono = (tono: Insight['tono']) =>
    tono === 'bueno' ? t.verdeFondo : tono === 'malo' ? t.rojoFondo : tono === 'alerta' ? t.ambarFondo : t.acentoFondo;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.fondo }} edges={['top', 'bottom']}>
      <Encabezado titulo="Insights" subtitulo={`Lo que dicen tus números · ${r.etiqueta}`} />
      <ScrollView contentContainerStyle={{ padding: esp.lg, gap: esp.md, paddingBottom: esp.xxl }}>
        {cierre ? (
          <Tarjeta style={{ gap: esp.sm, borderLeftWidth: 4, borderLeftColor: t.acento }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: esp.sm }}>
              <Ionicons name="calendar-clear-outline" size={18} color={t.acento} />
              <Texto variante="seccion">Cierre del periodo anterior</Texto>
            </View>
            <Texto variante="cuerpo" color="suave" style={{ lineHeight: 22 }}>{cierre}</Texto>
          </Tarjeta>
        ) : null}

        {insights.length === 0 ? (
          <Tarjeta>
            <EstadoVacio
              titulo="Todavía no hay suficiente información"
              mensaje="Registra movimientos durante unas semanas y aquí verás observaciones concretas sobre tus hábitos de gasto."
            />
          </Tarjeta>
        ) : insights.map((i) => (
          <Tarjeta key={i.id} style={{ flexDirection: 'row', gap: esp.md, alignItems: 'flex-start' }}>
            <View style={{
              width: 40, height: 40, borderRadius: radio.md,
              backgroundColor: fondoTono(i.tono), alignItems: 'center', justifyContent: 'center',
            }}>
              <Ionicons name={i.icono as any} size={20} color={colorTono(i.tono)} />
            </View>
            <Texto variante="cuerpo" color="suave" style={{ flex: 1, lineHeight: 22 }}>{i.texto}</Texto>
          </Tarjeta>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
