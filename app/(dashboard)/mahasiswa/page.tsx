'use client'

import React, { useEffect, useState, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import {
  Users,
  UserCheck,
  Clock,
  FileSpreadsheet,
  Search,
  Filter,
  X,
  Loader2,
  RefreshCw,
  Database,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  Eye,
  Mail,
  Phone,
  User,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Award,
  Building2,
  ShieldCheck,
  ChevronRight,
  BookOpen,
} from 'lucide-react'
import { Pagination } from '@/components/ui/pagination'
import { useDebounce } from '@/hooks/useDebounce'
import { extractSemester } from '@/lib/mahasiswa-utils'

type StudentItem = {
  nim: string
  name: string
  prodi: string
  semester: number | string
  status: string
  ipk: string
  phone?: string
  email?: string
}

const PRODI_LIST = [
  { code: 'ALL', name: 'Semua Program Studi (9 Prodi)' },
  { code: 'HKUM', name: 'S1 Ilmu Hukum' },
  { code: 'IKOM', name: 'S1 Ilmu Komunikasi' },
  { code: 'ADPU', name: 'S1 Administrasi Publik' },
  { code: 'ADBI', name: 'S1 Administrasi Bisnis' },
  { code: 'IPEM', name: 'S1 Ilmu Pemerintahan' },
  { code: 'SOSI', name: 'S1 Sosiologi' },
  { code: 'SING', name: 'S1 Sastra Inggris' },
  { code: 'PUS', name: 'S1 Ilmu Perpustakaan' },
  { code: 'PAJAK', name: 'S1 Perpajakan' },
]

export default function MahasiswaPage() {
  const [students, setStudents] = useState<StudentItem[]>([])
  const [totalCount, setTotalCount] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [isDbMode, setIsDbMode] = useState(true)
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)
  const [categoryStats, setCategoryStats] = useState<{
    total: number
    aktif: number
    nonAktif: number
    alumni: number
    belumReg: number
    adm: number
  }>({
    total: 392064,
    aktif: 15974,
    nonAktif: 218232,
    alumni: 74822,
    belumReg: 36143,
    adm: 26893,
  })

  // Auth User state
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Filter & Search state
  const [selectedProdi, setSelectedProdi] = useState<string>('ALL')
  const [selectedStatus, setSelectedStatus] = useState<string>('aktif')
  const [selectedSemester, setSelectedSemester] = useState<string>('ALL')
  const [minIpk, setMinIpk] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  const [filterOpen, setFilterOpen] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)

  // Student Detail Modal state
  const [selectedDetailStudent, setSelectedDetailStudent] = useState<StudentItem | null>(null)
  const [copiedEmail, setCopiedEmail] = useState(false)
  const [copiedNim, setCopiedNim] = useState<string | null>(null)

  // Sync Modal state (Super Admin only)
  const [syncModalOpen, setSyncModalOpen] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncPages, setSyncPages] = useState<number | 'all'>('all')
  const [syncFromZero, setSyncFromZero] = useState(false)
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null)
  const [progressState, setProgressState] = useState<{
    percentage: number
    current: number
    total: number
    itemLabel?: string
    statusText?: string
  } | null>(null)
  const [mounted, setMounted] = useState(false)

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  // Check user role
  useEffect(() => {
    const checkRole = async () => {
      try {
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const user = await res.json()
          if (user.role === 'superadmin' || user.email === 'admin@kampus.ac.id') {
            setIsSuperAdmin(true)
          }
        }
      } catch (e) {
        console.error('Failed to load user info:', e)
      }
    }
    checkRole()
  }, [])

  // Keyboard accessibility: Escape closes open popovers / modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedDetailStudent) setSelectedDetailStudent(null)
        else if (syncModalOpen && !syncing) setSyncModalOpen(false)
        else if (filterOpen) setFilterOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedDetailStudent, syncModalOpen, syncing, filterOpen])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Primary Data Loader from PostgreSQL API
  const loadPostgresData = async () => {
    setLoading(true)
    try {
      const query = new URLSearchParams({
        page: String(currentPage),
        pageSize: String(pageSize),
        prodi: selectedProdi,
        status: selectedStatus,
        semester: selectedSemester,
        minIpk: minIpk,
        search: debouncedSearchQuery.trim(),
      })

      const res = await fetch(`/api/mahasiswa?${query.toString()}`)
      if (res.ok) {
        const json = await res.json()
        setStudents(json.items || [])
        setTotalCount(json.totalCount || 0)
        if (json.stats) setCategoryStats(json.stats)
        setLastSyncedAt(json.lastSyncedAt || null)
        setIsDbMode(true)

        // Fallback to SRS API proxy if DB is completely empty (0 records)
        if (json.totalCount === 0 && !hasActiveFilters) {
          setIsDbMode(false)
          fetchProxyFallbackBatch(0)
        }
      } else {
        setIsDbMode(false)
        fetchProxyFallbackBatch(0)
      }
    } catch (e) {
      console.error('Error loading data from PostgreSQL:', e)
      setIsDbMode(false)
      fetchProxyFallbackBatch(0)
    } finally {
      setLoading(false)
    }
  }

  // Database Sync Modal State (Batch Fetch & Sync to PostgreSQL)
  const fetchProxyFallbackBatch = async (pageToFetch: number) => {
    setLoading(true)
    try {
      const res = await fetch('/api/proxy/H_HSRE6NTWU', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variables: { kodeFakultas: 3, limit: 2500, page: pageToFetch },
        }),
      })
      if (res.ok) {
        const json = await res.json()
        const rawData = json.data?.dataPribadi || json.data?.items || json.data || []
        setTotalCount(407950)
        if (Array.isArray(rawData)) {
          const mapped: StudentItem[] = rawData.map((item: any) => ({
            nim: item.nim || 'N/A',
            name: item.nama_mahasiswa || item.name || 'Mahasiswa UT',
            prodi:
              item.info_ut?.program_studi?.nama_program_studi ||
              item.nama_program_studi ||
              item.prodi ||
              'FHISIP',
            semester: extractSemester(item),
            status: item.status_data_pribadi?.keterangan || item.status || 'Aktif',
            ipk: item.info_alih_kredit?.ipk_dp || item.ipk || '3.50',
            phone:
              item.info_kontak?.nomor_hp_mahasiswa && item.info_kontak.nomor_hp_mahasiswa !== '-'
                ? item.info_kontak.nomor_hp_mahasiswa
                : '-',
            email:
              item.info_kontak?.alamat_email_mahasiswa && item.info_kontak.alamat_email_mahasiswa !== '-'
                ? item.info_kontak.alamat_email_mahasiswa
                : '-',
          }))
          setStudents(mapped)
        }
      }
    } catch (e) {
      console.error('Failed proxy fallback:', e)
    } finally {
      setLoading(false)
    }
  }

  // Reload data when pagination, filters, or search change
  useEffect(() => {
    loadPostgresData()
  }, [currentPage, pageSize, selectedProdi, selectedStatus, selectedSemester, minIpk, debouncedSearchQuery])

  // Trigger Sync process (Super Admin only)
  const handleSyncData = async () => {
    setSyncing(true)
    setSyncResult(null)
    setProgressState({
      percentage: 0,
      current: 0,
      total: 100,
      itemLabel: 'Memulai koneksi SRS API...',
      statusText: 'Menghubungkan ke API SRS UT...',
    })

    try {
      const res = await fetch('/api/mahasiswa/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pages: syncPages,
          limit: 2500,
          ...(syncFromZero ? { startPage: 1 } : {}),
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
                  total: data.total || 100,
                  itemLabel: data.itemLabel,
                  statusText: data.statusText,
                })
              } else if (data.type === 'complete') {
                setProgressState({
                  percentage: 100,
                  current: data.totalInDb || 100,
                  total: data.totalInDb || 100,
                  itemLabel: 'Selesai',
                  statusText: 'Sinkronisasi data mahasiswa berhasil!',
                })
                loadPostgresData()
                setTimeout(() => {
                  setSyncModalOpen(false)
                  showToast(data.message || 'Sinkronisasi Data Mahasiswa Berhasil Selesai!', 'success')
                }, 1000)
              } else if (data.type === 'error') {
                showToast(data.error || 'Gagal memperbarui data mahasiswa.', 'error')
                setTimeout(() => {
                  setSyncModalOpen(false)
                }, 1000)
              }
            } catch {}
          }
        }
      }
    } catch (e: any) {
      showToast(e?.message || 'Gagal memperbarui data mahasiswa.', 'error')
    } finally {
      setSyncing(false)
    }
  }

  const handleSearchChange = (val: string) => {
    setSearchQuery(val)
    setCurrentPage(1)
  }

  const handleCopyNim = (nim: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    navigator.clipboard.writeText(nim)
    setCopiedNim(nim)
    setTimeout(() => setCopiedNim(null), 2000)
  }

  const resetAllFilters = () => {
    setSelectedProdi('ALL')
    setSelectedStatus('ALL')
    setSelectedSemester('ALL')
    setMinIpk('ALL')
    setSearchQuery('')
    setCurrentPage(1)
  }

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedProdi !== 'ALL' ||
    selectedStatus !== 'ALL' ||
    selectedSemester !== 'ALL' ||
    minIpk !== 'ALL'

  // Helper for IPK badge styling (clean rectangular with subtle rounding, no bubble shape)
  const getIpkBadge = (ipkStr: string) => {
    const val = parseFloat(ipkStr)
    if (isNaN(val)) {
      return (
        <span className="font-mono text-xs font-semibold text-slate-500">
          {ipkStr || '-'}
        </span>
      )
    }
    if (val >= 3.5) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
          <Award className="w-3 h-3 text-emerald-600" />
          <span>{val.toFixed(2)}</span>
        </span>
      )
    }
    if (val >= 3.0) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-sky-50 text-sky-800 border border-sky-200">
          {val.toFixed(2)}
        </span>
      )
    }
    if (val >= 2.75) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
          {val.toFixed(2)}
        </span>
      )
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-rose-50 text-rose-800 border border-rose-200">
        {val.toFixed(2)}
      </span>
    )
  }

  // Helper for Status badge styling with WCAG-compliant high contrast (no bubble shape)
  const getStatusBadge = (statusStr: string) => {
    const s = (statusStr || '').toLowerCase()
    if (s === 'aktif' || s === 'da') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
          Aktif
        </span>
      )
    }
    if (s.includes('alumni') || s.includes('lulus')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-purple-50 text-purple-800 border border-purple-200">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-600"></span>
          Alumni
        </span>
      )
    }
    if (s.includes('cuti') || s.includes('non') || s === 'non-aktif') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
          Non-Aktif
        </span>
      )
    }
    if (s.includes('belum') || s.includes('reg')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-yellow-50 text-yellow-900 border border-yellow-300">
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-600"></span>
          Belum Reg.
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
        {statusStr || 'Lainnya'}
      </span>
    )
  }

  // Active filter count for badge
  const activeFiltersCount = useMemo(() => {
    return [
      selectedProdi !== 'ALL',
      selectedStatus !== 'ALL',
      selectedSemester !== 'ALL',
      minIpk !== 'ALL',
      searchQuery.trim() !== '',
    ].filter(Boolean).length
  }, [selectedProdi, selectedStatus, selectedSemester, minIpk, searchQuery])

  // Selected prodi name for chip
  const selectedProdiName = useMemo(() => {
    return PRODI_LIST.find((p) => p.code === selectedProdi)?.name || selectedProdi
  }, [selectedProdi])

  // Total student baseline for card percentages
  const grandTotal = categoryStats.total || totalCount || 392064

  return (
    <div className="space-y-6">
      {/* Page Header + Super Admin Sync Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/70">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Portal Data Mahasiswa
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-ut-navy/10 text-ut-navy border border-ut-navy/20">
              FHISIP UT
            </span>
          </div>
          <p className="text-slate-500 text-xs sm:text-sm flex flex-wrap items-center gap-2 mt-1">
            <span>Sistem informasi dan monitoring akademik 9 Program Studi FHISIP Universitas Terbuka</span>
            {lastSyncedAt && (
              <span className="inline-flex items-center gap-1 text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium border border-slate-200">
                <Database className="w-3 h-3 text-emerald-600" />
                Terakhir disinkronkan: {new Date(lastSyncedAt).toLocaleString('id-ID')}
              </span>
            )}
          </p>
        </div>

        {/* Super Admin Only Button */}
        {isSuperAdmin && (
          <button
            onClick={() => {
              setSyncResult(null)
              setSyncModalOpen(true)
            }}
            className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 bg-ut-navy text-white hover:bg-ut-navy/90 rounded-xl font-semibold text-xs transition-all duration-150 shadow-sm hover:shadow active:scale-[0.98] border border-white/10"
          >
            <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
            <span>Sinkronisasi Data SRS</span>
          </button>
        )}
      </div>

      {/* Database Empty Warning Banner for Super Admin */}
      {isSuperAdmin && totalCount === 0 && !loading && (
        <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-4 text-amber-900 shadow-2xs">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <div className="text-xs">
              <p className="font-bold">Basis Data Mahasiswa Belum Terisi</p>
              <p className="text-amber-700">
                Silakan lakukan sinkronisasi untuk mengunduh dan memperbarui basis data mahasiswa FHISIP UT dari SRS API.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setSyncResult(null)
              setSyncModalOpen(true)
            }}
            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs shrink-0 transition"
          >
            Sinkronkan Sekarang
          </button>
        </div>
      )}

      {/* Stats Cards (6 Categories) with Interactive Filter Trigger */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {[
          {
            label: 'Total Mahasiswa',
            val: (categoryStats.total || totalCount).toLocaleString('id-ID'),
            sub: 'Seluruh Sivitas',
            statusCode: 'ALL',
            icon: Users,
            color: 'text-blue-700 bg-blue-50 border-blue-100',
            borderHover: 'hover:border-blue-400',
          },
          {
            label: 'Mahasiswa Aktif',
            val: (categoryStats.aktif || 0).toLocaleString('id-ID'),
            sub: `${((categoryStats.aktif / grandTotal) * 100).toFixed(1)}% dari total`,
            statusCode: 'aktif',
            icon: UserCheck,
            color: 'text-emerald-700 bg-emerald-50 border-emerald-100',
            borderHover: 'hover:border-emerald-400',
          },
          {
            label: 'Mahasiswa Non-Aktif',
            val: (categoryStats.nonAktif || 0).toLocaleString('id-ID'),
            sub: `${((categoryStats.nonAktif / grandTotal) * 100).toFixed(1)}% dari total`,
            statusCode: 'non-aktif',
            icon: Clock,
            color: 'text-amber-700 bg-amber-50 border-amber-100',
            borderHover: 'hover:border-amber-400',
          },
          {
            label: 'Mahasiswa Alumni',
            val: (categoryStats.alumni || 0).toLocaleString('id-ID'),
            sub: `${((categoryStats.alumni / grandTotal) * 100).toFixed(1)}% dari total`,
            statusCode: 'alumni',
            icon: GraduationCap,
            color: 'text-purple-700 bg-purple-50 border-purple-100',
            borderHover: 'hover:border-purple-400',
          },
          {
            label: 'Belum Registrasi',
            val: (categoryStats.belumReg || 0).toLocaleString('id-ID'),
            sub: `${((categoryStats.belumReg / grandTotal) * 100).toFixed(1)}% dari total`,
            statusCode: 'belum-reg',
            icon: FileSpreadsheet,
            color: 'text-yellow-800 bg-yellow-50 border-yellow-200',
            borderHover: 'hover:border-yellow-400',
          },
          {
            label: 'Adm / DO / Lainnya',
            val: (categoryStats.adm || 0).toLocaleString('id-ID'),
            sub: `${((categoryStats.adm / grandTotal) * 100).toFixed(1)}% dari total`,
            statusCode: 'adm',
            icon: AlertCircle,
            color: 'text-slate-700 bg-slate-100 border-slate-200',
            borderHover: 'hover:border-slate-400',
          },
        ].map((s) => {
          const isSelected = selectedStatus === s.statusCode
          return (
            <button
              key={s.label}
              onClick={() => {
                setSelectedStatus(isSelected ? 'ALL' : s.statusCode)
                setCurrentPage(1)
              }}
              className={`p-3.5 rounded-2xl bg-white border text-left transition-all duration-150 flex flex-col justify-between cursor-pointer focus:outline-none focus:ring-2 focus:ring-ut-navy/20 ${
                isSelected
                  ? 'border-ut-navy ring-1 ring-ut-navy/30 bg-slate-50/70 shadow-sm'
                  : `border-slate-200/80 hover:shadow-sm ${s.borderHover}`
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">
                  {s.label}
                </span>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${s.color}`}>
                  <s.icon className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-xl font-black text-slate-900 tracking-tight font-mono">
                  {loading ? (
                    <span className="inline-block w-16 h-5 bg-slate-200 animate-pulse rounded" />
                  ) : (
                    s.val
                  )}
                </p>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5 truncate">{s.sub}</p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Main Table Container Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs relative overflow-visible z-10">
        {/* Table Control Header */}
        <div className="p-4 border-b border-slate-100 flex flex-col gap-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-ut-navy" />
                <span>Daftar Mahasiswa FHISIP UT</span>
                <span className="text-slate-400 font-normal text-xs">·</span>
                <span className="text-xs font-semibold text-slate-500">
                  {loading
                    ? 'Memuat data...'
                    : `${totalCount.toLocaleString('id-ID')} Data Ditemukan`}
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Menampilkan halaman {currentPage.toLocaleString('id-ID')} ({students.length} mahasiswa per halaman)
              </p>
            </div>

            {/* Search + Filter Popover */}
            <div className="flex items-center gap-2">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Cari NIM, Nama, Email, HP..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-9 pr-8 py-2 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-ut-navy/20 focus:border-ut-navy w-56 sm:w-64 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => handleSearchChange('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    title="Hapus pencarian"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Filter Popover Trigger */}
              <div className="relative z-50" ref={filterRef}>
                <button
                  onClick={() => setFilterOpen((o) => !o)}
                  className={`flex items-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-xl border transition-all ${
                    filterOpen
                      ? 'bg-ut-navy text-white border-ut-navy shadow-sm'
                      : activeFiltersCount > 0
                      ? 'bg-ut-navy/5 text-ut-navy border-ut-navy/30 hover:bg-ut-navy/10'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>Filter</span>
                  {activeFiltersCount > 0 && (
                    <span className="bg-amber-400 text-slate-950 text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>

                {/* Dropdown Panel */}
                {filterOpen && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-4 space-y-4 animate-in fade-in zoom-in-95">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <Filter className="w-3.5 h-3.5 text-ut-navy" />
                        <p className="text-xs font-bold text-slate-800">Filter Mahasiswa</p>
                      </div>
                      <button
                        onClick={resetAllFilters}
                        className="text-[11px] text-ut-blue font-semibold hover:underline flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset Semua</span>
                      </button>
                    </div>

                    {/* Program Studi */}
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Program Studi</p>
                      <select
                        value={selectedProdi}
                        onChange={(e) => {
                          setSelectedProdi(e.target.value)
                          setCurrentPage(1)
                        }}
                        className="w-full py-2 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-ut-navy/20 focus:border-ut-navy font-medium text-slate-800"
                      >
                        {PRODI_LIST.map((p) => (
                          <option key={p.code} value={p.code}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Status */}
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status Mahasiswa</p>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { v: 'ALL', l: 'Semua' },
                          { v: 'aktif', l: 'Aktif' },
                          { v: 'non-aktif', l: 'Non-Aktif' },
                          { v: 'alumni', l: 'Alumni' },
                          { v: 'belum-reg', l: 'Belum Reg.' },
                          { v: 'adm', l: 'Adm / DO' },
                        ].map((s) => (
                          <button
                            key={s.v}
                            onClick={() => {
                              setSelectedStatus(s.v)
                              setCurrentPage(1)
                            }}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
                              selectedStatus === s.v
                                ? 'bg-ut-navy text-white border-ut-navy'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            {s.l}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Semester */}
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Semester</p>
                      <div className="grid grid-cols-5 gap-1">
                        {['ALL', ...Array.from({ length: 9 }, (_, i) => String(i + 1))].map((s) => (
                          <button
                            key={s}
                            onClick={() => {
                              setSelectedSemester(s)
                              setCurrentPage(1)
                            }}
                            className={`h-7 rounded-lg text-xs font-semibold border transition ${
                              selectedSemester === s
                                ? 'bg-ut-navy text-white border-ut-navy'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            {s === 'ALL' ? 'All' : s}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* IPK */}
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ambang Batas IPK</p>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { v: 'ALL', l: 'Semua' },
                          { v: '3.5', l: '≥ 3.50 (Cumlaude)' },
                          { v: '3.0', l: '≥ 3.00' },
                          { v: '2.75', l: '≥ 2.75' },
                          { v: '2.0', l: '≥ 2.00' },
                        ].map((ipk) => (
                          <button
                            key={ipk.v}
                            onClick={() => {
                              setMinIpk(ipk.v)
                              setCurrentPage(1)
                            }}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
                              minIpk === ipk.v
                                ? 'bg-ut-navy text-white border-ut-navy'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            {ipk.l}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => setFilterOpen(false)}
                      className="w-full py-2 bg-ut-navy text-white text-xs font-bold rounded-xl hover:bg-ut-navy/90 transition shadow-sm"
                    >
                      Terapkan Filter
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Filter Status Tabs & Active Chips Bar (RX-UX-08) */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
            {/* Quick Status Tabs */}
            <div className="flex flex-wrap items-center gap-1">
              {[
                { v: 'ALL', l: 'Semua Status' },
                { v: 'aktif', l: 'Mahasiswa Aktif' },
                { v: 'non-aktif', l: 'Non-Aktif' },
                { v: 'alumni', l: 'Alumni' },
                { v: 'belum-reg', l: 'Belum Reg.' },
                { v: 'adm', l: 'Adm / DO' },
              ].map((tab) => (
                <button
                  key={tab.v}
                  onClick={() => {
                    setSelectedStatus(tab.v)
                    setCurrentPage(1)
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    selectedStatus === tab.v
                      ? 'bg-slate-800 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {tab.l}
                </button>
              ))}
            </div>

            {/* Active Chips & Reset */}
            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-[11px] font-semibold text-slate-400">Filter Aktif:</span>

                {selectedProdi !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px] border border-slate-200">
                    Prodi: {selectedProdi}
                    <button onClick={() => setSelectedProdi('ALL')} className="hover:text-red-600">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {selectedSemester !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px] border border-slate-200">
                    Sem: {selectedSemester}
                    <button onClick={() => setSelectedSemester('ALL')} className="hover:text-red-600">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {minIpk !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px] border border-slate-200">
                    IPK ≥ {minIpk}
                    <button onClick={() => setMinIpk('ALL')} className="hover:text-red-600">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {searchQuery.trim() !== '' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px] border border-slate-200">
                    Kata Kunci: &ldquo;{searchQuery}&rdquo;
                    <button onClick={() => setSearchQuery('')} className="hover:text-red-600">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                <button
                  onClick={resetAllFilters}
                  className="text-[11px] text-ut-blue hover:text-ut-navy font-bold ml-1 hover:underline flex items-center gap-1"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>Reset Filter</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px] border-collapse">
            <thead className="bg-slate-50/80 text-slate-600 text-left border-b border-slate-200">
              <tr>
                <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider">NIM</th>
                <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider">Nama Mahasiswa</th>
                <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider">Kontak (HP / Email)</th>
                <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider">Program Studi</th>
                <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider">Semester</th>
                <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider">IPK</th>
                <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* Skeleton Loading State */}
              {loading &&
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={`skeleton-${idx}`} className="animate-pulse">
                    <td className="px-5 py-3.5">
                      <div className="h-4 w-20 bg-slate-200 rounded"></div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-slate-200 rounded-full"></div>
                        <div className="h-4 w-36 bg-slate-200 rounded"></div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="space-y-1">
                        <div className="h-3 w-24 bg-slate-200 rounded"></div>
                        <div className="h-3 w-32 bg-slate-200 rounded"></div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="h-4 w-28 bg-slate-200 rounded"></div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="h-4 w-12 bg-slate-200 rounded"></div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="h-4 w-12 bg-slate-200 rounded"></div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="h-5 w-16 bg-slate-200 rounded-full"></div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="h-7 w-16 bg-slate-200 rounded-lg ml-auto"></div>
                    </td>
                  </tr>
                ))}

              {/* Empty Results State */}
              {!loading && students.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                        <Search className="w-6 h-6" />
                      </div>
                      <p className="font-bold text-slate-700 text-sm">Tidak ada data mahasiswa yang cocok</p>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Coba periksa kata kunci pencarian Anda atau reset filter yang sedang aktif untuk melihat kembali seluruh data.
                      </p>
                      {hasActiveFilters && (
                        <button
                          onClick={resetAllFilters}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-ut-navy text-white rounded-xl text-xs font-semibold hover:bg-ut-navy/90 transition shadow-sm mt-2"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reset Semua Filter</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}

              {/* Data Rows */}
              {!loading &&
                students.map((st, idx) => (
                  <tr
                    key={`${st.nim}-${idx}`}
                    className="hover:bg-slate-50/70 transition-colors duration-100 group cursor-pointer"
                    onClick={() => setSelectedDetailStudent(st)}
                  >
                    {/* NIM */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-ut-navy">{st.nim}</span>
                        <button
                          onClick={(e) => handleCopyNim(st.nim, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-200/80 rounded transition text-slate-400 hover:text-slate-700"
                          title="Salin NIM"
                        >
                          {copiedNim === st.nim ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Nama Mahasiswa with Avatar */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[11px] font-bold text-slate-700 shrink-0">
                          {st.name?.charAt(0)?.toUpperCase() || 'M'}
                        </div>
                        <span className="font-semibold text-slate-800 text-xs sm:text-sm group-hover:text-ut-navy transition-colors">
                          {st.name}
                        </span>
                      </div>
                    </td>

                    {/* Kontak */}
                    <td className="px-5 py-3 text-xs">
                      <p className="font-mono text-slate-700 font-medium">{st.phone || '-'}</p>
                      <p
                        className="text-slate-500 text-[11px] break-all max-w-[210px] leading-tight truncate mt-0.5"
                        title={st.email || '-'}
                      >
                        {st.email || '-'}
                      </p>
                    </td>

                    {/* Program Studi */}
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/60">
                        {st.prodi}
                      </span>
                    </td>

                    {/* Semester */}
                    <td className="px-5 py-3 text-xs font-semibold text-slate-700">
                      Sem {st.semester}
                    </td>

                    {/* IPK */}
                    <td className="px-5 py-3">
                      {getIpkBadge(st.ipk)}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-3">
                      {getStatusBadge(st.status)}
                    </td>

                    {/* Action */}
                    <td className="px-5 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setSelectedDetailStudent(st)}
                        className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-ut-navy hover:text-white text-slate-700 rounded-lg font-medium transition-all duration-150 inline-flex items-center gap-1 shrink-0 border border-slate-200/60"
                        title="Lihat Detail Lengkap Mahasiswa"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Detail</span>
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && (
          <Pagination
            currentPage={currentPage}
            totalItems={totalCount}
            pageSize={pageSize}
            onPageChange={(p) => setCurrentPage(p)}
            onPageSizeChange={(s) => {
              setPageSize(s)
              setCurrentPage(1)
            }}
          />
        )}
      </div>

      {/* Sync Modal (Super Admin Only) */}
      {mounted && syncModalOpen && isSuperAdmin && createPortal(
        <div
          className="fixed inset-0 w-screen h-screen min-h-screen bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[999999] p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          onClick={() => {
            if (!syncing) setSyncModalOpen(false)
          }}
        >
          <div
            className="bg-white rounded-2xl border border-slate-200/80 shadow-2xl w-full max-w-lg p-6 relative animate-in fade-in zoom-in-95 my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSyncModalOpen(false)}
              disabled={syncing}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 disabled:opacity-40 p-1 rounded-lg hover:bg-slate-100 transition"
              aria-label="Tutup dialog"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-ut-navy/10 flex items-center justify-center text-ut-navy">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Sinkronisasi Data Mahasiswa</h2>
                <p className="text-xs text-slate-500">Integrasi SRS API & Basis Data PostgreSQL Lokal</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 mb-4 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
              Sistem akan mengunduh dan memperbarui data mahasiswa FHISIP Universitas Terbuka secara bertahap dari API SRS UT ke database PostgreSQL lokal untuk mendukung pencarian kilat.
            </p>

            <div className="space-y-3 mb-6">
              <label className="text-xs font-bold text-slate-700 block">Jumlah Data Yang Diperbarui:</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: '25.000 Data', pages: 5 },
                  { label: '50.000 Data', pages: 10 },
                  { label: '100.000 Data', pages: 20 },
                  { label: 'Seluruh Mahasiswa (~400k)', pages: 'all' },
                ].map((opt) => (
                  <button
                    key={String(opt.pages)}
                    onClick={() => setSyncPages(opt.pages as any)}
                    disabled={syncing}
                    className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all ${
                      syncPages === opt.pages
                        ? 'bg-ut-navy text-white border-ut-navy shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-100 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={syncFromZero}
                  onChange={(e) => setSyncFromZero(e.target.checked)}
                  disabled={syncing}
                  className="w-4 h-4 rounded text-ut-navy focus:ring-ut-navy/20"
                />
                <span className="text-xs text-slate-700 font-medium">
                  Mulai sinkronisasi ulang dari awal (Halaman 1)
                </span>
              </label>
            </div>

            {/* LIVE PROGRESS BAR & STATUS INDICATOR */}
            {syncing && progressState && (
              <div className="mb-5 space-y-3 bg-slate-50 border border-slate-200 p-4 rounded-2xl animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    <span className="font-bold text-slate-800 text-xs">
                      Memperbarui Data Mahasiswa...
                    </span>
                  </div>
                  <span className="font-bold text-ut-navy text-xs bg-ut-navy/10 px-2 py-0.5 rounded-lg border border-ut-navy/20 font-mono">
                    {progressState.percentage}%
                  </span>
                </div>

                {/* Progress Bar Track & Animated Fill */}
                <div className="w-full h-3 rounded-full bg-slate-200 overflow-hidden p-0.5 border border-slate-300/40">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-ut-navy via-ut-blue to-emerald-500 transition-all duration-300 relative overflow-hidden"
                    style={{ width: `${Math.max(4, progressState.percentage)}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                  </div>
                </div>

                {/* Status Info Text */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span className="truncate max-w-[280px] font-medium text-slate-700 font-sans">
                    {progressState.itemLabel || progressState.statusText}
                  </span>
                  <span className="font-bold text-slate-900 shrink-0">
                    {progressState.current} / {progressState.total}
                  </span>
                </div>
              </div>
            )}

            {syncResult && (
              <div
                className={`mb-5 p-3 rounded-xl text-xs flex items-start gap-2.5 border ${
                  syncResult.success
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-red-50 text-red-800 border-red-200'
                }`}
              >
                {syncResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                )}
                <span>{syncResult.message}</span>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setSyncModalOpen(false)}
                disabled={syncing}
                className="px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-50 transition"
              >
                Batal
              </button>
              <button
                onClick={handleSyncData}
                disabled={syncing}
                className="px-4 py-2 bg-ut-navy text-white rounded-xl text-xs font-bold hover:bg-ut-navy/90 transition flex items-center gap-2 shadow-sm"
              >
                {syncing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Memproses Sinkronisasi...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Mulai Sinkronisasi</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Student Detail Modal (Adheres to RYUX Design & UU PDP) */}
      {mounted && selectedDetailStudent && createPortal(
        <div
          className="fixed inset-0 w-screen h-screen min-h-screen bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[999999] px-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedDetailStudent(null)}
        >
          <div
            className="bg-white rounded-2xl border border-slate-200/80 shadow-2xl w-full max-w-lg p-6 relative animate-in fade-in zoom-in-95 my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedDetailStudent(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
              aria-label="Tutup detail mahasiswa"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3.5 mb-5 border-b border-slate-100 pb-4">
              <div className="w-12 h-12 rounded-2xl bg-ut-navy text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-sm">
                {selectedDetailStudent.name?.charAt(0)?.toUpperCase() || 'M'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900 leading-snug truncate">
                    {selectedDetailStudent.name}
                  </h3>
                  {getStatusBadge(selectedDetailStudent.status)}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-xs font-bold text-ut-navy bg-ut-navy/5 px-2 py-0.5 rounded border border-ut-navy/15">
                    NIM: {selectedDetailStudent.nim}
                  </span>
                  <button
                    onClick={() => handleCopyNim(selectedDetailStudent.nim)}
                    className="text-[11px] text-slate-500 hover:text-ut-navy flex items-center gap-1 font-semibold"
                  >
                    {copiedNim === selectedDetailStudent.nim ? (
                      <span className="text-emerald-600 flex items-center gap-0.5">
                        <Check className="w-3 h-3" /> Tersalin
                      </span>
                    ) : (
                      <span className="flex items-center gap-0.5">
                        <Copy className="w-3 h-3" /> Salin NIM
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Body - Structured Information Grid */}
            <div className="space-y-3.5 text-xs">
              {/* Ringkasan Akademik Section */}
              <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-ut-navy" />
                  <span>Informasi Akademik</span>
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Program Studi</span>
                    <p className="font-bold text-slate-800 text-xs mt-0.5">{selectedDetailStudent.prodi}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Semester & IPK</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-bold text-slate-800">Sem {selectedDetailStudent.semester}</span>
                      <span className="text-slate-300">·</span>
                      {getIpkBadge(selectedDetailStudent.ipk)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Kontak Mahasiswa Section */}
              <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-100 space-y-2.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-ut-navy" />
                  <span>Kontak Resmi Mahasiswa</span>
                </p>

                {/* Email */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/50">
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] text-slate-400 block font-medium">Alamat Email</span>
                    <p className="font-mono text-slate-800 text-xs font-semibold truncate mt-0.5" title={selectedDetailStudent.email || '-'}>
                      {selectedDetailStudent.email || '-'}
                    </p>
                  </div>
                  {selectedDetailStudent.email && selectedDetailStudent.email !== '-' && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(selectedDetailStudent.email || '')
                        setCopiedEmail(true)
                        setTimeout(() => setCopiedEmail(false), 2000)
                      }}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-slate-700 hover:text-ut-navy transition flex items-center gap-1 shrink-0"
                    >
                      {copiedEmail ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedEmail ? 'Tersalin' : 'Salin'}</span>
                    </button>
                  )}
                </div>

                {/* Telepon */}
                <div className="pt-2 border-t border-slate-200/50">
                  <span className="text-[10px] text-slate-400 block font-medium">Nomor Telepon / WhatsApp</span>
                  <p className="font-mono text-slate-800 text-xs font-semibold mt-0.5">
                    {selectedDetailStudent.phone || '-'}
                  </p>
                </div>
              </div>

              {/* Institutional Notice */}
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-blue-50/60 text-blue-900 border border-blue-100 text-[11px]">
                <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0" />
                <span>
                  Data resmi FHISIP Universitas Terbuka. Dilindungi standar kepatuhan privasi internal UT.
                </span>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedDetailStudent(null)}
                className="px-5 py-2 bg-ut-navy hover:bg-ut-navy/90 text-white text-xs font-bold rounded-xl transition shadow-sm"
              >
                Tutup Detail
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* FLOATING TOAST SUCCESS/ERROR ALERT */}
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
