import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { PasoOnboarding } from '@/ui/comp/PasoOnboarding';
import { Tarjeta } from '@/ui/comp/Tarjeta';
import { Texto } from '@/ui/comp/Texto';
import { Boton } from '@/ui/comp/Boton';
import { Campo } from '@/ui/comp/Campo';
import { Chip } from '@/ui/comp/Chip';
import { Deslizador } from '@/ui/comp/Deslizador';
import { BarraSegmentada } from '@/ui/comp/BarraProgreso';
import { Hoja } from '@/ui/comp/Hoja';
import { useTema } from '@/ui/TemaProvider';
import { esp } from '@/ui/tema';
import { formatoCOP } from '@/core/dinero';
import { ingresoMensualEstimado } from '@/core/ingresos';
import { COLORES_BOLSILLO } from '@/constantes/paleta';
import { useOnboarding } from '@/store/onboarding';

export default function PasoDistribucion() {
  const t = useTema();
  const { ingresos, bolsillos, setBolsillos, aplicarPlantilla } = useOnboarding();
  const [hoja, setHoja] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');

  const ingresoMensual = useMemo(
    () => ingresoMensualEstimado(ingresos.map((i) => ({ monto: i.monto, frecuencia: i.frecuencia }))),
    [ingresos],
  );

  const suma = bolsillos.reduce((a, b) => a + b.porcentaje, 0);
  const exacto = Math.abs(suma - 100) < 0.01;
  const falta = Math.round((100 - suma) * 10) / 10;

  const cambiar = (idx: number, v: number) => {
    const copia = bolsillos.map((b, i) => (i === idx ? { ...b, porcentaje: v } : b));
    setBolsillos(copia);
  };

  /** Reparte el faltante proporcionalmente para cerrar exactamente en 100%. */
  const ajustarA100 = () => {
    if (suma <= 0) return;
    const factor = 100 / suma;
    const escalados = bolsillos.map((b) => ({ ...b, porcentaje: Math.round(b.porcentaje * factor) }));
    const dif = 100 - escalados.reduce((a, b) => a + b.porcentaje, 0);
    if (dif !== 0) {
      const i = escalados.reduce((mayor, b, k, arr) => (b.porcentaje > arr[mayor].porcentaje ? k : mayor), 0);
      escalados[i] = { ...escalados[i], porcentaje: escalados[i].porcentaje + dif };
    }
    setBolsillos(escalados);
  };

  const agregarBolsillo = () => {
    if (!nuevoNombre.trim()) return;
    setBolsillos([...bolsillos, {
      nombre: nuevoNombre.trim(), tipo: 'personalizado', porcentaje: 0,
      color: COLORES_BOLSILLO.personalizado, icono: 'pricetag-outline',
    }]);
    setNuevoNombre('');
    setHoja(false);
  };

  return (
    <PasoOnboarding
      paso={2}
      titulo="¿Cómo repartes tu plata?"
      bajada="Define qué porcentaje del ingreso va a cada bolsillo. Los porcentajes deben sumar 100%."
      pie={
        <>
          {!exacto ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: esp.sm }}>
              <Ionicons name="alert-circle" size={16} color={t.ambar} />
              <Texto variante="etiqueta" color="ambar" style={{ flex: 1 }}>
                {falta > 0 ? `Te falta asignar ${falta}%` : `Te pasaste ${Math.abs(falta)}%`}
              </Texto>
              <Pressable onPress={ajustarA100} accessibilityRole="button">
                <Texto variante="etiqueta" color="acento">Ajustar a 100%</Texto>
              </Pressable>
            </View>
          ) : null}
          <Boton titulo="Continuar" ancho deshabilitado={!exacto} onPress={() => router.push('/onboarding/categorias')} />
        </>
      }
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: esp.md, paddingBottom: esp.lg }}>
        <View style={{ flexDirection: 'row', gap: esp.sm }}>
          <Chip texto="50/30/20" onPress={() => aplicarPlantilla('50/30/20')} compacto />
          <Chip texto="60/20/20" onPress={() => aplicarPlantilla('60/20/20')} compacto />
          <Chip texto="Personalizado" activo onPress={() => {}} compacto />
        </View>

        <Tarjeta style={{ gap: esp.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Texto variante="seccion" style={{ flex: 1 }}>Distribución</Texto>
            <Texto variante="montoGrande" style={{ fontSize: 20 }} color={exacto ? 'verde' : 'ambar'}>
              {Math.round(suma)}%
            </Texto>
          </View>
          <BarraSegmentada segmentos={bolsillos.map((b) => ({ valor: b.porcentaje, color: b.color }))} />
          <Texto variante="micro" color="tenue">
            Sobre un ingreso mensual estimado de {formatoCOP(ingresoMensual)}
          </Texto>
        </Tarjeta>

        {bolsillos.map((b, idx) => (
          <Tarjeta key={b.nombre + idx} style={{ gap: esp.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: esp.sm }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: b.color }} />
              <Texto variante="cuerpo" style={{ flex: 1 }}>{b.nombre}</Texto>
              <Texto variante="monto" style={{ fontSize: 15 }}>{Math.round(b.porcentaje)}%</Texto>
            </View>
            <Deslizador
              valor={b.porcentaje}
              color={b.color}
              max={100}
              onChange={(v) => cambiar(idx, v)}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Texto variante="micro" color="tenue" style={{ flex: 1 }}>Equivale a</Texto>
              <Texto variante="etiqueta" color="suave">
                {formatoCOP(Math.round(ingresoMensual * b.porcentaje / 100))} al mes
              </Texto>
            </View>
          </Tarjeta>
        ))}

        <Boton titulo="Crear bolsillo personalizado" icono="add" variante="fantasma" ancho onPress={() => setHoja(true)} />
      </ScrollView>

      <Hoja visible={hoja} onCerrar={() => setHoja(false)} titulo="Nuevo bolsillo" alto="45%">
        <Campo etiqueta="Nombre" value={nuevoNombre} onChangeText={setNuevoNombre} placeholder="Educación de los niños, viajes…" />
        <Boton titulo="Crear" ancho onPress={agregarBolsillo} />
      </Hoja>
    </PasoOnboarding>
  );
}
