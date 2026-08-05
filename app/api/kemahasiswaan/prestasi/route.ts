import { NextResponse } from 'next/server'

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

const PRESTASI_DATASET: PrestasiItem[] = [
  {
    id: 'pres-1',
    nim: '043812901',
    nama: 'Bagus Pratama',
    prodiCode: 'IPEM',
    prodiName: 'S1 Ilmu Pemerintahan',
    namaKegiatan: 'Kompetisi Debat Kebijakan Publik Nasional (KDKPN) 2026',
    kategori: 'AKADEMIK',
    tingkat: 'NASIONAL',
    peringkat: 'Juara 1 Utama',
    tahun: 2026,
    simkatmawaStatus: 'TERVERIFIKASI',
  },
  {
    id: 'pres-2',
    nim: '041289301',
    nama: 'Ahmad Syahputra',
    prodiCode: 'HKUM',
    prodiName: 'S1 Ilmu Hukum',
    namaKegiatan: 'National Moot Court Competition (NMCC) Constitutional Law',
    kategori: 'AKADEMIK',
    tingkat: 'NASIONAL',
    peringkat: 'Juara 2 & Best Speaker',
    tahun: 2025,
    simkatmawaStatus: 'TERVERIFIKASI',
  },
  {
    id: 'pres-3',
    nim: '042910401',
    nama: 'Rina Permata',
    prodiCode: 'IKOM',
    prodiName: 'S1 Ilmu Komunikasi',
    namaKegiatan: 'International Short Film & Broadcast Festival 2025',
    kategori: 'NON_AKADEMIK',
    tingkat: 'INTERNASIONAL',
    peringkat: 'Juara 1 Best Documentary',
    tahun: 2025,
    simkatmawaStatus: 'TERVERIFIKASI',
  },
]

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const prodi = searchParams.get('prodi') || 'ALL'
  const query = (searchParams.get('query') || '').toLowerCase().trim()

  let filtered = PRESTASI_DATASET

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
  })
}
