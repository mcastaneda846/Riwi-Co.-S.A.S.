export interface User {
  rw_id: string;
  rw_email: string;
  rw_password_hash: string;
  rw_full_name: string;
  rw_role: string;
  rw_is_active: boolean;
  rw_created_at?: string | Date;
}
