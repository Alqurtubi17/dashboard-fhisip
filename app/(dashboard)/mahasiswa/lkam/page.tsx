'use client'

import React, { useEffect, useState } from 'react'
import {
  FileSpreadsheet,
  Search,
  Award,
  CheckCircle2,
  Eye,
  X,
  Printer,
  Download,
  FileText,
  Building2,
  BookMarked,
  Sparkles,
} from 'lucide-react'
import { Pagination } from '@/components/ui/pagination'

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

export default function LkamPage() {
  const [items, setItems] = useState<LkamItem[]>([])
  const [loading, setLoading] = useState(true)
  const [prodiFilter, setProdiFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selectedItem, setSelectedItem] = useState<LkamItem | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/dashboard/lkam?prodi=${prodiFilter}&query=${encodeURIComponent(searchQuery)}&page=1&pageSize=100`)
      if (res.ok) {
        const json = await res.json()
        setItems(json.data?.items || [])
      }
    } catch (e) {
      console.error('Failed to load LKAM data', e)
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
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2.5">
            <FileSpreadsheet className="w-7 h-7 text-ut-navy" />
            Lembar Kemajuan Akademik Mahasiswa (LKAM) UT
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Dokumen resmi rekaman pencapaian IPK, SKS lulus, dan Alih Kredit (RPL) mahasiswa FHISIP Universitas Terbuka
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5 border-l-4 border-ut-navy flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase">Total LKAM Terbit</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">4,759 Dokumen</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-ut-navy/10 text-ut-navy flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="card p-5 border-l-4 border-emerald-500 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase">Rata-Rata IPK Alih Kredit</p>
            <p className="text-2xl font-extrabold text-emerald-700 mt-1">3.68 (Sangat Memuaskan)</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Award className="w-5 h-5" />
          </div>
        </div>

        <div className="card p-5 border-l-4 border-amber-500 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase">SKS Alih Kredit Pembebasan</p>
            <p className="text-2xl font-extrabold text-amber-800 mt-1">Rata-Rata 48 SKS</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
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

          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari NIM, Nama, No SK..."
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
                <th className="px-4 py-3 font-semibold">Program Studi</th>
                <th className="px-4 py-3 font-semibold text-center">SKS RPL Dibebaskan</th>
                <th className="px-4 py-3 font-semibold text-center">Sisa SKS Wajib</th>
                <th className="px-4 py-3 font-semibold text-center">IPK Alih Kredit</th>
                <th className="px-4 py-3 font-semibold">Status LKAM & SK</th>
                <th className="px-4 py-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    Memuat data LKAM...
                  </td>
                </tr>
              )}

              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    Tidak ada data LKAM yang sesuai.
                  </td>
                </tr>
              )}

              {!loading &&
                paginatedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3 font-mono font-bold text-ut-navy">{item.nim}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">{item.name}</td>
                    <td className="px-4 py-3 font-medium text-slate-700">{item.prodiName} ({item.prodiCode})</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-xs">
                        {item.sksDibebaskan} SKS
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-slate-800">{item.sisaSksWajib} SKS</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-900 font-extrabold text-xs">
                        <Award className="w-3 h-3 text-emerald-700" /> {item.ipkAlihKredit}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[10px]">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelectedItem(item)}
                        className="btn-secondary py-1 px-2.5 text-xs inline-flex items-center gap-1 font-bold hover:bg-ut-navy hover:text-white transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Lihat LKAM</span>
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

      {/* DETAIL MODAL LKAM */}
      {selectedItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[99999] p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-100 animate-in fade-in zoom-in-95 duration-200 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-ut-navy text-amber-400 flex items-center justify-center font-bold">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Detail LKAM Resmi UT</h3>
                  <p className="text-xs text-slate-500">Lembar Kemajuan Akademik Mahasiswa FHISIP</p>
                </div>
              </div>
              <button onClick={() => setSelectedItem(null)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="grid grid-cols-2 gap-3 pb-2 border-b border-slate-200">
                <div>
                  <p className="text-slate-400 font-medium">NIM Mahasiswa:</p>
                  <p className="font-mono font-bold text-slate-900 text-sm">{selectedItem.nim}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Nama Mahasiswa:</p>
                  <p className="font-bold text-slate-900 text-sm">{selectedItem.name}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pb-2 border-b border-slate-200">
                <div>
                  <p className="text-slate-400 font-medium">Program Studi:</p>
                  <p className="font-bold text-slate-800">{selectedItem.prodiName}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">IPK Alih Kredit:</p>
                  <p className="font-extrabold text-emerald-700 text-sm">{selectedItem.ipkAlihKredit}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-amber-50/70 p-3 rounded-xl border border-amber-200">
                <div>
                  <p className="text-amber-900 font-bold">SKS RPL Dibebaskan:</p>
                  <p className="font-extrabold text-amber-950 text-base">{selectedItem.sksDibebaskan} SKS</p>
                </div>
                <div>
                  <p className="text-amber-900 font-bold">Sisa SKS Wajib Ditempuh:</p>
                  <p className="font-extrabold text-slate-900 text-base">{selectedItem.sisaSksWajib} SKS</p>
                </div>
              </div>

              <div className="pt-1">
                <p className="text-slate-400 font-medium">Nomor SK Pembebasan RPL:</p>
                <p className="font-mono font-bold text-slate-800">{selectedItem.noSk}</p>
              </div>
            </div>

            <div className="pt-2 flex justify-between items-center">
              <button onClick={() => alert('Fitur Cetak LKAM Resmi berhasil disimulasikan')} className="btn-secondary text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 font-bold">
                <Printer className="w-4 h-4 text-ut-navy" />
                <span>Cetak LKAM</span>
              </button>

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
