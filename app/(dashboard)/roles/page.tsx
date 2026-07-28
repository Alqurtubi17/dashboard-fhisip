'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Shield, Trash2, Pencil, KeySquare, X } from 'lucide-react'
import { Pagination } from '@/components/ui/pagination'

type Role = {
  id: string
  name: string
  slug: string
  description: string | null
  isSystem: boolean
  _count: { users: number; permissions: number }
}

const roleSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  slug: z
    .string()
    .min(2, 'Slug minimal 2 karakter')
    .regex(/^[a-z0-9-]+$/, 'Hanya huruf kecil, angka, dan -'),
  description: z.string().optional(),
})
type RoleForm = z.infer<typeof roleSchema>

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RoleForm>({ resolver: zodResolver(roleSchema) })

  const loadRoles = async () => {
    setLoading(true)
    const res = await fetch('/api/roles')
    const data = await res.json()
    setRoles(data)
    setLoading(false)
  }

  useEffect(() => {
    loadRoles()
  }, [])

  const paginatedRoles = roles.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const openCreate = () => {
    setEditingRole(null)
    reset({ name: '', slug: '', description: '' })
    setError(null)
    setModalOpen(true)
  }

  const openEdit = (role: Role) => {
    setEditingRole(role)
    reset({ name: role.name, slug: role.slug, description: role.description ?? '' })
    setError(null)
    setModalOpen(true)
  }

  const onSubmit = async (data: RoleForm) => {
    setError(null)
    const url = editingRole ? `/api/roles/${editingRole.id}` : '/api/roles'
    const method = editingRole ? 'PUT' : 'POST'
    const body = editingRole ? { name: data.name, description: data.description } : data

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error ?? 'Gagal menyimpan role')
      return
    }
    setModalOpen(false)
    loadRoles()
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    const res = await fetch(`/api/roles/${deleteTarget.id}`, { method: 'DELETE' })
    const json = await res.json()
    if (!res.ok) {
      alert(json.error ?? 'Gagal menghapus role')
    }
    setDeleteTarget(null)
    loadRoles()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Manajemen Role</h1>
          <p className="text-slate-500 text-sm">Kelola peran pengguna dan hak akses sistem</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus className="w-4 h-4 text-amber-400 stroke-[2.5]" />
          <span>Tambah Role</span>
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Slug</th>
                <th className="px-5 py-3 font-medium">Jumlah User</th>
                <th className="px-5 py-3 font-medium">Permission Aktif</th>
                <th className="px-5 py-3 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} className="px-5 py-6 text-center text-slate-400">
                    Memuat data...
                  </td>
                </tr>
              )}
              {!loading && roles.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-6 text-center text-slate-400">
                    Belum ada role.
                  </td>
                </tr>
              )}
              {paginatedRoles.map((role) => (
                <tr key={role.id} className="border-t border-slate-100">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Shield className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-700">{role.name}</p>
                        {role.isSystem && <p className="text-xs text-amber-600 font-medium">Role Sistem</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-slate-500 font-mono text-xs">{role.slug}</td>
                  <td className="px-5 py-3 text-slate-600">{role._count.users}</td>
                  <td className="px-5 py-3 text-slate-600">
                    {role.isSystem ? 'Semua (Superadmin)' : role._count.permissions}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/roles/${role.id}/permissions`}
                        className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
                        title="Atur Permission & Menu"
                      >
                        <KeySquare className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => openEdit(role)}
                        className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-primary"
                        title="Edit Nama & Deskripsi"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(role)}
                        disabled={role.isSystem}
                        className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 disabled:opacity-30 disabled:hover:bg-transparent"
                        title="Hapus role"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && (
          <Pagination
            currentPage={currentPage}
            totalItems={roles.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        )}
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
          <div className="card w-full max-w-md p-6 relative">
            <button onClick={() => setModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold text-slate-800 mb-4">
              {editingRole ? 'Edit Role' : 'Tambah Role Baru'}
            </h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Nama Role</label>
                <input {...register('name')} className="input" placeholder="cth. Kaprodi Informatika" />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Slug</label>
                <input
                  {...register('slug')}
                  className="input disabled:bg-slate-100 disabled:text-slate-400 font-mono text-sm"
                  placeholder="cth. kaprodi-informatika"
                  disabled={Boolean(editingRole)}
                />
                {errors.slug && <p className="text-xs text-red-500 mt-1">{errors.slug.message}</p>}
                {editingRole && <p className="text-xs text-slate-400 mt-1">Slug tidak dapat diubah setelah role dibuat.</p>}
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Deskripsi (opsional)</label>
                <textarea {...register('description')} className="input" rows={2} />
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
            <h2 className="text-lg font-semibold text-slate-800 mb-2">Hapus Role?</h2>
            <p className="text-sm text-slate-500 mb-5">
              Role <span className="font-medium">{deleteTarget.name}</span> akan dihapus permanen. Tindakan ini tidak dapat
              dibatalkan.
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
