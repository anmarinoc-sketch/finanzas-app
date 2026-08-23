import React from 'react';
import { Text as RNText, TextProps, TextStyle } from 'react-native';
import { useTema } from '../TemaProvider';
import { tipografia } from '../tema';

type Variante = keyof typeof tipografia;

/** Texto con color y variante tipografica del tema. */
export function Texto({
  variante = 'cuerpo', color, style, ...props
}: TextProps & { variante?: Variante; color?: 'texto' | 'suave' | 'tenue' | 'acento' | 'verde' | 'rojo' | 'ambar' | string }) {
  const t = useTema();
  const mapa: Record<string, string> = {
    texto: t.texto, suave: t.textoSuave, tenue: t.textoTenue,
    acento: t.acento, verde: t.verde, rojo: t.rojo, ambar: t.ambar,
  };
  const c = color ? mapa[color] ?? color : t.texto;
  return <RNText {...props} style={[tipografia[variante] as TextStyle, { color: c }, style]} />;
}
