import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y password son requeridos' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseClient()

    // Intentar login
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: 401 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Error al autenticar' },
        { status: 500 }
      )
    }

    // Verificar estado de aprobación
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('status, is_admin, full_name, rejection_reason')
      .eq('id', authData.user.id)
      .single()

    if (profileError) {
      return NextResponse.json(
        { error: 'Error al obtener perfil' },
        { status: 500 }
      )
    }

    // Verificar si el usuario está aprobado o es admin
    if (profile.status === 'pending_verification') {
      await supabase.auth.signOut()
      return NextResponse.json(
        { error: 'Por favor verifica tu email antes de iniciar sesión' },
        { status: 403 }
      )
    }

    if (profile.status === 'pending_approval' && !profile.is_admin) {
      await supabase.auth.signOut()
      return NextResponse.json(
        { 
          error: 'Tu cuenta está pendiente de aprobación por un administrador',
          status: 'pending_approval'
        },
        { status: 403 }
      )
    }

    if (profile.status === 'rejected') {
      await supabase.auth.signOut()
      return NextResponse.json(
        { 
          error: `Tu cuenta fue rechazada${profile.rejection_reason ? ': ' + profile.rejection_reason : ''}`,
          status: 'rejected'
        },
        { status: 403 }
      )
    }

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
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
