import React from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTema } from '../TemaProvider';
import { esp, radio } from '../tema';
import { Texto } from './Texto';

/** Hoja inferior reutilizable para selectores y formularios cortos. */
export function Hoja({
  visible, onCerrar, titulo, children, alto = '75%',
}: {
  visible: boolean; onCerrar: () => void; titulo?: string;
  children: React.ReactNode; alto?: `${number}%` | number;
}) {
  const t = useTema();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCerrar} statusBarTranslucent>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={onCerrar} />
      <View style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, height: alto as any,
        backgroundColor: t.fondoElevado,
        borderTopLeftRadius: radio.xl, borderTopRightRadius: radio.xl,
        paddingBottom: insets.bottom,
      }}>
        <View style={{ alignItems: 'center', paddingTop: esp.md }}>
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: t.borde }} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: esp.lg, paddingBottom: esp.sm }}>
          <Texto variante="titulo" style={{ flex: 1 }}>{titulo}</Texto>
          <Pressable onPress={onCerrar} hitSlop={12} accessibilityRole="button" accessibilityLabel="Cerrar">
            <Ionicons name="close" size={24} color={t.textoSuave} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: esp.lg, paddingTop: 0, gap: esp.md, paddingBottom: esp.xxl }}>
          {children}
        </ScrollView>
      </View>
    </Modal>
  );
}
