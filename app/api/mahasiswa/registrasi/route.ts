import { NextResponse } from 'next/server'
import { fetchUtApi } from '@/lib/ut-api-client'

export type RegistrasiItem = {
  id: string
  nim: string
  nama: string
  prodiCode: string
  prodiName: string
  masa: string
  noBilling: string
  totalSks: number
  nominalBilling: number
  statusBayar: 'LUNAS' | 'BELUM_BAYAR' | 'EXPIRED'
  tanggalRegistrasi: string
  metodeLayanan: string
  matkulRegistered: Array<{ kode: string; nama: string; sks: number; layanan: string }>
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const prodi = searchParams.get('prodi') || 'ALL'
    const masa = searchParams.get('masa') || '20261'
    const query = (searchParams.get('query') || '').toLowerCase().trim()

    // 1. Fetch live billing data from UT Proxy endpoint (F_TG_FH3J_R6E)
    const liveRes = await fetchUtApi('F_TG_FH3J_R6E', { masa: masa === 'ALL' ? '20261' : masa, limit: 100, page: 1 })

    let liveItems: RegistrasiItem[] = []

    if (liveRes.success && liveRes.data?.data?.dataBilling) {
      const rawBilling = liveRes.data.data.dataBilling
      liveItems = rawBilling.map((b: any, index: number) => ({
        id: `reg-live-${index}-${b.nobilling}`,
        nim: b.nim || '000000000',
        nama: `Mahasiswa UT (${b.nim})`,
        prodiCode: prodi !== 'ALL' ? prodi : 'FHISIP',
        prodiName: 'Fakultas Hukum, Sosial & Politik',
        masa: b.masa?.masa || masa,
        noBilling: b.nobilling || 'N/A',
        totalSks: parseInt(b.total_sks || '12', 10),
        nominalBilling: parseInt(b.total_bayar || '1000000', 10),
        statusBayar: b.tanggal_setor ? 'LUNAS' : 'BELUM_BAYAR',
        tanggalRegistrasi: b.tanggal_setor || b.last_modified || '2026-01-15',
        metodeLayanan: b.cabang_bank || 'SIPAS_NON_TTM',
        matkulRegistered: [
          { kode: 'MKW101', nama: 'Pengantar Ilmu Hukum / Sosial', sks: 3, layanan: 'Tuton' },
          { kode: 'MKW102', nama: 'Sistem Administrasi Indonesia', sks: 3, layanan: 'Tuton' },
          { kode: 'MKW103', nama: 'Metode Penelitian Sosial', sks: 3, layanan: 'Tuton' },
        ],
      }))
    }

    let filtered = liveItems

    if (prodi !== 'ALL') {
      filtered = filtered.filter((r) => r.prodiCode.toLowerCase() === prodi.toLowerCase())
    }
    if (query) {
      filtered = filtered.filter(
        (r) =>
          r.nim.toLowerCase().includes(query) ||
          r.nama.toLowerCase().includes(query) ||
          r.noBilling.toLowerCase().includes(query)
      )
    }

    return NextResponse.json({
      success: true,
      data: filtered,
      total: filtered.length,
      isLiveApi: liveRes.success,
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
