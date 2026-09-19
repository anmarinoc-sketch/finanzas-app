import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { PasoOnboarding } from '@/ui/comp/PasoOnboarding';
import { Tarjeta } from '@/ui/comp/Tarjeta';
import { Texto } from '@/ui/comp/Texto';
import { Boton } from '@/ui/comp/Boton';
import { Campo, Interruptor } from '@/ui/comp/Campo';
import { Chip } from '@/ui/comp/Chip';
import { EstadoVacio } from '@/ui/comp/EstadoVacio';
import { useTema } from '@/ui/TemaProvider';
import { esp } from '@/ui/tema';
import { formatoCOP, parsearMonto, separarMiles } from '@/core/dinero';
import { ingresoMensualEstimado, mensualDeIngreso } from '@/core/ingresos';
import { useOnboarding } from '@/store/onboarding';
import { useAjustes } from '@/store/ajustes';
import { useDatos } from '@/store/datos';
import { contarMovimientos } from '@/db/crud';
import type { Frecuencia } from '@/db/schema';
import { conFrontera } from '@/ui/Frontera';

const FRECUENCIAS: { id: Frecuencia; texto: string }[] = [
  { id: 'mensual', texto: 'Mensual' },
  { id: 'quincenal', texto: 'Quincenal' },
  { id: 'semanal', texto: 'Semanal' },
  { id: 'ocasional', texto: 'Variable / ocasional' },
];

function PasoIngresos() {
  const t = useTema();
  const { ingresos, agregarIngreso, quitarIngreso, nombre, set } = useOnboarding();
  const aplicar = useAjustes((s) => s.aplicar);
  const refrescar = useDatos((s) => s.refrescar);
  const [nom, setNom] = useState('');
  const [monto, setMonto] = useState('');
  const [frec, setFrec] = useState<Frecuencia>('mensual');
  const [segunda, setSegunda] = useState('');
  const [quincenasDistintas, setQuincenasDistintas] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Movimientos que YA existen en el teléfono.
   *
   * Puede haber datos guardados y estar viendo este asistente: basta con que
   * algo haya puesto onboardingCompleto en 0, como la opción "volver a hacer
   * la configuración" del modo recuperación. Sin este aviso, el usuario cree
   * que perdió todo y vuelve a empezar de cero encima de sus propios datos.
   */
  const yaRegistrados = useMemo(() => contarMovimientos(), []);

  const entrarSinTocarNada = () => {
    Alert.alert(
      'Entrar sin cambiar nada',
      `Se abrirá la app con los ${yaRegistrados} movimientos que ya están guardados. No se modifica ni se borra nada.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Entrar',
          onPress: () => { aplicar({ onboardingCompleto: 1 }); refrescar(); router.replace('/'); },
        },
      ],
    );
  };

  const total = useMemo(
    () => ingresoMensualEstimado(ingresos),
    [ingresos],
  );

  const construir = (m: number) => ({
    nombre: nom.trim(),
    monto: Math.round(m),
    frecuencia: frec,
    // Solo tiene sentido en quincenal, y solo si el usuario lo marcó.
    montoSecundario: frec === 'quincenal' && quincenasDistintas && parsearMonto(segunda) > 0
      ? Math.round(parsearMonto(segunda))
      : null,
  });

  const limpiar = () => {
    setNom(''); setMonto(''); setSegunda('');
    setFrec('mensual'); setQuincenasDistintas(false);
  };

  /** ¿Hay un ingreso escrito en el formulario pero todavía sin agregar? */
  const pendiente = nom.trim().length > 0 && parsearMonto(monto) > 0;

  const agregar = () => {
    const m = parsearMonto(monto);
    if (!nom.trim()) return setError('Ponle un nombre al ingreso.');
    if (m <= 0) return setError('El monto debe ser mayor que cero.');
    setError(null);
    agregarIngreso(construir(m));
    limpiar();
  };

  /**
   * Con un solo ingreso basta para continuar. Si el usuario lo escribió pero
   * no pulsó "Agregar", se agrega solo: obligarle a pulsar dos botones para
   * un caso tan común era una trampa.
   */
  const continuar = () => {
    if (pendiente) {
      agregarIngreso(construir(parsearMonto(monto)));
      limpiar();
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
        {yaRegistrados > 0 ? (
          <Tarjeta style={{ gap: esp.md, borderLeftWidth: 4, borderLeftColor: t.verde }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: esp.sm }}>
              <Ionicons name="shield-checkmark" size={20} color={t.verde} />
              <Texto variante="seccion" style={{ flex: 1 }}>Tus datos están a salvo</Texto>
            </View>
            <Texto variante="cuerpo" color="suave" style={{ lineHeight: 21 }}>
              Este teléfono ya tiene <Texto variante="cuerpo" color="verde">{yaRegistrados} movimientos</Texto> guardados.
              Estás viendo esta pantalla porque la configuración inicial se reinició, no porque se haya
              borrado nada. Puedes entrar directamente sin volver a configurar.
            </Texto>
            <Boton titulo="Entrar sin cambiar nada" icono="arrow-forward" ancho onPress={entrarSinTocarNada} />
            <Texto variante="micro" color="tenue">
              Si prefieres reconfigurar, sigue los 4 pasos: tus movimientos no se tocan.
            </Texto>
          </Tarjeta>
        ) : null}
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

          {frec === 'quincenal' ? (
            <View style={{ gap: esp.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: esp.md }}>
                <View style={{ flex: 1 }}>
                  <Texto variante="cuerpo">Las quincenas son distintas</Texto>
                  <Texto variante="micro" color="tenue">
                    Actívalo si no te pagan lo mismo las dos veces.
                  </Texto>
                </View>
                <Interruptor valor={quincenasDistintas} onChange={setQuincenasDistintas} />
              </View>

              {quincenasDistintas ? (
                <Campo
                  etiqueta="Monto de la segunda quincena"
                  value={segunda ? separarMiles(parsearMonto(segunda)) : ''}
                  onChangeText={setSegunda}
                  keyboardType="number-pad"
                  placeholder="0"
                />
              ) : (
                <Texto variante="micro" color="tenue">
                  Se asumen dos pagos iguales al mes: {formatoCOP(Math.round(parsearMonto(monto) * 2))}.
                </Texto>
              )}
            </View>
          ) : null}
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
                    {i.frecuencia === 'ocasional' ? 'no se proyecta' : `${formatoCOP(mensualDeIngreso(i))} al mes`}
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

// Cada pantalla en su propia frontera: un fallo aqui no tumba la app.
export default conFrontera(PasoIngresos, 'Ingresos');
