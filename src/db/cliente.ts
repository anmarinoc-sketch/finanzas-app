import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema';

export const NOMBRE_BD = 'misfinanzas.db';

/**
 * expo-sqlite abre la base de forma sincrona y el driver de Drizzle para Expo
 * es sincrono tambien: por eso todas las consultas del repositorio usan
 * .all() / .get() / .run() sin promesas. Eso simplifica el render y evita
 * estados intermedios de carga en cada pantalla.
 */
export const bdNativa = SQLite.openDatabaseSync(NOMBRE_BD);

export const db = drizzle(bdNativa, { schema });

export type BD = typeof db;
