
import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/* ------------------------------------------------------------------ *
 * Convenciones
 *  - Los montos se guardan como INTEGER en pesos enteros. El COP no usa
 *    centavos en la practica y los enteros evitan errores de coma flotante
 *    al sumar miles de transacciones.
 *  - Las fechas se guardan como TEXT 'yyyy-MM-dd' (orden lexicografico =
 *    orden cronologico, comparable en SQL sin funciones de fecha).
 * ------------------------------------------------------------------ */

export type TipoTransaccion = 'gasto' | 'ingreso' | 'transferencia';
export type MedioPago = 'efectivo' | 'debito' | 'credito' | 'transferencia' | 'nequi' | 'daviplata' | 'otro';
export type Frecuencia =
  | 'diaria' | 'semanal' | 'quincenal' | 'mensual' | 'bimestral'
  | 'trimestral' | 'semestral' | 'anual' | 'ocasional';
export type TipoBolsillo = 'necesidades' | 'ocio' | 'ahorro' | 'imprevistos' | 'deudas' | 'personalizado';
export type TipoCuenta = 'efectivo' | 'bancaria' | 'digital' | 'ahorro';

export const usuario = sqliteTable('usuario', {
  id: integer('id').primaryKey(),
  nombre: text('nombre').notNull().default('Mi cuenta'),
  moneda: text('moneda').notNull().default('COP'),
  diaInicioCiclo: integer('dia_inicio_ciclo').notNull().default(1),
  tema: text('tema').notNull().default('sistema'),
  pinActivo: integer('pin_activo').notNull().default(0),
  pin: text('pin'),
  biometria: integer('biometria').notNull().default(0),
  notificaciones: integer('notificaciones').notNull().default(1),
  onboardingCompleto: integer('onboarding_completo').notNull().default(0),
  creadoEn: text('creado_en').notNull(),
});

export const ingresos = sqliteTable('ingresos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nombre: text('nombre').notNull(),
  monto: integer('monto').notNull(),
  /** Segunda quincena, cuando las dos no son iguales. Solo aplica a frecuencia quincenal. */
  montoSecundario: integer('monto_secundario'),
  frecuencia: text('frecuencia').$type<Frecuencia>().notNull().default('mensual'),
  activo: integer('activo').notNull().default(1),
  fechaInicio: text('fecha_inicio').notNull(),
  cuentaId: integer('cuenta_id'),
});

export const bolsillos = sqliteTable('bolsillos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nombre: text('nombre').notNull(),
  porcentaje: real('porcentaje').notNull().default(0),
  color: text('color').notNull().default('#4F46E5'),
  icono: text('icono').notNull().default('wallet-outline'),
  tipo: text('tipo').$type<TipoBolsillo>().notNull().default('personalizado'),
  orden: integer('orden').notNull().default(0),
});

export const categorias = sqliteTable('categorias', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nombre: text('nombre').notNull(),
  icono: text('icono').notNull().default('apps-outline'),
  color: text('color').notNull().default('#64748B'),
  bolsilloId: integer('bolsillo_id'),
  presupuestoMensual: integer('presupuesto_mensual').notNull().default(0),
  padreId: integer('padre_id'),
  archivada: integer('archivada').notNull().default(0),
  orden: integer('orden').notNull().default(0),
  esIngreso: integer('es_ingreso').notNull().default(0),
});

export const cuentas = sqliteTable('cuentas', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nombre: text('nombre').notNull(),
  tipo: text('tipo').$type<TipoCuenta>().notNull().default('bancaria'),
  saldoInicial: integer('saldo_inicial').notNull().default(0),
  banco: text('banco'),
  color: text('color').notNull().default('#3B82F6'),
  icono: text('icono').notNull().default('wallet-outline'),
  archivada: integer('archivada').notNull().default(0),
});

export const tarjetas = sqliteTable('tarjetas', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nombre: text('nombre').notNull(),
  banco: text('banco'),
  cupoTotal: integer('cupo_total').notNull().default(0),
  diaCorte: integer('dia_corte').notNull().default(15),
  diaPago: integer('dia_pago').notNull().default(5),
  tasaInteres: real('tasa_interes').notNull().default(0),
  color: text('color').notNull().default('#4F46E5'),
  archivada: integer('archivada').notNull().default(0),
});

export const transacciones = sqliteTable('transacciones', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tipo: text('tipo').$type<TipoTransaccion>().notNull().default('gasto'),
  monto: integer('monto').notNull(),
  fecha: text('fecha').notNull(),
  categoriaId: integer('categoria_id'),
  subcategoriaId: integer('subcategoria_id'),
  cuentaId: integer('cuenta_id'),
  cuentaDestinoId: integer('cuenta_destino_id'),
  tarjetaId: integer('tarjeta_id'),
  metaId: integer('meta_id'),
  medioPago: text('medio_pago').$type<MedioPago>().notNull().default('efectivo'),
  descripcion: text('descripcion').notNull().default(''),
  notas: text('notas'),
  etiquetas: text('etiquetas').notNull().default(''),
  fotoUri: text('foto_uri'),
  recurrenteId: integer('recurrente_id'),
  grupoId: integer('grupo_id'),
  cuotas: integer('cuotas').notNull().default(1),
  cuotaActual: integer('cuota_actual').notNull().default(1),
  creadoEn: text('creado_en').notNull(),
}, (t) => ({
  idxFecha: index('idx_tx_fecha').on(t.fecha),
  idxCategoria: index('idx_tx_categoria').on(t.categoriaId),
  idxTipoFecha: index('idx_tx_tipo_fecha').on(t.tipo, t.fecha),
  idxTarjeta: index('idx_tx_tarjeta').on(t.tarjetaId),
}));

export const recurrentes = sqliteTable('recurrentes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  descripcion: text('descripcion').notNull(),
  monto: integer('monto').notNull(),
  frecuencia: text('frecuencia').$type<Frecuencia>().notNull().default('mensual'),
  categoriaId: integer('categoria_id'),
  cuentaId: integer('cuenta_id'),
  tarjetaId: integer('tarjeta_id'),
  medioPago: text('medio_pago').$type<MedioPago>().notNull().default('debito'),
  proximaFecha: text('proxima_fecha').notNull(),
  activo: integer('activo').notNull().default(1),
  esSuscripcion: integer('es_suscripcion').notNull().default(0),
  ultimoUso: text('ultimo_uso'),
  tipo: text('tipo').$type<TipoTransaccion>().notNull().default('gasto'),
});

export const metas = sqliteTable('metas', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nombre: text('nombre').notNull(),
  montoObjetivo: integer('monto_objetivo').notNull(),
  montoActual: integer('monto_actual').notNull().default(0),
  fechaLimite: text('fecha_limite'),
  color: text('color').notNull().default('#10B981'),
  icono: text('icono').notNull().default('flag-outline'),
  aporteAutomatico: real('aporte_automatico').notNull().default(0),
  prioridad: integer('prioridad').notNull().default(2),
  estado: text('estado').notNull().default('en_curso'),
  fechaCreacion: text('fecha_creacion').notNull(),
  archivada: integer('archivada').notNull().default(0),
});

export const aportesMeta = sqliteTable('aportes_meta', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  metaId: integer('meta_id').notNull(),
  monto: integer('monto').notNull(),
  fecha: text('fecha').notNull(),
  tipo: text('tipo').$type<'aporte' | 'retiro'>().notNull().default('aporte'),
  nota: text('nota'),
}, (t) => ({ idxMeta: index('idx_aporte_meta').on(t.metaId) }));

export const deudas = sqliteTable('deudas', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nombre: text('nombre').notNull(),
  entidad: text('entidad'),
  montoOriginal: integer('monto_original').notNull(),
  saldo: integer('saldo').notNull(),
  tasa: real('tasa').notNull().default(0),
  cuotaMensual: integer('cuota_mensual').notNull().default(0),
  plazoMeses: integer('plazo_meses').notNull().default(0),
  diaPago: integer('dia_pago').notNull().default(5),
  color: text('color').notNull().default('#EF4444'),
  activa: integer('activa').notNull().default(1),
});

export type Usuario = typeof usuario.$inferSelect;
export type Ingreso = typeof ingresos.$inferSelect;
export type Bolsillo = typeof bolsillos.$inferSelect;
export type Categoria = typeof categorias.$inferSelect;
export type Cuenta = typeof cuentas.$inferSelect;
export type Tarjeta = typeof tarjetas.$inferSelect;
export type Transaccion = typeof transacciones.$inferSelect;
export type NuevaTransaccion = typeof transacciones.$inferInsert;
export type Recurrente = typeof recurrentes.$inferSelect;
export type Meta = typeof metas.$inferSelect;
export type AporteMeta = typeof aportesMeta.$inferSelect;
export type Deuda = typeof deudas.$inferSelect;
