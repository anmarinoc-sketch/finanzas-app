import { useEffect, useRef, useState } from 'react';
import { AppState, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';

import { migrar } from '@/db/bootstrap';
import { sembrarCatalogos } from '@/db/seed';
import { useAjustes } from '@/store/ajustes';
import { useDatos } from '@/store/datos';
import { ProveedorTema, useTema } from '@/ui/TemaProvider';
import { PantallaRecuperacion } from '@/ui/PantallaRecuperacion';
import {
  SEGUNDOS_ESTABLE, confirmarArranque, guardarError,
  instalarManejadorGlobal, registrarArranque,
} from '@/servicios/diagnostico';
import { respaldoDiarioSiToca } from '@/servicios/respaldoAuto';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Pantalla de error legible de expo-router en vez de un cierre en silencio.
export { ErrorBoundary } from 'expo-router';

export default function LayoutRaiz() {
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'recuperacion'>('cargando');
  const cargar = useAjustes((s) => s.cargar);
  const refrescar = useDatos((s) => s.refrescar);

  useEffect(() => {
    try {
      // Orden importante: esquema -> diagnostico -> catalogos -> preferencias.
      migrar();
      instalarManejadorGlobal();

      const { recuperacion } = registrarArranque();
      if (recuperacion) {
        setEstado('recuperacion');
        SplashScreen.hideAsync().catch(() => {});
        return;
      }

      sembrarCatalogos();
      cargar();
      refrescar();
      setEstado('listo');
    } catch (e) {
      // Si el arranque falla, se registra y se entra en recuperacion en vez
      // de dejar la pantalla en blanco.
      guardarError(e, 'arranque de la app', true);
      setEstado('recuperacion');
    } finally {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [cargar, refrescar]);

  // Si la app sobrevive unos segundos, el arranque cuenta como bueno. Y ya con
  // el arranque estabilizado se hace el respaldo automatico, si toca.
  useEffect(() => {
    if (estado !== 'listo') return;
    const id = setTimeout(() => {
      confirmarArranque();
      try { respaldoDiarioSiToca(); } catch (e) { guardarError(e, 'respaldo automatico'); }
    }, SEGUNDOS_ESTABLE * 1000);
    return () => clearTimeout(id);
  }, [estado]);

  // Volver del segundo plano tambien cuenta como abrir la app: si la deja
  // abierta varios dias, el respaldo se sigue haciendo igual.
  const estadoApp = useRef(AppState.currentState);
  useEffect(() => {
    if (estado !== 'listo') return;
    const sub = AppState.addEventListener('change', (nuevo) => {
      const volvio = estadoApp.current !== 'active' && nuevo === 'active';
      estadoApp.current = nuevo;
      if (volvio) {
        try { respaldoDiarioSiToca(); } catch (e) { guardarError(e, 'respaldo al volver'); }
      }
    });
    return () => sub.remove();
  }, [estado]);

  if (estado === 'cargando') return null;

  if (estado === 'recuperacion') {
    return (
      <SafeAreaProvider>
        <StatusBar style="light" />
        <PantallaRecuperacion
          onContinuar={() => {
            try { sembrarCatalogos(); cargar(); refrescar(); setEstado('listo'); }
            catch (e) { guardarError(e, 'salida de recuperación', true); }
          }}
        />
      </SafeAreaProvider>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ProveedorTema>
          <Contenido />
        </ProveedorTema>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function Contenido() {
  const t = useTema();
  useEffect(() => { SystemUI.setBackgroundColorAsync(t.fondo).catch(() => {}); }, [t.fondo]);
  return (
    <View style={{ flex: 1, backgroundColor: t.fondo }}>
      <StatusBar style={t.oscuro ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: t.fondo },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="bloqueo" options={{ animation: 'fade', gestureEnabled: false }} />
        <Stack.Screen name="registro" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      </Stack>
    </View>
  );
}
