'use client'

import { useEffect, useState } from 'react'
import { Search, Monitor, User, Globe, Activity, RefreshCw, Trash2 } from 'lucide-react'
import { Pagination } from '@/components/ui/pagination'

type AuditLogItem = {
  id: string
  userId: string | null
  action: string
  ip: string | null
  browser: string | null
  createdAt: string
  user: {
    id: string
    name: string
    email: string
    role: { name: string }
  } | null
}

function formatIp(rawIp: string | null): string {
  if (!rawIp || rawIp === '::1' || rawIp === '127.0.0.1' || rawIp === '::ffff:127.0.0.1') {
    return '127.0.0.1 (Lokal)'
  }
  return rawIp
}

function parseUserAgent(ua: string | null): string {
  if (!ua) return 'Perangkat Tidak Dikenal'

  let os = 'Unknown OS'
  if (ua.includes('Windows NT 10.0')) os = 'Windows 10/11'
  else if (ua.includes('Windows NT 6.3')) os = 'Windows 8.1'
  else if (ua.includes('Windows NT 6.1')) os = 'Windows 7'
  else if (ua.includes('Mac OS X')) os = 'macOS'
  else if (ua.includes('Android')) os = 'Android'
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS'
  else if (ua.includes('Linux')) os = 'Linux'

  let browser = 'Browser'
  if (ua.includes('Edg/')) browser = 'Edge'
  else if (ua.includes('Chrome/')) browser = 'Chrome'
  else if (ua.includes('Firefox/')) browser = 'Firefox'
  else if (ua.includes('Safari/')) browser = 'Safari'

  return `${browser} • ${os}`
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const fetchLogs = async () => {
    setLoading(true)
    const res = await fetch('/api/audit')
    if (res.ok) setLogs(await res.json())
    setLoading(false)
  }

  const handleResetLogs = async () => {
    if (!confirm('Apakah Anda yakin ingin menghapus seluruh riwayat Audit Log?')) return
    setLoading(true)
    try {
      const res = await fetch('/api/audit', { method: 'DELETE' })
      if (res.ok) {
        setLogs([])
        setCurrentPage(1)
      }
    } catch (e) {
      console.error('Failed to reset audit logs:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  const handleSearchChange = (val: string) => {
    setSearch(val)
    setCurrentPage(1)
  }

  const filteredLogs = logs.filter(
    (log) =>
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      (log.user?.name && log.user.name.toLowerCase().includes(search.toLowerCase())) ||
      (log.user?.email && log.user.email.toLowerCase().includes(search.toLowerCase())) ||
      (log.ip && log.ip.includes(search)) ||
      formatIp(log.ip).toLowerCase().includes(search.toLowerCase())
  )

  const paginatedLogs = filteredLogs.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const getActionBadge = (action: string) => {
    const act = action.toUpperCase()
    if (act.startsWith('TAMBAH') || act.startsWith('CREATE')) {
      return 'bg-blue-50 text-blue-700 border-blue-200'
    }
    if (act.startsWith('EDIT') || act.startsWith('UPDATE')) {
      return 'bg-amber-50 text-amber-700 border-amber-200'
    }
    if (act.startsWith('HAPUS') || act.startsWith('DELETE')) {
      return 'bg-rose-50 text-rose-700 border-rose-200'
    }
    if (act.startsWith('LOGIN')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    }
    return 'bg-slate-100 text-slate-700 border-slate-200'
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Audit Log</h1>
          <p className="text-slate-500 text-sm">Riwayat aktivitas dan sesi login dalam sistem</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-xs font-semibold flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-600 animate-pulse" />
            <span>Monitoring Aktif</span>
          </div>
          <button onClick={fetchLogs} disabled={loading} className="btn-secondary flex items-center gap-2 text-sm">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button
            onClick={handleResetLogs}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition text-sm font-semibold flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4 text-rose-600" /> Reset Log
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Cari aksi, nama user, atau IP..."
            className="input pl-10"
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[680px]">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-5 py-3 font-medium">Aksi</th>
                <th className="px-5 py-3 font-medium">Pengguna</th>
                <th className="px-5 py-3 font-medium">IP Address</th>
                <th className="px-5 py-3 font-medium">Perangkat & Browser</th>
                <th className="px-5 py-3 font-medium">Waktu</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} className="px-5 py-6 text-center text-slate-400">
                    Memuat data audit log...
                  </td>
                </tr>
              )}
              {!loading && filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-6 text-center text-slate-400">
                    Belum ada catatan aktivitas.
                  </td>
                </tr>
              )}
              {paginatedLogs.map((log) => (
                <tr key={log.id} className="border-t border-slate-100">
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getActionBadge(
                        log.action
                      )}`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    {log.user ? (
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                          <User className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-700">{log.user.name}</p>
                          <p className="text-xs text-slate-400">{log.user.email}</p>
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">Sistem / Tamu</span>
                    )}
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-slate-700 font-medium">
                    <div className="flex items-center gap-1.5" title={log.ip || '127.0.0.1'}>
                      <Globe className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>{formatIp(log.ip)}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-600 max-w-xs" title={log.browser || 'Unknown'}>
                    <div className="flex items-center gap-1.5">
                      <Monitor className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-medium">{parseUserAgent(log.browser)}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-500 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && (
          <Pagination
            currentPage={currentPage}
            totalItems={filteredLogs.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        )}
      </div>
    </div>
  )
}
