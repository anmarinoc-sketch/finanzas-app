import { bdNativa } from './cliente';

/**
 * Migraciones. Cada entrada es una version; se aplican en orden las que
 * falten segun PRAGMA user_version. Es idempotente y no necesita codegen,
 * asi el proyecto compila sin correr drizzle-kit antes del build.
 * Para agregar cambios de esquema: se anade un elemento nuevo al final.
 */
const MIGRACIONES: string[] = [
  // v1: esquema base
  `
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS usuario (
    id INTEGER PRIMARY KEY,
    nombre TEXT NOT NULL DEFAULT 'Mi cuenta',
    moneda TEXT NOT NULL DEFAULT 'COP',
    dia_inicio_ciclo INTEGER NOT NULL DEFAULT 1,
    tema TEXT NOT NULL DEFAULT 'sistema',
    pin_activo INTEGER NOT NULL DEFAULT 0,
    pin TEXT,
    biometria INTEGER NOT NULL DEFAULT 0,
    notificaciones INTEGER NOT NULL DEFAULT 1,
    onboarding_completo INTEGER NOT NULL DEFAULT 0,
    creado_en TEXT NOT NULL DEFAULT (date('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS ingresos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    monto INTEGER NOT NULL,
    frecuencia TEXT NOT NULL DEFAULT 'mensual',
    activo INTEGER NOT NULL DEFAULT 1,
    fecha_inicio TEXT NOT NULL,
    cuenta_id INTEGER
  );

  CREATE TABLE IF NOT EXISTS bolsillos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    porcentaje REAL NOT NULL DEFAULT 0,
    color TEXT NOT NULL DEFAULT '#4F46E5',
    icono TEXT NOT NULL DEFAULT 'wallet-outline',
    tipo TEXT NOT NULL DEFAULT 'personalizado',
    orden INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS categorias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    icono TEXT NOT NULL DEFAULT 'apps-outline',
    color TEXT NOT NULL DEFAULT '#64748B',
    bolsillo_id INTEGER,
    presupuesto_mensual INTEGER NOT NULL DEFAULT 0,
    padre_id INTEGER,
    archivada INTEGER NOT NULL DEFAULT 0,
    orden INTEGER NOT NULL DEFAULT 0,
    es_ingreso INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS cuentas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    tipo TEXT NOT NULL DEFAULT 'bancaria',
    saldo_inicial INTEGER NOT NULL DEFAULT 0,
    banco TEXT,
    color TEXT NOT NULL DEFAULT '#3B82F6',
    icono TEXT NOT NULL DEFAULT 'wallet-outline',
    archivada INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS tarjetas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    banco TEXT,
    cupo_total INTEGER NOT NULL DEFAULT 0,
    dia_corte INTEGER NOT NULL DEFAULT 15,
    dia_pago INTEGER NOT NULL DEFAULT 5,
    tasa_interes REAL NOT NULL DEFAULT 0,
    color TEXT NOT NULL DEFAULT '#4F46E5',
    archivada INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS transacciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo TEXT NOT NULL DEFAULT 'gasto',
    monto INTEGER NOT NULL,
    fecha TEXT NOT NULL,
    categoria_id INTEGER,
    subcategoria_id INTEGER,
    cuenta_id INTEGER,
    cuenta_destino_id INTEGER,
    tarjeta_id INTEGER,
    meta_id INTEGER,
    medio_pago TEXT NOT NULL DEFAULT 'efectivo',
    descripcion TEXT NOT NULL DEFAULT '',
    notas TEXT,
    etiquetas TEXT NOT NULL DEFAULT '',
    foto_uri TEXT,
    recurrente_id INTEGER,
    grupo_id INTEGER,
    cuotas INTEGER NOT NULL DEFAULT 1,
    cuota_actual INTEGER NOT NULL DEFAULT 1,
    creado_en TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );

  CREATE INDEX IF NOT EXISTS idx_tx_fecha ON transacciones (fecha);
  CREATE INDEX IF NOT EXISTS idx_tx_categoria ON transacciones (categoria_id);
  CREATE INDEX IF NOT EXISTS idx_tx_tipo_fecha ON transacciones (tipo, fecha);
  CREATE INDEX IF NOT EXISTS idx_tx_tarjeta ON transacciones (tarjeta_id);
  CREATE INDEX IF NOT EXISTS idx_tx_grupo ON transacciones (grupo_id);

  CREATE TABLE IF NOT EXISTS recurrentes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    descripcion TEXT NOT NULL,
    monto INTEGER NOT NULL,
    frecuencia TEXT NOT NULL DEFAULT 'mensual',
    categoria_id INTEGER,
    cuenta_id INTEGER,
    tarjeta_id INTEGER,
    medio_pago TEXT NOT NULL DEFAULT 'debito',
    proxima_fecha TEXT NOT NULL,
    activo INTEGER NOT NULL DEFAULT 1,
    es_suscripcion INTEGER NOT NULL DEFAULT 0,
    ultimo_uso TEXT,
    tipo TEXT NOT NULL DEFAULT 'gasto'
  );

  CREATE TABLE IF NOT EXISTS metas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    monto_objetivo INTEGER NOT NULL,
    monto_actual INTEGER NOT NULL DEFAULT 0,
    fecha_limite TEXT,
    color TEXT NOT NULL DEFAULT '#10B981',
    icono TEXT NOT NULL DEFAULT 'flag-outline',
    aporte_automatico REAL NOT NULL DEFAULT 0,
    prioridad INTEGER NOT NULL DEFAULT 2,
    estado TEXT NOT NULL DEFAULT 'en_curso',
    fecha_creacion TEXT NOT NULL,
    archivada INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS aportes_meta (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    meta_id INTEGER NOT NULL,
    monto INTEGER NOT NULL,
    fecha TEXT NOT NULL,
    tipo TEXT NOT NULL DEFAULT 'aporte',
    nota TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_aporte_meta ON aportes_meta (meta_id);

  CREATE TABLE IF NOT EXISTS deudas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    entidad TEXT,
    monto_original INTEGER NOT NULL,
    saldo INTEGER NOT NULL,
    tasa REAL NOT NULL DEFAULT 0,
    cuota_mensual INTEGER NOT NULL DEFAULT 0,
    plazo_meses INTEGER NOT NULL DEFAULT 0,
    dia_pago INTEGER NOT NULL DEFAULT 5,
    color TEXT NOT NULL DEFAULT '#EF4444',
    activa INTEGER NOT NULL DEFAULT 1
  );
  `,
];

/** Aplica las migraciones pendientes. Devuelve la version final. */
export function migrar(): number {
  const fila = bdNativa.getFirstSync<{ user_version: number }>('PRAGMA user_version');
  let version = fila?.user_version ?? 0;
  for (let i = version; i < MIGRACIONES.length; i++) {
    bdNativa.execSync(MIGRACIONES[i]);
    version = i + 1;
    bdNativa.execSync(`PRAGMA user_version = ${version}`);
  }
  return version;
}

/** Borra todo el contenido sin tocar el esquema (usado por "empezar de cero"). */
export function vaciarDatos() {
  bdNativa.execSync(`
    DELETE FROM transacciones; DELETE FROM aportes_meta; DELETE FROM metas;
    DELETE FROM recurrentes; DELETE FROM deudas; DELETE FROM tarjetas;
    DELETE FROM cuentas; DELETE FROM categorias; DELETE FROM bolsillos;
    DELETE FROM ingresos; DELETE FROM usuario;
    DELETE FROM sqlite_sequence;
  `);
}

/** Borra solo los movimientos de ejemplo, conservando la configuracion. */
export function borrarMovimientos() {
  bdNativa.execSync(`
    DELETE FROM transacciones; DELETE FROM aportes_meta;
    UPDATE metas SET monto_actual = 0, estado = 'en_curso';
  `);
}
