import React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTema } from '../TemaProvider';
import { Texto } from './Texto';
import { esp, radio } from '../tema';

/** Cabecera comun de los 4 pasos del onboarding, con indicador de progreso. */
export function PasoOnboarding({
  paso, total = 4, titulo, bajada, children, pie,
}: {
  paso: number; total?: number; titulo: string; bajada: string;
  children: React.ReactNode; pie: React.ReactNode;
}) {
  const t = useTema();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.fondo }} edges={['top', 'bottom']}>
      <View style={{ padding: esp.lg, gap: esp.lg, flex: 1 }}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {Array.from({ length: total }, (_, i) => (
            <View key={i} style={{
              flex: 1, height: 4, borderRadius: radio.full,
              backgroundColor: i < paso ? t.acento : t.superficie2,
            }} />
          ))}
        </View>
        <View style={{ gap: 6 }}>
          <Texto variante="micro" color="acento">PASO {paso} DE {total}</Texto>
          <Texto variante="titulo" style={{ fontSize: 26 }}>{titulo}</Texto>
          <Texto variante="cuerpo" color="suave" style={{ lineHeight: 21 }}>{bajada}</Texto>
        </View>
        <View style={{ flex: 1 }}>{children}</View>
        <View style={{ gap: esp.sm }}>{pie}</View>
      </View>
    </SafeAreaView>
  );
}
