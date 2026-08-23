import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { useTema } from '@/ui/TemaProvider';
import { Encabezado } from '@/ui/comp/Encabezado';
import { Texto } from '@/ui/comp/Texto';
import { Tarjeta } from '@/ui/comp/Tarjeta';
import { Boton } from '@/ui/comp/Boton';
import { Campo } from '@/ui/comp/Campo';
import { Hoja } from '@/ui/comp/Hoja';
import { BarraProgreso } from '@/ui/comp/BarraProgreso';
import { EstadoVacio } from '@/ui/comp/EstadoVacio';
import { Anillo } from '@/charts/AnillosMetas';
import { esp } from '@/ui/tema';

import { formatoCOP, parsearMonto, separarMiles } from '@/core/dinero';
import { calcularMeta, ESTADO_META_COLOR, ESTADO_META_TEXTO } from '@/core/metas';
import { borrarAporte, borrarMeta, listarAportes, obtenerMeta, registrarAporte } from '@/db/crud';
import { useDatos, conRefresco } from '@/store/datos';

export default function DetalleMeta() {
  const t = useTema();
  const { id } = useLocalSearchParams<{ id: string }>();
  const metaId = Number(id);
  const revision = useDatos((s) => s.revision);
  const [hoja, setHoja] = useState<'aporte' | 'retiro' | null>(null);
  const [monto, setMonto] = useState('');
  const [nota, setNota] = useState('');

  const meta = useMemo(() => obtenerMeta(metaId), [metaId, revision]);
  const aportes = useMemo(() => (meta ? listarAportes(metaId) : []), [metaId, revision, meta]);

  const escala = useSharedValue(1);
  const calc = meta
    ? calcularMeta({
        montoObjetivo: meta.montoObjetivo, montoActual: meta.montoActual,
        fechaLimite: meta.fechaLimite ? new Date(meta.fechaLimite + 'T00:00:00') : null,
        fechaCreacion: new Date(meta.fechaCreacion + 'T00:00:00'),
      })
    : null;

  // Celebracion cuando la meta queda cumplida.
  useEffect(() => {
    if (calc?.estado === 'cumplida') {
      escala.value = withRepeat(
        withSequence(withTiming(1.12, { duration: 420 }), withTiming(1, { duration: 420 })),
        3, false,
      );
    }
  }, [calc?.estado, escala]);

  const estiloCelebra = useAnimatedStyle(() => ({ transform: [{ scale: escala.value }] }));

  if (!meta || !calc) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.fondo }} edges={['top']}>
        <Encabezado titulo="Meta" />
        <EstadoVacio titulo="Meta no encontrada" mensaje="Es posible que la hayas eliminado." />
      </SafeAreaView>
    );
  }

  const registrar = () => {
    const m = parsearMonto(monto);
    if (m <= 0) return Alert.alert('Monto inválido', 'Debe ser mayor que cero.');
    if (hoja === 'retiro' && m > meta.montoActual) {
      return Alert.alert('No alcanza', `Solo tienes ${formatoCOP(meta.montoActual)} acumulados en esta meta.`);
    }
    conRefresco(() => registrarAporte(metaId, Math.round(m), hoja === 'retiro' ? 'retiro' : 'aporte', nota.trim() || undefined));
    setMonto(''); setNota(''); setHoja(null);
  };

  const eliminar = () => {
    Alert.alert('Eliminar meta', 'Se borrarán también todos sus aportes.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => { conRefresco(() => borrarMeta(metaId)); router.back(); } },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.fondo }} edges={['top']}>
      <Encabezado titulo={meta.nombre} accion="Eliminar" iconoAccion="trash-outline" onAccion={eliminar} />
      <ScrollView contentContainerStyle={{ padding: esp.lg, gap: esp.md, paddingBottom: esp.xxl }}>
        <Tarjeta style={{ gap: esp.lg, alignItems: 'center' }}>
          <Animated.View style={estiloCelebra}>
            <Anillo progreso={calc.progreso} color={meta.color} tam={150} grosor={14}>
              <View style={{ alignItems: 'center' }}>
                <Ionicons name={(meta.icono as any) || 'flag-outline'} size={26} color={meta.color} />
                <Texto variante="montoGrande" style={{ fontSize: 24, marginTop: 4 }}>
                  {Math.round(calc.progreso * 100)}%
                </Texto>
              </View>
            </Anillo>
          </Animated.View>

          {calc.estado === 'cumplida' ? (
            <View style={{ alignItems: 'center', gap: 4 }}>
              <Texto variante="titulo" color="verde">¡Meta cumplida!</Texto>
              <Texto variante="cuerpo" color="suave">Lograste juntar {formatoCOP(meta.montoObjetivo)}.</Texto>
            </View>
          ) : (
            <View style={{ alignItems: 'center', gap: 2 }}>
              <Texto variante="montoHero" style={{ fontSize: 32 }}>{formatoCOP(meta.montoActual)}</Texto>
              <Texto variante="cuerpo" color="suave">de {formatoCOP(meta.montoObjetivo)}</Texto>
            </View>
          )}

          <View style={{ alignSelf: 'stretch' }}>
            <BarraProgreso valor={calc.progreso} color={meta.color} alto={12} />
          </View>

          <View style={{
            paddingHorizontal: esp.md, paddingVertical: 5, borderRadius: 999,
            backgroundColor: t.superficie2,
          }}>
            <Texto variante="etiqueta" style={{ color: ESTADO_META_COLOR[calc.estado] }}>
              {ESTADO_META_TEXTO[calc.estado]}
              {calc.desfase !== 0 && calc.estado !== 'cumplida'
                ? ` · ${formatoCOP(Math.abs(calc.desfase))} ${calc.desfase > 0 ? 'adelantado' : 'atrasado'}`
                : ''}
            </Texto>
          </View>
        </Tarjeta>

        <View style={{ flexDirection: 'row', gap: esp.md }}>
          <Boton titulo="Aportar" icono="add" style={{ flex: 1 }} onPress={() => setHoja('aporte')} />
          <Boton titulo="Retirar" icono="remove" variante="secundario" style={{ flex: 1 }} onPress={() => setHoja('retiro')} />
        </View>

        <Tarjeta style={{ gap: esp.md }}>
          <Texto variante="seccion">Números de la meta</Texto>
          <Fila etiqueta="Falta" valor={formatoCOP(calc.faltante)} />
          {meta.fechaLimite ? (
            <Fila etiqueta="Fecha límite" valor={format(new Date(meta.fechaLimite + 'T00:00:00'), "d 'de' MMM 'de' yyyy", { locale: es })} />
          ) : null}
          {calc.mesesRestantes != null ? <Fila etiqueta="Meses restantes" valor={String(calc.mesesRestantes)} /> : null}
          <Fila etiqueta="Aporte mensual necesario" valor={formatoCOP(calc.aporteMensualNecesario)} destacado />
          <Fila
            etiqueta="Fecha proyectada (ritmo real)"
            valor={calc.fechaProyectada
              ? format(calc.fechaProyectada, "d 'de' MMM 'de' yyyy", { locale: es })
              : 'Sin aportes todavía'}
          />
          {meta.aporteAutomatico > 0 ? (
            <Fila etiqueta="Aporte automático" valor={`${formatoCOP(meta.aporteAutomatico)} al mes`} />
          ) : null}
        </Tarjeta>

        <Tarjeta style={{ gap: esp.sm }}>
          <Texto variante="seccion">Movimientos de la meta</Texto>
          {aportes.length === 0 ? (
            <EstadoVacio titulo="Sin aportes" mensaje="Registra tu primer aporte y verás el progreso avanzar." />
          ) : aportes.map((a) => (
            <View key={a.id} style={{ flexDirection: 'row', alignItems: 'center', gap: esp.md, paddingVertical: 8 }}>
              <View style={{
                width: 34, height: 34, borderRadius: 17,
                backgroundColor: a.tipo === 'aporte' ? t.verdeFondo : t.rojoFondo,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Ionicons name={a.tipo === 'aporte' ? 'arrow-up' : 'arrow-down'} size={16} color={a.tipo === 'aporte' ? t.verde : t.rojo} />
              </View>
              <View style={{ flex: 1 }}>
                <Texto variante="cuerpo">{a.tipo === 'aporte' ? 'Aporte' : 'Retiro'}</Texto>
                <Texto variante="micro" color="tenue" numberOfLines={1}>
                  {format(new Date(a.fecha + 'T00:00:00'), 'd MMM yyyy', { locale: es })}
                  {a.nota ? ` · ${a.nota}` : ''}
                </Texto>
              </View>
              <Texto variante="monto" color={a.tipo === 'aporte' ? 'verde' : 'rojo'}>
                {a.tipo === 'aporte' ? '+' : '-'} {formatoCOP(a.monto)}
              </Texto>
              <Pressable
                onPress={() => conRefresco(() => borrarAporte(a.id, metaId))}
                hitSlop={8} accessibilityRole="button" accessibilityLabel="Borrar aporte"
              >
                <Ionicons name="close" size={18} color={t.textoTenue} />
              </Pressable>
            </View>
          ))}
        </Tarjeta>
      </ScrollView>

      <Hoja
        visible={hoja !== null}
        onCerrar={() => setHoja(null)}
        titulo={hoja === 'retiro' ? 'Retirar de la meta' : 'Aportar a la meta'}
        alto="55%"
      >
        <Campo
          etiqueta="Monto"
          value={monto ? separarMiles(parsearMonto(monto)) : ''}
          onChangeText={setMonto}
          keyboardType="number-pad"
          placeholder="0"
        />
        <Campo
          etiqueta={hoja === 'retiro' ? 'Motivo del retiro' : 'Nota (opcional)'}
          value={nota}
          onChangeText={setNota}
          placeholder={hoja === 'retiro' ? '¿Para qué lo usaste?' : 'Ej: quincena de agosto'}
        />
        <Boton titulo={hoja === 'retiro' ? 'Registrar retiro' : 'Registrar aporte'} ancho onPress={registrar} />
      </Hoja>
    </SafeAreaView>
  );
}

function Fila({ etiqueta, valor, destacado }: { etiqueta: string; valor: string; destacado?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: esp.md }}>
      <Texto variante="cuerpo" color="suave" style={{ flex: 1 }}>{etiqueta}</Texto>
      <Texto variante={destacado ? 'monto' : 'etiqueta'} color={destacado ? 'acento' : 'texto'}>{valor}</Texto>
    </View>
  );
}
