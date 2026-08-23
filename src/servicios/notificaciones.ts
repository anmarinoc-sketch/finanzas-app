import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { addDays, differenceInSeconds, startOfDay } from 'date-fns';

/**
 * Notificaciones locales. Todo es local: la app no tiene backend ni push
 * remoto, solo alarmas programadas en el dispositivo.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function pedirPermisoNotificaciones(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('presupuesto', {
      name: 'Alertas de presupuesto',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 200, 100, 200],
      lightColor: '#4F46E5',
    });
  }
  const { status } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return true;
  const pedido = await Notifications.requestPermissionsAsync();
  return pedido.status === 'granted';
}

async function programar(titulo: string, cuerpo: string, fecha: Date, id: string) {
  const segundos = Math.max(60, differenceInSeconds(fecha, new Date()));
  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: { title: titulo, body: cuerpo },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: segundos,
      channelId: 'presupuesto',
    },
  });
}

/** Aviso inmediato al cruzar el 80% o el 100% de una categoria. */
export async function avisarPresupuesto(categoria: string, porcentaje: number) {
  const excedido = porcentaje >= 100;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: excedido ? `Te pasaste en ${categoria}` : `Vas en el ${Math.round(porcentaje)}% de ${categoria}`,
      body: excedido
        ? 'Ya superaste el presupuesto de esta categoría en el ciclo actual.'
        : 'Estás cerca del límite que te pusiste para este ciclo.',
    },
    trigger: null,
  });
}

/** Recordatorio de un cargo recurrente, dos dias antes del cobro. */
export async function recordarRecurrente(id: number, descripcion: string, monto: number, fecha: Date) {
  const aviso = addDays(startOfDay(fecha), -2);
  if (aviso <= new Date()) return;
  await programar(
    'Cargo recurrente próximo',
    `${descripcion} por $ ${monto.toLocaleString('es-CO')} se cobra pronto.`,
    aviso,
    `recurrente-${id}`,
  );
}

/** Resumen semanal, los domingos a las 7 p. m. */
export async function programarResumenSemanal() {
  await Notifications.cancelScheduledNotificationAsync('resumen-semanal').catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: 'resumen-semanal',
    content: { title: 'Tu resumen de la semana', body: 'Mira cómo te fue con tus presupuestos.' },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: 1, // domingo en expo-notifications (1 = domingo)
      hour: 19,
      minute: 0,
      channelId: 'presupuesto',
    },
  });
}

export async function cancelarTodas() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Configura las notificaciones una sola vez, ya dentro de la app y no
 * durante el onboarding. Nunca lanza: si el modulo nativo falla, la app
 * sigue funcionando y el error queda registrado en el diagnostico.
 */
export async function configurarNotificacionesUnaVez(activadas: boolean) {
  const { leerBandera, escribirBandera, guardarError } = await import('./diagnostico');
  if (!activadas) return;
  if (leerBandera('notificaciones_listas') === '1') return;
  try {
    const ok = await pedirPermisoNotificaciones();
    if (ok) await programarResumenSemanal();
    escribirBandera('notificaciones_listas', '1');
  } catch (e) {
    guardarError(e, 'configuración de notificaciones');
  }
}
