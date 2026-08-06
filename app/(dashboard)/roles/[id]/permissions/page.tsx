'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Check, Save, ShieldCheck, Lock, Layers } from 'lucide-react'

type PermissionItem = { id: string; action: string; checked: boolean }
type RoleData = { id: string; name: string; slug: string; isSystem: boolean }

const ACTION_LABELS: Record<string, string> = {
  view: 'Lihat Data',
  create: 'Tambah Data',
  edit: 'Ubah Data',
  delete: 'Hapus Data',
  approve: 'Setujui Data',
  export: 'Download Excel',
}

const MODULE_LABELS: Record<string, string> = {
  dashboard: 'Ringkasan Ikhtisar',
  mahasiswa: 'Data Mahasiswa',
  dosen: 'Dosen & Pengajar',
  akademik: 'Layanan Akademik',
  kemahasiswaan: 'Kemahasiswaan & Prestasi',
  laporan: 'Laporan Rekapitulasi',
  users: 'Manajemen Pengguna',
  roles: 'Manajemen Peranan',
  permissions: 'Hak Akses Sistem',
  menus: 'Manajemen Navigasi',
  sinkronisasi: 'Layanan Integrasi API',
  audit: 'Catatan Aktivitas',
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
    try {
      const res = await fetch(`/api/roles/${id}/permissions`)
      if (res.ok) {
        const json = await res.json()
        setRole(json.role)
        setModules(json.modules || {})
      }
    } catch (e) {
      console.error('Failed to load role permissions:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) load()
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
    if (!role || role.isSystem) return
    setSaving(true)
    setSaved(false)
    const permissionIds = Object.values(modules)
      .flat()
      .filter((p) => p.checked)
      .map((p) => p.id)

    try {
      const res = await fetch(`/api/roles/${role.id}/permissions`, {
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
        alert(json.error ?? 'Gagal menyimpan pengaturan hak akses')
      }
    } catch (e: any) {
      setSaving(false)
      alert('Terjadi kesalahan saat menyimpan pengaturan hak akses')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400 text-sm">
        Memuat data hak akses role...
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/roles')}
          className="p-2.5 rounded-2xl hover:bg-slate-100 text-slate-600 transition border border-slate-200"
          title="Kembali ke Manajemen Role"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Lock className="w-6 h-6 text-ut-navy" />
            Pengaturan Hak Akses — {role?.name}
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Konfigurasi otorisasi modul dan tingkat persetujuan sistem untuk peranan {role?.name}
          </p>
        </div>
      </div>

      {role?.isSystem && (
        <div className="card p-4 flex items-center gap-3 bg-amber-50 border-amber-200 text-amber-900 text-xs font-semibold rounded-2xl">
          <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0" />
          <span>
            Peranan <strong>{role.name}</strong> memiliki otorisasi penuh secara otomatis ke seluruh fitur sistem dan hak akses tidak dapat diubah.
          </span>
        </div>
      )}

      {/* Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(modules).map(([moduleName, perms]) => {
          const allChecked = perms.every((p) => p.checked)
          return (
            <div key={moduleName} className="card p-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <Layers className="w-4 h-4 text-ut-blue" />
                  {MODULE_LABELS[moduleName] ?? moduleName}
                </h3>
                <button
                  onClick={() => toggleModuleAll(moduleName, !allChecked)}
                  disabled={role?.isSystem}
                  className="text-xs font-bold text-ut-blue hover:underline disabled:text-slate-300 disabled:no-underline"
                >
                  {allChecked ? 'Hapus Semua' : 'Pilih Semua'}
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {perms.map((p) => (
                  <label
                    key={p.id}
                    className={`flex items-center gap-2 text-xs rounded-xl px-2.5 py-2 cursor-pointer border transition ${
                      p.checked
                        ? 'bg-ut-navy/5 border-ut-navy/30 text-ut-navy font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    } ${role?.isSystem ? 'cursor-not-allowed opacity-70' : ''}`}
                  >
                    <span
                      className={`w-4 h-4 rounded-md flex items-center justify-center border transition ${
                        p.checked ? 'bg-ut-navy border-ut-navy' : 'border-slate-300 bg-white'
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
                    <span>{ACTION_LABELS[p.action] ?? p.action}</span>
                  </label>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {!role?.isSystem && (
        <div className="sticky bottom-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary py-2.5 px-6 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-xl bg-ut-navy text-white hover:bg-ut-blue disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Menyimpan...' : saved ? 'Tersimpan ✓' : 'Simpan Pengaturan Hak Akses'}</span>
          </button>
        </div>
      )}
    </div>
  )
}
