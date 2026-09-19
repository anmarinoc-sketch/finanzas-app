import { useCallback, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAjustes } from '@/store/ajustes';
import { useTema } from '@/ui/TemaProvider';
import { Texto } from '@/ui/comp/Texto';
import { Boton } from '@/ui/comp/Boton';
import { TecladoNumerico } from '@/ui/comp/TecladoNumerico';
import { esp } from '@/ui/tema';
import { conFrontera } from '@/ui/Frontera';

/** Pantalla de bloqueo: biometria primero, PIN como respaldo. */
function Bloqueo() {
  const t = useTema();
  const { pin, pinActivo, biometria, setDesbloqueado } = useAjustes();
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [biometriaDisponible, setBiometriaDisponible] = useState(false);

  const entrar = useCallback(() => {
    setDesbloqueado(true);
    router.replace('/');
  }, [setDesbloqueado]);

  // Todo el modulo nativo va dentro de try/catch: si la huella falla, el
  // usuario no puede quedarse fuera de su propia app. `disableDeviceFallback`
  // en false deja usar el PIN del telefono como ultima salida.
  const pedirBiometria = useCallback(async () => {
    try {
      const hay = await LocalAuthentication.hasHardwareAsync();
      const inscrito = await LocalAuthentication.isEnrolledAsync();
      setBiometriaDisponible(hay && inscrito);
      if (!hay || !inscrito) {
        if (!pinActivo) entrar(); // sin huella y sin PIN no hay nada que validar
        return;
      }
      const r = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Desbloquear Mis Finanzas',
        cancelLabel: 'Usar PIN',
        disableDeviceFallback: false,
      });
      if (r.success) entrar();
      else if (r.error && r.error !== 'user_cancel') {
        setError('No se pudo leer la huella. Intenta de nuevo.');
      }
    } catch {
      setBiometriaDisponible(false);
      setError('La huella no está disponible en este teléfono.');
      if (!pinActivo) entrar();
    }
  }, [entrar, pinActivo]);

  useEffect(() => {
    if (biometria) { pedirBiometria(); return; }
    LocalAuthentication.hasHardwareAsync()
      .then(setBiometriaDisponible)
      .catch(() => setBiometriaDisponible(false));
  }, [biometria, pedirBiometria]);

  const escribir = (d: string) => {
    if (d.length > 1) return; // la tecla "000" no aplica al PIN
    setError(null);
    const nuevo = (codigo + d).slice(0, 4);
    setCodigo(nuevo);
    if (nuevo.length === 4) {
      if (nuevo === pin) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        entrar();
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        setError('PIN incorrecto');
        setTimeout(() => setCodigo(''), 250);
      }
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.fondo }}>
      <View style={{ flex: 1, justifyContent: 'center', padding: esp.xl, gap: esp.xl }}>
        <View style={{ alignItems: 'center', gap: esp.md }}>
          <View style={{
            width: 64, height: 64, borderRadius: 20, backgroundColor: t.acentoFondo,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Ionicons name="lock-closed" size={30} color={t.acento} />
          </View>
          <Texto variante="titulo">Mis Finanzas está bloqueada</Texto>
          <Texto variante="cuerpo" color="suave">
            {pinActivo ? 'Ingresa tu PIN de 4 dígitos' : 'Usa tu huella para continuar'}
          </Texto>
        </View>

        {pinActivo ? (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: esp.md }}>
              {[0, 1, 2, 3].map((i) => (
                <View key={i} style={{
                  width: 16, height: 16, borderRadius: 8,
                  borderWidth: 2,
                  borderColor: error ? t.rojo : codigo.length > i ? t.acento : t.borde,
                  backgroundColor: codigo.length > i ? (error ? t.rojo : t.acento) : 'transparent',
                }} />
              ))}
            </View>
            {error ? <Texto variante="etiqueta" color="rojo" style={{ textAlign: 'center' }}>{error}</Texto> : null}
            <TecladoNumerico
              onTecla={escribir}
              onBorrar={() => setCodigo(codigo.slice(0, -1))}
              onLimpiar={() => setCodigo('')}
            />
          </>
        ) : null}

        {biometriaDisponible ? (
          <Pressable onPress={pedirBiometria} style={{ alignItems: 'center', gap: esp.sm }} accessibilityRole="button">
            <Ionicons name="finger-print" size={38} color={t.acento} />
            <Texto variante="etiqueta" color="acento">Usar huella</Texto>
          </Pressable>
        ) : null}

        {!pinActivo && !biometriaDisponible ? (
          <Boton titulo="Entrar" ancho onPress={entrar} />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

// Cada pantalla en su propia frontera: un fallo aqui no tumba la app.
export default conFrontera(Bloqueo, 'El bloqueo');
