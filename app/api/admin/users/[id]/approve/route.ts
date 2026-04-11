import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'
import { logAudit } from '@/lib/audit-log'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id
    const supabase = getSupabaseClient()

    // Verificar autenticación y que sea admin
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    // Verificar que sea admin
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!adminProfile?.is_admin) {
      return NextResponse.json(
        { error: 'Acceso denegado' },
        { status: 403 }
      )
    }

    // Obtener datos del usuario a aprobar
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    // Actualizar status a approved
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (updateError) {
      return NextResponse.json(
        { error: 'Error al aprobar usuario' },
        { status: 500 }
      )
    }

    // Log de auditoría
    await logAudit({
      action: 'user_approved',
      actorId: user.id,
      targetId: userId,
      metadata: { 
        userEmail: userProfile.email,
        userName: userProfile.full_name
      }
    })

    // Enviar email de bienvenida
    await sendEmail({
      to: userProfile.email,
      subject: '¡Tu cuenta ha sido aprobada!',
      html: `
        <h2>Bienvenido a AuthManagerPro</h2>
        <p>Hola ${userProfile.full_name},</p>
        <p>Tu cuenta ha sido aprobada por un administrador.</p>
        <p>Ya puedes iniciar sesión y acceder a todas las funcionalidades de la plataforma.</p>
        <p>Gracias por unirte a nosotros.</p>
      `
    })

    return NextResponse.json({
      success: true,
      message: 'Usuario aprobado exitosamente',
    })
  } catch (error) {
    console.error('Error aprobando usuario:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
