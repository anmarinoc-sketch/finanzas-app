import { useCallback, useMemo } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { useTema } from '@/ui/TemaProvider';
import { Encabezado } from '@/ui/comp/Encabezado';
import { Texto } from '@/ui/comp/Texto';
import { Tarjeta as TarjetaUI } from '@/ui/comp/Tarjeta';
import { Boton } from '@/ui/comp/Boton';
import { BarraProgreso } from '@/ui/comp/BarraProgreso';
import { EstadoVacio } from '@/ui/comp/EstadoVacio';
import { FilaMovimiento } from '@/ui/comp/FilaMovimiento';
import { esp } from '@/ui/tema';

import { formatoCOP } from '@/core/dinero';
import { diasParaPago, eaAEm } from '@/core/deudas';
import { cicloDe } from '@/core/fechas';
import {
  borrarTarjeta, comprasACuotas, listarMovimientos, obtenerTarjeta, saldoTarjeta,
} from '@/db/crud';
import { useAjustes } from '@/store/ajustes';
import { useDatos, conRefresco } from '@/store/datos';

export default function DetalleTarjeta() {
  const t = useTema();
  const { id } = useLocalSearchParams<{ id: string }>();
  const tarjetaId = Number(id);
  const diaInicio = useAjustes((s) => s.diaInicioCiclo);
  const { revision, refrescar } = useDatos();

  useFocusEffect(useCallback(() => { refrescar(); }, [refrescar]));

  const tarjeta = useMemo(() => obtenerTarjeta(tarjetaId), [tarjetaId, revision]);
  const ciclo = cicloDe(new Date(), diaInicio);
  const saldo = useMemo(
    () => (tarjeta ? saldoTarjeta(tarjetaId, ciclo.desde) : 0),
    [tarjeta, tarjetaId, ciclo.desde, revision],
  );
  const diferidas = useMemo(() => comprasACuotas(tarjetaId), [tarjetaId, revision]);
  const movimientos = useMemo(
    () => listarMovimientos({ limite: 40 }).filter((m) => m.tarjetaId === tarjetaId),
    [tarjetaId, revision],
  );

  if (!tarjeta) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.fondo }} edges={['top']}>
        <Encabezado titulo="Tarjeta" />
        <EstadoVacio titulo="Tarjeta no encontrada" mensaje="Puede que la hayas eliminado." />
      </SafeAreaView>
    );
  }

  const uso = tarjeta.cupoTotal > 0 ? saldo / tarjeta.cupoTotal : 0;
  const dias = diasParaPago(tarjeta.diaPago);
  const cargaCuotas = diferidas.reduce((a, c) => a + c.cuota, 0);

  const eliminar = () => {
    Alert.alert('Eliminar tarjeta', 'Los movimientos asociados se conservan, pero quedan sin tarjeta.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => { conRefresco(() => borrarTarjeta(tarjetaId)); router.back(); } },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.fondo }} edges={['top']}>
      <Encabezado
        titulo={tarjeta.nombre}
        subtitulo={tarjeta.banco ?? undefined}
        accion="Eliminar" iconoAccion="trash-outline" onAccion={eliminar}
      />
      <ScrollView contentContainerStyle={{ padding: esp.lg, gap: esp.md, paddingBottom: esp.xxl }}>
        <TarjetaUI style={{ gap: esp.lg, backgroundColor: tarjeta.color }} plana>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="card" size={26} color="#FFFFFF" />
            <View style={{ flex: 1 }} />
            <Texto variante="micro" style={{ color: 'rgba(255,255,255,0.85)' }}>
              {tarjeta.tasaInteres}% E.A. · {eaAEm(tarjeta.tasaInteres).toFixed(2).replace('.', ',')}% E.M.
            </Texto>
          </View>
          <View>
            <Texto variante="micro" style={{ color: 'rgba(255,255,255,0.8)' }}>SALDO ACTUAL</Texto>
            <Texto variante="montoHero" style={{ color: '#FFFFFF' }}>{formatoCOP(saldo)}</Texto>
          </View>
          <View style={{ flexDirection: 'row' }}>
            <View style={{ flex: 1 }}>
              <Texto variante="micro" style={{ color: 'rgba(255,255,255,0.8)' }}>CUPO TOTAL</Texto>
              <Texto variante="monto" style={{ color: '#FFFFFF' }}>{formatoCOP(tarjeta.cupoTotal)}</Texto>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Texto variante="micro" style={{ color: 'rgba(255,255,255,0.8)' }}>DISPONIBLE</Texto>
              <Texto variante="monto" style={{ color: '#FFFFFF' }}>{formatoCOP(Math.max(0, tarjeta.cupoTotal - saldo))}</Texto>
            </View>
          </View>
          <BarraProgreso valor={uso} color="#FFFFFF" fondo="rgba(255,255,255,0.3)" alto={8} />
        </TarjetaUI>

        <View style={{ flexDirection: 'row', gap: esp.md }}>
          <TarjetaUI style={{ flex: 1, gap: 4 }}>
            <Texto variante="micro" color="tenue">PRÓXIMO PAGO</Texto>
            <Texto variante="montoGrande" style={{ fontSize: 20 }} color={dias <= 3 ? 'ambar' : 'texto'}>
              {dias === 0 ? 'Hoy' : `${dias} días`}
            </Texto>
            <Texto variante="micro" color="tenue">Día {tarjeta.diaPago} de cada mes</Texto>
          </TarjetaUI>
          <TarjetaUI style={{ flex: 1, gap: 4 }}>
            <Texto variante="micro" color="tenue">CORTE</Texto>
            <Texto variante="montoGrande" style={{ fontSize: 20 }}>Día {tarjeta.diaCorte}</Texto>
            <Texto variante="micro" color="tenue">Cierre de facturación</Texto>
          </TarjetaUI>
        </View>

        <TarjetaUI style={{ gap: esp.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Texto variante="seccion" style={{ flex: 1 }}>Compras a cuotas</Texto>
            <Texto variante="monto">{formatoCOP(cargaCuotas)}/mes</Texto>
          </View>
          {diferidas.length === 0 ? (
            <EstadoVacio titulo="Sin cuotas activas" mensaje="No tienes compras diferidas pendientes con esta tarjeta." />
          ) : diferidas.map((c) => {
            const pagadas = c.cuotas - c.pendientes;
            return (
              <View key={c.grupoId} style={{ gap: 6 }}>
                <View style={{ flexDirection: 'row', gap: esp.sm }}>
                  <Texto variante="cuerpo" style={{ flex: 1 }} numberOfLines={1}>{c.descripcion || 'Compra'}</Texto>
                  <Texto variante="etiqueta">{formatoCOP(c.cuota)}</Texto>
                </View>
                <BarraProgreso valor={pagadas / c.cuotas} color={tarjeta.color} alto={6} />
                <View style={{ flexDirection: 'row' }}>
                  <Texto variante="micro" color="tenue" style={{ flex: 1 }}>
                    Faltan {c.pendientes} de {c.cuotas} cuotas
                  </Texto>
                  <Texto variante="micro" color="tenue">
                    Desde {format(new Date(c.fecha + 'T00:00:00'), 'd MMM yyyy', { locale: es })}
                  </Texto>
                </View>
              </View>
            );
          })}
        </TarjetaUI>

        <TarjetaUI style={{ gap: esp.sm }}>
          <Texto variante="seccion">Movimientos de la tarjeta</Texto>
          {movimientos.length === 0 ? (
            <EstadoVacio titulo="Sin movimientos" mensaje="Registra un gasto con medio de pago Tarjeta crédito y aparecerá aquí." />
          ) : movimientos.map((m) => (
            <FilaMovimiento key={m.id} m={m} onPress={() => router.push(`/registro?id=${m.id}`)} />
          ))}
        </TarjetaUI>

        <Boton
          titulo="Registrar pago de la tarjeta"
          icono="swap-horizontal-outline"
          variante="secundario"
          ancho
          onPress={() => router.push('/registro?tipo=transferencia')}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
