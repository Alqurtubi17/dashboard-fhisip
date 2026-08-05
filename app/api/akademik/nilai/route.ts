import { NextResponse } from 'next/server'

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

const NILAI_DATASET: NilaiItem[] = [
  {
    id: 'nil-1',
    nim: '043812901',
    nama: 'Bagus Pratama',
    prodiCode: 'IPEM',
    prodiName: 'S1 Ilmu Pemerintahan',
    kodeMk: 'IPEM4317',
    namaMk: 'Sistem Pemerintahan Daerah',
    sks: 3,
    masa: '20261',
    tugasTuton: 88,
    diskusiTuton: 90,
    nilaiUas: 82,
    nilaiAkhir: 85,
    hurufMutu: 'A',
    statusPublikasi: 'TERBIT',
  },
  {
    id: 'nil-2',
    nim: '041289301',
    nama: 'Ahmad Syahputra',
    prodiCode: 'HKUM',
    prodiName: 'S1 Ilmu Hukum',
    kodeMk: 'HKUM4201',
    namaMk: 'Hukum Tata Negara',
    sks: 4,
    masa: '20261',
    tugasTuton: 92,
    diskusiTuton: 95,
    nilaiUas: 88,
    nilaiAkhir: 90,
    hurufMutu: 'A',
    statusPublikasi: 'TERBIT',
  },
  {
    id: 'nil-3',
    nim: '042910401',
    nama: 'Rina Permata',
    prodiCode: 'IKOM',
    prodiName: 'S1 Ilmu Komunikasi',
    kodeMk: 'SKOM4315',
    namaMk: 'Komunikasi Massa',
    sks: 3,
    masa: '20261',
    tugasTuton: 85,
    diskusiTuton: 84,
    nilaiUas: 78,
    nilaiAkhir: 81,
    hurufMutu: 'B+',
    statusPublikasi: 'TERBIT',
  },
  {
    id: 'nil-4',
    nim: '044810201',
    nama: 'Eka Lestari',
    prodiCode: 'ADPU',
    prodiName: 'S1 Administrasi Publik',
    kodeMk: 'ADPU4330',
    namaMk: 'Kebijakan Publik',
    sks: 3,
    masa: '20261',
    tugasTuton: 80,
    diskusiTuton: 82,
    nilaiUas: 75,
    nilaiAkhir: 78,
    hurufMutu: 'B',
    statusPublikasi: 'TERBIT',
  },
  {
    id: 'nil-5',
    nim: '045920101',
    nama: 'Maya Nurhaliza',
    prodiCode: 'ADBI',
    prodiName: 'S1 Administrasi Bisnis',
    kodeMk: 'ADBI4432',
    namaMk: 'Bisnis Internasional',
    sks: 3,
    masa: '20261',
    tugasTuton: 90,
    diskusiTuton: 88,
    nilaiUas: 86,
    nilaiAkhir: 87,
    hurufMutu: 'A',
    statusPublikasi: 'TERBIT',
  },
  {
    id: 'nil-6',
    nim: '046030201',
    nama: 'Agus Setiawan',
    prodiCode: 'SOSI',
    prodiName: 'S1 Sosiologi',
    kodeMk: 'SOSI4205',
    namaMk: 'Sosiologi Pedesaan',
    sks: 3,
    masa: '20261',
    tugasTuton: 75,
    diskusiTuton: 78,
    nilaiUas: 70,
    nilaiAkhir: 73,
    hurufMutu: 'B',
    statusPublikasi: 'DIPROSES',
  },
]

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const prodi = searchParams.get('prodi') || 'ALL'
  const masa = searchParams.get('masa') || 'ALL'
  const query = (searchParams.get('query') || '').toLowerCase().trim()

  let filtered = NILAI_DATASET

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
  })
}
