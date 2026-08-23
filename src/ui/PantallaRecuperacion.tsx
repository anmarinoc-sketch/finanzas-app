import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { confirmarArranque, leerUltimoError, limpiarError } from '@/servicios/diagnostico';
import { migrar, vaciarDatos } from '@/db/bootstrap';
import { sembrarCatalogos } from '@/db/seed';
import { guardarUsuario, obtenerUsuario } from '@/db/crud';

/**
 * Modo recuperación. Se muestra cuando la app se cerró dos veces seguidas
 * sin llegar a estabilizarse. Usa solo View, Text y Pressable a propósito:
 * nada de gráficos, animaciones ni tema, para que pueda dibujarse aunque lo
 * que falle sea justamente alguna de esas piezas.
 */
export function PantallaRecuperacion({ onContinuar }: { onContinuar: () => void }) {
  const [error] = useState(() => leerUltimoError());
  const [copiado, setCopiado] = useState(false);

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

  const borrarTodo = () => {
    Alert.alert(
      'Borrar todos los datos',
      'Se elimina todo lo registrado y la app vuelve al estado inicial. No se puede deshacer.',
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
          texto="Conserva tus movimientos, pero repite los 4 pasos de configuración."
          onPress={rehacerConfiguracion}
        />
        <Opcion
          titulo="Borrar todos los datos"
          texto="Deja la app como recién instalada. Última opción."
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
