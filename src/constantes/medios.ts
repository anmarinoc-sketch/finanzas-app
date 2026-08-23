import type { MedioPago } from '@/db/schema';

export const MEDIOS_PAGO: { id: MedioPago; nombre: string; icono: string; color: string }[] = [
  { id: 'efectivo',    nombre: 'Efectivo',        icono: 'cash-outline',            color: '#22C55E' },
  { id: 'debito',      nombre: 'Tarjeta débito',  icono: 'card-outline',            color: '#3B82F6' },
  { id: 'credito',     nombre: 'Tarjeta crédito', icono: 'card',                    color: '#EF4444' },
  { id: 'transferencia', nombre: 'Transferencia', icono: 'swap-horizontal-outline', color: '#6366F1' },
  { id: 'nequi',       nombre: 'Nequi',           icono: 'phone-portrait-outline',  color: '#EC4899' },
  { id: 'daviplata',   nombre: 'Daviplata',       icono: 'phone-portrait',          color: '#F43F5E' },
  { id: 'otro',        nombre: 'Otro',            icono: 'ellipsis-horizontal',     color: '#64748B' },
];

export const nombreMedio = (id?: string | null) =>
  MEDIOS_PAGO.find((m) => m.id === id)?.nombre ?? 'Otro';
export const iconoMedio = (id?: string | null) =>
  MEDIOS_PAGO.find((m) => m.id === id)?.icono ?? 'ellipsis-horizontal';
