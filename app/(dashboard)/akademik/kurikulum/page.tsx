'use client'

import React, { useEffect, useState } from 'react'
import {
  BookMarked,
  Search,
  BookOpen,
  Eye,
  X,
  FileText,
  Building,
  Layers,
  Sparkles,
} from 'lucide-react'
import { Pagination } from '@/components/ui/pagination'

type KurikulumItem = {
  id: string
  kodeMk: string
  namaMk: string
  sks: number
  semesterPenawaran: number
  prodiCode: string
  prodiName: string
  sifatMatkul: 'WAJIB' | 'PILIHAN' | 'TAP' | 'KARIL'
  bahanAjarKode: string
  prasyaratKode: string | null
  cplCpmk: string
}

export default function KurikulumPage() {
  const [items, setItems] = useState<KurikulumItem[]>([])
  const [loading, setLoading] = useState(true)
  const [prodiFilter, setProdiFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selectedItem, setSelectedItem] = useState<KurikulumItem | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/akademik/kurikulum?prodi=${prodiFilter}&query=${encodeURIComponent(searchQuery)}`)
      if (res.ok) {
        const json = await res.json()
        setItems(json.data || [])
      }
    } catch (e) {
      console.error('Failed to load kurikulum data', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [prodiFilter, searchQuery])

  const paginatedItems = items.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2.5">
            <BookMarked className="w-7 h-7 text-ut-navy" />
            Kurikulum & Katalog Mata Kuliah FHISIP UT
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Struktur Mata Kuliah, Bahan Ajar BMP UT, SKS Prasyarat, & Pemetaan Capaian Pembelajaran Lulusan (CPL) 9 Prodi
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5 border-l-4 border-ut-navy flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase">Total Mata Kuliah Aktif</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">148 Mata Kuliah</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-ut-navy/10 text-ut-navy flex items-center justify-center">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>

        <div className="card p-5 border-l-4 border-emerald-500 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase">Bahan Ajar / Modul UT (BMP)</p>
            <p className="text-2xl font-extrabold text-emerald-700 mt-1">100% Tersedia Digital</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="card p-5 border-l-4 border-amber-500 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase">Struktur Kurikulum Terbaru</p>
            <p className="text-2xl font-extrabold text-amber-800 mt-1">Kurikulum 2026/2027</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <select
            value={prodiFilter}
            onChange={(e) => {
              setProdiFilter(e.target.value)
              setCurrentPage(1)
            }}
            className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-ut-navy/20"
          >
            <option value="ALL">Semua Program Studi (9 Prodi)</option>
            <option value="IPEM">S1 Ilmu Pemerintahan</option>
            <option value="HKUM">S1 Ilmu Hukum</option>
            <option value="IKOM">S1 Ilmu Komunikasi</option>
            <option value="ADPU">S1 Administrasi Publik</option>
            <option value="ADBI">S1 Administrasi Bisnis</option>
            <option value="SOSI">S1 Sosiologi</option>
          </select>

          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari Kode MK, Nama, Bahan Ajar..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-ut-navy/20"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[850px]">
            <thead className="bg-slate-50 text-slate-500 text-left border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-semibold">Kode MK</th>
                <th className="px-4 py-3 font-semibold">Nama Mata Kuliah</th>
                <th className="px-4 py-3 font-semibold">Program Studi</th>
                <th className="px-4 py-3 font-semibold text-center">SKS</th>
                <th className="px-4 py-3 font-semibold text-center">Semester</th>
                <th className="px-4 py-3 font-semibold">Bahan Ajar (BMP UT)</th>
                <th className="px-4 py-3 font-semibold text-center">Sifat MK</th>
                <th className="px-4 py-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    Memuat data kurikulum...
                  </td>
                </tr>
              )}

              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    Tidak ada data kurikulum yang sesuai.
                  </td>
                </tr>
              )}

              {!loading &&
                paginatedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3 font-mono font-bold text-ut-navy">{item.kodeMk}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">{item.namaMk}</td>
                    <td className="px-4 py-3 font-medium text-slate-700">{item.prodiName} ({item.prodiCode})</td>
                    <td className="px-4 py-3 text-center font-extrabold text-slate-900">{item.sks} SKS</td>
                    <td className="px-4 py-3 text-center font-bold text-slate-700">Sem {item.semesterPenawaran}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-600">{item.bahanAjarKode}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-extrabold text-[10px]">
                        {item.sifatMatkul}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelectedItem(item)}
                        className="btn-secondary py-1 px-2.5 text-xs inline-flex items-center gap-1 font-bold hover:bg-ut-navy hover:text-white transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Detail CPL</span>
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {!loading && items.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalItems={items.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        )}
      </div>

      {/* DETAIL MODAL CPL */}
      {selectedItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[99999] p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-100 animate-in fade-in zoom-in-95 duration-200 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-ut-navy text-amber-400 flex items-center justify-center font-bold">
                  <BookMarked className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Detail Capaian Pembelajaran (CPL/CPMK)</h3>
                  <p className="text-xs text-slate-500">{selectedItem.prodiName}</p>
                </div>
              </div>
              <button onClick={() => setSelectedItem(null)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="grid grid-cols-2 gap-3 pb-2 border-b border-slate-200">
                <div>
                  <p className="text-slate-400 font-medium">Kode & Nama MK:</p>
                  <p className="font-bold text-slate-900 text-sm">{selectedItem.kodeMk} — {selectedItem.namaMk}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Bobot & Penawaran:</p>
                  <p className="font-bold text-slate-800">{selectedItem.sks} SKS (Semester {selectedItem.semesterPenawaran})</p>
                </div>
              </div>

              <div>
                <p className="text-slate-400 font-medium">Bahan Ajar UT (Buku Materi Pokok):</p>
                <p className="font-mono font-bold text-ut-navy">{selectedItem.bahanAjarKode}</p>
              </div>

              <div>
                <p className="text-slate-400 font-medium">Prasyarat Mata Kuliah:</p>
                <p className="font-semibold text-slate-800">{selectedItem.prasyaratKode || 'Tanpa Prasyarat'}</p>
              </div>

              <div className="bg-sky-50 p-3 rounded-xl border border-sky-200">
                <p className="text-sky-900 font-bold text-xs">Capaian Pembelajaran Lulusan (CPL/CPMK):</p>
                <p className="text-slate-800 font-medium mt-1 leading-relaxed">{selectedItem.cplCpmk}</p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button onClick={() => setSelectedItem(null)} className="btn-primary text-xs py-2 px-5 rounded-xl">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
