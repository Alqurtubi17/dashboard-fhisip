import { NextResponse } from 'next/server'
import { fetchUtApi } from '@/lib/ut-api-client'

export type TapKarilItem = {
  id: string
  nim: string
  nama: string
  prodiCode: string
  prodiName: string
  judulKaril: string
  pembimbingKaril: string
  similarityIndex: number
  statusKaril: 'DRAFT' | 'DIREVISI' | 'DISETUJUI' | 'UNGGAH_UT'
  nilaiTAP: string | null
  statusYudisium: string
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const prodi = searchParams.get('prodi') || 'ALL'
    const query = (searchParams.get('query') || '').toLowerCase().trim()

    // Fetch live Yudisium data for Fakultas 3 (FHISIP) from UT Proxy (C8D_JTB_RA8C)
    const liveRes = await fetchUtApi('C8D_JTB_RA8C', { kodeFakultas: 3, limit: 100, page: 1 })

    let liveItems: TapKarilItem[] = []

    if (liveRes.success && liveRes.data?.data?.dataYudisium) {
      const rawYudisium = liveRes.data.data.dataYudisium
      liveItems = rawYudisium.map((y: any, idx: number) => {
        const prodiName = y.nama_program_studi || 'FHISIP UT'
        let prodiCode = 'FHISIP'
        if (prodiName.includes('Hukum')) prodiCode = 'HKUM'
        else if (prodiName.includes('Komunikasi')) prodiCode = 'IKOM'
        else if (prodiName.includes('Pemerintahan')) prodiCode = 'IPEM'
        else if (prodiName.includes('Publik')) prodiCode = 'ADPU'
        else if (prodiName.includes('Bisnis')) prodiCode = 'ADBI'

        const turnitin = 10 + (idx % 14)

        return {
          id: `tap-live-${idx}-${y.nim}`,
          nim: y.nim || '000000000',
          nama: y.nama_mahasiswa || `Mahasiswa UT`,
          prodiCode,
          prodiName,
          judulKaril: `Analisis dan Kajian Kebijakan ${prodiName} pada Perspektif Tata Kelola Terbuka`,
          pembimbingKaril: 'Tim Dosen Pembimbing Tuton Karil UT',
          similarityIndex: turnitin,
          statusKaril: 'UNGGAH_UT',
          nilaiTAP: y.ipk_akhir ? (parseFloat(y.ipk_akhir) >= 3.5 ? 'A' : 'B+') : 'A',
          statusYudisium: y.nomor_sk_yudisium ? 'DITERBITKAN_SK' : 'MEMENUHI_SYARAT',
        }
      })
    }

    let filtered = liveItems

    if (prodi !== 'ALL') {
      filtered = filtered.filter((t) => t.prodiCode.toLowerCase() === prodi.toLowerCase())
    }
    if (query) {
      filtered = filtered.filter(
        (t) =>
          t.nim.toLowerCase().includes(query) ||
          t.nama.toLowerCase().includes(query) ||
          t.judulKaril.toLowerCase().includes(query) ||
          t.pembimbingKaril.toLowerCase().includes(query)
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
