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
    const body = await request.json()
    const { reason } = body

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

    // Obtener datos del usuario a rechazar
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

    // Actualizar status a rejected
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        status: 'rejected',
        rejection_reason: reason || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (updateError) {
      return NextResponse.json(
        { error: 'Error al rechazar usuario' },
        { status: 500 }
      )
    }

    // Log de auditoría
    await logAudit({
      action: 'user_rejected',
      actorId: user.id,
      targetId: userId,
      metadata: { 
        userEmail: userProfile.email,
        userName: userProfile.full_name,
        reason: reason || 'Sin motivo especificado'
      }
    })

    // Enviar email de notificación
    await sendEmail({
      to: userProfile.email,
      subject: 'Actualización sobre tu cuenta',
      html: `
        <h2>Actualización de tu solicitud</h2>
        <p>Hola ${userProfile.full_name},</p>
        <p>Lamentamos informarte que tu solicitud de registro no ha sido aprobada.</p>
        ${reason ? `<p><strong>Motivo:</strong> ${reason}</p>` : ''}
        <p>Si crees que esto es un error, por favor contacta al administrador.</p>
      `
    })

    return NextResponse.json({
      success: true,
      message: 'Usuario rechazado exitosamente',
    })
  } catch (error) {
    console.error('Error rechazando usuario:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
