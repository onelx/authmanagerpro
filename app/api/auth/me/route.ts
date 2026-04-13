import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    const token = authHeader?.replace("Bearer ", "")
    if (!token) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

    const db = createClient<any>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    )

    const { data: { user }, error: userError } = await db.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

    const { data: profile, error: profileError } = await db
      .from("profiles").select("*").eq("id", user.id).single()

    if (profileError) return NextResponse.json({ error: "Error al obtener perfil" }, { status: 500 })

    return NextResponse.json({ user: { id: user.id, email: user.email, fullName: profile.full_name, status: profile.status, isAdmin: profile.is_admin, rejectionReason: profile.rejection_reason, approvedAt: profile.approved_at, createdAt: profile.created_at } })
  } catch (error) {
    console.error("Error en /api/auth/me:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}