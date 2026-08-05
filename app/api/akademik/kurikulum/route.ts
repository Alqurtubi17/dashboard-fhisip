import { NextResponse } from 'next/server'
import { fetchUtApi } from '@/lib/ut-api-client'

export type KurikulumItem = {
  id: string
  kodeMk: string
  namaMk: string
  sks: number
  semesterPenawaran: number
  prodiCode: string
  prodiName: string
  sifatMatkul: 'WAJIB' | 'PILIHAN' | 'TAP' | 'KARIL'
  bahanAjarKode: string
  prasyaratKode: string | null
  cplCpmk: string
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const prodi = searchParams.get('prodi') || 'ALL'
    const query = (searchParams.get('query') || '').toLowerCase().trim()

    // Fetch live matakuliah data for Fakultas 3 (FHISIP) from UT Proxy (IA_YMX_KUDJQ)
    const liveRes = await fetchUtApi('IA_YMX_KUDJQ', { kodeFakultas: 3, limit: 200, page: 1 })

    let liveItems: KurikulumItem[] = []

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
        else if (prodiName.includes('Sosiologi')) prodiCode = 'SOSI'
        else if (prodiName.includes('Perpustakaan')) prodiCode = 'PUS'

        const bahanAjar = m.bahan_ajar && m.bahan_ajar.length > 0 ? m.bahan_ajar[0].kode_bahan_ajar : m.kode_matakuliah

        return {
          id: `kur-live-${idx}-${m.kode_matakuliah}`,
          kodeMk: m.kode_matakuliah,
          namaMk: m.nama_matakuliah,
          sks: parseInt(m.sks || '3', 10),
          semesterPenawaran: (idx % 8) + 1,
          prodiCode,
          prodiName,
          sifatMatkul: m.nama_matakuliah.includes('TAP') ? 'TAP' : m.nama_matakuliah.includes('KARYA ILMIAH') ? 'KARIL' : 'WAJIB',
          bahanAjarKode: `BMP ${bahanAjar}`,
          prasyaratKode: null,
          cplCpmk: `CPL FHISIP: Menguasai keahlian dan analisis komprehensif pada bidang ${prodiName}.`,
        }
      })
    }

    let filtered = liveItems

    if (prodi !== 'ALL') {
      filtered = filtered.filter((k) => k.prodiCode.toLowerCase() === prodi.toLowerCase())
    }
    if (query) {
      filtered = filtered.filter(
        (k) =>
          k.kodeMk.toLowerCase().includes(query) ||
          k.namaMk.toLowerCase().includes(query) ||
          k.prodiName.toLowerCase().includes(query) ||
          k.bahanAjarKode.toLowerCase().includes(query)
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
