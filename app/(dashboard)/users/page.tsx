'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, UserCog, Trash2, Pencil, Search, X, CheckCircle, XCircle } from 'lucide-react'

type RoleOption = {
  id: string
  name: string
  slug: string
}

type User = {
  id: string
  name: string
  email: string
  status: 'ACTIVE' | 'INACTIVE'
  roleId: string
  role: RoleOption
  createdAt: string
}

const userSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  email: z.string().email('Email tidak valid'),
  password: z.string().optional(),
  roleId: z.string().min(1, 'Pilih role untuk user'),
  status: z.enum(['ACTIVE', 'INACTIVE']),
})
type UserForm = z.infer<typeof userSchema>

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<RoleOption[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UserForm>({ resolver: zodResolver(userSchema) })

  const loadData = async () => {
    setLoading(true)
    const [resUsers, resRoles] = await Promise.all([fetch('/api/users'), fetch('/api/roles')])
    if (resUsers.ok) setUsers(await resUsers.json())
    if (resRoles.ok) setRoles(await resRoles.json())
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const openCreate = () => {
    setEditingUser(null)
    reset({ name: '', email: '', password: '', roleId: roles[0]?.id ?? '', status: 'ACTIVE' })
    setError(null)
    setModalOpen(true)
  }

  const openEdit = (user: User) => {
    setEditingUser(user)
    reset({ name: user.name, email: user.email, password: '', roleId: user.roleId, status: user.status })
    setError(null)
    setModalOpen(true)
  }

  const onSubmit = async (data: UserForm) => {
    setError(null)

    if (!editingUser && (!data.password || data.password.length < 6)) {
      setError('Password minimal 6 karakter untuk pengguna baru')
      return
    }

    const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users'
    const method = editingUser ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error ?? 'Gagal menyimpan data pengguna')
      return
    }
    setModalOpen(false)
    loadData()
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    const res = await fetch(`/api/users/${deleteTarget.id}`, { method: 'DELETE' })
    const json = await res.json()
    if (!res.ok) {
      alert(json.error ?? 'Gagal menghapus pengguna')
    }
    setDeleteTarget(null)
    loadData()
  }

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.role.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Manajemen User</h1>
          <p className="text-slate-500 text-sm">Kelola daftar akun pengguna dan penugasan role</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Tambah User
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, email, atau role..."
            className="input pl-10"
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="px-5 py-3 font-medium">Pengguna</th>
              <th className="px-5 py-3 font-medium">Role</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Tanggal Dibuat</th>
              <th className="px-5 py-3 font-medium text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="px-5 py-6 text-center text-slate-400">
                  Memuat data user...
                </td>
              </tr>
            )}
            {!loading && filteredUsers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-6 text-center text-slate-400">
                  Tidak ada data user ditemukan.
                </td>
              </tr>
            )}
            {filteredUsers.map((user) => (
              <tr key={user.id} className="border-t border-slate-100">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                      <UserCog className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-800">{user.name}</p>
                      <p className="text-xs text-slate-400">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                    {user.role.name}
                  </span>
                </td>
                <td className="px-5 py-3">
                  {user.status === 'ACTIVE' ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                      <CheckCircle className="w-3 h-3" /> Aktif
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                      <XCircle className="w-3 h-3" /> Nonaktif
                    </span>
                  )}
                </td>
                <td className="px-5 py-3 text-slate-500 text-xs">
                  {new Date(user.createdAt).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => openEdit(user)}
                      className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-primary"
                      title="Edit User"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(user)}
                      className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500"
                      title="Hapus User"
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

      {/* Modal Form */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
          <div className="card w-full max-w-md p-6 relative">
            <button onClick={() => setModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold text-slate-800 mb-4">
              {editingUser ? 'Edit User' : 'Tambah User Baru'}
            </h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Nama Lengkap</label>
                <input {...register('name')} className="input" placeholder="cth. Dr. Budi Santoso" />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Email</label>
                <input {...register('email')} type="email" className="input" placeholder="budi@kampus.ac.id" />
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  Password {editingUser && <span className="text-xs text-slate-400">(Kosongkan jika tidak diubah)</span>}
                </label>
                <input
                  {...register('password')}
                  type="password"
                  className="input"
                  placeholder={editingUser ? '••••••••' : 'Password baru'}
                />
                {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Role</label>
                <select {...register('roleId')} className="input bg-white">
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.slug})
                    </option>
                  ))}
                </select>
                {errors.roleId && <p className="text-xs text-red-500 mt-1">{errors.roleId.message}</p>}
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Status Akun</label>
                <select {...register('status')} className="input bg-white">
                  <option value="ACTIVE">Aktif</option>
                  <option value="INACTIVE">Nonaktif</option>
                </select>
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
            <h2 className="text-lg font-semibold text-slate-800 mb-2">Hapus User?</h2>
            <p className="text-sm text-slate-500 mb-5">
              User <span className="font-medium">{deleteTarget.name}</span> ({deleteTarget.email}) akan dihapus permanen.
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
