import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: NextRequest) {
  try {
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await db.auth.signOut()
    return NextResponse.json({ message: "Sesión cerrada" })
  } catch (error) {
    return NextResponse.json({ error: "Error al cerrar sesión" }, { status: 500 })
  }
}