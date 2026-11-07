'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  BookX,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  ArrowRight,
  Loader2,
  Info,
  Check,
  X,
  Building2,
  FileCheck2,
  Paperclip,
} from 'lucide-react'
import { AcademicCourse } from '@/lib/academic-api'
import { formatWIBDateShort, cleanStudentName } from '@/lib/pengguguran-utils'

export default function StudentPengguguranPage() {
  const router = useRouter()
  const [courses, setCourses] = useState<(AcademicCourse & { alreadyApplied?: boolean; existingSubmissionNumber?: string; existingSubmissionStatus?: string })[]>([])
  const [apiMeta, setApiMeta] = useState<{ source?: string; apiConfigured?: boolean; message?: string }>({})
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'INTI' | 'NON_INTI'>('ALL')
  const [activePeriode, setActivePeriode] = useState<any>(null)
  const [student, setStudent] = useState<any>(null)

  // Modal pengajuan
  const [selectedCourse, setSelectedCourse] = useState<AcademicCourse | null>(null)
  const [showApplyModal, setShowApplyModal] = useState(false)
  const [alasan, setAlasan] = useState('')
  const [lampiranNama, setLampiranNama] = useState('')
  const [lampiranUrl, setLampiranUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const loadCourses = async () => {
    try {
      setLoading(true)
      const [courseRes, meRes] = await Promise.all([
        fetch('/api/mahasiswa/mata-kuliah').then((r) => r.json()),
        fetch('/api/mahasiswa/me').then((r) => r.json()),
      ])

      if (courseRes.success) {
        setCourses(courseRes.data)
        setApiMeta({
          source: courseRes.source,
          apiConfigured: courseRes.apiConfigured,
          message: courseRes.message,
        })
      }

      if (meRes.success) {
        setStudent(meRes.student)
        setActivePeriode(meRes.activePeriode)
      }
    } catch (err) {
      console.error('Failed to load courses:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCourses()
  }, [])

  // Filter courses
  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      const matchSearch =
        c.kode_mk.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.nama_mk.toLowerCase().includes(searchQuery.toLowerCase())

      const matchCategory =
        categoryFilter === 'ALL' || c.kategori_mk === categoryFilter

      return matchSearch && matchCategory
    })
  }, [courses, searchQuery, categoryFilter])

  // Open apply dialog
  const handleOpenApply = (course: AcademicCourse) => {
    if (course.kategori_mk === 'INTI') {
      alert('Mata kuliah ini termasuk kategori Mata Kuliah Inti dan tidak dapat diajukan untuk pengguguran.')
      return
    }
    setSelectedCourse(course)
    setAlasan('')
    setLampiranNama('')
    setLampiranUrl('')
    setSubmitError(null)
    setShowApplyModal(true)
  }

  // Handle submit form
  const handleSubmitPengajuan = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)

    if (!selectedCourse) return

    if (!alasan.trim() || alasan.trim().length < 10) {
      setSubmitError('Alasan pengguguran wajib diisi minimal 10 karakter.')
      return
    }

    try {
      setSubmitting(true)
      const res = await fetch('/api/mahasiswa/pengguguran', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kodeMatkul: selectedCourse.kode_mk,
          alasan: alasan.trim(),
          lampiranNama: lampiranNama.trim() || undefined,
          lampiranUrl: lampiranUrl.trim() || undefined,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        setSubmitError(json.error || 'Gagal mengirim pengajuan.')
        return
      }

      // Berhasil
      setShowApplyModal(false)
      setSelectedCourse(null)
      alert(`Pengajuan pengguguran untuk ${selectedCourse.kode_mk} berhasil dikirim ke Program Studi!`)
      router.push('/portal-mahasiswa/riwayat')
    } catch (err: any) {
      setSubmitError(err?.message || 'Terjadi kesalahan sistem saat mengirim pengajuan.')
    } finally {
      setSubmitting(false)
    }
  }

  const isPengajuanOpen = Boolean(activePeriode?.timeline?.isPengajuanOpen)

  return (
    <div className="space-y-6">
      {/* Header Page */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-100 text-[#002B49] flex items-center justify-center font-bold shadow-sm">
              <BookX className="w-5 h-5 text-blue-700" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Pengajuan Pengguguran Mata Kuliah
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Program Studi: <strong className="text-slate-800">{student?.prodi}</strong>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700">
            {loading ? 'Memuat data...' : `${courses.length} Mata Kuliah Terdaftar`}
          </div>
        </div>
      </div>

      {/* Timeline Status Alert */}
      {!loading && !isPengajuanOpen && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3 shadow-sm animate-in fade-in duration-200">
          <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-sm">Periode Pengajuan Pengguguran Saat Ini Ditutup</p>
            <p className="mt-0.5 text-slate-600">
              Pengajuan hanya dapat dilakukan saat jadwal periode pengajuan mahasiswa dibuka oleh Administrator
              Fakultas. Anda tetap dapat meninjau daftar mata kuliah dan status kelayakan di bawah ini.
            </p>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari kode atau nama mata kuliah..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={categoryFilter}
            onChange={(e: any) => setCategoryFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Semua Kategori ({courses.length})</option>
            <option value="NON_INTI">Hanya Non-Inti (Dapat Diajukan)</option>
            <option value="INTI">Hanya Inti (Tidak Dapat Digugurkan)</option>
          </select>
        </div>
      </div>

      {/* Courses Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
            <p className="text-xs font-semibold">Mengambil daftar mata kuliah dari sistem akademik...</p>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <BookX className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="font-semibold text-slate-600">Tidak ada mata kuliah yang cocok dengan pencarian.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left min-w-[700px]">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3.5">Kode MK</th>
                  <th className="px-4 py-3.5">Nama Mata Kuliah</th>
                  <th className="px-4 py-3.5">SKS</th>
                  <th className="px-4 py-3.5">Kategori</th>
                  <th className="px-4 py-3.5">Status Kelayakan</th>
                  <th className="px-4 py-3.5 text-center">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCourses.map((c) => {
                  const isInti = c.kategori_mk === 'INTI'

                  return (
                    <tr key={c.kode_mk} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3.5 font-mono font-bold text-slate-800">{c.kode_mk}</td>
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-800">{c.nama_mk}</div>
                        <div className="text-[11px] text-slate-400">
                          {c.nama_prodi || student?.prodi} • Kurikulum {c.kurikulum}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-slate-600">{c.sks} SKS</td>
                      <td className="px-4 py-3.5">
                        {isInti ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            Inti
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Non-Inti
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {c.alreadyApplied ? (
                          <div className="text-[11px] font-bold text-blue-700 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Sudah Diajukan ({c.existingSubmissionNumber})</span>
                          </div>
                        ) : isInti ? (
                          <div className="text-[11px] text-rose-600 font-semibold flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Tidak Dapat Digugurkan (Mata Kuliah Inti)</span>
                          </div>
                        ) : (
                          <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Dapat Diajukan</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {c.alreadyApplied ? (
                          <Link
                            href="/portal-mahasiswa/riwayat"
                            className="px-3 py-1.5 rounded-xl border border-blue-200 text-blue-700 hover:bg-blue-50 text-xs font-semibold inline-flex items-center gap-1"
                          >
                            <span>Lihat Status</span>
                          </Link>
                        ) : isInti ? (
                          <button
                            disabled
                            className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-400 text-xs font-semibold cursor-not-allowed"
                            title="Mata kuliah inti tidak dapat digugurkan"
                          >
                            Terkunci
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenApply(c)}
                            disabled={!isPengajuanOpen}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-sm transition-all ${
                              isPengajuanOpen
                                ? 'bg-[#002B49] hover:bg-[#003B64] text-white active:scale-95'
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            }`}
                          >
                            Pilih & Ajukan
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL PENGAJUAN */}
      {showApplyModal && selectedCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-2xl bg-blue-50 text-blue-600">
                  <BookX className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Formulir Pengajuan Pengguguran</h3>
                  <p className="text-xs text-slate-500">Lengkapi alasan pengajuan untuk verifikasi Program Studi</p>
                </div>
              </div>
              <button
                onClick={() => setShowApplyModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPengajuan} className="p-6 space-y-4 text-xs">
              {submitError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Data Mahasiswa (Otomatis) */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="font-bold text-[10px] text-slate-400 uppercase tracking-wider block">
                  Identitas Pengaju
                </span>
                <div className="font-bold text-slate-800 text-sm">{cleanStudentName(student?.name)}</div>
                <div className="text-slate-600 font-mono">NIM: {student?.nim}</div>
                <div className="text-slate-600">{student?.prodi}</div>
              </div>

              {/* Data Mata Kuliah yang Dipilih */}
              <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[10px] text-blue-700 uppercase tracking-wider">
                    Mata Kuliah Yang Diajukan
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
                    Non-Inti (Dapat Diajukan)
                  </span>
                </div>
                <div className="font-bold text-slate-900 text-sm">
                  {selectedCourse.kode_mk} - {selectedCourse.nama_mk}
                </div>
                <div className="text-slate-600">
                  Bobot: <strong>{selectedCourse.sks} SKS</strong> • Kurikulum: {selectedCourse.kurikulum}
                </div>
              </div>

              {/* Input Alasan */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Alasan Pengajuan Pengguguran *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Tuliskan alasan akademik atau administrasi secara jelas mengapa mata kuliah ini diajukan untuk digugurkan..."
                  value={alasan}
                  onChange={(e) => setAlasan(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Lampiran Pendukung (Opsional) */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Keterangan Lampiran Pendukung (Opsional)
                </label>
                <div className="relative">
                  <Paperclip className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Contoh: Surat Rekomendasi / Transkrip Sementara (jika ada)"
                    value={lampiranNama}
                    onChange={(e) => setLampiranNama(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md transition"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Kirim Pengajuan ke Prodi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

