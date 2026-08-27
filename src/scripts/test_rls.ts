import { PoolClient } from 'pg';
import { pool, withUserContext } from '../infrastructure/database/postgres';
import { Channel } from '../core/domain/Channel';
import { ChannelRepository } from '../infrastructure/repositories/ChannelRepository';
import { MessageRepository } from '../infrastructure/repositories/MessageRepository';

// Helper transaccional para simular tareas administrativas o de sistema (bypass de RLS)
async function withAdminContext<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SET LOCAL app.bypass_rls = 'true'");
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

async function verifyRLS() {
  console.log('--- starting RLS verification ---');

  // 1. Consulta directa sin contexto (Debe retornar 0 filas debido a FORCE RLS)
  const allChannelsResult = await pool.query('SELECT * FROM rw_channels');
  console.log(`[Raw Query without Context] Total channels seen: ${allChannelsResult.rowCount}`);
  if (allChannelsResult.rowCount === 0) {
    console.log('✅ RLS Success: Raw query without context is blocked from reading channels.');
  } else {
    console.error('❌ RLS Failure: Raw query without context was able to read channels!');
  }

  // 2. Consulta con contexto administrativo / bypass
  const adminChannelsResult = await withAdminContext(async (client) => {
    return await client.query('SELECT * FROM rw_channels');
  });
  console.log(`[Admin Bypass Context] Total channels seen: ${adminChannelsResult.rowCount}`);
  console.log('Channels:', (adminChannelsResult.rows as Channel[]).map(c => c.rw_name));

  // 3. Consulta con contexto de usuario user_02 (Miembro de 'general', no miembro de 'desarrollo-interno')
  await withUserContext('user_02', async (client) => {
    const channelRepo = new ChannelRepository(client);
    
    // Obtenemos los canales a través del repositorio bajo el contexto de usuario
    const channels = await channelRepo.findAll();
    console.log(`[user_02 Context] Channels visible: ${channels.length}`);
    console.log('Visible channels:', channels.map(c => c.rw_name));
    
    // Validamos que 'desarrollo-interno' (canal privado) no sea visible
    const hasPrivateChannel = channels.some(c => c.rw_id === 'channel_02');
    if (hasPrivateChannel) {
      console.error('❌ RLS Failure: user_02 was able to view private channel_02 without being a member!');
    } else {
      console.log('✅ RLS Success: Private channel_02 is hidden from non-member user_02.');
    }
  });

  // 4. Envío de mensaje en un canal permitido (general / channel_01)
  try {
    await withUserContext('user_02', async (client) => {
      const msgRepo = new MessageRepository(client);
      await msgRepo.create({
        rw_id: 'test_msg_01',
        rw_channel_id: 'channel_01',
        rw_user_id: 'user_02',
        rw_content: 'Test message inside RLS policy',
        rw_is_edited: false,
        rw_is_deleted: false,
      });
      console.log('✅ RLS Success: user_02 successfully posted a message to channel_01.');
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('❌ RLS Failure: user_02 could not post message to channel_01:', message);
  }

  // 5. Envío de mensaje en un canal no permitido (desarrollo-interno / channel_02)
  try {
    await withUserContext('user_02', async (client) => {
      const msgRepo = new MessageRepository(client);
      await msgRepo.create({
        rw_id: 'test_msg_block_01',
        rw_channel_id: 'channel_02', // canal privado
        rw_user_id: 'user_02',
        rw_content: 'This message should be blocked by RLS!',
        rw_is_edited: false,
        rw_is_deleted: false,
      });
      console.error('❌ RLS Failure: user_02 successfully posted a message to a channel they are not a member of!');
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.log('✅ RLS Success: user_02 was blocked from posting to channel_02. Error message:', message);
  }

  // Limpiar registros de prueba
  await withAdminContext(async (client) => {
    await client.query("DELETE FROM rw_messages WHERE rw_id LIKE 'test_%'");
    console.log('🧹 Cleaned up verification database records.');
  });

  await pool.end();
  console.log('--- RLS verification completed ---');
}

verifyRLS().catch(err => {
  const message = err instanceof Error ? err.message : String(err);
  console.error('Verification failed:', message);
  process.exit(1);
});

