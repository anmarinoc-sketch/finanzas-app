import { Stack } from 'expo-router';
import { useTema } from '@/ui/TemaProvider';
import { conFrontera } from '@/ui/Frontera';

function LayoutOnboarding() {
  const t = useTema();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.fondo } }}>
      <Stack.Screen name="ingresos" />
      <Stack.Screen name="distribucion" />
      <Stack.Screen name="categorias" />
      <Stack.Screen name="preferencias" />
    </Stack>
  );
}

// Cada pantalla en su propia frontera: un fallo aqui no tumba la app.
export default conFrontera(LayoutOnboarding, 'La configuración inicial');
