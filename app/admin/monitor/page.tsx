'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Stats {
  total: number
  pending_verification: number
  pending_approval: number
  approved: number
  rejected: number
  suspended: number
  admins: number
  registros24h: number
}

interface LogEntry {
  id: string
  action: string
  actor_id: string | null
  target_id: string | null
  actor_email: string | null
  target_email: string | null
  metadata: Record<string, unknown>
  created_at: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('auth_access_token')
}

const ACTION_META: Record<string, { label: string; icon: string; color: string }> = {
  login_success:   { label: 'Login exitoso',     icon: '✓', color: 'text-green-600 bg-green-50' },
  login_failed:    { label: 'Login fallido',      icon: '✗', color: 'text-red-600 bg-red-50' },
  user_registered: { label: 'Nuevo registro',     icon: '+', color: 'text-blue-600 bg-blue-50' },
  user_approved:   { label: 'Usuario aprobado',   icon: '✓', color: 'text-green-600 bg-green-50' },
  user_rejected:   { label: 'Usuario rechazado',  icon: '✗', color: 'text-red-600 bg-red-50' },
  user_suspended:  { label: 'Usuario suspendido', icon: '⊘', color: 'text-orange-600 bg-orange-50' },
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60)   return `hace ${s}s`
  if (s < 3600) return `hace ${Math.floor(s / 60)}m`
  if (s < 86400) return `hace ${Math.floor(s / 3600)}h`
  return `hace ${Math.floor(s / 86400)}d`
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, color, sub }: { label: string; value: number; color: string; sub?: string }) {
  return (
    <div className={`rounded-xl border p-4 ${color}`}>
      <p className="text-xs font-medium uppercase tracking-wider opacity-70">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs opacity-60 mt-1">{sub}</p>}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MonitorPage() {
  const { user, profile, isLoading, signOut } = useAuth()
  const router = useRouter()

  const [stats, setStats] = useState<Stats | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [fetching, setFetching] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (isLoading) return
    if (!user) { router.replace('/login'); return }
    if (profile !== null && !profile?.is_admin) { router.replace('/dashboard'); return }
  }, [user, profile, isLoading, router])

  const fetchData = useCallback(async () => {
    const token = getToken()
    if (!token) return
    setFetching(true)
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { Authorization: 'Bearer ' + token },
      })
      if (!res.ok) return
      const data = await res.json()
      setStats(data.stats)
      setLogs(data.logs ?? [])
      setLastUpdate(new Date())
    } catch { /* ignore */ } finally {
      setFetching(false)
    }
  }, [])

  useEffect(() => {
    if (!user || !profile?.is_admin) return
    fetchData()
  }, [user, profile, fetchData])

  // Auto-refresh cada 15s
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchData, 15000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [autoRefresh, fetchData])

  const filteredLogs = filter === 'all' ? logs : logs.filter(l => l.action === filter)

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500" />
    </div>
  )

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-mono">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-green-400 font-bold text-sm tracking-widest">AUTHPRO MONITOR</span>
          <span className="text-gray-600 text-xs">v1.0</span>
          {fetching && <span className="text-yellow-400 text-xs animate-pulse">● actualizando</span>}
          {!fetching && lastUpdate && (
            <span className="text-gray-600 text-xs">● {lastUpdate.toLocaleTimeString('es-AR')}</span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setAutoRefresh(v => !v)}
            className={`text-xs px-3 py-1 rounded border ${autoRefresh ? 'border-green-600 text-green-400' : 'border-gray-700 text-gray-500'}`}
          >
            {autoRefresh ? '⟳ auto ON' : '⟳ auto OFF'}
          </button>
          <button
            onClick={fetchData}
            className="text-xs px-3 py-1 rounded border border-gray-700 text-gray-400 hover:border-gray-500"
          >
            refresh
          </button>
          <a href="/admin" className="text-xs text-gray-500 hover:text-gray-300">← panel</a>
          <button onClick={signOut} className="text-xs text-red-600 hover:text-red-400">logout</button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">

        {/* Stats grid */}
        {stats ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            <StatCard label="Total" value={stats.total} color="border-gray-700 text-gray-100" />
            <StatCard label="24h" value={stats.registros24h} color="border-blue-900 text-blue-300" sub="nuevos hoy" />
            <StatCard label="Pendientes" value={stats.pending_approval} color="border-yellow-900 text-yellow-300" />
            <StatCard label="Verificando" value={stats.pending_verification} color="border-gray-700 text-gray-400" />
            <StatCard label="Aprobados" value={stats.approved} color="border-green-900 text-green-300" />
            <StatCard label="Rechazados" value={stats.rejected} color="border-red-900 text-red-300" />
            <StatCard label="Suspendidos" value={stats.suspended} color="border-orange-900 text-orange-300" />
            <StatCard label="Admins" value={stats.admins} color="border-purple-900 text-purple-300" />
          </div>
        ) : (
          <div className="grid grid-cols-8 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-gray-800 p-4 animate-pulse">
                <div className="h-2 bg-gray-800 rounded mb-3 w-2/3" />
                <div className="h-8 bg-gray-800 rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        {/* Activity log */}
        <div className="rounded-xl border border-gray-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between bg-gray-900">
            <span className="text-xs text-gray-400 uppercase tracking-widest">Activity Log</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600">{filteredLogs.length} eventos</span>
              <select
                value={filter}
                onChange={e => setFilter(e.target.value)}
                className="text-xs bg-gray-800 border border-gray-700 text-gray-300 rounded px-2 py-1 focus:outline-none"
              >
                <option value="all">todos</option>
                <option value="login_success">logins ok</option>
                <option value="login_failed">logins fallidos</option>
                <option value="user_registered">registros</option>
                <option value="user_approved">aprobaciones</option>
                <option value="user_rejected">rechazos</option>
                <option value="user_suspended">suspensiones</option>
              </select>
            </div>
          </div>

          {/* Log rows */}
          <div className="divide-y divide-gray-800/50 max-h-[520px] overflow-y-auto">
            {filteredLogs.length === 0 ? (
              <div className="px-4 py-12 text-center text-gray-600 text-sm">
                {fetching ? 'Cargando...' : 'No hay eventos registrados aún'}
              </div>
            ) : (
              filteredLogs.map(log => {
                const meta = ACTION_META[log.action] ?? { label: log.action, icon: '·', color: 'text-gray-400 bg-gray-800' }
                return (
                  <div
                    key={log.id}
                    className="px-4 py-2.5 flex items-start gap-3 hover:bg-gray-900/50 transition-colors"
                  >
                    {/* Icon */}
                    <span className={`mt-0.5 w-5 h-5 flex items-center justify-center rounded text-xs font-bold flex-shrink-0 ${meta.color}`}>
                      {meta.icon}
                    </span>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-gray-200">{meta.label}</span>
                        {log.target_email && (
                          <span className="text-xs text-gray-400 truncate">{log.target_email}</span>
                        )}
                        {log.actor_email && log.actor_email !== log.target_email && (
                          <span className="text-xs text-gray-600">por {log.actor_email}</span>
                        )}
                        {log.action === 'login_failed' && typeof log.metadata?.email === 'string' && (
                          <span className="text-xs text-red-400">{log.metadata.email}</span>
                        )}
                        {log.action === 'user_rejected' && typeof log.metadata?.reason === 'string' && (
                          <span className="text-xs text-gray-500 italic">&quot;{log.metadata.reason}&quot;</span>
                        )}
                      </div>
                    </div>

                    {/* Time */}
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs text-gray-500">{formatTime(log.created_at)}</div>
                      <div className="text-xs text-gray-700">{formatDate(log.created_at)}</div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-xs text-gray-700 text-center pb-4">
          Mostrando los últimos 50 eventos · Auto-refresh {autoRefresh ? 'ON (15s)' : 'OFF'}
        </div>
      </div>
    </div>
  )
}
