import { withUserContext } from '../../infrastructure/database/postgres';
import { Message } from '../domain/Message';

interface MessageDbRow {
  rw_id: string;
  rw_channel_id: string;
  rw_user_id: string;
  rw_content: string;
  rw_is_edited: boolean;
  rw_is_deleted: boolean;
  rw_created_at: string | Date;
  author_name?: string;
}

export class GetChannelMessagesUseCase {
  async execute(
    userId: string,
    channelId: string,
    limit: number = 20,
    cursorDate?: string,
    cursorId?: string
  ): Promise<Message[]> {
    return await withUserContext(userId, async (client) => {
      let query: string;
      let values: unknown[];

      if (cursorDate && cursorId) {
        // Query older messages (keyset pagination)
        query = `
          SELECT m.*, u.rw_full_name as author_name
          FROM rw_messages m
          LEFT JOIN rw_users u ON m.rw_user_id = u.rw_id
          WHERE m.rw_channel_id = $1 
            AND m.rw_is_deleted = FALSE
            AND (m.rw_created_at, m.rw_id) < ($2::TIMESTAMP WITH TIME ZONE, $3)
          ORDER BY m.rw_created_at DESC, m.rw_id DESC
          LIMIT $4
        `;
        values = [channelId, cursorDate, cursorId, limit];
      } else {
        // Initial query (no cursor)
        query = `
          SELECT m.*, u.rw_full_name as author_name
          FROM rw_messages m
          LEFT JOIN rw_users u ON m.rw_user_id = u.rw_id
          WHERE m.rw_channel_id = $1 
            AND m.rw_is_deleted = FALSE
          ORDER BY m.rw_created_at DESC, m.rw_id DESC
          LIMIT $2
        `;
        values = [channelId, limit];
      }

      const { rows } = await client.query(query, values);
      
      // Keyset fetches in descending order to get the most recent batch.
      // We reverse the array to display them chronologically (ascending).
      const items = (rows as MessageDbRow[]).map((m) => ({
        rw_id: m.rw_id,
        rw_channel_id: m.rw_channel_id,
        rw_user_id: m.rw_user_id,
        rw_content: m.rw_content,
        rw_is_edited: m.rw_is_edited,
        rw_is_deleted: m.rw_is_deleted,
        rw_created_at: new Date(m.rw_created_at).toISOString(),
        userFullName: m.author_name || m.rw_user_id
      }));

      return items.reverse();
    });
  }
}
