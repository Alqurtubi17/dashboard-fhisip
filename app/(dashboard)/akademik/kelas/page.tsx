'use client'

import React, { useEffect, useState } from 'react'
import {
  LayoutGrid,
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
} from 'lucide-react'
import { Pagination } from '@/components/ui/pagination'
import { useDebounce } from '@/hooks/useDebounce'

export type KebutuhanKelasItem = {
  id: string
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
}

type Summary = {
  totalMatkul: number
  totalMahasiswa: number
  totalKebutuhanKelas: number
  totalKebutuhanTutorMin: number
  rasioKuota: string
  rasioTutor: string
}

export default function KebutuhanKelasPage() {
  const [items, setItems] = useState<KebutuhanKelasItem[]>([])
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<Summary>({
    totalMatkul: 0,
    totalMahasiswa: 0,
    totalKebutuhanKelas: 0,
    totalKebutuhanTutorMin: 0,
    rasioKuota: '50 Mahasiswa / Kelas',
    rasioTutor: 'Max 4 Kelas / Tutor',
  })

  // Filters & Pagination State
  const [selectedProdi, setSelectedProdi] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const debouncedSearchQuery = useDebounce(searchQuery, 400)
  const [page, setPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(10)
  const [totalItems, setTotalItems] = useState<number>(0)

  // Selected item modal state
  const [selectedItem, setSelectedItem] = useState<KebutuhanKelasItem | null>(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const url = `/api/dashboard/kebutuhan-kelas?prodi=${selectedProdi}&query=${encodeURIComponent(
        debouncedSearchQuery
      )}&page=${page}&pageSize=${pageSize}`
      const res = await fetch(url)
      if (res.ok) {
        const json = await res.json()
        if (json.success && json.data) {
          setItems(json.data.items)
          setTotalItems(json.data.totalItems)
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
  }, [selectedProdi, debouncedSearchQuery, page, pageSize])

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner & Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#001D33] via-[#002B49] to-[#005691] text-white p-6 sm:p-8 shadow-xl border border-white/10">
        <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-amber-400/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 space-y-3 max-w-3xl">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight flex items-center gap-3">
            <LayoutGrid className="w-8 h-8 text-amber-400" />
            Perencanaan Prediksi Kelas & Tutor FHISIP 2026.1
          </h1>
          <p className="text-sm text-slate-200 leading-relaxed">
            Prediksi otentik pembentukan kelas tutorial (50 peserta/kelas) dan estimasi kebutuhan minimal tutor (maksimal 4 kelas per tutor) bersumber langsung dari data registrasi FHISIP 2026.1 (Sheet 2 Excel Data Prediksi).
          </p>
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
          <p className="text-2xl font-extrabold text-amber-900">
            {loading ? <span className="inline-block w-16 h-7 bg-amber-200 animate-pulse rounded"></span> : summary.totalMahasiswa.toLocaleString('id-ID')}
          </p>
          <p className="text-[11px] text-slate-500 flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-amber-600" />
            <span>Akumulasi Registrasi Peserta</span>
          </p>
        </div>

        <div className="card p-5 border-t-4 border-t-emerald-600 space-y-2">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Prediksi Kelas Tuton</p>
          <p className="text-2xl font-extrabold text-emerald-900">
            {loading ? <span className="inline-block w-16 h-7 bg-emerald-200 animate-pulse rounded"></span> : `${summary.totalKebutuhanKelas.toLocaleString('id-ID')} Kelas`}
          </p>
          <p className="text-[11px] text-slate-500 flex items-center gap-1">
            <Calculator className="w-3.5 h-3.5 text-emerald-600" />
            <span>Kalkulasi (⌈Total Peserta / 50⌉)</span>
          </p>
        </div>

        <div className="card p-5 border-t-4 border-t-purple-600 space-y-2">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kebutuhan Minimal Tutor</p>
          <p className="text-2xl font-extrabold text-purple-900">
            {loading ? <span className="inline-block w-16 h-7 bg-purple-200 animate-pulse rounded"></span> : `${summary.totalKebutuhanTutorMin.toLocaleString('id-ID')} Tutor`}
          </p>
          <p className="text-[11px] text-slate-500 flex items-center gap-1">
            <UserCheck className="w-3.5 h-3.5 text-purple-600" />
            <span>Kalkulasi (⌈Total Kelas / 4⌉)</span>
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
              Tabel Prediksi Pembentukan Kelas & Tutor per Mata Kuliah (Excel 2026.1)
            </h2>
            <p className="text-xs text-slate-500">
              Menampilkan {totalItems.toLocaleString('id-ID')} data prediksi mata kuliah berdasarkan rasio 50 mhs/kelas & maks 4 kelas/tutor
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
                className="w-full sm:w-60 pl-3 pr-8 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-ut-navy/20 focus:border-ut-navy font-semibold text-slate-700"
              >
                <option value="ALL">Semua Program Studi (261 Matkul Unik)</option>
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
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari Kode atau Nama Matkul..."
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
            <thead className="bg-slate-50 text-slate-500 text-left border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-semibold">Kode Matkul</th>
                <th className="px-4 py-3 font-semibold">Nama Mata Kuliah</th>
                <th className="px-4 py-3 font-semibold">Program Studi</th>
                <th className="px-4 py-3 font-semibold text-center">Rincian Skema (SIPAS/Non-SIPAS)</th>
                <th className="px-4 py-3 font-semibold text-center">Total Peserta Tuton</th>
                <th className="px-4 py-3 font-semibold text-center">Prediksi Kelas (50 Mhs/Kelas)</th>
                <th className="px-4 py-3 font-semibold text-center">Kebutuhan Minimal Tutor</th>
                <th className="px-4 py-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    Memuat data 706 prediksi kelas FHISIP dari Excel...
                  </td>
                </tr>
              )}

              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    Tidak ada mata kuliah yang sesuai dengan filter / pencarian.
                  </td>
                </tr>
              )}

              {!loading &&
                items.map((item) => (
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
                    <td className="px-4 py-3 text-center text-xs whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-100 text-[11px] font-medium">
                          SIPAS: <strong className="font-bold text-blue-900">{(item.sipasNonTtm || 0).toLocaleString('id-ID')}</strong>
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-800 border border-indigo-100 text-[11px] font-medium">
                          Non-SIPAS: <strong className="font-bold text-indigo-900">{(item.nonSipas || 0).toLocaleString('id-ID')}</strong>
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <span className="font-extrabold text-amber-900 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200">
                        {item.totalMahasiswa.toLocaleString('id-ID')} Peserta
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-900 border border-emerald-400/30 font-extrabold text-xs">
                        <Calculator className="w-3.5 h-3.5 text-emerald-600" />
                        {item.kebutuhanKelas.toLocaleString('id-ID')} Kelas
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-purple-500/10 text-purple-900 border border-purple-400/30 font-extrabold text-xs">
                        <UserCheck className="w-3.5 h-3.5 text-purple-600" />
                        {item.kebutuhanTutorMin.toLocaleString('id-ID')} Tutor
                      </span>
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
        {!loading && totalItems > 0 && (
          <Pagination
            currentPage={page}
            totalItems={totalItems}
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
                  <p className="text-xs text-slate-500">Mata Kuliah {selectedItem.kodeMatkul} (Excel 2026.1)</p>
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
                  1. Formula Prediksi Kelas (50 Peserta/Kelas):
                </p>
                <p className="font-mono text-xs text-emerald-900 font-bold bg-white p-2 rounded border border-emerald-300 text-center">
                  ⌈{selectedItem.totalMahasiswa.toLocaleString('id-ID')} Mhs ÷ 50 Mhs⌉ = {selectedItem.kebutuhanKelas.toLocaleString('id-ID')} Kelas Tuton
                </p>
              </div>

              {/* Formula Box 2: Minimal Tutor */}
              <div className="bg-purple-50 p-3.5 rounded-xl border border-purple-200 space-y-1">
                <p className="font-bold text-purple-900 text-xs flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-purple-600" />
                  2. Formula Kebutuhan Minimal Tutor (Max 4 Kelas/Tutor):
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
