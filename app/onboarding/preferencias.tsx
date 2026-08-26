import { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';

import { PasoOnboarding } from '@/ui/comp/PasoOnboarding';
import { Tarjeta } from '@/ui/comp/Tarjeta';
import { Texto } from '@/ui/comp/Texto';
import { Boton } from '@/ui/comp/Boton';
import { Chip } from '@/ui/comp/Chip';
import { Interruptor } from '@/ui/comp/Campo';
import { Segmentado } from '@/ui/comp/SelectorPeriodo';
import { useTema } from '@/ui/TemaProvider';
import { esp } from '@/ui/tema';

import { useOnboarding } from '@/store/onboarding';
import { useAjustes } from '@/store/ajustes';
import { useDatos } from '@/store/datos';
import { archivarCategoria, guardarDistribucion, listarCategorias, reemplazarIngresos } from '@/db/crud';
import { format } from 'date-fns';

const DIAS_CICLO = [1, 5, 10, 15, 20, 25, 30];

export default function PasoPreferencias() {
  const t = useTema();
  const ob = useOnboarding();
  const aplicar = useAjustes((s) => s.aplicar);
  const refrescar = useDatos((s) => s.refrescar);
  const [guardando, setGuardando] = useState(false);

  const finalizar = () => {
    setGuardando(true);
    try {
      // 1. Ingresos. Se reemplazan en bloque para que rehacer la
      //    configuración desde Ajustes no los duplique.
      reemplazarIngresos(ob.ingresos.map((i) => ({
        nombre: i.nombre, monto: i.monto, montoSecundario: i.montoSecundario ?? null,
        frecuencia: i.frecuencia, activo: 1,
        fechaInicio: format(new Date(), 'yyyy-MM-dd'), cuentaId: null,
      })) as any);
      // 2. Distribucion por bolsillos
      guardarDistribucion(ob.bolsillos.map((b, i) => ({
        nombre: b.nombre, porcentaje: b.porcentaje, color: b.color,
        icono: b.icono, tipo: b.tipo, orden: i,
      })));
      // 3. Categorías: se sincroniza en los dos sentidos, para que al rehacer
      //    la configuración se puedan volver a activar las archivadas.
      //    Nunca se borran: así conservan su historia de movimientos.
      listarCategorias(true).filter((c) => !c.padreId).forEach((c) => archivarCategoria(c.id, false));
      ob.categoriasDesactivadas.forEach((id) => archivarCategoria(id, true));
      // 4. Preferencias. El permiso de notificaciones NO se pide aquí a
      //    propósito: este es el camino crítico que deja la app configurada,
      //    y no debe depender de ningún módulo nativo. Se pide ya dentro de
      //    la app, en el primer render del inicio.
      aplicar({
        nombre: ob.nombre || 'Mi cuenta',
        diaInicioCiclo: ob.diaInicioCiclo,
        tema: ob.tema,
        biometria: ob.biometria ? 1 : 0,
        notificaciones: ob.notificaciones ? 1 : 0,
        onboardingCompleto: 1,
      });
      refrescar();
      ob.reiniciar();
      router.replace('/');
    } catch (e: any) {
      Alert.alert('No se pudo guardar', e?.message ?? 'Intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  const activarBiometria = async (v: boolean) => {
    if (!v) return ob.set({ biometria: false });
    const hay = await LocalAuthentication.hasHardwareAsync();
    const inscrito = await LocalAuthentication.isEnrolledAsync();
    if (!hay || !inscrito) {
      Alert.alert('Sin biometría', 'Este dispositivo no tiene huella o Face ID configurado. Puedes activar un PIN desde Ajustes.');
      return;
    }
    ob.set({ biometria: true });
  };

  return (
    <PasoOnboarding
      paso={4}
      titulo="Últimos detalles"
      bajada="Ajusta cómo quieres que la app cuente tus ciclos y cómo se ve. Todo esto lo puedes cambiar luego."
      pie={
        <View style={{ flexDirection: 'row', gap: esp.md }}>
          <Boton titulo="Atrás" variante="secundario" icono="chevron-back" onPress={() => router.back()} deshabilitado={guardando} />
          <Boton titulo="Empezar a usar" style={{ flex: 1 }} cargando={guardando} onPress={finalizar} />
        </View>
      }
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: esp.md, paddingBottom: esp.lg }}>
        <Tarjeta style={{ gap: esp.md }}>
          <View>
            <Texto variante="seccion">Inicio del ciclo financiero</Texto>
            <Texto variante="micro" color="tenue" style={{ marginTop: 2 }}>
              Si te pagan el 15, elige 15: los presupuestos correrán de quincena a quincena.
            </Texto>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: esp.sm }}>
            {DIAS_CICLO.map((d) => (
              <Chip
                key={d}
                texto={d === 1 ? 'Día 1' : `Día ${d}`}
                activo={ob.diaInicioCiclo === d}
                onPress={() => ob.set({ diaInicioCiclo: d })}
                compacto
              />
            ))}
          </View>
        </Tarjeta>

        <Tarjeta style={{ gap: esp.md }}>
          <Texto variante="seccion">Apariencia</Texto>
          <Segmentado
            valor={ob.tema}
            onChange={(v) => ob.set({ tema: v })}
            opciones={[
              { valor: 'sistema', texto: 'Sistema' },
              { valor: 'claro', texto: 'Claro' },
              { valor: 'oscuro', texto: 'Oscuro' },
            ]}
          />
        </Tarjeta>

        <Tarjeta style={{ gap: esp.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: esp.md }}>
            <View style={{ flex: 1 }}>
              <Texto variante="cuerpo">Bloqueo biométrico</Texto>
              <Texto variante="micro" color="tenue">Pide tu huella al abrir la app.</Texto>
            </View>
            <Interruptor valor={ob.biometria} onChange={activarBiometria} />
          </View>
          <View style={{ height: 1, backgroundColor: t.borde }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: esp.md }}>
            <View style={{ flex: 1 }}>
              <Texto variante="cuerpo">Alertas y recordatorios</Texto>
              <Texto variante="micro" color="tenue">Avisos de presupuesto, cobros recurrentes y resumen semanal.</Texto>
            </View>
            <Interruptor valor={ob.notificaciones} onChange={(v) => ob.set({ notificaciones: v })} />
          </View>
        </Tarjeta>

      </ScrollView>
    </PasoOnboarding>
  );
}
