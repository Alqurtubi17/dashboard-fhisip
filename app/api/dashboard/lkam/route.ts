import { NextResponse } from 'next/server'

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

const LKAM_DATASET: LkamItem[] = [
  {
    id: 'lkam-ipem-1',
    nim: '043812901',
    name: 'Bagus Pratama',
    prodiCode: 'IPEM',
    prodiName: 'S1 Ilmu Pemerintahan',
    totalSksKurikulum: 144,
    sksDibebaskan: 54,
    sisaSksWajib: 90,
    matkulDibebaskanCount: 18,
    ipkAlihKredit: '3.75',
    status: 'LKAM Terbit / SK Disetujui',
    tanggalSk: '2026-07-25',
    noSk: 'SK-RPL/FHISIP/2026/0412',
  },
  {
    id: 'lkam-ipem-2',
    nim: '043812902',
    name: 'Siti Rahmawati',
    prodiCode: 'IPEM',
    prodiName: 'S1 Ilmu Pemerintahan',
    totalSksKurikulum: 144,
    sksDibebaskan: 48,
    sisaSksWajib: 96,
    matkulDibebaskanCount: 16,
    ipkAlihKredit: '3.65',
    status: 'LKAM Terbit / SK Disetujui',
    tanggalSk: '2026-07-24',
    noSk: 'SK-RPL/FHISIP/2026/0415',
  },
  {
    id: 'lkam-ipem-3',
    nim: '043812903',
    name: 'Dedi Kurniawan',
    prodiCode: 'IPEM',
    prodiName: 'S1 Ilmu Pemerintahan',
    totalSksKurikulum: 144,
    sksDibebaskan: 36,
    sisaSksWajib: 108,
    matkulDibebaskanCount: 12,
    ipkAlihKredit: '3.50',
    status: 'Asesmen Pembebasan Selesai',
    tanggalSk: '2026-07-22',
    noSk: 'SK-RPL/FHISIP/2026/0398',
  },
  {
    id: 'lkam-ipem-4',
    nim: '043812904',
    name: 'Fitri Handayani',
    prodiCode: 'IPEM',
    prodiName: 'S1 Ilmu Pemerintahan',
    totalSksKurikulum: 144,
    sksDibebaskan: 60,
    sisaSksWajib: 84,
    matkulDibebaskanCount: 20,
    ipkAlihKredit: '3.85',
    status: 'LKAM Terbit / SK Disetujui',
    tanggalSk: '2026-07-20',
    noSk: 'SK-RPL/FHISIP/2026/0380',
  },
  {
    id: 'lkam-ipem-5',
    nim: '043812905',
    name: 'Rudi Hermawan',
    prodiCode: 'IPEM',
    prodiName: 'S1 Ilmu Pemerintahan',
    totalSksKurikulum: 144,
    sksDibebaskan: 42,
    sisaSksWajib: 102,
    matkulDibebaskanCount: 14,
    ipkAlihKredit: '3.60',
    status: 'Asesmen Pembebasan Selesai',
    tanggalSk: '2026-07-18',
    noSk: 'SK-RPL/FHISIP/2026/0365',
  },

  // S1 Ilmu Hukum (HKUM)
  {
    id: 'lkam-hkum-1',
    nim: '041289301',
    name: 'Ahmad Syahputra',
    prodiCode: 'HKUM',
    prodiName: 'S1 Ilmu Hukum',
    totalSksKurikulum: 145,
    sksDibebaskan: 64,
    sisaSksWajib: 81,
    matkulDibebaskanCount: 21,
    ipkAlihKredit: '3.90',
    status: 'LKAM Terbit / SK Disetujui',
    tanggalSk: '2026-07-26',
    noSk: 'SK-RPL/FHISIP/2026/0430',
  },
  {
    id: 'lkam-hkum-2',
    nim: '041289302',
    name: 'Dewi Sartika',
    prodiCode: 'HKUM',
    prodiName: 'S1 Ilmu Hukum',
    totalSksKurikulum: 145,
    sksDibebaskan: 52,
    sisaSksWajib: 93,
    matkulDibebaskanCount: 17,
    ipkAlihKredit: '3.70',
    status: 'LKAM Terbit / SK Disetujui',
    tanggalSk: '2026-07-23',
    noSk: 'SK-RPL/FHISIP/2026/0408',
  },
  {
    id: 'lkam-hkum-3',
    nim: '041289303',
    name: 'Budi Santoso',
    prodiCode: 'HKUM',
    prodiName: 'S1 Ilmu Hukum',
    totalSksKurikulum: 145,
    sksDibebaskan: 38,
    sisaSksWajib: 107,
    matkulDibebaskanCount: 13,
    ipkAlihKredit: '3.55',
    status: 'Asesmen Pembebasan Selesai',
    tanggalSk: '2026-07-19',
    noSk: 'SK-RPL/FHISIP/2026/0372',
  },

  // S1 Ilmu Komunikasi (IKOM)
  {
    id: 'lkam-ikom-1',
    nim: '042910401',
    name: 'Rina Permata',
    prodiCode: 'IKOM',
    prodiName: 'S1 Ilmu Komunikasi',
    totalSksKurikulum: 144,
    sksDibebaskan: 44,
    sisaSksWajib: 100,
    matkulDibebaskanCount: 15,
    ipkAlihKredit: '3.68',
    status: 'LKAM Terbit / SK Disetujui',
    tanggalSk: '2026-07-24',
    noSk: 'SK-RPL/FHISIP/2026/0418',
  },
  {
    id: 'lkam-ikom-2',
    nim: '042910402',
    name: 'Fikri Ardiansyah',
    prodiCode: 'IKOM',
    prodiName: 'S1 Ilmu Komunikasi',
    totalSksKurikulum: 144,
    sksDibebaskan: 32,
    sisaSksWajib: 112,
    matkulDibebaskanCount: 10,
    ipkAlihKredit: '3.45',
    status: 'Asesmen Pembebasan Selesai',
    tanggalSk: '2026-07-21',
    noSk: 'SK-RPL/FHISIP/2026/0391',
  },

  // S1 Administrasi Publik (ADPU)
  {
    id: 'lkam-adpu-1',
    nim: '044810201',
    name: 'Eka Lestari',
    prodiCode: 'ADPU',
    prodiName: 'S1 Administrasi Publik',
    totalSksKurikulum: 144,
    sksDibebaskan: 50,
    sisaSksWajib: 94,
    matkulDibebaskanCount: 16,
    ipkAlihKredit: '3.72',
    status: 'LKAM Terbit / SK Disetujui',
    tanggalSk: '2026-07-25',
    noSk: 'SK-RPL/FHISIP/2026/0425',
  },
  {
    id: 'lkam-adpu-2',
    nim: '044810202',
    name: 'Hendrik Wijaya',
    prodiCode: 'ADPU',
    prodiName: 'S1 Administrasi Publik',
    totalSksKurikulum: 144,
    sksDibebaskan: 40,
    sisaSksWajib: 104,
    matkulDibebaskanCount: 13,
    ipkAlihKredit: '3.58',
    status: 'LKAM Terbit / SK Disetujui',
    tanggalSk: '2026-07-17',
    noSk: 'SK-RPL/FHISIP/2026/0355',
  },

  // S1 Administrasi Bisnis (ADBI)
  {
    id: 'lkam-adbi-1',
    nim: '045920101',
    name: 'Maya Nurhaliza',
    prodiCode: 'ADBI',
    prodiName: 'S1 Administrasi Bisnis',
    totalSksKurikulum: 144,
    sksDibebaskan: 56,
    sisaSksWajib: 88,
    matkulDibebaskanCount: 18,
    ipkAlihKredit: '3.80',
    status: 'LKAM Terbit / SK Disetujui',
    tanggalSk: '2026-07-22',
    noSk: 'SK-RPL/FHISIP/2026/0401',
  },

  // S1 Sosiologi (SOSI)
  {
    id: 'lkam-sosi-1',
    nim: '046030201',
    name: 'Agus Setiawan',
    prodiCode: 'SOSI',
    prodiName: 'S1 Sosiologi',
    totalSksKurikulum: 144,
    sksDibebaskan: 34,
    sisaSksWajib: 110,
    matkulDibebaskanCount: 11,
    ipkAlihKredit: '3.50',
    status: 'Asesmen Pembebasan Selesai',
    tanggalSk: '2026-07-16',
    noSk: 'SK-RPL/FHISIP/2026/0348',
  },

  // S1 Sastra Inggris (SING)
  {
    id: 'lkam-sing-1',
    nim: '047140301',
    name: 'Nadia Safitri',
    prodiCode: 'SING',
    prodiName: 'S1 Sastra Inggris',
    totalSksKurikulum: 144,
    sksDibebaskan: 28,
    sisaSksWajib: 116,
    matkulDibebaskanCount: 9,
    ipkAlihKredit: '3.40',
    status: 'LKAM Terbit / SK Disetujui',
    tanggalSk: '2026-07-15',
    noSk: 'SK-RPL/FHISIP/2026/0340',
  },

  // S1 Ilmu Perpustakaan (PUS)
  {
    id: 'lkam-pus-1',
    nim: '048250401',
    name: 'Taufik Hidayat',
    prodiCode: 'PUS',
    prodiName: 'S1 Ilmu Perpustakaan',
    totalSksKurikulum: 144,
    sksDibebaskan: 46,
    sisaSksWajib: 98,
    matkulDibebaskanCount: 15,
    ipkAlihKredit: '3.66',
    status: 'LKAM Terbit / SK Disetujui',
    tanggalSk: '2026-07-21',
    noSk: 'SK-RPL/FHISIP/2026/0395',
  },

  // S1 Perpajakan (PAJAK)
  {
    id: 'lkam-pajak-1',
    nim: '049360501',
    name: 'Lia Anggraini',
    prodiCode: 'PAJAK',
    prodiName: 'S1 Perpajakan',
    totalSksKurikulum: 144,
    sksDibebaskan: 30,
    sisaSksWajib: 114,
    matkulDibebaskanCount: 10,
    ipkAlihKredit: '3.42',
    status: 'Asesmen Pembebasan Selesai',
    tanggalSk: '2026-07-14',
    noSk: 'SK-RPL/FHISIP/2026/0335',
  },
]

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const prodi = searchParams.get('prodi') || 'ALL'
    const query = (searchParams.get('query') || '').toLowerCase().trim()
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') || '5', 10)

    let filtered = LKAM_DATASET

    // Filter by prodi
    if (prodi !== 'ALL') {
      filtered = filtered.filter((i) => i.prodiCode.toLowerCase() === prodi.toLowerCase())
    }

    // Filter by search query (NIM or Name or status or noSk)
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
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
