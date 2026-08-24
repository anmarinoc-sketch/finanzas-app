import { Alert, Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTema } from '@/ui/TemaProvider';
import { Encabezado } from '@/ui/comp/Encabezado';
import { Texto } from '@/ui/comp/Texto';
import { Tarjeta } from '@/ui/comp/Tarjeta';
import { Chip } from '@/ui/comp/Chip';
import { Interruptor } from '@/ui/comp/Campo';
import { Segmentado } from '@/ui/comp/SelectorPeriodo';
import { esp, radio, TOQUE_MIN } from '@/ui/tema';

import { formatoCOP } from '@/core/dinero';
import { useAjustes } from '@/store/ajustes';
import { useOnboarding } from '@/store/onboarding';
import { listarBolsillos, listarCategorias, listarIngresos } from '@/db/crud';
import { useDatos } from '@/store/datos';
import { cancelarTodas, pedirPermisoNotificaciones, programarResumenSemanal } from '@/servicios/notificaciones';

const DIAS_CICLO = [1, 5, 10, 15, 20, 25, 30];

export default function Ajustes() {
  const t = useTema();
  const a = useAjustes();
  const { ingresoMensual, categorias } = useDatos();
  const precargar = useOnboarding((s) => s.precargarDesdeBD);

  /**
   * Reabre el asistente de 4 pasos con los valores actuales ya cargados.
   * Al terminarlo, los ingresos y la distribución se reemplazan en bloque,
   * así que reconfigurar no duplica nada.
   */
  const reconfigurar = () => {
    precargar({
      ingresos: listarIngresos().map((i) => ({ nombre: i.nombre, monto: i.monto, frecuencia: i.frecuencia })),
      bolsillos: listarBolsillos().map((b) => ({
        nombre: b.nombre, tipo: b.tipo, porcentaje: b.porcentaje, color: b.color, icono: b.icono,
      })),
      categoriasDesactivadas: listarCategorias(true).filter((c) => !c.padreId && c.archivada).map((c) => c.id),
      diaInicioCiclo: a.diaInicioCiclo,
      tema: a.tema,
      biometria: a.biometria,
      notificaciones: a.notificaciones,
      nombre: a.nombre,
    });
    router.push('/onboarding/ingresos');
  };

  const cambiarNotificaciones = async (v: boolean) => {
    if (v) {
      const ok = await pedirPermisoNotificaciones();
      if (!ok) {
        Alert.alert('Sin permiso', 'Activa las notificaciones desde los ajustes del sistema para recibir alertas.');
        return;
      }
      await programarResumenSemanal();
    } else {
      await cancelarTodas();
    }
    a.aplicar({ notificaciones: v ? 1 : 0 });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.fondo }} edges={['top', 'bottom']}>
      <Encabezado titulo="Ajustes" subtitulo={a.nombre || 'Mi cuenta'} />
      <ScrollView contentContainerStyle={{ padding: esp.lg, gap: esp.md, paddingBottom: esp.xxl }}>

        <Tarjeta style={{ gap: 4 }}>
          <Texto variante="micro" color="tenue">INGRESO MENSUAL ESTIMADO</Texto>
          <Texto variante="montoGrande">{formatoCOP(ingresoMensual)}</Texto>
          <Texto variante="micro" color="tenue">{categorias.length} categorías configuradas</Texto>
        </Tarjeta>

        <Seccion titulo="Tu dinero">
          <Opcion icono="cash-outline" texto="Ingresos" detalle="Fuentes y frecuencias" onPress={() => router.push('/ajustes/ingresos')} />
          <Opcion icono="pie-chart-outline" texto="Bolsillos" detalle="Distribución por porcentajes" onPress={() => router.push('/ajustes/bolsillos')} />
          <Opcion icono="calculator-outline" texto="Presupuestos" detalle="Tope mensual por categoría" onPress={() => router.push('/ajustes/presupuestos')} />
          <Opcion icono="grid-outline" texto="Categorías" detalle="Crear, editar y ordenar" onPress={() => router.push('/categorias')} />
          <Opcion icono="wallet-outline" texto="Cuentas" detalle="Efectivo, bancos y billeteras" onPress={() => router.push('/cuentas')} />
          <Opcion icono="card-outline" texto="Tarjetas y deudas" detalle="Cupos, cuotas y créditos" onPress={() => router.push('/tarjetas')} />
          <Opcion icono="repeat-outline" texto="Gastos recurrentes" detalle="Suscripciones y cargos fijos" onPress={() => router.push('/recurrentes')} ultimo />
        </Seccion>

        <Seccion titulo="Ciclo financiero">
          <View style={{ padding: esp.md, gap: esp.sm }}>
            <Texto variante="cuerpo">Día de inicio del ciclo</Texto>
            <Texto variante="micro" color="tenue">
              Hoy tu ciclo empieza el día {a.diaInicioCiclo}. Si te pagan el 15, ponlo en 15.
            </Texto>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: esp.sm, marginTop: 4 }}>
              {DIAS_CICLO.map((d) => (
                <Chip
                  key={d} texto={`Día ${d}`} compacto
                  activo={a.diaInicioCiclo === d}
                  onPress={() => a.aplicar({ diaInicioCiclo: d })}
                />
              ))}
            </View>
          </View>
        </Seccion>

        <Seccion titulo="Apariencia">
          <View style={{ padding: esp.md, gap: esp.sm }}>
            <Segmentado
              valor={a.tema}
              onChange={(v) => a.aplicar({ tema: v })}
              opciones={[
                { valor: 'sistema', texto: 'Sistema' },
                { valor: 'claro', texto: 'Claro' },
                { valor: 'oscuro', texto: 'Oscuro' },
              ]}
            />
          </View>
        </Seccion>

        <Seccion titulo="Seguridad y avisos">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: esp.md, padding: esp.md }}>
            <Ionicons name="notifications-outline" size={20} color={t.acento} />
            <View style={{ flex: 1 }}>
              <Texto variante="cuerpo">Notificaciones</Texto>
              <Texto variante="micro" color="tenue">Alertas de presupuesto y recordatorios</Texto>
            </View>
            <Interruptor valor={a.notificaciones} onChange={cambiarNotificaciones} />
          </View>
          <Opcion icono="lock-closed-outline" texto="Bloqueo de la app" detalle={a.pinActivo || a.biometria ? 'Activo' : 'Desactivado'} onPress={() => router.push('/ajustes/seguridad')} ultimo />
        </Seccion>

        <Seccion titulo="Configuración inicial">
          <Opcion
            icono="refresh-outline"
            texto="Rehacer la configuración"
            detalle="Vuelve a los 4 pasos con tus datos actuales"
            onPress={reconfigurar}
            ultimo
          />
        </Seccion>

        <Seccion titulo="Datos">
          <Opcion icono="download-outline" texto="Exportar e importar" detalle="CSV, PDF y copia de seguridad" onPress={() => router.push('/ajustes/datos')} />
          <Opcion
            icono="trash-outline"
            texto="Borrar movimientos o empezar de cero"
            detalle="Para hacer pruebas y dejar la app limpia"
            onPress={() => router.push('/ajustes/datos')}
            ultimo
          />
        </Seccion>

        <Texto variante="micro" color="tenue" style={{ textAlign: 'center', marginTop: esp.lg, lineHeight: 18 }}>
          Mis Finanzas v1.0.0{'\n'}
          Todos tus datos viven solo en este teléfono. La app no usa internet.
        </Texto>
      </ScrollView>
    </SafeAreaView>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: esp.sm }}>
      <Texto variante="micro" color="tenue" style={{ paddingHorizontal: esp.sm }}>{titulo.toUpperCase()}</Texto>
      <Tarjeta padding={0}>{children}</Tarjeta>
    </View>
  );
}

function Opcion({
  icono, texto, detalle, onPress, ultimo,
}: { icono: any; texto: string; detalle?: string; onPress: () => void; ultimo?: boolean }) {
  const t = useTema();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        flexDirection: 'row', alignItems: 'center', gap: esp.md,
        padding: esp.md, minHeight: TOQUE_MIN,
        borderBottomWidth: ultimo ? 0 : 1, borderBottomColor: t.borde,
        backgroundColor: pressed ? t.superficie2 : 'transparent',
        borderRadius: radio.lg,
      })}
    >
      <Ionicons name={icono} size={20} color={t.acento} />
      <View style={{ flex: 1 }}>
        <Texto variante="cuerpo">{texto}</Texto>
        {detalle ? <Texto variante="micro" color="tenue">{detalle}</Texto> : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={t.textoTenue} />
    </Pressable>
  );
}
