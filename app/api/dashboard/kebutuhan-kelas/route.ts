import { NextResponse } from 'next/server'
import fhisipPrediksiData from '@/data/fhisip-prediksi-kelas.json'

export type KebutuhanKelasItem = {
  id: string
  kodeMatkul: string
  namaMatkul: string
  sks: number
  prodiCode: string
  prodiName: string
  sipasNonTtm: number
  nonSipas: number
  ttmSipas: number
  tutonSipas: number
  jumlahTTM: number
  jumlahTuton: number
  totalMahasiswa: number
  kebutuhanKelas: number // Math.ceil(totalMahasiswa / 50)
  kebutuhanTutorMin: number // Math.ceil(kebutuhanKelas / 4)
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const prodiFilter = searchParams.get('prodi') || 'ALL'
    const query = (searchParams.get('query') || '').toLowerCase().trim()
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') || '10', 10)

    let filtered: KebutuhanKelasItem[] = fhisipPrediksiData as KebutuhanKelasItem[]

    // Filter by prodi
    if (prodiFilter !== 'ALL') {
      filtered = filtered.filter((i) => i.prodiCode.toLowerCase() === prodiFilter.toLowerCase())
    }

    // Filter by search query (kodeMatkul or namaMatkul or prodiName)
    if (query) {
      filtered = filtered.filter(
        (i) =>
          i.kodeMatkul.toLowerCase().includes(query) ||
          i.namaMatkul.toLowerCase().includes(query) ||
          i.prodiName.toLowerCase().includes(query)
      )
    }

    const totalItems = filtered.length
    const totalPages = Math.ceil(totalItems / pageSize) || 1
    const startIndex = (page - 1) * pageSize
    const paginatedItems = filtered.slice(startIndex, startIndex + pageSize)

    // Summary calculation based on filtered courses
    const totalMahasiswaAll = filtered.reduce((acc, item) => acc + item.totalMahasiswa, 0)
    const totalKebutuhanKelasAll = filtered.reduce((acc, item) => acc + item.kebutuhanKelas, 0)
    const totalKebutuhanTutorMinAll = filtered.reduce((acc, item) => acc + item.kebutuhanTutorMin, 0)

    return NextResponse.json({
      success: true,
      data: {
        items: paginatedItems,
        totalItems,
        totalPages,
        currentPage: page,
        pageSize,
        summary: {
          totalMatkul: totalItems,
          totalMahasiswa: totalMahasiswaAll,
          totalKebutuhanKelas: totalKebutuhanKelasAll,
          totalKebutuhanTutorMin: totalKebutuhanTutorMinAll,
          rasioKuota: '50 Mhs/Kelas',
          rasioTutor: 'Max 4 Kelas/Tutor',
        },
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
