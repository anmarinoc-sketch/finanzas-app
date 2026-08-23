import React from 'react';
import { View } from 'react-native';
import { Tarjeta } from '@/ui/comp/Tarjeta';
import { Texto } from '@/ui/comp/Texto';
import { EstadoVacio } from '@/ui/comp/EstadoVacio';
import { esp } from '@/ui/tema';

/** Envoltura comun: titulo, bajada y estado vacio con ilustracion. */
export function Grafico({
  titulo, bajada, hayDatos, mensajeVacio, children, accion,
}: {
  titulo: string; bajada?: string; hayDatos: boolean;
  mensajeVacio?: string; children: React.ReactNode; accion?: React.ReactNode;
}) {
  return (
    <Tarjeta style={{ gap: esp.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: esp.sm }}>
        <View style={{ flex: 1 }}>
          <Texto variante="seccion">{titulo}</Texto>
          {bajada ? <Texto variante="micro" color="tenue" style={{ marginTop: 2 }}>{bajada}</Texto> : null}
        </View>
        {accion}
      </View>
      {hayDatos ? children : (
        <EstadoVacio
          titulo="Aún no hay datos"
          mensaje={mensajeVacio ?? 'Registra algunos movimientos y este gráfico se llena solo.'}
        />
      )}
    </Tarjeta>
  );
}
