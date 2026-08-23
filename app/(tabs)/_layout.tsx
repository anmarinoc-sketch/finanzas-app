import { Pressable, View } from 'react-native';
import { Tabs, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTema } from '@/ui/TemaProvider';

/** Boton central (+) del tab bar: abre el registro rapido como modal. */
function BotonCentral() {
  const t = useTema();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Registrar movimiento"
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        router.push('/registro');
      }}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
    >
      <View style={{
        width: 52, height: 52, borderRadius: 26, backgroundColor: t.acento,
        alignItems: 'center', justifyContent: 'center', marginTop: -18,
        shadowColor: t.acento, shadowOpacity: 0.45, shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 }, elevation: 8,
        borderWidth: 4, borderColor: t.fondoElevado,
      }}>
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </View>
    </Pressable>
  );
}

export default function LayoutTabs() {
  const t = useTema();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.acento,
        tabBarInactiveTintColor: t.textoTenue,
        tabBarStyle: {
          backgroundColor: t.fondoElevado,
          borderTopColor: t.borde,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        sceneStyle: { backgroundColor: t.fondo },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="movimientos"
        options={{
          title: 'Movimientos',
          tabBarIcon: ({ color, size }) => <Ionicons name="list-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="agregar"
        options={{
          title: '',
          tabBarButton: () => <BotonCentral />,
        }}
      />
      <Tabs.Screen
        name="analisis"
        options={{
          title: 'Análisis',
          tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="metas"
        options={{
          title: 'Metas',
          tabBarIcon: ({ color, size }) => <Ionicons name="flag-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
