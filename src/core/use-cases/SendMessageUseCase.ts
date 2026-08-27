import { withUserContext } from '../../infrastructure/database/postgres';
import { Message } from '../domain/Message';

export class SendMessageUseCase {
  async execute(
    userId: string,
    channelId: string,
    content: string
  ): Promise<Message> {
    return await withUserContext(userId, async (client) => {
      const messageId = `msg_${Date.now()}`;
      const query = `
        INSERT INTO rw_messages (rw_id, rw_channel_id, rw_user_id, rw_content)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;
      const values = [messageId, channelId, userId, content];
      const { rows } = await client.query(query, values);
      const inserted = rows[0];

      // Get author full name to return in message details
      const userRes = await client.query('SELECT rw_full_name FROM rw_users WHERE rw_id = $1', [userId]);
      const userFullName = userRes.rows[0]?.rw_full_name || userId;

      return {
        rw_id: inserted.rw_id,
        rw_channel_id: inserted.rw_channel_id,
        rw_user_id: inserted.rw_user_id,
        rw_content: inserted.rw_content,
        rw_is_edited: inserted.rw_is_edited,
        rw_is_deleted: inserted.rw_is_deleted,
        rw_created_at: new Date(inserted.rw_created_at).toISOString(),
        userFullName
      };
    });
  }
}
