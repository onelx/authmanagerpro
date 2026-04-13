import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

async function auditLog(adminDb: ReturnType<typeof createClient>, action: string, actorId: string | null, targetId: string | null, metadata: object) {
  try {
    await adminDb.from('audit_log').insert({ action, actor_id: actorId, target_id: targetId, metadata })
  } catch { /* no-op */ }
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'Email y password son requeridos' }, { status: 400 })
    }

    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    )

    const adminDb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    )

    const { data: authData, error: authError } = await db.auth.signInWithPassword({ email, password })

    if (authError || !authData.user) {
      await auditLog(adminDb, 'login_failed', null, null, { email, reason: authError?.message ?? 'unknown' })
      return NextResponse.json({ error: authError?.message ?? 'Error al autenticar' }, { status: 401 })
    }

    const { data: profile } = await adminDb
      .from('profiles')
      .select('status, is_admin, full_name, rejection_reason')
      .eq('id', authData.user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
    }

    if (profile.status === 'pending_verification') {
      return NextResponse.json({ error: 'Por favor verifica tu email antes de iniciar sesión' }, { status: 403 })
    }
    if (profile.status === 'pending_approval' && !profile.is_admin) {
      return NextResponse.json({ error: 'Tu cuenta está pendiente de aprobación', status: 'pending_approval' }, { status: 403 })
    }
    if (profile.status === 'rejected') {
      return NextResponse.json({ error: 'Tu cuenta fue rechazada' + (profile.rejection_reason ? ': ' + profile.rejection_reason : ''), status: 'rejected' }, { status: 403 })
    }
    if (profile.status === 'suspended') {
      return NextResponse.json({ error: 'Tu cuenta está suspendida. Contactá al administrador.', status: 'suspended' }, { status: 403 })
    }

    await auditLog(adminDb, 'login_success', authData.user.id, authData.user.id, { email })

    return NextResponse.json({
      message: 'Login exitoso',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        fullName: profile.full_name,
        status: profile.status,
        isAdmin: profile.is_admin,
      },
      session: authData.session,
    })
  } catch (error) {
    console.error('Error en login:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
