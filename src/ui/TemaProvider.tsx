import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { Tema, temaClaro, temaOscuro } from './tema';
import { useAjustes } from '@/store/ajustes';

const Ctx = createContext<Tema>(temaClaro);

export function ProveedorTema({ children }: { children: React.ReactNode }) {
  const esquemaSistema = useColorScheme();
  const preferencia = useAjustes((s) => s.tema);
  const tema = useMemo(() => {
    const oscuro = preferencia === 'sistema' ? esquemaSistema === 'dark' : preferencia === 'oscuro';
    return oscuro ? temaOscuro : temaClaro;
  }, [preferencia, esquemaSistema]);
  return <Ctx.Provider value={tema}>{children}</Ctx.Provider>;
}

export const useTema = () => useContext(Ctx);
