-- Habilitar UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabla de perfiles de usuario
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending_verification',
  is_admin BOOLEAN DEFAULT FALSE,
  rejection_reason TEXT,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT status_check CHECK (status IN ('pending_verification', 'pending_approval', 'approved', 'rejected'))
);

-- Tabla de configuración del admin
CREATE TABLE IF NOT EXISTS admin_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Tabla de log de auditoría
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action TEXT NOT NULL,
  actor_id UUID REFERENCES auth.users(id),
  target_id UUID REFERENCES auth.users(id),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para mejorar performance
CREATE INDEX idx_profiles_status ON profiles(status);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_created_at ON profiles(created_at DESC);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_actor ON audit_log(actor_id);
CREATE INDEX idx_audit_log_target ON audit_log(target_id);
CREATE INDEX idx_admin_config_key ON admin_config(key);

-- Habilitar RLS en todas las tablas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para profiles
-- Los usuarios anónimos NO pueden leer perfiles
CREATE POLICY "usuarios_autenticados_leen_su_perfil"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Los admins pueden leer todos los perfiles
CREATE POLICY "admins_leen_todos_perfiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Los usuarios pueden actualizar su propio perfil (excepto campos sensibles)
CREATE POLICY "usuarios_actualizan_su_perfil"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id 
    AND status = (SELECT status FROM profiles WHERE id = auth.uid())
    AND is_admin = (SELECT is_admin FROM profiles WHERE id = auth.uid())
  );

-- Los admins pueden actualizar cualquier perfil
CREATE POLICY "admins_actualizan_perfiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Permitir inserción de perfiles para usuarios autenticados (registro)
CREATE POLICY "usuarios_crean_su_perfil"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Políticas RLS para admin_config
-- Solo admins pueden leer configuración
CREATE POLICY "admins_leen_config"
  ON admin_config FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Solo admins pueden actualizar configuración
CREATE POLICY "admins_actualizan_config"
  ON admin_config FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Solo admins pueden insertar configuración
CREATE POLICY "admins_insertan_config"
  ON admin_config FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Políticas RLS para audit_log
-- Solo admins pueden leer logs
CREATE POLICY "admins_leen_logs"
  ON audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Todos los usuarios autenticados pueden insertar logs (para auditoría)
CREATE POLICY "usuarios_insertan_logs"
  ON audit_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at en profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para actualizar updated_at en admin_config
CREATE TRIGGER update_admin_config_updated_at
  BEFORE UPDATE ON admin_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insertar configuración inicial del admin
INSERT INTO admin_config (key, value) 
VALUES 
  ('admin_email', '{"email": "admin@example.com"}'::jsonb),
  ('welcome_email_template', '{"subject": "¡Bienvenido!", "body": "Tu cuenta ha sido aprobada."}'::jsonb),
  ('rejection_email_template', '{"subject": "Actualización de cuenta", "body": "Tu solicitud no fue aprobada."}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Crear un usuario admin por defecto (cambiar email y password en producción)
-- Nota: Este usuario debe crearse manualmente en Supabase Auth primero
-- o mediante un script de inicialización
