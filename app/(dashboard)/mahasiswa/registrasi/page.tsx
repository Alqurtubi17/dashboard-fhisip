'use client'

import React, { useEffect, useState } from 'react'
import {
  ClipboardList,
  Search,
  Filter,
  CreditCard,
  CheckCircle2,
  Clock,
  Printer,
  Eye,
  X,
  BookOpen,
  DollarSign,
  Building,
} from 'lucide-react'
import { Pagination } from '@/components/ui/pagination'

type RegistrasiItem = {
  id: string
  nim: string
  nama: string
  prodiCode: string
  prodiName: string
  masa: string
  noBilling: string
  totalSks: number
  nominalBilling: number
  statusBayar: 'LUNAS' | 'BELUM_BAYAR' | 'EXPIRED'
  tanggalRegistrasi: string
  metodeLayanan: 'SIPAS_FULL' | 'SIPAS_NON_TTM' | 'NON_SIPAS'
  matkulRegistered: Array<{ kode: string; nama: string; sks: number; layanan: string }>
}

export default function RegistrasiPage() {
  const [items, setItems] = useState<RegistrasiItem[]>([])
  const [loading, setLoading] = useState(true)
  const [prodiFilter, setProdiFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selectedItem, setSelectedItem] = useState<RegistrasiItem | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/mahasiswa/registrasi?prodi=${prodiFilter}&query=${encodeURIComponent(searchQuery)}`)
      if (res.ok) {
        const json = await res.json()
        setItems(json.data || [])
      }
    } catch (e) {
      console.error('Failed to load registrasi data', e)
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
            <ClipboardList className="w-7 h-7 text-ut-navy" />
            Registrasi Mata Kuliah & Billing SKS UT
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Pengelolaan Lembar Hasil Registrasi (LHR) dan Lembar Informasi Pembayaran (LIP) Mahasiswa FHISIP UT
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5 border-l-4 border-emerald-500 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase">Total Billing Lunas (Masa 20261)</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">128,450 Mahasiswa</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="card p-5 border-l-4 border-amber-500 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase">Menunggu Pembayaran</p>
            <p className="text-2xl font-extrabold text-amber-700 mt-1">14,210 Billing</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="card p-5 border-l-4 border-ut-blue flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase">Metode SIPAS Terbanyak</p>
            <p className="text-2xl font-extrabold text-ut-navy mt-1">SIPAS Non TTM (68%)</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-ut-blue flex items-center justify-center">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="card overflow-hidden">
        {/* Controls Bar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
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
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari NIM, Nama, No Billing..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-ut-navy/20"
            />
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[800px]">
            <thead className="bg-slate-50 text-slate-500 text-left border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-semibold">NIM</th>
                <th className="px-4 py-3 font-semibold">Nama Mahasiswa</th>
                <th className="px-4 py-3 font-semibold">Program Studi</th>
                <th className="px-4 py-3 font-semibold">No Billing & Masa</th>
                <th className="px-4 py-3 font-semibold text-center">Total SKS</th>
                <th className="px-4 py-3 font-semibold text-right">Nominal SKS</th>
                <th className="px-4 py-3 font-semibold text-center">Status Bayar</th>
                <th className="px-4 py-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    Memuat data registrasi billing UT...
                  </td>
                </tr>
              )}

              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    Tidak ada data registrasi mata kuliah yang sesuai.
                  </td>
                </tr>
              )}

              {!loading &&
                paginatedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3 font-mono font-bold text-ut-navy">{item.nim}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">{item.nama}</td>
                    <td className="px-4 py-3 font-medium text-slate-700">{item.prodiName} ({item.prodiCode})</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-600">
                      <div>{item.noBilling}</div>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 font-bold text-slate-500">Masa: {item.masa}</span>
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-slate-800">{item.totalSks} SKS</td>
                    <td className="px-4 py-3 text-right font-extrabold text-slate-900">
                      Rp {item.nominalBilling.toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {item.statusBayar === 'LUNAS' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[10px]">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> LUNAS
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[10px]">
                          <Clock className="w-3 h-3 text-amber-600" /> BELUM BAYAR
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelectedItem(item)}
                        className="btn-secondary py-1 px-2.5 text-xs inline-flex items-center gap-1 font-bold hover:bg-ut-navy hover:text-white transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Detail LHR</span>
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

      {/* DETAIL MODAL LEMBAR HASIL REGISTRASI (LHR / LIP) */}
      {selectedItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[99999] p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 border border-slate-100 animate-in fade-in zoom-in-95 duration-200 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-ut-navy text-amber-400 flex items-center justify-center font-bold">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Lembar Hasil Registrasi (LHR) & LIP Billing</h3>
                  <p className="text-xs text-slate-500">Masa Registrasi {selectedItem.masa} — Universitas Terbuka</p>
                </div>
              </div>
              <button onClick={() => setSelectedItem(null)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content LHR */}
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div>
                  <p className="text-slate-400 font-medium">NIM & Nama Mahasiswa:</p>
                  <p className="font-bold text-slate-900 text-sm">{selectedItem.nim} — {selectedItem.nama}</p>
                  <p className="text-slate-500">{selectedItem.prodiName}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Nomor Billing UT:</p>
                  <p className="font-mono font-bold text-ut-navy text-sm">{selectedItem.noBilling}</p>
                  <p className="text-slate-500">Layanan: <strong className="text-slate-800">{selectedItem.metodeLayanan}</strong></p>
                </div>
              </div>

              {/* Matkul List */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-ut-blue" />
                  Daftar Mata Kuliah Terregistrasi Masa {selectedItem.masa}:
                </h4>
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-100 text-slate-600 text-left">
                      <tr>
                        <th className="px-3 py-2">Kode MK</th>
                        <th className="px-3 py-2">Nama Mata Kuliah</th>
                        <th className="px-3 py-2 text-center">SKS</th>
                        <th className="px-3 py-2 text-center">Layanan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedItem.matkulRegistered.map((m) => (
                        <tr key={m.kode}>
                          <td className="px-3 py-2 font-mono font-bold text-slate-700">{m.kode}</td>
                          <td className="px-3 py-2 font-semibold text-slate-800">{m.nama}</td>
                          <td className="px-3 py-2 text-center font-bold text-slate-800">{m.sks} SKS</td>
                          <td className="px-3 py-2 text-center">
                            <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-800 font-bold text-[10px]">{m.layanan}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payment Info */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-amber-50/70 border border-amber-200">
                <div>
                  <p className="text-amber-900 font-bold text-xs">Total Pembayaran SKS:</p>
                  <p className="text-xl font-extrabold text-slate-900">Rp {selectedItem.nominalBilling.toLocaleString('id-ID')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => alert('Fitur Cetak LHR / LIP resmi berhasil disimulasikan')} className="btn-secondary text-xs py-2 px-4 rounded-xl flex items-center gap-1.5">
                    <Printer className="w-4 h-4 text-ut-navy" />
                    <span>Cetak LHR Resmi</span>
                  </button>
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
