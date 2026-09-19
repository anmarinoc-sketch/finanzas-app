import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import { addDays, format, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';

import { useTema } from '@/ui/TemaProvider';
import { Texto } from '@/ui/comp/Texto';
import { Boton } from '@/ui/comp/Boton';
import { Campo, CampoSelector, Interruptor } from '@/ui/comp/Campo';
import { Chip } from '@/ui/comp/Chip';
import { Hoja } from '@/ui/comp/Hoja';
import { IconoCategoria } from '@/ui/comp/IconoCategoria';
import { TecladoNumerico } from '@/ui/comp/TecladoNumerico';
import { MontoEditable } from '@/ui/comp/MontoEditable';
import { Segmentado } from '@/ui/comp/SelectorPeriodo';
import { esp, radio } from '@/ui/tema';

import {
  borrarDigito, cursorTrasDigitos, digitosAntesDelCursor,
  formatoCOP, insertarDigitos, separarMiles,
} from '@/core/dinero';
import { cuotaMensual } from '@/core/cuotas';
import { MEDIOS_PAGO } from '@/constantes/medios';
import { useDatos, conRefresco } from '@/store/datos';
import { useAjustes } from '@/store/ajustes';
import { usePeriodo } from '@/store/periodo';
import { offsetDeCiclo } from '@/core/fechas';
import {
  actualizarTransaccion, borrarTransaccion, crearRecurrente, crearTransaccion,
  listarSubcategorias, obtenerTransaccion,
} from '@/db/crud';
import type { Frecuencia, MedioPago, TipoTransaccion } from '@/db/schema';
import { conFrontera } from '@/ui/Frontera';

const esMismoDia = (f: Date, delta: number) => isSameDay(f, addDays(new Date(), delta));

const FRECUENCIAS: { id: Frecuencia; texto: string }[] = [
  { id: 'semanal', texto: 'Semanal' },
  { id: 'quincenal', texto: 'Quincenal' },
  { id: 'mensual', texto: 'Mensual' },
  { id: 'anual', texto: 'Anual' },
];

function Registro() {
  const t = useTema();
  const params = useLocalSearchParams<{ id?: string; tipo?: string }>();
  const editandoId = params.id ? Number(params.id) : null;
  const { categoriasRaiz, categorias: todasLasCategorias, cuentas, tarjetas } = useDatos();
  const diaInicioCiclo = useAjustes((s) => s.diaInicioCiclo);

  const [tipo, setTipo] = useState<TipoTransaccion>((params.tipo as TipoTransaccion) || 'gasto');
  const [digitos, setDigitos] = useState('');
  // Posición del cursor dentro del texto formateado del monto.
  const [cursor, setCursor] = useState(0);
  const [categoriaId, setCategoriaId] = useState<number | null>(null);
  const [subcategoriaId, setSubcategoriaId] = useState<number | null>(null);
  const [fecha, setFecha] = useState(new Date());
  const [medio, setMedio] = useState<MedioPago>('efectivo');
  const [cuentaId, setCuentaId] = useState<number | null>(null);
  const [cuentaDestinoId, setCuentaDestinoId] = useState<number | null>(null);
  const [tarjetaId, setTarjetaId] = useState<number | null>(null);
  const [descripcion, setDescripcion] = useState('');
  const [notas, setNotas] = useState('');
  const [etiquetas, setEtiquetas] = useState('');
  const [fotoUri, setFotoUri] = useState<string | null>(null);
  const [cuotas, setCuotas] = useState(1);
  const [esRecurrente, setEsRecurrente] = useState(false);
  const [frecuencia, setFrecuencia] = useState<Frecuencia>('mensual');
  const [avanzado, setAvanzado] = useState(false);
  const [hojaCategoria, setHojaCategoria] = useState(false);
  const [hojaFecha, setHojaFecha] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const monto = Number(digitos || '0');
  const formateado = `$ ${separarMiles(monto)}`;

  /**
   * El teclado propio escribe y borra en la posición del cursor, no solo al
   * final: así se puede tocar el número y corregir un dígito concreto.
   */
  const escribirDigitos = (nuevos: string) => {
    const pos = digitosAntesDelCursor(formateado, cursor);
    const siguiente = insertarDigitos(digitos, pos, nuevos);
    setDigitos(siguiente);
    const nuevoFormato = `$ ${separarMiles(Number(siguiente || '0'))}`;
    setCursor(cursorTrasDigitos(nuevoFormato, pos + nuevos.length));
  };

  const borrarEnCursor = () => {
    const pos = digitosAntesDelCursor(formateado, cursor);
    const siguiente = borrarDigito(digitos, pos);
    setDigitos(siguiente);
    const nuevoFormato = `$ ${separarMiles(Number(siguiente || '0'))}`;
    setCursor(cursorTrasDigitos(nuevoFormato, Math.max(0, pos - 1)));
  };

  const limpiarMonto = () => { setDigitos(''); setCursor(2); };
  const categoria = categoriasRaiz.find((c) => c.id === categoriaId);
  const subcategorias = useMemo(
    () => (categoriaId ? listarSubcategorias(categoriaId) : []),
    [categoriaId],
  );

  // Carga del movimiento cuando se entra en modo edicion.
  useEffect(() => {
    if (!editandoId) {
      setCuentaId(cuentas[0]?.id ?? null);
      return;
    }
    const tx = obtenerTransaccion(editandoId);
    if (!tx) return;
    setTipo(tx.tipo);
    setDigitos(String(tx.monto));
    setCursor(`$ ${separarMiles(tx.monto)}`.length);
    setCategoriaId(tx.subcategoriaId ? null : tx.categoriaId);
    setSubcategoriaId(tx.subcategoriaId);
    setFecha(new Date(tx.fecha + 'T00:00:00'));
    setMedio(tx.medioPago);
    setCuentaId(tx.cuentaId);
    setCuentaDestinoId(tx.cuentaDestinoId);
    setTarjetaId(tx.tarjetaId);
    setDescripcion(tx.descripcion);
    setNotas(tx.notas ?? '');
    setEtiquetas(tx.etiquetas ?? '');
    setFotoUri(tx.fotoUri);
    setCuotas(tx.cuotas);
    if (tx.subcategoriaId) {
      // La subcategoria guarda su padre: lo buscamos en el catalogo completo.
      const sub = todasLasCategorias.find((c) => c.id === tx.subcategoriaId);
      if (sub?.padreId) setCategoriaId(sub.padreId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editandoId]);

  // Al elegir tarjeta de credito el medio pasa a credito y viceversa.
  useEffect(() => {
    if (medio !== 'credito') { setTarjetaId(null); setCuotas(1); }
    else if (!tarjetaId && tarjetas.length) setTarjetaId(tarjetas[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [medio]);

  const tomarFoto = async () => {
    const permiso = await ImagePicker.requestCameraPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert('Sin permiso de cámara', 'Actívalo desde los ajustes del sistema para adjuntar recibos.');
      return;
    }
    const r = await ImagePicker.launchCameraAsync({ quality: 0.5, allowsEditing: true });
    if (!r.canceled && r.assets[0]) setFotoUri(r.assets[0].uri);
  };

  const elegirFoto = async () => {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert('Sin permiso', 'Necesitamos acceso a tus fotos para adjuntar el recibo.');
      return;
    }
    const r = await ImagePicker.launchImageLibraryAsync({ quality: 0.5, mediaTypes: ['images'] });
    if (!r.canceled && r.assets[0]) setFotoUri(r.assets[0].uri);
  };

  const validar = (): string | null => {
    if (monto <= 0) return 'El monto debe ser mayor que cero.';
    if (tipo === 'gasto' && !categoriaId && !subcategoriaId) return 'Elige una categoría.';
    if (tipo === 'transferencia' && cuentaId === cuentaDestinoId) return 'La cuenta de origen y destino deben ser distintas.';
    if (tipo === 'transferencia' && (!cuentaId || !cuentaDestinoId)) return 'Elige la cuenta de origen y la de destino.';
    if (medio === 'credito' && !tarjetaId) return 'Elige la tarjeta de crédito.';
    if (fecha > new Date(new Date().setFullYear(new Date().getFullYear() + 1))) return 'La fecha no puede estar tan lejos en el futuro.';
    return null;
  };

  const guardar = () => {
    const error = validar();
    if (error) { Alert.alert('Revisa el movimiento', error); return; }
    setGuardando(true);
    try {
      const datos = {
        tipo, monto, fecha: format(fecha, 'yyyy-MM-dd'),
        categoriaId: subcategoriaId ?? categoriaId,
        subcategoriaId,
        cuentaId, cuentaDestinoId: tipo === 'transferencia' ? cuentaDestinoId : null,
        tarjetaId, medioPago: medio, descripcion: descripcion.trim(),
        notas: notas.trim() || null, etiquetas: etiquetas.trim(),
        fotoUri, cuotas: medio === 'credito' ? cuotas : 1,
      };

      conRefresco(() => {
        if (editandoId) {
          actualizarTransaccion(editandoId, datos as any);
        } else {
          crearTransaccion({ ...datos, creadoEn: new Date().toISOString() } as any);
          if (esRecurrente) {
            crearRecurrente({
              descripcion: descripcion.trim() || (categoria?.nombre ?? 'Cargo recurrente'),
              monto, frecuencia, categoriaId: subcategoriaId ?? categoriaId,
              cuentaId, tarjetaId, medioPago: medio,
              proximaFecha: format(fecha, 'yyyy-MM-dd'), activo: 1,
              esSuscripcion: 1, ultimoUso: null, tipo,
            } as any);
          }
        }
      });

      // Si el usuario estaba viendo un mes anterior, se salta al ciclo del
      // movimiento recién guardado. Si no, parece que no se registró nada.
      usePeriodo.getState().ir(offsetDeCiclo(fecha, diaInicioCiclo));

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.back();
    } catch (e: any) {
      Alert.alert('No se pudo guardar', e?.message ?? 'Intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = () => {
    if (!editandoId) return;
    Alert.alert('Eliminar movimiento', '¿Seguro que quieres borrarlo? Si es una compra a cuotas se borran todas sus cuotas.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: () => { conRefresco(() => borrarTransaccion(editandoId)); router.back(); },
      },
    ]);
  };

  const colorMonto = tipo === 'ingreso' ? t.verde : tipo === 'transferencia' ? t.azul : t.texto;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.fondo }} edges={['top', 'bottom']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: esp.lg, gap: esp.md }}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Cerrar">
          <Ionicons name="close" size={26} color={t.texto} />
        </Pressable>
        <Texto variante="seccion" style={{ flex: 1 }}>
          {editandoId ? 'Editar movimiento' : 'Nuevo movimiento'}
        </Texto>
        {editandoId ? (
          <Pressable onPress={eliminar} hitSlop={12} accessibilityRole="button" accessibilityLabel="Eliminar">
            <Ionicons name="trash-outline" size={22} color={t.rojo} />
          </Pressable>
        ) : null}
      </View>

      <View style={{ paddingHorizontal: esp.lg }}>
        <Segmentado
          valor={tipo}
          onChange={(v) => { setTipo(v); if (v !== 'gasto') { setCuotas(1); } }}
          opciones={[
            { valor: 'gasto', texto: 'Gasto' },
            { valor: 'ingreso', texto: 'Ingreso' },
            { valor: 'transferencia', texto: 'Transferencia' },
          ]}
        />
      </View>

      {/* Monto fijo: antes vivía dentro del ScrollView y al bajar a teclear
          se salía de la pantalla, así que no se veía lo que se escribía. */}
      <View style={{ alignItems: 'center', paddingTop: esp.md, paddingBottom: esp.sm }}>
        <Texto variante="micro" color="tenue">MONTO · toca el número para corregir un dígito</Texto>
        <MontoEditable
          digitos={digitos}
          cursor={cursor}
          onCursor={setCursor}
          color={colorMonto}
          prefijo={tipo === 'ingreso' ? '+ ' : ''}
        />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: esp.lg, gap: esp.md }}
      >
        {tipo !== 'transferencia' ? (
          <>
            <CampoSelector
              etiqueta="Categoría"
              valor={subcategoriaId
                ? `${categoria?.nombre} › ${subcategorias.find((s) => s.id === subcategoriaId)?.nombre ?? ''}`
                : categoria?.nombre}
              placeholder="Elegir categoría"
              color={categoria?.color}
              onPress={() => setHojaCategoria(true)}
            />
            {subcategorias.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: esp.sm }}>
                <Chip texto="Sin subcategoría" compacto activo={!subcategoriaId} onPress={() => setSubcategoriaId(null)} />
                {subcategorias.map((s) => (
                  <Chip
                    key={s.id} texto={s.nombre} compacto
                    activo={subcategoriaId === s.id}
                    color={s.color}
                    onPress={() => setSubcategoriaId(subcategoriaId === s.id ? null : s.id)}
                  />
                ))}
              </ScrollView>
            ) : null}
          </>
        ) : null}

        <View style={{ gap: 6 }}>
          <CampoSelector
            etiqueta="Fecha"
            valor={format(fecha, "d 'de' MMM, yyyy", { locale: es })}
            icono="calendar-outline"
            onPress={() => setHojaFecha(true)}
          />
          {/* Atajos: cubren la mayoria de registros sin abrir el calendario. */}
          <View style={{ flexDirection: 'row', gap: esp.sm }}>
            <Chip texto="Hoy" compacto activo={esMismoDia(fecha, 0)} onPress={() => setFecha(new Date())} />
            <Chip texto="Ayer" compacto activo={esMismoDia(fecha, -1)} onPress={() => setFecha(addDays(new Date(), -1))} />
            <Chip texto="Antier" compacto activo={esMismoDia(fecha, -2)} onPress={() => setFecha(addDays(new Date(), -2))} />
          </View>
        </View>

        <View style={{ gap: 6 }}>
          <Texto variante="etiqueta" color="suave">Medio de pago</Texto>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: esp.sm }}>
            {MEDIOS_PAGO.map((m) => (
              <Chip
                key={m.id} texto={m.nombre} icono={m.icono as any} compacto
                color={m.color} activo={medio === m.id} onPress={() => setMedio(m.id)}
              />
            ))}
          </ScrollView>
        </View>

        {medio === 'credito' ? (
          <View style={{ gap: esp.sm, backgroundColor: t.superficie, borderRadius: radio.md, padding: esp.md, borderWidth: 1, borderColor: t.borde }}>
            <Texto variante="etiqueta" color="suave">Tarjeta</Texto>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: esp.sm }}>
              {tarjetas.length === 0
                ? <Texto variante="micro" color="tenue">Aún no registras tarjetas. Créalas desde Ajustes › Tarjetas.</Texto>
                : tarjetas.map((c) => (
                  <Chip key={c.id} texto={c.nombre} compacto color={c.color} activo={tarjetaId === c.id} onPress={() => setTarjetaId(c.id)} />
                ))}
            </ScrollView>
            <Texto variante="etiqueta" color="suave" style={{ marginTop: esp.sm }}>Número de cuotas</Texto>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: esp.sm }}>
              {[1, 2, 3, 6, 9, 12, 18, 24, 36].map((n) => (
                <Chip key={n} texto={n === 1 ? 'Una sola' : `${n}`} compacto activo={cuotas === n} onPress={() => setCuotas(n)} />
              ))}
            </ScrollView>
            {cuotas > 1 && monto > 0 ? (
              <Texto variante="etiqueta" color="acento">
                {cuotas} cuotas de {formatoCOP(cuotaMensual(monto, cuotas))} · se reparten mes a mes automáticamente
              </Texto>
            ) : null}
          </View>
        ) : null}

        <Campo
          etiqueta={tipo === 'ingreso' ? 'Origen del ingreso' : 'Comercio o descripción'}
          value={descripcion}
          onChangeText={setDescripcion}
          placeholder={tipo === 'ingreso' ? 'Bono, venta, reembolso…' : 'Éxito, Uber, panadería…'}
        />

        {tipo === 'transferencia' ? (
          <View style={{ gap: esp.md }}>
            <View style={{ gap: 6 }}>
              <Texto variante="etiqueta" color="suave">Desde</Texto>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: esp.sm }}>
                {cuentas.map((c) => (
                  <Chip key={c.id} texto={c.nombre} compacto color={c.color} activo={cuentaId === c.id} onPress={() => setCuentaId(c.id)} />
                ))}
              </ScrollView>
            </View>
            <View style={{ gap: 6 }}>
              <Texto variante="etiqueta" color="suave">Hacia</Texto>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: esp.sm }}>
                {cuentas.map((c) => (
                  <Chip key={c.id} texto={c.nombre} compacto color={c.color} activo={cuentaDestinoId === c.id} onPress={() => setCuentaDestinoId(c.id)} />
                ))}
                {tarjetas.map((c) => (
                  <Chip
                    key={`t${c.id}`} texto={`Pago ${c.nombre}`} compacto color={c.color}
                    activo={tarjetaId === c.id && cuentaDestinoId === null}
                    onPress={() => { setTarjetaId(c.id); setCuentaDestinoId(null); }}
                  />
                ))}
              </ScrollView>
              <Texto variante="micro" color="tenue">
                Las transferencias no se cuentan como gasto ni como ingreso en tus gráficos.
              </Texto>
            </View>
          </View>
        ) : (
          <View style={{ gap: 6 }}>
            <Texto variante="etiqueta" color="suave">Cuenta</Texto>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: esp.sm }}>
              {cuentas.map((c) => (
                <Chip key={c.id} texto={c.nombre} compacto color={c.color} activo={cuentaId === c.id} onPress={() => setCuentaId(c.id)} />
              ))}
            </ScrollView>
          </View>
        )}

        <Pressable
          onPress={() => setAvanzado(!avanzado)}
          accessibilityRole="button"
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: esp.sm }}
        >
          <Ionicons name={avanzado ? 'chevron-up' : 'chevron-down'} size={16} color={t.acento} />
          <Texto variante="etiqueta" color="acento">{avanzado ? 'Menos opciones' : 'Más opciones'}</Texto>
        </Pressable>

        {avanzado ? (
          <View style={{ gap: esp.md }}>
            <Campo etiqueta="Notas" value={notas} onChangeText={setNotas} placeholder="Detalle adicional" multiline />
            <Campo
              etiqueta="Etiquetas (separadas por coma)"
              value={etiquetas} onChangeText={setEtiquetas}
              placeholder="viaje, trabajo, deducible"
              autoCapitalize="none"
            />

            <View style={{ gap: 6 }}>
              <Texto variante="etiqueta" color="suave">Foto del recibo</Texto>
              {fotoUri ? (
                <View style={{ gap: esp.sm }}>
                  <Image source={{ uri: fotoUri }} style={{ width: '100%', height: 180, borderRadius: radio.md }} resizeMode="cover" />
                  <Boton titulo="Quitar foto" variante="peligro" icono="trash-outline" onPress={() => setFotoUri(null)} />
                </View>
              ) : (
                <View style={{ flexDirection: 'row', gap: esp.sm }}>
                  <Boton titulo="Tomar foto" icono="camera-outline" variante="secundario" onPress={tomarFoto} />
                  <Boton titulo="Galería" icono="images-outline" variante="secundario" onPress={elegirFoto} />
                </View>
              )}
            </View>

            {!editandoId ? (
              <View style={{ gap: esp.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: esp.md }}>
                  <View style={{ flex: 1 }}>
                    <Texto variante="cuerpo">Es un gasto recurrente</Texto>
                    <Texto variante="micro" color="tenue">Se repetirá y te avisaremos antes de cada cobro.</Texto>
                  </View>
                  <Interruptor valor={esRecurrente} onChange={setEsRecurrente} />
                </View>
                {esRecurrente ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: esp.sm }}>
                    {FRECUENCIAS.map((f) => (
                      <Chip key={f.id} texto={f.texto} compacto activo={frecuencia === f.id} onPress={() => setFrecuencia(f.id)} />
                    ))}
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={{ height: esp.md }} />
      </ScrollView>

      {/* Teclado y guardar, fijos abajo: siempre al alcance del pulgar y sin
          empujar el monto fuera de la pantalla. */}
      <View style={{
        paddingHorizontal: esp.lg, paddingTop: esp.sm, gap: esp.sm,
        borderTopWidth: 1, borderTopColor: t.borde, backgroundColor: t.fondoElevado,
      }}>
        <TecladoNumerico
          onTecla={escribirDigitos}
          onBorrar={borrarEnCursor}
          onLimpiar={limpiarMonto}
        />
        <Boton
          titulo={editandoId ? 'Guardar cambios' : 'Registrar movimiento'}
          ancho
          cargando={guardando}
          deshabilitado={monto <= 0}
          onPress={guardar}
        />
      </View>

      <Hoja visible={hojaCategoria} onCerrar={() => setHojaCategoria(false)} titulo="Elegir categoría" alto="70%">
        <Boton
          titulo="Crear o editar categorías"
          icono="options-outline"
          variante="secundario"
          ancho
          onPress={() => { setHojaCategoria(false); router.push('/categorias'); }}
        />
        <View style={{ gap: 2 }}>
          {categoriasRaiz.map((c) => (
            <Pressable
              key={c.id}
              onPress={() => { setCategoriaId(c.id); setSubcategoriaId(null); setHojaCategoria(false); }}
              accessibilityRole="button"
              style={{
                flexDirection: 'row', alignItems: 'center', gap: esp.md,
                padding: esp.sm, borderRadius: 12,
                backgroundColor: categoriaId === c.id ? t.superficie2 : 'transparent',
              }}
            >
              <IconoCategoria icono={c.icono} color={c.color} tam={38} />
              <Texto variante="cuerpo" style={{ flex: 1 }}>{c.nombre}</Texto>
              {categoriaId === c.id ? <Ionicons name="checkmark" size={20} color={t.acento} /> : null}
            </Pressable>
          ))}
        </View>
      </Hoja>

      {hojaFecha ? (
        <DateTimePicker
          value={fecha}
          mode="date"
          display="default"
          maximumDate={new Date(new Date().setFullYear(new Date().getFullYear() + 1))}
          onChange={(_e, d) => { setHojaFecha(false); if (d) setFecha(d); }}
        />
      ) : null}

    </SafeAreaView>
  );
}

// Cada pantalla en su propia frontera: un fallo aqui no tumba la app.
export default conFrontera(Registro, 'El registro');
