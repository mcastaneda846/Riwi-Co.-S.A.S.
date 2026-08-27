-- Habilitar extensión de vectores si no existe
CREATE EXTENSION IF NOT EXISTS vector;

-- Crear el rol rw_admin como NO superusuario para que apliquen las políticas de RLS
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'rw_admin') THEN
    CREATE ROLE rw_admin WITH LOGIN PASSWORD 'rw_secure_password_2026';
  END IF;
END
$$;

-- Otorgar permisos sobre la base de datos y el esquema público
GRANT CONNECT ON DATABASE bd_riwi_chat_clan TO rw_admin;
GRANT ALL PRIVILEGES ON SCHEMA public TO rw_admin;

-- Tabla de Usuarios
CREATE TABLE IF NOT EXISTS rw_users (
  rw_id VARCHAR(255) PRIMARY KEY,
  rw_email VARCHAR(255) UNIQUE NOT NULL,
  rw_password_hash VARCHAR(255) NOT NULL,
  rw_full_name VARCHAR(255) NOT NULL,
  rw_role VARCHAR(50) NOT NULL DEFAULT 'user',
  rw_is_active BOOLEAN NOT NULL DEFAULT TRUE,
  rw_created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Canales
CREATE TABLE IF NOT EXISTS rw_channels (
  rw_id VARCHAR(255) PRIMARY KEY,
  rw_name VARCHAR(255) NOT NULL,
  rw_is_private BOOLEAN NOT NULL DEFAULT FALSE,
  rw_created_by VARCHAR(255) REFERENCES rw_users(rw_id) ON DELETE SET NULL,
  rw_created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Miembros del Canal
CREATE TABLE IF NOT EXISTS rw_channel_members (
  rw_channel_id VARCHAR(255) REFERENCES rw_channels(rw_id) ON DELETE CASCADE,
  rw_user_id VARCHAR(255) REFERENCES rw_users(rw_id) ON DELETE CASCADE,
  rw_joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (rw_channel_id, rw_user_id)
);

-- Tabla de Mensajes
CREATE TABLE IF NOT EXISTS rw_messages (
  rw_id VARCHAR(255) PRIMARY KEY,
  rw_channel_id VARCHAR(255) REFERENCES rw_channels(rw_id) ON DELETE CASCADE,
  rw_user_id VARCHAR(255) REFERENCES rw_users(rw_id) ON DELETE CASCADE,
  rw_content TEXT NOT NULL,
  rw_is_edited BOOLEAN NOT NULL DEFAULT FALSE,
  rw_is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  rw_created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  rw_embedding vector(1536)
);

-- Función SECURITY DEFINER para verificar membresía de canal sin recursión infinita en las políticas RLS
CREATE OR REPLACE FUNCTION public.is_member_of_channel(channel_id VARCHAR, user_id VARCHAR)
RETURNS BOOLEAN SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.rw_channel_members 
    WHERE rw_channel_id = $1 AND rw_user_id = $2
  );
END;
$$ LANGUAGE plpgsql;

-- Otorgar permisos sobre tablas, secuencias y funciones a rw_admin
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO rw_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO rw_admin;
GRANT EXECUTE ON FUNCTION public.is_member_of_channel(VARCHAR, VARCHAR) TO rw_admin;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO rw_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO rw_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO rw_admin;

-- Habilitar Row Level Security (RLS) en todas las tablas y forzarlo
ALTER TABLE rw_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE rw_users FORCE ROW LEVEL SECURITY;

ALTER TABLE rw_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE rw_channels FORCE ROW LEVEL SECURITY;

ALTER TABLE rw_channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE rw_channel_members FORCE ROW LEVEL SECURITY;

ALTER TABLE rw_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE rw_messages FORCE ROW LEVEL SECURITY;

-- =========================================================================
-- Políticas RLS para rw_users
-- =========================================================================

CREATE POLICY rw_users_select_policy ON rw_users
  FOR SELECT
  USING (
    current_setting('app.bypass_rls', true) = 'true'
    OR (
      current_setting('app.current_user_id', true) IS NOT NULL 
      AND current_setting('app.current_user_id', true) <> ''
    )
  );

CREATE POLICY rw_users_modify_policy ON rw_users
  FOR ALL
  USING (
    current_setting('app.bypass_rls', true) = 'true'
    OR rw_id = current_setting('app.current_user_id', true)
  )
  WITH CHECK (
    current_setting('app.bypass_rls', true) = 'true'
    OR rw_id = current_setting('app.current_user_id', true)
  );

-- =========================================================================
-- Políticas RLS para rw_channels
-- =========================================================================

CREATE POLICY rw_channels_select_policy ON rw_channels
  FOR SELECT
  USING (
    current_setting('app.bypass_rls', true) = 'true'
    OR (
      (
        rw_is_private = FALSE 
        OR public.is_member_of_channel(rw_id, current_setting('app.current_user_id', true))
      )
      AND current_setting('app.current_user_id', true) IS NOT NULL 
      AND current_setting('app.current_user_id', true) <> ''
    )
  );

CREATE POLICY rw_channels_insert_policy ON rw_channels
  FOR INSERT
  WITH CHECK (
    current_setting('app.bypass_rls', true) = 'true'
    OR (
      rw_created_by = current_setting('app.current_user_id', true)
      AND current_setting('app.current_user_id', true) IS NOT NULL 
      AND current_setting('app.current_user_id', true) <> ''
    )
  );

CREATE POLICY rw_channels_modify_policy ON rw_channels
  FOR UPDATE
  USING (
    current_setting('app.bypass_rls', true) = 'true'
    OR rw_created_by = current_setting('app.current_user_id', true)
  )
  WITH CHECK (
    current_setting('app.bypass_rls', true) = 'true'
    OR rw_created_by = current_setting('app.current_user_id', true)
  );

CREATE POLICY rw_channels_delete_policy ON rw_channels
  FOR DELETE
  USING (
    current_setting('app.bypass_rls', true) = 'true'
    OR rw_created_by = current_setting('app.current_user_id', true)
  );

-- =========================================================================
-- Políticas RLS para rw_channel_members
-- =========================================================================

CREATE POLICY rw_channel_members_select_policy ON rw_channel_members
  FOR SELECT
  USING (
    current_setting('app.bypass_rls', true) = 'true'
    OR (
      public.is_member_of_channel(rw_channel_id, current_setting('app.current_user_id', true))
      AND current_setting('app.current_user_id', true) IS NOT NULL 
      AND current_setting('app.current_user_id', true) <> ''
    )
  );

CREATE POLICY rw_channel_members_insert_policy ON rw_channel_members
  FOR INSERT
  WITH CHECK (
    current_setting('app.bypass_rls', true) = 'true'
    OR (
      (
        rw_user_id = current_setting('app.current_user_id', true)
        OR public.is_member_of_channel(rw_channel_id, current_setting('app.current_user_id', true))
      )
      AND current_setting('app.current_user_id', true) IS NOT NULL 
      AND current_setting('app.current_user_id', true) <> ''
    )
  );

CREATE POLICY rw_channel_members_delete_policy ON rw_channel_members
  FOR DELETE
  USING (
    current_setting('app.bypass_rls', true) = 'true'
    OR rw_user_id = current_setting('app.current_user_id', true)
    OR public.is_member_of_channel(rw_channel_id, current_setting('app.current_user_id', true))
  );

-- =========================================================================
-- Políticas RLS para rw_messages
-- =========================================================================

CREATE POLICY rw_messages_select_policy ON rw_messages
  FOR SELECT
  USING (
    current_setting('app.bypass_rls', true) = 'true'
    OR (
      public.is_member_of_channel(rw_channel_id, current_setting('app.current_user_id', true))
      AND current_setting('app.current_user_id', true) IS NOT NULL 
      AND current_setting('app.current_user_id', true) <> ''
    )
  );

CREATE POLICY rw_messages_insert_policy ON rw_messages
  FOR INSERT
  WITH CHECK (
    current_setting('app.bypass_rls', true) = 'true'
    OR (
      rw_user_id = current_setting('app.current_user_id', true)
      AND public.is_member_of_channel(rw_channel_id, current_setting('app.current_user_id', true))
      AND current_setting('app.current_user_id', true) IS NOT NULL 
      AND current_setting('app.current_user_id', true) <> ''
    )
  );

CREATE POLICY rw_messages_modify_policy ON rw_messages
  FOR UPDATE
  USING (
    current_setting('app.bypass_rls', true) = 'true'
    OR rw_user_id = current_setting('app.current_user_id', true)
  )
  WITH CHECK (
    current_setting('app.bypass_rls', true) = 'true'
    OR rw_user_id = current_setting('app.current_user_id', true)
  );

CREATE POLICY rw_messages_delete_policy ON rw_messages
  FOR DELETE
  USING (
    current_setting('app.bypass_rls', true) = 'true'
    OR rw_user_id = current_setting('app.current_user_id', true)
  );

-- Vista de conversaciones del usuario
CREATE OR REPLACE VIEW rw_view_user_conversations AS
SELECT 
  rw_id,
  rw_name,
  rw_is_private,
  rw_created_by,
  rw_created_at
FROM rw_channels;

GRANT SELECT ON rw_view_user_conversations TO rw_admin;

-- Función para búsqueda de mensajes con resaltado <mark>
CREATE OR REPLACE FUNCTION rw_fn_search_messages(search_query TEXT)
RETURNS TABLE (
  rw_id VARCHAR,
  rw_channel_id VARCHAR,
  rw_user_id VARCHAR,
  rw_content TEXT,
  rw_created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.rw_id,
    m.rw_channel_id,
    m.rw_user_id,
    regexp_replace(m.rw_content, '(' || regexp_replace(search_query, '([!$()*+.\?\[\\\]^{|}-])', '\\\1', 'g') || ')', '<mark>\1</mark>', 'gi') AS rw_content,
    m.rw_created_at
  FROM rw_messages m
  WHERE m.rw_content ILIKE '%' || search_query || '%'
    AND m.rw_is_deleted = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

GRANT EXECUTE ON FUNCTION rw_fn_search_messages(TEXT) TO rw_admin;

-- Función para búsqueda de similitud vectorial para Copilot
CREATE OR REPLACE FUNCTION rw_fn_copilot_context_search(query_embedding vector(1536), match_threshold DOUBLE PRECISION, match_count INT)
RETURNS TABLE (
  rw_id VARCHAR,
  rw_channel_id VARCHAR,
  rw_user_id VARCHAR,
  rw_content TEXT,
  rw_created_at TIMESTAMP WITH TIME ZONE,
  similarity DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.rw_id,
    m.rw_channel_id,
    m.rw_user_id,
    m.rw_content,
    m.rw_created_at,
    (1 - (m.rw_embedding <=> query_embedding))::DOUBLE PRECISION AS similarity
  FROM rw_messages m
  WHERE m.rw_is_deleted = FALSE
    AND (1 - (m.rw_embedding <=> query_embedding)) > match_threshold
  ORDER BY m.rw_embedding <=> query_embedding ASC
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

GRANT EXECUTE ON FUNCTION rw_fn_copilot_context_search(vector(1536), DOUBLE PRECISION, INT) TO rw_admin;

