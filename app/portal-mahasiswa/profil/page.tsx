'use client'

import React, { useState, useEffect } from 'react'
import {
  User,
  GraduationCap,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
} from 'lucide-react'

export default function StudentProfilePage() {
  const [student, setStudent] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Password state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetch('/api/mahasiswa/me')
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setStudent(json.student)
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordMsg(null)

    if (newPassword.length < 8) {
      setPasswordMsg({ type: 'error', text: 'Password baru minimal 8 karakter.' })
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Konfirmasi password baru tidak cocok.' })
      return
    }

    try {
      setSavingPassword(true)
      const res = await fetch('/api/mahasiswa/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })

      const json = await res.json()

      if (!res.ok) {
        setPasswordMsg({ type: 'error', text: json.error || 'Gagal mengubah password.' })
        return
      }

      setPasswordMsg({ type: 'success', text: 'Password berhasil diperbarui!' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch {
      setPasswordMsg({ type: 'error', text: 'Terjadi gangguan koneksi ke server.' })
    } finally {
      setSavingPassword(false)
    }
  }

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
        <p className="text-xs font-semibold">Memuat data profil mahasiswa...</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-3 pb-6 border-b border-slate-100">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">Profil Mahasiswa</h1>
            <p className="text-xs text-slate-500">Informasi identitas akademik dan keamanan akun Anda</p>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider">Nama Mahasiswa</span>
            <p className="font-bold text-slate-800 text-sm">{student?.name}</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider">
              Nomor Induk Mahasiswa (NIM)
            </span>
            <p className="font-mono font-bold text-slate-800 text-sm">{student?.nim}</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider">Program Studi</span>
            <p className="font-semibold text-slate-700">{student?.prodi}</p>
            <span className="text-[10px] text-slate-400">Kode: {student?.prodiCode}</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider">Status Akademik</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {student?.status}
              </span>
              <span className="text-slate-500">Semester {student?.semester}</span>
            </div>
          </div>
        </div>

        {/* Change Password Form */}
        <div className="pt-6 border-t border-slate-100 space-y-4">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
            <KeyRound className="w-4 h-4 text-amber-500" />
            <span>Pengaturan Keamanan & Ubah Password</span>
          </div>

          {passwordMsg && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-center gap-2 ${
                passwordMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {passwordMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{passwordMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-3 max-w-md text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Password Saat Ini</label>
              <input
                type="password"
                placeholder="Masukkan password saat ini (jika ada)"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Password Baru (min 8 karakter)</label>
              <input
                type="password"
                required
                placeholder="Masukkan password baru"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Konfirmasi Password Baru</label>
              <input
                type="password"
                required
                placeholder="Ulangi password baru"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={savingPassword}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#002B49] hover:bg-[#003B64] text-white font-bold shadow-md transition"
            >
              {savingPassword && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Simpan Password Baru</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

