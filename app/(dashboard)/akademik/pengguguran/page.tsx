'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import {
  BookX,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Eye,
  Calendar,
  Layers,
  Check,
  X,
  Loader2,
  RefreshCw,
  Info,
  CalendarClock,
  User,
  GraduationCap,
  Building2,
  ShieldCheck,
  ChevronRight,
  ArrowUpRight,
  LayoutGrid,
} from 'lucide-react'
import { Pagination } from '@/components/ui/pagination'
import {
  PRODI_OPTIONS,
  STATUS_MAP,
  formatWIBDate,
  formatWIBDateShort,
  getProdiNameByCode,
  cleanStudentName,
  formatAcademicStatus,
} from '@/lib/pengguguran-utils'
import { resolveProdiInfo } from '@/lib/prodi-codes'

type PengajuanItem = {
  id: string
  nomorPengajuan: string
  periodeId: string
  periode: { id: string; semester: string; tahunAkademik: string; nama: string }
  pengajuId: string
  pengaju: { id: string; name: string; email: string }
  nim: string
  namaMahasiswa: string
  prodiCode: string
  prodiName: string
  mataKuliahId: string
  mataKuliah: { id: string; kodeMatkul: string; namaMatkul: string; sks: number; kategori: 'INTI' | 'NON_INTI' }
  kodeMatkul: string
  namaMatkul: string
  sks: number
  kategoriMatkul: 'INTI' | 'NON_INTI'
  alasan: string
  status: string
  verifikatorProdiId?: string | null
  verifikatorProdiName?: string | null
  verifikasiProdiAt?: string | null
  catatanProdi?: string | null
  keputusanAkademikId?: string | null
  keputusanAkademikName?: string | null
  keputusanAkademikAt?: string | null
  catatanAkademik?: string | null
  createdAt: string
  updatedAt: string
  riwayat?: any[]
}

type PeriodeInfo = {
  id: string
  tahunAkademik: string
  semester: string
  nama: string
  isActive: boolean
  pengajuanStart: string
  pengajuanEnd: string
  verifikasiProdiStart: string
  verifikasiProdiEnd: string
  keputusanAkademikStart: string
  keputusanAkademikEnd: string
  pengumumanDate?: string | null
  keterangan?: string | null
  alasanPerpanjangan?: string | null
  timeline: {
    isPengajuanOpen: boolean
    isVerifikasiProdiOpen: boolean
    isKeputusanAkademikOpen: boolean
    currentStage: string
    daysRemainingPengajuan: number
    daysRemainingVerifikasi: number
    daysRemainingAkademik: number
  }
}

type MataKuliahItem = {
  id: string
  kodeMatkul: string
  namaMatkul: string
  sks: number
  prodiCode: string
  prodiName: string
  kategori: 'INTI' | 'NON_INTI'
}

export default function PengguguranMataKuliahPage() {
  const [mounted, setMounted] = useState(false)

  // Navigation tabs: 'semua' | 'verifikasi-prodi' | 'keputusan-akademik' | 'periode-master'
  const [activeTab, setActiveTab] = useState<'semua' | 'verifikasi-prodi' | 'keputusan-akademik' | 'periode-master'>('semua')

  // Data states
  const [items, setItems] = useState<PengajuanItem[]>([])
  const [summary, setSummary] = useState({
    total: 0,
    menungguProdi: 0,
    disetujuiProdi: 0,
    disetujuiAkademik: 0,
    ditolak: 0,
  })
  const [activePeriode, setActivePeriode] = useState<PeriodeInfo | null>(null)
  const [allPeriodes, setAllPeriodes] = useState<PeriodeInfo[]>([])
  const [currentUserRole, setCurrentUserRole] = useState<string>('')
  const [userProdiCode, setUserProdiCode] = useState<string | null>(null)

  // Filters & Pagination
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalItems, setTotalItems] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProdi, setSelectedProdi] = useState('ALL')
  const [selectedStatus, setSelectedStatus] = useState('ALL')
  const [selectedPeriodeId, setSelectedPeriodeId] = useState('ALL')
  const [loading, setLoading] = useState(true)

  // Toast Notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showActionModal, setShowActionModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState<PengajuanItem | null>(null)
  const [actionType, setActionType] = useState<'PRODI' | 'AKADEMIK'>('PRODI')
  const [actionDecision, setActionDecision] = useState<'SETUJU' | 'TOLAK'>('SETUJU')
  const [actionNotes, setActionNotes] = useState('')
  const [actionSubmitting, setActionSubmitting] = useState(false)

  // Extend Period Modal
  const [extendModal, setExtendModal] = useState<{
    open: boolean
    period: PeriodeInfo | null
    newEnd: string
    reason: string
    submitting: boolean
  }>({
    open: false,
    period: null,
    newEnd: '',
    reason: '',
    submitting: false,
  })

  // Form Pengajuan states
  const [mataKuliahList, setMataKuliahList] = useState<MataKuliahItem[]>([])
  const [courseSearch, setCourseSearch] = useState('')
  const [selectedCourses, setSelectedCourses] = useState<MataKuliahItem[]>([])
  const [formNim, setFormNim] = useState('')
  const [formNama, setFormNama] = useState('')
  const [formAlasan, setFormAlasan] = useState('')
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Student DB Lookup states
  const [studentLookupLoading, setStudentLookupLoading] = useState(false)
  const [studentLookupResult, setStudentLookupResult] = useState<{
    nim: string
    name: string
    prodi: string
    prodiCode: string | null
    officialProdiCode: string
    prodiName: string
    semester: number
    status: string
  } | null>(null)
  const [studentLookupError, setStudentLookupError] = useState<string | null>(null)

  // Periode Edit / Baru Modal
  const [showPeriodeModal, setShowPeriodeModal] = useState(false)
  const [periodeForm, setPeriodeForm] = useState<any>({
    nama: '',
    tahunAkademik: '',
    semester: '',
    pengajuanStart: '',
    pengajuanEnd: '',
    verifikasiProdiStart: '',
    verifikasiProdiEnd: '',
    keputusanAkademikStart: '',
    keputusanAkademikEnd: '',
    pengumumanDate: '',
    alasanPerpanjangan: '',
    keterangan: '',
    isActive: true,
  })

  // Set document title & mounted
  useEffect(() => {
    setMounted(true)
    document.title = 'Pengguguran Mata Kuliah | FHISIP UT'
  }, [])

  // Lock body scroll when any modal is open
  const isAnyModalOpen =
    showCreateModal || showDetailModal || showActionModal || showPeriodeModal || extendModal.open

  useEffect(() => {
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isAnyModalOpen])

  // ESC key closes modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showCreateModal && !formSubmitting) setShowCreateModal(false)
        else if (showDetailModal) setShowDetailModal(false)
        else if (showActionModal && !actionSubmitting) setShowActionModal(false)
        else if (showPeriodeModal) setShowPeriodeModal(false)
        else if (extendModal.open && !extendModal.submitting) {
          setExtendModal({ open: false, period: null, newEnd: '', reason: '', submitting: false })
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showCreateModal, showDetailModal, showActionModal, showPeriodeModal, extendModal, formSubmitting, actionSubmitting])

  // Fetch data
  const fetchData = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
        search: searchQuery,
        prodi: selectedProdi,
        status: selectedStatus,
        periodeId: selectedPeriodeId,
      })

      const res = await fetch(`/api/akademik/pengguguran?${params.toString()}`)
      const json = await res.json()

      if (json.success) {
        setItems(json.data)
        setTotalItems(json.meta.total)
        setSummary(json.summary)
        setActivePeriode(json.activePeriode)
        setCurrentUserRole(json.currentUserRole)
        setUserProdiCode(json.userProdiCode)
      }
    } catch (err) {
      console.error('Failed to fetch pengguguran:', err)
    } finally {
      setLoading(false)
    }
  }

  // Load periodes list
  const fetchPeriodes = async () => {
    try {
      const res = await fetch('/api/akademik/pengguguran/periode')
      const json = await res.json()
      if (json.success) {
        setAllPeriodes(json.data)
      }
    } catch (err) {
      console.error('Failed to load periodes:', err)
    }
  }

  // Load courses for form
  const fetchCourses = async (prodi?: string, search?: string) => {
    try {
      const p = new URLSearchParams()
      if (prodi && prodi !== 'ALL') p.set('prodiCode', prodi)
      if (search) p.set('search', search)
      p.set('limit', '200')

      const res = await fetch(`/api/akademik/pengguguran/mata-kuliah?${p.toString()}`)
      const json = await res.json()
      if (json.success) {
        setMataKuliahList(json.data)
      }
    } catch (err) {
      console.error('Failed to load courses:', err)
    }
  }

  useEffect(() => {
    fetchData()
  }, [page, pageSize, searchQuery, selectedProdi, selectedStatus, selectedPeriodeId])

  useEffect(() => {
    fetchPeriodes()
    fetchCourses()
  }, [])

  // Auto-lookup Mahasiswa saat NIM diketik
  useEffect(() => {
    const trimmed = formNim.trim()
    if (!trimmed || trimmed.length < 5) {
      setStudentLookupResult(null)
      setStudentLookupError(null)
      return
    }

    const timer = setTimeout(async () => {
      try {
        setStudentLookupLoading(true)
        setStudentLookupError(null)
        const res = await fetch(`/api/akademik/pengguguran/mahasiswa-lookup?nim=${encodeURIComponent(trimmed)}`)
        const json = await res.json()
        if (json.success && json.student) {
          setStudentLookupResult(json.student)
          setFormNama(cleanStudentName(json.student.name))
          if (json.courses && json.courses.length > 0) {
            setMataKuliahList(json.courses)
          }
          setStudentLookupError(null)
        } else {
          setStudentLookupResult(null)
          setStudentLookupError(json.message || 'Data mahasiswa tidak ditemukan.')
        }
      } catch {
        setStudentLookupError('Gagal memverifikasi data NIM.')
      } finally {
        setStudentLookupLoading(false)
      }
    }, 350)

    return () => clearTimeout(timer)
  }, [formNim])

  // Filtered lists for special tabs
  const prodiPendingItems = useMemo(() => {
    return items.filter((it) => it.status === 'MENUNGGU_VERIFIKASI_PRODI')
  }, [items])

  const akademikPendingItems = useMemo(() => {
    return items.filter((it) => it.status === 'DISETUJUI_PRODI')
  }, [items])

  // Toggle multi-selection course
  const toggleCourseSelection = (course: MataKuliahItem) => {
    if (course.kategori === 'INTI') return
    setSelectedCourses((prev) => {
      const exists = prev.some((c) => c.id === course.id)
      if (exists) {
        return prev.filter((c) => c.id !== course.id)
      } else {
        return [...prev, course]
      }
    })
  }

  // Handle Form Submit (Multi-select course support)
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (selectedCourses.length === 0) {
      setFormError('Harap pilih minimal 1 mata kuliah Non-Inti yang ingin digugurkan.')
      return
    }

    if (!formNim.trim() || !formNama.trim() || !formAlasan.trim()) {
      setFormError('NIM, Nama Mahasiswa, dan Alasan pengguguran wajib diisi.')
      return
    }

    const targetProdiCode = studentLookupResult?.officialProdiCode || selectedCourses[0]?.prodiCode || 'FSAP'

    try {
      setFormSubmitting(true)
      const res = await fetch('/api/akademik/pengguguran', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nim: formNim.trim(),
          namaMahasiswa: formNama.trim(),
          prodiCode: targetProdiCode,
          mataKuliahIds: selectedCourses.map((c) => c.id),
          alasan: formAlasan.trim(),
          periodeId: activePeriode?.id,
        }),
      })

      const json = await res.json()
      if (!res.ok) {
        setFormError(json.error || 'Gagal mengirim pengajuan.')
        return
      }

      // Success
      setShowCreateModal(false)
      setSelectedCourses([])
      setStudentLookupResult(null)
      setFormNim('')
      setFormNama('')
      setFormAlasan('')
      showToast(
        json.count && json.count > 1
          ? `${json.count} pengajuan mata kuliah berhasil dibuat dan diteruskan ke Program Studi.`
          : 'Pengajuan pengguguran berhasil dibuat dan diteruskan ke Program Studi.',
        'success'
      )
      fetchData()
    } catch (err: any) {
      setFormError(err?.message || 'Terjadi kesalahan sistem saat mengirim pengajuan.')
    } finally {
      setFormSubmitting(false)
    }
  }

  // Open Action Modal (Prodi or Akademik approval/rejection)
  const openActionDialog = (item: PengajuanItem, type: 'PRODI' | 'AKADEMIK', defaultDecision: 'SETUJU' | 'TOLAK') => {
    setSelectedItem(item)
    setActionType(type)
    setActionDecision(defaultDecision)
    setActionNotes('')
    setShowActionModal(true)
  }

  // Submit Action (Prodi or Akademik)
  const handleActionSubmit = async () => {
    if (!selectedItem) return

    if (actionDecision === 'TOLAK' && !actionNotes.trim()) {
      showToast('Alasan penolakan wajib dicantumkan.', 'error')
      return
    }

    try {
      setActionSubmitting(true)
      const endpoint =
        actionType === 'PRODI'
          ? `/api/akademik/pengguguran/${selectedItem.id}/verifikasi-prodi`
          : `/api/akademik/pengguguran/${selectedItem.id}/keputusan-akademik`

      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keputusan: actionDecision,
          catatan: actionNotes.trim(),
        }),
      })

      const json = await res.json()
      if (!res.ok) {
        showToast(json.error || 'Gagal menyimpan keputusan.', 'error')
        return
      }

      setShowActionModal(false)
      setSelectedItem(null)
      showToast(
        actionType === 'PRODI'
          ? `Verifikasi Program Studi berhasil disimpan: ${actionDecision === 'SETUJU' ? 'Disetujui' : 'Ditolak'}.`
          : `Keputusan Akademik berhasil disimpan: ${actionDecision === 'SETUJU' ? 'Disetujui Akhir' : 'Ditolak'}.`,
        'success'
      )
      fetchData()
    } catch (err) {
      console.error('Action submit error:', err)
      showToast('Terjadi kesalahan koneksi ke server.', 'error')
    } finally {
      setActionSubmitting(false)
    }
  }

  // Open Detail Modal
  const openDetailModal = async (item: PengajuanItem) => {
    try {
      const res = await fetch(`/api/akademik/pengguguran/${item.id}`)
      const json = await res.json()
      if (json.success) {
        setSelectedItem(json.data)
      } else {
        setSelectedItem(item)
      }
      setShowDetailModal(true)
    } catch {
      setSelectedItem(item)
      setShowDetailModal(true)
    }
  }

  // Toggle Course Category (Admin Master MK)
  const handleToggleKategori = async (course: MataKuliahItem) => {
    const nextKategori = course.kategori === 'INTI' ? 'NON_INTI' : 'INTI'
    try {
      const res = await fetch('/api/akademik/pengguguran/mata-kuliah', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: course.id, kategori: nextKategori }),
      })
      const json = await res.json()
      if (json.success) {
        showToast(`Kategori mata kuliah ${course.kodeMatkul} berhasil diubah ke ${nextKategori}.`, 'success')
        fetchCourses()
      } else {
        showToast(json.error || 'Gagal mengubah kategori', 'error')
      }
    } catch {
      showToast('Gagal menghubungi server.', 'error')
    }
  }

  // Handle Extend Period Submit
  const handleExtendSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!extendModal.period) return
    if (!extendModal.newEnd) {
      showToast('Batas tanggal dan jam akhir pengajuan baru wajib diisi.', 'error')
      return
    }
    if (!extendModal.reason.trim()) {
      showToast('Alasan resmi perpanjangan periode wajib dicantumkan.', 'error')
      return
    }

    try {
      setExtendModal((prev) => ({ ...prev, submitting: true }))
      const res = await fetch(`/api/akademik/pengguguran/periode/${extendModal.period.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pengajuanEnd: extendModal.newEnd,
          alasanPerpanjangan: extendModal.reason.trim(),
        }),
      })
      const json = await res.json()
      if (json.success) {
        showToast('Periode pengajuan berhasil diperpanjang.', 'success')
        setExtendModal({ open: false, period: null, newEnd: '', reason: '', submitting: false })
        fetchPeriodes()
        fetchData()
      } else {
        showToast(json.error || 'Gagal memperpanjang periode', 'error')
        setExtendModal((prev) => ({ ...prev, submitting: false }))
      }
    } catch {
      showToast('Gagal menghubungi server.', 'error')
      setExtendModal((prev) => ({ ...prev, submitting: false }))
    }
  }

  // Role permissions
  const canVerifyProdi = currentUserRole === 'kaprodi' || currentUserRole === 'superadmin'
  const canDecideAkademik = currentUserRole === 'akademik' || currentUserRole === 'superadmin'
  const canManagePeriode = currentUserRole === 'superadmin' || currentUserRole === 'akademik'

  return (
    <div className="space-y-6">
      {/* 1. Page Header (Sesuai format resmi banner FHISIP UT gambar kedua) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#001D33] via-[#002B49] to-[#005691] text-white p-6 sm:p-8 shadow-xl border border-white/10">
        <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-amber-400/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight flex items-center gap-3">
              <LayoutGrid className="w-8 h-8 text-amber-400" />
              Pengguguran Mata Kuliah FHISIP
            </h1>
            <p className="text-sm text-slate-200 leading-relaxed">
              Layanan terpadu verifikasi dan penetapan permohonan pengguguran mata kuliah mahasiswa di lingkungan FHISIP Universitas Terbuka.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => {
                setFormError(null)
                setSelectedCourses([])
                setStudentLookupResult(null)
                setShowCreateModal(true)
              }}
              disabled={!activePeriode?.timeline.isPengajuanOpen}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold shadow-lg transition-all duration-150 ${
                activePeriode?.timeline.isPengajuanOpen
                  ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 active:scale-[0.98]'
                  : 'bg-white/10 text-white/40 cursor-not-allowed border border-white/10'
              }`}
            >
              <Plus className="w-4 h-4 font-bold" />
              <span>Ajukan Pengguguran</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Timeline Status Alert (Bebas flickering: skeleton loader saat loading, hanya render alert jika selesai dimuat) */}
      {loading ? (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4 animate-pulse">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-200"></div>
              <div className="space-y-2">
                <div className="h-4 w-52 bg-slate-200 rounded"></div>
                <div className="h-3 w-36 bg-slate-100 rounded"></div>
              </div>
            </div>
            <div className="h-7 w-40 bg-slate-100 rounded-md"></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50 space-y-2">
                <div className="h-3.5 w-28 bg-slate-200 rounded"></div>
                <div className="h-2.5 w-32 bg-slate-100 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      ) : activePeriode ? (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-ut-navy border border-blue-100 flex items-center justify-center shrink-0">
                <CalendarClock className="w-5 h-5 text-ut-navy" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">{activePeriode.nama}</h3>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    Periode Aktif
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tahun Akademik {activePeriode.tahunAkademik} &bull; Semester {activePeriode.semester}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 font-medium">Status Tahapan:</span>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${
                  activePeriode.timeline.isPengajuanOpen
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : activePeriode.timeline.isVerifikasiProdiOpen
                    ? 'bg-blue-50 text-blue-800 border border-blue-200'
                    : activePeriode.timeline.isKeputusanAkademikOpen
                    ? 'bg-purple-50 text-purple-800 border border-purple-200'
                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                {activePeriode.timeline.isPengajuanOpen
                  ? `Pengajuan Mahasiswa Buka (${activePeriode.timeline.daysRemainingPengajuan} hari lagi)`
                  : activePeriode.timeline.isVerifikasiProdiOpen
                  ? `Verifikasi Prodi Aktif (${activePeriode.timeline.daysRemainingVerifikasi} hari lagi)`
                  : activePeriode.timeline.isKeputusanAkademikOpen
                  ? `Keputusan Akademik Aktif (${activePeriode.timeline.daysRemainingAkademik} hari lagi)`
                  : 'Periode Selesai/Ditutup'}
              </span>
            </div>
          </div>

          {/* Stepper Timeline Visual (Tersusun rapi dengan hierarki seimbang, bukan kotak warna-warni acak) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div
              className={`p-3 rounded-xl border transition ${
                activePeriode.timeline.isPengajuanOpen
                  ? 'bg-slate-50/90 border-slate-300 text-slate-900 shadow-2xs'
                  : 'bg-slate-50/50 border-slate-200 text-slate-600'
              }`}
            >
              <div className="flex items-center justify-between font-bold text-slate-800">
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 text-[10px] inline-flex items-center justify-center font-bold">1</span>
                  Pembukaan Pengajuan
                </span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                    activePeriode.timeline.isPengajuanOpen
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {activePeriode.timeline.isPengajuanOpen ? 'Buka' : 'Tutup'}
                </span>
              </div>
              <p className="mt-1.5 text-[11px] text-slate-500">
                {formatWIBDateShort(activePeriode.pengajuanStart)} &ndash; {formatWIBDateShort(activePeriode.pengajuanEnd)}
              </p>
            </div>

            <div
              className={`p-3 rounded-xl border transition ${
                activePeriode.timeline.isVerifikasiProdiOpen
                  ? 'bg-slate-50/90 border-slate-300 text-slate-900 shadow-2xs'
                  : 'bg-slate-50/50 border-slate-200 text-slate-600'
              }`}
            >
              <div className="flex items-center justify-between font-bold text-slate-800">
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 text-[10px] inline-flex items-center justify-center font-bold">2</span>
                  Verifikasi Prodi
                </span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                    activePeriode.timeline.isVerifikasiProdiOpen
                      ? 'bg-blue-50 text-blue-800 border border-blue-200'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {activePeriode.timeline.isVerifikasiProdiOpen ? 'Aktif' : 'Tutup'}
                </span>
              </div>
              <p className="mt-1.5 text-[11px] text-slate-500">
                {formatWIBDateShort(activePeriode.verifikasiProdiStart)} &ndash; {formatWIBDateShort(activePeriode.verifikasiProdiEnd)}
              </p>
            </div>

            <div
              className={`p-3 rounded-xl border transition ${
                activePeriode.timeline.isKeputusanAkademikOpen
                  ? 'bg-slate-50/90 border-slate-300 text-slate-900 shadow-2xs'
                  : 'bg-slate-50/50 border-slate-200 text-slate-600'
              }`}
            >
              <div className="flex items-center justify-between font-bold text-slate-800">
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 text-[10px] inline-flex items-center justify-center font-bold">3</span>
                  Keputusan Akademik
                </span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                    activePeriode.timeline.isKeputusanAkademikOpen
                      ? 'bg-purple-50 text-purple-800 border border-purple-200'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {activePeriode.timeline.isKeputusanAkademikOpen ? 'Aktif' : 'Tutup'}
                </span>
              </div>
              <p className="mt-1.5 text-[11px] text-slate-500">
                {formatWIBDateShort(activePeriode.keputusanAkademikStart)} &ndash; {formatWIBDateShort(activePeriode.keputusanAkademikEnd)}
              </p>
            </div>

            <div className="p-3 rounded-xl border bg-slate-50/50 border-slate-200 text-slate-600">
              <div className="flex items-center justify-between font-bold text-slate-800">
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 text-[10px] inline-flex items-center justify-center font-bold">4</span>
                  Pengumuman Hasil
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500">
                  Jadwal
                </span>
              </div>
              <p className="mt-1.5 text-[11px] text-slate-500">
                {formatWIBDateShort(activePeriode.pengumumanDate)}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3 shadow-2xs">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-sm">Belum Ada Periode Pengguguran Aktif</p>
            <p className="mt-0.5 text-slate-600">
              Saat ini tidak ada periode pengajuan pengguguran yang aktif. Administrator Fakultas dapat mengaktifkan atau menjadwalkan periode baru pada tab &quot;Pengaturan Periode & Master MK&quot;.
            </p>
          </div>
        </div>
      )}

      {/* 3. Summary Metric Cards (Aksen border atas elegan & konsisten) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {[
          { label: 'Total Pengajuan', val: summary.total, icon: Layers, borderColor: 'border-t-slate-700', iconBg: 'bg-slate-100 text-slate-700' },
          { label: 'Menunggu Prodi', val: summary.menungguProdi, icon: Clock, borderColor: 'border-t-amber-500', iconBg: 'bg-amber-50 text-amber-700' },
          { label: 'Disetujui Prodi', val: summary.disetujuiProdi, icon: CheckCircle2, borderColor: 'border-t-blue-600', iconBg: 'bg-blue-50 text-blue-700' },
          { label: 'Disetujui Akhir', val: summary.disetujuiAkademik, icon: ShieldCheck, borderColor: 'border-t-emerald-600', iconBg: 'bg-emerald-50 text-emerald-700' },
          { label: 'Ditolak', val: summary.ditolak, icon: XCircle, borderColor: 'border-t-rose-500', iconBg: 'bg-rose-50 text-rose-700' },
        ].map((s) => (
          <div
            key={s.label}
            className={`bg-white p-4 rounded-xl border border-slate-200/90 border-t-2 ${s.borderColor} shadow-2xs hover:shadow-xs transition`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">{s.label}</span>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${s.iconBg}`}>
                <s.icon className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 mt-2">{s.val}</div>
          </div>
        ))}
      </div>

      {/* 4. Nav Tabs (Desain satu sistem bar yang rapi dan seragam) */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100/90 border border-slate-200/80 rounded-xl">
        <button
          onClick={() => setActiveTab('semua')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
            activeTab === 'semua'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-slate-500" />
          <span>Semua Pengajuan</span>
          <span className="px-1.5 py-0.2 rounded-md bg-slate-100 text-[10px] font-bold text-slate-700">
            {summary.total}
          </span>
        </button>

        {canVerifyProdi && (
          <button
            onClick={() => setActiveTab('verifikasi-prodi')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
              activeTab === 'verifikasi-prodi'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>Antrean Verifikasi Prodi</span>
            <span className="px-1.5 py-0.2 rounded-md bg-amber-50 text-[10px] font-bold text-amber-800 border border-amber-200">
              {summary.menungguProdi}
            </span>
          </button>
        )}

        {canDecideAkademik && (
          <button
            onClick={() => setActiveTab('keputusan-akademik')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
              activeTab === 'keputusan-akademik'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Antrean Akademik</span>
            <span className="px-1.5 py-0.2 rounded-md bg-blue-50 text-[10px] font-bold text-blue-800 border border-blue-200">
              {summary.disetujuiProdi}
            </span>
          </button>
        )}

        {canManagePeriode && (
          <button
            onClick={() => setActiveTab('periode-master')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
              activeTab === 'periode-master'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-ut-navy" />
            <span>Pengaturan Periode & Master MK</span>
          </button>
        )}
      </div>

      {/* 5. Main Tab Content */}
      {activeTab === 'semua' && (
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden">
          {/* Filters Bar */}
          <div className="p-3.5 sm:p-4 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-3 bg-slate-50/50">
            <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari NIM, Nama, Kode MK, No Pengajuan..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setPage(1)
                  }}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-ut-navy/20 focus:border-ut-navy"
                />
              </div>

              {/* Filter Prodi */}
              <select
                value={selectedProdi}
                onChange={(e) => {
                  setSelectedProdi(e.target.value)
                  setPage(1)
                }}
                className="px-3 py-1.5 text-xs border border-slate-200 bg-white rounded-xl font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-ut-navy/20 focus:border-ut-navy"
              >
                <option value="ALL">Semua Program Studi</option>
                {PRODI_OPTIONS.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.name}
                  </option>
                ))}
              </select>

              {/* Filter Status */}
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value)
                  setPage(1)
                }}
                className="px-3 py-1.5 text-xs border border-slate-200 bg-white rounded-xl font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-ut-navy/20 focus:border-ut-navy"
              >
                <option value="ALL">Semua Status</option>
                <option value="MENUNGGU_VERIFIKASI_PRODI">Menunggu Prodi</option>
                <option value="DISETUJUI_PRODI">Disetujui Prodi</option>
                <option value="DISETUJUI_AKADEMIK">Disetujui Akademik (Selesai)</option>
                <option value="DITOLAK_PRODI">Ditolak Prodi</option>
                <option value="DITOLAK_AKADEMIK">Ditolak Akademik</option>
              </select>
            </div>

            <button
              onClick={() => fetchData()}
              className="self-end sm:self-auto p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left min-w-[800px]">
              <thead className="bg-slate-50/80 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">No. Pengajuan</th>
                  <th className="px-4 py-3">Mahasiswa</th>
                  <th className="px-4 py-3">Program Studi</th>
                  <th className="px-4 py-3">Mata Kuliah</th>
                  <th className="px-4 py-3">Kategori</th>
                  <th className="px-4 py-3">Tanggal Diajukan</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-ut-navy" />
                      <span>Memuat data pengajuan...</span>
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-400">
                      <BookX className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="font-semibold text-slate-600">Belum ada pengajuan pengguguran mata kuliah</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Gunakan tombol &quot;Ajukan Pengguguran&quot; untuk membuat pengajuan baru.
                      </p>
                    </td>
                  </tr>
                ) : (
                  items.map((item) => {
                    const st = STATUS_MAP[item.status] || {
                      label: item.status,
                      badgeBg: 'bg-slate-50 text-slate-700 border-slate-200',
                    }

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition">
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">{item.nomorPengajuan}</td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900">{cleanStudentName(item.namaMahasiswa)}</div>
                          <div className="text-[11px] text-slate-500">NIM: {item.nim}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-bold text-slate-800">{item.prodiCode}</span>
                          <span className="text-[11px] text-slate-500 block truncate max-w-[140px]">{getProdiNameByCode(item.prodiCode)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900">{item.kodeMatkul}</div>
                          <div className="text-[11px] text-slate-500 truncate max-w-[200px]">{item.namaMatkul}</div>
                          <span className="text-[10px] text-slate-400">{item.sks} SKS</span>
                        </td>
                        <td className="px-4 py-3">
                          {item.kategoriMatkul === 'INTI' ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200 inline-block">
                              Inti
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 inline-block">
                              Non-Inti
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{formatWIBDate(item.createdAt)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold border ${st.badgeBg}`}>
                            {st.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => openDetailModal(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                            <span>Detail</span>
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={page}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}

      {/* Tab: Verifikasi Prodi */}
      {activeTab === 'verifikasi-prodi' && (
        <div className="space-y-4">
          <div className="bg-amber-50/90 border border-amber-200 text-amber-900 rounded-2xl p-4 flex items-start gap-3 shadow-2xs">
            <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold text-sm">Halaman Verifikasi Program Studi</p>
              <p className="mt-0.5 text-amber-800">
                Daftar pengajuan berikut sedang menunggu keputusan verifikasi oleh Kaprodi / Petugas Program Studi yang
                berwenang. Pengajuan yang disetujui akan diteruskan secara otomatis ke bagian Akademik.
              </p>
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left min-w-[800px]">
                <thead className="bg-slate-50/80 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">No. Pengajuan</th>
                    <th className="px-4 py-3">Mahasiswa</th>
                    <th className="px-4 py-3">Prodi</th>
                    <th className="px-4 py-3">Mata Kuliah</th>
                    <th className="px-4 py-3">Alasan Pengguguran</th>
                    <th className="px-4 py-3 text-center">Tindakan Prodi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {prodiPendingItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-400">
                        <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                        <p className="font-semibold text-slate-600">Tidak ada pengajuan yang menunggu verifikasi Prodi saat ini.</p>
                      </td>
                    </tr>
                  ) : (
                    prodiPendingItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition">
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">{item.nomorPengajuan}</td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900">{cleanStudentName(item.namaMahasiswa)}</div>
                          <div className="text-[11px] text-slate-500">NIM: {item.nim}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-bold text-slate-800">{item.prodiCode}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900">{item.kodeMatkul}</div>
                          <div className="text-[11px] text-slate-500 truncate max-w-[180px]">{item.namaMatkul}</div>
                          <span className="text-[10px] text-emerald-700 font-bold">Non-Inti ({item.sks} SKS)</span>
                        </td>
                        <td className="px-4 py-3 max-w-xs">
                          <p className="text-slate-600 line-clamp-2 italic">&ldquo;{item.alasan}&rdquo;</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => openDetailModal(item)}
                              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold"
                            >
                              Detail
                            </button>
                            <button
                              onClick={() => openActionDialog(item, 'PRODI', 'SETUJU')}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
                            >
                              Setujui
                            </button>
                            <button
                              onClick={() => openActionDialog(item, 'PRODI', 'TOLAK')}
                              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs"
                            >
                              Tolak
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Keputusan Akademik */}
      {activeTab === 'keputusan-akademik' && (
        <div className="space-y-4">
          <div className="bg-blue-50/90 border border-blue-200 text-blue-900 rounded-2xl p-4 flex items-start gap-3 shadow-2xs">
            <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold text-sm">Halaman Keputusan Akhir Bagian Akademik</p>
              <p className="mt-0.5 text-blue-800">
                Menampilkan pengajuan yang telah mendapatkan persetujuan dari Program Studi. Bagian Akademik berwenang
                memberikan keputusan akhir untuk menyelesaikan proses pengguguran secara sah.
              </p>
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left min-w-[800px]">
                <thead className="bg-slate-50/80 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">No. Pengajuan</th>
                    <th className="px-4 py-3">Mahasiswa</th>
                    <th className="px-4 py-3">Prodi</th>
                    <th className="px-4 py-3">Mata Kuliah</th>
                    <th className="px-4 py-3">Verifikasi Prodi</th>
                    <th className="px-4 py-3 text-center">Keputusan Akademik</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {akademikPendingItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-400">
                        <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                        <p className="font-semibold text-slate-600">Tidak ada pengajuan yang menunggu keputusan Akademik saat ini.</p>
                      </td>
                    </tr>
                  ) : (
                    akademikPendingItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition">
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">{item.nomorPengajuan}</td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900">{cleanStudentName(item.namaMahasiswa)}</div>
                          <div className="text-[11px] text-slate-500">NIM: {item.nim}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-bold text-slate-800">{item.prodiCode}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900">{item.kodeMatkul}</div>
                          <div className="text-[11px] text-slate-500 truncate max-w-[180px]">{item.namaMatkul}</div>
                          <span className="text-[10px] text-emerald-700 font-bold">Non-Inti ({item.sks} SKS)</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-emerald-700 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Disetujui Prodi
                          </div>
                          <div className="text-[10px] text-slate-500">Oleh: {item.verifikatorProdiName || 'Petugas Prodi'}</div>
                          {item.catatanProdi && (
                            <div className="text-[10px] text-slate-600 italic mt-0.5">&ldquo;{item.catatanProdi}&rdquo;</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => openDetailModal(item)}
                              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold"
                            >
                              Detail
                            </button>
                            <button
                              onClick={() => openActionDialog(item, 'AKADEMIK', 'SETUJU')}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
                            >
                              Setujui Akhir
                            </button>
                            <button
                              onClick={() => openActionDialog(item, 'AKADEMIK', 'TOLAK')}
                              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs"
                            >
                              Tolak
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Pengaturan Periode & Master MK */}
      {activeTab === 'periode-master' && (
        <div className="space-y-6">
          {/* Section 1: Daftar Periode & Timeline */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Pengaturan Periode & Timeline Pengguguran</h3>
                <p className="text-xs text-slate-500">
                  Tentukan tanggal dan waktu pembukaan pengajuan, verifikasi Prodi, serta keputusan Akademik (WIB).
                </p>
              </div>

              {currentUserRole === 'superadmin' && (
                <button
                  onClick={() => {
                    setPeriodeForm({
                      nama: `Periode Pengguguran Semester 2026.2`,
                      tahunAkademik: '2026/2027 Genap',
                      semester: '20262',
                      pengajuanStart: '2026-12-01T08:00',
                      pengajuanEnd: '2026-12-10T23:59',
                      verifikasiProdiStart: '2026-12-11T08:00',
                      verifikasiProdiEnd: '2026-12-18T23:59',
                      keputusanAkademikStart: '2026-12-19T08:00',
                      keputusanAkademikEnd: '2026-12-25T23:59',
                      pengumumanDate: '2026-12-28T08:00',
                      keterangan: 'Jadwal resmi pengguguran mata kuliah semester genap.',
                      isActive: false,
                    })
                    setShowPeriodeModal(true)
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-ut-navy hover:bg-ut-navy/90 text-white text-xs font-semibold shadow-xs transition"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-400" />
                  <span>Tambah Periode Baru</span>
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left min-w-[700px]">
                <thead className="bg-slate-50/80 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Nama Periode</th>
                    <th className="px-4 py-3">Semester</th>
                    <th className="px-4 py-3">Tahap Pengajuan</th>
                    <th className="px-4 py-3">Verifikasi Prodi</th>
                    <th className="px-4 py-3">Keputusan Akademik</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allPeriodes.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 font-bold text-slate-900">{p.nama}</td>
                      <td className="px-4 py-3 text-slate-600">{p.semester}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatWIBDateShort(p.pengajuanStart)} s/d {formatWIBDateShort(p.pengajuanEnd)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatWIBDateShort(p.verifikasiProdiStart)} s/d {formatWIBDateShort(p.verifikasiProdiEnd)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatWIBDateShort(p.keputusanAkademikStart)} s/d {formatWIBDateShort(p.keputusanAkademikEnd)}
                      </td>
                      <td className="px-4 py-3">
                        {p.isActive ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Aktif
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            Nonaktif
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {currentUserRole === 'superadmin' && (
                          <button
                            onClick={() => {
                              const defaultDate = p.pengajuanEnd
                                ? new Date(p.pengajuanEnd).toISOString().slice(0, 16)
                                : '2026-12-31T23:59'
                              setExtendModal({
                                open: true,
                                period: p,
                                newEnd: defaultDate,
                                reason: '',
                                submitting: false,
                              })
                            }}
                            className="px-2.5 py-1 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition"
                          >
                            Perpanjang
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Master Mata Kuliah & Kategori */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Master Data Kategori Mata Kuliah (Inti / Non-Inti)</h3>
                <p className="text-xs text-slate-500">
                  Data resmi ketetapan kategori mata kuliah. Mata kuliah <strong>Inti</strong> tidak dapat digugurkan.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Cari Kode / Nama MK..."
                  value={courseSearch}
                  onChange={(e) => {
                    setCourseSearch(e.target.value)
                    fetchCourses(undefined, e.target.value)
                  }}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-ut-navy/20"
                />
              </div>
            </div>

            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-xs text-left min-w-[650px]">
                <thead className="bg-slate-50/80 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200 sticky top-0 bg-slate-50">
                  <tr>
                    <th className="px-4 py-2.5">Kode</th>
                    <th className="px-4 py-2.5">Nama Mata Kuliah</th>
                    <th className="px-4 py-2.5">SKS</th>
                    <th className="px-4 py-2.5">Program Studi</th>
                    <th className="px-4 py-2.5">Kategori</th>
                    {canManagePeriode && <th className="px-4 py-2.5 text-center">Kelola Kategori</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {mataKuliahList.slice(0, 30).map((mk) => (
                    <tr key={mk.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-2.5 font-mono font-bold text-slate-900">{mk.kodeMatkul}</td>
                      <td className="px-4 py-2.5 font-medium text-slate-800">{mk.namaMatkul}</td>
                      <td className="px-4 py-2.5 text-slate-500">{mk.sks} SKS</td>
                      <td className="px-4 py-2.5 text-slate-700 font-medium">{mk.prodiCode}</td>
                      <td className="px-4 py-2.5">
                        {mk.kategori === 'INTI' ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200 inline-block">
                            Inti (Wajib / Tidak Dapat Digugurkan)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 inline-block">
                            Non-Inti (Dapat Diajukan)
                          </span>
                        )}
                      </td>
                      {canManagePeriode && (
                        <td className="px-4 py-2.5 text-center">
                          <button
                            onClick={() => handleToggleKategori(mk)}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 text-[11px] font-semibold transition"
                          >
                            Ubah ke {mk.kategori === 'INTI' ? 'Non-Inti' : 'Inti'}
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-slate-400 italic">
              Menampilkan {Math.min(30, mataKuliahList.length)} dari {mataKuliahList.length} mata kuliah. Gunakan pencarian untuk mencari mata kuliah spesifik.
            </p>
          </div>
        </div>
      )}

      {/* MODAL 1: Form Pengajuan Pengguguran Baru (createPortal document.body) */}
      {mounted && showCreateModal && createPortal(
        <div
          className="fixed inset-0 w-screen h-screen min-h-screen bg-slate-900/60 backdrop-blur-sm z-[999999] p-4 overflow-y-auto flex items-center justify-center animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
          onClick={() => {
            if (!formSubmitting) setShowCreateModal(false)
          }}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 my-auto animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 text-ut-navy">
                  <BookX className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Ajukan Pengguguran Mata Kuliah</h3>
                  <p className="text-xs text-slate-500">Pilih mata kuliah & lengkapi data permohonan</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4 text-xs overflow-y-auto">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Data Mahasiswa (Auto-lookup dari NIM ke Database) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    NIM Mahasiswa *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="Contoh: 045130359"
                      value={formNim}
                      onChange={(e) => setFormNim(e.target.value)}
                      className="w-full px-3 py-2 pr-9 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-ut-navy/20 font-mono font-medium"
                    />
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
                      {studentLookupLoading && (
                        <Loader2 className="w-4 h-4 animate-spin text-ut-navy" />
                      )}
                      {!studentLookupLoading && studentLookupResult && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      )}
                    </div>
                  </div>
                  {studentLookupLoading && (
                    <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Memeriksa data mahasiswa...
                    </p>
                  )}
                  {!studentLookupLoading && studentLookupResult && (
                    <p className="text-[11px] text-emerald-700 font-medium mt-1 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5 text-emerald-600" /> Terdaftar: {studentLookupResult.prodiName}
                    </p>
                  )}
                  {!studentLookupLoading && studentLookupError && (
                    <p className="text-[11px] text-rose-600 mt-1 font-medium">
                      {studentLookupError}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Nama Mahasiswa *</span>
                    {studentLookupResult && (
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 inline-flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-600" /> Terverifikasi
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nama Lengkap"
                    value={formNama}
                    onChange={(e) => setFormNama(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-ut-navy/20 font-medium ${
                      studentLookupResult ? 'bg-slate-50/80 text-slate-900 font-bold' : ''
                    }`}
                  />
                </div>
              </div>

              {/* Identitas Mahasiswa Terverifikasi Info Card */}
              {studentLookupResult && (() => {
                const statusInfo = formatAcademicStatus(studentLookupResult.status)
                return (
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-ut-navy" />
                        Data Mahasiswa
                      </span>
                      <span
                        title={statusInfo.fullText}
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${statusInfo.badgeBg} ${statusInfo.badgeText} ${statusInfo.badgeBorder}`}
                      >
                        Status: {statusInfo.label}
                      </span>
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-sm">
                        {cleanStudentName(studentLookupResult.name)}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        NIM: <span className="font-mono font-bold text-slate-700">{studentLookupResult.nim}</span> &bull; {studentLookupResult.prodiName} ({studentLookupResult.officialProdiCode}) &bull; Semester {studentLookupResult.semester}
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* Pilih Mata Kuliah Non-Inti (Multi-select) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <label className="block font-semibold text-slate-700">
                      Pilih Mata Kuliah Non-Inti *
                    </label>
                    <span className="text-[11px] text-slate-500 block">
                      Pilih satu atau beberapa mata kuliah yang diajukan untuk digugurkan
                    </span>
                  </div>
                  {selectedCourses.length > 0 && (
                    <span className="text-[11px] font-bold text-ut-navy shrink-0">
                      {selectedCourses.length} mata kuliah dipilih
                    </span>
                  )}
                </div>

                <div className="space-y-2 mt-1.5">
                  <input
                    type="text"
                    placeholder="Cari kode atau nama mata kuliah..."
                    value={courseSearch}
                    onChange={(e) => setCourseSearch(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-ut-navy/20"
                  />

                  {/* Course Suggestions Checklist */}
                  <div className="border border-slate-200 rounded-xl max-h-48 overflow-y-auto divide-y divide-slate-100 bg-white">
                    {mataKuliahList.filter((c) => {
                      if (!c.kodeMatkul.toUpperCase().startsWith('FS')) return false
                      if (!courseSearch.trim()) return true
                      const q = courseSearch.toLowerCase()
                      return c.kodeMatkul.toLowerCase().includes(q) || c.namaMatkul.toLowerCase().includes(q)
                    }).length === 0 ? (
                      <div className="p-4 text-center text-slate-400">
                        Tidak ada mata kuliah yang sesuai dengan kriteria pencarian.
                      </div>
                    ) : (
                      mataKuliahList
                        .filter((c) => {
                          if (!c.kodeMatkul.toUpperCase().startsWith('FS')) return false
                          if (!courseSearch.trim()) return true
                          const q = courseSearch.toLowerCase()
                          return c.kodeMatkul.toLowerCase().includes(q) || c.namaMatkul.toLowerCase().includes(q)
                        })
                        .map((c) => {
                          const isSelected = selectedCourses.some((sc) => sc.id === c.id)
                          const isInti = c.kategori === 'INTI'

                          return (
                            <div
                              key={c.id}
                              onClick={() => {
                                if (!isInti) toggleCourseSelection(c)
                              }}
                              className={`p-2.5 flex items-center justify-between gap-3 transition ${
                                isInti
                                  ? 'bg-slate-50/70 opacity-60 cursor-not-allowed'
                                  : isSelected
                                  ? 'bg-blue-50/90 cursor-pointer font-medium'
                                  : 'hover:bg-slate-50 cursor-pointer'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <input
                                  type="checkbox"
                                  disabled={isInti}
                                  checked={isSelected}
                                  onChange={() => toggleCourseSelection(c)}
                                  className="w-4 h-4 rounded text-ut-navy focus:ring-ut-navy/20 cursor-pointer"
                                />
                                <div className="truncate">
                                  <span className="font-bold text-slate-900 font-mono">{c.kodeMatkul}</span> &ndash;{' '}
                                  <span className="text-slate-700">{c.namaMatkul}</span>
                                  <span className="text-[10px] text-slate-400 block">
                                    {c.sks} SKS &bull; {getProdiNameByCode(c.prodiCode)}
                                  </span>
                                </div>
                              </div>
                              <div className="shrink-0">
                                {isInti ? (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                                    Mata Kuliah Inti
                                  </span>
                                ) : isSelected ? (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                    Terpilih
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                    Dapat Diajukan
                                  </span>
                                )}
                              </div>
                            </div>
                          )
                        })
                    )}
                  </div>

                  {/* Selected Courses Summary Box */}
                  {selectedCourses.length > 0 && (
                    <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-950 text-xs">
                          Mata Kuliah Terpilih ({selectedCourses.length} MK &bull; Total {selectedCourses.reduce((sum, c) => sum + c.sks, 0)} SKS)
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedCourses([])}
                          className="text-[10px] text-emerald-700 hover:text-emerald-900 underline font-semibold"
                        >
                          Hapus Semua
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedCourses.map((c) => (
                          <span
                            key={c.id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-emerald-300 text-emerald-900 text-[11px] font-medium shadow-2xs"
                          >
                            <span className="font-bold">{c.kodeMatkul}</span> &ndash; {c.namaMatkul} ({c.sks} SKS)
                            <button
                              type="button"
                              onClick={() => toggleCourseSelection(c)}
                              className="text-slate-400 hover:text-rose-600 transition"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Alasan Pengguguran */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Alasan Pengguguran *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Jelaskan alasan akademik atau administrasi mahasiswa mengajukan pengguguran mata kuliah ini..."
                  value={formAlasan}
                  onChange={(e) => setFormAlasan(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-ut-navy/20"
                />
              </div>

              {/* Periode Aktif Info */}
              {activePeriode && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-[11px]">
                  Diajukan pada periode: <strong>{activePeriode.nama}</strong> ({activePeriode.semester})
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={formSubmitting}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting || selectedCourses.length === 0}
                  className={`px-5 py-2 rounded-xl font-semibold shadow-xs flex items-center gap-1.5 transition ${
                    formSubmitting || selectedCourses.length === 0
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-ut-navy hover:bg-ut-navy/90 text-white'
                  }`}
                >
                  {formSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Mengirim Permohonan...</span>
                    </>
                  ) : (
                    <span>
                      Kirim Permohonan Pengguguran {selectedCourses.length > 0 ? `(${selectedCourses.length} Mata Kuliah)` : ''}
                    </span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 2: Detail Pengajuan (createPortal document.body) */}
      {mounted && showDetailModal && selectedItem && createPortal(
        <div
          className="fixed inset-0 w-screen h-screen min-h-screen bg-slate-900/60 backdrop-blur-sm z-[999999] p-4 overflow-y-auto flex items-center justify-center animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowDetailModal(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 my-auto max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 sticky top-0 bg-white z-10">
              <div>
                <span className="font-mono text-xs text-ut-blue font-bold">{selectedItem.nomorPengajuan}</span>
                <h3 className="font-bold text-slate-900 text-base">Detail & Progres Pengajuan Pengguguran</h3>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto">
              {/* Visual Progress Stepper */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                  Alur Tahapan Persetujuan
                </p>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  {/* Step 1: Submit */}
                  <div className="space-y-1">
                    <div className="w-8 h-8 mx-auto rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                      <Check className="w-4 h-4" />
                    </div>
                    <div className="font-bold text-slate-800 text-[11px]">Pengajuan</div>
                    <div className="text-[10px] text-slate-400">Terkirim</div>
                  </div>

                  {/* Step 2: Prodi */}
                  <div className="space-y-1">
                    <div
                      className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center font-bold text-xs shadow-sm ${
                        selectedItem.status === 'MENUNGGU_VERIFIKASI_PRODI'
                          ? 'bg-amber-500 text-white animate-pulse'
                          : selectedItem.status === 'DITOLAK_PRODI'
                          ? 'bg-rose-600 text-white'
                          : 'bg-emerald-600 text-white'
                      }`}
                    >
                      {selectedItem.status === 'DITOLAK_PRODI' ? (
                        <X className="w-4 h-4" />
                      ) : selectedItem.status === 'MENUNGGU_VERIFIKASI_PRODI' ? (
                        <Clock className="w-4 h-4" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                    </div>
                    <div className="font-bold text-slate-800 text-[11px]">Verifikasi Prodi</div>
                    <div className="text-[10px] text-slate-500">
                      {selectedItem.status === 'MENUNGGU_VERIFIKASI_PRODI'
                        ? 'Menunggu'
                        : selectedItem.status === 'DITOLAK_PRODI'
                        ? 'Ditolak Prodi'
                        : 'Disetujui'}
                    </div>
                  </div>

                  {/* Step 3: Akademik */}
                  <div className="space-y-1">
                    <div
                      className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center font-bold text-xs shadow-sm ${
                        selectedItem.status === 'DISETUJUI_PRODI'
                          ? 'bg-blue-600 text-white animate-pulse'
                          : selectedItem.status === 'DISETUJUI_AKADEMIK'
                          ? 'bg-emerald-600 text-white'
                          : selectedItem.status === 'DITOLAK_AKADEMIK'
                          ? 'bg-rose-600 text-white'
                          : 'bg-slate-200 text-slate-400'
                      }`}
                    >
                      {selectedItem.status === 'DISETUJUI_AKADEMIK' ? (
                        <Check className="w-4 h-4" />
                      ) : selectedItem.status === 'DITOLAK_AKADEMIK' ? (
                        <X className="w-4 h-4" />
                      ) : selectedItem.status === 'DISETUJUI_PRODI' ? (
                        <Clock className="w-4 h-4" />
                      ) : (
                        <span className="text-xs">3</span>
                      )}
                    </div>
                    <div className="font-bold text-slate-800 text-[11px]">Keputusan Akademik</div>
                    <div className="text-[10px] text-slate-500">
                      {selectedItem.status === 'DISETUJUI_AKADEMIK'
                        ? 'Disetujui'
                        : selectedItem.status === 'DITOLAK_AKADEMIK'
                        ? 'Ditolak'
                        : selectedItem.status === 'DISETUJUI_PRODI'
                        ? 'Menunggu'
                        : '-'}
                    </div>
                  </div>

                  {/* Step 4: Selesai */}
                  <div className="space-y-1">
                    <div
                      className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center font-bold text-xs shadow-sm ${
                        selectedItem.status === 'DISETUJUI_AKADEMIK'
                          ? 'bg-emerald-600 text-white'
                          : selectedItem.status.includes('DITOLAK')
                          ? 'bg-rose-600 text-white'
                          : 'bg-slate-200 text-slate-400'
                      }`}
                    >
                      {selectedItem.status === 'DISETUJUI_AKADEMIK' ? (
                        <Check className="w-4 h-4" />
                      ) : selectedItem.status.includes('DITOLAK') ? (
                        <X className="w-4 h-4" />
                      ) : (
                        <span className="text-xs">4</span>
                      )}
                    </div>
                    <div className="font-bold text-slate-800 text-[11px]">Hasil Akhir</div>
                    <div className="text-[10px] text-slate-500">
                      {selectedItem.status === 'DISETUJUI_AKADEMIK'
                        ? 'Selesai (Gugur)'
                        : selectedItem.status.includes('DITOLAK')
                        ? 'Selesai (Ditolak)'
                        : 'Dalam Proses'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Data Detail Cards */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl border border-slate-200 space-y-2">
                  <p className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Data Mahasiswa & Prodi</p>
                  <div>
                    <span className="text-slate-400 block">Nama Mahasiswa:</span>
                    <span className="font-bold text-slate-800">{cleanStudentName(selectedItem.namaMahasiswa)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">NIM:</span>
                    <span className="font-mono text-slate-700">{selectedItem.nim}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Program Studi:</span>
                    <span className="font-semibold text-slate-700">
                      {selectedItem.prodiName} ({selectedItem.prodiCode})
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 space-y-2">
                  <p className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Data Mata Kuliah</p>
                  <div>
                    <span className="text-slate-400 block">Mata Kuliah:</span>
                    <span className="font-bold text-slate-800">
                      {selectedItem.kodeMatkul} - {selectedItem.namaMatkul}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Bobot SKS:</span>
                    <span className="text-slate-700">{selectedItem.sks} SKS</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Kategori:</span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 inline-block">
                      {selectedItem.kategoriMatkul} (Dapat Diajukan)
                    </span>
                  </div>
                </div>
              </div>

              {/* Alasan Pengguguran */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <span className="font-bold text-slate-700 block mb-1">Alasan Pengguguran dari Pengaju:</span>
                <p className="text-slate-700 italic">&ldquo;{selectedItem.alasan}&rdquo;</p>
                <div className="text-[10px] text-slate-400 mt-2">
                  Diajukan oleh {selectedItem.pengaju?.name} pada {formatWIBDate(selectedItem.createdAt)}
                </div>
              </div>

              {/* Riwayat Keputusan Prodi */}
              {selectedItem.verifikasiProdiAt && (
                <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 text-xs space-y-1">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-blue-900">Keputusan Program Studi:</span>
                    <span className="text-blue-700">{selectedItem.status.includes('DITOLAK_PRODI') ? 'DITOLAK' : 'DISETUJUI'}</span>
                  </div>
                  <p className="text-slate-700">
                    <strong>Catatan:</strong> {selectedItem.catatanProdi || 'Tidak ada catatan khusus.'}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Diverifikasi oleh: {selectedItem.verifikatorProdiName} ({formatWIBDate(selectedItem.verifikasiProdiAt)})
                  </p>
                </div>
              )}

              {/* Riwayat Keputusan Akademik */}
              {selectedItem.keputusanAkademikAt && (
                <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/50 text-xs space-y-1">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-purple-900">Keputusan Akhir Bagian Akademik:</span>
                    <span className="text-purple-700">{selectedItem.status.includes('DITOLAK') ? 'DITOLAK' : 'DISETUJUI'}</span>
                  </div>
                  <p className="text-slate-700">
                    <strong>Catatan:</strong> {selectedItem.catatanAkademik || 'Tidak ada catatan khusus.'}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Diputuskan oleh: {selectedItem.keputusanAkademikName} ({formatWIBDate(selectedItem.keputusanAkademikAt)})
                  </p>
                </div>
              )}

              {/* Audit Log Timeline */}
              {selectedItem.riwayat && selectedItem.riwayat.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Catatan Audit & Jejak Perubahan
                  </p>
                  <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 text-xs">
                    {selectedItem.riwayat.map((r: any, idx: number) => (
                      <div key={idx} className="p-3 flex items-start justify-between">
                        <div>
                          <span className="font-bold text-slate-800">{r.actorName}</span>{' '}
                          <span className="text-slate-500">({r.actorRole}):</span>{' '}
                          <span className="text-slate-700">{r.catatan}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0 ml-2">{formatWIBDate(r.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-semibold hover:bg-slate-700"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 3: Dialog Konfirmasi Aksi (Setujui / Tolak oleh Prodi atau Akademik) */}
      {mounted && showActionModal && selectedItem && createPortal(
        <div
          className="fixed inset-0 w-screen h-screen min-h-screen bg-slate-900/60 backdrop-blur-sm z-[999999] p-4 overflow-y-auto flex items-center justify-center animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
          onClick={() => {
            if (!actionSubmitting) setShowActionModal(false)
          }}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 my-auto animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-900 text-base">
                {actionType === 'PRODI' ? 'Verifikasi Program Studi' : 'Keputusan Bagian Akademik'}
              </h3>
              <button
                onClick={() => setShowActionModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900 text-sm">{cleanStudentName(selectedItem.namaMahasiswa)}</div>
                <div className="text-slate-600">NIM: {selectedItem.nim} &bull; {selectedItem.prodiCode}</div>
                <div className="text-slate-700 font-medium">
                  {selectedItem.kodeMatkul} &ndash; {selectedItem.namaMatkul} ({selectedItem.sks} SKS)
                </div>
              </div>

              {/* Pilihan Keputusan */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Tindakan Keputusan *</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setActionDecision('SETUJU')}
                    className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold transition ${
                      actionDecision === 'SETUJU'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Setujui</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActionDecision('TOLAK')}
                    className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold transition ${
                      actionDecision === 'TOLAK'
                        ? 'bg-rose-50 border-rose-500 text-rose-800 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <X className="w-4 h-4 text-rose-600" />
                    <span>Tolak</span>
                  </button>
                </div>
              </div>

              {/* Catatan / Alasan */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Catatan / Keterangan {actionDecision === 'TOLAK' ? '(Wajib jika ditolak) *' : '(Opsional)'}
                </label>
                <textarea
                  rows={3}
                  placeholder={
                    actionDecision === 'TOLAK'
                      ? 'Tuliskan alasan resmi penolakan untuk disampaikan ke mahasiswa...'
                      : 'Tambahkan catatan jika diperlukan...'
                  }
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-ut-navy/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowActionModal(false)}
                  disabled={actionSubmitting}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleActionSubmit}
                  disabled={actionSubmitting}
                  className={`px-5 py-2 rounded-xl font-semibold text-white shadow-xs flex items-center gap-1.5 ${
                    actionDecision === 'SETUJU' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {actionSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Simpan Keputusan</span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 4: Tambah / Edit Periode (createPortal document.body) */}
      {mounted && showPeriodeModal && createPortal(
        <div
          className="fixed inset-0 w-screen h-screen min-h-screen bg-slate-900/60 backdrop-blur-sm z-[999999] p-4 overflow-y-auto flex items-center justify-center animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowPeriodeModal(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 my-auto animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-900 text-base">Tambah Periode Pengguguran Baru</h3>
              <button
                onClick={() => setShowPeriodeModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault()
                try {
                  const res = await fetch('/api/akademik/pengguguran/periode', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(periodeForm),
                  })
                  const json = await res.json()
                  if (json.success) {
                    showToast('Periode baru berhasil dibuat dan disimpan.', 'success')
                    setShowPeriodeModal(false)
                    fetchPeriodes()
                    fetchData()
                  } else {
                    showToast(json.error || 'Gagal membuat periode.', 'error')
                  }
                } catch {
                  showToast('Gagal menghubungi server.', 'error')
                }
              }}
              className="p-5 space-y-3 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Periode</label>
                <input
                  type="text"
                  required
                  value={periodeForm.nama}
                  onChange={(e) => setPeriodeForm({ ...periodeForm, nama: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-ut-navy/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tahun Akademik</label>
                  <input
                    type="text"
                    required
                    value={periodeForm.tahunAkademik}
                    onChange={(e) => setPeriodeForm({ ...periodeForm, tahunAkademik: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-ut-navy/20"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kode Semester</label>
                  <input
                    type="text"
                    required
                    value={periodeForm.semester}
                    onChange={(e) => setPeriodeForm({ ...periodeForm, semester: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-ut-navy/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mulai Pengajuan</label>
                  <input
                    type="datetime-local"
                    required
                    value={periodeForm.pengajuanStart}
                    onChange={(e) => setPeriodeForm({ ...periodeForm, pengajuanStart: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-ut-navy/20"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Batas Pengajuan</label>
                  <input
                    type="datetime-local"
                    required
                    value={periodeForm.pengajuanEnd}
                    onChange={(e) => setPeriodeForm({ ...periodeForm, pengajuanEnd: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-ut-navy/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mulai Verifikasi Prodi</label>
                  <input
                    type="datetime-local"
                    required
                    value={periodeForm.verifikasiProdiStart}
                    onChange={(e) => setPeriodeForm({ ...periodeForm, verifikasiProdiStart: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-ut-navy/20"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Batas Verifikasi Prodi</label>
                  <input
                    type="datetime-local"
                    required
                    value={periodeForm.verifikasiProdiEnd}
                    onChange={(e) => setPeriodeForm({ ...periodeForm, verifikasiProdiEnd: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-ut-navy/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mulai Keputusan Akademik</label>
                  <input
                    type="datetime-local"
                    required
                    value={periodeForm.keputusanAkademikStart}
                    onChange={(e) => setPeriodeForm({ ...periodeForm, keputusanAkademikStart: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-ut-navy/20"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Batas Keputusan Akademik</label>
                  <input
                    type="datetime-local"
                    required
                    value={periodeForm.keputusanAkademikEnd}
                    onChange={(e) => setPeriodeForm({ ...periodeForm, keputusanAkademikEnd: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-ut-navy/20"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPeriodeModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-ut-navy hover:bg-ut-navy/90 text-white font-semibold shadow-xs transition"
                >
                  Simpan Periode
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 5: Perpanjang Masa Pengajuan Periode (Pengganti prompt browser primitif) */}
      {mounted && extendModal.open && extendModal.period && createPortal(
        <div
          className="fixed inset-0 w-screen h-screen min-h-screen bg-slate-900/60 backdrop-blur-sm z-[999999] p-4 overflow-y-auto flex items-center justify-center animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
          onClick={() => {
            if (!extendModal.submitting) {
              setExtendModal({ open: false, period: null, newEnd: '', reason: '', submitting: false })
            }
          }}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 my-auto animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-ut-navy" />
                <h3 className="font-bold text-slate-900 text-base">Perpanjang Masa Pengajuan</h3>
              </div>
              <button
                onClick={() => setExtendModal({ open: false, period: null, newEnd: '', reason: '', submitting: false })}
                className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExtendSubmit} className="p-5 space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
                <div className="font-bold text-slate-900">{extendModal.period.nama}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Batas pengajuan saat ini:{' '}
                  <span className="font-semibold text-slate-800">{formatWIBDate(extendModal.period.pengajuanEnd)}</span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Batas Tanggal & Jam Pengajuan Baru (WIB) *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={extendModal.newEnd}
                  onChange={(e) => setExtendModal((prev) => ({ ...prev, newEnd: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-ut-navy/20"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Alasan Resmi Perpanjangan (Tercatat di Audit Log) *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Contoh: Perpanjangan masa pengajuan atas disposisi pimpinan fakultas..."
                  value={extendModal.reason}
                  onChange={(e) => setExtendModal((prev) => ({ ...prev, reason: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-ut-navy/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setExtendModal({ open: false, period: null, newEnd: '', reason: '', submitting: false })}
                  disabled={extendModal.submitting}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={extendModal.submitting}
                  className="px-5 py-2 rounded-xl bg-ut-navy hover:bg-ut-navy/90 text-white font-semibold shadow-xs flex items-center gap-1.5 transition"
                >
                  {extendModal.submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Simpan Perpanjangan</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Floating Toast Notification Container (createPortal document.body) */}
      {mounted && toast && createPortal(
        <div className="fixed top-5 right-5 z-[9999999] animate-in fade-in slide-in-from-top-4 duration-200">
          <div
            className={`px-4 py-3 rounded-2xl shadow-xl border backdrop-blur-md text-xs font-semibold flex items-center gap-3 ${
              toast.type === 'success'
                ? 'bg-slate-900/95 text-emerald-400 border-emerald-500/30'
                : 'bg-slate-900/95 text-rose-400 border-rose-500/30'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span className="text-white font-medium">{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="ml-2 text-slate-400 hover:text-white p-0.5 rounded transition"
              aria-label="Tutup notifikasi"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
