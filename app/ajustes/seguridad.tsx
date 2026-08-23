import { useState } from 'react';
import { Alert, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as LocalAuthentication from 'expo-local-authentication';
import { Ionicons } from '@expo/vector-icons';

import { useTema } from '@/ui/TemaProvider';
import { Encabezado } from '@/ui/comp/Encabezado';
import { Texto } from '@/ui/comp/Texto';
import { Tarjeta } from '@/ui/comp/Tarjeta';
import { Boton } from '@/ui/comp/Boton';
import { Interruptor } from '@/ui/comp/Campo';
import { Hoja } from '@/ui/comp/Hoja';
import { TecladoNumerico } from '@/ui/comp/TecladoNumerico';
import { esp } from '@/ui/tema';
import { useAjustes } from '@/store/ajustes';

export default function Seguridad() {
  const t = useTema();
  const a = useAjustes();
  const [hoja, setHoja] = useState(false);
  const [paso, setPaso] = useState<'nuevo' | 'confirmar'>('nuevo');
  const [primero, setPrimero] = useState('');
  const [codigo, setCodigo] = useState('');

  const abrirPin = () => { setPaso('nuevo'); setPrimero(''); setCodigo(''); setHoja(true); };

  const escribir = (d: string) => {
    if (d.length > 1) return; // la tecla "000" no aplica al PIN
    const nuevo = (codigo + d).slice(0, 4);
    setCodigo(nuevo);
    if (nuevo.length < 4) return;
    if (paso === 'nuevo') {
      setPrimero(nuevo);
      setPaso('confirmar');
      setTimeout(() => setCodigo(''), 180);
      return;
    }
    if (nuevo === primero) {
      a.aplicar({ pin: nuevo, pinActivo: 1 });
      setHoja(false);
      Alert.alert('PIN activado', 'Te lo pediremos cada vez que abras la app.');
    } else {
      Alert.alert('No coinciden', 'Los dos PIN son distintos. Inténtalo otra vez.');
      setPaso('nuevo'); setPrimero(''); setCodigo('');
    }
  };

  const quitarPin = () => {
    Alert.alert('Quitar PIN', '¿Seguro? La app quedará sin bloqueo por código.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Quitar', style: 'destructive', onPress: () => a.aplicar({ pin: null, pinActivo: 0 }) },
    ]);
  };

  const cambiarBiometria = async (v: boolean) => {
    if (!v) return a.aplicar({ biometria: 0 });
    const hay = await LocalAuthentication.hasHardwareAsync();
    const inscrito = await LocalAuthentication.isEnrolledAsync();
    if (!hay || !inscrito) {
      Alert.alert('Sin biometría', 'Este dispositivo no tiene huella o Face ID configurado.');
      return;
    }
    a.aplicar({ biometria: 1 });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.fondo }} edges={['top']}>
      <Encabezado titulo="Seguridad" subtitulo="Protege el acceso a tus finanzas" />
      <View style={{ padding: esp.lg, gap: esp.md }}>
        <Tarjeta style={{ gap: esp.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: esp.md }}>
            <Ionicons name="keypad-outline" size={22} color={t.acento} />
            <View style={{ flex: 1 }}>
              <Texto variante="cuerpo">Bloqueo con PIN</Texto>
              <Texto variante="micro" color="tenue">Código de 4 dígitos al abrir la app</Texto>
            </View>
            <Interruptor valor={a.pinActivo} onChange={(v) => (v ? abrirPin() : quitarPin())} />
          </View>

          <View style={{ height: 1, backgroundColor: t.borde }} />

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: esp.md }}>
            <Ionicons name="finger-print" size={22} color={t.acento} />
            <View style={{ flex: 1 }}>
              <Texto variante="cuerpo">Huella o Face ID</Texto>
              <Texto variante="micro" color="tenue">Usa la biometría del dispositivo</Texto>
            </View>
            <Interruptor valor={a.biometria} onChange={cambiarBiometria} />
          </View>
        </Tarjeta>

        {a.pinActivo ? <Boton titulo="Cambiar PIN" variante="secundario" ancho onPress={abrirPin} /> : null}

        <Tarjeta style={{ flexDirection: 'row', gap: esp.md }}>
          <Ionicons name="shield-checkmark-outline" size={20} color={t.verde} />
          <Texto variante="micro" color="suave" style={{ flex: 1, lineHeight: 18 }}>
            Tus datos se guardan solo en este teléfono, en una base de datos local. La app no tiene servidores
            ni envía información a internet. Si desinstalas la app sin hacer copia de seguridad, los datos se pierden.
          </Texto>
        </Tarjeta>
      </View>

      <Hoja
        visible={hoja}
        onCerrar={() => setHoja(false)}
        titulo={paso === 'nuevo' ? 'Elige tu PIN' : 'Confirma tu PIN'}
        alto="70%"
      >
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: esp.md, paddingVertical: esp.lg }}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={{
              width: 16, height: 16, borderRadius: 8, borderWidth: 2,
              borderColor: codigo.length > i ? t.acento : t.borde,
              backgroundColor: codigo.length > i ? t.acento : 'transparent',
            }} />
          ))}
        </View>
        <TecladoNumerico
          onTecla={escribir}
          onBorrar={() => setCodigo(codigo.slice(0, -1))}
          onLimpiar={() => setCodigo('')}
        />
      </Hoja>
    </SafeAreaView>
  );
}
