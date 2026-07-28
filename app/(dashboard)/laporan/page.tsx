'use client'

import React, { useState } from 'react'
import { FileBarChart, Download } from 'lucide-react'
import { Pagination } from '@/components/ui/pagination'

export default function LaporanPage() {
  const reports = [
    { title: 'Laporan Rekapitulasi IPK Mahasiswa Per Prodi', date: '2026-07-20', type: 'PDF / Excel' },
    { title: 'Laporan Evaluasi Hasil Belajar Semester Genap', date: '2026-07-15', type: 'PDF' },
    { title: 'Laporan Distribusi Beasiswa & Bantuan Akademik', date: '2026-07-10', type: 'Excel' },
    { title: 'Laporan Kinerja Pengajaran Dosen FHISIP', date: '2026-07-01', type: 'PDF' },
    { title: 'Laporan Kelulusan Yudisium Mahasiswa 2026', date: '2026-06-25', type: 'PDF' },
    { title: 'Laporan Statistik Registrasi Mata Kuliah', date: '2026-06-18', type: 'Excel' },
    { title: 'Laporan Monitoring Ujian Akhir Semester (UAS)', date: '2026-06-10', type: 'PDF' },
    { title: 'Laporan Audit Internal Layanan Kemahasiswaan', date: '2026-06-02', type: 'PDF' },
    { title: 'Laporan Capaian Pembelajaran Lulusan (CPL)', date: '2026-05-28', type: 'Excel' },
    { title: 'Laporan Fasilitas & Prasarana UT Daerah', date: '2026-05-15', type: 'PDF' },
    { title: 'Laporan Transkrip Nilai Sementara Mahasiswa', date: '2026-05-02', type: 'Excel' },
  ]

  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const paginatedReports = reports.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Laporan Akademik</h1>
          <p className="text-slate-500 text-sm">Unduh dan cetak rekapitulasi data akademik fakultas</p>
        </div>
        <button className="btn-primary flex items-center gap-2 text-sm">
          <Download className="w-4 h-4" /> Export Semua Laporan
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800 text-sm">Dokumen Laporan Tersedia</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-5 py-3 font-medium">Judul Laporan</th>
                <th className="px-5 py-3 font-medium">Format</th>
                <th className="px-5 py-3 font-medium">Tanggal Diperbarui</th>
                <th className="px-5 py-3 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginatedReports.map((r) => (
                <tr key={r.title} className="border-t border-slate-100">
                  <td className="px-5 py-3 font-medium text-slate-800 flex items-center gap-2">
                    <FileBarChart className="w-4 h-4 text-primary shrink-0" />
                    {r.title}
                  </td>
                  <td className="px-5 py-3 text-slate-600 font-mono text-xs">{r.type}</td>
                  <td className="px-5 py-3 text-slate-500 text-xs">{r.date}</td>
                  <td className="px-5 py-3 text-right">
                    <button className="btn-secondary py-1 px-3 text-xs inline-flex items-center gap-1.5">
                      <Download className="w-3.5 h-3.5" /> Unduh
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalItems={reports.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>
    </div>
  )
}
