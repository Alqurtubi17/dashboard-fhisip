'use client'

import React, { useState, useEffect, useMemo } from 'react'
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
  ShieldAlert,
  Info,
  CalendarClock,
  ArrowRight,
  User,
  GraduationCap,
  Building2,
  FileCheck2,
  FileX2,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react'
import { Pagination } from '@/components/ui/pagination'
import {
  PRODI_OPTIONS,
  STATUS_MAP,
  formatWIBDate,
  formatWIBDateShort,
  getProdiNameByCode,
} from '@/lib/pengguguran-utils'

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

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showActionModal, setShowActionModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState<PengajuanItem | null>(null)
  const [actionType, setActionType] = useState<'PRODI' | 'AKADEMIK'>('PRODI')
  const [actionDecision, setActionDecision] = useState<'SETUJU' | 'TOLAK'>('SETUJU')
  const [actionNotes, setActionNotes] = useState('')
  const [actionSubmitting, setActionSubmitting] = useState(false)

  // Form Pengajuan states
  const [mataKuliahList, setMataKuliahList] = useState<MataKuliahItem[]>([])
  const [courseSearch, setCourseSearch] = useState('')
  const [selectedCourse, setSelectedCourse] = useState<MataKuliahItem | null>(null)
  const [formNim, setFormNim] = useState('')
  const [formNama, setFormNama] = useState('')
  const [formAlasan, setFormAlasan] = useState('')
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Periode Edit / Perpanjangan Modal
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

  // Filtered lists for special tabs
  const prodiPendingItems = useMemo(() => {
    return items.filter((it) => it.status === 'MENUNGGU_VERIFIKASI_PRODI')
  }, [items])

  const akademikPendingItems = useMemo(() => {
    return items.filter((it) => it.status === 'DISETUJUI_PRODI')
  }, [items])

  // Handle Form Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!selectedCourse) {
      setFormError('Harap pilih mata kuliah terlebih dahulu.')
      return
    }

    if (selectedCourse.kategori === 'INTI') {
      setFormError('Mata kuliah ini termasuk kategori Mata Kuliah Inti dan tidak dapat diajukan untuk pengguguran.')
      return
    }

    if (!formNim.trim() || !formNama.trim() || !formAlasan.trim()) {
      setFormError('NIM, Nama Mahasiswa, dan Alasan pengguguran wajib diisi.')
      return
    }

    try {
      setFormSubmitting(true)
      const res = await fetch('/api/akademik/pengguguran', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nim: formNim.trim(),
          namaMahasiswa: formNama.trim(),
          prodiCode: selectedCourse.prodiCode,
          mataKuliahId: selectedCourse.id,
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
      setSelectedCourse(null)
      setFormNim('')
      setFormNama('')
      setFormAlasan('')
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
      alert('Alasan penolakan wajib dicantumkan.')
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
        alert(json.error || 'Gagal menyimpan keputusan.')
        return
      }

      setShowActionModal(false)
      setSelectedItem(null)
      fetchData()
    } catch (err) {
      console.error('Action submit error:', err)
      alert('Terjadi kesalahan koneksi ke server.')
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
    if (
      !confirm(
        `Ubah kategori mata kuliah "${course.kodeMatkul} - ${course.namaMatkul}" menjadi ${nextKategori}?`
      )
    ) {
      return
    }

    try {
      const res = await fetch('/api/akademik/pengguguran/mata-kuliah', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: course.id, kategori: nextKategori }),
      })
      const json = await res.json()
      if (json.success) {
        fetchCourses()
      } else {
        alert(json.error || 'Gagal mengubah kategori')
      }
    } catch {
      alert('Gagal menghubungi server')
    }
  }

  // Role permissions
  const canVerifyProdi = currentUserRole === 'kaprodi' || currentUserRole === 'superadmin'
  const canDecideAkademik = currentUserRole === 'akademik' || currentUserRole === 'superadmin'
  const canManagePeriode = currentUserRole === 'superadmin' || currentUserRole === 'akademik'

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#002B49] via-[#003B64] to-[#014D82] text-white p-6 rounded-2xl shadow-xl shadow-blue-950/10">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-white/10 text-amber-300">
              <BookX className="w-6 h-6" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight">Pengguguran Mata Kuliah</h1>
          </div>
          <p className="text-slate-200 text-sm mt-1.5 max-w-2xl">
            Sistem tata kelola pengajuan pengguguran mata kuliah Non-Inti dengan validasi kategori, verifikasi Program
            Studi, dan keputusan akhir bagian Akademik.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setFormError(null)
              setSelectedCourse(null)
              setShowCreateModal(true)
            }}
            disabled={!activePeriode?.timeline.isPengajuanOpen}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold shadow-md transition-all ${
              activePeriode?.timeline.isPengajuanOpen
                ? 'bg-amber-400 text-slate-950 hover:bg-amber-300 active:scale-95'
                : 'bg-white/20 text-white/50 cursor-not-allowed'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Ajukan Pengguguran</span>
          </button>
        </div>
      </div>

      {/* Timeline & Period Banner */}
      {activePeriode && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <CalendarClock className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-800 text-base">{activePeriode.nama}</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Periode Aktif
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tahun Akademik {activePeriode.tahunAkademik} • Semester {activePeriode.semester}
                </p>
              </div>
            </div>

            {/* Sisa Hari / Status Banner */}
            <div className="flex items-center gap-3 text-xs">
              <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500">Tahap Pengajuan:</span>{' '}
                {activePeriode.timeline.isPengajuanOpen ? (
                  <span className="font-bold text-emerald-600">
                    Buka ({activePeriode.timeline.daysRemainingPengajuan} hari lagi)
                  </span>
                ) : (
                  <span className="font-semibold text-slate-400">Tutup</span>
                )}
              </div>

              <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500">Verifikasi Prodi:</span>{' '}
                {activePeriode.timeline.isVerifikasiProdiOpen ? (
                  <span className="font-bold text-blue-600">
                    Aktif ({activePeriode.timeline.daysRemainingVerifikasi} hari lagi)
                  </span>
                ) : (
                  <span className="font-semibold text-slate-400">Selesai/Tutup</span>
                )}
              </div>

              <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500">Keputusan Akademik:</span>{' '}
                {activePeriode.timeline.isKeputusanAkademikOpen ? (
                  <span className="font-bold text-purple-600">
                    Aktif ({activePeriode.timeline.daysRemainingAkademik} hari lagi)
                  </span>
                ) : (
                  <span className="font-semibold text-slate-400">Selesai/Tutup</span>
                )}
              </div>
            </div>
          </div>

          {/* Stepper Timeline Visual */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4 text-xs">
            <div
              className={`p-3 rounded-xl border ${
                activePeriode.timeline.isPengajuanOpen
                  ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900'
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              <div className="flex items-center justify-between font-bold">
                <span>1. Pembukaan Pengajuan</span>
                {activePeriode.timeline.isPengajuanOpen && <span className="text-[10px] text-emerald-700 font-extrabold uppercase tracking-wide">Aktif</span>}
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                {formatWIBDateShort(activePeriode.pengajuanStart)} – {formatWIBDateShort(activePeriode.pengajuanEnd)}
              </p>
            </div>

            <div
              className={`p-3 rounded-xl border ${
                activePeriode.timeline.isVerifikasiProdiOpen
                  ? 'bg-blue-50/70 border-blue-300 text-blue-900'
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              <div className="flex items-center justify-between font-bold">
                <span>2. Verifikasi Prodi</span>
                {activePeriode.timeline.isVerifikasiProdiOpen && <span className="text-[10px] text-blue-700 font-extrabold uppercase tracking-wide">Aktif</span>}
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                {formatWIBDateShort(activePeriode.verifikasiProdiStart)} – {formatWIBDateShort(activePeriode.verifikasiProdiEnd)}
              </p>
            </div>

            <div
              className={`p-3 rounded-xl border ${
                activePeriode.timeline.isKeputusanAkademikOpen
                  ? 'bg-purple-50/70 border-purple-300 text-purple-900'
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              <div className="flex items-center justify-between font-bold">
                <span>3. Keputusan Akademik</span>
                {activePeriode.timeline.isKeputusanAkademikOpen && <span className="text-[10px] text-purple-700 font-extrabold uppercase tracking-wide">Aktif</span>}
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                {formatWIBDateShort(activePeriode.keputusanAkademikStart)} – {formatWIBDateShort(activePeriode.keputusanAkademikEnd)}
              </p>
            </div>

            <div className="p-3 rounded-xl border bg-slate-50 border-slate-200 text-slate-600">
              <div className="flex items-center justify-between font-bold">
                <span>4. Pengumuman Hasil</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                {formatWIBDateShort(activePeriode.pengumumanDate)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {[
          { label: 'Total Pengajuan', val: summary.total, icon: Layers, color: 'text-slate-700 bg-slate-100' },
          { label: 'Menunggu Prodi', val: summary.menungguProdi, icon: Clock, color: 'text-amber-700 bg-amber-50' },
          { label: 'Disetujui Prodi', val: summary.disetujuiProdi, icon: CheckCircle2, color: 'text-blue-700 bg-blue-50' },
          { label: 'Disetujui Akhir', val: summary.disetujuiAkademik, icon: ShieldCheck, color: 'text-emerald-700 bg-emerald-50' },
          { label: 'Ditolak', val: summary.ditolak, icon: XCircle, color: 'text-rose-700 bg-rose-50' },
        ].map((s) => (
          <div key={s.label} className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between shadow-sm">
            <div>
              <p className="text-xs text-slate-500 font-medium">{s.label}</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{s.val}</p>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}>
              <s.icon className="w-5 h-5" />
            </div>
          </div>
        ))}
      </div>

      {/* Nav Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('semua')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'semua'
              ? 'bg-[#002B49] text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Semua Pengajuan ({summary.total})
        </button>

        {canVerifyProdi && (
          <button
            onClick={() => setActiveTab('verifikasi-prodi')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'verifikasi-prodi'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-amber-800 bg-amber-50 hover:bg-amber-100'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Antrean Verifikasi Prodi ({summary.menungguProdi})</span>
          </button>
        )}

        {canDecideAkademik && (
          <button
            onClick={() => setActiveTab('keputusan-akademik')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'keputusan-akademik'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-blue-800 bg-blue-50 hover:bg-blue-100'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Antrean Akademik ({summary.disetujuiProdi})</span>
          </button>
        )}

        {canManagePeriode && (
          <button
            onClick={() => setActiveTab('periode-master')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'periode-master'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-purple-800 bg-purple-50 hover:bg-purple-100'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Pengaturan Periode & Master MK</span>
          </button>
        )}
      </div>

      {/* Main Content Area based on Tab */}
      {activeTab === 'semua' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          {/* Filters Bar */}
          <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-3 bg-slate-50/50">
            <div className="flex flex-1 items-center gap-2.5 w-full md:w-auto">
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
                  className="w-full pl-9 pr-3 py-2 rounded-xl text-xs border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Filter Prodi */}
              <select
                value={selectedProdi}
                onChange={(e) => {
                  setSelectedProdi(e.target.value)
                  setPage(1)
                }}
                className="px-3 py-2 rounded-xl text-xs border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="px-3 py-2 rounded-xl text-xs border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left min-w-[800px]">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3.5">No. Pengajuan</th>
                  <th className="px-4 py-3.5">Mahasiswa</th>
                  <th className="px-4 py-3.5">Program Studi</th>
                  <th className="px-4 py-3.5">Mata Kuliah</th>
                  <th className="px-4 py-3.5">Kategori</th>
                  <th className="px-4 py-3.5">Tanggal Diajukan</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
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
                      badgeBg: 'bg-slate-50 text-slate-700',
                    }

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition">
                        <td className="px-4 py-3.5 font-mono font-bold text-slate-800">{item.nomorPengajuan}</td>
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-slate-800">{item.namaMahasiswa}</div>
                          <div className="text-[11px] font-mono text-slate-500">NIM: {item.nim}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="font-semibold text-slate-700">{item.prodiCode}</span>
                          <span className="text-[11px] text-slate-400 block truncate max-w-[140px]">{item.prodiName}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-slate-800">{item.kodeMatkul}</div>
                          <div className="text-[11px] text-slate-500 truncate max-w-[200px]">{item.namaMatkul}</div>
                          <span className="text-[10px] text-slate-400">{item.sks} SKS</span>
                        </td>
                        <td className="px-4 py-3.5">
                          {item.kategoriMatkul === 'INTI' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              Inti
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Non-Inti
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-slate-500">{formatWIBDate(item.createdAt)}</td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold border ${st.badgeBg}`}>
                            {st.label}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <button
                            onClick={() => openDetailModal(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold"
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
          <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-4 flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold text-sm">Halaman Verifikasi Program Studi</p>
              <p className="mt-0.5">
                Daftar pengajuan berikut sedang menunggu keputusan verifikasi oleh Kaprodi / Petugas Program Studi yang
                berwenang. Pengajuan yang disetujui akan diteruskan secara otomatis ke bagian Akademik.
              </p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left min-w-[800px]">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3.5">No. Pengajuan</th>
                    <th className="px-4 py-3.5">Mahasiswa</th>
                    <th className="px-4 py-3.5">Prodi</th>
                    <th className="px-4 py-3.5">Mata Kuliah</th>
                    <th className="px-4 py-3.5">Alasan Pengguguran</th>
                    <th className="px-4 py-3.5 text-center">Tindakan Prodi</th>
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
                        <td className="px-4 py-3.5 font-mono font-bold text-slate-800">{item.nomorPengajuan}</td>
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-slate-800">{item.namaMahasiswa}</div>
                          <div className="text-[11px] font-mono text-slate-500">NIM: {item.nim}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="font-semibold text-slate-700">{item.prodiCode}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-slate-800">{item.kodeMatkul}</div>
                          <div className="text-[11px] text-slate-500 truncate max-w-[180px]">{item.namaMatkul}</div>
                          <span className="text-[10px] text-emerald-600 font-bold">Non-Inti ({item.sks} SKS)</span>
                        </td>
                        <td className="px-4 py-3.5 max-w-xs">
                          <p className="text-slate-600 line-clamp-2 italic">&ldquo;{item.alasan}&rdquo;</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => openDetailModal(item)}
                              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold"
                            >
                              Detail
                            </button>
                            <button
                              onClick={() => openActionDialog(item, 'PRODI', 'SETUJU')}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm"
                            >
                              Setujui
                            </button>
                            <button
                              onClick={() => openActionDialog(item, 'PRODI', 'TOLAK')}
                              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm"
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
          <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-xl p-4 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold text-sm">Halaman Keputusan Akhir Bagian Akademik</p>
              <p className="mt-0.5">
                Menampilkan pengajuan yang telah mendapatkan persetujuan dari Program Studi. Bagian Akademik berwenang
                memberikan keputusan akhir untuk menyelesaikan proses pengguguran secara sah.
              </p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left min-w-[800px]">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3.5">No. Pengajuan</th>
                    <th className="px-4 py-3.5">Mahasiswa</th>
                    <th className="px-4 py-3.5">Prodi</th>
                    <th className="px-4 py-3.5">Mata Kuliah</th>
                    <th className="px-4 py-3.5">Verifikasi Prodi</th>
                    <th className="px-4 py-3.5 text-center">Keputusan Akademik</th>
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
                        <td className="px-4 py-3.5 font-mono font-bold text-slate-800">{item.nomorPengajuan}</td>
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-slate-800">{item.namaMahasiswa}</div>
                          <div className="text-[11px] font-mono text-slate-500">NIM: {item.nim}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="font-semibold text-slate-700">{item.prodiCode}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-slate-800">{item.kodeMatkul}</div>
                          <div className="text-[11px] text-slate-500 truncate max-w-[180px]">{item.namaMatkul}</div>
                          <span className="text-[10px] text-emerald-600 font-bold">Non-Inti ({item.sks} SKS)</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-emerald-700 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Disetujui Prodi
                          </div>
                          <div className="text-[10px] text-slate-500">Oleh: {item.verifikatorProdiName || 'Petugas Prodi'}</div>
                          {item.catatanProdi && (
                            <div className="text-[10px] text-slate-600 italic mt-0.5">&ldquo;{item.catatanProdi}&rdquo;</div>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => openDetailModal(item)}
                              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold"
                            >
                              Detail
                            </button>
                            <button
                              onClick={() => openActionDialog(item, 'AKADEMIK', 'SETUJU')}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm"
                            >
                              Setujui Akhir
                            </button>
                            <button
                              onClick={() => openActionDialog(item, 'AKADEMIK', 'TOLAK')}
                              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm"
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
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-base">Pengaturan Periode & Timeline Pengguguran</h3>
                <p className="text-xs text-slate-500">
                  Tentukan tanggal dan waktu pembukaan pengajuan, verifikasi Prodi, serta keputusan Akademik (WIB).
                </p>
              </div>

              {currentUserRole === 'superadmin' && (
                <button
                  onClick={() => {
                    const now = new Date()
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
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Periode Baru</span>
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left min-w-[700px]">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
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
                      <td className="px-4 py-3 font-bold text-slate-800">{p.nama}</td>
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
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Aktif
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                            Nonaktif
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {currentUserRole === 'superadmin' && (
                          <button
                            onClick={() => {
                              const promptAlasan = prompt(
                                `Perpanjang masa pengajuan periode "${p.nama}"?\nMasukkan alasan perpanjangan resmi (disimpan di audit log):`
                              )
                              if (!promptAlasan) return

                              const newDate = prompt(
                                'Masukkan tanggal & jam akhir pengajuan baru (format: YYYY-MM-DDTHH:mm):',
                                '2026-12-31T23:59'
                              )
                              if (!newDate) return

                              fetch(`/api/akademik/pengguguran/periode/${p.id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  pengajuanEnd: newDate,
                                  alasanPerpanjangan: promptAlasan,
                                }),
                              })
                                .then((r) => r.json())
                                .then((res) => {
                                  if (res.success) {
                                    alert('Periode berhasil diperpanjang!')
                                    fetchPeriodes()
                                    fetchData()
                                  } else {
                                    alert(res.error || 'Gagal perpanjang periode')
                                  }
                                })
                            }}
                            className="px-2.5 py-1 rounded-lg border border-purple-200 text-purple-700 hover:bg-purple-50 text-xs font-semibold"
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
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-800 text-base">Master Data Kategori Mata Kuliah (Inti / Non-Inti)</h3>
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
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs"
                />
              </div>
            </div>

            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-xs text-left min-w-[650px]">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 sticky top-0">
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
                      <td className="px-4 py-2.5 font-mono font-bold text-slate-800">{mk.kodeMatkul}</td>
                      <td className="px-4 py-2.5 font-medium text-slate-800">{mk.namaMatkul}</td>
                      <td className="px-4 py-2.5 text-slate-500">{mk.sks} SKS</td>
                      <td className="px-4 py-2.5 text-slate-600">{mk.prodiCode}</td>
                      <td className="px-4 py-2.5">
                        {mk.kategori === 'INTI' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            Inti (Wajib / Tidak Dapat Digugurkan)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Non-Inti (Dapat Diajukan)
                          </span>
                        )}
                      </td>
                      {canManagePeriode && (
                        <td className="px-4 py-2.5 text-center">
                          <button
                            onClick={() => handleToggleKategori(mk)}
                            className="px-2 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 text-[10px] font-semibold"
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

      {/* MODAL 1: Form Pengajuan Pengguguran Baru */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <BookX className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Ajukan Pengguguran Mata Kuliah</h3>
                  <p className="text-xs text-slate-500">Pilih mata kuliah & lengkapi data permohonan</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4">
              {formError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Data Mahasiswa */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">NIM Mahasiswa *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 041234567"
                    value={formNim}
                    onChange={(e) => setFormNim(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Mahasiswa *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nama lengkap mahasiswa"
                    value={formNama}
                    onChange={(e) => setFormNama(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Pilih Mata Kuliah */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Pilih Mata Kuliah *</label>
                <select
                  required
                  value={selectedCourse?.id || ''}
                  onChange={(e) => {
                    const found = mataKuliahList.find((m) => m.id === e.target.value)
                    setSelectedCourse(found || null)
                    setFormError(null)
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">-- Pilih Mata Kuliah yang Tersedia --</option>
                  {mataKuliahList.map((m) => (
                    <option key={m.id} value={m.id}>
                      [{m.kodeMatkul}] {m.namaMatkul} ({m.sks} SKS - {m.prodiCode})
                    </option>
                  ))}
                </select>
              </div>

              {/* Tampilan Kategori Otomatis & Peringatan Jika INTI */}
              {selectedCourse && (
                <div
                  className={`p-3.5 rounded-xl border text-xs ${
                    selectedCourse.kategori === 'INTI'
                      ? 'bg-rose-50 border-rose-300 text-rose-900'
                      : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Kategori Mata Kuliah:</span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        selectedCourse.kategori === 'INTI'
                          ? 'bg-rose-600 text-white'
                          : 'bg-emerald-600 text-white'
                      }`}
                    >
                      {selectedCourse.kategori === 'INTI' ? 'Mata Kuliah Inti' : 'Mata Kuliah Non-Inti'}
                    </span>
                  </div>

                  {selectedCourse.kategori === 'INTI' ? (
                    <div className="mt-2.5 pt-2.5 border-t border-rose-200 flex items-start gap-2 text-rose-800 font-medium">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <p>Mata kuliah ini termasuk kategori Mata Kuliah Inti dan tidak dapat diajukan untuk pengguguran.</p>
                    </div>
                  ) : (
                    <div className="mt-2.5 pt-2.5 border-t border-emerald-200 flex items-start gap-2 text-emerald-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <p>Mata kuliah ini berkategori Non-Inti dan memenuhi syarat diajukan untuk verifikasi Program Studi.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Alasan Pengguguran (Hanya jika bukan Inti) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alasan Pengguguran Mata Kuliah *
                </label>
                <textarea
                  rows={3}
                  required
                  disabled={selectedCourse?.kategori === 'INTI'}
                  placeholder="Jelaskan alasan akademik atau administrasi pengajuan pengguguran ini..."
                  value={formAlasan}
                  onChange={(e) => setFormAlasan(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting || !selectedCourse || selectedCourse.kategori === 'INTI'}
                  className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold shadow-md transition-all ${
                    !selectedCourse || selectedCourse.kategori === 'INTI'
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {formSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Ajukan Pengguguran</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Detail & Timeline Visual Progress */}
      {showDetailModal && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 sticky top-0 bg-white z-10">
              <div>
                <span className="font-mono text-xs text-blue-600 font-bold">{selectedItem.nomorPengajuan}</span>
                <h3 className="font-bold text-slate-900 text-base">Detail & Progres Pengajuan Pengguguran</h3>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
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
                    <span className="font-bold text-slate-800">{selectedItem.namaMahasiswa}</span>
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
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
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
        </div>
      )}

      {/* MODAL 3: Dialog Konfirmasi Aksi (Setujui / Tolak oleh Prodi atau Akademik) */}
      {showActionModal && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                {actionDecision === 'SETUJU' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-600" />
                )}
                <h3 className="font-bold text-slate-900 text-base">
                  {actionDecision === 'SETUJU' ? 'Konfirmasi Persetujuan' : 'Konfirmasi Penolakan'}
                </h3>
              </div>
              <button
                onClick={() => setShowActionModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="font-bold text-slate-800">
                  {selectedItem.kodeMatkul} - {selectedItem.namaMatkul}
                </div>
                <div className="text-slate-500">
                  Mahasiswa: {selectedItem.namaMahasiswa} ({selectedItem.nim})
                </div>
                <div className="text-slate-500">Tingkat: {actionType === 'PRODI' ? 'Verifikasi Prodi' : 'Keputusan Akademik'}</div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {actionDecision === 'TOLAK' ? 'Alasan Penolakan (Wajib Diisi) *' : 'Catatan Rekomendasi (Opsional)'}
                </label>
                <textarea
                  rows={3}
                  required={actionDecision === 'TOLAK'}
                  placeholder={
                    actionDecision === 'TOLAK'
                      ? 'Tuliskan alasan penolakan secara jelas dan objektif...'
                      : 'Tambahkan catatan jika diperlukan...'
                  }
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowActionModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleActionSubmit}
                  disabled={actionSubmitting || (actionDecision === 'TOLAK' && !actionNotes.trim())}
                  className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold text-white shadow-md transition-all ${
                    actionDecision === 'SETUJU' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {actionSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{actionDecision === 'SETUJU' ? 'Ya, Setujui' : 'Ya, Tolak'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Tambah / Edit Periode */}
      {showPeriodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-900 text-base">Tambah Periode Pengguguran Baru</h3>
              <button
                onClick={() => setShowPeriodeModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-600"
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
                    alert('Periode baru berhasil dibuat!')
                    setShowPeriodeModal(false)
                    fetchPeriodes()
                    fetchData()
                  } else {
                    alert(json.error || 'Gagal membuat periode')
                  }
                } catch {
                  alert('Gagal menghubungi server')
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
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
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
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kode Semester</label>
                  <input
                    type="text"
                    required
                    value={periodeForm.semester}
                    onChange={(e) => setPeriodeForm({ ...periodeForm, semester: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
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
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Batas Pengajuan</label>
                  <input
                    type="datetime-local"
                    required
                    value={periodeForm.pengajuanEnd}
                    onChange={(e) => setPeriodeForm({ ...periodeForm, pengajuanEnd: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
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
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Batas Verifikasi Prodi</label>
                  <input
                    type="datetime-local"
                    required
                    value={periodeForm.verifikasiProdiEnd}
                    onChange={(e) => setPeriodeForm({ ...periodeForm, verifikasiProdiEnd: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
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
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Batas Keputusan Akademik</label>
                  <input
                    type="datetime-local"
                    required
                    value={periodeForm.keputusanAkademikEnd}
                    onChange={(e) => setPeriodeForm({ ...periodeForm, keputusanAkademikEnd: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
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
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow-sm"
                >
                  Simpan Periode
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

