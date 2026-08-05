'use client'

import React, { useEffect, useState } from 'react'
import {
  Trophy,
  Search,
  CheckCircle2,
  Clock,
  Eye,
  X,
  Award,
  Sparkles,
  Medal,
} from 'lucide-react'
import { Pagination } from '@/components/ui/pagination'

type PrestasiItem = {
  id: string
  nim: string
  nama: string
  prodiCode: string
  prodiName: string
  namaKegiatan: string
  kategori: 'AKADEMIK' | 'NON_AKADEMIK'
  tingkat: 'PROVINSI' | 'NASIONAL' | 'INTERNASIONAL'
  peringkat: string
  tahun: number
  simkatmawaStatus: 'DISUBMIT' | 'TERVERIFIKASI' | 'DITOLAK'
}

export default function PrestasiPage() {
  const [items, setItems] = useState<PrestasiItem[]>([])
  const [loading, setLoading] = useState(true)
  const [prodiFilter, setProdiFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selectedItem, setSelectedItem] = useState<PrestasiItem | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/kemahasiswaan/prestasi?prodi=${prodiFilter}&query=${encodeURIComponent(searchQuery)}`)
      if (res.ok) {
        const json = await res.json()
        setItems(json.data || [])
      }
    } catch (e) {
      console.error('Failed to load prestasi data', e)
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
            <Trophy className="w-7 h-7 text-amber-500" />
            Prestasi Mahasiswa & SIMKATMAWA FHISIP UT
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Pendataan Rekapitulasi Capaian Prestasi Akademik & Non-Akademik Mahasiswa untuk Pemeringkatan SIMKATMAWA Dikti
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5 border-l-4 border-amber-500 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase">Total Prestasi Terverifikasi</p>
            <p className="text-2xl font-extrabold text-amber-900 mt-1">428 Kejuaraan</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Trophy className="w-5 h-5" />
          </div>
        </div>

        <div className="card p-5 border-l-4 border-ut-blue flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase">Tingkat Internasional & Nasional</p>
            <p className="text-2xl font-extrabold text-ut-navy mt-1">186 Medali / Juara</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-ut-blue flex items-center justify-center">
            <Medal className="w-5 h-5" />
          </div>
        </div>

        <div className="card p-5 border-l-4 border-emerald-500 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase">Poin SIMKATMAWA FHISIP</p>
            <p className="text-2xl font-extrabold text-emerald-700 mt-1">Peringkat 1 UT</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Table */}
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
          </select>

          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari NIM, Nama, Nama Kompetisi..."
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
                <th className="px-4 py-3 font-semibold">Nama Kegiatan / Kejuaraan</th>
                <th className="px-4 py-3 font-semibold text-center">Tingkat</th>
                <th className="px-4 py-3 font-semibold text-center">Capaian Juara</th>
                <th className="px-4 py-3 font-semibold text-center">Status SIMKATMAWA</th>
                <th className="px-4 py-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    Memuat data prestasi...
                  </td>
                </tr>
              )}

              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    Tidak ada data prestasi yang sesuai.
                  </td>
                </tr>
              )}

              {!loading &&
                paginatedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3 font-mono font-bold text-ut-navy">{item.nim}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">{item.nama}</td>
                    <td className="px-4 py-3 font-medium text-slate-800 max-w-xs truncate" title={item.namaKegiatan}>
                      {item.namaKegiatan}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-0.5 rounded bg-sky-100 text-sky-900 font-extrabold text-[10px]">
                        {item.tingkat}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-extrabold text-amber-700">{item.peringkat}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[10px]">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> {item.simkatmawaStatus}
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

      {/* DETAIL MODAL */}
      {selectedItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[99999] p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-100 animate-in fade-in zoom-in-95 duration-200 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Detail Sertifikat Prestasi</h3>
                  <p className="text-xs text-slate-500">{selectedItem.prodiName}</p>
                </div>
              </div>
              <button onClick={() => setSelectedItem(null)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div>
                <p className="text-slate-400 font-medium">Nama Kejuaraan / Kegiatan:</p>
                <p className="font-bold text-slate-900 leading-relaxed text-sm">{selectedItem.namaKegiatan}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                <div>
                  <p className="text-slate-400 font-medium">Nama Mahasiswa:</p>
                  <p className="font-bold text-slate-800">{selectedItem.nama} ({selectedItem.nim})</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Capaian Juara:</p>
                  <p className="font-extrabold text-amber-800 text-sm">{selectedItem.peringkat}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-white p-3 rounded-xl border border-slate-200">
                <div>
                  <p className="text-slate-500 font-bold">Tingkat Kejuaraan:</p>
                  <p className="font-bold text-ut-navy">{selectedItem.tingkat}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-bold">Status Verifikasi SIMKATMAWA:</p>
                  <p className="font-bold text-emerald-700">{selectedItem.simkatmawaStatus}</p>
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
