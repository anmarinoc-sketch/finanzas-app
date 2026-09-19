import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { confirmarArranque, leerUltimoError, limpiarError } from '@/servicios/diagnostico';
import { migrar, vaciarDatos } from '@/db/bootstrap';
import { sembrarCatalogos } from '@/db/seed';
import { contarMovimientos, guardarUsuario, obtenerUsuario } from '@/db/crud';
import { crearRespaldo, listarRespaldos, restaurarRespaldo } from '@/servicios/respaldoAuto';

/**
 * Modo recuperación. Se muestra cuando la app se cerró dos veces seguidas
 * sin llegar a estabilizarse. Usa solo View, Text y Pressable a propósito:
 * nada de gráficos, animaciones ni tema, para que pueda dibujarse aunque lo
 * que falle sea justamente alguna de esas piezas.
 */
export function PantallaRecuperacion({ onContinuar }: { onContinuar: () => void }) {
  const [error] = useState(() => leerUltimoError());
  // Cuántos datos hay realmente. Sin este dato, el usuario elige a ciegas
  // entre opciones que conservan y opciones que borran.
  const [movimientos] = useState(() => { try { return contarMovimientos(); } catch { return 0; } });
  const [copiado, setCopiado] = useState(false);
  // Las copias hay que ofrecerlas aqui, no solo en Ajustes: si la app no abre,
  // Ajustes no se puede alcanzar.
  const [copias] = useState(() => { try { return listarRespaldos(); } catch { return []; } });

  const detalle = error
    ? `${error.mensaje}\n\nContexto: ${error.contexto}\nFecha: ${error.fecha}\n\n${error.pila}`
    : 'No se registró ningún mensaje de error.';

  const salir = (accion: () => void) => {
    accion();
    limpiarError();
    confirmarArranque();
    onContinuar();
  };

  const desactivarNotificaciones = () => salir(() => {
    if (obtenerUsuario()) guardarUsuario({ notificaciones: 0, biometria: 0, pinActivo: 0 });
  });

  const rehacerConfiguracion = () => salir(() => {
    if (obtenerUsuario()) guardarUsuario({ onboardingCompleto: 0 });
  });

  const restaurarUltima = () => {
    const c = copias[0];
    if (!c) return;
    Alert.alert(
      'Restaurar la copia más reciente',
      `Copia del ${c.fecha.toLocaleString('es-CO')} con ${c.registros} registros. Reemplaza lo que haya ahora. Antes se guarda otra copia del estado actual.

¿Restaurar?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restaurar',
          onPress: () => {
            try {
              const r = restaurarRespaldo(c.uri);
              Alert.alert('Listo', `Se restauraron ${r.registros} registros.`, [
                { text: 'Abrir la app', onPress: () => salir(() => {}) },
              ]);
            } catch (e) {
              Alert.alert('No se pudo restaurar', String((e as any)?.message ?? e));
            }
          },
        },
      ],
    );
  };

  const borrarTodo = () => {
    // Copia primero. Una pérdida de datos real salió de ofrecer este botón
    // sin respaldo previo, a alguien que solo quería recuperar su app.
    const copia = crearRespaldo('antes-de-borrar');
    Alert.alert(
      'Borrar todos los datos',
      copia
        ? `Antes de borrar se guardó una copia con ${copia.registros} registros, dentro del teléfono. Podrás restaurarla desde Ajustes › Datos.

¿Continuar?`
        : 'No hay datos que respaldar. Se dejará la app en su estado inicial.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar todo',
          style: 'destructive',
          onPress: () => salir(() => { vaciarDatos(); migrar(); sembrarCatalogos(); }),
        },
      ],
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0B0D14' }}>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 20 }}>
        <View style={{ gap: 8 }}>
          <Text style={{ color: '#FBBF24', fontSize: 13, fontWeight: '700', letterSpacing: 1 }}>
            MODO RECUPERACIÓN
          </Text>
          <Text style={{ color: '#F2F4FA', fontSize: 24, fontWeight: '800' }}>
            La app no pudo abrir
          </Text>
          <Text style={{ color: '#A7AEBF', fontSize: 15, lineHeight: 22 }}>
            Se cerró dos veces seguidas al arrancar, así que la abrimos en modo seguro para que
            puedas recuperarla. Tus datos siguen guardados. Elige una opción de abajo.
          </Text>
        </View>

        <View style={{ backgroundColor: '#161A26', borderRadius: 14, padding: 16, gap: 8, borderWidth: 1, borderColor: '#262C3B' }}>
          <Text style={{ color: '#A7AEBF', fontSize: 12, fontWeight: '700' }}>DETALLE TÉCNICO</Text>
          <Text selectable style={{ color: '#F87171', fontSize: 12, fontFamily: 'monospace', lineHeight: 18 }}>
            {detalle}
          </Text>
          <Pressable
            onPress={() => setCopiado(true)}
            accessibilityRole="button"
            style={{ paddingVertical: 6 }}
          >
            <Text style={{ color: '#7C7CFF', fontSize: 13, fontWeight: '600' }}>
              {copiado ? 'Mantén pulsado el texto para copiarlo' : 'Quiero copiar este error'}
            </Text>
          </Pressable>
        </View>

        {movimientos > 0 ? (
          <View style={{ backgroundColor: '#0F2A22', borderRadius: 14, padding: 16, gap: 4, borderWidth: 1, borderColor: '#166534' }}>
            <Text style={{ color: '#34D399', fontSize: 15, fontWeight: '700' }}>
              Tienes {movimientos} movimientos guardados
            </Text>
            <Text style={{ color: '#A7AEBF', fontSize: 13, lineHeight: 19 }}>
              Siguen ahí. La única opción que borra algo es la última, la roja.
            </Text>
          </View>
        ) : null}

        <Opcion
          titulo="Continuar de todos modos"
          texto="Intenta abrir la app normalmente. Si vuelve a cerrarse, regresarás aquí."
          onPress={() => salir(() => {})}
        />
        <Opcion
          titulo="Abrir sin notificaciones ni bloqueo"
          texto="Desactiva las alertas, el PIN y la huella. Es lo que hay que probar primero si el cierre ocurre justo al abrir."
          onPress={desactivarNotificaciones}
        />
        <Opcion
          titulo="Volver a hacer la configuración inicial"
          texto="Repite los 4 pasos. Tus movimientos NO se borran: seguirán ahí al terminar."
          onPress={rehacerConfiguracion}
        />
        {copias.length > 0 ? (
          <Opcion
            titulo="Restaurar la copia más reciente"
            texto={`Del ${copias[0].fecha.toLocaleDateString('es-CO')}, con ${copias[0].registros} registros. Hay ${copias.length} copias guardadas en el teléfono.`}
            onPress={restaurarUltima}
          />
        ) : null}
        <Opcion
          titulo="Borrar todos los datos"
          texto="La única opción que borra. Deja la app como recién instalada. Se guarda una copia antes, por si acaso."
          onPress={borrarTodo}
          peligro
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function Opcion({
  titulo, texto, onPress, peligro,
}: { titulo: string; texto: string; onPress: () => void; peligro?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        backgroundColor: pressed ? '#1E2331' : '#161A26',
        borderRadius: 14,
        padding: 16,
        gap: 4,
        borderWidth: 1,
        borderColor: peligro ? '#7F1D1D' : '#262C3B',
        minHeight: 44,
      })}
    >
      <Text style={{ color: peligro ? '#F87171' : '#F2F4FA', fontSize: 16, fontWeight: '700' }}>{titulo}</Text>
      <Text style={{ color: '#A7AEBF', fontSize: 13, lineHeight: 19 }}>{texto}</Text>
    </Pressable>
  );
}
