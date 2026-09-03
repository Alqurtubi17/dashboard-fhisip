'use client'

import React, { useEffect, useState, useRef } from 'react'
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
  const debouncedSearchQuery = useDebounce(searchQuery, 350)
  const [filterOpen, setFilterOpen] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)

  // Student Detail Modal state
  const [selectedDetailStudent, setSelectedDetailStudent] = useState<StudentItem | null>(null)
  const [copiedEmail, setCopiedEmail] = useState(false)

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

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  // Database Sync Modal State (Batch Fetch & Sync to PostgreSQL) table is empty
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

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedProdi !== 'ALL' ||
    selectedStatus !== 'ALL' ||
    selectedSemester !== 'ALL' ||
    minIpk !== 'ALL'

  return (
    <div className="space-y-6">
      {/* Page Header + Super Admin Sync Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Data Mahasiswa</h1>
          <p className="text-slate-500 text-sm flex flex-wrap items-center gap-2 mt-0.5">
            <span>Data mahasiswa terdaftar di lingkungan FHISIP Universitas Terbuka</span>
            {lastSyncedAt && (
              <span className="inline-flex items-center gap-1 text-[11px] bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-medium border border-slate-200">
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
            className="flex items-center gap-2 px-4 py-2.5 bg-ut-navy text-white hover:bg-ut-navy/90 rounded-xl font-semibold text-xs transition shadow-md hover:shadow-lg"
          >
            <RefreshCw className="w-4 h-4 text-amber-400" />
            <span>Sinkronisasi Data</span>
          </button>
        )}
      </div>

      {/* Database Empty Warning Banner for Super Admin */}
      {isSuperAdmin && totalCount === 0 && !loading && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-4 text-amber-900">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <div className="text-xs">
              <p className="font-bold">Basis Data Mahasiswa Belum Terisi</p>
              <p className="text-amber-700">
                Silakan lakukan sinkronisasi untuk mengunduh dan memperbarui basis data mahasiswa FHISIP UT.
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

      {/* Stats Cards (6 Categories) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {[
          { label: 'Total Mahasiswa', val: (categoryStats.total || totalCount).toLocaleString('id-ID'), icon: Users, color: 'text-blue-600 bg-blue-50' },
          { label: 'Mahasiswa Non-Aktif', val: (categoryStats.nonAktif || 0).toLocaleString('id-ID'), icon: Clock, color: 'text-amber-600 bg-amber-50' },
          { label: 'Mahasiswa Alumni', val: (categoryStats.alumni || 0).toLocaleString('id-ID'), icon: GraduationCap, color: 'text-purple-600 bg-purple-50' },
          { label: 'Belum Reg.', val: (categoryStats.belumReg || 0).toLocaleString('id-ID'), icon: FileSpreadsheet, color: 'text-yellow-600 bg-yellow-50' },
          { label: 'Mahasiswa Aktif', val: (categoryStats.aktif || 0).toLocaleString('id-ID'), icon: UserCheck, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Adm / DO / Lainnya', val: (categoryStats.adm || 0).toLocaleString('id-ID'), icon: AlertCircle, color: 'text-slate-600 bg-slate-100' },
        ].map((s) => (
          <div key={s.label} className="card p-4 flex flex-col justify-between hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium text-slate-500 leading-snug">{s.label}</p>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${s.color}`}>
                <s.icon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-bold text-slate-800 mt-2">
              {loading ? <span className="inline-block w-16 h-5 bg-slate-200 animate-pulse rounded" /> : s.val}
            </p>
          </div>
        ))}
      </div>

      {/* Table Card */}
      <div className="card relative overflow-visible z-20">
        {/* Table Header + Controls */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-ut-navy" />
              Daftar Mahasiswa FHISIP UT
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {loading
                ? 'Memuat data mahasiswa...'
                : hasActiveFilters
                ? `Menampilkan ${totalCount.toLocaleString('id-ID')} data mahasiswa`
                : `Menampilkan Halaman ${currentPage.toLocaleString('id-ID')} (${students.length} Data/Hal) dari ${totalCount.toLocaleString('id-ID')}`}
            </p>
          </div>

          {/* Search + Filter Dropdown */}
          <div className="flex items-center gap-2">
            {/* Search bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Cari NIM, Nama, Email, HP..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9 pr-8 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-ut-navy/20 focus:border-ut-navy w-56"
              />
              {searchQuery && (
                <button
                  onClick={() => handleSearchChange('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Popover Button */}
            <div className="relative z-50" ref={filterRef}>
              <button
                onClick={() => setFilterOpen((o) => !o)}
                className={`flex items-center gap-2 py-2 px-3.5 text-xs font-semibold rounded-xl border transition ${
                  filterOpen
                    ? 'bg-ut-navy text-white border-ut-navy'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-ut-navy/40'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                Filter
                {[selectedProdi !== 'ALL', selectedStatus !== 'aktif', selectedSemester !== 'ALL', minIpk !== 'ALL'].filter(Boolean).length > 0 && (
                  <span className="bg-amber-400 text-slate-900 text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {[selectedProdi !== 'ALL', selectedStatus !== 'aktif', selectedSemester !== 'ALL', minIpk !== 'ALL'].filter(Boolean).length}
                  </span>
                )}
              </button>

              {/* Dropdown Panel */}
              {filterOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-700">Filter Mahasiswa</p>
                    <button
                      onClick={() => {
                        setSelectedProdi('ALL')
                        setSelectedStatus('aktif')
                        setSelectedSemester('ALL')
                        setMinIpk('ALL')
                        setCurrentPage(1)
                      }}
                      className="text-[10px] text-ut-blue font-semibold hover:underline"
                    >
                      Reset Semua
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
                      className="w-full py-2 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-ut-navy/20 focus:border-ut-navy font-medium text-slate-700"
                    >
                      {PRODI_LIST.map((p) => (
                        <option key={p.code} value={p.code}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Status */}
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status Mahasiswa</p>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { v: 'ALL', l: 'Semua' },
                        { v: 'non-aktif', l: 'Non-Aktif' },
                        { v: 'alumni', l: 'Alumni' },
                        { v: 'belum-reg', l: 'Belum Reg.' },
                        { v: 'aktif', l: 'Aktif' },
                        { v: 'adm', l: 'Adm / DO' },
                      ].map((s) => (
                        <button
                          key={s.v}
                          onClick={() => {
                            setSelectedStatus(s.v)
                            setCurrentPage(1)
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                            selectedStatus === s.v
                              ? 'bg-ut-navy text-white border-ut-navy'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
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
                    <div className="flex flex-wrap gap-1.5">
                      {['ALL',...Array.from({length:12},(_,i)=>String(i+1))].map((s) => (
                        <button
                          key={s}
                          onClick={() => {
                            setSelectedSemester(s)
                            setCurrentPage(1)
                          }}
                          className={`w-9 h-8 rounded-lg text-xs font-semibold border transition ${
                            selectedSemester === s
                              ? 'bg-ut-navy text-white border-ut-navy'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                          }`}
                        >
                          {s === 'ALL' ? 'All' : s}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* IPK */}
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Minimum IPK</p>
                    <div className="flex flex-wrap gap-2">
                      {[{v:'ALL',l:'Semua'},{v:'3.5',l:'≥ 3.50'},{v:'3.0',l:'≥ 3.00'},{v:'2.75',l:'≥ 2.75'},{v:'2.0',l:'≥ 2.00'}].map((ipk) => (
                        <button
                          key={ipk.v}
                          onClick={() => {
                            setMinIpk(ipk.v)
                            setCurrentPage(1)
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                            minIpk === ipk.v
                              ? 'bg-ut-navy text-white border-ut-navy'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                          }`}
                        >
                          {ipk.l}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => setFilterOpen(false)}
                    className="w-full py-2 bg-ut-navy text-white text-xs font-bold rounded-xl hover:bg-ut-navy/90 transition"
                  >
                    Terapkan Filter
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead className="bg-slate-50 text-slate-500 text-left border-b border-slate-200">
              <tr>
                <th className="px-5 py-3 font-semibold">NIM</th>
                <th className="px-5 py-3 font-semibold">Nama Mahasiswa</th>
                <th className="px-5 py-3 font-semibold">Kontak (HP / Email)</th>
                <th className="px-5 py-3 font-semibold">Program Studi</th>
                <th className="px-5 py-3 font-semibold">Semester</th>
                <th className="px-5 py-3 font-semibold">IPK</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin inline-block mr-2 text-ut-navy" />
                    Memuat data mahasiswa...
                  </td>
                </tr>
              )}
              {!loading && students.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-slate-400">
                    <p className="font-medium text-slate-600">Tidak ada data mahasiswa yang sesuai.</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Coba periksa kata kunci / NIM atau sesuaikan filter pencarian Anda.
                    </p>
                  </td>
                </tr>
              )}
              {!loading &&
                students.map((st, idx) => (
                  <tr key={`${st.nim}-${idx}`} className="border-t border-slate-100 hover:bg-slate-50/50 transition">
                    <td className="px-5 py-3 font-mono text-xs font-bold text-ut-navy">{st.nim}</td>
                    <td className="px-5 py-3 font-medium text-slate-800">{st.name}</td>
                    <td className="px-5 py-3 text-xs">
                      <p className="font-mono text-slate-700">{st.phone || '-'}</p>
                      <p className="text-slate-500 text-[11px] break-all max-w-[220px] leading-tight select-all mt-0.5" title={st.email || '-'}>{st.email || '-'}</p>
                    </td>
                    <td className="px-5 py-3 text-slate-600 text-xs">{st.prodi}</td>
                    <td className="px-5 py-3 text-slate-600">Sem {st.semester}</td>
                    <td className="px-5 py-3 font-semibold text-slate-700">{st.ipk}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          st.status === 'Aktif' || st.status === 'DA' || st.status?.toLowerCase() === 'aktif'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : st.status?.toLowerCase().includes('cuti')
                            ? 'bg-amber-50 text-amber-700 border border-amber-100'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {st.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => setSelectedDetailStudent(st)}
                        className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-ut-navy hover:text-white text-slate-700 rounded-lg font-medium transition inline-flex items-center gap-1 shrink-0 shadow-2xs"
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
        <div className="fixed inset-0 w-screen h-screen min-h-screen bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[999999] p-4 overflow-y-auto">
          <div className="card w-full max-w-lg p-6 relative animate-in fade-in zoom-in-95 my-auto">
            <button
              onClick={() => setSyncModalOpen(false)}
              disabled={syncing}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 disabled:opacity-40"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-ut-navy/10 flex items-center justify-center text-ut-navy">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800">Sinkronisasi Data Mahasiswa</h2>
                <p className="text-xs text-slate-500">Pembaruan Data Otomatis</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 mb-4 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
              Sistem akan memperbarui data mahasiswa FHISIP Universitas Terbuka secara langsung dari data resmi universitas.
            </p>

            <div className="space-y-3 mb-6">
              <label className="text-xs font-bold text-slate-700 block">Jumlah Data Yang Diperbarui:</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: '25.000 Data', pages: 5 },
                  { label: '50.000 Data', pages: 10 },
                  { label: '100.000 Data', pages: 20 },
                  { label: 'Seluruh Data Mahasiswa', pages: 'all' },
                ].map((opt) => (
                  <button
                    key={String(opt.pages)}
                    onClick={() => setSyncPages(opt.pages as any)}
                    disabled={syncing}
                    className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition ${
                      syncPages === opt.pages
                        ? 'bg-ut-navy text-white border-ut-navy shadow-sm'
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
                  Mulai ulang dari awal
                </span>
              </label>
            </div>

            {/* LIVE PROGRESS BAR & STATUS INDICATOR */}
            {syncing && progressState && (
              <div className="mb-5 space-y-3 bg-slate-50 border border-slate-200/90 p-4 rounded-2xl animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    <span className="font-extrabold text-slate-800 text-xs">
                      Memperbarui Data Mahasiswa...
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
                className="btn-secondary text-xs"
              >
                Batal
              </button>
              <button
                onClick={handleSyncData}
                disabled={syncing}
                className="btn-primary text-xs flex items-center gap-2"
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

      {/* Student Detail Modal */}
      {mounted && selectedDetailStudent && createPortal(
        <div className="fixed inset-0 w-screen h-screen min-h-screen bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[999999] px-4">
          <div className="card w-full max-w-md p-6 relative animate-in fade-in zoom-in-95 shadow-2xl my-auto">
            <button
              onClick={() => setSelectedDetailStudent(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3.5 mb-5 border-b border-slate-100 pb-4">
              <div className="w-12 h-12 rounded-2xl bg-ut-navy text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-md">
                <User className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-slate-800 leading-snug">{selectedDetailStudent.name}</h3>
                <p className="text-xs font-mono font-bold text-ut-navy mt-0.5">NIM: {selectedDetailStudent.nim}</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              {/* Email */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-ut-navy" /> Email Mahasiswa
                  </span>
                  {selectedDetailStudent.email && selectedDetailStudent.email !== '-' && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(selectedDetailStudent.email || '')
                        setCopiedEmail(true)
                        setTimeout(() => setCopiedEmail(false), 2000)
                      }}
                      className="text-[10px] text-ut-blue font-semibold hover:underline flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-200"
                    >
                      {copiedEmail ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      {copiedEmail ? 'Tersalin' : 'Salin Email'}
                    </button>
                  )}
                </div>
                <p className="font-mono text-slate-800 text-xs break-all select-all font-bold mt-1">
                  {selectedDetailStudent.email || '-'}
                </p>
              </div>

              {/* Telepon */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                  <Phone className="w-3.5 h-3.5 text-ut-navy" /> Nomor Telepon / HP
                </span>
                <p className="font-mono text-slate-800 text-xs font-bold mt-1">
                  {selectedDetailStudent.phone || '-'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Prodi */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Program Studi</span>
                  <p className="font-semibold text-slate-800">{selectedDetailStudent.prodi}</p>
                </div>

                {/* Semester & IPK */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Semester & IPK</span>
                  <p className="font-semibold text-slate-800">Sem {selectedDetailStudent.semester} · IPK {selectedDetailStudent.ipk}</p>
                </div>
              </div>

              {/* Status */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status Akademik</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {selectedDetailStudent.status}
                </span>
              </div>
            </div>

            <div className="mt-5">
              <button
                onClick={() => setSelectedDetailStudent(null)}
                className="btn-primary text-xs w-full py-2.5 font-bold"
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
