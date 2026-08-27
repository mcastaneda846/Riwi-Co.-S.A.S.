import { Pool, PoolClient } from 'pg';
import { pool } from '../database/postgres';
import { Channel } from '../../core/domain/Channel';

export class ChannelRepository {
  constructor(private db: Pool | PoolClient = pool) {}

  async create(channel: Channel): Promise<Channel> {
    const query = `
      INSERT INTO rw_channels (rw_id, rw_name, rw_is_private, rw_created_by, rw_created_at)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [
      channel.rw_id,
      channel.rw_name,
      channel.rw_is_private,
      channel.rw_created_by,
      channel.rw_created_at || new Date()
    ];
    const { rows } = await this.db.query(query, values);
    return rows[0];
  }

  async findById(id: string): Promise<Channel | null> {
    const query = `SELECT * FROM rw_channels WHERE rw_id = $1`;
    const { rows } = await this.db.query(query, [id]);
    return rows[0] || null;
  }

  async findAll(): Promise<Channel[]> {
    const query = `SELECT * FROM rw_channels`;
    const { rows } = await this.db.query(query);
    return rows;
  }

  async addMember(channelId: string, userId: string): Promise<void> {
    const query = `
      INSERT INTO rw_channel_members (rw_channel_id, rw_user_id, rw_joined_at)
      VALUES ($1, $2, $3)
      ON CONFLICT (rw_channel_id, rw_user_id) DO NOTHING
    `;
    await this.db.query(query, [channelId, userId, new Date()]);
  }

  async removeMember(channelId: string, userId: string): Promise<void> {
    const query = `
      DELETE FROM rw_channel_members 
      WHERE rw_channel_id = $1 AND rw_user_id = $2
    `;
    await this.db.query(query, [channelId, userId]);
  }

  async getMembers(channelId: string): Promise<string[]> {
    const query = `
      SELECT rw_user_id FROM rw_channel_members 
      WHERE rw_channel_id = $1
    `;
    const { rows } = await this.db.query(query, [channelId]);
    return rows.map(r => r.rw_user_id);
  }
}
