import { Stack } from 'expo-router';
import { useTema } from '@/ui/TemaProvider';

export default function LayoutOnboarding() {
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
