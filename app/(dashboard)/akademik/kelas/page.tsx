'use client'

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  LayoutGrid,
  Calendar,
  BookOpen,
  Users,
  Search,
  CheckCircle2,
  Eye,
  X,
  Calculator,
  UserCheck,
  FileSpreadsheet,
  Layers,
  Download,
  Upload,
  FileUp,
  Loader2,
  Check,
  AlertCircle,
  GitCompare,
  ArrowUpRight,
  ArrowDownRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react'
import { Pagination } from '@/components/ui/pagination'
import { useDebounce } from '@/hooks/useDebounce'

type KebutuhanKelasItem = {
  id: string
  masa: string
  kodeMatkul: string
  namaMatkul: string
  sks: number
  prodiCode: string
  prodiName: string
  semester?: number
  sipasNonTtm?: number
  nonSipas?: number
  ttmSipas?: number
  tutonSipas?: number
  jumlahTTM?: number
  jumlahTuton?: number
  totalMahasiswa: number
  kebutuhanKelas: number
  kebutuhanTutorMin: number
  deltaMahasiswa?: number
  deltaKelas?: number
  deltaTutor?: number
}

const MASA_OPTIONS = [
  { value: '20262', label: '2026 Genap' },
  { value: '20261', label: '2026 Ganjil' },
  { value: '20252', label: '2025 Genap' },
  { value: '20251', label: '2025 Ganjil' },
  { value: '20242', label: '2024 Genap' },
  { value: '20241', label: '2024 Ganjil' },
  { value: '20232', label: '2023 Genap' },
  { value: '20231', label: '2023 Ganjil' },
  { value: '20222', label: '2022 Genap' },
  { value: '20221', label: '2022 Ganjil' },
  { value: '20212', label: '2021 Genap' },
  { value: '20211', label: '2021 Ganjil' },
]

type Summary = {
  masa?: string
  compareMasa?: string | null
  totalMatkul: number
  totalMahasiswa: number
  totalKebutuhanKelas: number
  totalKebutuhanTutorMin: number
  totalDeltaMahasiswa?: number
  totalDeltaKelas?: number
  totalDeltaTutor?: number
  rasioKuota?: string
  rasioTutor?: string
}

type SortField = 'kodeMatkul' | 'namaMatkul' | 'prodiCode' | 'totalMahasiswa' | 'kebutuhanKelas' | 'kebutuhanTutorMin'
type SortOrder = 'asc' | 'desc'

export default function KebutuhanKelasPage() {
  const [mounted, setMounted] = useState(false)
  const [items, setItems] = useState<KebutuhanKelasItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMasa, setSelectedMasa] = useState<string>('20261')
  const [compareMasa, setCompareMasa] = useState<string>('')
  const [summary, setSummary] = useState<Summary>({
    totalMatkul: 0,
    totalMahasiswa: 0,
    totalKebutuhanKelas: 0,
    totalKebutuhanTutorMin: 0,
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  // User session state for role check
  const [currentUser, setCurrentUser] = useState<any>(null)

  // Filters & Sorting State
  const [selectedProdi, setSelectedProdi] = useState<string>('ALL')
  const [selectedSemester, setSelectedSemester] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const debouncedSearchQuery = useDebounce(searchQuery, 400)
  const [page, setPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(10)

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('kodeMatkul')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')

  // Selected item modal state
  const [selectedItem, setSelectedItem] = useState<KebutuhanKelasItem | null>(null)

  // Upload Excel modal state
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false)
  const [uploadMasa, setUploadMasa] = useState<string>('20262')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState<boolean>(false)
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState<string>('')
  const [uploadErrorMsg, setUploadErrorMsg] = useState<string>('')

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  // Sync Tuton modal state (registrasi.ut.ac.id)
  const [showTutonModal, setShowTutonModal] = useState<boolean>(false)
  const [syncingTuton, setSyncingTuton] = useState<boolean>(false)
  const [syncMasa, setSyncMasa] = useState<string>('20261')
  const [syncProdi, setSyncProdi] = useState<string>('ALL')
  const [syncSemester, setSyncSemester] = useState<string>('ALL')
  const [syncCountMode, setSyncCountMode] = useState<'total' | 'filtered'>('total')
  const [tutonResult, setTutonResult] = useState<{ success: boolean; message: string } | null>(null)
  const [progressState, setProgressState] = useState<{
    percentage: number
    current: number
    total: number
    itemLabel?: string
    statusText?: string
  } | null>(null)

  const handleSyncTutonData = async () => {
    setSyncingTuton(true)
    setTutonResult(null)
    setProgressState({
      percentage: 0,
      current: 0,
      total: 100,
      itemLabel: 'Inisialisasi Peramban...',
      statusText: 'Menghubungkan ke Portal Registrasi UT...',
    })

    try {
      const res = await fetch('/api/kebutuhan-kelas/sync-tuton', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          masa: syncMasa || selectedMasa,
          prodi: syncProdi,
          semester: syncSemester,
          countMode: syncCountMode,
        }),
      })

      if (!res.ok || !res.body) {
        throw new Error('Gagal tersambung ke peladen sinkronisasi.')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const chunks = buffer.split('\n\n')
        buffer = chunks.pop() || ''

        for (const chunk of chunks) {
          if (chunk.startsWith('data: ')) {
            try {
              const data = JSON.parse(chunk.substring(6))
              if (data.type === 'progress') {
                setProgressState({
                  percentage: data.percentage || 0,
                  current: data.current || 0,
                  total: data.total || 261,
                  itemLabel: data.itemLabel,
                  statusText: data.statusText,
                })
              } else if (data.type === 'complete') {
                setProgressState({
                  percentage: 100,
                  current: data.totalMatkul || 261,
                  total: data.totalMatkul || 261,
                  itemLabel: 'Selesai',
                  statusText: 'Sinkronisasi berhasil!',
                })
                fetchData()
                setTimeout(() => {
                  setShowTutonModal(false)
                  showToast(data.message || 'Sinkronisasi Data Peserta Tuton Berhasil Selesai!', 'success')
                }, 1000)
              } else if (data.type === 'error') {
                showToast(data.error || 'Gagal sinkronisasi data peserta Tuton.', 'error')
                setTimeout(() => {
                  setShowTutonModal(false)
                }, 1000)
              }
            } catch {}
          }
        }
      }
    } catch (err: any) {
      showToast(err?.message || 'Gagal tersambung ke peladen sinkronisasi.', 'error')
    } finally {
      setSyncingTuton(false)
    }
  }

  // Load current user profile for role verification
  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data && !data.error) setCurrentUser(data)
      })
      .catch(() => {})
  }, [])

  // Check if current user has Super Admin or Admin access
  const isSuperAdmin =
    Boolean(currentUser) &&
    (currentUser?.role?.toLowerCase().includes('admin') ||
      currentUser?.roleName?.toLowerCase().includes('admin') ||
      currentUser?.permissions?.includes('*'))

  const fetchData = async () => {
    setLoading(true)
    try {
      const url = `/api/dashboard/kebutuhan-kelas?masa=${selectedMasa}&compareMasa=${compareMasa}&prodi=${selectedProdi}&semester=${selectedSemester}&query=${encodeURIComponent(
        debouncedSearchQuery
      )}&page=1&pageSize=300&_t=${Date.now()}`
      const res = await fetch(url, { cache: 'no-store' })
      if (res.ok) {
        const json = await res.json()
        if (json.success && json.data) {
          setItems(json.data.items)
          if (json.data.summary) {
            setSummary(json.data.summary)
          }
        }
      }
    } catch (e) {
      console.error('Failed to load kebutuhan kelas data:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [selectedMasa, compareMasa, selectedProdi, selectedSemester, debouncedSearchQuery])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
    setPage(1)
  }

  const sortedItems = [...items].sort((a, b) => {
    let valA: any = a[sortField]
    let valB: any = b[sortField]

    if (typeof valA === 'string') {
      valA = valA.toLowerCase()
      valB = valB.toLowerCase()
      return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA)
    }

    return sortOrder === 'asc' ? valA - valB : valB - valA
  })

  const paginatedItems = sortedItems.slice((page - 1) * pageSize, page * pageSize)

  const handleExportExcel = () => {
    const exportUrl = `/api/dashboard/kebutuhan-kelas/export?masa=${selectedMasa}&prodi=${selectedProdi}&semester=${selectedSemester}&query=${encodeURIComponent(
      searchQuery
    )}`
    window.location.href = exportUrl
  }

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadFile) {
      setUploadErrorMsg('Pilih file Excel (.xlsx / .xls) terlebih dahulu')
      return
    }

    setUploading(true)
    setUploadSuccessMsg('')
    setUploadErrorMsg('')

    try {
      const formData = new FormData()
      formData.append('file', uploadFile)
      formData.append('masa', uploadMasa)

      const res = await fetch('/api/dashboard/kebutuhan-kelas/upload', {
        method: 'POST',
        body: formData,
      })

      const json = await res.json()

      if (res.ok && json.success) {
        setUploadSuccessMsg(json.message || 'File Excel berhasil diunggah dan disimpan!')
        setSelectedMasa(uploadMasa)
        setTimeout(() => {
          setShowUploadModal(false)
          setUploadFile(null)
          setUploadSuccessMsg('')
          fetchData()
        }, 1500)
      } else {
        setUploadErrorMsg(json.error || 'Gagal mengunggah file Excel')
      }
    } catch (err: any) {
      setUploadErrorMsg(err.message || 'Terjadi kesalahan jaringan saat mengunggah')
    } finally {
      setUploading(false)
    }
  }

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 transition" />
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-ut-blue font-bold" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-ut-blue font-bold" />
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner & Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#001D33] via-[#002B49] to-[#005691] text-white p-6 sm:p-8 shadow-xl border border-white/10">
        <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-amber-400/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 space-y-3 max-w-3xl">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight flex items-center gap-3">
            <LayoutGrid className="w-8 h-8 text-amber-400" />
            Perencanaan Prediksi Kelas & Tutor FHISIP
          </h1>
          <p className="text-sm text-slate-200 leading-relaxed">
            Perencanaan dan estimasi kebutuhan kelas tutorial serta analisis kebutuhan tutor pengampu di lingkungan FHISIP Universitas Terbuka.
          </p>
        </div>
      </div>

      {/* Control Bar: Masa Selector, Comparison & Upload/Download */}
      <div className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 border border-slate-200/80">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
              <Calendar className="w-4 h-4 text-ut-navy" />
              Masa Akademik:
            </span>
            <select
              value={selectedMasa}
              onChange={(e) => {
                setSelectedMasa(e.target.value)
                setPage(1)
              }}
              className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl font-bold text-ut-navy focus:outline-none focus:ring-2 focus:ring-ut-navy/20"
            >
              {MASA_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label} ({m.value})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 pl-3 border-l border-slate-300">
            <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
              <GitCompare className="w-4 h-4 text-emerald-600" />
              Bandingkan Dengan:
            </span>
            <select
              value={compareMasa}
              onChange={(e) => {
                setCompareMasa(e.target.value)
                setPage(1)
              }}
              className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="">-- Tanpa Pembanding --</option>
              {MASA_OPTIONS.filter((m) => m.value !== selectedMasa).map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label} ({m.value})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Sync Tuton Button - Super Admin Only */}
          {isSuperAdmin && (
            <button
              onClick={() => {
                setTutonResult(null)
                setShowTutonModal(true)
              }}
              className="btn-primary py-2 px-3.5 text-xs font-bold inline-flex items-center justify-center gap-1.5 rounded-xl shadow-xs hover:shadow-md transition bg-ut-navy hover:bg-ut-navy/90 text-white"
              title="Khusus Super Admin: Sinkronkan total peserta Tuton dari Portal Registrasi UT"
            >
              <RefreshCw className="w-4 h-4 text-amber-400" />
              <span>Sinkronisasi Peserta Tuton</span>
            </button>
          )}

          {/* Download Excel Button */}
          <button
            onClick={handleExportExcel}
            className="btn-primary py-2 px-3.5 text-xs font-bold inline-flex items-center justify-center gap-1.5 rounded-xl shadow-xs hover:shadow-md transition bg-emerald-600 hover:bg-emerald-700 text-white"
            title="Download Format Excel (.xlsx)"
          >
            <Download className="w-4 h-4" />
            <span>Download Excel</span>
          </button>
        </div>
      </div>

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5 border-t-4 border-t-ut-navy space-y-2">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Mata Kuliah</p>
          <p className="text-2xl font-extrabold text-slate-900">
            {loading ? <span className="inline-block w-16 h-7 bg-slate-200 animate-pulse rounded"></span> : summary.totalMatkul.toLocaleString('id-ID')}
          </p>
          <p className="text-[11px] text-slate-500 flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5 text-ut-blue" />
            <span>Mata Kuliah Ditawarkan FHISIP</span>
          </p>
        </div>

        <div className="card p-5 border-t-4 border-t-amber-500 space-y-2">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Peserta Tuton</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-extrabold text-amber-900">
              {loading ? <span className="inline-block w-16 h-7 bg-amber-200 animate-pulse rounded"></span> : summary.totalMahasiswa.toLocaleString('id-ID')}
            </p>
            {compareMasa && summary.totalDeltaMahasiswa !== undefined && summary.totalDeltaMahasiswa !== 0 && (
              <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full inline-flex items-center gap-0.5 ${summary.totalDeltaMahasiswa > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                {summary.totalDeltaMahasiswa > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {summary.totalDeltaMahasiswa > 0 ? `+${summary.totalDeltaMahasiswa.toLocaleString('id-ID')}` : summary.totalDeltaMahasiswa.toLocaleString('id-ID')}
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-amber-600" />
            <span>Akumulasi Registrasi Peserta</span>
          </p>
        </div>

        <div className="card p-5 border-t-4 border-t-emerald-600 space-y-2">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Prediksi Kelas Tuton</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-extrabold text-emerald-900">
              {loading ? <span className="inline-block w-16 h-7 bg-emerald-200 animate-pulse rounded"></span> : `${summary.totalKebutuhanKelas.toLocaleString('id-ID')} Kelas`}
            </p>
            {compareMasa && summary.totalDeltaKelas !== undefined && summary.totalDeltaKelas !== 0 && (
              <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full inline-flex items-center gap-0.5 ${summary.totalDeltaKelas > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                {summary.totalDeltaKelas > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {summary.totalDeltaKelas > 0 ? `+${summary.totalDeltaKelas}` : summary.totalDeltaKelas} Kelas
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 flex items-center gap-1">
            <Calculator className="w-3.5 h-3.5 text-emerald-600" />
            <span>Estimasi Kebutuhan Kelas</span>
          </p>
        </div>

        <div className="card p-5 border-t-4 border-t-purple-600 space-y-2">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kebutuhan Minimal Tutor</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-extrabold text-purple-900">
              {loading ? <span className="inline-block w-16 h-7 bg-purple-200 animate-pulse rounded"></span> : `${summary.totalKebutuhanTutorMin.toLocaleString('id-ID')} Tutor`}
            </p>
            {compareMasa && summary.totalDeltaTutor !== undefined && summary.totalDeltaTutor !== 0 && (
              <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full inline-flex items-center gap-0.5 ${summary.totalDeltaTutor > 0 ? 'bg-purple-100 text-purple-800' : 'bg-amber-100 text-amber-800'}`}>
                {summary.totalDeltaTutor > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {summary.totalDeltaTutor > 0 ? `+${summary.totalDeltaTutor}` : summary.totalDeltaTutor} Tutor
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 flex items-center gap-1">
            <UserCheck className="w-3.5 h-3.5 text-purple-600" />
            <span>Estimasi Kebutuhan Tutor</span>
          </p>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="card p-6 space-y-4">
        {/* Table Header Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-ut-blue" />
              Tabel Prediksi Pembentukan Kelas & Tutor per Mata Kuliah
            </h2>
            <p className="text-xs text-slate-500">
              Menampilkan {sortedItems.length.toLocaleString('id-ID')} data prediksi mata kuliah. Klik judul kolom untuk mengurutkan data.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Filter by Prodi Select */}
            <div className="relative">
              <select
                value={selectedProdi}
                onChange={(e) => {
                  setSelectedProdi(e.target.value)
                  setPage(1)
                }}
                className="w-full sm:w-52 pl-3 pr-8 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-ut-navy/20 focus:border-ut-navy font-semibold text-slate-700"
              >
                <option value="ALL">Semua Program Studi (261 Matkul)</option>
                <option value="HKUM">S1 Ilmu Hukum (40 Matkul)</option>
                <option value="IKOM">S1 Ilmu Komunikasi (36 Matkul)</option>
                <option value="ADBI">S1 Administrasi Bisnis (27 Matkul)</option>
                <option value="ADPU">S1 Administrasi Publik (28 Matkul)</option>
                <option value="IPEM">S1 Ilmu Pemerintahan (26 Matkul)</option>
                <option value="SING">S1 Sastra Inggris (30 Matkul)</option>
                <option value="SOSI">S1 Sosiologi (26 Matkul)</option>
                <option value="PUS">S1 Ilmu Perpustakaan (28 Matkul)</option>
                <option value="PAJAK">S1 Perpajakan (20 Matkul)</option>
              </select>
            </div>

            {/* Filter by Semester Select */}
            <div className="relative">
              <select
                value={selectedSemester}
                onChange={(e) => {
                  setSelectedSemester(e.target.value)
                  setPage(1)
                }}
                className="w-full sm:w-44 pl-3 pr-8 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-ut-navy/20 focus:border-ut-navy font-semibold text-slate-700"
              >
                <option value="ALL">Semua Semester</option>
                <option value="GANJIL">Semester Ganjil (1, 3, 5, 7)</option>
                <option value="GENAP">Semester Genap (2, 4, 6, 8)</option>
                <option value="1">Semester 1</option>
                <option value="2">Semester 2</option>
                <option value="3">Semester 3</option>
                <option value="4">Semester 4</option>
                <option value="5">Semester 5</option>
                <option value="6">Semester 6</option>
                <option value="7">Semester 7</option>
                <option value="8">Semester 8</option>
              </select>
            </div>

            {/* Search Input Bar */}
            <div className="relative w-full sm:w-56">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari Kode / Nama Matkul..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setPage(1)
                }}
                className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-ut-navy/20 focus:border-ut-navy"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[850px]">
            <thead className="bg-slate-50 text-slate-600 text-left border-b border-slate-200 select-none">
              <tr>
                <th
                  onClick={() => handleSort('kodeMatkul')}
                  className="px-4 py-3 font-bold cursor-pointer hover:bg-slate-100 transition group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Kode Matkul</span>
                    {renderSortIcon('kodeMatkul')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('namaMatkul')}
                  className="px-4 py-3 font-bold cursor-pointer hover:bg-slate-100 transition group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Nama Mata Kuliah</span>
                    {renderSortIcon('namaMatkul')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('prodiCode')}
                  className="px-4 py-3 font-bold cursor-pointer hover:bg-slate-100 transition group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Program Studi</span>
                    {renderSortIcon('prodiCode')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('totalMahasiswa')}
                  className="px-4 py-3 font-bold text-center cursor-pointer hover:bg-slate-100 transition group"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Total Peserta Tuton</span>
                    {renderSortIcon('totalMahasiswa')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('kebutuhanKelas')}
                  className="px-4 py-3 font-bold text-center cursor-pointer hover:bg-slate-100 transition group"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Prediksi Kelas</span>
                    {renderSortIcon('kebutuhanKelas')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('kebutuhanTutorMin')}
                  className="px-4 py-3 font-bold text-center cursor-pointer hover:bg-slate-100 transition group"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Kebutuhan Minimal Tutor</span>
                    {renderSortIcon('kebutuhanTutorMin')}
                  </div>
                </th>
                <th className="px-4 py-3 font-bold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    Memuat data perencanaan kelas & tutor...
                  </td>
                </tr>
              )}

              {!loading && sortedItems.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Calendar className="w-8 h-8 text-slate-300" />
                      <p className="text-sm font-bold text-slate-700">
                        {selectedMasa === '20262'
                          ? 'Belum Ada Data Registrasi Masa 2026.2 (Genap)'
                          : 'Tidak ada data mata kuliah yang sesuai dengan pencarian.'}
                      </p>
                      <p className="text-xs text-slate-400">
                        {selectedMasa === '20262'
                          ? 'Data registrasi 2026.2 belum dibuka / belum diinputkan ke sistem.'
                          : 'Coba ubah kata kunci atau filter program studi.'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}

              {!loading &&
                paginatedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-ut-navy/10 text-ut-navy border border-ut-navy/20">
                        {item.kodeMatkul}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <div className="font-bold text-slate-900 leading-tight">{item.namaMatkul}</div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200/60 font-mono text-[10px] font-bold">
                          Sem {item.semester || (item.kodeMatkul.match(/[A-Z]{3,4}\d(\d)/i)?.[1] || 1)}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">{item.sks} SKS</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 font-extrabold text-[10px]">
                          {item.prodiCode}
                        </span>
                        <span className="text-slate-600 font-medium truncate max-w-[140px]">{item.prodiName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <span className="font-extrabold text-amber-900 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200">
                        {item.totalMahasiswa.toLocaleString('id-ID')} Peserta
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <div className="flex flex-col items-center gap-1">
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-900 border border-emerald-400/30 font-extrabold text-xs">
                          <Calculator className="w-3.5 h-3.5 text-emerald-600" />
                          {item.kebutuhanKelas.toLocaleString('id-ID')} Kelas
                        </span>
                        {compareMasa && item.deltaKelas !== undefined && item.deltaKelas !== 0 && (
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full inline-flex items-center gap-0.5 ${
                              item.deltaKelas > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {item.deltaKelas > 0 ? `↑ +${item.deltaKelas} Kelas` : `↓ ${item.deltaKelas} Kelas`}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <div className="flex flex-col items-center gap-1">
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-purple-500/10 text-purple-900 border border-purple-400/30 font-extrabold text-xs">
                          <UserCheck className="w-3.5 h-3.5 text-purple-600" />
                          {item.kebutuhanTutorMin.toLocaleString('id-ID')} Tutor
                        </span>
                        {compareMasa && item.deltaTutor !== undefined && item.deltaTutor !== 0 && (
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full inline-flex items-center gap-0.5 ${
                              item.deltaTutor > 0 ? 'bg-purple-100 text-purple-800' : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {item.deltaTutor > 0 ? `↑ +${item.deltaTutor} Tutor` : `↓ ${item.deltaTutor} Tutor`}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => setSelectedItem(item)}
                        className="btn-secondary py-1 px-2.5 text-xs inline-flex items-center gap-1.5 font-bold hover:bg-ut-navy hover:text-white transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Rincian</span>
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {!loading && sortedItems.length > 0 && (
          <Pagination
            currentPage={page}
            totalItems={sortedItems.length}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        )}
      </div>

      {/* UPLOAD EXCEL MODAL - Super Admin Only */}
      {mounted && showUploadModal && isSuperAdmin && createPortal(
        <div className="fixed inset-0 w-screen h-screen min-h-screen bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[999999] p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100 animate-in fade-in zoom-in-95 duration-200 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-ut-navy/10 text-ut-navy flex items-center justify-center font-bold">
                  <FileUp className="w-5 h-5 text-ut-navy" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Unggah Data Prediksi Pembentukan Kelas</h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 inline" />
                    Otoritas Super Admin
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowUploadModal(false)
                  setUploadFile(null)
                  setUploadSuccessMsg('')
                  setUploadErrorMsg('')
                }}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              {/* Select Masa Target */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Target Masa Akademik:</label>
                <select
                  value={uploadMasa}
                  onChange={(e) => setUploadMasa(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-bold text-ut-navy focus:outline-none focus:ring-2 focus:ring-ut-navy/20"
                >
                  {MASA_OPTIONS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label} ({m.value})
                    </option>
                  ))}
                </select>
              </div>

              {/* Upload Input Box */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Pilih File Spreadsheet (.xlsx / .xls):</label>
                <div className="border-2 border-dashed border-slate-300 hover:border-ut-blue rounded-2xl p-4 text-center bg-slate-50/50 hover:bg-sky-50/30 transition cursor-pointer relative">
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setUploadFile(e.target.files[0])
                        setUploadErrorMsg('')
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <FileSpreadsheet className="w-8 h-8 text-ut-blue mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">
                    {uploadFile ? uploadFile.name : 'Klik atau seret file Excel ke sini'}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">Format didukung: XLS, XLSX (Maks 10MB)</p>
                </div>
              </div>

              {/* Notifications */}
              {uploadSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{uploadSuccessMsg}</span>
                </div>
              )}

              {uploadErrorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{uploadErrorMsg}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false)
                    setUploadFile(null)
                    setUploadSuccessMsg('')
                    setUploadErrorMsg('')
                  }}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                  disabled={uploading}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={uploading || !uploadFile}
                  className="btn-primary text-xs py-2 px-5 rounded-xl font-bold bg-ut-navy text-white hover:bg-ut-blue disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Mengunggah...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Simpan Data Prediksi</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* DETAIL ALOKASI KELAS & TUTOR MODAL PREVIEW */}
      {mounted && selectedItem && createPortal(
        <div className="fixed inset-0 w-screen h-screen min-h-screen bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[999999] p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-100 animate-in fade-in zoom-in-95 duration-200 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-ut-navy/10 text-ut-navy flex items-center justify-center font-bold">
                  <Calculator className="w-5 h-5 text-ut-navy" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Detail Rincian Prediksi Kelas & Tutor</h3>
                  <p className="text-xs text-slate-500">Mata Kuliah {selectedItem.kodeMatkul}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200/70">
              <div className="grid grid-cols-2 gap-3 pb-2 border-b border-slate-200">
                <div>
                  <p className="text-slate-400 font-medium">Kode & Nama Matakuliah:</p>
                  <p className="font-extrabold text-slate-900 text-sm">
                    {selectedItem.kodeMatkul} — {selectedItem.namaMatkul}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Program Studi:</p>
                  <p className="font-bold text-slate-800">{selectedItem.prodiName} ({selectedItem.prodiCode})</p>
                </div>
              </div>

              {/* Total Peserta Tuton */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
                <span className="font-bold text-slate-700 text-xs flex items-center gap-2">
                  <Users className="w-4 h-4 text-ut-navy" />
                  Total Peserta Tuton:
                </span>
                <span className="font-black text-amber-900 text-sm bg-amber-50 px-3 py-1 rounded-lg border border-amber-200">
                  {(selectedItem.jumlahTuton || selectedItem.totalMahasiswa).toLocaleString('id-ID')} Mahasiswa
                </span>
              </div>

              {/* Formula Box 1: Prediksi Kelas */}
              <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200 space-y-1">
                <p className="font-bold text-emerald-900 text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  1. Formula Prediksi Kelas:
                </p>
                <p className="font-mono text-xs text-emerald-900 font-bold bg-white p-2 rounded border border-emerald-300 text-center">
                  ⌈{selectedItem.totalMahasiswa.toLocaleString('id-ID')} Mhs ÷ 50 Mhs⌉ = {selectedItem.kebutuhanKelas.toLocaleString('id-ID')} Kelas Tuton
                </p>
              </div>

              {/* Formula Box 2: Minimal Tutor */}
              <div className="bg-purple-50 p-3.5 rounded-xl border border-purple-200 space-y-1">
                <p className="font-bold text-purple-900 text-xs flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-purple-600" />
                  2. Formula Kebutuhan Minimal Tutor:
                </p>
                <p className="font-mono text-xs text-purple-900 font-bold bg-white p-2 rounded border border-purple-300 text-center">
                  ⌈{selectedItem.kebutuhanKelas.toLocaleString('id-ID')} Kelas ÷ 4 Kelas/Tutor⌉ = {selectedItem.kebutuhanTutorMin.toLocaleString('id-ID')} Tutor Minimal
                </p>
                <p className="text-[11px] text-purple-700 pt-0.5">
                  Setiap 1 tutor mengampu maksimal 4 kelas, sehingga dibutuhkan minimal <strong>{selectedItem.kebutuhanTutorMin.toLocaleString('id-ID')} tutor</strong> untuk mengampu {selectedItem.kebutuhanKelas.toLocaleString('id-ID')} kelas.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedItem(null)}
                className="btn-primary text-xs py-2 px-5 rounded-xl"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL SINKRONISASI TUTON (registrasi.ut.ac.id) */}
      {mounted && showTutonModal && isSuperAdmin && createPortal(
        <div className="fixed inset-0 w-screen h-screen min-h-screen bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[999999] p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-100 animate-in fade-in zoom-in-95 duration-200 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-ut-navy/10 text-ut-navy flex items-center justify-center font-bold">
                  <RefreshCw className={`w-5 h-5 text-ut-navy ${syncingTuton ? 'animate-spin' : ''}`} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Sinkronisasi Peserta Tuton</h3>
                  <p className="text-xs text-slate-500">Pembaruan Data Otomatis</p>
                </div>
              </div>
              <button
                onClick={() => setShowTutonModal(false)}
                disabled={syncingTuton}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 disabled:opacity-40"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-200 leading-relaxed">
                Sistem akan memperbarui data jumlah peserta Tutorial Online (Tuton) secara langsung dari portal resmi Universitas Terbuka untuk seluruh mata kuliah FHISIP.
              </p>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 text-xs block">
                    Target Masa Registrasi UT:
                  </label>
                  <select
                    value={syncMasa}
                    onChange={(e) => setSyncMasa(e.target.value)}
                    disabled={syncingTuton}
                    className="w-full text-xs font-semibold rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:border-ut-navy focus:ring-1 focus:ring-ut-navy disabled:opacity-50"
                  >
                    {MASA_OPTIONS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label} ({m.value})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 text-xs block flex items-center justify-between">
                    <span>Pilih Program Studi Dituju:</span>
                    <span className="text-[11px] font-normal text-slate-500">Filter Khusus / All</span>
                  </label>
                  <select
                    value={syncProdi}
                    onChange={(e) => setSyncProdi(e.target.value)}
                    disabled={syncingTuton}
                    className="w-full text-xs font-semibold rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:border-ut-navy focus:ring-1 focus:ring-ut-navy disabled:opacity-50"
                  >
                    <option value="ALL">Seluruh Program Studi FHISIP (Semua 261 Matkul)</option>
                    <option value="HKUM">S1 Ilmu Hukum (FSIH / HKUM)</option>
                    <option value="ADPU">S1 Administrasi Publik (FSAP / ADPU)</option>
                    <option value="ADBI">S1 Administrasi Bisnis (FSAB / ADBI)</option>
                    <option value="IKOM">S1 Ilmu Komunikasi (FSIK / IKOM)</option>
                    <option value="IPEM">S1 Ilmu Pemerintahan (FSPE / IPEM)</option>
                    <option value="SOSI">S1 Sosiologi (FSSO / SOSI)</option>
                    <option value="PUS">S1 Ilmu Perpustakaan (FSIP / PUS)</option>
                    <option value="PAJAK">S1 Perpajakan (FSSP / PAJAK)</option>
                    <option value="SING">S1 Sastra Inggris (FSSI / SING)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 text-xs block flex items-center justify-between">
                    <span>Filter Semester Mata Kuliah:</span>
                    <span className="text-[11px] font-normal text-slate-500">Semester Paket</span>
                  </label>
                  <select
                    value={syncSemester}
                    onChange={(e) => setSyncSemester(e.target.value)}
                    disabled={syncingTuton}
                    className="w-full text-xs font-semibold rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:border-ut-navy focus:ring-1 focus:ring-ut-navy disabled:opacity-50"
                  >
                    <option value="ALL">Semua Semester (Seluruh Matkul)</option>
                    <option value="GANJIL">Semester Ganjil (1, 3, 5, 7)</option>
                    <option value="GENAP">Semester Genap (2, 4, 6, 8)</option>
                    <option value="1">Semester 1</option>
                    <option value="2">Semester 2</option>
                    <option value="3">Semester 3</option>
                    <option value="4">Semester 4</option>
                    <option value="5">Semester 5</option>
                    <option value="6">Semester 6</option>
                    <option value="7">Semester 7</option>
                    <option value="8">Semester 8</option>
                  </select>
                </div>

                <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-900 text-xs flex items-start gap-2">
                  <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    i
                  </div>
                  <div>
                    <span className="font-bold text-blue-950">Target Ekstraksi Angka Peserta:</span>
                    <p className="mt-0.5 text-slate-600 text-[11px] leading-relaxed">
                      Sistem akan secara spesifik mengekstrak jumlah <strong className="text-slate-900">entries</strong> (contoh: <strong className="text-blue-900 font-mono">18.336</strong> dari <code className="font-mono bg-blue-100/80 px-1 py-0.5 rounded text-blue-900 font-bold">&quot;Showing 1 to 10 of 18,336 entries&quot;</code>), bukan angka <em>total entries</em> (25.145).
                    </p>
                  </div>
                </div>
              </div>

              {/* LIVE PROGRESS BAR & STATUS INDICATOR */}
              {syncingTuton && progressState && (
                <div className="space-y-3 bg-slate-50 border border-slate-200/90 p-4 rounded-2xl animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                      </span>
                      <span className="font-extrabold text-slate-800 text-xs">
                        Proses Sinkronisasi Berlangsung...
                      </span>
                    </div>
                    <span className="font-black text-ut-navy text-xs bg-ut-navy/10 px-2.5 py-1 rounded-lg border border-ut-navy/20 font-mono">
                      {progressState.percentage}%
                    </span>
                  </div>

                  {/* Progress Bar Track & Animated Fill */}
                  <div className="w-full h-3.5 rounded-full bg-slate-200/80 overflow-hidden p-0.5 border border-slate-300/40">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-ut-navy via-ut-blue to-emerald-500 transition-all duration-300 shadow-sm relative overflow-hidden"
                      style={{ width: `${Math.max(4, progressState.percentage)}%` }}
                    >
                      <div className="absolute inset-0 bg-white/25 animate-pulse"></div>
                    </div>
                  </div>

                  {/* Status Info Text */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="truncate max-w-[280px] font-medium text-slate-700">
                      {progressState.itemLabel || progressState.statusText}
                    </span>
                    <span className="font-extrabold text-slate-900 shrink-0 font-mono">
                      {progressState.current} / {progressState.total}
                    </span>
                  </div>
                </div>
              )}

              {tutonResult && (
                <div
                  className={`p-3 rounded-2xl text-xs flex items-start gap-2.5 border ${
                    tutonResult.success
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}
                >
                  {tutonResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <span>{tutonResult.message}</span>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowTutonModal(false)}
                disabled={syncingTuton}
                className="btn-secondary text-xs py-2 px-4 rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSyncTutonData}
                disabled={syncingTuton}
                className="btn-primary text-xs py-2 px-5 rounded-xl font-bold bg-ut-navy text-white hover:bg-ut-blue disabled:opacity-50 inline-flex items-center gap-2"
              >
                {syncingTuton ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memproses Sinkronisasi Tuton...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>Mulai Sinkronisasi Tuton</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* FLOATING TOAST SUCCESS/ERROR ALERT */}
      {mounted && toast && createPortal(
        <div className="fixed top-5 right-5 z-[9999999] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className={`px-5 py-3.5 rounded-2xl shadow-2xl border backdrop-blur-md text-xs font-bold flex items-center gap-3 ${
            toast.type === 'success'
              ? 'bg-slate-900/95 text-emerald-400 border-emerald-500/30'
              : 'bg-slate-900/95 text-rose-400 border-rose-500/30'
          }`}>
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <span className="text-white">{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-3 text-slate-400 hover:text-white font-bold text-sm">✕</button>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
