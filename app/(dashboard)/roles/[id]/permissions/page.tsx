'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Check, Save, ShieldCheck } from 'lucide-react'

type PermissionItem = { id: string; action: string; checked: boolean }
type RoleData = { id: string; name: string; slug: string; isSystem: boolean }

const ACTION_LABELS: Record<string, string> = {
  view: 'Lihat',
  create: 'Tambah',
  edit: 'Ubah',
  delete: 'Hapus',
  approve: 'Setujui',
  export: 'Export',
}

const MODULE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  mahasiswa: 'Mahasiswa',
  dosen: 'Dosen',
  akademik: 'Akademik',
  kemahasiswaan: 'Kemahasiswaan',
  laporan: 'Laporan',
  users: 'Manajemen User',
  roles: 'Manajemen Role',
  permissions: 'Manajemen Permission',
  menus: 'Manajemen Menu',
  sinkronisasi: 'Sinkronisasi API',
  audit: 'Audit Log',
}

export default function RolePermissionsPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [role, setRole] = useState<RoleData | null>(null)
  const [modules, setModules] = useState<Record<string, PermissionItem[]>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const load = async () => {
    setLoading(true)
    const res = await fetch(`/api/roles/${id}/permissions`)
    const json = await res.json()
    setRole(json.role)
    setModules(json.modules)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [id])

  const toggle = (moduleName: string, permId: string) => {
    if (role?.isSystem) return
    setModules((prev) => ({
      ...prev,
      [moduleName]: prev[moduleName].map((p) => (p.id === permId ? { ...p, checked: !p.checked } : p)),
    }))
  }

  const toggleModuleAll = (moduleName: string, checked: boolean) => {
    if (role?.isSystem) return
    setModules((prev) => ({
      ...prev,
      [moduleName]: prev[moduleName].map((p) => ({ ...p, checked })),
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    const permissionIds = Object.values(modules)
      .flat()
      .filter((p) => p.checked)
      .map((p) => p.id)

    const res = await fetch(`/api/roles/${id}/permissions`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ permissionIds }),
    })
    setSaving(false)
    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } else {
      const json = await res.json()
      alert(json.error ?? 'Gagal menyimpan permission')
    }
  }

  if (loading) {
    return <div className="text-slate-400 text-sm">Memuat data permission...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/roles')} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Permission — {role?.name}</h1>
          <p className="text-slate-500 text-sm">Atur menu dan aksi apa saja yang dapat diakses role ini</p>
        </div>
      </div>

      {role?.isSystem && (
        <div className="card p-4 flex items-center gap-3 bg-amber-50 border-amber-100 text-amber-700 text-sm">
          <ShieldCheck className="w-5 h-5 shrink-0" />
          Super Admin memiliki akses penuh secara otomatis ke seluruh modul dan tidak dapat diubah.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(modules).map(([moduleName, perms]) => {
          const allChecked = perms.every((p) => p.checked)
          return (
            <div key={moduleName} className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-slate-700">{MODULE_LABELS[moduleName] ?? moduleName}</h3>
                <button
                  onClick={() => toggleModuleAll(moduleName, !allChecked)}
                  disabled={role?.isSystem}
                  className="text-xs text-primary hover:underline disabled:text-slate-300 disabled:no-underline"
                >
                  {allChecked ? 'Hapus semua' : 'Pilih semua'}
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {perms.map((p) => (
                  <label
                    key={p.id}
                    className={`flex items-center gap-2 text-sm rounded-lg px-2 py-1.5 cursor-pointer ${
                      p.checked ? 'bg-primary/5 text-primary' : 'text-slate-500 hover:bg-slate-50'
                    } ${role?.isSystem ? 'cursor-not-allowed opacity-70' : ''}`}
                  >
                    <span
                      className={`w-4 h-4 rounded flex items-center justify-center border ${
                        p.checked ? 'bg-primary border-primary' : 'border-slate-300'
                      }`}
                    >
                      {p.checked && <Check className="w-3 h-3 text-white" />}
                    </span>
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={p.checked}
                      disabled={role?.isSystem}
                      onChange={() => toggle(moduleName, p.id)}
                    />
                    {ACTION_LABELS[p.action] ?? p.action}
                  </label>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {!role?.isSystem && (
        <div className="sticky bottom-4 flex justify-end">
          <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2 shadow-lg">
            <Save className="w-4 h-4" />
            {saving ? 'Menyimpan...' : saved ? 'Tersimpan ✓' : 'Simpan Perubahan'}
          </button>
        </div>
      )}
    </div>
  )
}
