import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function supabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()
    if (!email || !password) {
      return NextResponse.json({ error: "Email y password son requeridos" }, { status: 400 })
    }

    const db = supabase()
    const { data: authData, error: authError } = await db.auth.signInWithPassword({ email, password })
    if (authError) return NextResponse.json({ error: authError.message }, { status: 401 })
    if (!authData.user) return NextResponse.json({ error: "Error al autenticar" }, { status: 500 })

    const { data: profile, error: profileError } = await db
      .from("profiles")
      .select("status, is_admin, full_name, rejection_reason")
      .eq("id", authData.user.id)
      .single()

    if (profileError) {
      console.error("Profile error:", profileError)
      return NextResponse.json({ error: "Error al obtener perfil: " + profileError.message }, { status: 500 })
    }

    if (profile.status === "pending_verification") {
      await db.auth.signOut()
      return NextResponse.json({ error: "Por favor verifica tu email antes de iniciar sesión" }, { status: 403 })
    }
    if (profile.status === "pending_approval" && !profile.is_admin) {
      await db.auth.signOut()
      return NextResponse.json({ error: "Tu cuenta está pendiente de aprobación", status: "pending_approval" }, { status: 403 })
    }
    if (profile.status === "rejected") {
      await db.auth.signOut()
      return NextResponse.json({ error: "Tu cuenta fue rechazada" + (profile.rejection_reason ? ": " + profile.rejection_reason : ""), status: "rejected" }, { status: 403 })
    }

    return NextResponse.json({
      message: "Login exitoso",
      user: { id: authData.user.id, email: authData.user.email, fullName: profile.full_name, status: profile.status, isAdmin: profile.is_admin },
      session: authData.session,
    })
  } catch (error) {
    console.error("Error en login:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}