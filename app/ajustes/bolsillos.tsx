import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTema } from '@/ui/TemaProvider';
import { Encabezado } from '@/ui/comp/Encabezado';
import { Texto } from '@/ui/comp/Texto';
import { Tarjeta } from '@/ui/comp/Tarjeta';
import { Boton } from '@/ui/comp/Boton';
import { Campo } from '@/ui/comp/Campo';
import { Chip } from '@/ui/comp/Chip';
import { Hoja } from '@/ui/comp/Hoja';
import { Deslizador } from '@/ui/comp/Deslizador';
import { BarraSegmentada } from '@/ui/comp/BarraProgreso';
import { esp } from '@/ui/tema';

import { formatoCOP } from '@/core/dinero';
import { COLORES_BOLSILLO } from '@/constantes/paleta';
import { guardarDistribucion } from '@/db/crud';
import { useDatos, conRefresco } from '@/store/datos';
import type { Bolsillo } from '@/db/schema';

export default function AjustesBolsillos() {
  const t = useTema();
  const { bolsillos, ingresoMensual, refrescar, revision } = useDatos();
  const [lista, setLista] = useState<Bolsillo[]>([]);
  const [hoja, setHoja] = useState(false);
  const [nuevo, setNuevo] = useState('');

  useFocusEffect(useCallback(() => { refrescar(); }, [refrescar]));
  useEffect(() => { setLista(bolsillos); }, [bolsillos, revision]);

  const suma = lista.reduce((a, b) => a + b.porcentaje, 0);
  // Comparación por contenido: dice si hay algo pendiente de guardar.
  const huella = (l: Bolsillo[]) => l.map((b) => `${b.id}:${b.nombre}:${b.porcentaje}`).join('|');
  const sinGuardar = huella(lista) !== huella(bolsillos);
  const exacto = Math.abs(suma - 100) < 0.01;

  const cambiar = (id: number, v: number) =>
    setLista((l) => l.map((b) => (b.id === id ? { ...b, porcentaje: v } : b)));

  const ajustarA100 = () => {
    if (suma <= 0) return;
    const factor = 100 / suma;
    const escalados = lista.map((b) => ({ ...b, porcentaje: Math.round(b.porcentaje * factor) }));
    const dif = 100 - escalados.reduce((a, b) => a + b.porcentaje, 0);
    if (dif !== 0) {
      const i = escalados.reduce((may, b, k, arr) => (b.porcentaje > arr[may].porcentaje ? k : may), 0);
      escalados[i].porcentaje += dif;
    }
    setLista(escalados);
  };

  /** Se puede quitar cualquier bolsillo, tambien los que vienen por defecto. */
  const eliminar = (id: number, nombre: string) => {
    if (lista.length === 1) {
      Alert.alert('No se puede', 'Necesitas al menos un bolsillo.');
      return;
    }
    Alert.alert(`Eliminar "${nombre}"`, 'Su porcentaje se reparte entre los demás. Las categorías que estaban en este bolsillo quedarán sin asignar.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => setLista((l) => {
          const fuera = l.find((x) => x.id === id);
          const resto = l.filter((x) => x.id !== id);
          if (!fuera || !resto.length) return resto;
          // Sin repartir, el total dejaba de sumar 100 y "Guardar" quedaba
          // deshabilitado: el borrado parecia deshacerse solo.
          const sumaResto = resto.reduce((a, x) => a + x.porcentaje, 0);
          const repartido = sumaResto > 0
            ? resto.map((x) => ({ ...x, porcentaje: Math.round(x.porcentaje + (fuera.porcentaje * x.porcentaje) / sumaResto) }))
            : resto.map((x) => ({ ...x, porcentaje: Math.round(100 / resto.length) }));
          const dif = 100 - repartido.reduce((a, x) => a + x.porcentaje, 0);
          if (dif !== 0) {
            const may = repartido.reduce((m, x, k, arr) => (x.porcentaje > arr[m].porcentaje ? k : m), 0);
            repartido[may] = { ...repartido[may], porcentaje: repartido[may].porcentaje + dif };
          }
          return repartido;
        }),
      },
    ]);
  };

  const guardar = () => {
    if (!exacto) return Alert.alert('No suma 100%', 'Ajusta los porcentajes hasta que sumen exactamente 100%.');
    conRefresco(() => guardarDistribucion(lista.map((b, i) => ({
      id: b.id, nombre: b.nombre, porcentaje: b.porcentaje, color: b.color,
      icono: b.icono, tipo: b.tipo, orden: i,
    }))));
    router.back();
  };

  const agregar = () => {
    if (!nuevo.trim()) return;
    setLista((l) => [...l, {
      id: -Date.now(), nombre: nuevo.trim(), porcentaje: 0,
      color: COLORES_BOLSILLO.personalizado, icono: 'pricetag-outline',
      tipo: 'personalizado', orden: l.length,
    } as Bolsillo]);
    setNuevo('');
    setHoja(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.fondo }} edges={['top', 'bottom']}>
      <Encabezado titulo="Bolsillos" subtitulo="Cómo repartes tu ingreso" />
      <ScrollView contentContainerStyle={{ padding: esp.lg, gap: esp.md, paddingBottom: esp.xxl }}>
        <Tarjeta style={{ gap: esp.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Texto variante="seccion" style={{ flex: 1 }}>Distribución</Texto>
            <Texto variante="montoGrande" style={{ fontSize: 20 }} color={exacto ? 'verde' : 'ambar'}>
              {Math.round(suma)}%
            </Texto>
          </View>
          <BarraSegmentada segmentos={lista.map((b) => ({ valor: b.porcentaje, color: b.color }))} />
          <Texto variante="micro" color="tenue">Sobre un ingreso mensual de {formatoCOP(ingresoMensual)}</Texto>
          {!exacto ? (
            <Pressable onPress={ajustarA100} accessibilityRole="button">
              <Texto variante="etiqueta" color="acento">Ajustar automáticamente a 100%</Texto>
            </Pressable>
          ) : null}
        </Tarjeta>

        {lista.map((b) => (
          <Tarjeta key={b.id} style={{ gap: esp.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: esp.sm }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: b.color }} />
              <Texto variante="cuerpo" style={{ flex: 1 }}>{b.nombre}</Texto>
              <Texto variante="monto" style={{ fontSize: 15 }}>{Math.round(b.porcentaje)}%</Texto>
              <Pressable
                onPress={() => eliminar(b.id, b.nombre)}
                hitSlop={8} accessibilityRole="button" accessibilityLabel={`Eliminar el bolsillo ${b.nombre}`}
              >
                <Ionicons name="trash-outline" size={18} color={t.textoTenue} />
              </Pressable>
            </View>
            <Deslizador valor={b.porcentaje} color={b.color} max={100} onChange={(v) => cambiar(b.id, v)} />
            <Texto variante="micro" color="tenue">
              {formatoCOP(Math.round(ingresoMensual * b.porcentaje / 100))} al mes
            </Texto>
          </Tarjeta>
        ))}

        <View style={{ flexDirection: 'row', gap: esp.sm }}>
          <Chip texto="50/30/20" compacto onPress={() => setLista((l) => aplicarPlantilla(l, [50, 30, 12, 5, 3]))} />
          <Chip texto="60/20/20" compacto onPress={() => setLista((l) => aplicarPlantilla(l, [60, 20, 12, 5, 3]))} />
        </View>

        <Boton titulo="Crear bolsillo" icono="add" variante="fantasma" ancho onPress={() => setHoja(true)} />
        {sinGuardar ? (
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: esp.sm,
            backgroundColor: t.ambarFondo, borderRadius: 12, padding: esp.md,
          }}>
            <Ionicons name="alert-circle" size={18} color={t.ambar} />
            <Texto variante="micro" color="ambar" style={{ flex: 1 }}>
              Tienes cambios sin guardar. Pulsa &quot;Guardar cambios&quot; o se perderán al salir.
            </Texto>
          </View>
        ) : null}
        <Boton
          titulo={sinGuardar ? 'Guardar cambios' : 'Guardado'}
          ancho
          deshabilitado={!exacto || !sinGuardar}
          onPress={guardar}
        />
      </ScrollView>

      <Hoja visible={hoja} onCerrar={() => setHoja(false)} titulo="Nuevo bolsillo" alto="45%">
        <Campo etiqueta="Nombre" value={nuevo} onChangeText={setNuevo} placeholder="Educación, viajes, mascotas…" />
        <Boton titulo="Crear" ancho onPress={agregar} />
      </Hoja>
    </SafeAreaView>
  );
}

/** Aplica una plantilla respetando el orden base (necesidades, ocio, ahorro, imprevistos, deudas). */
function aplicarPlantilla(lista: Bolsillo[], valores: number[]): Bolsillo[] {
  const orden = ['necesidades', 'ocio', 'ahorro', 'imprevistos', 'deudas'];
  return lista.map((b) => {
    const i = orden.indexOf(b.tipo);
    return { ...b, porcentaje: i >= 0 ? valores[i] ?? 0 : 0 };
  });
}
