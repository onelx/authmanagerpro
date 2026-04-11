import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'
import { logAudit } from '@/lib/audit-log'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, record } = body

    // Verificar que sea un evento de email confirmado
    if (type !== 'INSERT' || !record || record.email_confirmed_at === null) {
      return NextResponse.json({ received: true })
    }

    const userId = record.id
    const userEmail = record.email

    const supabase = getSupabaseClient()

    // Actualizar status a pending_approval
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        status: 'pending_approval',
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (updateError) {
      console.error('Error actualizando perfil:', updateError)
      return NextResponse.json(
        { error: 'Error al actualizar perfil' },
        { status: 500 }
      )
    }

    // Log de auditoría
    await logAudit({
      action: 'email_verified',
      targetId: userId,
      metadata: { email: userEmail }
    })

    // Obtener email del admin desde configuración
    const adminEmail = await getAdminEmail()

    // Enviar notificación al admin
    if (adminEmail) {
      await sendEmail({
        to: adminEmail,
        subject: 'Nuevo usuario pendiente de aprobación',
        html: `
          <h2>Nuevo usuario registrado</h2>
          <p>Un usuario ha verificado su email y está pendiente de aprobación:</p>
          <ul>
            <li><strong>Email:</strong> ${userEmail}</li>
            <li><strong>ID:</strong> ${userId}</li>
          </ul>
          <p>Por favor ingresa al panel de administración para aprobar o rechazar este usuario.</p>
        `
      })
    }

    return NextResponse.json({ 
      success: true,
      message: 'Usuario actualizado a pending_approval'
    })
  } catch (error) {
    console.error('Error en webhook:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

async function getAdminEmail(): Promise<string | null> {
  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('admin_config')
      .select('value')
      .eq('key', 'admin_email')
      .single()

    if (error || !data) return null
    return data.value?.email || null
  } catch (error) {
    console.error('Error obteniendo email admin:', error)
    return null
  }
}
