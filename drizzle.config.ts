import type { Config } from 'drizzle-kit';

/**
 * Solo se usa si se quiere generar migraciones SQL versionadas con drizzle-kit.
 * La app arranca con un bootstrap idempotente (src/db/bootstrap.ts) que no
 * depende de este archivo, para no necesitar codegen antes de compilar.
 */
export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  driver: 'expo',
} satisfies Config;
