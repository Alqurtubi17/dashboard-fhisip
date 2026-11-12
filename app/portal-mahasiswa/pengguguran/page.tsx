'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
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
import { Pagination } from '@/components/ui/pagination'

export default function StudentPengguguranPage() {
  const router = useRouter()
  const [courses, setCourses] = useState<(AcademicCourse & { alreadyApplied?: boolean; existingSubmissionNumber?: string; existingSubmissionStatus?: string })[]>([])
  const [apiMeta, setApiMeta] = useState<{ source?: string; apiConfigured?: boolean; message?: string }>({})
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'INTI' | 'NON_INTI'>('ALL')
  const [activePeriode, setActivePeriode] = useState<any>(null)
  const [student, setStudent] = useState<any>(null)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Modal pengajuan
  const [selectedCourses, setSelectedCourses] = useState<AcademicCourse[]>([])
  const [showApplyModal, setShowApplyModal] = useState(false)
  const [alasan, setAlasan] = useState('')
  const [lampiranNama, setLampiranNama] = useState('')
  const [lampiranUrl, setLampiranUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    document.title = 'Pengajuan Pengguguran Mata Kuliah | Portal Mahasiswa FHISIP'
  }, [])

  // Lock body scroll when modal is open
  useEffect(() => {
    if (showApplyModal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [showApplyModal])

  // ESC key closes modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showApplyModal && !submitting) {
        setShowApplyModal(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showApplyModal, submitting])

  const loadCourses = async () => {
    try {
      setLoading(true)
      const [courseRes, meRes] = await Promise.all([
        fetch('/api/mahasiswa/mata-kuliah?refresh=true').then((r) => r.json()),
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

  // Paginated courses for the current view
  const paginatedCourses = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredCourses.slice(start, start + pageSize)
  }, [filteredCourses, currentPage, pageSize])

  const isPengajuanOpen = Boolean(activePeriode?.timeline?.isPengajuanOpen)

  // Eligible courses for application (non-inti and not already applied)
  const eligibleCourses = useMemo(() => {
    return filteredCourses.filter((c) => c.kategori_mk !== 'INTI' && !c.alreadyApplied)
  }, [filteredCourses])

  const isAllEligibleSelected = useMemo(() => {
    if (eligibleCourses.length === 0) return false
    return eligibleCourses.every((c) => selectedCourses.some((sc) => sc.kode_mk === c.kode_mk))
  }, [eligibleCourses, selectedCourses])

  const toggleCourseSelection = (course: AcademicCourse) => {
    if (course.kategori_mk === 'INTI' || (course as any).alreadyApplied || !isPengajuanOpen) return
    setSelectedCourses((prev) => {
      const exists = prev.some((c) => c.kode_mk === course.kode_mk)
      if (exists) {
        return prev.filter((c) => c.kode_mk !== course.kode_mk)
      } else {
        return [...prev, course]
      }
    })
  }

  const handleSelectAll = () => {
    if (isAllEligibleSelected) {
      const eligibleCodes = new Set(eligibleCourses.map((c) => c.kode_mk))
      setSelectedCourses((prev) => prev.filter((c) => !eligibleCodes.has(c.kode_mk)))
    } else {
      setSelectedCourses((prev) => {
        const existingMap = new Map(prev.map((c) => [c.kode_mk, c]))
        for (const ec of eligibleCourses) {
          existingMap.set(ec.kode_mk, ec)
        }
        return Array.from(existingMap.values())
      })
    }
  }

  const totalSelectedSks = useMemo(() => {
    return selectedCourses.reduce((sum, c) => sum + (c.sks || 0), 0)
  }, [selectedCourses])

  // Open apply dialog for single course
  const handleOpenApplySingle = (course: AcademicCourse) => {
    if (course.kategori_mk === 'INTI') {
      alert('Mata kuliah ini termasuk kategori Mata Kuliah Inti dan tidak dapat diajukan untuk pengguguran.')
      return
    }
    setSelectedCourses([course])
    setAlasan('')
    setLampiranNama('')
    setLampiranUrl('')
    setSubmitError(null)
    setShowApplyModal(true)
  }

  // Open apply dialog for currently selected batch
  const handleOpenApplyBatch = () => {
    if (selectedCourses.length === 0) {
      alert('Pilih minimal 1 mata kuliah non-inti untuk diajukan.')
      return
    }
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

    if (selectedCourses.length === 0) {
      setSubmitError('Pilih minimal satu mata kuliah untuk diajukan.')
      return
    }

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
          courses: selectedCourses.map((c) => ({
            kode_mk: c.kode_mk,
            nama_mk: c.nama_mk,
            sks: c.sks,
          })),
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
      const submittedCount = selectedCourses.length
      setShowApplyModal(false)
      setSelectedCourses([])
      alert(
        submittedCount === 1
          ? `Pengajuan pengguguran untuk ${selectedCourses[0]?.kode_mk || 'mata kuliah'} berhasil dikirim ke Program Studi!`
          : `Pengajuan pengguguran untuk ${submittedCount} mata kuliah berhasil dikirim ke Program Studi!`
      )
      router.push('/portal-mahasiswa/riwayat')
    } catch (err: any) {
      setSubmitError(err?.message || 'Terjadi kesalahan sistem saat mengirim pengajuan.')
    } finally {
      setSubmitting(false)
    }
  }

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
                {student?.prodiCode && <span className="ml-1 text-slate-500 font-semibold">({student.prodiCode})</span>}
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
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setCurrentPage(1)
            }}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={categoryFilter}
            onChange={(e: any) => {
              setCategoryFilter(e.target.value)
              setCurrentPage(1)
            }}
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
            <table className="w-full text-xs text-left min-w-[760px]">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-3.5 py-3.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllEligibleSelected}
                      onChange={handleSelectAll}
                      disabled={!isPengajuanOpen || eligibleCourses.length === 0}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                      title="Pilih semua mata kuliah non-inti yang dapat diajukan"
                    />
                  </th>
                  <th className="px-4 py-3.5 whitespace-nowrap">Kode MK</th>
                  <th className="px-4 py-3.5">Nama Mata Kuliah</th>
                  <th className="px-4 py-3.5 whitespace-nowrap">SKS</th>
                  <th className="px-4 py-3.5 whitespace-nowrap">Nilai & Masa</th>
                  <th className="px-4 py-3.5 whitespace-nowrap">Kategori</th>
                  <th className="px-4 py-3.5 whitespace-nowrap">Status Kelayakan</th>
                  <th className="px-4 py-3.5 text-center whitespace-nowrap">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedCourses.map((c) => {
                  const isInti = c.kategori_mk === 'INTI'
                  const isSelected = selectedCourses.some((sc) => sc.kode_mk === c.kode_mk)
                  const canSelect = !isInti && !c.alreadyApplied && isPengajuanOpen

                  return (
                    <tr
                      key={c.kode_mk}
                      className={`transition ${isSelected ? 'bg-blue-50/60' : 'hover:bg-slate-50/80'}`}
                    >
                      <td className="px-3.5 py-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={!canSelect}
                          onChange={() => toggleCourseSelection(c)}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-30"
                          title={
                            c.alreadyApplied
                              ? 'Mata kuliah ini sudah diajukan'
                              : isInti
                              ? 'Mata kuliah inti tidak dapat digugurkan'
                              : !isPengajuanOpen
                              ? 'Periode pengajuan sedang ditutup'
                              : 'Pilih mata kuliah ini'
                          }
                        />
                      </td>
                      <td className="px-4 py-3.5 font-mono font-bold text-slate-800 whitespace-nowrap">{c.kode_mk}</td>
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-800">{c.nama_mk}</div>
                        <div className="text-[11px] text-slate-400">
                          {c.nama_prodi || student?.prodi} • Kurikulum {c.kurikulum}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-slate-600 whitespace-nowrap">{c.sks} SKS</td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="font-bold text-slate-800">
                          {c.grade && c.grade !== '-' && c.grade !== 'BL' ? (
                            <span className="inline-flex items-center gap-1 font-mono text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-md text-[11px] font-semibold">
                              Nilai: {c.grade}
                            </span>
                          ) : c.grade === 'BL' ? (
                            <span className="inline-flex items-center gap-1 font-mono text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md text-[11px]">
                              BL (Belum Ada Nilai)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-mono text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md text-[11px]">
                              Belum Ada Nilai
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1">
                          {c.masa && c.masa !== '-' && c.masa !== 'ZZZZZ' ? (
                            <span>Masa Reg: {c.masa}</span>
                          ) : (
                            <span className="text-slate-400">Masa: Paket Kurikulum</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {isInti ? (
                          <span className="whitespace-nowrap inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            Inti
                          </span>
                        ) : (
                          <span className="whitespace-nowrap inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Non-Inti
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
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
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
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
                            onClick={() => handleOpenApplySingle(c)}
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

        {/* Pagination */}
        {!loading && filteredCourses.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalItems={filteredCourses.length}
            pageSize={pageSize}
            onPageChange={(p) => setCurrentPage(p)}
            onPageSizeChange={(s) => {
              setPageSize(s)
              setCurrentPage(1)
            }}
            pageSizeOptions={[10, 20, 50]}
          />
        )}
      </div>

      {/* Floating Action Bar untuk Pemilihan Multi Mata Kuliah */}
      {selectedCourses.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-4 max-w-xl w-[92%] sm:w-auto animate-in slide-in-from-bottom-5">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow">
              {selectedCourses.length}
            </span>
            <div className="text-xs">
              <div className="font-bold">{selectedCourses.length} Mata Kuliah Dipilih</div>
              <div className="text-[11px] text-slate-400">Total {totalSelectedSks} SKS</div>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={() => setSelectedCourses([])}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleOpenApplyBatch}
              disabled={!isPengajuanOpen}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm ${
                isPengajuanOpen
                  ? 'bg-blue-600 hover:bg-blue-500 text-white active:scale-95'
                  : 'bg-slate-700 text-slate-400 cursor-not-allowed'
              }`}
            >
              Ajukan Pengguguran ({selectedCourses.length} MK)
            </button>
          </div>
        </div>
      )}

      {/* MODAL PENGAJUAN */}
      {mounted && showApplyModal && selectedCourses.length > 0 && createPortal(
        <div
          className="fixed inset-0 w-screen h-screen min-h-screen bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[999999] p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          onClick={() => {
            if (!submitting) setShowApplyModal(false)
          }}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 my-auto animate-in fade-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-2xl bg-blue-50 text-blue-600">
                  <BookX className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Formulir Pengajuan Pengguguran {selectedCourses.length > 1 ? `(${selectedCourses.length} Mata Kuliah)` : ''}
                  </h3>
                  <p className="text-xs text-slate-500">Lengkapi alasan pengajuan untuk verifikasi Program Studi</p>
                </div>
              </div>
              <button
                onClick={() => setShowApplyModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition"
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
                <div className="text-slate-600">NIM: {student?.nim}</div>
                <div className="text-slate-600">
                  {student?.prodi}
                  {student?.prodiCode && <span className="ml-1 text-slate-500 font-medium">({student.prodiCode})</span>}
                </div>
              </div>

              {/* Data Mata Kuliah yang Dipilih */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[10px] text-blue-700 uppercase tracking-wider">
                    Mata Kuliah Yang Diajukan ({selectedCourses.length} MK • Total {totalSelectedSks} SKS)
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-600 text-white">
                    Non-Inti (Dapat Diajukan)
                  </span>
                </div>

                <div className="max-h-52 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100">
                  {selectedCourses.map((c) => (
                    <div
                      key={c.kode_mk}
                      className="pt-2 first:pt-0 p-3 rounded-2xl bg-blue-50/60 border border-blue-200 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 text-xs">
                          {c.kode_mk} - {c.nama_mk}
                        </div>
                        <div className="text-[11px] text-slate-600 mt-0.5">
                          Bobot: <strong>{c.sks} SKS</strong>
                          {c.grade && c.grade !== '-' && (
                            <> • Nilai: <strong className="text-slate-900 font-mono">{c.grade}</strong></>
                          )}
                          {c.masa && c.masa !== '-' && (
                            <> • Masa: <strong className="text-slate-900 font-mono">{c.masa}</strong></>
                          )}
                        </div>
                      </div>
                      {selectedCourses.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setSelectedCourses((prev) => prev.filter((item) => item.kode_mk !== c.kode_mk))}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition shrink-0"
                          title="Hapus mata kuliah ini dari pengajuan"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Input Alasan */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Alasan Pengajuan Pengguguran *
                </label>
                <textarea
                  rows={3}
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
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md transition"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>
                    Kirim Pengajuan {selectedCourses.length > 1 ? `(${selectedCourses.length} MK) ` : ''}ke Prodi
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

