import { Pool, PoolClient } from 'pg';
import { pool } from '../database/postgres';
import { Message } from '../../core/domain/Message';

export class MessageRepository {
  constructor(private db: Pool | PoolClient = pool) {}

  async create(message: Message): Promise<Message> {
    const query = `
      INSERT INTO rw_messages (
        rw_id, rw_channel_id, rw_user_id, rw_content, 
        rw_is_edited, rw_is_deleted, rw_created_at, rw_embedding
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const values = [
      message.rw_id,
      message.rw_channel_id,
      message.rw_user_id,
      message.rw_content,
      message.rw_is_edited || false,
      message.rw_is_deleted || false,
      message.rw_created_at || new Date(),
      message.rw_embedding ? `[${message.rw_embedding.join(',')}]` : null
    ];
    const { rows } = await this.db.query(query, values);
    return rows[0];
  }

  async findById(id: string): Promise<Message | null> {
    const query = `SELECT * FROM rw_messages WHERE rw_id = $1`;
    const { rows } = await this.db.query(query, [id]);
    return rows[0] || null;
  }

  async findByChannelId(channelId: string): Promise<Message[]> {
    const query = `
      SELECT * FROM rw_messages 
      WHERE rw_channel_id = $1 AND rw_is_deleted = FALSE
      ORDER BY rw_created_at ASC
    `;
    const { rows } = await this.db.query(query, [channelId]);
    return rows;
  }

  async updateContent(id: string, newContent: string): Promise<Message | null> {
    const query = `
      UPDATE rw_messages 
      SET rw_content = $1, rw_is_edited = TRUE 
      WHERE rw_id = $2
      RETURNING *
    `;
    const { rows } = await this.db.query(query, [newContent, id]);
    return rows[0] || null;
  }

  async markDeleted(id: string): Promise<Message | null> {
    const query = `
      UPDATE rw_messages 
      SET rw_is_deleted = TRUE 
      WHERE rw_id = $1
      RETURNING *
    `;
    const { rows } = await this.db.query(query, [id]);
    return rows[0] || null;
  }
}
