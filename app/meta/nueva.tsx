import { useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { addMonths, format } from 'date-fns';
import { es } from 'date-fns/locale';

import { useTema } from '@/ui/TemaProvider';
import { Encabezado } from '@/ui/comp/Encabezado';
import { Texto } from '@/ui/comp/Texto';
import { Tarjeta } from '@/ui/comp/Tarjeta';
import { Campo, CampoSelector } from '@/ui/comp/Campo';
import { Chip } from '@/ui/comp/Chip';
import { Boton } from '@/ui/comp/Boton';
import { esp } from '@/ui/tema';

import { formatoCOP, parsearMonto, separarMiles } from '@/core/dinero';
import { calcularMeta, cabeEnAhorro } from '@/core/metas';
import { COLORES_CATEGORIA } from '@/constantes/paleta';
import { crearMeta } from '@/db/crud';
import { useDatos, conRefresco } from '@/store/datos';

export const ICONOS_META = [
  'flag-outline', 'umbrella-outline', 'airplane-outline', 'home-outline', 'car-sport-outline',
  'desktop-outline', 'school-outline', 'heart-outline', 'gift-outline', 'rocket-outline',
  'trophy-outline', 'boat-outline',
];

export default function NuevaMeta() {
  const t = useTema();
  const { bolsillos, ingresoMensual, metas } = useDatos();
  const [nombre, setNombre] = useState('');
  const [objetivo, setObjetivo] = useState('');
  const [fecha, setFecha] = useState<Date>(addMonths(new Date(), 12));
  const [color, setColor] = useState<string>('#10B981');
  const [icono, setIcono] = useState(ICONOS_META[0]);
  const [prioridad, setPrioridad] = useState(2);
  const [automatico, setAutomatico] = useState('');
  const [mostrarFecha, setMostrarFecha] = useState(false);

  const monto = parsearMonto(objetivo);
  const calc = calcularMeta({ montoObjetivo: monto, montoActual: 0, fechaLimite: fecha, fechaCreacion: new Date() });

  const cupoAhorro = Math.round(ingresoMensual * (bolsillos.find((b) => b.tipo === 'ahorro')?.porcentaje ?? 0) / 100);
  const yaComprometido = metas.reduce((a, m) => {
    const c = calcularMeta({
      montoObjetivo: m.montoObjetivo, montoActual: m.montoActual,
      fechaLimite: m.fechaLimite ? new Date(m.fechaLimite + 'T00:00:00') : null,
      fechaCreacion: new Date(m.fechaCreacion + 'T00:00:00'),
    });
    return a + c.aporteMensualNecesario;
  }, 0);
  const capacidad = cabeEnAhorro([yaComprometido, calc.aporteMensualNecesario], cupoAhorro);

  const guardar = () => {
    if (!nombre.trim()) return Alert.alert('Falta el nombre', 'Ponle un nombre a tu meta.');
    if (monto <= 0) return Alert.alert('Monto inválido', 'El monto objetivo debe ser mayor que cero.');
    if (fecha <= new Date()) return Alert.alert('Fecha inválida', 'La fecha límite debe estar en el futuro.');
    conRefresco(() => crearMeta({
      nombre: nombre.trim(), montoObjetivo: Math.round(monto), montoActual: 0,
      fechaLimite: format(fecha, 'yyyy-MM-dd'), color, icono,
      aporteAutomatico: parsearMonto(automatico), prioridad,
      estado: 'en_curso', fechaCreacion: format(new Date(), 'yyyy-MM-dd'), archivada: 0,
    } as any));
    router.back();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.fondo }} edges={['top']}>
      <Encabezado titulo="Nueva meta" />
      <ScrollView contentContainerStyle={{ padding: esp.lg, gap: esp.md, paddingBottom: esp.xxl }} keyboardShouldPersistTaps="handled">
        <Campo etiqueta="Nombre de la meta" value={nombre} onChangeText={setNombre} placeholder="Fondo de emergencia, viaje, moto…" />
        <Campo
          etiqueta="Monto objetivo"
          value={objetivo ? separarMiles(monto) : ''}
          onChangeText={setObjetivo}
          keyboardType="number-pad"
          placeholder="0"
        />
        <CampoSelector
          etiqueta="Fecha límite"
          valor={format(fecha, "d 'de' MMMM 'de' yyyy", { locale: es })}
          icono="calendar-outline"
          onPress={() => setMostrarFecha(true)}
        />

        <View style={{ gap: 6 }}>
          <Texto variante="etiqueta" color="suave">Prioridad</Texto>
          <View style={{ flexDirection: 'row', gap: esp.sm }}>
            <Chip texto="Alta" compacto activo={prioridad === 1} onPress={() => setPrioridad(1)} />
            <Chip texto="Media" compacto activo={prioridad === 2} onPress={() => setPrioridad(2)} />
            <Chip texto="Baja" compacto activo={prioridad === 3} onPress={() => setPrioridad(3)} />
          </View>
        </View>

        <View style={{ gap: 6 }}>
          <Texto variante="etiqueta" color="suave">Color</Texto>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: esp.sm }}>
            {COLORES_CATEGORIA.map((c) => (
              <Pressable
                key={c} onPress={() => setColor(c)} accessibilityRole="button" accessibilityLabel={`Color ${c}`}
                style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: c, borderWidth: color === c ? 3 : 0, borderColor: t.texto }}
              />
            ))}
          </View>
        </View>

        <View style={{ gap: 6 }}>
          <Texto variante="etiqueta" color="suave">Ícono</Texto>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: esp.sm }}>
            {ICONOS_META.map((ic) => (
              <Pressable
                key={ic} onPress={() => setIcono(ic)} accessibilityRole="button" accessibilityLabel={ic}
                style={{
                  width: 46, height: 46, borderRadius: 14,
                  backgroundColor: icono === ic ? color : t.superficie2,
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Ionicons name={ic as any} size={22} color={icono === ic ? '#FFF' : t.textoSuave} />
              </Pressable>
            ))}
          </View>
        </View>

        <Campo
          etiqueta="Aporte automático mensual (opcional)"
          value={automatico ? separarMiles(parsearMonto(automatico)) : ''}
          onChangeText={setAutomatico}
          keyboardType="number-pad"
          placeholder="Ej: 300.000"
        />

        {monto > 0 ? (
          <Tarjeta style={{ gap: esp.sm }}>
            <Texto variante="seccion">Para cumplirla a tiempo</Texto>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: esp.sm }}>
              <Texto variante="montoGrande" color="acento">{formatoCOP(calc.aporteMensualNecesario)}</Texto>
              <Texto variante="cuerpo" color="suave">al mes durante {calc.mesesRestantes} meses</Texto>
            </View>
            <Texto variante="micro" color={capacidad.cabe ? 'verde' : 'ambar'}>
              {capacidad.cabe
                ? `Cabe en tu bolsillo de ahorro (${formatoCOP(cupoAhorro)} al mes).`
                : `Se pasa ${formatoCOP(capacidad.exceso)} de tu bolsillo de ahorro (${formatoCOP(cupoAhorro)} al mes). Considera alargar la fecha.`}
            </Texto>
          </Tarjeta>
        ) : null}

        <Boton titulo="Crear meta" ancho onPress={guardar} />
      </ScrollView>

      {mostrarFecha ? (
        <DateTimePicker
          value={fecha}
          mode="date"
          minimumDate={new Date()}
          onChange={(_e, d) => { setMostrarFecha(false); if (d) setFecha(d); }}
        />
      ) : null}
    </SafeAreaView>
  );
}
