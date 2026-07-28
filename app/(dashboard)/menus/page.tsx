'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import * as Icons from 'lucide-react'
import { Plus, Trash2, Pencil, X, ChevronRight } from 'lucide-react'

type Menu = {
  id: string
  name: string
  icon: string | null
  url: string | null
  parentId: string | null
  sort: number
  permissionKey: string | null
  children: Menu[]
}

const menuSchema = z.object({
  name: z.string().min(1, 'Nama menu wajib diisi'),
  icon: z.string().optional(),
  url: z.string().optional(),
  parentId: z.string().optional(),
  sort: z.coerce.number().optional(),
  permissionKey: z.string().optional(),
})
type MenuForm = z.infer<typeof menuSchema>

const COMMON_ICONS = [
  'LayoutDashboard', 'GraduationCap', 'Users', 'BookOpen', 'Calendar', 'FileText',
  'Award', 'Wallet', 'Trophy', 'Users2', 'UserCheck', 'FileBarChart', 'Settings',
  'Shield', 'Menu', 'UserCog', 'History', 'Star', 'BookMarked', 'ClipboardList',
]

function DynamicIcon({ name, className }: { name: string | null; className?: string }) {
  const Icon = (name && (Icons as any)[name]) || Icons.Circle
  return <Icon className={className} />
}

export default function MenusPage() {
  const [menus, setMenus] = useState<Menu[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Menu | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Menu | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<MenuForm>({ resolver: zodResolver(menuSchema) })

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/menus')
    setMenus(await res.json())
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const openCreate = (parentId?: string) => {
    reset({ name: '', icon: 'Circle', url: '', parentId: parentId ?? '', sort: 0, permissionKey: '' })
    setEditing(null)
    setError(null)
    setModalOpen(true)
  }

  const openEdit = (menu: Menu) => {
    reset({
      name: menu.name,
      icon: menu.icon ?? 'Circle',
      url: menu.url ?? '',
      parentId: menu.parentId ?? '',
      sort: menu.sort,
      permissionKey: menu.permissionKey ?? '',
    })
    setEditing(menu)
    setError(null)
    setModalOpen(true)
  }

  const onSubmit = async (data: MenuForm) => {
    setError(null)
    const payload = {
      ...data,
      parentId: data.parentId || null,
      sort: data.sort ?? 0,
    }
    const res = await fetch(editing ? `/api/menus/${editing.id}` : '/api/menus', {
      method: editing ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error ?? 'Gagal menyimpan menu')
      return
    }
    setModalOpen(false)
    load()
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    const res = await fetch(`/api/menus/${deleteTarget.id}`, { method: 'DELETE' })
    const json = await res.json()
    if (!res.ok) alert(json.error ?? 'Gagal menghapus menu')
    setDeleteTarget(null)
    load()
  }

  const selectedIcon = watch('icon')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Manajemen Menu</h1>
          <p className="text-slate-500 text-sm">Atur struktur sidebar dan permission key yang mengontrol visibilitasnya</p>
        </div>
        <button onClick={() => openCreate()} className="btn-primary">
          <Plus className="w-4 h-4 text-amber-400 stroke-[2.5]" />
          <span>Tambah Menu Induk</span>
        </button>
      </div>

      <div className="card divide-y divide-slate-100">
        {loading && <div className="px-5 py-6 text-center text-slate-400 text-sm">Memuat data...</div>}
        {!loading && menus.length === 0 && (
          <div className="px-5 py-6 text-center text-slate-400 text-sm">Belum ada menu.</div>
        )}
        {menus.map((menu) => (
          <div key={menu.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <DynamicIcon name={menu.icon} className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-slate-700">{menu.name}</p>
                  <p className="text-xs text-slate-400">
                    {menu.url || '(grup menu)'} {menu.permissionKey && `• ${menu.permissionKey}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => openCreate(menu.id)}
                  className="text-xs text-primary hover:underline px-2 py-1"
                >
                  + Submenu
                </button>
                <button onClick={() => openEdit(menu)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteTarget(menu)}
                  className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {menu.children.length > 0 && (
              <div className="mt-3 ml-12 space-y-2">
                {menu.children.map((child) => (
                  <div key={child.id} className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                      <DynamicIcon name={child.icon} className="w-4 h-4" />
                      {child.name}
                      <span className="text-xs text-slate-400">
                        {child.url} {child.permissionKey && `• ${child.permissionKey}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(child)} className="p-1.5 rounded-lg hover:bg-white text-slate-500">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(child)}
                        className="p-1.5 rounded-lg hover:bg-white text-slate-400 hover:text-red-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
          <div className="card w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold text-slate-800 mb-4">{editing ? 'Edit Menu' : 'Tambah Menu'}</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Nama Menu</label>
                <input {...register('name')} className="input" placeholder="cth. Data Mahasiswa" />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Icon</label>
                <div className="grid grid-cols-10 gap-1.5 max-h-28 overflow-y-auto p-1 border border-slate-100 rounded-xl">
                  {COMMON_ICONS.map((iconName) => {
                    const Icon = (Icons as any)[iconName]
                    return (
                      <label
                        key={iconName}
                        className={`flex items-center justify-center p-2 rounded-lg cursor-pointer border ${
                          selectedIcon === iconName ? 'border-primary bg-primary/10 text-primary' : 'border-transparent text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        <input type="radio" value={iconName} {...register('icon')} className="hidden" />
                        <Icon className="w-4 h-4" />
                      </label>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">URL (kosongkan jika grup menu)</label>
                <input {...register('url')} className="input" placeholder="/mahasiswa" />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Permission Key</label>
                <input {...register('permissionKey')} className="input" placeholder="cth. mahasiswa.view" />
                <p className="text-xs text-slate-400 mt-1">
                  Format: <span className="font-mono">module.action</span>. Menu hanya muncul untuk role yang memiliki
                  permission ini.
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Urutan</label>
                <input type="number" {...register('sort')} className="input" placeholder="0" />
              </div>

              {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</div>}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">
                  Batal
                </button>
                <button type="submit" disabled={isSubmitting} className="btn-primary">
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
          <div className="card w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-2">Hapus Menu?</h2>
            <p className="text-sm text-slate-500 mb-5">
              Menu <span className="font-medium">{deleteTarget.name}</span> akan dihapus. Submenu harus dihapus terlebih
              dahulu jika menu ini memiliki anak.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteTarget(null)} className="btn-secondary">
                Batal
              </button>
              <button onClick={confirmDelete} className="bg-red-500 text-white rounded-xl px-4 py-2 font-medium hover:bg-red-600">
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
