# AuthManagerPro

Sistema completo de registro con verificación de email y aprobación manual por administrador.

## Características

- 🔐 Registro de usuarios con verificación de email
- ✅ Sistema de aprobación manual por administradores
- 📧 Notificaciones automáticas por email (Resend)
- 🎨 UI moderna con Next.js 14, Tailwind CSS y shadcn/ui
- 🔒 Autenticación segura con Supabase Auth
- 📊 Dashboard administrativo con estadísticas
- 🔍 Filtros y búsqueda de usuarios
- 📝 Registro de auditoría de acciones

## Stack Tecnológico

- **Frontend**: Next.js 14 (App Router) + React 18
- **Estilos**: Tailwind CSS + shadcn/ui
- **Autenticación**: Supabase Auth
- **Base de datos**: Supabase (PostgreSQL)
- **Emails**: Resend
- **Hosting**: Vercel

## Requisitos Previos

- Node.js 18+ y npm
- Cuenta en [Supabase](https://supabase.com)
- Cuenta en [Resend](https://resend.com)
- Cuenta en [Vercel](https://vercel.com) (para deploy)

## Setup Local

### 1. Clonar repositorio

```bash
git clone <tu-repo>
cd authmanagerpro
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar Supabase

1. Creá un nuevo proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. Ejecutá el siguiente SQL en el SQL Editor:

```sql
-- Crear tabla de perfiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending_verification',
  is_admin BOOLEAN DEFAULT FALSE,
  rejection_reason TEXT,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear tabla de configuración admin
CREATE TABLE admin_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Crear tabla de auditoría
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  actor_id UUID REFERENCES auth.users(id),
  target_id UUID REFERENCES auth.users(id),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para mejor performance
CREATE INDEX idx_profiles_status ON profiles(status);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX idx_audit_log_actor ON audit_log(actor_id);

-- RLS Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Los usuarios pueden ver su propio perfil
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Los admins pueden ver todos los perfiles
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- Los admins pueden actualizar perfiles
CREATE POLICY "Admins can update profiles"
  ON profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- Los admins pueden ver configuración
CREATE POLICY "Admins can view config"
  ON admin_config FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- Los admins pueden actualizar configuración
CREATE POLICY "Admins can update config"
  ON admin_config FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- Los admins pueden ver audit log
CREATE POLICY "Admins can view audit log"
  ON audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- Function para crear perfil automáticamente
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para auto-crear perfil
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Insertar configuración inicial
INSERT INTO admin_config (key, value) VALUES
  ('admin_email', '"admin@yourdomain.com"'::jsonb),
  ('email_templates', '{
    "verification": {
      "subject": "Verificá tu email",
      "body": "Hacé click en el link para verificar tu cuenta."
    },
    "pending_approval": {
      "subject": "Tu cuenta está en revisión",
      "body": "Tu cuenta será revisada por un administrador."
    },
    "approved": {
      "subject": "¡Tu cuenta fue aprobada!",
      "body": "Ya podés acceder a la plataforma."
    },
    "rejected": {
      "subject": "Tu cuenta no fue aprobada",
      "body": "Lamentablemente no pudimos aprobar tu cuenta."
    }
  }'::jsonb)
ON CONFLICT (key) DO NOTHING;
```

3. Configurá el webhook en Supabase:
   - Andá a Authentication > URL Configuration
   - En "Site URL" poné: `http://localhost:3000` (o tu URL de producción)
   - En "Redirect URLs" agregá: `http://localhost:3000/auth/callback`

### 4. Configurar Resend

1. Creá una cuenta en [Resend](https://resend.com)
2. Verificá tu dominio o usá el dominio de testing de Resend
3. Generá una API key desde el dashboard
4. Copiá la API key para el archivo .env

### 5. Configurar variables de entorno

Copiá `.env.example` a `.env.local` y completá todos los valores:

```bash
cp .env.example .env.local
```

Editá `.env.local` con tus credenciales reales:

- **NEXT_PUBLIC_SUPABASE_URL**: Desde Supabase Dashboard > Settings > API > Project URL
- **NEXT_PUBLIC_SUPABASE_ANON_KEY**: Desde Supabase Dashboard > Settings > API > Project API keys > anon public
- **SUPABASE_SERVICE_ROLE_KEY**: Desde Supabase Dashboard > Settings > API > Project API keys > service_role (⚠️ NUNCA expongas esta key al cliente)
- **RESEND_API_KEY**: Tu API key de Resend
- **RESEND_FROM_EMAIL**: Email verificado en Resend
- **ADMIN_EMAIL**: Email del administrador
- **NEXT_PUBLIC_APP_URL**: `http://localhost:3000` en desarrollo
- **SUPABASE_WEBHOOK_SECRET**: Generá uno random con `openssl rand -hex 32`

### 6. Crear primer usuario administrador

Después de crear tu primer usuario a través del registro normal, ejecutá este SQL en Supabase para hacerlo admin:

```sql
UPDATE profiles 
SET is_admin = TRUE, status = 'approved'
WHERE email = 'tu-email@example.com';
```

### 7. Ejecutar en desarrollo

```bash
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000) en tu navegador.

## Deploy en Vercel

### 1. Push a GitHub

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### 2. Importar en Vercel

1. Andá a [Vercel Dashboard](https://vercel.com/dashboard)
2. Click en "Add New Project"
3. Importá tu repositorio de GitHub
4. Configurá las variables de entorno:
   - Copiá todas las variables de `.env.local`
   - Cambiá `NEXT_PUBLIC_APP_URL` a tu URL de Vercel (ej: `https://tu-proyecto.vercel.app`)
5. Click en "Deploy"

### 3. Actualizar configuración de Supabase

Después del deploy, actualizá en Supabase Dashboard:

1. Authentication > URL Configuration:
   - Site URL: `https://tu-proyecto.vercel.app`
   - Redirect URLs: `https://tu-proyecto.vercel.app/auth/callback`

2. Configurá el webhook para email verification:
   - Andá a Database > Webhooks
   - Creá un nuevo webhook:
     - Tabla: `auth.users`
     - Eventos: `UPDATE`
     - URL: `https://tu-proyecto.vercel.app/api/webhooks/auth`
     - Headers: `Authorization: Bearer YOUR_SUPABASE_WEBHOOK_SECRET`

## Flujo de Usuario

### Usuario Regular

1. **Registro**: Usuario completa formulario con email, nombre y contraseña
2. **Verificación**: Recibe email de verificación de Supabase
3. **Pendiente**: Después de verificar, queda en estado "pending_approval"
4. **Notificación Admin**: Administrador recibe email automático
5. **Aprobación**: Admin aprueba o rechaza desde el dashboard
6. **Acceso**: Usuario aprobado puede hacer login y acceder a la app

### Usuario Administrador

1. Login con cuenta admin
2. Ver dashboard con estadísticas
3. Revisar usuarios pendientes
4. Aprobar o rechazar con motivo opcional
5. Configurar emails y notificaciones
6. Ver log de auditoría

## Scripts Disponibles

- `npm run dev` - Inicia servidor de desarrollo
- `npm run build` - Crea build de producción
- `npm run start` - Inicia servidor de producción
- `npm run lint` - Ejecuta ESLint

## Estructura del Proyecto

```
authmanagerpro/
├── app/
│   ├── (auth)/          # Rutas de autenticación
│   ├── (dashboard)/     # Rutas protegidas
│   ├── admin/           # Panel administrativo
│   ├── api/             # API Routes
│   ├── globals.css      # Estilos globales
│   └── layout.tsx       # Layout raíz
├── components/
│   ├── ui/              # Componentes shadcn/ui
│   └── ...              # Componentes de la app
├── lib/
│   ├── supabase.ts      # Cliente Supabase
│   └── utils.ts         # Utilidades
├── types/
│   └── index.ts         # Tipos TypeScript
└── public/
    └── placeholder.svg  # Assets
```

## Soporte

Para problemas o preguntas, abrí un issue en GitHub.

## Licencia

MIT
