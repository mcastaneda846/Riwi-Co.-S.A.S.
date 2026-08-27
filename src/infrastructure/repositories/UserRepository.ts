import { Pool, PoolClient } from 'pg';
import { pool } from '../database/postgres';
import { User } from '../../core/domain/User';

export class UserRepository {
  constructor(private db: Pool | PoolClient = pool) {}

  async create(user: User): Promise<User> {
    const query = `
      INSERT INTO rw_users (rw_id, rw_email, rw_password_hash, rw_full_name, rw_role, rw_is_active, rw_created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const values = [
      user.rw_id,
      user.rw_email,
      user.rw_password_hash,
      user.rw_full_name,
      user.rw_role || 'user',
      user.rw_is_active !== false,
      user.rw_created_at || new Date()
    ];
    const { rows } = await this.db.query(query, values);
    return rows[0];
  }

  async findById(id: string): Promise<User | null> {
    const query = `SELECT * FROM rw_users WHERE rw_id = $1`;
    const { rows } = await this.db.query(query, [id]);
    return rows[0] || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const query = `SELECT * FROM rw_users WHERE rw_email = $1`;
    const { rows } = await this.db.query(query, [email]);
    return rows[0] || null;
  }

  async update(id: string, user: Partial<User>): Promise<User | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let index = 1;

    if (user.rw_email !== undefined) {
      fields.push(`rw_email = $${index++}`);
      values.push(user.rw_email);
    }
    if (user.rw_password_hash !== undefined) {
      fields.push(`rw_password_hash = $${index++}`);
      values.push(user.rw_password_hash);
    }
    if (user.rw_full_name !== undefined) {
      fields.push(`rw_full_name = $${index++}`);
      values.push(user.rw_full_name);
    }
    if (user.rw_role !== undefined) {
      fields.push(`rw_role = $${index++}`);
      values.push(user.rw_role);
    }
    if (user.rw_is_active !== undefined) {
      fields.push(`rw_is_active = $${index++}`);
      values.push(user.rw_is_active);
    }

    if (fields.length === 0) return null;

    values.push(id);
    const query = `
      UPDATE rw_users 
      SET ${fields.join(', ')} 
      WHERE rw_id = $${index} 
      RETURNING *
    `;
    const { rows } = await this.db.query(query, values);
    return rows[0] || null;
  }
}
