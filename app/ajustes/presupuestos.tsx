import { useCallback, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useTema } from '@/ui/TemaProvider';
import { Encabezado } from '@/ui/comp/Encabezado';
import { Texto } from '@/ui/comp/Texto';
import { Tarjeta } from '@/ui/comp/Tarjeta';
import { Campo } from '@/ui/comp/Campo';
import { Boton } from '@/ui/comp/Boton';
import { IconoCategoria } from '@/ui/comp/IconoCategoria';
import { esp, radio } from '@/ui/tema';

import { formatoCOP, parsearMonto, separarMiles } from '@/core/dinero';
import { actualizarCategoria } from '@/db/crud';
import { gastoPorCategoria } from '@/db/consultas';
import { ultimosCiclos } from '@/core/fechas';
import { useAjustes } from '@/store/ajustes';
import { useDatos, conRefresco } from '@/store/datos';

export default function Presupuestos() {
  const t = useTema();
  const diaInicio = useAjustes((s) => s.diaInicioCiclo);
  const { categoriasRaiz, ingresoMensual, revision, refrescar } = useDatos();
  const [borrador, setBorrador] = useState<Record<number, string>>({});

  useFocusEffect(useCallback(() => { refrescar(); }, [refrescar]));

  /** Promedio real de los ultimos 3 ciclos: la mejor sugerencia de presupuesto. */
  const promedios = useMemo(() => {
    const ciclos = ultimosCiclos(4, diaInicio).slice(0, 3);
    const acumulado = new Map<number, number>();
    for (const c of ciclos) {
      for (const fila of gastoPorCategoria(c)) {
        if (fila.categoriaId == null) continue;
        acumulado.set(fila.categoriaId, (acumulado.get(fila.categoriaId) ?? 0) + fila.total);
      }
    }
    const salida = new Map<number, number>();
    acumulado.forEach((v, k) => salida.set(k, Math.round(v / Math.max(1, ciclos.length))));
    return salida;
  }, [diaInicio, revision]);

  const valor = (id: number, actual: number) =>
    borrador[id] !== undefined ? borrador[id] : (actual ? String(actual) : '');

  const total = categoriasRaiz.reduce(
    (a, c) => a + Math.round(parsearMonto(valor(c.id, c.presupuestoMensual))),
    0,
  );

  const guardar = () => {
    conRefresco(() => {
      for (const c of categoriasRaiz) {
        const nuevo = Math.round(parsearMonto(valor(c.id, c.presupuestoMensual)));
        if (nuevo !== c.presupuestoMensual) actualizarCategoria(c.id, { presupuestoMensual: nuevo });
      }
    });
    setBorrador({});
  };

  const usarPromedios = () => {
    const b: Record<number, string> = {};
    for (const c of categoriasRaiz) {
      const p = promedios.get(c.id) ?? 0;
      if (p > 0) b[c.id] = String(p);
    }
    setBorrador(b);
  };

  const excede = ingresoMensual > 0 && total > ingresoMensual;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.fondo }} edges={['top']}>
      <Encabezado titulo="Presupuestos" subtitulo="Tope mensual por categoría" />
      <ScrollView contentContainerStyle={{ padding: esp.lg, gap: esp.md, paddingBottom: esp.xxl }} keyboardShouldPersistTaps="handled">
        <Tarjeta style={{ gap: esp.sm }}>
          <Texto variante="micro" color="tenue">PRESUPUESTO TOTAL</Texto>
          <Texto variante="montoHero" color={excede ? 'rojo' : 'texto'}>{formatoCOP(total)}</Texto>
          <Texto variante="micro" color={excede ? 'rojo' : 'tenue'}>
            {ingresoMensual > 0
              ? excede
                ? `Se pasa ${formatoCOP(total - ingresoMensual)} de tu ingreso mensual de ${formatoCOP(ingresoMensual)}.`
                : `Te quedan ${formatoCOP(ingresoMensual - total)} libres de tu ingreso de ${formatoCOP(ingresoMensual)}.`
              : 'Registra tus ingresos para comparar el presupuesto con lo que entra.'}
          </Texto>
        </Tarjeta>

        {promedios.size ? (
          <Tarjeta style={{ flexDirection: 'row', alignItems: 'center', gap: esp.md, borderLeftWidth: 4, borderLeftColor: t.acento }}>
            <Ionicons name="bulb-outline" size={20} color={t.acento} />
            <View style={{ flex: 1 }}>
              <Texto variante="etiqueta">Usar mi promedio real</Texto>
              <Texto variante="micro" color="tenue">Rellena cada categoría con su gasto medio de los últimos 3 ciclos.</Texto>
            </View>
            <Boton titulo="Aplicar" variante="secundario" onPress={usarPromedios} />
          </Tarjeta>
        ) : null}

        {categoriasRaiz.map((c) => {
          const prom = promedios.get(c.id) ?? 0;
          return (
            <Tarjeta key={c.id} style={{ gap: esp.sm }} padding={esp.md}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: esp.md }}>
                <IconoCategoria icono={c.icono} color={c.color} tam={34} />
                <View style={{ flex: 1 }}>
                  <Texto variante="cuerpo">{c.nombre}</Texto>
                  {prom > 0 ? (
                    <Texto variante="micro" color="tenue">Promedio real: {formatoCOP(prom)}/mes</Texto>
                  ) : (
                    <Texto variante="micro" color="tenue">Sin historial todavía</Texto>
                  )}
                </View>
              </View>
              <Campo
                value={valor(c.id, c.presupuestoMensual) ? separarMiles(parsearMonto(valor(c.id, c.presupuestoMensual))) : ''}
                onChangeText={(v) => setBorrador((b) => ({ ...b, [c.id]: v }))}
                keyboardType="number-pad"
                placeholder="Sin presupuesto"
                style={{ borderRadius: radio.md }}
              />
            </Tarjeta>
          );
        })}

        <Boton titulo="Guardar presupuestos" ancho onPress={guardar} />
      </ScrollView>
    </SafeAreaView>
  );
}
