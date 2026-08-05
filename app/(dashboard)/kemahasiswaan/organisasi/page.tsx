'use client'

import React, { useEffect, useState } from 'react'
import {
  Users2,
  Search,
  CheckCircle2,
  Building,
  Award,
  Users,
  ShieldCheck,
} from 'lucide-react'

type OrganisasiItem = {
  id: string
  namaOrmawa: string
  singkatan: string
  kategori: 'BEM' | 'HIMA' | 'UKM'
  ketuaUmum: string
  nimKetua: string
  prodiKetua: string
  jumlahAnggota: number
  statusSk: string
}

export default function OrganisasiPage() {
  const [items, setItems] = useState<OrganisasiItem[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/kemahasiswaan/organisasi')
      if (res.ok) {
        const json = await res.json()
        setItems(json.data || [])
      }
    } catch (e) {
      console.error('Failed to load organisasi data', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2.5">
          <Users2 className="w-7 h-7 text-ut-navy" />
          Organisasi Kemahasiswaan (Ormawa) FHISIP UT
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Pengelolaan Legalitas SK, Kepengurusan BEM, Himpunan Mahasiswa (HIMA), & Unit Kegiatan Mahasiswa (UKM)
        </p>
      </div>

      {/* Grid Ormawa Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {loading && (
          <div className="col-span-3 text-center py-8 text-slate-400">
            Memuat data organisasi kemahasiswaan...
          </div>
        )}

        {!loading &&
          items.map((o) => (
            <div key={o.id} className="card p-6 card-hover space-y-4 relative overflow-hidden border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-xl bg-ut-navy text-amber-400 font-extrabold text-xs">
                  {o.kategori}
                </span>
                <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-xs bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" /> SK Aktif
                </span>
              </div>

              <div>
                <h3 className="font-extrabold text-slate-900 text-lg">{o.singkatan}</h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">{o.namaOrmawa}</p>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Ketua Umum:</span>
                  <span className="font-bold text-slate-800">{o.ketuaUmum}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">NIM & Prodi:</span>
                  <span className="font-semibold text-slate-700">{o.nimKetua} ({o.prodiKetua})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Jumlah Pengurus & Anggota:</span>
                  <span className="font-extrabold text-ut-navy">{o.jumlahAnggota} Mahasiswa</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-slate-500">Nomor SK Dekan:</span>
                  <span className="font-mono text-[10px] text-slate-600 font-bold">{o.statusSk}</span>
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}
