import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { useTema } from '../TemaProvider';
import { esp, radio } from '../tema';

/** Unidad de composicion: superficie elevada con esquinas suaves. */
export function Tarjeta({
  children, style, padding = esp.lg, plana = false,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: number;
  plana?: boolean;
}) {
  const t = useTema();
  return (
    <View
      style={[
        {
          backgroundColor: t.superficie,
          borderRadius: radio.lg,
          padding,
          borderWidth: t.oscuro ? 1 : 0,
          borderColor: t.borde,
        },
        !plana && t.sombra,
        style,
      ]}
    >
      {children}
    </View>
  );
}
