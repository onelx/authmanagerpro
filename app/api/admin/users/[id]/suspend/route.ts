import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

async function requireAdmin(token: string) {
  const userDb = createClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: `Bearer ${token}` } } }
  )
  const { data: { user } } = await userDb.auth.getUser()
  if (!user) return null

  const adminDb = createClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
  const { data: p } = await adminDb.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!p?.is_admin) return null

  return { adminDb, actorId: user.id }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const admin = await requireAdmin(token)
    if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    const { error } = await admin.adminDb.from('profiles')
      .update({ status: 'suspended' })
      .eq('id', params.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Audit log
    await admin.adminDb.from('audit_log').insert({
      action: 'user_suspended',
      actor_id: admin.actorId,
      target_id: params.id,
      metadata: {},
    })

    return NextResponse.json({ message: 'Usuario suspendido' })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
