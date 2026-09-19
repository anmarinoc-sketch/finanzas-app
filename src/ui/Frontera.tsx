import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';

import { registrarFalloDePantalla } from '@/servicios/diagnostico';
import { useTema } from '@/ui/TemaProvider';

/**
 * Frontera de error: aísla un fallo dentro de la pieza donde ocurre.
 *
 * Por qué existe. El cierre de Análisis ("Cannot read property 'barWidth' of
 * undefined") no tumbó solo un gráfico: tumbó la app entera, tres cierres
 * seguidos llevaron al modo recuperación, y allí el borrado terminó pareciendo
 * la única salida. Un bug de dibujo se convirtió en una pérdida de datos.
 *
 * Con una frontera alrededor de cada pantalla y de cada gráfico, ese mismo bug
 * se queda en una tarjeta que dice "no se pudo dibujar" y el resto sigue
 * funcionando. La app no se cierra, así que tampoco cuenta como arranque
 * fallido ni empuja hacia el modo recuperación.
 *
 * El respaldo visual usa solo View, Text y Pressable, y el tema se lee por
 * contexto (useTema nunca lanza: tiene tema claro por defecto). Nada de
 * gráficos, animaciones ni librerías externas: justo lo que puede estar roto.
 */

type Props = {
  /** Nombre de la pieza protegida. Sale en el mensaje y queda en el registro. */
  etiqueta: string;
  /** true dentro de una tarjeta (gráficos); false para una pantalla completa. */
  compacta?: boolean;
  children: React.ReactNode;
};

type Estado = { error: Error | null; intento: number };

export class Frontera extends React.Component<Props, Estado> {
  state: Estado = { error: null, intento: 0 };

  static getDerivedStateFromError(error: Error): Partial<Estado> {
    return { error };
  }

  componentDidCatch(error: Error) {
    // Registra el fallo y marca el arranque como bueno: la app sigue viva, así
    // que esto no debe empujar hacia el modo recuperación.
    registrarFalloDePantalla(error, this.props.etiqueta);
  }

  reintentar = () => this.setState((s) => ({ error: null, intento: s.intento + 1 }));

  render() {
    if (!this.state.error) {
      // La clave fuerza a React a montar de nuevo el subárbol al reintentar.
      return <React.Fragment key={this.state.intento}>{this.props.children}</React.Fragment>;
    }
    return (
      <Respaldo
        etiqueta={this.props.etiqueta}
        compacta={this.props.compacta}
        mensaje={String(this.state.error?.message ?? 'Error desconocido')}
        onReintentar={this.reintentar}
      />
    );
  }
}

function Respaldo({
  etiqueta, compacta, mensaje, onReintentar,
}: { etiqueta: string; compacta?: boolean; mensaje: string; onReintentar: () => void }) {
  const t = useTema();

  const cuerpo = (
    <View style={{ gap: 10 }}>
      <Text style={{ color: t.ambar, fontSize: 12, fontWeight: '700', letterSpacing: 0.6 }}>
        {compacta ? 'NO SE PUDO DIBUJAR' : 'ESTA PANTALLA FALLÓ'}
      </Text>
      <Text style={{ color: t.texto, fontSize: compacta ? 15 : 19, fontWeight: '700' }}>
        {compacta
          ? 'Este gráfico tuvo un problema'
          : `${etiqueta} tuvo un problema`}
      </Text>
      <Text style={{ color: t.textoSuave, fontSize: 14, lineHeight: 20 }}>
        Tus datos están intactos: esto es solo un fallo al mostrar la
        información, nada se ha borrado ni modificado. Puedes reintentar o
        seguir usando el resto de la app.
      </Text>
      <Text selectable style={{ color: t.textoTenue, fontSize: 11, fontFamily: 'monospace' }}>
        {mensaje}
      </Text>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 2 }}>
        <Boton texto="Reintentar" onPress={onReintentar} tema={t} principal />
        {compacta ? null : (
          <Boton texto="Ir al inicio" onPress={() => router.replace('/')} tema={t} />
        )}
      </View>
    </View>
  );

  if (compacta) return cuerpo;

  return (
    <View style={{ flex: 1, backgroundColor: t.fondo, justifyContent: 'center', padding: 24 }}>
      <View
        style={{
          backgroundColor: t.superficie,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: t.borde,
          padding: 20,
        }}
      >
        {cuerpo}
      </View>
    </View>
  );
}

function Boton({
  texto, onPress, tema, principal,
}: { texto: string; onPress: () => void; tema: ReturnType<typeof useTema>; principal?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        backgroundColor: principal ? tema.acento : tema.superficie2,
        opacity: pressed ? 0.75 : 1,
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 18,
        minHeight: 44,
        justifyContent: 'center',
      })}
    >
      <Text style={{ color: principal ? '#FFFFFF' : tema.texto, fontSize: 15, fontWeight: '700' }}>
        {texto}
      </Text>
    </Pressable>
  );
}

/**
 * Envuelve el componente de una ruta en su propia frontera. Se aplica al
 * `export default` de cada pantalla, para que ninguna pueda tumbar a las demás.
 */
export function conFrontera<P extends object>(
  Componente: React.ComponentType<P>,
  etiqueta: string,
) {
  function Envuelto(props: P) {
    return (
      <Frontera etiqueta={etiqueta}>
        <Componente {...props} />
      </Frontera>
    );
  }
  Envuelto.displayName = `ConFrontera(${etiqueta})`;
  return Envuelto;
}
