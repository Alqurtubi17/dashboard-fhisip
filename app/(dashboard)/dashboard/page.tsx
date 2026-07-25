export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">Dashboard</h1>
        <p className="text-slate-500 text-sm">Ringkasan akademik hari ini</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Mahasiswa Aktif', value: '12.430' },
          { label: 'Dosen', value: '842' },
          { label: 'Program Studi', value: '36' },
          { label: 'Kelulusan Tahun Ini', value: '1.204' },
        ].map((s) => (
          <div key={s.label} className="card p-5">
            <p className="text-sm text-slate-500">{s.label}</p>
            <p className="text-2xl font-semibold text-slate-800 mt-1">{s.value}</p>
          </div>
        ))}
      </div>
      <div className="card p-5 text-sm text-slate-500">
        Modul statistik dan grafik akademik lengkap dapat dikembangkan pada tahap berikutnya. Halaman ini fokus pada
        Login, Role, dan Manajemen Menu/Permission terlebih dahulu.
      </div>
    </div>
  )
}
