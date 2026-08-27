export interface Message {
  rw_id: string;
  rw_channel_id: string;
  rw_user_id: string;
  rw_content: string;
  rw_is_edited: boolean;
  rw_is_deleted: boolean;
  rw_created_at?: string | Date;
  rw_embedding?: number[] | null;

  // Custom properties for client rendering
  userFullName?: string;
  status?: 'pending' | 'sent' | 'failed';
}
