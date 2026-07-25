import React from 'react'
import { GraduationCap, Users, UserCheck, Clock, FileSpreadsheet } from 'lucide-react'

export default function MahasiswaPage() {
  const students = [
    { nim: '041234561', name: 'Ahmad Rizky', prodi: 'Ilmu Komunikasi', semester: 4, status: 'Aktif', ipk: '3.82' },
    { nim: '041234562', name: 'Siti Rahmawati', prodi: 'Sosiologi', semester: 6, status: 'Aktif', ipk: '3.75' },
    { nim: '041234563', name: 'Budi Kurniawan', prodi: 'Ilmu Pemerintahan', semester: 2, status: 'Aktif', ipk: '3.60' },
    { nim: '041234564', name: 'Dewi Lestari', prodi: 'Ilmu Perpustakaan', semester: 8, status: 'Cuti', ipk: '3.90' },
    { nim: '041234565', name: 'Fajar Nugraha', prodi: 'Ilmu Komunikasi', semester: 4, status: 'Aktif', ipk: '3.45' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">Data Mahasiswa</h1>
        <p className="text-slate-500 text-sm">Kelola biodata, status akademik, dan KRS mahasiswa FHISIP</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Mahasiswa', val: '12.430', icon: Users, color: 'text-blue-600 bg-blue-50' },
          { label: 'Mahasiswa Aktif', val: '11.890', icon: UserCheck, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Mahasiswa Cuti', val: '340', icon: Clock, color: 'text-amber-600 bg-amber-50' },
          { label: 'Pengajuan KRS', val: '2.150', icon: FileSpreadsheet, color: 'text-purple-600 bg-purple-50' },
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
          <h2 className="font-semibold text-slate-800 text-sm">Daftar Mahasiswa Terdaftar</h2>
          <span className="text-xs text-slate-400">Menampilkan 5 dari 12.430 data</span>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="px-5 py-3 font-medium">NIM</th>
              <th className="px-5 py-3 font-medium">Nama Mahasiswa</th>
              <th className="px-5 py-3 font-medium">Program Studi</th>
              <th className="px-5 py-3 font-medium">Semester</th>
              <th className="px-5 py-3 font-medium">IPK</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {students.map((st) => (
              <tr key={st.nim} className="border-t border-slate-100">
                <td className="px-5 py-3 font-mono text-xs text-slate-600">{st.nim}</td>
                <td className="px-5 py-3 font-medium text-slate-800">{st.name}</td>
                <td className="px-5 py-3 text-slate-600">{st.prodi}</td>
                <td className="px-5 py-3 text-slate-600">Sem {st.semester}</td>
                <td className="px-5 py-3 font-semibold text-slate-700">{st.ipk}</td>
                <td className="px-5 py-3">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      st.status === 'Aktif'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        : 'bg-amber-50 text-amber-700 border border-amber-100'
                    }`}
                  >
                    {st.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
