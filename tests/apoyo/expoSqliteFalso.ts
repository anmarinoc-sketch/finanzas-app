/**
 * Implementación de expo-sqlite sobre el SQLite nativo de Node.
 * Permite ejecutar TODA la capa de datos real (Drizzle incluido) en las
 * pruebas, sin emulador. Reproduce la API síncrona que usan el driver de
 * Drizzle para Expo y el repositorio de la app.
 */
import { DatabaseSync } from 'node:sqlite';

const limpiar = (params: unknown[] = []) =>
  params.map((p) => {
    if (p === undefined) return null;
    if (typeof p === 'boolean') return p ? 1 : 0;
    return p as any;
  });

class SentenciaFalsa {
  constructor(private db: DatabaseSync, private sql: string) {}

  executeSync(params: unknown[] = []) {
    const stmt = this.db.prepare(this.sql);
    const esLectura = /^\s*(select|pragma|with)/i.test(this.sql);
    if (esLectura) {
      const filas = stmt.all(...limpiar(params)) as any[];
      return {
        changes: 0,
        lastInsertRowId: 0,
        getAllSync: () => filas,
        getFirstSync: () => filas[0] ?? null,
      };
    }
    const r = stmt.run(...limpiar(params));
    return {
      changes: Number(r.changes),
      lastInsertRowId: Number(r.lastInsertRowid),
      getAllSync: () => [] as any[],
      getFirstSync: () => null,
    };
  }

  executeForRawResultSync(params: unknown[] = []) {
    const filas = this.db.prepare(this.sql).all(...limpiar(params)) as any[];
    return { getAllSync: () => filas.map((f) => Object.values(f)) };
  }

  finalizeSync() {}
}

export class BaseFalsa {
  private db = new DatabaseSync(':memory:');

  prepareSync(sql: string) { return new SentenciaFalsa(this.db, sql); }
  execSync(sql: string) { this.db.exec(sql); }
  runSync(sql: string, params: unknown[] = []) {
    const r = this.db.prepare(sql).run(...limpiar(params));
    return { changes: Number(r.changes), lastInsertRowId: Number(r.lastInsertRowid) };
  }
  getAllSync<T = any>(sql: string, params: unknown[] = []): T[] {
    return this.db.prepare(sql).all(...limpiar(params)) as T[];
  }
  getFirstSync<T = any>(sql: string, params: unknown[] = []): T | null {
    return (this.db.prepare(sql).all(...limpiar(params))[0] as T) ?? null;
  }
  withTransactionSync(fn: () => void) {
    this.db.exec('BEGIN');
    try { fn(); this.db.exec('COMMIT'); }
    catch (e) { this.db.exec('ROLLBACK'); throw e; }
  }
  closeSync() { this.db.close(); }
}

export const openDatabaseSync = () => new BaseFalsa();
