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

/** Pantalla de bloqueo: biometria primero, PIN como respaldo. */
export default function Bloqueo() {
  const t = useTema();
  const { pin, pinActivo, biometria, setDesbloqueado } = useAjustes();
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [biometriaDisponible, setBiometriaDisponible] = useState(false);

  const entrar = useCallback(() => {
    setDesbloqueado(true);
    router.replace('/');
  }, [setDesbloqueado]);

  const pedirBiometria = useCallback(async () => {
    const hay = await LocalAuthentication.hasHardwareAsync();
    const inscrito = await LocalAuthentication.isEnrolledAsync();
    setBiometriaDisponible(hay && inscrito);
    if (!hay || !inscrito) return;
    const r = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Desbloquear Mis Finanzas',
      cancelLabel: 'Usar PIN',
      disableDeviceFallback: false,
    });
    if (r.success) entrar();
  }, [entrar]);

  useEffect(() => {
    if (biometria) pedirBiometria();
    else LocalAuthentication.hasHardwareAsync().then(setBiometriaDisponible);
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
