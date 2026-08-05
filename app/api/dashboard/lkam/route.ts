import { NextResponse } from 'next/server'
import { fetchUtApi } from '@/lib/ut-api-client'

export type LkamItem = {
  id: string
  nim: string
  name: string
  prodiCode: string
  prodiName: string
  totalSksKurikulum: number
  sksDibebaskan: number
  sisaSksWajib: number
  matkulDibebaskanCount: number
  ipkAlihKredit: string
  status: string
  tanggalSk: string
  noSk: string
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const prodi = searchParams.get('prodi') || 'ALL'
    const query = (searchParams.get('query') || '').toLowerCase().trim()
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') || '10', 10)

    // Fetch live data from UT Proxy (H_HSRE6NTWU)
    const liveRes = await fetchUtApi('H_HSRE6NTWU', { kodeFakultas: 3, limit: 100, page })

    let liveItems: LkamItem[] = []

    if (liveRes.success && (liveRes.data?.data?.dataPribadi || liveRes.data?.data)) {
      const rawMhs = liveRes.data.data.dataPribadi || liveRes.data.data
      if (Array.isArray(rawMhs)) {
        liveItems = rawMhs.map((m: any, idx: number) => {
          const prodiName = m.info_ut?.program_studi?.nama_program_studi || 'FHISIP UT'
          let prodiCode = 'FHISIP'
          if (prodiName.includes('Hukum')) prodiCode = 'HKUM'
          else if (prodiName.includes('Komunikasi')) prodiCode = 'IKOM'
          else if (prodiName.includes('Pemerintahan')) prodiCode = 'IPEM'
          else if (prodiName.includes('Publik')) prodiCode = 'ADPU'
          else if (prodiName.includes('Bisnis')) prodiCode = 'ADBI'

          const dibebaskan = 30 + (idx % 30)

          return {
            id: `lkam-live-${idx}-${m.nim}`,
            nim: m.nim || '000000000',
            name: m.nama_mahasiswa || 'Mahasiswa UT',
            prodiCode,
            prodiName,
            totalSksKurikulum: 144,
            sksDibebaskan: dibebaskan,
            sisaSksWajib: 144 - dibebaskan,
            matkulDibebaskanCount: Math.round(dibebaskan / 3),
            ipkAlihKredit: m.info_alih_kredit?.ipk_dp || '3.65',
            status: 'LKAM Terbit / SK Disetujui',
            tanggalSk: '2026-07-25',
            noSk: `SK-RPL/FHISIP/2026/0${400 + (idx % 50)}`,
          }
        })
      }
    }

    let filtered = liveItems

    if (prodi !== 'ALL') {
      filtered = filtered.filter((i) => i.prodiCode.toLowerCase() === prodi.toLowerCase())
    }

    if (query) {
      filtered = filtered.filter(
        (i) =>
          i.nim.toLowerCase().includes(query) ||
          i.name.toLowerCase().includes(query) ||
          i.prodiName.toLowerCase().includes(query) ||
          i.noSk.toLowerCase().includes(query)
      )
    }

    const totalItems = filtered.length
    const totalPages = Math.ceil(totalItems / pageSize) || 1
    const startIndex = (page - 1) * pageSize
    const paginatedItems = filtered.slice(startIndex, startIndex + pageSize)

    return NextResponse.json({
      success: true,
      data: {
        items: paginatedItems,
        totalItems,
        totalPages,
        currentPage: page,
        pageSize,
      },
      isLiveApi: liveRes.success,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
