import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTema } from '@/ui/TemaProvider';
import { Encabezado } from '@/ui/comp/Encabezado';
import { Texto } from '@/ui/comp/Texto';
import { Tarjeta } from '@/ui/comp/Tarjeta';
import { Boton } from '@/ui/comp/Boton';
import { Campo } from '@/ui/comp/Campo';
import { Chip } from '@/ui/comp/Chip';
import { Hoja } from '@/ui/comp/Hoja';
import { EstadoVacio } from '@/ui/comp/EstadoVacio';
import { esp, radio } from '@/ui/tema';

import { formatoCOP, parsearMonto, separarMiles } from '@/core/dinero';
import { COLORES_CATEGORIA } from '@/constantes/paleta';
import { borrarCuenta, conciliarCuenta, crearCuenta, saldoCuenta } from '@/db/crud';
import { useDatos, conRefresco } from '@/store/datos';
import type { TipoCuenta } from '@/db/schema';

const TIPOS: { id: TipoCuenta; texto: string; icono: string }[] = [
  { id: 'efectivo', texto: 'Efectivo', icono: 'cash-outline' },
  { id: 'bancaria', texto: 'Bancaria', icono: 'business-outline' },
  { id: 'digital', texto: 'Billetera digital', icono: 'phone-portrait-outline' },
  { id: 'ahorro', texto: 'Ahorro', icono: 'wallet-outline' },
];

export default function Cuentas() {
  const t = useTema();
  const { cuentas, revision, refrescar } = useDatos();
  const [hoja, setHoja] = useState(false);
  const [nombre, setNombre] = useState('');
  const [banco, setBanco] = useState('');
  const [saldoInicial, setSaldoInicial] = useState('');
  const [tipo, setTipo] = useState<TipoCuenta>('bancaria');
  const [color, setColor] = useState<string>('#3B82F6');
  const [conciliando, setConciliando] = useState<{ id: number; nombre: string; saldo: number } | null>(null);
  const [saldoReal, setSaldoReal] = useState('');

  useFocusEffect(useCallback(() => { refrescar(); }, [refrescar]));

  const saldos = useMemo(
    () => cuentas.map((c) => ({ cuenta: c, saldo: saldoCuenta(c.id) })),
    [cuentas, revision],
  );
  const consolidado = saldos.reduce((a, s) => a + s.saldo, 0);

  /**
   * Compara el saldo real con el calculado y deja constancia de la diferencia
   * como un movimiento de ajuste. Nunca se corrige el saldo inicial en
   * silencio: así ningún peso aparece ni desaparece sin explicación.
   */
  const conciliar = () => {
    if (!conciliando) return;
    const real = Math.round(parsearMonto(saldoReal));
    const dif = real - conciliando.saldo;
    if (dif === 0) {
      Alert.alert('Todo cuadra', 'El saldo de la app coincide exactamente con el que ingresaste.');
      setConciliando(null); setSaldoReal('');
      return;
    }
    Alert.alert(
      'Hay una diferencia',
      `La app dice ${formatoCOP(conciliando.saldo)} y tú tienes ${formatoCOP(real)}.

` +
      `Diferencia: ${formatoCOP(dif, { signo: true })}.

` +
      'Se registrará un movimiento de "Ajuste de saldo" con esa diferencia, etiquetado como "ajuste", ' +
      'para que quede visible en el historial y puedas buscar después qué se te olvidó registrar.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Registrar ajuste',
          onPress: () => {
            conRefresco(() => conciliarCuenta(conciliando.id, real));
            setConciliando(null); setSaldoReal('');
          },
        },
      ],
    );
  };

  const guardar = () => {
    if (!nombre.trim()) return Alert.alert('Falta el nombre', 'Ponle un nombre a la cuenta.');
    conRefresco(() => crearCuenta({
      nombre: nombre.trim(), tipo, saldoInicial: Math.round(parsearMonto(saldoInicial)),
      banco: banco.trim() || null, color,
      icono: TIPOS.find((x) => x.id === tipo)?.icono ?? 'wallet-outline', archivada: 0,
    } as any));
    setNombre(''); setBanco(''); setSaldoInicial('');
    setHoja(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.fondo }} edges={['top']}>
      <Encabezado titulo="Cuentas y bolsillos" subtitulo="Saldo consolidado de tu plata" />
      <ScrollView contentContainerStyle={{ padding: esp.lg, gap: esp.md, paddingBottom: esp.xxl }}>
        <Tarjeta style={{ gap: 4 }}>
          <Texto variante="micro" color="tenue">SALDO CONSOLIDADO</Texto>
          <Texto variante="montoHero" color={consolidado >= 0 ? 'texto' : 'rojo'}>{formatoCOP(consolidado)}</Texto>
          <Texto variante="micro" color="tenue">Suma de {cuentas.length} cuentas</Texto>
        </Tarjeta>

        {saldos.length === 0 ? (
          <Tarjeta>
            <EstadoVacio
              titulo="Sin cuentas"
              mensaje="Registra tu efectivo, tus cuentas bancarias y tus billeteras digitales para saber cuánta plata tienes en total."
              accion="Crear cuenta"
              onAccion={() => setHoja(true)}
            />
          </Tarjeta>
        ) : saldos.map(({ cuenta: c, saldo }) => (
          <Tarjeta key={c.id} style={{ flexDirection: 'row', alignItems: 'center', gap: esp.md }}>
            <View style={{
              width: 44, height: 44, borderRadius: radio.md,
              backgroundColor: c.color, alignItems: 'center', justifyContent: 'center',
            }}>
              <Ionicons name={(c.icono as any) || 'wallet-outline'} size={22} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Texto variante="cuerpo">{c.nombre}</Texto>
              <Texto variante="micro" color="tenue">
                {TIPOS.find((x) => x.id === c.tipo)?.texto}{c.banco ? ` · ${c.banco}` : ''}
              </Texto>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Texto variante="monto" color={saldo >= 0 ? 'texto' : 'rojo'}>{formatoCOP(saldo)}</Texto>
              <Texto variante="micro" color="tenue">inicial {formatoCOP(c.saldoInicial)}</Texto>
            </View>
            <Pressable
              onPress={() => { setConciliando({ id: c.id, nombre: c.nombre, saldo }); setSaldoReal(''); }}
              hitSlop={10} accessibilityRole="button" accessibilityLabel={`Conciliar ${c.nombre}`}
            >
              <Ionicons name="checkmark-done-outline" size={19} color={t.acento} />
            </Pressable>
            <Pressable
              onPress={() => Alert.alert('Eliminar cuenta', `¿Borrar "${c.nombre}"? Los movimientos se conservan.`, [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Eliminar', style: 'destructive', onPress: () => conRefresco(() => borrarCuenta(c.id)) },
              ])}
              hitSlop={10} accessibilityRole="button" accessibilityLabel={`Eliminar ${c.nombre}`}
            >
              <Ionicons name="trash-outline" size={18} color={t.textoTenue} />
            </Pressable>
          </Tarjeta>
        ))}

        <Boton titulo="Nueva cuenta" icono="add" variante="secundario" ancho onPress={() => setHoja(true)} />
      </ScrollView>

      <Hoja
        visible={conciliando !== null}
        onCerrar={() => setConciliando(null)}
        titulo={`Cuadrar ${conciliando?.nombre ?? ''}`}
        alto="60%"
      >
        <Tarjeta style={{ gap: 4 }}>
          <Texto variante="micro" color="tenue">SEGÚN LA APP</Texto>
          <Texto variante="montoGrande">{formatoCOP(conciliando?.saldo ?? 0)}</Texto>
        </Tarjeta>
        <Campo
          etiqueta="¿Cuánto tienes en realidad?"
          value={saldoReal ? separarMiles(parsearMonto(saldoReal)) : ''}
          onChangeText={setSaldoReal}
          keyboardType="number-pad"
          placeholder="Mira el saldo en tu banco o cuenta el efectivo"
        />
        <Texto variante="micro" color="suave" style={{ lineHeight: 18 }}>
          Si hay diferencia, se registra un movimiento de ajuste etiquetado como &quot;ajuste&quot;.
          Queda a la vista en el historial en vez de corregirse en silencio: así puedes buscar
          después qué movimiento se te pasó.
        </Texto>
        <Boton titulo="Comparar" ancho onPress={conciliar} deshabilitado={!saldoReal} />
      </Hoja>

      <Hoja visible={hoja} onCerrar={() => setHoja(false)} titulo="Nueva cuenta" alto="80%">
        <Campo etiqueta="Nombre" value={nombre} onChangeText={setNombre} placeholder="Cuenta de ahorros, Nequi…" />
        <View style={{ gap: 6 }}>
          <Texto variante="etiqueta" color="suave">Tipo</Texto>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: esp.sm }}>
            {TIPOS.map((x) => (
              <Chip key={x.id} texto={x.texto} icono={x.icono as any} compacto activo={tipo === x.id} onPress={() => setTipo(x.id)} />
            ))}
          </View>
        </View>
        <Campo etiqueta="Banco o entidad (opcional)" value={banco} onChangeText={setBanco} placeholder="Bancolombia, Nequi…" />
        <Campo
          etiqueta="Saldo inicial"
          value={saldoInicial ? separarMiles(parsearMonto(saldoInicial)) : ''}
          onChangeText={setSaldoInicial} keyboardType="number-pad" placeholder="0"
        />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: esp.sm }}>
          {COLORES_CATEGORIA.map((c) => (
            <Pressable
              key={c} onPress={() => setColor(c)} accessibilityRole="button" accessibilityLabel={`Color ${c}`}
              style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c, borderWidth: color === c ? 3 : 0, borderColor: t.texto }}
            />
          ))}
        </View>
        <Boton titulo="Crear cuenta" ancho onPress={guardar} />
      </Hoja>
    </SafeAreaView>
  );
}
