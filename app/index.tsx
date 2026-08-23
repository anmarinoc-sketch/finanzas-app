import { Redirect } from 'expo-router';
import { useAjustes } from '@/store/ajustes';

/** Puerta de entrada: onboarding, bloqueo o app. */
export default function Entrada() {
  const { cargado, onboardingCompleto, pinActivo, biometria, desbloqueado } = useAjustes();
  if (!cargado) return null;
  if (!onboardingCompleto) return <Redirect href="/onboarding/ingresos" />;
  if ((pinActivo || biometria) && !desbloqueado) return <Redirect href="/bloqueo" />;
  return <Redirect href="/(tabs)" />;
}
