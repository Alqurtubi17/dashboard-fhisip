import { NextResponse } from 'next/server'

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

const KURIKULUM_DATASET: KurikulumItem[] = [
  {
    id: 'kur-1',
    kodeMk: 'HKUM4201',
    namaMk: 'Hukum Tata Negara',
    sks: 4,
    semesterPenawaran: 2,
    prodiCode: 'HKUM',
    prodiName: 'S1 Ilmu Hukum',
    sifatMatkul: 'WAJIB',
    bahanAjarKode: 'BMP HKUM4201 (Modul 1-9)',
    prasyaratKode: 'MKDU4111',
    cplCpmk: 'CPL-1: Mampu menganalisis norma dan struktur hukum konstitusi Indonesia.',
  },
  {
    id: 'kur-2',
    kodeMk: 'SKOM4315',
    namaMk: 'Komunikasi Massa',
    sks: 3,
    semesterPenawaran: 3,
    prodiCode: 'IKOM',
    prodiName: 'S1 Ilmu Komunikasi',
    sifatMatkul: 'WAJIB',
    bahanAjarKode: 'BMP SKOM4315 (Modul 1-6)',
    prasyaratKode: 'SKOM4101',
    cplCpmk: 'CPL-2: Menguasai prinsip dan dampak media komunikasi massa modern.',
  },
  {
    id: 'kur-3',
    kodeMk: 'ADPU4330',
    namaMk: 'Kebijakan Publik',
    sks: 3,
    semesterPenawaran: 4,
    prodiCode: 'ADPU',
    prodiName: 'S1 Administrasi Publik',
    sifatMatkul: 'WAJIB',
    bahanAjarKode: 'BMP ADPU4330 (Modul 1-9)',
    prasyaratKode: null,
    cplCpmk: 'CPL-3: Mampu mendesain dan mengedukasi pembuatan kebijakan publik.',
  },
  {
    id: 'kur-4',
    kodeMk: 'IPEM4317',
    namaMk: 'Sistem Pemerintahan Daerah',
    sks: 3,
    semesterPenawaran: 5,
    prodiCode: 'IPEM',
    prodiName: 'S1 Ilmu Pemerintahan',
    sifatMatkul: 'WAJIB',
    bahanAjarKode: 'BMP IPEM4317 (Modul 1-9)',
    prasyaratKode: 'IPEM4111',
    cplCpmk: 'CPL-1: Menguasai otonomi daerah & regulasi sistem tata kelola lokal.',
  },
  {
    id: 'kur-5',
    kodeMk: 'SOSI4500',
    namaMk: 'Tugas Akhir Program (TAP) Sosiologi',
    sks: 4,
    semesterPenawaran: 8,
    prodiCode: 'SOSI',
    prodiName: 'S1 Sosiologi',
    sifatMatkul: 'TAP',
    bahanAjarKode: 'Panduan TAP SOSI4500',
    prasyaratKode: 'Lulus Min 110 SKS',
    cplCpmk: 'CPL-5: Evaluasi komprehensif teori dan metode riset sosiologi.',
  },
  {
    id: 'kur-6',
    kodeMk: 'HKUM4560',
    namaMk: 'Karya Ilmiah (Karil) Hukum',
    sks: 0,
    semesterPenawaran: 8,
    prodiCode: 'HKUM',
    prodiName: 'S1 Ilmu Hukum',
    sifatMatkul: 'KARIL',
    bahanAjarKode: 'Panduan Karya Ilmiah UT',
    prasyaratKode: 'HKUM4312',
    cplCpmk: 'CPL-4: Menyusun naskah ilmiah berbasis hasil riset hukum berstandar publikasi.',
  },
]

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const prodi = searchParams.get('prodi') || 'ALL'
  const query = (searchParams.get('query') || '').toLowerCase().trim()

  let filtered = KURIKULUM_DATASET

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
  })
}
