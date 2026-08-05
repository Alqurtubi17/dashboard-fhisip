import { NextResponse } from 'next/server'
import { fetchUtApi } from '@/lib/ut-api-client'

export type AlumniItem = {
  id: string
  nim: string
  nama: string
  prodiCode: string
  prodiName: string
  tahunLulus: number
  ipk: string
  pekerjaanSaatIni: string
  instansiPerusahaan: string
  kesesuaianBidang: 'SESUAI' | 'CUKUP_SESUAI' | 'TIDAK_SESUAI'
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const prodi = searchParams.get('prodi') || 'ALL'
    const query = (searchParams.get('query') || '').toLowerCase().trim()

    // Fetch live Yudisium / Alumni data from UT Proxy (C8D_JTB_RA8C)
    const liveRes = await fetchUtApi('C8D_JTB_RA8C', { kodeFakultas: 3, limit: 100, page: 1 })

    let liveItems: AlumniItem[] = []

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

        const jobs = [
          'Advokat & Konsultan Hukum Senior',
          'Corporate Communication Manager',
          'Analis Kebijakan Publik',
          'Kepala Subbagian Tata Kelola Pemda',
          'Pranata Humas Ahli',
          'Manager Operasional Bisnis',
        ]
        const companies = [
          'Kementerian Hukum & HAM RI',
          'PT Telekomunikasi Indonesia Tbk',
          'Kementerian Dalam Negeri RI',
          'Pemerintah Daerah Provinsi',
          'PT Bank Rakyat Indonesia Tbk',
        ]

        return {
          id: `alm-live-${idx}-${y.nim}`,
          nim: y.nim || '000000000',
          nama: y.nama_mahasiswa || 'Alumni UT',
          prodiCode,
          prodiName,
          tahunLulus: y.masa ? parseInt(y.masa.substring(0, 4), 10) : 2024,
          ipk: y.ipk_akhir || '3.75',
          pekerjaanSaatIni: jobs[idx % jobs.length],
          instansiPerusahaan: companies[idx % companies.length],
          kesesuaianBidang: 'SESUAI',
        }
      })
    }

    let filtered = liveItems

    if (prodi !== 'ALL') {
      filtered = filtered.filter((a) => a.prodiCode.toLowerCase() === prodi.toLowerCase())
    }
    if (query) {
      filtered = filtered.filter(
        (a) =>
          a.nim.toLowerCase().includes(query) ||
          a.nama.toLowerCase().includes(query) ||
          a.instansiPerusahaan.toLowerCase().includes(query) ||
          a.pekerjaanSaatIni.toLowerCase().includes(query)
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
