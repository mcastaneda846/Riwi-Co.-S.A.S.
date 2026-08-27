-- Datos Semilla (Seed Data)

-- Deshabilitar triggers temporalmente para evitar logs/recálculos innecesarios durante el seed
ALTER TABLE rw_messages DISABLE TRIGGER rw_trg_message_sync;

-- Insertar usuarios semilla
INSERT INTO rw_users (rw_id, rw_email, rw_password_hash, rw_full_name, rw_role, rw_is_active, rw_created_at)
VALUES 
  ('user_01', 'admin@riwi.com', '$2y$10$8k0bVv7/F6aFhQx2VvT4OeaP7w5zGep.H9vU6HkR1J4G.V3mYnC9u', 'Administrador Riwi', 'admin', TRUE, '2026-08-27 08:00:00+00'),
  ('user_02', 'developer@riwi.com', '$2y$10$8k0bVv7/F6aFhQx2VvT4OeaP7w5zGep.H9vU6HkR1J4G.V3mYnC9u', 'Developer Riwi', 'user', TRUE, '2026-08-27 08:05:00+00')
ON CONFLICT (rw_id) DO NOTHING;

-- Insertar canales semilla
INSERT INTO rw_channels (rw_id, rw_name, rw_is_private, rw_created_by, rw_created_at)
VALUES 
  ('channel_01', 'general', FALSE, 'user_01', '2026-08-27 08:10:00+00'),
  ('channel_02', 'desarrollo-interno', TRUE, 'user_01', '2026-08-27 08:15:00+00')
ON CONFLICT (rw_id) DO NOTHING;

-- Insertar miembros de canales semilla
INSERT INTO rw_channel_members (rw_channel_id, rw_user_id, rw_joined_at)
VALUES 
  ('channel_01', 'user_01', '2026-08-27 08:10:00+00'),
  ('channel_01', 'user_02', '2026-08-27 08:12:00+00'),
  ('channel_02', 'user_01', '2026-08-27 08:15:00+00')
ON CONFLICT (rw_channel_id, rw_user_id) DO NOTHING;

-- Insertar mensajes semilla
INSERT INTO rw_messages (rw_id, rw_channel_id, rw_user_id, rw_content, rw_is_edited, rw_is_deleted, rw_created_at)
VALUES 
  ('msg_01', 'channel_01', 'user_01', 'Hola a todos, bienvenidos al canal general de Riwi Co. S.A.S.', FALSE, FALSE, '2026-08-27 08:20:00+00'),
  ('msg_02', 'channel_01', 'user_02', '¡Hola! Gracias, listo para comenzar a desarrollar.', FALSE, FALSE, '2026-08-27 08:21:00+00')
ON CONFLICT (rw_id) DO NOTHING;

-- Reactivar triggers
ALTER TABLE rw_messages ENABLE TRIGGER rw_trg_message_sync;
