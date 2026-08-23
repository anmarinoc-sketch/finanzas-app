import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useTema } from '../TemaProvider';
import { esp } from '../tema';
import { Texto } from './Texto';
import { Boton } from './Boton';

/** Ilustracion propia (SVG) para no depender de imagenes ni de librerias. */
function Ilustracion({ color, tenue }: { color: string; tenue: string }) {
  return (
    <Svg width={140} height={100} viewBox="0 0 140 100">
      <Rect x="10" y="34" width="120" height="58" rx="12" fill={tenue} />
      <Rect x="26" y="52" width="22" height="26" rx="6" fill={color} opacity={0.35} />
      <Rect x="56" y="42" width="22" height="36" rx="6" fill={color} opacity={0.6} />
      <Rect x="86" y="58" width="22" height="20" rx="6" fill={color} opacity={0.45} />
      <Path d="M22 28 L52 14 L84 24 L118 6" stroke={color} strokeWidth="4" strokeLinecap="round" fill="none" />
      <Circle cx="118" cy="6" r="6" fill={color} />
    </Svg>
  );
}

export function EstadoVacio({
  titulo, mensaje, accion, onAccion,
}: { titulo: string; mensaje: string; accion?: string; onAccion?: () => void }) {
  const t = useTema();
  return (
    <View style={{ alignItems: 'center', padding: esp.xl, gap: esp.md }}>
      <Ilustracion color={t.acento} tenue={t.superficie2} />
      <Texto variante="seccion" style={{ textAlign: 'center' }}>{titulo}</Texto>
      <Texto variante="cuerpo" color="suave" style={{ textAlign: 'center', lineHeight: 21 }}>{mensaje}</Texto>
      {accion && onAccion ? <Boton titulo={accion} onPress={onAccion} variante="secundario" /> : null}
    </View>
  );
}
