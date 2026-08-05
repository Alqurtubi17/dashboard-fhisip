import { NextResponse } from 'next/server'

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

const ALUMNI_DATASET: AlumniItem[] = [
  {
    id: 'alm-1',
    nim: '031049281',
    nama: 'Dr. Hendra Gunawan, S.H., M.H',
    prodiCode: 'HKUM',
    prodiName: 'S1 Ilmu Hukum',
    tahunLulus: 2022,
    ipk: '3.92',
    pekerjaanSaatIni: 'Advokat & Konsultan Hukum Senior',
    instansiPerusahaan: 'Gunawan & Partners Law Firm',
    kesesuaianBidang: 'SESUAI',
  },
  {
    id: 'alm-2',
    nim: '032918231',
    nama: 'Kiki Amalia, S.I.Kom',
    prodiCode: 'IKOM',
    prodiName: 'S1 Ilmu Komunikasi',
    tahunLulus: 2023,
    ipk: '3.85',
    pekerjaanSaatIni: 'Corporate Communication Manager',
    instansiPerusahaan: 'PT Telekomunikasi Indonesia Tbk',
    kesesuaianBidang: 'SESUAI',
  },
  {
    id: 'alm-3',
    nim: '033819284',
    nama: 'Surya Abidin, S.AP',
    prodiCode: 'ADPU',
    prodiName: 'S1 Administrasi Publik',
    tahunLulus: 2023,
    ipk: '3.78',
    pekerjaanSaatIni: 'Analis Kebijakan Ahli Muda',
    instansiPerusahaan: 'Kementerian Dalam Negeri RI',
    kesesuaianBidang: 'SESUAI',
  },
]

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const prodi = searchParams.get('prodi') || 'ALL'
  const query = (searchParams.get('query') || '').toLowerCase().trim()

  let filtered = ALUMNI_DATASET

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
  })
}
