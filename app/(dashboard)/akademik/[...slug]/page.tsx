import React from 'react'

export default function AkademikSubPage({ params }: { params: { slug: string[] } }) {
  const pageTitle = params.slug ? params.slug.join(' / ').toUpperCase() : 'AKADEMIK'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">Modul Akademik: {pageTitle}</h1>
        <p className="text-slate-500 text-sm">Halaman pengelolaan sub-modul akademik ({params.slug?.join('/')})</p>
      </div>

      <div className="card p-6 text-sm text-slate-600 space-y-3">
        <p className="font-medium text-slate-800">Status Sub-Modul: Terkoneksi</p>
        <p>
          Sub-modul <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-primary">/akademik/{params.slug?.join('/')}</span> aktif dan siap digunakan.
        </p>
      </div>
    </div>
  )
}
