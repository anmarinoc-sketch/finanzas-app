import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTema } from '@/ui/TemaProvider';
import { Encabezado } from '@/ui/comp/Encabezado';
import { Texto } from '@/ui/comp/Texto';
import { Tarjeta } from '@/ui/comp/Tarjeta';
import { Boton } from '@/ui/comp/Boton';
import { Campo } from '@/ui/comp/Campo';
import { Hoja } from '@/ui/comp/Hoja';
import { BarraProgreso } from '@/ui/comp/BarraProgreso';
import { EstadoVacio } from '@/ui/comp/EstadoVacio';
import { esp, radio } from '@/ui/tema';

import { formatoCOP, formatoPct, parsearMonto, separarMiles } from '@/core/dinero';
import { cuotaFrancesa, diasParaPago, eaAEm, mesesRestantes, nivelEndeudamiento } from '@/core/deudas';
import { cicloDe } from '@/core/fechas';
import { COLORES_CATEGORIA } from '@/constantes/paleta';
import { crearDeuda, crearTarjeta, borrarDeuda, comprasACuotas, cargaCuotasDelMes, saldoTarjeta } from '@/db/crud';
import { useAjustes } from '@/store/ajustes';
import { useDatos, conRefresco } from '@/store/datos';

export default function Tarjetas() {
  const t = useTema();
  const diaInicio = useAjustes((s) => s.diaInicioCiclo);
  const { tarjetas, deudas, ingresoMensual, revision, refrescar } = useDatos();
  const [hoja, setHoja] = useState<'tarjeta' | 'deuda' | null>(null);

  useFocusEffect(useCallback(() => { refrescar(); }, [refrescar]));

  const ciclo = cicloDe(new Date(), diaInicio);
  const cuotasMes = useMemo(() => cargaCuotasDelMes(), [revision]);
  const diferidas = useMemo(() => comprasACuotas(), [revision]);
  const cuotaDeudas = deudas.reduce((a, d) => a + d.cuotaMensual, 0);
  const endeudamiento = nivelEndeudamiento(cuotasMes + cuotaDeudas, ingresoMensual);
  const saldoTotal = tarjetas.reduce((a, c) => a + saldoTarjeta(c.id, ciclo.desde), 0);
  const cupoTotal = tarjetas.reduce((a, c) => a + c.cupoTotal, 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.fondo }} edges={['top']}>
      <Encabezado titulo="Tarjetas y deudas" subtitulo="Cupo, cuotas y nivel de endeudamiento" />
      <ScrollView contentContainerStyle={{ padding: esp.lg, gap: esp.md, paddingBottom: esp.xxl }}>

        {/* Semaforo de endeudamiento */}
        <Tarjeta style={{ gap: esp.md }}>
          <Texto variante="seccion">Nivel de endeudamiento</Texto>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: esp.md }}>
            <Texto variante="montoHero" style={{ color: endeudamiento.color, fontSize: 36 }}>
              {formatoPct(endeudamiento.porcentaje)}
            </Texto>
            <View style={{ flex: 1, paddingBottom: 6 }}>
              <Texto variante="etiqueta" style={{ color: endeudamiento.color }}>{endeudamiento.texto}</Texto>
              <Texto variante="micro" color="tenue">
                {formatoCOP(cuotasMes + cuotaDeudas)} en cuotas sobre {formatoCOP(ingresoMensual)} de ingreso
              </Texto>
            </View>
          </View>
          <BarraProgreso valor={Math.min(1, endeudamiento.fraccion / 0.5)} color={endeudamiento.color} alto={10} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Texto variante="micro" color="verde">Sano &lt; 30%</Texto>
            <Texto variante="micro" color="ambar">Alerta 30–40%</Texto>
            <Texto variante="micro" color="rojo">Riesgo &gt; 40%</Texto>
          </View>
        </Tarjeta>

        {/* Tarjetas de credito */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Texto variante="seccion" style={{ flex: 1 }}>Tarjetas de crédito</Texto>
          <Pressable onPress={() => setHoja('tarjeta')} accessibilityRole="button">
            <Texto variante="etiqueta" color="acento">Agregar</Texto>
          </Pressable>
        </View>

        {tarjetas.length === 0 ? (
          <Tarjeta>
            <EstadoVacio
              titulo="Sin tarjetas registradas"
              mensaje="Registra tus tarjetas con su día de corte y de pago para no volver a pagar intereses por olvido."
              accion="Agregar tarjeta"
              onAccion={() => setHoja('tarjeta')}
            />
          </Tarjeta>
        ) : tarjetas.map((c) => {
          const saldo = saldoTarjeta(c.id, ciclo.desde);
          const uso = c.cupoTotal > 0 ? saldo / c.cupoTotal : 0;
          const dias = diasParaPago(c.diaPago);
          return (
            <Pressable key={c.id} onPress={() => router.push(`/tarjeta/${c.id}`)} accessibilityRole="button">
              <Tarjeta style={{ gap: esp.md, borderLeftWidth: 5, borderLeftColor: c.color }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: esp.sm }}>
                  <Ionicons name="card" size={20} color={c.color} />
                  <View style={{ flex: 1 }}>
                    <Texto variante="seccion">{c.nombre}</Texto>
                    <Texto variante="micro" color="tenue">{c.banco ?? 'Sin banco'} · {c.tasaInteres}% E.A.</Texto>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={t.textoTenue} />
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                  <View style={{ flex: 1 }}>
                    <Texto variante="micro" color="tenue">SALDO ACTUAL</Texto>
                    <Texto variante="montoGrande" style={{ fontSize: 22 }}>{formatoCOP(saldo)}</Texto>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Texto variante="micro" color="tenue">DISPONIBLE</Texto>
                    <Texto variante="monto" color="verde">{formatoCOP(Math.max(0, c.cupoTotal - saldo))}</Texto>
                  </View>
                </View>

                <BarraProgreso valor={uso} color={uso > 0.8 ? t.rojo : uso > 0.5 ? t.ambar : c.color} />

                <View style={{
                  flexDirection: 'row', alignItems: 'center', gap: esp.sm,
                  backgroundColor: dias <= 3 ? t.ambarFondo : t.superficie2,
                  borderRadius: radio.md, padding: esp.md,
                }}>
                  <Ionicons name="alarm-outline" size={18} color={dias <= 3 ? t.ambar : t.textoSuave} />
                  <Texto variante="etiqueta" color={dias <= 3 ? 'ambar' : 'suave'} style={{ flex: 1 }}>
                    {dias === 0 ? 'Hoy es el día de pago' : `Faltan ${dias} días para el pago (día ${c.diaPago})`}
                  </Texto>
                  <Texto variante="micro" color="tenue">Corte: {c.diaCorte}</Texto>
                </View>
              </Tarjeta>
            </Pressable>
          );
        })}

        {/* Cuotas pendientes */}
        <Tarjeta style={{ gap: esp.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Texto variante="seccion" style={{ flex: 1 }}>Cuotas pendientes</Texto>
            <Texto variante="monto">{formatoCOP(cuotasMes)}</Texto>
          </View>
          <Texto variante="micro" color="tenue">Carga mensual de compras diferidas</Texto>
          {diferidas.length === 0 ? (
            <EstadoVacio titulo="Sin compras a cuotas" mensaje="Cuando difieras una compra con tarjeta, aquí verás cuánto falta y hasta cuándo." />
          ) : diferidas.map((c) => {
            const pagadas = c.cuotas - c.pendientes;
            return (
              <View key={c.grupoId} style={{ gap: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: esp.sm }}>
                  <Texto variante="cuerpo" style={{ flex: 1 }} numberOfLines={1}>{c.descripcion || 'Compra diferida'}</Texto>
                  <Texto variante="etiqueta">{formatoCOP(c.cuota)}/mes</Texto>
                </View>
                <BarraProgreso valor={pagadas / c.cuotas} color={t.acento} alto={6} />
                <View style={{ flexDirection: 'row' }}>
                  <Texto variante="micro" color="tenue" style={{ flex: 1 }}>
                    Cuota {Math.max(1, pagadas)} de {c.cuotas} · faltan {c.pendientes}
                  </Texto>
                  <Texto variante="micro" color="suave">Total {formatoCOP(c.total)}</Texto>
                </View>
              </View>
            );
          })}
        </Tarjeta>

        {/* Deudas y prestamos */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Texto variante="seccion" style={{ flex: 1 }}>Préstamos y deudas</Texto>
          <Pressable onPress={() => setHoja('deuda')} accessibilityRole="button">
            <Texto variante="etiqueta" color="acento">Agregar</Texto>
          </Pressable>
        </View>

        {deudas.length === 0 ? (
          <Tarjeta>
            <EstadoVacio
              titulo="Sin deudas registradas"
              mensaje="Si tienes un crédito de vehículo, de libre inversión o un préstamo, regístralo para ver cuánto te falta y cuándo terminas."
              accion="Agregar deuda"
              onAccion={() => setHoja('deuda')}
            />
          </Tarjeta>
        ) : deudas.map((d) => {
          const pagado = d.montoOriginal - d.saldo;
          const meses = mesesRestantes(d.saldo, d.tasa, d.cuotaMensual);
          return (
            <Tarjeta key={d.id} style={{ gap: esp.md, borderLeftWidth: 5, borderLeftColor: d.color }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: esp.sm }}>
                <View style={{ flex: 1 }}>
                  <Texto variante="seccion">{d.nombre}</Texto>
                  <Texto variante="micro" color="tenue">{d.entidad ?? 'Sin entidad'} · {d.tasa}% E.M.</Texto>
                </View>
                <Pressable
                  onPress={() => Alert.alert('Eliminar deuda', `¿Borrar "${d.nombre}"?`, [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Eliminar', style: 'destructive', onPress: () => conRefresco(() => borrarDeuda(d.id)) },
                  ])}
                  hitSlop={8} accessibilityRole="button" accessibilityLabel={`Eliminar ${d.nombre}`}
                >
                  <Ionicons name="trash-outline" size={18} color={t.textoTenue} />
                </Pressable>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                <View style={{ flex: 1 }}>
                  <Texto variante="micro" color="tenue">SALDO</Texto>
                  <Texto variante="montoGrande" style={{ fontSize: 22 }}>{formatoCOP(d.saldo)}</Texto>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Texto variante="micro" color="tenue">CUOTA</Texto>
                  <Texto variante="monto">{formatoCOP(d.cuotaMensual)}</Texto>
                </View>
              </View>
              <BarraProgreso valor={d.montoOriginal > 0 ? pagado / d.montoOriginal : 0} color={t.verde} />
              <Texto variante="micro" color="tenue">
                Llevas pagado {formatoCOP(pagado)} de {formatoCOP(d.montoOriginal)}
                {meses ? ` · terminas en ${meses} ${meses === 1 ? 'mes' : 'meses'}` : ' · la cuota no cubre los intereses'}
              </Texto>
            </Tarjeta>
          );
        })}

        {tarjetas.length ? (
          <Texto variante="micro" color="tenue" style={{ textAlign: 'center' }}>
            Cupo total {formatoCOP(cupoTotal)} · utilizado {formatoCOP(saldoTotal)}
          </Texto>
        ) : null}
      </ScrollView>

      <HojaTarjeta visible={hoja === 'tarjeta'} onCerrar={() => setHoja(null)} />
      <HojaDeuda visible={hoja === 'deuda'} onCerrar={() => setHoja(null)} />
    </SafeAreaView>
  );
}

/** Formulario de alta de tarjeta. */
function HojaTarjeta({ visible, onCerrar }: { visible: boolean; onCerrar: () => void }) {
  const t = useTema();
  const [nombre, setNombre] = useState('');
  const [banco, setBanco] = useState('');
  const [cupo, setCupo] = useState('');
  const [corte, setCorte] = useState('15');
  const [pago, setPago] = useState('5');
  const [tasa, setTasa] = useState('26');
  const [color, setColor] = useState<string>('#4F46E5');

  const guardar = () => {
    const c = parsearMonto(cupo);
    if (!nombre.trim()) return Alert.alert('Falta el nombre', 'Ponle un nombre a la tarjeta.');
    if (c <= 0) return Alert.alert('Cupo inválido', 'El cupo debe ser mayor que cero.');
    const dc = Number(corte), dp = Number(pago);
    if (!(dc >= 1 && dc <= 28) || !(dp >= 1 && dp <= 28)) {
      return Alert.alert('Días inválidos', 'El día de corte y el de pago deben estar entre 1 y 28.');
    }
    conRefresco(() => crearTarjeta({
      nombre: nombre.trim(), banco: banco.trim() || null, cupoTotal: Math.round(c),
      diaCorte: dc, diaPago: dp, tasaInteres: Number(tasa) || 0, color, archivada: 0,
    } as any));
    setNombre(''); setBanco(''); setCupo('');
    onCerrar();
  };

  return (
    <Hoja visible={visible} onCerrar={onCerrar} titulo="Nueva tarjeta" alto="85%">
      <Campo etiqueta="Nombre" value={nombre} onChangeText={setNombre} placeholder="Visa Oro, Mastercard…" />
      <Campo etiqueta="Banco" value={banco} onChangeText={setBanco} placeholder="Bancolombia, Davivienda…" />
      <Campo
        etiqueta="Cupo total"
        value={cupo ? separarMiles(parsearMonto(cupo)) : ''}
        onChangeText={setCupo} keyboardType="number-pad" placeholder="0"
      />
      <View style={{ flexDirection: 'row', gap: esp.md }}>
        <View style={{ flex: 1 }}>
          <Campo etiqueta="Día de corte" value={corte} onChangeText={setCorte} keyboardType="number-pad" />
        </View>
        <View style={{ flex: 1 }}>
          <Campo etiqueta="Día de pago" value={pago} onChangeText={setPago} keyboardType="number-pad" />
        </View>
        <View style={{ flex: 1 }}>
          <Campo etiqueta="Tasa % E.A." value={tasa} onChangeText={setTasa} keyboardType="decimal-pad" />
        </View>
      </View>
      <Texto variante="micro" color="tenue">
        Equivale a {(eaAEm(Number(tasa) || 0)).toFixed(2).replace('.', ',')}% efectivo mensual.
      </Texto>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: esp.sm }}>
        {COLORES_CATEGORIA.map((c) => (
          <Pressable
            key={c} onPress={() => setColor(c)} accessibilityRole="button" accessibilityLabel={`Color ${c}`}
            style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c, borderWidth: color === c ? 3 : 0, borderColor: t.texto }}
          />
        ))}
      </View>
      <Boton titulo="Guardar tarjeta" ancho onPress={guardar} />
    </Hoja>
  );
}

/** Formulario de alta de deuda, con calculo automatico de la cuota. */
function HojaDeuda({ visible, onCerrar }: { visible: boolean; onCerrar: () => void }) {
  const [nombre, setNombre] = useState('');
  const [entidad, setEntidad] = useState('');
  const [original, setOriginal] = useState('');
  const [saldo, setSaldo] = useState('');
  const [tasa, setTasa] = useState('1.5');
  const [plazo, setPlazo] = useState('24');
  const [cuota, setCuota] = useState('');

  const sugerida = cuotaFrancesa(parsearMonto(saldo) || parsearMonto(original), Number(tasa) || 0, Number(plazo) || 1);

  const guardar = () => {
    const o = parsearMonto(original);
    const s = parsearMonto(saldo) || o;
    if (!nombre.trim()) return Alert.alert('Falta el nombre', 'Ponle un nombre a la deuda.');
    if (o <= 0) return Alert.alert('Monto inválido', 'El monto original debe ser mayor que cero.');
    if (s > o) return Alert.alert('Saldo inválido', 'El saldo no puede ser mayor que el monto original.');
    conRefresco(() => crearDeuda({
      nombre: nombre.trim(), entidad: entidad.trim() || null,
      montoOriginal: Math.round(o), saldo: Math.round(s),
      tasa: Number(tasa) || 0, cuotaMensual: Math.round(parsearMonto(cuota) || sugerida),
      plazoMeses: Number(plazo) || 0, diaPago: 5, color: '#EF4444', activa: 1,
    } as any));
    setNombre(''); setEntidad(''); setOriginal(''); setSaldo(''); setCuota('');
    onCerrar();
  };

  return (
    <Hoja visible={visible} onCerrar={onCerrar} titulo="Nueva deuda" alto="85%">
      <Campo etiqueta="Nombre" value={nombre} onChangeText={setNombre} placeholder="Crédito de vehículo, préstamo…" />
      <Campo etiqueta="Entidad" value={entidad} onChangeText={setEntidad} placeholder="Banco o persona" />
      <Campo
        etiqueta="Monto original"
        value={original ? separarMiles(parsearMonto(original)) : ''}
        onChangeText={setOriginal} keyboardType="number-pad" placeholder="0"
      />
      <Campo
        etiqueta="Saldo actual"
        value={saldo ? separarMiles(parsearMonto(saldo)) : ''}
        onChangeText={setSaldo} keyboardType="number-pad" placeholder="Igual al original si no has pagado"
      />
      <View style={{ flexDirection: 'row', gap: esp.md }}>
        <View style={{ flex: 1 }}>
          <Campo etiqueta="Tasa % E.M." value={tasa} onChangeText={setTasa} keyboardType="decimal-pad" />
        </View>
        <View style={{ flex: 1 }}>
          <Campo etiqueta="Plazo (meses)" value={plazo} onChangeText={setPlazo} keyboardType="number-pad" />
        </View>
      </View>
      <Campo
        etiqueta="Cuota mensual"
        value={cuota ? separarMiles(parsearMonto(cuota)) : ''}
        onChangeText={setCuota} keyboardType="number-pad"
        placeholder={`Sugerida: ${separarMiles(sugerida)}`}
      />
      <Texto variante="micro" color="tenue">
        Con esa tasa y plazo, la cuota fija sería {formatoCOP(sugerida)} (sistema francés).
      </Texto>
      <Boton titulo="Guardar deuda" ancho onPress={guardar} />
    </Hoja>
  );
}
