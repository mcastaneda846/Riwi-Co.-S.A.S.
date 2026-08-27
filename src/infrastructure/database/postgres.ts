import { Pool, PoolClient } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://rw_admin:rw_secure_password_2026@127.0.0.1:5432/bd_riwi_chat_clan',
});

/**
 * Ejecuta una transacción garantizando el inicio (BEGIN), la fijación de la variable de sesión
 * del usuario para RLS (app.current_user_id), el callback del usuario, COMMIT o ROLLBACK ante errores,
 * y finalmente la liberación del cliente (client.release).
 */
export async function withUserContext<T>(
  userId: string,
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Fija la variable de sesión local en la transacción para políticas RLS
    await client.query("SELECT set_config('app.current_user_id', $1, true)", [userId]);
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Ejecuta una transacción administrativa o de sistema fijando bypass_rls = 'true'
 * para omitir RLS (por ejemplo, durante la búsqueda inicial para inicio de sesión).
 */
export async function withBypassContext<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.bypass_rls', 'true', true)");
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}