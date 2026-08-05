import { NextResponse } from 'next/server'

export type TapKarilItem = {
  id: string
  nim: string
  nama: string
  prodiCode: string
  prodiName: string
  judulKaril: string
  pembimbingKaril: string
  similarityIndex: number // percentage from Turnitin
  statusKaril: 'DRAFT' | 'DIREVISI' | 'DISETUJUI' | 'UNGGAH_UT'
  nilaiTAP: string | null // Grade (A, B, C, D, E or Belum Ujian)
  statusYudisium: 'MENUNGGU' | 'MEMENUHI_SYARAT' | 'DITERBITKAN_SK'
}

const TAP_KARIL_DATASET: TapKarilItem[] = [
  {
    id: 'tap-1',
    nim: '043812901',
    nama: 'Bagus Pratama',
    prodiCode: 'IPEM',
    prodiName: 'S1 Ilmu Pemerintahan',
    judulKaril: 'Analisis E-Government dan Kualitas Pelayanan Publik di Daerah Tertinggal',
    pembimbingKaril: 'Dr. Bambang Sutrisno, M.H',
    similarityIndex: 12,
    statusKaril: 'UNGGAH_UT',
    nilaiTAP: 'A',
    statusYudisium: 'MEMENUHI_SYARAT',
  },
  {
    id: 'tap-2',
    nim: '041289301',
    nama: 'Ahmad Syahputra',
    prodiCode: 'HKUM',
    prodiName: 'S1 Ilmu Hukum',
    judulKaril: 'Perlindungan Hukum Hak Cipta Kekayaan Intelektual pada Platform Digital',
    pembimbingKaril: 'Prof. Dr. Hendra Gunawan, S.H',
    similarityIndex: 14,
    statusKaril: 'UNGGAH_UT',
    nilaiTAP: 'A',
    statusYudisium: 'DITERBITKAN_SK',
  },
  {
    id: 'tap-3',
    nim: '042910401',
    nama: 'Rina Permata',
    prodiCode: 'IKOM',
    prodiName: 'S1 Ilmu Komunikasi',
    judulKaril: 'Strategi Komunikasi Pemasaran Digital UMKM Sektor Ekonomi Kreatif',
    pembimbingKaril: 'Prof. Sri Handayani, Ph.D',
    similarityIndex: 18,
    statusKaril: 'DISETUJUI',
    nilaiTAP: 'B+',
    statusYudisium: 'MENUNGGU',
  },
  {
    id: 'tap-4',
    nim: '044810201',
    nama: 'Eka Lestari',
    prodiCode: 'ADPU',
    prodiName: 'S1 Administrasi Publik',
    judulKaril: 'Evaluasi Implementasi Kebijakan Satu Data Indonesia di Tingkat Daerah',
    pembimbingKaril: 'Dr. Taufik Hidayat, M.Si',
    similarityIndex: 22,
    statusKaril: 'DIREVISI',
    nilaiTAP: 'B',
    statusYudisium: 'MENUNGGU',
  },
  {
    id: 'tap-5',
    nim: '045920101',
    nama: 'Maya Nurhaliza',
    prodiCode: 'ADBI',
    prodiName: 'S1 Administrasi Bisnis',
    judulKaril: 'Dampak Digitalisasi Rantai Pasok Terhadap Efisiensi Operasional Perusahaan',
    pembimbingKaril: 'Dr. Wahyu Triyono, M.AP',
    similarityIndex: 11,
    statusKaril: 'UNGGAH_UT',
    nilaiTAP: 'A',
    statusYudisium: 'MEMENUHI_SYARAT',
  },
]

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const prodi = searchParams.get('prodi') || 'ALL'
  const query = (searchParams.get('query') || '').toLowerCase().trim()

  let filtered = TAP_KARIL_DATASET

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
  })
}
