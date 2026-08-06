'use client'

import { useEffect, useState } from 'react'
import {
  Users,
  GraduationCap,
  BookOpen,
  Globe2,
  ArrowRight,
  Award,
  CheckCircle2,
  UserCheck,
  FileCheck,
  Clock,
  FileSearch,
  Search,
  FileSpreadsheet,
  Filter,
  Eye,
  X,
  FileText,
  Building2,
  ShieldCheck,
  BookMarked,
  Award as AwardIcon,
} from 'lucide-react'
import { Pagination } from '@/components/ui/pagination'

type DashboardStats = {
  totalMahasiswa: number
  totalPengajar: number
  totalProdi: number
  totalTutorial: number
  totalYudisium: number
  rplStats: {
    total: number
    diproses: number
    diasesment: number
    selesai: number
  }
  prodiList: Array<{ code: string; name: string; count: number }>
}

type LkamItem = {
  id: string
  nim: string
  name: string
  prodiCode: string
  prodiName: string
  totalSksKurikulum: number
  sksDibebaskan: number
  sisaSksWajib: number
  matkulDibebaskanCount: number
  ipkAlihKredit: string
  status: string
  tanggalSk: string
  noSk: string
}

import { useDebounce } from '@/hooks/useDebounce'

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalMahasiswa: 407950,
    totalPengajar: 2842,
    totalProdi: 9,
    totalTutorial: 925,
    totalYudisium: 2056583,
    rplStats: {
      total: 4759,
      diproses: 296,
      diasesment: 246,
      selesai: 4217,
    },
    prodiList: [
      { name: 'S1 Ilmu Hukum', code: 'HKUM', count: 128450 },
      { name: 'S1 Ilmu Komunikasi', code: 'IKOM', count: 76200 },
      { name: 'S1 Administrasi Publik', code: 'ADPU', count: 68900 },
      { name: 'S1 Administrasi Bisnis', code: 'ADBI', count: 42300 },
      { name: 'S1 Ilmu Pemerintahan', code: 'IPEM', count: 31800 },
      { name: 'S1 Sosiologi', code: 'SOSI', count: 22400 },
      { name: 'S1 Sastra Inggris', code: 'SING', count: 15600 },
      { name: 'S1 Ilmu Perpustakaan', code: 'PUS', count: 12800 },
      { name: 'S1 Perpajakan', code: 'PAJAK', count: 9500 },
    ],
  })
  const [loading, setLoading] = useState(true)

  // LKAM Table State
  const [lkamItems, setLkamItems] = useState<LkamItem[]>([])
  const [lkamLoading, setLkamLoading] = useState(true)
  const [selectedProdiFilter, setSelectedProdiFilter] = useState<string>('ALL')
  const [lkamSearchQuery, setLkamSearchQuery] = useState<string>('')
  const debouncedLkamSearchQuery = useDebounce(lkamSearchQuery, 400)
  const [lkamPage, setLkamPage] = useState<number>(1)
  const [lkamPageSize, setLkamPageSize] = useState<number>(5)
  const [totalLkamItems, setTotalLkamItems] = useState<number>(0)
  const [selectedLkamItem, setSelectedLkamItem] = useState<LkamItem | null>(null)

  const fetchStats = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/dashboard/stats')
      if (res.ok) {
        const json = await res.json()
        if (json.success && json.data) {
          setStats(json.data)
        }
      }
    } catch (e) {
      console.error('Failed to load live dashboard stats:', e)
    } finally {
      setLoading(false)
    }
  }

  const fetchLkamData = async () => {
    setLkamLoading(true)
    try {
      const url = `/api/dashboard/lkam?prodi=${selectedProdiFilter}&query=${encodeURIComponent(
        debouncedLkamSearchQuery
      )}&page=${lkamPage}&pageSize=${lkamPageSize}`
      const res = await fetch(url)
      if (res.ok) {
        const json = await res.json()
        if (json.success && json.data) {
          setLkamItems(json.data.items)
          setTotalLkamItems(json.data.totalItems)
        }
      }
    } catch (e) {
      console.error('Failed to load LKAM table data:', e)
    } finally {
      setLkamLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()

    // Read configured refresh interval from settings (localStorage)
    const saved = typeof window !== 'undefined' ? localStorage.getItem('dashboard_refresh_interval') : null
    const intervalMs = saved !== null ? parseInt(saved, 10) : 60 * 60 * 1000

    if (intervalMs > 0) {
      const interval = setInterval(fetchStats, intervalMs)
      return () => clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    fetchLkamData()
  }, [selectedProdiFilter, debouncedLkamSearchQuery, lkamPage, lkamPageSize])

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Welcome Banner UT FHISIP */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#001D33] via-[#002B49] to-[#005691] text-white p-6 sm:p-8 shadow-xl border border-white/10">
        {/* Background Decorative UT Logo Image */}
        <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-30 pointer-events-none hidden md:block w-48 h-48">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/ut-banner-bg.png"
            alt=""
            className="w-full h-full object-contain filter brightness-150"
          />
        </div>
        <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-amber-400/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 space-y-4 max-w-3xl">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
            Fakultas Hukum, Ilmu Sosial dan Ilmu Politik
          </h1>
          <p className="text-sm text-slate-200 leading-relaxed">
            Pusat kendali administrasi akademik dan pengelolaan layanan mahasiswa Pendidikan Tinggi Terbuka dan Jarak Jauh (PTTJJ) Universitas Terbuka.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15">
              <Globe2 className="w-4 h-4 text-amber-400" />
              <span>Jangkauan 39 UT Daerah</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15">
              <Award className="w-4 h-4 text-amber-400" />
              <span>Akreditasi Unggul & Terakreditasi International</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Academic Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: 'Mahasiswa Terregistrasi',
            value: stats.totalMahasiswa.toLocaleString('id-ID'),
            desc: 'Mahasiswa Aktif FHISIP',
            icon: GraduationCap,
            color: 'bg-ut-navy text-amber-400',
          },
          {
            title: 'Dosen & Pengajar',
            value: stats.totalPengajar.toLocaleString('id-ID'),
            desc: 'Tutor Tuton & Tuweb',
            icon: Users,
            color: 'bg-ut-blue text-white',
          },
          {
            title: 'Program Studi',
            value: '9',
            desc: '9 Program Studi FHISIP UT',
            icon: BookOpen,
            color: 'bg-emerald-700 text-white',
          },
          {
            title: 'Layanan Tutorial Aktif',
            value: stats.totalTutorial.toLocaleString('id-ID'),
            desc: 'Mata Kuliah Aktif Ditawarkan',
            icon: UserCheck,
            color: 'bg-amber-500 text-slate-950',
          },
        ].map((item) => (
          <div key={item.title} className="card p-5 card-hover relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{item.title}</p>
                <p className="text-2xl font-extrabold text-slate-900 mt-1">
                  {loading ? (
                    <span className="inline-block w-20 h-7 bg-slate-200 animate-pulse rounded"></span>
                  ) : (
                    item.value
                  )}
                </p>
              </div>
              <div className={`p-3 rounded-2xl ${item.color} shadow-sm`}>
                <item.icon className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>{item.desc}</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            </div>
          </div>
        ))}
      </div>

      {/* Program Studi FHISIP (9 Prodi) */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-ut-blue" />
              Program Studi FHISIP UT (9 Prodi)
            </h2>
            <p className="text-xs text-slate-500">Distribusi mahasiswa terdaftar aktif per program studi FHISIP UT</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {stats.prodiList.map((p) => (
            <div
              key={p.code}
              className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-ut-blue/40 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-ut-navy/10 text-ut-navy font-extrabold text-xs flex items-center justify-center group-hover:bg-ut-navy group-hover:text-amber-400 transition-all shrink-0">
                  {p.code}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate" title={p.name}>{p.name}</p>
                  <p className="text-xs text-slate-500">
                    {loading ? 'Memuat...' : `${p.count.toLocaleString('id-ID')} Mahasiswa`}
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-ut-blue group-hover:translate-x-1 transition-all shrink-0" />
            </div>
          ))}
        </div>
      </div>

      {/* Section RPL (Rekognisi Pembelajaran Lampau) Cards */}
      <div className="card p-6 space-y-4">
        <div className="pb-3 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-ut-blue" />
            Rekognisi Pembelajaran Lampau (RPL)
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total RPL */}
          <div className="p-5 rounded-2xl bg-slate-900 text-white border border-slate-800 flex items-center justify-between hover:shadow-md transition">
            <div>
              <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">Total RPL</p>
              <p className="text-2xl font-extrabold text-white mt-1">
                {loading ? <span className="inline-block w-16 h-7 bg-slate-700 animate-pulse rounded"></span> : stats.rplStats.total.toLocaleString('id-ID')}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-slate-800 text-amber-400 flex items-center justify-center font-bold shadow-sm shrink-0">
              <FileCheck className="w-6 h-6" />
            </div>
          </div>

          {/* Card 2: Diproses */}
          <div className="p-5 rounded-2xl bg-amber-50/80 border border-amber-200/80 flex items-center justify-between hover:shadow-md transition">
            <div>
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">Diproses</p>
              <p className="text-2xl font-extrabold text-amber-900 mt-1">
                {loading ? <span className="inline-block w-16 h-7 bg-amber-200 animate-pulse rounded"></span> : stats.rplStats.diproses.toLocaleString('id-ID')}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-sm shrink-0">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          {/* Card 3: Diasesment */}
          <div className="p-5 rounded-2xl bg-sky-50/80 border border-sky-200/80 flex items-center justify-between hover:shadow-md transition">
            <div>
              <p className="text-xs font-bold text-sky-800 uppercase tracking-wider">Diasesment</p>
              <p className="text-2xl font-extrabold text-sky-900 mt-1">
                {loading ? <span className="inline-block w-16 h-7 bg-sky-200 animate-pulse rounded"></span> : stats.rplStats.diasesment.toLocaleString('id-ID')}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-sky-600 text-white flex items-center justify-center font-bold shadow-sm shrink-0">
              <FileSearch className="w-6 h-6" />
            </div>
          </div>

          {/* Card 4: Selesai */}
          <div className="p-5 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 flex items-center justify-between hover:shadow-md transition">
            <div>
              <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Selesai</p>
              <p className="text-2xl font-extrabold text-emerald-900 mt-1">
                {loading ? <span className="inline-block w-16 h-7 bg-emerald-200 animate-pulse rounded"></span> : stats.rplStats.selesai.toLocaleString('id-ID')}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-sm shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* TABLE: LKAM & ASESMEN MATAKULIAH DIBEBASKAN (RPL) */}
      <div className="card p-6 space-y-4">
        {/* Table Header Controls: Title, Filter by Prodi, Search Input */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-ut-navy" />
              LKAM & Asesmen Matakuliah Dibebaskan (RPL)
            </h2>
            <p className="text-xs text-slate-500">
              Lembar Kemajuan Akademik Mahasiswa & rincian perolehan SKS Alih Kredit RPL FHISIP UT
            </p>
          </div>

          {/* Filter & Search Bar Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Filter by Prodi Select */}
            <div className="relative">
              <select
                value={selectedProdiFilter}
                onChange={(e) => {
                  setSelectedProdiFilter(e.target.value)
                  setLkamPage(1)
                }}
                className="w-full sm:w-56 pl-3 pr-8 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-ut-navy/20 focus:border-ut-navy font-semibold text-slate-700"
              >
                <option value="ALL">Semua Program Studi (9 Prodi)</option>
                <option value="IPEM">S1 Ilmu Pemerintahan (IPEM)</option>
                <option value="HKUM">S1 Ilmu Hukum (HKUM)</option>
                <option value="IKOM">S1 Ilmu Komunikasi (IKOM)</option>
                <option value="ADPU">S1 Administrasi Publik (ADPU)</option>
                <option value="ADBI">S1 Administrasi Bisnis (ADBI)</option>
                <option value="SOSI">S1 Sosiologi (SOSI)</option>
                <option value="SING">S1 Sastra Inggris (SING)</option>
                <option value="PUS">S1 Ilmu Perpustakaan (PUS)</option>
                <option value="PAJAK">S1 Perpajakan (PAJAK)</option>
              </select>
            </div>

            {/* Search Input Bar */}
            <div className="relative w-full sm:w-60">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari NIM, Nama Mahasiswa, SK..."
                value={lkamSearchQuery}
                onChange={(e) => {
                  setLkamSearchQuery(e.target.value)
                  setLkamPage(1)
                }}
                className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-ut-navy/20 focus:border-ut-navy"
              />
              {lkamSearchQuery && (
                <button
                  onClick={() => setLkamSearchQuery('')}
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
            <thead className="bg-slate-50 text-slate-500 text-left border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-semibold">NIM</th>
                <th className="px-4 py-3 font-semibold">Nama Mahasiswa</th>
                <th className="px-4 py-3 font-semibold">Program Studi</th>
                <th className="px-4 py-3 font-semibold text-center">SKS RPL Dibebaskan</th>
                <th className="px-4 py-3 font-semibold text-center">Sisa SKS Wajib</th>
                <th className="px-4 py-3 font-semibold text-center">IPK Alih Kredit</th>
                <th className="px-4 py-3 font-semibold">Status LKAM & SK</th>
                <th className="px-4 py-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lkamLoading && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    Memuat data LKAM & SKS Pembebasan...
                  </td>
                </tr>
              )}

              {!lkamLoading && lkamItems.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    Tidak ada data LKAM mahasiswa yang sesuai dengan filter / kata kunci pencarian.
                  </td>
                </tr>
              )}

              {!lkamLoading &&
                lkamItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-ut-navy/10 text-ut-navy border border-ut-navy/20">
                        {item.nim}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900">{item.name}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 font-extrabold text-[10px]">
                          {item.prodiCode}
                        </span>
                        <span className="text-slate-600 font-medium">{item.prodiName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-400/20 text-amber-900 border border-amber-400/40 font-extrabold text-xs">
                        {item.sksDibebaskan} SKS
                        <span className="text-[10px] font-normal text-amber-800">
                          ({item.matkulDibebaskanCount} Mk)
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-slate-700">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-800 font-extrabold text-xs">
                        {item.sisaSksWajib} SKS
                      </span>
                      <span className="block text-[10px] text-slate-400 font-normal">
                        dari {item.totalSksKurikulum} Total
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-900 font-extrabold text-xs">
                        <AwardIcon className="w-3 h-3 text-emerald-700" />
                        {item.ipkAlihKredit}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[10px]">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          {item.status}
                        </span>
                        <p className="text-[10px] text-slate-400 font-mono truncate">{item.noSk}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelectedLkamItem(item)}
                        className="btn-secondary py-1 px-2.5 text-xs inline-flex items-center gap-1.5 font-bold hover:bg-ut-navy hover:text-white transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Detail LKAM</span>
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {!lkamLoading && totalLkamItems > 0 && (
          <Pagination
            currentPage={lkamPage}
            totalItems={totalLkamItems}
            pageSize={lkamPageSize}
            onPageChange={setLkamPage}
            onPageSizeChange={setLkamPageSize}
          />
        )}
      </div>

      {/* DETAIL LKAM PREVIEW MODAL */}
      {selectedLkamItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[99999] p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-100 animate-in fade-in zoom-in-95 duration-200 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-ut-navy/10 text-ut-navy flex items-center justify-center font-bold">
                  <FileText className="w-5 h-5 text-ut-navy" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Detail LKAM & Perolehan SKS Alih Kredit</h3>
                  <p className="text-xs text-slate-500">Lembar Kemajuan Akademik Mahasiswa RPL FHISIP UT</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLkamItem(null)}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200/70">
              <div className="grid grid-cols-2 gap-3 pb-2 border-b border-slate-200">
                <div>
                  <p className="text-slate-400 font-medium">NIM Mahasiswa:</p>
                  <p className="font-mono font-bold text-slate-900 text-sm">{selectedLkamItem.nim}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Nama Mahasiswa:</p>
                  <p className="font-bold text-slate-900 text-sm">{selectedLkamItem.name}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pb-2 border-b border-slate-200">
                <div>
                  <p className="text-slate-400 font-medium">Program Studi:</p>
                  <p className="font-bold text-slate-800">{selectedLkamItem.prodiName} ({selectedLkamItem.prodiCode})</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Total SKS Kurikulum:</p>
                  <p className="font-bold text-slate-900">{selectedLkamItem.totalSksKurikulum} SKS</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pb-2 border-b border-slate-200 bg-amber-50/60 p-3 rounded-xl border border-amber-200/60">
                <div>
                  <p className="text-amber-800 font-bold">SKS RPL Dibebaskan:</p>
                  <p className="font-extrabold text-amber-900 text-base">
                    {selectedLkamItem.sksDibebaskan} SKS
                  </p>
                  <p className="text-[10px] text-amber-700">({selectedLkamItem.matkulDibebaskanCount} Mata Kuliah)</p>
                </div>
                <div>
                  <p className="text-amber-800 font-bold">Sisa SKS Wajib Ditempuh:</p>
                  <p className="font-extrabold text-slate-900 text-base">
                    {selectedLkamItem.sisaSksWajib} SKS
                  </p>
                  <p className="text-[10px] text-slate-500">(Mata Kuliah Registrasi UT)</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <p className="text-slate-400 font-medium">IPK Alih Kredit Hasil Asesmen:</p>
                  <p className="font-extrabold text-emerald-700 text-sm">{selectedLkamItem.ipkAlihKredit}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Nomor SK Pembebasan:</p>
                  <p className="font-mono font-semibold text-slate-800 text-[11px]">{selectedLkamItem.noSk}</p>
                </div>
              </div>

              <div className="pt-1">
                <p className="text-slate-400 font-medium">Status Asesmen & Tanggal SK:</p>
                <p className="font-semibold text-emerald-800 text-xs">
                  {selectedLkamItem.status} — ({selectedLkamItem.tanggalSk})
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedLkamItem(null)}
                className="btn-primary text-xs py-2 px-5 rounded-xl"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
