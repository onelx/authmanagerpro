import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = request.headers.get("authorization")
    const token = authHeader?.replace("Bearer ", "")
    if (!token) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: "Bearer " + token } } }
    )

    const { data: { user } } = await db.auth.getUser()
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

    const { data: adminProfile } = await db.from("profiles").select("is_admin").eq("id", user.id).single()
    if (!adminProfile?.is_admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 })

    const body = await request.json().catch(() => ({}))
    const { error } = await db.from("profiles")
      .update({ status: "rejected", rejection_reason: body.rejection_reason ?? null })
      .eq("id", params.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ message: "Usuario rechazado" })
  } catch (error) {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}