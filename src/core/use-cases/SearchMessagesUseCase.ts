import { withUserContext } from '../../infrastructure/database/postgres';
import { Message } from '../domain/Message';

export class SearchMessagesUseCase {
  async execute(
    userId: string,
    searchQuery: string
  ): Promise<Message[]> {
    return await withUserContext(userId, async (client) => {
      const query = `
        SELECT s.*, u.rw_full_name as author_name
        FROM rw_fn_search_messages($1) s
        LEFT JOIN rw_users u ON s.rw_user_id = u.rw_id
      `;
      const { rows } = await client.query(query, [searchQuery]);

      return rows.map((m: any) => ({
        rw_id: m.rw_id,
        rw_channel_id: m.rw_channel_id,
        rw_user_id: m.rw_user_id,
        rw_content: m.rw_content, // Highlighted with <mark> tags by the DB function
        rw_is_edited: false,
        rw_is_deleted: false,
        rw_created_at: new Date(m.rw_created_at).toISOString(),
        userFullName: m.author_name || m.rw_user_id
      }));
    });
  }
}
