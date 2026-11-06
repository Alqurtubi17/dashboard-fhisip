'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  History,
  BookX,
  Search,
  Filter,
  Eye,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
} from 'lucide-react'
import { Pagination } from '@/components/ui/pagination'
import { STATUS_MAP, formatWIBDate } from '@/lib/pengguguran-utils'

export default function StudentRiwayatPage() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalItems, setTotalItems] = useState(0)
  const [selectedStatus, setSelectedStatus] = useState('ALL')

  const fetchSubmissions = async () => {
    try {
      setLoading(true)
      const p = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
        status: selectedStatus,
      })
      const res = await fetch(`/api/mahasiswa/pengguguran?${p.toString()}`)
      const json = await res.json()
      if (json.success) {
        setItems(json.data)
        setTotalItems(json.meta.total)
      }
    } catch (err) {
      console.error('Error fetching submissions:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSubmissions()
  }, [page, pageSize, selectedStatus])

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <History className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Riwayat Pengajuan Pengguguran</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Daftar lengkap seluruh permohonan pengguguran mata kuliah yang pernah Anda ajukan.
          </p>
        </div>

        <Link
          href="/portal-mahasiswa/pengguguran"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#002B49] hover:bg-[#003B64] text-white text-xs font-bold shadow-md transition"
        >
          <BookX className="w-4 h-4" />
          <span>Buat Pengajuan Baru</span>
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value)
              setPage(1)
            }}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Semua Status</option>
            <option value="MENUNGGU_VERIFIKASI_PRODI">Menunggu Verifikasi Prodi</option>
            <option value="DISETUJUI_PRODI">Disetujui Prodi</option>
            <option value="DISETUJUI_AKADEMIK">Disetujui Akademik (Selesai)</option>
            <option value="DITOLAK_PRODI">Ditolak Prodi</option>
            <option value="DITOLAK_AKADEMIK">Ditolak Akademik</option>
          </select>
        </div>

        <button
          onClick={() => fetchSubmissions()}
          className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
            <p className="text-xs font-semibold">Memuat riwayat pengajuan...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <BookX className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="font-semibold text-slate-600">Belum ada riwayat pengajuan pengguguran.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left min-w-[700px]">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3.5">No. Pengajuan</th>
                  <th className="px-4 py-3.5">Mata Kuliah</th>
                  <th className="px-4 py-3.5">Periode Akademik</th>
                  <th className="px-4 py-3.5">Tanggal Pengajuan</th>
                  <th className="px-4 py-3.5">Status Saat Ini</th>
                  <th className="px-4 py-3.5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => {
                  const st = STATUS_MAP[item.status] || {
                    label: item.status,
                    badgeBg: 'bg-slate-50 text-slate-700',
                  }

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3.5 font-mono font-bold text-slate-800">{item.nomorPengajuan}</td>
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-800">{item.kodeMatkul}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[200px]">{item.namaMatkul}</div>
                        <span className="text-[10px] text-slate-400">{item.sks} SKS</span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">
                        {item.periode?.nama || item.periodeId}
                      </td>
                      <td className="px-4 py-3.5 text-slate-500">{formatWIBDate(item.createdAt)}</td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold border ${st.badgeBg}`}>
                          {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <Link
                          href={`/portal-mahasiswa/pengguguran/${item.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                          <span>Pantau Progres</span>
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          currentPage={page}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </div>
    </div>
  )
}

