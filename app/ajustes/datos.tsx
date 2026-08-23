import { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';

import { useTema } from '@/ui/TemaProvider';
import { Encabezado } from '@/ui/comp/Encabezado';
import { Texto } from '@/ui/comp/Texto';
import { Tarjeta } from '@/ui/comp/Tarjeta';
import { Boton } from '@/ui/comp/Boton';
import { esp, radio } from '@/ui/tema';

import { exportarBackup, exportarCSV, importarBackup } from '@/servicios/exportar';
import { generarReportePDF } from '@/servicios/reportePDF';
import { leerTexto } from '@/servicios/archivos';
import { borrarMovimientos, vaciarDatos, migrar } from '@/db/bootstrap';
import { hayDatos, sembrarCatalogos, sembrarEjemplo } from '@/db/seed';
import { contarMovimientos } from '@/db/crud';
import { rangoActual } from '@/store/periodo';
import { useAjustes } from '@/store/ajustes';
import { useDatos } from '@/store/datos';

export default function Datos() {
  const t = useTema();
  const diaInicio = useAjustes((s) => s.diaInicioCiclo);
  const cargarAjustes = useAjustes((s) => s.cargar);
  const { ingresoMensual, refrescar, revision } = useDatos();
  const [ocupado, setOcupado] = useState<string | null>(null);

  const total = contarMovimientos();
  const rango = rangoActual(diaInicio, 0);

  const correr = async (clave: string, fn: () => Promise<void>) => {
    setOcupado(clave);
    try { await fn(); }
    catch (e: any) { Alert.alert('No se pudo completar', e?.message ?? 'Error desconocido.'); }
    finally { setOcupado(null); }
  };

  const restaurar = () => correr('importar', async () => {
    const r = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
    if (r.canceled || !r.assets?.[0]) return;
    const texto = await leerTexto(r.assets[0].uri);
    Alert.alert(
      'Restaurar copia',
      'Se reemplazarán TODOS los datos actuales por los del archivo. Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restaurar', style: 'destructive',
          onPress: () => {
            try {
              const res = importarBackup(texto);
              cargarAjustes();
              refrescar();
              Alert.alert('Copia restaurada', `Se importaron ${res.registros} registros.`);
            } catch (e: any) {
              Alert.alert('Archivo inválido', e?.message ?? 'No se pudo leer la copia.');
            }
          },
        },
      ],
    );
  });

  const sembrar = () => {
    if (hayDatos()) {
      Alert.alert('Ya tienes movimientos', 'Borra primero los movimientos si quieres cargar los datos de ejemplo.');
      return;
    }
    sembrarEjemplo();
    cargarAjustes();
    refrescar();
    Alert.alert('Datos de ejemplo cargados', 'Se crearon 3 meses de movimientos, tarjetas, deudas y metas.');
  };

  const borrarEjemplo = () => {
    Alert.alert('Borrar movimientos', 'Se eliminan todos los movimientos y aportes. La configuración se conserva.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar', style: 'destructive',
        onPress: () => { borrarMovimientos(); refrescar(); Alert.alert('Listo', 'Los movimientos fueron eliminados.'); },
      },
    ]);
  };

  const empezarDeCero = () => {
    Alert.alert('Empezar de cero', 'Se borra TODO: movimientos, categorías, metas, tarjetas y preferencias.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar todo', style: 'destructive',
        onPress: () => {
          vaciarDatos();
          migrar();
          sembrarCatalogos();
          cargarAjustes();
          refrescar();
          router.replace('/onboarding/ingresos');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.fondo }} edges={['top']}>
      <Encabezado titulo="Datos" subtitulo={`${total} movimientos registrados`} />
      <ScrollView contentContainerStyle={{ padding: esp.lg, gap: esp.md, paddingBottom: esp.xxl }}>

        <Bloque
          icono="document-text-outline"
          titulo="Exportar a CSV"
          texto="Los movimientos del ciclo actual, listos para abrir en Excel o Google Sheets."
          boton="Exportar CSV"
          cargando={ocupado === 'csv'}
          onPress={() => correr('csv', async () => {
            const r = await exportarCSV(rango, diaInicio);
            Alert.alert('CSV generado', `${r.filas} movimientos exportados en ${r.nombre}.`);
          })}
        />

        <Bloque
          icono="newspaper-outline"
          titulo="Reporte mensual en PDF"
          texto="Un informe con gráficos, presupuesto vs. real, top de comercios y observaciones."
          boton="Generar PDF"
          cargando={ocupado === 'pdf'}
          onPress={() => correr('pdf', async () => {
            await generarReportePDF(rango, diaInicio, ingresoMensual);
          })}
        />

        <Bloque
          icono="cloud-download-outline"
          titulo="Copia de seguridad"
          texto="Un archivo JSON con absolutamente todo. Guárdalo en Drive o WhatsApp para no perder tus datos si cambias de teléfono."
          boton="Crear copia"
          cargando={ocupado === 'backup'}
          onPress={() => correr('backup', async () => {
            const r = await exportarBackup();
            Alert.alert('Copia creada', `${r.registros} registros guardados en ${r.nombre}.`);
          })}
        />

        <Bloque
          icono="cloud-upload-outline"
          titulo="Restaurar copia"
          texto="Selecciona un archivo JSON creado por Mis Finanzas. Reemplaza todos los datos actuales."
          boton="Elegir archivo"
          cargando={ocupado === 'importar'}
          onPress={restaurar}
        />

        <View style={{ height: 1, backgroundColor: t.borde, marginVertical: esp.sm }} />

        <Bloque
          icono="sparkles-outline"
          titulo="Datos de ejemplo"
          texto="Carga 3 meses de movimientos realistas, tarjetas, deudas y metas para ver la app funcionando."
          boton="Cargar ejemplo"
          onPress={sembrar}
        />

        <Bloque
          icono="trash-outline"
          titulo="Borrar movimientos"
          texto="Elimina los movimientos y los aportes a metas, pero conserva categorías, cuentas y preferencias."
          boton="Borrar movimientos"
          peligro
          onPress={borrarEjemplo}
        />

        <Bloque
          icono="nuclear-outline"
          titulo="Empezar de cero"
          texto="Borra absolutamente todo y vuelve a la configuración inicial. No se puede deshacer."
          boton="Borrar todo"
          peligro
          onPress={empezarDeCero}
        />

        <Texto variante="micro" color="tenue" style={{ textAlign: 'center', lineHeight: 18 }}>
          Revisión de datos #{revision}. Todo se guarda en SQLite dentro del teléfono.
        </Texto>
      </ScrollView>
    </SafeAreaView>
  );
}

function Bloque({
  icono, titulo, texto, boton, onPress, peligro, cargando,
}: {
  icono: any; titulo: string; texto: string; boton: string;
  onPress: () => void; peligro?: boolean; cargando?: boolean;
}) {
  const t = useTema();
  return (
    <Tarjeta style={{ gap: esp.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: esp.md }}>
        <View style={{
          width: 40, height: 40, borderRadius: radio.md,
          backgroundColor: peligro ? t.rojoFondo : t.acentoFondo,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Ionicons name={icono} size={20} color={peligro ? t.rojo : t.acento} />
        </View>
        <Texto variante="seccion" style={{ flex: 1 }}>{titulo}</Texto>
      </View>
      <Texto variante="micro" color="suave" style={{ lineHeight: 18 }}>{texto}</Texto>
      <Boton titulo={boton} variante={peligro ? 'peligro' : 'secundario'} ancho cargando={cargando} onPress={onPress} />
    </Tarjeta>
  );
}
