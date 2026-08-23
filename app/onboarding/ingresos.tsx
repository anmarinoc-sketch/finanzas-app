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
import { EstadoVacio } from '@/ui/comp/EstadoVacio';
import { useTema } from '@/ui/TemaProvider';
import { esp } from '@/ui/tema';
import { formatoCOP, parsearMonto, separarMiles } from '@/core/dinero';
import { aMensual, ingresoMensualEstimado } from '@/core/ingresos';
import { useOnboarding } from '@/store/onboarding';
import type { Frecuencia } from '@/db/schema';

const FRECUENCIAS: { id: Frecuencia; texto: string }[] = [
  { id: 'mensual', texto: 'Mensual' },
  { id: 'quincenal', texto: 'Quincenal' },
  { id: 'semanal', texto: 'Semanal' },
  { id: 'ocasional', texto: 'Variable / ocasional' },
];

export default function PasoIngresos() {
  const t = useTema();
  const { ingresos, agregarIngreso, quitarIngreso, nombre, set } = useOnboarding();
  const [nom, setNom] = useState('');
  const [monto, setMonto] = useState('');
  const [frec, setFrec] = useState<Frecuencia>('mensual');
  const [error, setError] = useState<string | null>(null);

  const total = useMemo(
    () => ingresoMensualEstimado(ingresos.map((i) => ({ monto: i.monto, frecuencia: i.frecuencia }))),
    [ingresos],
  );

  /** ¿Hay un ingreso escrito en el formulario pero todavía sin agregar? */
  const pendiente = nom.trim().length > 0 && parsearMonto(monto) > 0;

  const agregar = () => {
    const m = parsearMonto(monto);
    if (!nom.trim()) return setError('Ponle un nombre al ingreso.');
    if (m <= 0) return setError('El monto debe ser mayor que cero.');
    setError(null);
    agregarIngreso({ nombre: nom.trim(), monto: Math.round(m), frecuencia: frec });
    setNom(''); setMonto(''); setFrec('mensual');
  };

  /**
   * Con un solo ingreso basta para continuar. Si el usuario lo escribió pero
   * no pulsó "Agregar", se agrega solo: obligarle a pulsar dos botones para
   * un caso tan común era una trampa.
   */
  const continuar = () => {
    if (pendiente) {
      agregarIngreso({ nombre: nom.trim(), monto: Math.round(parsearMonto(monto)), frecuencia: frec });
      setNom(''); setMonto(''); setFrec('mensual');
    }
    router.push('/onboarding/distribucion');
  };

  return (
    <PasoOnboarding
      paso={1}
      conVolver={false}
      titulo="¿Cuánto entra al mes?"
      bajada="Registra tus fuentes de ingreso. Con esto la app calcula tus bolsillos, tus presupuestos y cuánto puedes ahorrar."
      pie={
        <>
          <Boton
            titulo={ingresos.length === 0 && !pendiente ? 'Escribe tu ingreso para continuar' : 'Continuar'}
            ancho
            deshabilitado={ingresos.length === 0 && !pendiente}
            onPress={continuar}
          />
          <Pressable onPress={() => router.push('/onboarding/distribucion')} accessibilityRole="button">
            <Texto variante="etiqueta" color="tenue" style={{ textAlign: 'center', paddingVertical: 6 }}>
              Prefiero configurarlo después
            </Texto>
          </Pressable>
        </>
      }
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: esp.md, paddingBottom: esp.lg }}>
        <Campo
          etiqueta="¿Cómo te llamas? (opcional)"
          value={nombre}
          onChangeText={(v) => set({ nombre: v })}
          placeholder="Tu nombre"
        />

        <Tarjeta style={{ gap: esp.md }}>
          <Texto variante="seccion">Nuevo ingreso</Texto>
          <Campo etiqueta="Nombre" value={nom} onChangeText={setNom} placeholder="Salario, arriendo, freelance…" />
          <Campo
            etiqueta="Monto"
            value={monto ? separarMiles(parsearMonto(monto)) : ''}
            onChangeText={(v) => setMonto(v)}
            keyboardType="number-pad"
            placeholder="0"
            error={error}
          />
          <View style={{ gap: 6 }}>
            <Texto variante="etiqueta" color="suave">Frecuencia</Texto>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: esp.sm }}>
              {FRECUENCIAS.map((f) => (
                <Chip key={f.id} texto={f.texto} activo={frec === f.id} onPress={() => setFrec(f.id)} compacto />
              ))}
            </View>
          </View>
          <Boton
            titulo={ingresos.length ? 'Agregar otro ingreso' : 'Agregar y registrar otro'}
            icono="add"
            onPress={agregar}
            variante="secundario"
            ancho
          />
          <Texto variante="micro" color="tenue" style={{ textAlign: 'center' }}>
            Con un solo ingreso es suficiente. Usa este botón solo si tienes más de una fuente.
          </Texto>
        </Tarjeta>

        {ingresos.length === 0 ? (
          <EstadoVacio
            titulo="Sin ingresos todavía"
            mensaje="Agrega tu salario o cualquier entrada fija. Si tus ingresos son variables, elige “Variable / ocasional”."
          />
        ) : (
          <Tarjeta style={{ gap: esp.md }}>
            <Texto variante="seccion">Tus ingresos</Texto>
            {ingresos.map((i, idx) => (
              <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: esp.md }}>
                <View style={{ flex: 1 }}>
                  <Texto variante="cuerpo">{i.nombre}</Texto>
                  <Texto variante="micro" color="tenue">
                    {FRECUENCIAS.find((f) => f.id === i.frecuencia)?.texto} ·{' '}
                    {i.frecuencia === 'ocasional' ? 'no se proyecta' : `${formatoCOP(Math.round(aMensual(i.monto, i.frecuencia)))} al mes`}
                  </Texto>
                </View>
                <Texto variante="monto">{formatoCOP(i.monto)}</Texto>
                <Pressable onPress={() => quitarIngreso(idx)} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Quitar ${i.nombre}`}>
                  <Ionicons name="trash-outline" size={18} color={t.rojo} />
                </Pressable>
              </View>
            ))}
            <View style={{ height: 1, backgroundColor: t.borde }} />
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Texto variante="etiqueta" color="suave" style={{ flex: 1 }}>Ingreso mensual estimado</Texto>
              <Texto variante="montoGrande" style={{ fontSize: 22 }} color="verde">{formatoCOP(total)}</Texto>
            </View>
          </Tarjeta>
        )}
      </ScrollView>
    </PasoOnboarding>
  );
}
