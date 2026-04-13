import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

    const { data: authData, error: authError } = await db.auth.signInWithPassword({ email, password })

    const adminDb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    )

    if (authError || !authData.user) {
      // Log failed attempt
      await adminDb.from('audit_log').insert({
        action: 'login_failed',
        actor_id: null,
        target_id: null,
        metadata: { email, reason: authError?.message ?? 'unknown' },
      }).catch(() => {})
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

    // Log successful login
    await adminDb.from('audit_log').insert({
      action: 'login_success',
      actor_id: authData.user.id,
      target_id: authData.user.id,
      metadata: { email },
    }).catch(() => {})

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
