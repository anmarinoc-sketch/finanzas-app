import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';

import { useTema } from '@/ui/TemaProvider';
import { Encabezado } from '@/ui/comp/Encabezado';
import { Texto } from '@/ui/comp/Texto';
import { Tarjeta } from '@/ui/comp/Tarjeta';
import { Boton } from '@/ui/comp/Boton';
import { Campo, Interruptor } from '@/ui/comp/Campo';
import { Chip } from '@/ui/comp/Chip';
import { Hoja } from '@/ui/comp/Hoja';
import { EstadoVacio } from '@/ui/comp/EstadoVacio';
import { esp } from '@/ui/tema';

import { formatoCOP, parsearMonto, separarMiles } from '@/core/dinero';
import { aMensual } from '@/core/ingresos';
import { actualizarIngreso, borrarIngreso, crearIngreso } from '@/db/crud';
import { useDatos, conRefresco } from '@/store/datos';
import type { Frecuencia } from '@/db/schema';

const FRECUENCIAS: { id: Frecuencia; texto: string }[] = [
  { id: 'mensual', texto: 'Mensual' },
  { id: 'quincenal', texto: 'Quincenal' },
  { id: 'semanal', texto: 'Semanal' },
  { id: 'bimestral', texto: 'Bimestral' },
  { id: 'anual', texto: 'Anual' },
  { id: 'ocasional', texto: 'Variable / ocasional' },
];

export default function AjustesIngresos() {
  const t = useTema();
  const { ingresos, ingresoMensual, refrescar } = useDatos();
  const [hoja, setHoja] = useState(false);
  const [nombre, setNombre] = useState('');
  const [monto, setMonto] = useState('');
  const [frecuencia, setFrecuencia] = useState<Frecuencia>('mensual');

  useFocusEffect(useCallback(() => { refrescar(); }, [refrescar]));

  const guardar = () => {
    const m = parsearMonto(monto);
    if (!nombre.trim()) return Alert.alert('Falta el nombre', 'Ponle un nombre al ingreso.');
    if (m <= 0) return Alert.alert('Monto inválido', 'El monto debe ser mayor que cero.');
    conRefresco(() => crearIngreso({
      nombre: nombre.trim(), monto: Math.round(m), frecuencia,
      activo: 1, fechaInicio: format(new Date(), 'yyyy-MM-dd'), cuentaId: null,
    } as any));
    setNombre(''); setMonto(''); setFrecuencia('mensual');
    setHoja(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.fondo }} edges={['top']}>
      <Encabezado titulo="Ingresos" subtitulo="Base de todos tus cálculos" accion="Nuevo" iconoAccion="add" onAccion={() => setHoja(true)} />
      <ScrollView contentContainerStyle={{ padding: esp.lg, gap: esp.md, paddingBottom: esp.xxl }}>
        <Tarjeta style={{ gap: 4 }}>
          <Texto variante="micro" color="tenue">INGRESO MENSUAL ESTIMADO</Texto>
          <Texto variante="montoHero" color="verde">{formatoCOP(ingresoMensual)}</Texto>
          <Texto variante="micro" color="tenue">
            Los ingresos ocasionales no se proyectan: solo cuentan cuando los registras como movimiento.
          </Texto>
        </Tarjeta>

        {ingresos.length === 0 ? (
          <Tarjeta>
            <EstadoVacio
              titulo="Sin ingresos registrados"
              mensaje="Agrega tu salario o cualquier entrada fija para que la app calcule tus bolsillos y tus metas."
              accion="Agregar ingreso"
              onAccion={() => setHoja(true)}
            />
          </Tarjeta>
        ) : ingresos.map((i) => (
          <Tarjeta key={i.id} style={{ flexDirection: 'row', alignItems: 'center', gap: esp.md, opacity: i.activo ? 1 : 0.55 }}>
            <View style={{ flex: 1 }}>
              <Texto variante="cuerpo">{i.nombre}</Texto>
              <Texto variante="micro" color="tenue">
                {FRECUENCIAS.find((f) => f.id === i.frecuencia)?.texto}
                {i.frecuencia !== 'ocasional' ? ` · ${formatoCOP(Math.round(aMensual(i.monto, i.frecuencia)))}/mes` : ''}
              </Texto>
            </View>
            <Texto variante="monto">{formatoCOP(i.monto)}</Texto>
            <Interruptor valor={!!i.activo} onChange={(v) => conRefresco(() => actualizarIngreso(i.id, { activo: v ? 1 : 0 }))} />
            <Pressable
              onPress={() => Alert.alert('Eliminar ingreso', `¿Borrar "${i.nombre}"?`, [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Eliminar', style: 'destructive', onPress: () => conRefresco(() => borrarIngreso(i.id)) },
              ])}
              hitSlop={10} accessibilityRole="button" accessibilityLabel={`Eliminar ${i.nombre}`}
            >
              <Ionicons name="trash-outline" size={18} color={t.textoTenue} />
            </Pressable>
          </Tarjeta>
        ))}
      </ScrollView>

      <Hoja visible={hoja} onCerrar={() => setHoja(false)} titulo="Nuevo ingreso" alto="65%">
        <Campo etiqueta="Nombre" value={nombre} onChangeText={setNombre} placeholder="Salario, arriendo, freelance…" />
        <Campo
          etiqueta="Monto"
          value={monto ? separarMiles(parsearMonto(monto)) : ''}
          onChangeText={setMonto} keyboardType="number-pad" placeholder="0"
        />
        <View style={{ gap: 6 }}>
          <Texto variante="etiqueta" color="suave">Frecuencia</Texto>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: esp.sm }}>
            {FRECUENCIAS.map((f) => (
              <Chip key={f.id} texto={f.texto} compacto activo={frecuencia === f.id} onPress={() => setFrecuencia(f.id)} />
            ))}
          </View>
        </View>
        <Boton titulo="Guardar" ancho onPress={guardar} />
      </Hoja>
    </SafeAreaView>
  );
}
