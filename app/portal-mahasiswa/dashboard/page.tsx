'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  GraduationCap,
  CalendarClock,
  Clock,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  BookX,
  ArrowRight,
  Eye,
  Loader2,
  AlertCircle,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react'
import { STATUS_MAP, formatWIBDate, formatWIBDateShort } from '@/lib/pengguguran-utils'

export default function StudentDashboardPage() {
  const [data, setData] = useState<any>(null)
  const [recentSubmissions, setRecentSubmissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/mahasiswa/me').then((r) => r.json()),
      fetch('/api/mahasiswa/pengguguran?limit=5').then((r) => r.json()),
    ])
      .then(([meRes, subRes]) => {
        if (meRes.success) {
          setData(meRes)
        }
        if (subRes.success) {
          setRecentSubmissions(subRes.data)
        }
      })
      .catch((err) => console.error('Dashboard load error:', err))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
        <p className="text-xs font-semibold">Memuat dashboard mahasiswa...</p>
      </div>
    )
  }

  const student = data?.student
  const activePeriode = data?.activePeriode
  const stats = data?.stats || { total: 0, menungguProdi: 0, disetujuiProdi: 0, disetujuiAkademik: 0, ditolak: 0 }
  const timeline = activePeriode?.timeline

  return (
    <div className="space-y-6">
      {/* Student Welcome Hero Banner */}
      <div className="bg-gradient-to-r from-[#002B49] via-[#003B64] to-[#014D82] text-white p-6 sm:p-8 rounded-3xl shadow-xl shadow-blue-950/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
            <GraduationCap className="w-4 h-4" />
            <span>Mahasiswa Aktif FHISIP UT</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Selamat Datang, {student?.name}!
          </h1>
          <p className="text-xs sm:text-sm text-slate-200 font-medium">
            NIM: <span className="font-mono font-bold text-amber-300">{student?.nim}</span> • Program Studi:{' '}
            <span className="font-semibold text-white">{student?.prodi}</span> (Semester {student?.semester})
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <Link
            href="/portal-mahasiswa/pengguguran"
            className={`flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold shadow-lg transition-all ${
              timeline?.isPengajuanOpen
                ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-amber-500/20 active:scale-95'
                : 'bg-white/20 text-white/60 cursor-not-allowed'
            }`}
          >
            <BookX className="w-4 h-4" />
            <span>Ajukan Pengguguran Mata Kuliah</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Timeline Schedule Banner */}
      {activePeriode && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <CalendarClock className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-800 text-sm sm:text-base">{activePeriode.nama}</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Aktif
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Semester {activePeriode.semester} • Tahun Akademik {activePeriode.tahunAkademik}
                </p>
              </div>
            </div>

            {/* Countdown / Stage status */}
            <div className="text-right">
              {timeline?.isPengajuanOpen ? (
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  <span>Pengajuan Terbuka ({timeline.daysRemainingPengajuan} Hari Lagi)</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-xs font-semibold">
                  <Clock className="w-4 h-4" />
                  <span>Tahap Pengajuan Ditutup</span>
                </div>
              )}
            </div>
          </div>

          {/* Stepper Timeline Visual */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div
              className={`p-3.5 rounded-xl border ${
                timeline?.isPengajuanOpen
                  ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900 font-bold'
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <span>1. Pengajuan Mahasiswa</span>
                {timeline?.isPengajuanOpen && <span className="text-[10px] text-emerald-700 uppercase">Aktif</span>}
              </div>
              <p className="mt-1 text-[11px] font-normal text-slate-500">
                {formatWIBDateShort(activePeriode.pengajuanStart)} s/d {formatWIBDateShort(activePeriode.pengajuanEnd)}
              </p>
            </div>

            <div
              className={`p-3.5 rounded-xl border ${
                timeline?.isVerifikasiProdiOpen
                  ? 'bg-blue-50/70 border-blue-300 text-blue-900 font-bold'
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <span>2. Verifikasi Prodi</span>
                {timeline?.isVerifikasiProdiOpen && <span className="text-[10px] text-blue-700 uppercase">Aktif</span>}
              </div>
              <p className="mt-1 text-[11px] font-normal text-slate-500">
                {formatWIBDateShort(activePeriode.verifikasiProdiStart)} s/d {formatWIBDateShort(activePeriode.verifikasiProdiEnd)}
              </p>
            </div>

            <div
              className={`p-3.5 rounded-xl border ${
                timeline?.isKeputusanAkademikOpen
                  ? 'bg-purple-50/70 border-purple-300 text-purple-900 font-bold'
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <span>3. Keputusan Akademik</span>
                {timeline?.isKeputusanAkademikOpen && <span className="text-[10px] text-purple-700 uppercase">Aktif</span>}
              </div>
              <p className="mt-1 text-[11px] font-normal text-slate-500">
                {formatWIBDateShort(activePeriode.keputusanAkademikStart)} s/d {formatWIBDateShort(activePeriode.keputusanAkademikEnd)}
              </p>
            </div>

            <div className="p-3.5 rounded-xl border bg-slate-50 border-slate-200 text-slate-600">
              <div className="flex items-center justify-between">
                <span>4. Pengumuman Hasil</span>
              </div>
              <p className="mt-1 text-[11px] font-normal text-slate-500">
                {formatWIBDateShort(activePeriode.pengumumanDate)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {[
          { label: 'Total Pengajuan Saya', val: stats.total, icon: Layers, color: 'text-slate-700 bg-slate-100' },
          { label: 'Menunggu Prodi', val: stats.menungguProdi, icon: Clock, color: 'text-amber-700 bg-amber-50' },
          { label: 'Disetujui Prodi', val: stats.disetujuiProdi, icon: CheckCircle2, color: 'text-blue-700 bg-blue-50' },
          { label: 'Sah Digugurkan', val: stats.disetujuiAkademik, icon: ShieldCheck, color: 'text-emerald-700 bg-emerald-50' },
          { label: 'Ditolak', val: stats.ditolak, icon: XCircle, color: 'text-rose-700 bg-rose-50' },
        ].map((s) => (
          <div key={s.label} className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">{s.label}</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{s.val}</p>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}>
              <s.icon className="w-5 h-5" />
            </div>
          </div>
        ))}
      </div>

      {/* Recent Submissions List */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-800 text-sm sm:text-base">Pengajuan Terakhir Saya</h2>
            <p className="text-xs text-slate-500">Pantau progres verifikasi pengguguran mata kuliah Anda</p>
          </div>
          <Link
            href="/portal-mahasiswa/riwayat"
            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <span>Lihat Semua Riwayat</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentSubmissions.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <BookX className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="font-semibold text-slate-600">Belum ada pengajuan pengguguran mata kuliah</p>
            <p className="text-xs text-slate-400 mt-1">
              Gunakan tombol &quot;Ajukan Pengguguran Mata Kuliah&quot; di atas untuk memulai permohonan.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left min-w-[650px]">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">No. Pengajuan</th>
                  <th className="px-4 py-3">Mata Kuliah</th>
                  <th className="px-4 py-3">Kategori</th>
                  <th className="px-4 py-3">Tanggal Diajukan</th>
                  <th className="px-4 py-3">Status Saat Ini</th>
                  <th className="px-4 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentSubmissions.map((item) => {
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
                      <td className="px-4 py-3.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Non-Inti
                        </span>
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
                          <span>Detail</span>
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

