import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    // Obtener perfil completo
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) {
      return NextResponse.json(
        { error: 'Error al obtener perfil' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: profile.full_name,
        status: profile.status,
        isAdmin: profile.is_admin,
        rejectionReason: profile.rejection_reason,
        approvedAt: profile.approved_at,
        createdAt: profile.created_at,
      },
    })
  } catch (error) {
    console.error('Error en /api/auth/me:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
