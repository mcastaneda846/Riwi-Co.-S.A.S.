export interface Channel {
  rw_id: string;
  rw_name: string;
  rw_is_private: boolean;
  rw_created_by: string | null;
  rw_created_at?: string | Date;
}

export interface ChannelMember {
  rw_channel_id: string;
  rw_user_id: string;
  rw_joined_at?: string | Date;
}
