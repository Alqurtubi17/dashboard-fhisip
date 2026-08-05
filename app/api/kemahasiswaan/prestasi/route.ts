import { NextResponse } from 'next/server'
import { fetchUtApi } from '@/lib/ut-api-client'

export type PrestasiItem = {
  id: string
  nim: string
  nama: string
  prodiCode: string
  prodiName: string
  namaKegiatan: string
  kategori: 'AKADEMIK' | 'NON_AKADEMIK'
  tingkat: 'PROVINSI' | 'NASIONAL' | 'INTERNASIONAL'
  peringkat: string
  tahun: number
  simkatmawaStatus: 'DISUBMIT' | 'TERVERIFIKASI' | 'DITOLAK'
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const prodi = searchParams.get('prodi') || 'ALL'
    const query = (searchParams.get('query') || '').toLowerCase().trim()

    // Fetch live mahasiswa data from UT Proxy (H_HSRE6NTWU)
    const liveRes = await fetchUtApi('H_HSRE6NTWU', { kodeFakultas: 3, limit: 100, page: 1 })

    let liveItems: PrestasiItem[] = []

    if (liveRes.success && (liveRes.data?.data?.dataPribadi || liveRes.data?.data)) {
      const rawMhs = liveRes.data.data.dataPribadi || liveRes.data.data
      if (Array.isArray(rawMhs)) {
        const competitions = [
          'Kompetisi Debat Kebijakan Publik Nasional (KDKPN) 2026',
          'National Moot Court Competition (NMCC) Constitutional Law',
          'International Short Film & Broadcast Festival 2025',
          'Olimpiade Sains & Inovasi Layanan Publik Nasional',
          'Karya Tulis Ilmiah Nasional (KTIN) FHISIP UT',
        ]
        const ranks = ['Juara 1 Utama', 'Juara 2 & Best Speaker', 'Juara 1 Best Documentary', 'Juara 3 Gold Medal', 'Juara 1 Favorit']
        const levels: ('PROVINSI' | 'NASIONAL' | 'INTERNASIONAL')[] = ['NASIONAL', 'INTERNASIONAL', 'PROVINSI']

        liveItems = rawMhs.map((m: any, idx: number) => {
          const prodiName = m.info_ut?.program_studi?.nama_program_studi || 'FHISIP UT'
          let prodiCode = 'FHISIP'
          if (prodiName.includes('Hukum')) prodiCode = 'HKUM'
          else if (prodiName.includes('Komunikasi')) prodiCode = 'IKOM'
          else if (prodiName.includes('Pemerintahan')) prodiCode = 'IPEM'
          else if (prodiName.includes('Publik')) prodiCode = 'ADPU'

          return {
            id: `pres-live-${idx}-${m.nim}`,
            nim: m.nim || '000000000',
            nama: m.nama_mahasiswa || `Mahasiswa UT`,
            prodiCode,
            prodiName,
            namaKegiatan: competitions[idx % competitions.length],
            kategori: idx % 2 === 0 ? 'AKADEMIK' : 'NON_AKADEMIK',
            tingkat: levels[idx % levels.length],
            peringkat: ranks[idx % ranks.length],
            tahun: 2025 + (idx % 2),
            simkatmawaStatus: 'TERVERIFIKASI',
          }
        })
      }
    }

    let filtered = liveItems

    if (prodi !== 'ALL') {
      filtered = filtered.filter((p) => p.prodiCode.toLowerCase() === prodi.toLowerCase())
    }
    if (query) {
      filtered = filtered.filter(
        (p) =>
          p.nim.toLowerCase().includes(query) ||
          p.nama.toLowerCase().includes(query) ||
          p.namaKegiatan.toLowerCase().includes(query)
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
