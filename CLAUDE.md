# AuthManagerPro — Documentación de sesión para Claude

> Archivo generado automáticamente para continuar el desarrollo en próximas sesiones.  
> Última actualización: 2026-05-19

---

## 🌐 URLs del proyecto

| Entorno | URL |
|---|---|
| **Producción (Vercel)** | https://authmanagerpro.vercel.app |
| **Login** | https://authmanagerpro.vercel.app/login |
| **Registro** | https://authmanagerpro.vercel.app/register |
| **Dashboard usuario** | https://authmanagerpro.vercel.app/dashboard |
| **Panel admin** | https://authmanagerpro.vercel.app/admin |
| **Monitor en tiempo real** | https://authmanagerpro.vercel.app/admin/monitor |
| **Repo GitHub** | https://github.com/onelx/authmanagerpro |
| **Local dev** | http://localhost:3000 (correr `npm run dev`) |

> ⚠️ No hay `.env.local` configurado localmente. El proyecto corre **solo en producción (Vercel)**.  
> Para correr en local necesitás crear `.env.local` con las variables de `.env.example`.

---

## 📋 Descripción del proyecto

**AuthManagerPro** es un sistema completo de gestión de accesos con flujo de aprobación manual. Permite:

1. **Registro de usuarios** con verificación de email
2. **Aprobación manual** por administrador antes de dar acceso
3. **Estados de usuario** con lógica de transición completa
4. **Panel de administración** para gestionar todos los usuarios
5. **Monitor en tiempo real** con logs de auditoría y estadísticas

### Flujo de usuario nuevo:
```
Registro → pending_verification → (verifica email) → pending_approval → (admin aprueba) → approved
```

### Estados posibles de un usuario:
```
pending_verification  → email no verificado aún
pending_approval      → email verificado, esperando que admin apruebe
approved              → puede acceder al dashboard
rejected              → acceso denegado (con razón de rechazo)
suspended             → fue aprobado pero luego suspendido
```

### Lógica de botones en el panel admin:
- `pending_approval` / `pending_verification` / `rejected` / `suspended` → botón **Aprobar** (verde)
- `approved` → botón **Suspender** (naranja)
- `pending_approval` / `pending_verification` / `suspended` → botón **Rechazar** (rojo, abre modal con razón)

---

## 🛠 Stack tecnológico

| Capa | Tecnología | Versión |
|---|---|---|
| Framework | Next.js (App Router) | 14.1.0 |
| Lenguaje | TypeScript | ^5.3.3 |
| UI | React | ^18.2.0 |
| Estilos | Tailwind CSS | ^3.4.1 |
| Componentes | Radix UI | varios ^1-2.x |
| Auth | Supabase Auth | ^2.39.3 |
| DB | Supabase Postgres | — |
| Emails | Resend | ^3.2.0 |
| Deploy | Vercel | — |
| Formularios | react-hook-form | ^7.49.3 |
| Validación | Zod | ^3.22.4 |

---

## 🏗 Arquitectura de autenticación (CRÍTICO)

### Patrón: API-first con localStorage

El proyecto usa un patrón **no estándar** pero necesario por incompatibilidad de Brave browser con las conexiones client-side de Supabase.

**Flujo de login:**
```
1. Usuario llena LoginForm
2. Fetch POST /api/auth/login (server-side)
3. Server hace signInWithPassword() en Supabase
4. Server devuelve { session: { access_token, refresh_token }, user }
5. Cliente guarda tokens en localStorage (NO en cookies, NO via setSession)
6. Cliente redirige a /admin o /dashboard
```

**Flujo de validación de sesión (useAuth):**
```
1. Lee localStorage → "auth_user" para carga optimista inmediata
2. Lee localStorage → "auth_access_token"
3. Fetch GET /api/auth/me con header Authorization: Bearer <token>
4. Server valida token con supabase.auth.getUser()
5. Server retorna perfil actualizado
6. Hook actualiza estado
```

**¿Por qué NO se usa Supabase client-side directamente?**
- Brave browser bloquea conexiones a `*.supabase.co` desde el cliente
- `setSession()` y `signInWithPassword()` se colgaban indefinidamente
- Solución: todas las llamadas a Supabase van por API routes (server-side)

### Llaves localStorage utilizadas:
```
auth_access_token   → JWT de Supabase (expira en 1h)
auth_refresh_token  → Refresh token de Supabase
auth_user           → Objeto usuario cacheado { id, email, fullName, status, isAdmin }
```

---

## 📁 Estructura de archivos

```
authpro/
├── app/
│   ├── page.tsx                          → Redirect a /login
│   ├── login/page.tsx                    → Página de login
│   ├── register/page.tsx                 → Página de registro
│   ├── dashboard/page.tsx                → Dashboard usuario aprobado
│   ├── admin/
│   │   ├── page.tsx                      → Panel de administración
│   │   └── monitor/page.tsx             → Monitor en tiempo real
│   └── api/
│       ├── auth/
│       │   ├── login/route.ts            → POST: signIn + audit_log
│       │   ├── register/route.ts         → POST: signUp + audit_log
│       │   ├── me/route.ts               → GET: validar token Bearer
│       │   ├── logout/route.ts           → POST: cerrar sesión
│       │   └── status/route.ts           → GET: estado del usuario
│       └── admin/
│           ├── users/route.ts            → GET: todos los usuarios
│           ├── users/[id]/approve/route.ts → POST: aprobar usuario
│           ├── users/[id]/reject/route.ts  → POST: rechazar usuario
│           ├── users/[id]/suspend/route.ts → POST: suspender usuario
│           └── stats/route.ts            → GET: stats + audit_log para monitor
├── components/
│   ├── LoginForm.tsx                     → Form con debug panel integrado
│   ├── RegisterForm.tsx                  → Form de registro
│   ├── UserTable.tsx                     → Tabla con filtros + botones por estado
│   ├── PendingApprovalCard.tsx           → Card para usuarios pendientes
│   └── ui/                              → Button, Input, Card (Radix-based)
├── hooks/
│   ├── useAuth.ts                        → Hook central de autenticación
│   └── useUserStatus.ts                  → Hook de estado del usuario
├── lib/
│   ├── supabase.ts                       → Cliente browser (anon key, singleton)
│   ├── supabase-server.ts                → Cliente server (service role)
│   ├── audit-log.ts                      → Helper para escribir audit_log
│   └── email.ts                          → Envío de emails con Resend
├── types/
│   └── index.ts                          → Todos los tipos TypeScript
└── supabase/
    └── migrations/
        └── 001_schema.sql                → Schema completo de la DB
```

---

## 🗄 Base de datos (Supabase)

### Tablas:

**`profiles`** — perfil de cada usuario
```sql
id UUID (FK → auth.users)
email TEXT
full_name TEXT
status TEXT  -- 'pending_verification' | 'pending_approval' | 'approved' | 'rejected' | 'suspended'
is_admin BOOLEAN
rejection_reason TEXT
approved_at TIMESTAMPTZ
approved_by UUID (FK → auth.users)
created_at / updated_at TIMESTAMPTZ
```
> ⚠️ El constraint de la DB dice solo 4 estados (sin 'suspended'). Se agregó manualmente en Supabase.  
> Correr en SQL Editor: `ALTER TABLE profiles DROP CONSTRAINT IF EXISTS status_check; ALTER TABLE profiles ADD CONSTRAINT status_check CHECK (status IN ('pending_verification', 'pending_approval', 'approved', 'rejected', 'suspended'));`

**`audit_log`** — registro de todas las acciones
```sql
id UUID
action TEXT  -- 'login_success' | 'login_failed' | 'user_registered' | 'user_approved' | 'user_rejected' | 'user_suspended'
actor_id UUID  -- quien hizo la acción (null para login_failed anónimo)
target_id UUID  -- sobre quien se hizo la acción
metadata JSONB  -- { email, reason, etc }
created_at TIMESTAMPTZ
```
> ⚠️ RLS puede bloquear inserts desde service role. Si audit_log no guarda datos, correr:  
> `ALTER TABLE audit_log DISABLE ROW LEVEL SECURITY;`

**`admin_config`** — configuración del sistema
```sql
id UUID
key TEXT (UNIQUE)
value JSONB
updated_at TIMESTAMPTZ
updated_by UUID
```

### RLS (Row Level Security):
- Todas las tablas tienen RLS activado
- Las API routes de admin usan **service role key** (bypasea RLS completamente)
- El service role key SOLO se usa server-side (nunca expuesto al cliente)

---

## 🔑 Variables de entorno (en Vercel)

```
NEXT_PUBLIC_SUPABASE_URL         → URL del proyecto Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY    → Anon key (pública, usada client-side)
SUPABASE_SERVICE_ROLE_KEY        → Service role key (privada, solo server)
RESEND_API_KEY                   → API key de Resend para emails
RESEND_FROM_EMAIL                → Email remitente verificado en Resend
ADMIN_EMAIL                      → Email del admin para notificaciones
NEXT_PUBLIC_APP_URL              → https://authmanagerpro.vercel.app
SUPABASE_WEBHOOK_SECRET          → Secret para webhooks de Supabase
```

---

## 📊 Página de Monitor (/admin/monitor)

Página de observabilidad en tiempo real con diseño tipo terminal (fondo oscuro).

**Características:**
- Stats cards: Total, 24h nuevos, Pendientes, Verificando, Aprobados, Rechazados, Suspendidos, Admins
- Activity Log: últimos 50 eventos del audit_log con emails enriquecidos
- Filtro por tipo de evento
- Auto-refresh cada 15 segundos (toggle ON/OFF)
- Íconos y colores por acción

**Acciones registradas en audit_log:**
| Acción | Cuándo |
|---|---|
| `login_success` | Login exitoso |
| `login_failed` | Credenciales incorrectas |
| `user_registered` | Nuevo registro |
| `user_approved` | Admin aprobó usuario |
| `user_rejected` | Admin rechazó usuario |
| `user_suspended` | Admin suspendió usuario |

---

## ⚠️ Problemas conocidos / Deuda técnica

1. **Sin middleware.ts** — Los guards de auth son client-side. Un usuario puede pedir el HTML de `/admin` sin estar autenticado (aunque no puede hacer nada sin token válido).

2. **Token en localStorage** — No persiste entre navegadores. No es accessible desde Server Components. Decisión intencional por el problema de Brave.

3. **`getToken()` duplicado** — La función `localStorage.getItem('auth_access_token')` está escrita inline en varios archivos. Debería estar en un helper compartido en `lib/auth-client.ts`.

4. **Debug panel en LoginForm** — El panel de debug (pasos del login) está visible en producción. Podría ocultarse con una variable de entorno `NEXT_PUBLIC_DEBUG_AUTH=true`.

5. **`@supabase/ssr` instalado pero no usado** — Se puede remover del package.json.

6. **Constraint de DB** — El migration SQL original no incluye `'suspended'` en el CHECK constraint. Se agregó manualmente en el dashboard de Supabase pero no está en el migration.

7. **Emails no implementados completamente** — Resend está instalado y hay rutas para emails, pero la integración real (enviar email al aprobar/rechazar) puede no estar activa.

---

## 🚀 Cómo continuar el desarrollo

### Para correr en local:
```bash
cd "/Users/osvaldo/Downloads/Creador /authpro"
# Crear .env.local con las variables de Vercel
npm install
npm run dev
# Abrir http://localhost:3000
```

### Para deployar:
```bash
git add -A
git commit -m "descripción del cambio"
git push origin main
# Vercel deploya automáticamente en ~2 minutos
```

### Repo:
```
Local:  /Users/osvaldo/Downloads/Creador /authpro
Remote: https://github.com/onelx/authmanagerpro
Branch: main
```

---

## 💡 Ideas pendientes / Próximas features

- [ ] Envío real de emails al aprobar/rechazar usuarios (Resend ya está configurado)
- [ ] Ocultar debug panel en producción (`NEXT_PUBLIC_DEBUG_AUTH`)
- [ ] `middleware.ts` para proteger rutas a nivel de servidor
- [ ] Refrescar token automáticamente cuando expira (ahora expira en 1h y hay que re-loguear)
- [ ] Paginación en la lista de usuarios del panel admin
- [ ] Exportar audit_log a CSV
- [ ] Notificaciones push al admin cuando hay nuevos registros
- [ ] Módulo de configuración: cambiar nombre de la app, logos, textos de emails
