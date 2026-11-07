'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  XCircle,
  ShieldCheck,
  Check,
  X,
  Loader2,
  AlertCircle,
  Calendar,
  Building2,
  BookX,
  FileText,
  User,
} from 'lucide-react'
import { STATUS_MAP, formatWIBDate } from '@/lib/pengguguran-utils'

export default function StudentPengguguranDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  const [item, setItem] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return

    fetch(`/api/mahasiswa/pengguguran/${id}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error('Pengajuan tidak ditemukan atau Anda tidak memiliki akses.')
        }
        return res.json()
      })
      .then((json) => {
        if (json.success) {
          setItem(json.data)
        } else {
          setError(json.error)
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
        <p className="text-xs font-semibold">Memuat detail pengajuan...</p>
      </div>
    )
  }

  if (error || !item) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs inline-flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error || 'Pengajuan tidak ditemukan.'}</span>
        </div>
        <div>
          <Link
            href="/portal-mahasiswa/riwayat"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Riwayat</span>
          </Link>
        </div>
      </div>
    )
  }

  const st = STATUS_MAP[item.status] || {
    label: item.status,
    badgeBg: 'bg-slate-50 text-slate-700',
  }

  const isDitolakProdi = item.status === 'DITOLAK_PRODI'
  const isDitolakAkademik = item.status === 'DITOLAK_AKADEMIK'
  const isDisetujuiProdi = item.status === 'DISETUJUI_PRODI'
  const isDisetujuiAkademik = item.status === 'DISETUJUI_AKADEMIK'
  const isMenungguProdi = item.status === 'MENUNGGU_VERIFIKASI_PRODI'

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back button */}
      <div>
        <Link
          href="/portal-mahasiswa/riwayat"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Riwayat Pengajuan</span>
        </Link>
      </div>

      {/* Main Status Header Card */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-extrabold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
                {item.nomorPengajuan}
              </span>
              <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold border ${st.badgeBg}`}>
                {st.label}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-2">
              Pengguguran: {item.kodeMatkul} - {item.namaMatkul}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Periode {item.periode?.nama} • Diajukan pada {formatWIBDate(item.createdAt)}
            </p>
          </div>
        </div>

        {/* Visual Stepper Progress Bar */}
        <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4">
          <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Alur Monitoring Persetujuan
          </p>

          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            {/* Step 1: Pengajuan Mahasiswa */}
            <div className="space-y-1.5">
              <div className="w-9 h-9 mx-auto rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-md shadow-emerald-600/20">
                <Check className="w-5 h-5" />
              </div>
              <div className="font-bold text-slate-800 text-[11px] sm:text-xs">1. Pengajuan</div>
              <div className="text-[10px] text-emerald-700 font-semibold">Terkirim</div>
              <div className="text-[9px] text-slate-400 hidden sm:block">{formatWIBDate(item.createdAt)}</div>
            </div>

            {/* Step 2: Verifikasi Prodi */}
            <div className="space-y-1.5">
              <div
                className={`w-9 h-9 mx-auto rounded-full flex items-center justify-center font-bold text-xs shadow-md ${
                  isMenungguProdi
                    ? 'bg-amber-500 text-white animate-pulse shadow-amber-500/20'
                    : isDitolakProdi
                    ? 'bg-rose-600 text-white shadow-rose-600/20'
                    : 'bg-emerald-600 text-white shadow-emerald-600/20'
                }`}
              >
                {isDitolakProdi ? (
                  <X className="w-5 h-5" />
                ) : isMenungguProdi ? (
                  <Clock className="w-5 h-5" />
                ) : (
                  <Check className="w-5 h-5" />
                )}
              </div>
              <div className="font-bold text-slate-800 text-[11px] sm:text-xs">2. Verifikasi Prodi</div>
              <div
                className={`text-[10px] font-semibold ${
                  isMenungguProdi
                    ? 'text-amber-600'
                    : isDitolakProdi
                    ? 'text-rose-600 font-bold'
                    : 'text-emerald-700'
                }`}
              >
                {isMenungguProdi ? 'Menunggu' : isDitolakProdi ? 'Ditolak Prodi' : 'Disetujui Prodi'}
              </div>
              {item.verifikasiProdiAt && (
                <div className="text-[9px] text-slate-400 hidden sm:block">{formatWIBDate(item.verifikasiProdiAt)}</div>
              )}
            </div>

            {/* Step 3: Keputusan Akademik */}
            <div className="space-y-1.5">
              <div
                className={`w-9 h-9 mx-auto rounded-full flex items-center justify-center font-bold text-xs shadow-md ${
                  isDisetujuiProdi
                    ? 'bg-blue-600 text-white animate-pulse shadow-blue-600/20'
                    : isDisetujuiAkademik
                    ? 'bg-emerald-600 text-white shadow-emerald-600/20'
                    : isDitolakAkademik
                    ? 'bg-rose-600 text-white shadow-rose-600/20'
                    : 'bg-slate-200 text-slate-400'
                }`}
              >
                {isDisetujuiAkademik ? (
                  <Check className="w-5 h-5" />
                ) : isDitolakAkademik ? (
                  <X className="w-5 h-5" />
                ) : isDisetujuiProdi ? (
                  <Clock className="w-5 h-5" />
                ) : (
                  <span>3</span>
                )}
              </div>
              <div className="font-bold text-slate-800 text-[11px] sm:text-xs">3. Keputusan Akademik</div>
              <div
                className={`text-[10px] font-semibold ${
                  isDisetujuiAkademik
                    ? 'text-emerald-700'
                    : isDitolakAkademik
                    ? 'text-rose-600 font-bold'
                    : isDisetujuiProdi
                    ? 'text-blue-600'
                    : 'text-slate-400'
                }`}
              >
                {isDisetujuiAkademik
                  ? 'Disetujui'
                  : isDitolakAkademik
                  ? 'Ditolak'
                  : isDisetujuiProdi
                  ? 'Menunggu'
                  : '-'}
              </div>
              {item.keputusanAkademikAt && (
                <div className="text-[9px] text-slate-400 hidden sm:block">{formatWIBDate(item.keputusanAkademikAt)}</div>
              )}
            </div>

            {/* Step 4: Hasil Selesai */}
            <div className="space-y-1.5">
              <div
                className={`w-9 h-9 mx-auto rounded-full flex items-center justify-center font-bold text-xs shadow-md ${
                  isDisetujuiAkademik
                    ? 'bg-emerald-600 text-white shadow-emerald-600/20'
                    : isDitolakProdi || isDitolakAkademik
                    ? 'bg-rose-600 text-white shadow-rose-600/20'
                    : 'bg-slate-200 text-slate-400'
                }`}
              >
                {isDisetujuiAkademik ? (
                  <Check className="w-5 h-5" />
                ) : isDitolakProdi || isDitolakAkademik ? (
                  <X className="w-5 h-5" />
                ) : (
                  <span>4</span>
                )}
              </div>
              <div className="font-bold text-slate-800 text-[11px] sm:text-xs">4. Hasil Akhir</div>
              <div
                className={`text-[10px] font-bold ${
                  isDisetujuiAkademik
                    ? 'text-emerald-700'
                    : isDitolakProdi || isDitolakAkademik
                    ? 'text-rose-600'
                    : 'text-slate-400'
                }`}
              >
                {isDisetujuiAkademik
                  ? 'Sah Digugurkan'
                  : isDitolakProdi || isDitolakAkademik
                  ? 'Ditolak'
                  : 'Dalam Proses'}
              </div>
            </div>
          </div>
        </div>

        {/* Alasan Penolakan Alert (Jika Ditolak) */}
        {(isDitolakProdi || isDitolakAkademik) && (
          <div className="p-4 sm:p-5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-1.5 animate-in fade-in">
            <div className="flex items-center gap-2 font-bold text-rose-800 text-sm">
              <XCircle className="w-5 h-5 text-rose-600" />
              <span>Pengajuan Ditolak oleh {isDitolakProdi ? 'Program Studi' : 'Bagian Akademik'}</span>
            </div>
            <p className="font-semibold text-rose-950">
              Catatan Alasan Penolakan: &ldquo;{isDitolakProdi ? item.catatanProdi : item.catatanAkademik}&rdquo;
            </p>
            <p className="text-[11px] text-slate-500">
              Oleh: {isDitolakProdi ? item.verifikatorProdiName || 'Petugas Program Studi' : item.keputusanAkademikName || 'Bagian Akademik'}
            </p>
          </div>
        )}

        {/* Informasi Detail Mata Kuliah & Alasan */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-2xl border border-slate-200 space-y-2">
            <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider block">
              Mata Kuliah Yang Diajukan
            </span>
            <div>
              <span className="text-slate-400 block text-[11px]">Kode & Nama:</span>
              <span className="font-bold text-slate-900 text-sm">
                {item.kodeMatkul} - {item.namaMatkul}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Bobot SKS:</span>
              <span className="font-semibold text-slate-700">{item.sks} SKS</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Kategori:</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Non-Inti (Dapat Diajukan)
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl border border-slate-200 space-y-2">
            <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider block">
              Alasan Pengguguran
            </span>
            <p className="text-slate-700 italic bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">
              &ldquo;{item.alasan}&rdquo;
            </p>
            {item.lampiranNama && (
              <div className="text-[11px] text-slate-500">
                <strong>Lampiran:</strong> {item.lampiranNama}
              </div>
            )}
          </div>
        </div>

        {/* Audit Trail Log */}
        {item.riwayat && item.riwayat.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
              Jejak Audit & Catatan Keputusan
            </h3>
            <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100 text-xs">
              {item.riwayat.map((r: any, idx: number) => (
                <div key={idx} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div>
                    <span className="font-bold text-slate-900">{r.actorName}</span>{' '}
                    <span className="text-slate-500">({r.actorRole}):</span>{' '}
                    <span className="text-slate-700">{r.catatan}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono shrink-0">
                    {formatWIBDate(r.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

