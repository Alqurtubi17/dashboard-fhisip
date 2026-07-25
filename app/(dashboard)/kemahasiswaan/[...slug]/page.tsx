import React from 'react'

export default function KemahasiswaanSubPage({ params }: { params: { slug: string[] } }) {
  const pageTitle = params.slug ? params.slug.join(' / ').toUpperCase() : 'KEMAHASISWAAN'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">Kemahasiswaan: {pageTitle}</h1>
        <p className="text-slate-500 text-sm">Halaman kemahasiswaan sub-modul ({params.slug?.join('/')})</p>
      </div>

      <div className="card p-6 text-sm text-slate-600 space-y-3">
        <p className="font-medium text-slate-800">Status Sub-Modul: Aktif</p>
        <p>
          Sub-modul <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-primary">/kemahasiswaan/{params.slug?.join('/')}</span> aktif dan siap menerima data.
        </p>
      </div>
    </div>
  )
}
