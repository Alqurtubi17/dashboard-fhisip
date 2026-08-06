'use client'

import React, { useEffect, useState } from 'react'
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
  GitCompare,
  ArrowUpRight,
  ArrowDownRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'
import { Pagination } from '@/components/ui/pagination'
import { useDebounce } from '@/hooks/useDebounce'

export type KebutuhanKelasItem = {
  id: string
  masa: string
  kodeMatkul: string
  namaMatkul: string
  sks: number
  prodiCode: string
  prodiName: string
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

  // Filters & Sorting State
  const [selectedProdi, setSelectedProdi] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const debouncedSearchQuery = useDebounce(searchQuery, 400)
  const [page, setPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(10)

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('kodeMatkul')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')

  // Selected item modal state
  const [selectedItem, setSelectedItem] = useState<KebutuhanKelasItem | null>(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const url = `/api/dashboard/kebutuhan-kelas?masa=${selectedMasa}&compareMasa=${compareMasa}&prodi=${selectedProdi}&query=${encodeURIComponent(
        debouncedSearchQuery
      )}&page=1&pageSize=300`
      const res = await fetch(url)
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
  }, [selectedMasa, compareMasa, selectedProdi, debouncedSearchQuery])

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
    const exportUrl = `/api/dashboard/kebutuhan-kelas/export?masa=${selectedMasa}&prodi=${selectedProdi}&query=${encodeURIComponent(
      searchQuery
    )}`
    window.location.href = exportUrl
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

      {/* Control Bar: Masa Selector & Comparison Options */}
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
              <option value="20261">Masa 2026.1 (Ganjil)</option>
              <option value="20262">Masa 2026.2 (Genap) - Belum Ada Data</option>
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
              {selectedMasa !== '20261' && <option value="20261">Masa 2026.1 (Ganjil)</option>}
              {selectedMasa !== '20262' && <option value="20262">Masa 2026.2 (Genap)</option>}
            </select>
          </div>
        </div>

        {/* Download Excel Button */}
        <button
          onClick={handleExportExcel}
          className="btn-primary py-2 px-4 text-xs font-bold inline-flex items-center justify-center gap-2 rounded-xl shadow-xs hover:shadow-md transition bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Download className="w-4 h-4" />
          <span>Download Excel (.xlsx)</span>
        </button>
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
                className="w-full sm:w-56 pl-3 pr-8 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-ut-navy/20 focus:border-ut-navy font-semibold text-slate-700"
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
                          ? 'Data registrasi 2026.2 belum dibuka / belum diinputkan ke sistem database.'
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
                    <td className="px-4 py-3 font-bold text-slate-900 max-w-xs">{item.namaMatkul}</td>
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

      {/* DETAIL ALOKASI KELAS & TUTOR MODAL PREVIEW */}
      {selectedItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[99999] p-4 overflow-y-auto">
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

              {/* Rincian Skema Registrasi Mahasiswa */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                <p className="font-bold text-slate-700 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-ut-blue" />
                  Rincian Skema Registrasi Peserta Tuton:
                </p>
                <div className="grid grid-cols-2 gap-2 text-slate-600 text-[11px]">
                  <div>• SIPAS Non-TTM: <strong className="text-slate-900">{(selectedItem.sipasNonTtm || 0).toLocaleString('id-ID')} mhs</strong></div>
                  <div>• Non-SIPAS: <strong className="text-slate-900">{(selectedItem.nonSipas || 0).toLocaleString('id-ID')} mhs</strong></div>
                  <div>• Tuton SIPAS Semi/Penuh: <strong className="text-slate-900">{(selectedItem.tutonSipas || 0).toLocaleString('id-ID')} mhs</strong></div>
                  <div>• Total Peserta Tuton: <strong className="text-amber-800">{selectedItem.totalMahasiswa.toLocaleString('id-ID')} mhs</strong></div>
                </div>
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
        </div>
      )}
    </div>
  )
}
