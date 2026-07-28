'use client'

import React, { useState } from 'react'
import { BookOpen, Calendar, Star, BookMarked } from 'lucide-react'
import { Pagination } from '@/components/ui/pagination'

export default function AkademikPage() {
  const courses = [
    { code: 'MKW101', name: 'Pengantar Ilmu Politik', sks: 3, dosen: 'Dr. Andi Wijaya, M.Si', prodi: 'Ilmu Politik' },
    { code: 'MKW102', name: 'Teori Komunikasi', sks: 3, dosen: 'Prof. Sri Handayani, Ph.D', prodi: 'Ilmu Komunikasi' },
    { code: 'MKW103', name: 'Sosiologi Pembangunan', sks: 2, dosen: 'Drs. Herman Prasetyo, M.A', prodi: 'Sosiologi' },
    { code: 'MKW104', name: 'Sistem Pemerintahan Indonesia', sks: 3, dosen: 'Dr. Bambang Sutrisno, M.H', prodi: 'Ilmu Pemerintahan' },
    { code: 'MKW105', name: 'Hukum Tata Negara & Administrasi', sks: 3, dosen: 'Dr. Rina Novita, S.H., M.H', prodi: 'Hukum' },
    { code: 'MKW106', name: 'Pengantar Ilmu Perpustakaan', sks: 2, dosen: 'Dra. Endang Kusuma, M.Hum', prodi: 'Ilmu Perpustakaan' },
    { code: 'MKW107', name: 'Metode Penelitian Sosial', sks: 3, dosen: 'Dr. Aris Setiawan, M.Sc', prodi: 'Sosiologi' },
    { code: 'MKW108', name: 'Komunikasi Massa & Media Digital', sks: 3, dosen: 'Dr. Fitriani, M.Si', prodi: 'Ilmu Komunikasi' },
    { code: 'MKW109', name: 'Etika Birokrasi & Pelayanan Publik', sks: 2, dosen: 'Dr. Taufik Hidayat, M.Si', prodi: 'Administrasi Publik' },
    { code: 'MKW110', name: 'Hukum Perdata & Pidana', sks: 3, dosen: 'Prof. Dr. Hendra Gunawan, S.H', prodi: 'Hukum' },
    { code: 'MKW111', name: 'Manajemen Informasi & Sistem Kearsipan', sks: 3, dosen: 'Nurhayati, M.IP', prodi: 'Ilmu Perpustakaan' },
    { code: 'MKW112', name: 'Kebijakan Publik & Otonomi Daerah', sks: 3, dosen: 'Dr. Wahyu Triyono, M.AP', prodi: 'Ilmu Pemerintahan' },
  ]

  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const paginatedCourses = courses.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">Modul Akademik</h1>
        <p className="text-slate-500 text-sm">Kelola kurikulum, jadwal perkuliahan, dan penilaian mahasiswa</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Mata Kuliah', val: '148', icon: BookOpen, color: 'text-blue-600 bg-blue-50' },
          { label: 'Jadwal Aktif', val: '86 Kelas', icon: Calendar, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Input Nilai Masuk', val: '94.2%', icon: Star, color: 'text-amber-600 bg-amber-50' },
          { label: 'Kurikulum 2026', val: 'Revisi Terbit', icon: BookMarked, color: 'text-purple-600 bg-purple-50' },
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
          <h2 className="font-semibold text-slate-800 text-sm">Mata Kuliah Semester Ini</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-5 py-3 font-medium">Kode MK</th>
                <th className="px-5 py-3 font-medium">Nama Mata Kuliah</th>
                <th className="px-5 py-3 font-medium">SKS</th>
                <th className="px-5 py-3 font-medium">Dosen Pengampu</th>
                <th className="px-5 py-3 font-medium">Program Studi</th>
              </tr>
            </thead>
            <tbody>
              {paginatedCourses.map((c) => (
                <tr key={c.code} className="border-t border-slate-100">
                  <td className="px-5 py-3 font-mono text-xs text-slate-600">{c.code}</td>
                  <td className="px-5 py-3 font-medium text-slate-800">{c.name}</td>
                  <td className="px-5 py-3 text-slate-600">{c.sks} SKS</td>
                  <td className="px-5 py-3 text-slate-600">{c.dosen}</td>
                  <td className="px-5 py-3 text-slate-600">{c.prodi}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalItems={courses.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>
    </div>
  )
}
