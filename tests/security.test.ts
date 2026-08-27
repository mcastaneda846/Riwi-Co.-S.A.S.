import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://rw_admin:rw_secure_password_2026@127.0.0.1:5432/bd_riwi_chat_clan',
});

async function runSecurityTests() {
  console.log('--- STARTING SECURITY TESTS CONTRA POSTGRESQL REAL (RLS) ---');
  const client = await pool.connect();

  try {
    // Preparar datos de prueba: Insertar un mensaje privado en channel_02 (desarrollo-interno) si no existe
    await client.query('BEGIN');
    await client.query("SET LOCAL app.bypass_rls = 'true'");
    
    // Insertar un mensaje confidencial en el canal privado de evaluación/desarrollo-interno
    const msgId = 'msg_confidential_test_01';
    await client.query(`
      INSERT INTO rw_messages (rw_id, rw_channel_id, rw_user_id, rw_content)
      VALUES ($1, 'channel_02', 'user_01', 'Evaluación secreta y confidencial del Coder: Aprobado con honores.')
      ON CONFLICT (rw_id) DO UPDATE SET rw_content = EXCLUDED.rw_content
    `, [msgId]);

    // Generar un embedding mock de 1536 dimensiones para pruebas vectoriales
    const mockVector = '[' + Array(1536).fill(0.01).join(',') + ']';
    await client.query(`
      UPDATE rw_messages 
      SET rw_embedding = $1::vector 
      WHERE rw_id = $2
    `, [mockVector, msgId]);

    await client.query('COMMIT');
    console.log('✓ Datos confidenciales preparados en channel_02.');

    // =========================================================================
    // TEST 1: Un usuario Coder (user_02) no puede leer mensajes de channel_02
    // =========================================================================
    console.log('\nEjecutando Test 1: Intento de lectura de canal privado por usuario no miembro (Coder)...');
    
    const test1Res = await client.query(`
      SELECT * FROM (
        SELECT 1 as run_context, set_config('app.current_user_id', 'user_02', true)
      ) c, rw_messages m
      WHERE m.rw_channel_id = 'channel_02'
    `);
    
    console.log(`Mensajes recuperados por user_02 en channel_02: ${test1Res.rows.length}`);
    if (test1Res.rows.length === 0) {
      console.log('✅ TEST 1 PASSED: El usuario Coder (user_02) recibió 0 resultados del canal privado (Aislado por RLS).');
    } else {
      throw new Error('❌ TEST 1 FAILED: El usuario Coder pudo leer mensajes de un canal privado ajeno.');
    }

    // =========================================================================
    // TEST 2: La búsqueda vectorial para el usuario Coder no devuelve contexto privado
    // =========================================================================
    console.log('\nEjecutando Test 2: Búsqueda vectorial del Copiloto por usuario Coder...');
    
    // Ejecutamos la función de búsqueda vectorial dentro del contexto de user_02
    const test2Res = await client.query(`
      SELECT * FROM (
        SELECT 1 as run_context, set_config('app.current_user_id', 'user_02', true)
      ) c, rw_fn_copilot_context_search($1::vector, 0.0, 10)
    `, [mockVector]);

    const confidentialFound = test2Res.rows.some((row: { rw_id: string }) => row.rw_id === msgId);
    console.log(`Mensajes devueltos por búsqueda vectorial para user_02: ${test2Res.rows.length}`);
    
    if (!confidentialFound) {
      console.log('✅ TEST 2 PASSED: La búsqueda vectorial para el Coder no devolvió ningún mensaje privado/confidencial de channel_02 (Aislado por RLS).');
    } else {
      throw new Error('❌ TEST 2 FAILED: La búsqueda vectorial expuso mensajes privados confidenciales al usuario Coder.');
    }

    // =========================================================================
    // TEST 3 (Verificación): El administrador (user_01) sí puede leer el mensaje
    // =========================================================================
    console.log('\nEjecutando Test 3 (Verificación): Acceso correcto del Administrador (miembro)...');
    const test3Res = await client.query(`
      SELECT * FROM (
        SELECT 1 as run_context, set_config('app.current_user_id', 'user_01', true)
      ) c, rw_messages m
      WHERE m.rw_channel_id = 'channel_02'
    `);
    console.log(`Mensajes recuperados por el Admin (user_01) en channel_02: ${test3Res.rows.length}`);
    if (test3Res.rows.length > 0) {
      console.log('✅ TEST 3 PASSED: El administrador (user_01) accedió correctamente al canal privado del cual es miembro.');
    } else {
      throw new Error('❌ TEST 3 FAILED: El administrador no pudo acceder a su propio canal privado.');
    }

    console.log('\n--- TODOS LOS TESTS DE SEGURIDAD PASARON EXITOSAMENTE ---');

  } catch (error) {
    console.error('\n❌ ERROR EN PRUEBAS DE SEGURIDAD:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runSecurityTests();
