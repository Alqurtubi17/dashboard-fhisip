'use client'

import React, { useEffect, useState } from 'react'
import {
  Star,
  Search,
  CheckCircle2,
  Clock,
  Eye,
  X,
  FileSpreadsheet,
  Plus,
  BookOpen,
} from 'lucide-react'
import { Pagination } from '@/components/ui/pagination'

type NilaiItem = {
  id: string
  nim: string
  nama: string
  prodiCode: string
  prodiName: string
  kodeMk: string
  namaMk: string
  sks: number
  masa: string
  tugasTuton: number
  diskusiTuton: number
  nilaiUas: number
  nilaiAkhir: number
  hurufMutu: string
  statusPublikasi: 'DRAFT' | 'DIPROSES' | 'TERBIT'
}

export default function NilaiPage() {
  const [items, setItems] = useState<NilaiItem[]>([])
  const [loading, setLoading] = useState(true)
  const [prodiFilter, setProdiFilter] = useState('ALL')
  const [masaFilter, setMasaFilter] = useState('20261')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selectedItem, setSelectedItem] = useState<NilaiItem | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/akademik/nilai?prodi=${prodiFilter}&masa=${masaFilter}&query=${encodeURIComponent(searchQuery)}`)
      if (res.ok) {
        const json = await res.json()
        setItems(json.data || [])
      }
    } catch (e) {
      console.error('Failed to load nilai data', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [prodiFilter, masaFilter, searchQuery])

  const paginatedItems = items.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2.5">
            <Star className="w-7 h-7 text-amber-500 fill-amber-500" />
            Nilai & Hasil Ujian Perkuliahan FHISIP UT
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Pengelolaan Rekap Nilai Akhir Hasil Tutorial (Tuton/Tuweb/TTM) & Ujian Akhir Semester (UAS/UO)
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5 border-l-4 border-emerald-500 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase">Status Nilai Terbit Masa 20261</p>
            <p className="text-2xl font-extrabold text-emerald-700 mt-1">94.2% Terpublikasi</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="card p-5 border-l-4 border-amber-500 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase">Rata-Rata Nilai Akhir FHISIP</p>
            <p className="text-2xl font-extrabold text-amber-800 mt-1">84.5 (Predikat A/B+)</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
            <Star className="w-5 h-5 fill-amber-500" />
          </div>
        </div>

        <div className="card p-5 border-l-4 border-ut-navy flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase">Proses Validasi Dekanat</p>
            <p className="text-2xl font-extrabold text-ut-navy mt-1">5.8% Diproses</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-ut-navy/10 text-ut-navy flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Controls & Table */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
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
            </select>

            <select
              value={masaFilter}
              onChange={(e) => setMasaFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-ut-navy/20"
            >
              <option value="20261">Masa 20261 (Semester Ini)</option>
              <option value="20252">Masa 20252</option>
              <option value="20251">Masa 20251</option>
            </select>
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari NIM, Nama, Kode MK..."
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
                <th className="px-4 py-3 font-semibold">NIM</th>
                <th className="px-4 py-3 font-semibold">Nama Mahasiswa</th>
                <th className="px-4 py-3 font-semibold">Mata Kuliah</th>
                <th className="px-4 py-3 font-semibold text-center">Tugas Tuton</th>
                <th className="px-4 py-3 font-semibold text-center">Diskusi Tuton</th>
                <th className="px-4 py-3 font-semibold text-center">Nilai UAS/UO</th>
                <th className="px-4 py-3 font-semibold text-center">Nilai Akhir</th>
                <th className="px-4 py-3 font-semibold text-center">Huruf Mutu</th>
                <th className="px-4 py-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                    Memuat data rekap nilai...
                  </td>
                </tr>
              )}

              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                    Tidak ada data rekap nilai yang sesuai.
                  </td>
                </tr>
              )}

              {!loading &&
                paginatedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3 font-mono font-bold text-ut-navy">{item.nim}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">{item.nama}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      <div>{item.namaMk}</div>
                      <span className="font-mono text-[10px] text-slate-500">{item.kodeMk} ({item.sks} SKS)</span>
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-slate-800">{item.tugasTuton}</td>
                    <td className="px-4 py-3 text-center font-bold text-slate-800">{item.diskusiTuton}</td>
                    <td className="px-4 py-3 text-center font-bold text-slate-800">{item.nilaiUas}</td>
                    <td className="px-4 py-3 text-center font-extrabold text-ut-navy text-sm">{item.nilaiAkhir}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-100 text-emerald-900 font-black text-xs">
                        {item.hurufMutu}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelectedItem(item)}
                        className="btn-secondary py-1 px-2.5 text-xs inline-flex items-center gap-1 font-bold hover:bg-ut-navy hover:text-white transition"
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

      {/* DETAIL MODAL NILAI */}
      {selectedItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[99999] p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-100 animate-in fade-in zoom-in-95 duration-200 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                  <Star className="w-5 h-5 fill-slate-950" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Detail Komponen Nilai Akhir</h3>
                  <p className="text-xs text-slate-500">Masa Registrasi {selectedItem.masa} — FHISIP UT</p>
                </div>
              </div>
              <button onClick={() => setSelectedItem(null)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="grid grid-cols-2 gap-3 pb-2 border-b border-slate-200">
                <div>
                  <p className="text-slate-400 font-medium">Mahasiswa:</p>
                  <p className="font-bold text-slate-900">{selectedItem.nama} ({selectedItem.nim})</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Mata Kuliah:</p>
                  <p className="font-bold text-slate-800">{selectedItem.namaMk} ({selectedItem.kodeMk})</p>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <p className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">Bobot Komponen Nilai (Standar UT):</p>
                <div className="flex justify-between items-center p-2 rounded-lg bg-white border border-slate-200">
                  <span className="text-slate-600">Tugas Tutorial (30%)</span>
                  <span className="font-bold text-slate-900">{selectedItem.tugasTuton}</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded-lg bg-white border border-slate-200">
                  <span className="text-slate-600">Diskusi & Partisipasi Tuton (20%)</span>
                  <span className="font-bold text-slate-900">{selectedItem.diskusiTuton}</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded-lg bg-white border border-slate-200">
                  <span className="text-slate-600">Ujian Akhir Semester / UO (50%)</span>
                  <span className="font-bold text-slate-900">{selectedItem.nilaiUas}</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <div>
                  <p className="text-emerald-900 font-bold text-xs">Nilai Akhir Terhitung:</p>
                  <p className="text-2xl font-extrabold text-emerald-950">{selectedItem.nilaiAkhir}</p>
                </div>
                <div className="text-right">
                  <p className="text-emerald-900 font-bold text-xs">Huruf Mutu:</p>
                  <span className="inline-block px-3 py-1 rounded-lg bg-emerald-700 text-white font-black text-lg">
                    {selectedItem.hurufMutu}
                  </span>
                </div>
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
