import React from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTema } from '../TemaProvider';
import { Texto } from './Texto';
import { esp, radio } from '../tema';

/** Cabecera comun de los 4 pasos del onboarding, con indicador de progreso. */
export function PasoOnboarding({
  paso, total = 4, titulo, bajada, children, pie, conVolver = true,
}: {
  paso: number; total?: number; titulo: string; bajada: string;
  children: React.ReactNode; pie: React.ReactNode;
  /** El primer paso no tiene a donde volver. */
  conVolver?: boolean;
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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: esp.sm }}>
            {conVolver ? (
              <Pressable
                onPress={() => (router.canGoBack() ? router.back() : null)}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Volver al paso anterior"
                style={{
                  width: 32, height: 32, borderRadius: 16, marginLeft: -4,
                  backgroundColor: t.superficie2, alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Ionicons name="chevron-back" size={18} color={t.texto} />
              </Pressable>
            ) : null}
            <Texto variante="micro" color="acento">PASO {paso} DE {total}</Texto>
          </View>
          <Texto variante="titulo" style={{ fontSize: 26 }}>{titulo}</Texto>
          <Texto variante="cuerpo" color="suave" style={{ lineHeight: 21 }}>{bajada}</Texto>
        </View>
        <View style={{ flex: 1 }}>{children}</View>
        <View style={{ gap: esp.sm }}>{pie}</View>
      </View>
    </SafeAreaView>
  );
}
