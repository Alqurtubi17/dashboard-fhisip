'use client'

import React, { useState } from 'react'
import { Award, Wallet, Trophy, Users2, UserCheck } from 'lucide-react'
import { Pagination } from '@/components/ui/pagination'

export default function KemahasiswaanPage() {
  const scholarships = [
    { name: 'Beasiswa Peningkatan Prestasi Akademik (PPA)', kuota: '150 Mahasiswa', status: 'Pendaftaran Buka' },
    { name: 'Beasiswa KIP Kuliah FHISIP 2026', kuota: '300 Mahasiswa', status: 'Proses Verifikasi' },
    { name: 'Beasiswa Kemitraan Daerah & UT Daerah', kuota: '45 Mahasiswa', status: 'Aktif' },
    { name: 'Beasiswa Tahfidz & Prestasi Keagamaan', kuota: '25 Mahasiswa', status: 'Aktif' },
    { name: 'Beasiswa Inovasi Digital & Riset Mahasiswa', kuota: '50 Mahasiswa', status: 'Pendaftaran Buka' },
    { name: 'Beasiswa Bantuan UKT / SPP Kurang Mampu', kuota: '500 Mahasiswa', status: 'Proses Verifikasi' },
    { name: 'Beasiswa Atlet & Seni Budaya Nasional', kuota: '30 Mahasiswa', status: 'Aktif' },
    { name: 'Beasiswa Ikatan Alumni FHISIP UT', kuota: '60 Mahasiswa', status: 'Aktif' },
    { name: 'Beasiswa Disabilitas & Inklusi Pendidikan', kuota: '20 Mahasiswa', status: 'Pendaftaran Buka' },
    { name: 'Beasiswa CSR Mitra Industri PTTJJ', kuota: '100 Mahasiswa', status: 'Aktif' },
    { name: 'Beasiswa Kepemimpinan Mahasiswa (BEM/DPM)', kuota: '40 Mahasiswa', status: 'Aktif' },
  ]

  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const paginatedScholarships = scholarships.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">Kemahasiswaan</h1>
        <p className="text-slate-500 text-sm">Layanan beasiswa, kegiatan organisasi, dan data alumni FHISIP</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Penerima Beasiswa', val: '1.270', icon: Wallet, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Prestasi Nasional', val: '28 Piala', icon: Trophy, color: 'text-amber-600 bg-amber-50' },
          { label: 'ORMawa Aktif', val: '12 UKM/Hima', icon: Users2, color: 'text-blue-600 bg-blue-50' },
          { label: 'Alumni Terdata', val: '18.920', icon: UserCheck, color: 'text-purple-600 bg-purple-50' },
        ].map((s) => (
          <div key={s.label} className="card p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">{s.label}</p>
              <p className="text-2xl font-semibold text-slate-800 mt-1">{s.val}</p>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}>
              <s.icon className="w-5 h-5" />
            </div>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800 text-sm">Program Beasiswa Terbaru</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-5 py-3 font-medium">Nama Beasiswa</th>
                <th className="px-5 py-3 font-medium">Kuota Penerima</th>
                <th className="px-5 py-3 font-medium">Status Program</th>
              </tr>
            </thead>
            <tbody>
              {paginatedScholarships.map((sc) => (
                <tr key={sc.name} className="border-t border-slate-100">
                  <td className="px-5 py-3 font-medium text-slate-800">{sc.name}</td>
                  <td className="px-5 py-3 text-slate-600">{sc.kuota}</td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                      {sc.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalItems={scholarships.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>
    </div>
  )
}
