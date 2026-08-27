import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://rw_admin:rw_secure_password_2026@127.0.0.1:5432/bd_riwi_chat_clan',
});

async function runSeed() {
  const client = await pool.connect();
  try {
    const seedPath = path.resolve(process.cwd(), 'seed.json');
    console.log(`Reading seed file from: ${seedPath}`);
    
    if (!fs.existsSync(seedPath)) {
      throw new Error(`seed.json file not found at path: ${seedPath}`);
    }

    const rawData = fs.readFileSync(seedPath, 'utf-8');
    const data = JSON.parse(rawData);

    // Iniciar transacción idempotente
    await client.query('BEGIN');
    // Fija bypass para omitir RLS durante la carga de seed
    await client.query("SET LOCAL app.bypass_rls = 'true'");

    // 1. Usuarios
    if (data.users && Array.isArray(data.users)) {
      for (const u of data.users) {
        await client.query(
          `INSERT INTO rw_users (rw_id, rw_email, rw_password_hash, rw_full_name, rw_role, rw_is_active, rw_created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (rw_id) DO NOTHING`,
          [u.rw_id, u.rw_email, u.rw_password_hash, u.rw_full_name, u.rw_role, u.rw_is_active, u.rw_created_at]
        );
      }
    }

    // 2. Canales
    if (data.channels && Array.isArray(data.channels)) {
      for (const c of data.channels) {
        await client.query(
          `INSERT INTO rw_channels (rw_id, rw_name, rw_is_private, rw_created_by, rw_created_at)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (rw_id) DO NOTHING`,
          [c.rw_id, c.rw_name, c.rw_is_private, c.rw_created_by, c.rw_created_at]
        );
      }
    }

    // 3. Membresías
    if (data.channel_members && Array.isArray(data.channel_members)) {
      for (const m of data.channel_members) {
        await client.query(
          `INSERT INTO rw_channel_members (rw_channel_id, rw_user_id, rw_joined_at)
           VALUES ($1, $2, $3)
           ON CONFLICT (rw_channel_id, rw_user_id) DO NOTHING`,
          [m.rw_channel_id, m.rw_user_id, m.rw_joined_at]
        );
      }
    }

    // 4. Mensajes
    if (data.messages && Array.isArray(data.messages)) {
      for (const msg of data.messages) {
        await client.query(
          `INSERT INTO rw_messages (rw_id, rw_channel_id, rw_user_id, rw_content, rw_is_edited, rw_is_deleted, rw_created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (rw_id) DO NOTHING`,
          [msg.rw_id, msg.rw_channel_id, msg.rw_user_id, msg.rw_content, msg.rw_is_edited, msg.rw_is_deleted, msg.rw_created_at]
        );
      }
    }

    await client.query('COMMIT');
    console.log('✅ Base de datos poblada exitosamente con seed.json de forma idempotente.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error al cargar seed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runSeed();