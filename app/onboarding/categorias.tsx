import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { PasoOnboarding } from '@/ui/comp/PasoOnboarding';
import { Tarjeta } from '@/ui/comp/Tarjeta';
import { Texto } from '@/ui/comp/Texto';
import { Boton } from '@/ui/comp/Boton';
import { Campo } from '@/ui/comp/Campo';
import { Hoja } from '@/ui/comp/Hoja';
import { IconoCategoria } from '@/ui/comp/IconoCategoria';
import { useTema } from '@/ui/TemaProvider';
import { esp } from '@/ui/tema';
import { useOnboarding } from '@/store/onboarding';
import { useDatos, conRefresco } from '@/store/datos';
import { crearCategoria, listarCategorias } from '@/db/crud';
import { ICONOS_DISPONIBLES } from '@/constantes/categorias';
import { COLORES_CATEGORIA } from '@/constantes/paleta';

export default function PasoCategorias() {
  const t = useTema();
  const revision = useDatos((s) => s.revision);
  // Incluye las archivadas: al rehacer la configuración deben poder reactivarse.
  const categorias = useMemo(
    () => listarCategorias(true).filter((c) => !c.padreId),
    [revision],
  );
  const { categoriasDesactivadas, alternarCategoria } = useOnboarding();
  const [hoja, setHoja] = useState(false);
  const [nombre, setNombre] = useState('');
  const [icono, setIcono] = useState(ICONOS_DISPONIBLES[0]);
  const [color, setColor] = useState<string>(COLORES_CATEGORIA[5]);

  const activas = categorias.length - categoriasDesactivadas.length;

  const crear = () => {
    if (!nombre.trim()) return;
    conRefresco(() => crearCategoria({
      nombre: nombre.trim(), icono, color, bolsilloId: null,
      presupuestoMensual: 0, padreId: null, archivada: 0, orden: 99, esIngreso: 0,
    } as any));
    setNombre('');
    setHoja(false);
  };

  return (
    <PasoOnboarding
      paso={3}
      titulo="Tus categorías"
      bajada={`Ya cargamos ${categorias.length} categorías típicas. Desactiva las que no uses o crea las tuyas; después puedes cambiarlas cuando quieras.`}
      pie={
        <View style={{ flexDirection: 'row', gap: esp.md }}>
          <Boton titulo="Atrás" variante="secundario" icono="chevron-back" onPress={() => router.back()} />
          <Boton
            titulo={`Continuar con ${activas}`}
            style={{ flex: 1 }}
            onPress={() => router.push('/onboarding/preferencias')}
          />
        </View>
      }
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: esp.sm, paddingBottom: esp.lg }}>
        <Tarjeta padding={esp.sm} style={{ gap: 2 }}>
          {categorias.map((c) => {
            const off = categoriasDesactivadas.includes(c.id);
            return (
              <Pressable
                key={c.id}
                onPress={() => alternarCategoria(c.id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: !off }}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: esp.md,
                  padding: esp.sm, borderRadius: 12, opacity: off ? 0.45 : 1,
                }}
              >
                <IconoCategoria icono={c.icono} color={c.color} tam={36} />
                <Texto variante="cuerpo" style={{ flex: 1 }}>{c.nombre}</Texto>
                <Ionicons
                  name={off ? 'ellipse-outline' : 'checkmark-circle'}
                  size={22}
                  color={off ? t.textoTenue : t.acento}
                />
              </Pressable>
            );
          })}
        </Tarjeta>

        <Boton titulo="Crear categoría" icono="add" variante="fantasma" ancho onPress={() => setHoja(true)} />
      </ScrollView>

      <Hoja visible={hoja} onCerrar={() => setHoja(false)} titulo="Nueva categoría" alto="80%">
        <Campo etiqueta="Nombre" value={nombre} onChangeText={setNombre} placeholder="Ej: Cuota del colegio" />
        <Texto variante="etiqueta" color="suave">Color</Texto>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: esp.sm }}>
          {COLORES_CATEGORIA.map((c) => (
            <Pressable
              key={c} onPress={() => setColor(c)} accessibilityRole="button" accessibilityLabel={`Color ${c}`}
              style={{
                width: 34, height: 34, borderRadius: 17, backgroundColor: c,
                borderWidth: color === c ? 3 : 0, borderColor: t.texto,
              }}
            />
          ))}
        </View>
        <Texto variante="etiqueta" color="suave">Ícono</Texto>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: esp.sm }}>
          {ICONOS_DISPONIBLES.map((ic) => (
            <Pressable
              key={ic} onPress={() => setIcono(ic)} accessibilityRole="button" accessibilityLabel={ic}
              style={{
                width: 44, height: 44, borderRadius: 12,
                backgroundColor: icono === ic ? color : t.superficie2,
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Ionicons name={ic as any} size={20} color={icono === ic ? '#FFF' : t.textoSuave} />
            </Pressable>
          ))}
        </View>
        <Boton titulo="Crear categoría" ancho onPress={crear} />
      </Hoja>
    </PasoOnboarding>
  );
}
