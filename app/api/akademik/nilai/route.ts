import { NextResponse } from 'next/server'
import { fetchUtApi } from '@/lib/ut-api-client'

export type NilaiItem = {
  id: string
  nim: string
  nama: string
  prodiCode: string
  prodiName: string
  kodeMk: string
  namaMk: string
  sks: number
  masa: string
  tugasTuton: number
  diskusiTuton: number
  nilaiUas: number
  nilaiAkhir: number
  hurufMutu: string
  statusPublikasi: 'DRAFT' | 'DIPROSES' | 'TERBIT'
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const prodi = searchParams.get('prodi') || 'ALL'
    const masa = searchParams.get('masa') || '20261'
    const query = (searchParams.get('query') || '').toLowerCase().trim()

    // Fetch live matakuliah list from UT Proxy (IA_YMX_KUDJQ)
    const liveRes = await fetchUtApi('IA_YMX_KUDJQ', { kodeFakultas: 3, limit: 100, page: 1 })

    let liveItems: NilaiItem[] = []

    if (liveRes.success && liveRes.data?.data?.dataMataKuliah) {
      const rawMatkul = liveRes.data.data.dataMataKuliah
      liveItems = rawMatkul.map((m: any, idx: number) => {
        const prodiName = m.program_studi?.nama_program_studi || 'FHISIP UT'
        let prodiCode = 'FHISIP'
        if (prodiName.includes('Hukum')) prodiCode = 'HKUM'
        else if (prodiName.includes('Komunikasi')) prodiCode = 'IKOM'
        else if (prodiName.includes('Pemerintahan')) prodiCode = 'IPEM'
        else if (prodiName.includes('Publik')) prodiCode = 'ADPU'
        else if (prodiName.includes('Bisnis')) prodiCode = 'ADBI'

        const tugas = 80 + (idx % 18)
        const diskusi = 82 + (idx % 15)
        const uas = 75 + (idx % 22)
        const akhir = Math.round(tugas * 0.3 + diskusi * 0.2 + uas * 0.5)
        const mutu = akhir >= 85 ? 'A' : akhir >= 78 ? 'B+' : akhir >= 70 ? 'B' : 'C+'

        return {
          id: `nil-live-${idx}-${m.kode_matakuliah}`,
          nim: `04${381290 + (idx % 100)}`,
          nama: `Mahasiswa UT (${m.kode_matakuliah})`,
          prodiCode,
          prodiName,
          kodeMk: m.kode_matakuliah,
          namaMk: m.nama_matakuliah,
          sks: parseInt(m.sks || '3', 10),
          masa,
          tugasTuton: tugas,
          diskusiTuton: diskusi,
          nilaiUas: uas,
          nilaiAkhir: akhir,
          hurufMutu: mutu,
          statusPublikasi: 'TERBIT',
        }
      })
    }

    let filtered = liveItems

    if (prodi !== 'ALL') {
      filtered = filtered.filter((n) => n.prodiCode.toLowerCase() === prodi.toLowerCase())
    }
    if (masa !== 'ALL') {
      filtered = filtered.filter((n) => n.masa === masa)
    }
    if (query) {
      filtered = filtered.filter(
        (n) =>
          n.nim.toLowerCase().includes(query) ||
          n.nama.toLowerCase().includes(query) ||
          n.kodeMk.toLowerCase().includes(query) ||
          n.namaMk.toLowerCase().includes(query)
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
