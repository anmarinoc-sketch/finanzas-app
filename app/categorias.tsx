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
import { IconoCategoria } from '@/ui/comp/IconoCategoria';
import { esp } from '@/ui/tema';

import { formatoCOP, parsearMonto, separarMiles } from '@/core/dinero';
import { ICONOS_DISPONIBLES } from '@/constantes/categorias';
import { COLORES_CATEGORIA } from '@/constantes/paleta';
import {
  actualizarCategoria, archivarCategoria, borrarCategoria, crearCategoria,
  listarCategorias, reordenarCategorias,
} from '@/db/crud';
import { useDatos, conRefresco } from '@/store/datos';
import type { Categoria } from '@/db/schema';

export default function Categorias() {
  const t = useTema();
  const { categoriasRaiz, bolsillos, revision, refrescar } = useDatos();
  const [editando, setEditando] = useState<Categoria | null>(null);
  const [creandoSubDe, setCreandoSubDe] = useState<Categoria | null>(null);
  const [mostrarArchivadas, setMostrarArchivadas] = useState(false);

  useFocusEffect(useCallback(() => { refrescar(); }, [refrescar]));

  const todas = useMemo(() => listarCategorias(true), [revision]);
  const archivadas = todas.filter((c) => c.archivada && !c.padreId);
  const subsDe = (id: number) => todas.filter((c) => c.padreId === id && !c.archivada);

  const mover = (idx: number, dir: -1 | 1) => {
    const ids = categoriasRaiz.map((c) => c.id);
    const destino = idx + dir;
    if (destino < 0 || destino >= ids.length) return;
    [ids[idx], ids[destino]] = [ids[destino], ids[idx]];
    conRefresco(() => reordenarCategorias(ids));
  };

  const nueva = (): Categoria => ({
    id: 0, nombre: '', icono: ICONOS_DISPONIBLES[0], color: COLORES_CATEGORIA[5],
    bolsilloId: bolsillos[0]?.id ?? null, presupuestoMensual: 0, padreId: null,
    archivada: 0, orden: 99, esIngreso: 0,
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.fondo }} edges={['top']}>
      <Encabezado
        titulo="Categorías"
        subtitulo={`${categoriasRaiz.length} activas`}
        accion="Nueva" iconoAccion="add"
        onAccion={() => setEditando(nueva())}
      />
      <ScrollView contentContainerStyle={{ padding: esp.lg, gap: esp.sm, paddingBottom: esp.xxl }}>
        {categoriasRaiz.map((c, idx) => {
          const subs = subsDe(c.id);
          const bolsillo = bolsillos.find((b) => b.id === c.bolsilloId);
          return (
            <Tarjeta key={c.id} style={{ gap: esp.sm }} padding={esp.md}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: esp.md }}>
                <IconoCategoria icono={c.icono} color={c.color} />
                <View style={{ flex: 1 }}>
                  <Texto variante="cuerpo">{c.nombre}</Texto>
                  <Texto variante="micro" color="tenue">
                    {bolsillo?.nombre ?? 'Sin bolsillo'}
                    {c.presupuestoMensual > 0 ? ` · ${formatoCOP(c.presupuestoMensual)}/mes` : ' · sin presupuesto'}
                  </Texto>
                </View>
                <Pressable onPress={() => mover(idx, -1)} hitSlop={6} accessibilityRole="button" accessibilityLabel="Subir">
                  <Ionicons name="chevron-up" size={18} color={t.textoTenue} />
                </Pressable>
                <Pressable onPress={() => mover(idx, 1)} hitSlop={6} accessibilityRole="button" accessibilityLabel="Bajar">
                  <Ionicons name="chevron-down" size={18} color={t.textoTenue} />
                </Pressable>
                <Pressable onPress={() => setEditando(c)} hitSlop={6} accessibilityRole="button" accessibilityLabel={`Editar ${c.nombre}`}>
                  <Ionicons name="create-outline" size={20} color={t.acento} />
                </Pressable>
              </View>

              {subs.length ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingLeft: 52 }}>
                  {subs.map((s) => (
                    <Pressable
                      key={s.id}
                      onPress={() => setEditando(s)}
                      accessibilityRole="button"
                      style={{ paddingHorizontal: esp.md, paddingVertical: 5, borderRadius: 999, backgroundColor: t.superficie2 }}
                    >
                      <Texto variante="micro" color="suave">{s.nombre}</Texto>
                    </Pressable>
                  ))}
                </View>
              ) : null}

              <View style={{ flexDirection: 'row', gap: esp.sm, paddingLeft: 52 }}>
                <Pressable onPress={() => setCreandoSubDe(c)} accessibilityRole="button">
                  <Texto variante="micro" color="acento">+ Subcategoría</Texto>
                </Pressable>
                <View style={{ flex: 1 }} />
                <Pressable onPress={() => conRefresco(() => archivarCategoria(c.id, true))} accessibilityRole="button">
                  <Texto variante="micro" color="tenue">Archivar</Texto>
                </Pressable>
              </View>
            </Tarjeta>
          );
        })}

        {archivadas.length ? (
          <>
            <Pressable onPress={() => setMostrarArchivadas(!mostrarArchivadas)} accessibilityRole="button" style={{ paddingVertical: esp.md }}>
              <Texto variante="etiqueta" color="acento">
                {mostrarArchivadas ? 'Ocultar' : 'Ver'} {archivadas.length} archivadas
              </Texto>
            </Pressable>
            {mostrarArchivadas ? archivadas.map((c) => (
              <Tarjeta key={c.id} padding={esp.md} style={{ flexDirection: 'row', alignItems: 'center', gap: esp.md, opacity: 0.6 }}>
                <IconoCategoria icono={c.icono} color={c.color} tam={34} />
                <Texto variante="cuerpo" style={{ flex: 1 }}>{c.nombre}</Texto>
                <Pressable onPress={() => conRefresco(() => archivarCategoria(c.id, false))} accessibilityRole="button">
                  <Texto variante="micro" color="acento">Restaurar</Texto>
                </Pressable>
                <Pressable
                  onPress={() => Alert.alert('Eliminar categoría', 'Los movimientos que la usaban quedarán sin categoría.', [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Eliminar', style: 'destructive', onPress: () => conRefresco(() => borrarCategoria(c.id)) },
                  ])}
                  hitSlop={8} accessibilityRole="button" accessibilityLabel={`Eliminar ${c.nombre}`}
                >
                  <Ionicons name="trash-outline" size={18} color={t.rojo} />
                </Pressable>
              </Tarjeta>
            )) : null}
          </>
        ) : null}
      </ScrollView>

      <HojaCategoria
        categoria={editando}
        subDe={creandoSubDe}
        onCerrar={() => { setEditando(null); setCreandoSubDe(null); }}
      />
    </SafeAreaView>
  );
}

/** Formulario de creacion / edicion de categoria y subcategoria. */
function HojaCategoria({
  categoria, subDe, onCerrar,
}: { categoria: Categoria | null; subDe: Categoria | null; onCerrar: () => void }) {
  const t = useTema();
  const { bolsillos } = useDatos();
  const visible = !!categoria || !!subDe;
  const esSub = !!subDe || !!categoria?.padreId;

  const [nombre, setNombre] = useState('');
  const [icono, setIcono] = useState(ICONOS_DISPONIBLES[0]);
  const [color, setColor] = useState<string>(COLORES_CATEGORIA[5]);
  const [bolsilloId, setBolsilloId] = useState<number | null>(null);
  const [presupuesto, setPresupuesto] = useState('');
  const [clave, setClave] = useState('');

  // Sincroniza el formulario cuando cambia la categoria abierta.
  const claveActual = `${categoria?.id ?? 'x'}-${subDe?.id ?? 'y'}-${visible}`;
  if (clave !== claveActual) {
    setClave(claveActual);
    setNombre(categoria && categoria.id ? categoria.nombre : '');
    setIcono(categoria?.icono ?? subDe?.icono ?? ICONOS_DISPONIBLES[0]);
    setColor(categoria?.color ?? subDe?.color ?? COLORES_CATEGORIA[5]);
    setBolsilloId(categoria?.bolsilloId ?? subDe?.bolsilloId ?? bolsillos[0]?.id ?? null);
    setPresupuesto(categoria?.presupuestoMensual ? String(categoria.presupuestoMensual) : '');
  }

  const guardar = () => {
    if (!nombre.trim()) return Alert.alert('Falta el nombre', 'Escribe un nombre para la categoría.');
    const datos = {
      nombre: nombre.trim(), icono, color, bolsilloId,
      presupuestoMensual: Math.round(parsearMonto(presupuesto)),
      padreId: subDe ? subDe.id : categoria?.padreId ?? null,
      archivada: 0, orden: categoria?.orden ?? 99, esIngreso: 0,
    };
    conRefresco(() => {
      if (categoria && categoria.id) actualizarCategoria(categoria.id, datos as any);
      else crearCategoria(datos as any);
    });
    onCerrar();
  };

  return (
    <Hoja
      visible={visible}
      onCerrar={onCerrar}
      titulo={categoria?.id ? 'Editar categoría' : esSub ? `Subcategoría de ${subDe?.nombre ?? ''}` : 'Nueva categoría'}
      alto="88%"
    >
      <Campo etiqueta="Nombre" value={nombre} onChangeText={setNombre} placeholder="Ej: Energía" />

      {!esSub ? (
        <>
          <View style={{ gap: 6 }}>
            <Texto variante="etiqueta" color="suave">Bolsillo</Texto>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: esp.sm }}>
              {bolsillos.map((b) => (
                <Chip key={b.id} texto={b.nombre} compacto color={b.color} activo={bolsilloId === b.id} onPress={() => setBolsilloId(b.id)} />
              ))}
            </View>
          </View>
          <Campo
            etiqueta="Presupuesto mensual (opcional)"
            value={presupuesto ? separarMiles(parsearMonto(presupuesto)) : ''}
            onChangeText={setPresupuesto}
            keyboardType="number-pad"
            placeholder="0 = sin presupuesto"
          />
        </>
      ) : null}

      <Texto variante="etiqueta" color="suave">Color</Texto>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: esp.sm }}>
        {COLORES_CATEGORIA.map((c) => (
          <Pressable
            key={c} onPress={() => setColor(c)} accessibilityRole="button" accessibilityLabel={`Color ${c}`}
            style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c, borderWidth: color === c ? 3 : 0, borderColor: t.texto }}
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

      <Boton titulo="Guardar" ancho onPress={guardar} />
    </Hoja>
  );
}
