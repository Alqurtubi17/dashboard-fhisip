import { NextResponse } from 'next/server'

export type OrganisasiItem = {
  id: string
  namaOrmawa: string
  singkatan: string
  kategori: 'BEM' | 'HIMA' | 'UKM'
  ketuaUmum: string
  nimKetua: string
  prodiKetua: string
  jumlahAnggota: number
  statusSk: string
}

const ORMAWA_DATASET: OrganisasiItem[] = [
  {
    id: 'orm-1',
    namaOrmawa: 'Badan Eksekutif Mahasiswa FHISIP UT',
    singkatan: 'BEM FHISIP UT',
    kategori: 'BEM',
    ketuaUmum: 'Bagus Pratama',
    nimKetua: '043812901',
    prodiKetua: 'S1 Ilmu Pemerintahan',
    jumlahAnggota: 145,
    statusSk: 'SK-DEKAN/FHISIP/2026/012',
  },
  {
    id: 'orm-2',
    namaOrmawa: 'Himpunan Mahasiswa Ilmu Hukum UT',
    singkatan: 'HIMA HKUM UT',
    kategori: 'HIMA',
    ketuaUmum: 'Ahmad Syahputra',
    nimKetua: '041289301',
    prodiKetua: 'S1 Ilmu Hukum',
    jumlahAnggota: 210,
    statusSk: 'SK-DEKAN/FHISIP/2026/015',
  },
  {
    id: 'orm-3',
    namaOrmawa: 'Himpunan Mahasiswa Ilmu Komunikasi',
    singkatan: 'HIMAKOM UT',
    kategori: 'HIMA',
    ketuaUmum: 'Rina Permata',
    nimKetua: '042910401',
    prodiKetua: 'S1 Ilmu Komunikasi',
    jumlahAnggota: 180,
    statusSk: 'SK-DEKAN/FHISIP/2026/018',
  },
]

export async function GET() {
  return NextResponse.json({
    success: true,
    data: ORMAWA_DATASET,
    total: ORMAWA_DATASET.length,
  })
}
