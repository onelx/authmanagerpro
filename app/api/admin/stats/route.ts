import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

async function requireAdmin(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null

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

  const { data: adminProfile } = await adminDb.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!adminProfile?.is_admin) return null

  return adminDb
}

export async function GET(request: NextRequest) {
  try {
    const db = await requireAdmin(request)
    if (!db) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    // Stats de usuarios por estado
    const { data: profiles } = await db
      .from('profiles')
      .select('status, created_at, updated_at, is_admin')
      .order('created_at', { ascending: false })

    const users = profiles ?? []
    const stats = {
      total: users.length,
      pending_verification: users.filter(u => u.status === 'pending_verification').length,
      pending_approval: users.filter(u => u.status === 'pending_approval').length,
      approved: users.filter(u => u.status === 'approved').length,
      rejected: users.filter(u => u.status === 'rejected').length,
      suspended: users.filter(u => u.status === 'suspended').length,
      admins: users.filter(u => u.is_admin).length,
    }

    // Registros de las últimas 24h
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const registros24h = users.filter(u => u.created_at > since24h).length

    // Audit log reciente
    const { data: logs } = await db
      .from('audit_log')
      .select('id, action, actor_id, target_id, metadata, created_at')
      .order('created_at', { ascending: false })
      .limit(50)

    // Enriquecer logs con emails
    const actorIds = [...new Set((logs ?? []).map(l => l.actor_id).filter(Boolean))]
    const targetIds = [...new Set((logs ?? []).map(l => l.target_id).filter(Boolean))]
    const allIds = [...new Set([...actorIds, ...targetIds])]

    let emailMap: Record<string, string> = {}
    if (allIds.length > 0) {
      const { data: emailProfiles } = await db
        .from('profiles')
        .select('id, email')
        .in('id', allIds)
      emailMap = Object.fromEntries((emailProfiles ?? []).map(p => [p.id, p.email]))
    }

    const enrichedLogs = (logs ?? []).map(l => ({
      ...l,
      actor_email: l.actor_id ? emailMap[l.actor_id] : null,
      target_email: l.target_id ? emailMap[l.target_id] : null,
    }))

    return NextResponse.json({
      stats: { ...stats, registros24h },
      logs: enrichedLogs,
    })
  } catch (e) {
    console.error('[stats]', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
