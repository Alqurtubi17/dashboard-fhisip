import { NextResponse } from 'next/server'

export type RegistrasiItem = {
  id: string
  nim: string
  nama: string
  prodiCode: string
  prodiName: string
  masa: string
  noBilling: string
  totalSks: number
  nominalBilling: number
  statusBayar: 'LUNAS' | 'BELUM_BAYAR' | 'EXPIRED'
  tanggalRegistrasi: string
  metodeLayanan: 'SIPAS_FULL' | 'SIPAS_NON_TTM' | 'NON_SIPAS'
  matkulRegistered: Array<{ kode: string; nama: string; sks: number; layanan: string }>
}

const REGISTRASI_DATASET: RegistrasiItem[] = [
  {
    id: 'reg-1',
    nim: '043812901',
    nama: 'Bagus Pratama',
    prodiCode: 'IPEM',
    prodiName: 'S1 Ilmu Pemerintahan',
    masa: '20261',
    noBilling: '20261043812901001',
    totalSks: 18,
    nominalBilling: 1350000,
    statusBayar: 'LUNAS',
    tanggalRegistrasi: '2026-01-15',
    metodeLayanan: 'SIPAS_NON_TTM',
    matkulRegistered: [
      { kode: 'IPEM4317', nama: 'Sistem Pemerintahan Daerah', sks: 3, layanan: 'Tuton' },
      { kode: 'IPEM4425', nama: 'Kebijakan Keuangan Daerah', sks: 3, layanan: 'Tuton' },
      { kode: 'IPEM4320', nama: 'Manajemen Pelayanan Umum', sks: 3, layanan: 'Tuton' },
      { kode: 'MKDU4111', nama: 'Pendidikan Kewarganegaraan', sks: 3, layanan: 'Tuton' },
      { kode: 'IPEM4214', nama: 'Sistem Politik Indonesia', sks: 3, layanan: 'Tuton' },
      { kode: 'IPEM4309', nama: 'Metode Penelitian Sosial', sks: 3, layanan: 'Tuton' },
    ],
  },
  {
    id: 'reg-2',
    nim: '041289301',
    nama: 'Ahmad Syahputra',
    prodiCode: 'HKUM',
    prodiName: 'S1 Ilmu Hukum',
    masa: '20261',
    noBilling: '20261041289301002',
    totalSks: 20,
    nominalBilling: 1500000,
    statusBayar: 'LUNAS',
    tanggalRegistrasi: '2026-01-14',
    metodeLayanan: 'SIPAS_FULL',
    matkulRegistered: [
      { kode: 'HKUM4201', nama: 'Hukum Tata Negara', sks: 4, layanan: 'Tuweb' },
      { kode: 'HKUM4202', nama: 'Hukum Admin Negara', sks: 4, layanan: 'Tuweb' },
      { kode: 'HKUM4301', nama: 'Hukum Perdata', sks: 4, layanan: 'Tuweb' },
      { kode: 'HKUM4302', nama: 'Hukum Pidana', sks: 4, layanan: 'Tuweb' },
      { kode: 'HKUM4101', nama: 'Pengantar Ilmu Hukum', sks: 4, layanan: 'Tuweb' },
    ],
  },
  {
    id: 'reg-3',
    nim: '042910401',
    nama: 'Rina Permata',
    prodiCode: 'IKOM',
    prodiName: 'S1 Ilmu Komunikasi',
    masa: '20261',
    noBilling: '20261042910401003',
    totalSks: 15,
    nominalBilling: 1125000,
    statusBayar: 'BELUM_BAYAR',
    tanggalRegistrasi: '2026-01-20',
    metodeLayanan: 'NON_SIPAS',
    matkulRegistered: [
      { kode: 'SKOM4315', nama: 'Komunikasi Massa', sks: 3, layanan: 'Tuton' },
      { kode: 'SKOM4318', nama: 'Komunikasi Antar Budaya', sks: 3, layanan: 'Tuton' },
      { kode: 'SKOM4322', nama: 'Perkembangan Teknologi Komunikasi', sks: 3, layanan: 'Tuton' },
      { kode: 'SKOM4432', nama: 'Public Relations', sks: 3, layanan: 'Tuton' },
      { kode: 'SKOM4101', nama: 'Pengantar Ilmu Komunikasi', sks: 3, layanan: 'Tuton' },
    ],
  },
]

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const prodi = searchParams.get('prodi') || 'ALL'
  const query = (searchParams.get('query') || '').toLowerCase().trim()

  let filtered = REGISTRASI_DATASET

  if (prodi !== 'ALL') {
    filtered = filtered.filter((r) => r.prodiCode.toLowerCase() === prodi.toLowerCase())
  }
  if (query) {
    filtered = filtered.filter(
      (r) =>
        r.nim.toLowerCase().includes(query) ||
        r.nama.toLowerCase().includes(query) ||
        r.noBilling.toLowerCase().includes(query)
    )
  }

  return NextResponse.json({
    success: true,
    data: filtered,
    total: filtered.length,
  })
}
