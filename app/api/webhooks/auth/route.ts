import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { sendEmail } from "@/lib/email"
import { logAudit } from "@/lib/audit-log"

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, record } = body

    if (type !== "INSERT" || !record || record.email_confirmed_at === null) {
      return NextResponse.json({ received: true })
    }

    const userId = record.id
    const userEmail = record.email
    const db = getDb()

    const { error: updateError } = await (db
      .from("profiles")
      .update({ status: "pending_approval", updated_at: new Date().toISOString() } as any)
      .eq("id", userId) as any)

    if (updateError) {
      console.error("Error actualizando perfil:", updateError)
      return NextResponse.json({ error: "Error al actualizar perfil" }, { status: 500 })
    }

    await logAudit({ action: "email_verified", targetId: userId, metadata: { email: userEmail } })

    const adminEmail = await getAdminEmail()
    if (adminEmail) {
      await sendEmail({
        to: adminEmail,
        subject: "Nuevo usuario pendiente de aprobación",
        html: `<h2>Nuevo usuario registrado</h2><p>Email: ${userEmail}</p><p>ID: ${userId}</p>`
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error en webhook:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

async function getAdminEmail(): Promise<string | null> {
  try {
    const db = getDb()
    const { data } = await db.from("admin_config").select("value").eq("key", "admin_email").single()
    return (data as any)?.value?.email || null
  } catch {
    return null
  }
}