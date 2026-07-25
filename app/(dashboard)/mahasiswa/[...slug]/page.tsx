import React from 'react'

export default function MahasiswaSubPage({ params }: { params: { slug: string[] } }) {
  const pageTitle = params.slug ? params.slug.join(' / ').toUpperCase() : 'MAHASISWA'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">Modul Mahasiswa: {pageTitle}</h1>
        <p className="text-slate-500 text-sm">Halaman manajemen modul mahasiswa ({params.slug?.join('/')})</p>
      </div>

      <div className="card p-6 text-sm text-slate-600 space-y-3">
        <p className="font-medium text-slate-800">Status Modul: Terhubung & Aktif</p>
        <p>
          Layanan untuk sub-modul <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-primary">/mahasiswa/{params.slug?.join('/')}</span> sedang beroperasi.
        </p>
      </div>
    </div>
  )
}
