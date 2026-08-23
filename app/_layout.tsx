import { useEffect, useState } from 'react';
import { View } from 'react-native';
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

SplashScreen.preventAutoHideAsync().catch(() => {});

// Muestra una pantalla de error legible en vez de cerrarse en silencio si algo falla.
export { ErrorBoundary } from 'expo-router';

export default function LayoutRaiz() {
  const [listo, setListo] = useState(false);
  const cargar = useAjustes((s) => s.cargar);
  const refrescar = useDatos((s) => s.refrescar);

  useEffect(() => {
    // Orden importante: esquema -> catalogos base -> preferencias -> catalogos en memoria.
    migrar();
    sembrarCatalogos();
    cargar();
    refrescar();
    setListo(true);
    SplashScreen.hideAsync().catch(() => {});
  }, [cargar, refrescar]);

  if (!listo) return null;

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
