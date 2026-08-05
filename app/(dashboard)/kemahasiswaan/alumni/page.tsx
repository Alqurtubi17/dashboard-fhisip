'use client'

import React, { useEffect, useState } from 'react'
import {
  UserCheck,
  Search,
  Briefcase,
  GraduationCap,
  Building2,
  CheckCircle2,
  Award,
} from 'lucide-react'
import { Pagination } from '@/components/ui/pagination'

type AlumniItem = {
  id: string
  nim: string
  nama: string
  prodiCode: string
  prodiName: string
  tahunLulus: number
  ipk: string
  pekerjaanSaatIni: string
  instansiPerusahaan: string
  kesesuaianBidang: 'SESUAI' | 'CUKUP_SESUAI' | 'TIDAK_SESUAI'
}

export default function AlumniPage() {
  const [items, setItems] = useState<AlumniItem[]>([])
  const [loading, setLoading] = useState(true)
  const [prodiFilter, setProdiFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/kemahasiswaan/alumni?prodi=${prodiFilter}&query=${encodeURIComponent(searchQuery)}`)
      if (res.ok) {
        const json = await res.json()
        setItems(json.data || [])
      }
    } catch (e) {
      console.error('Failed to load alumni data', e)
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
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2.5">
          <UserCheck className="w-7 h-7 text-ut-navy" />
          Alumni & Tracer Study FHISIP UT
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Direktori Lulusan, Hasil Survei Tracer Study, & Kesesuaian Bidang Kerjasama Alumni FHISIP Universitas Terbuka
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5 border-l-4 border-ut-navy flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase">Total Alumni Yudisium UT</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">2,056,583 Alumni</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-ut-navy/10 text-ut-navy flex items-center justify-center">
            <GraduationCap className="w-5 h-5" />
          </div>
        </div>

        <div className="card p-5 border-l-4 border-emerald-500 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase">Serapan Kerja & Kesesuaian</p>
            <p className="text-2xl font-extrabold text-emerald-700 mt-1">92.4% Sesuai Bidang</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Briefcase className="w-5 h-5" />
          </div>
        </div>

        <div className="card p-5 border-l-4 border-amber-500 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase">Waktu Tunggu Kerja Rata-Rata</p>
            <p className="text-2xl font-extrabold text-amber-800 mt-1">1.8 Bulan</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
            <Building2 className="w-5 h-5" />
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
              placeholder="Cari NIM, Nama, Perusahaan..."
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
                <th className="px-4 py-3 font-semibold">Nama Alumni</th>
                <th className="px-4 py-3 font-semibold">Program Studi</th>
                <th className="px-4 py-3 font-semibold text-center">Tahun Lulus</th>
                <th className="px-4 py-3 font-semibold text-center">IPK</th>
                <th className="px-4 py-3 font-semibold">Pekerjaan & Perusahaan Saat Ini</th>
                <th className="px-4 py-3 font-semibold text-center">Tracer Study</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    Memuat data alumni...
                  </td>
                </tr>
              )}

              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    Tidak ada data alumni yang sesuai.
                  </td>
                </tr>
              )}

              {!loading &&
                paginatedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3 font-mono font-bold text-ut-navy">{item.nim}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">{item.nama}</td>
                    <td className="px-4 py-3 font-medium text-slate-700">{item.prodiName} ({item.prodiCode})</td>
                    <td className="px-4 py-3 text-center font-bold text-slate-800">{item.tahunLulus}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-900 font-extrabold text-xs">
                        <Award className="w-3 h-3 text-emerald-700" /> {item.ipk}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      <div>{item.pekerjaanSaatIni}</div>
                      <span className="text-[10px] text-slate-500">{item.instansiPerusahaan}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[10px]">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> {item.kesesuaianBidang}
                      </span>
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
    </div>
  )
}
