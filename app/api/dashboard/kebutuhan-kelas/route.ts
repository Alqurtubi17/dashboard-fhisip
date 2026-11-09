import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import fhisipPrediksiData from '@/data/fhisip-prediksi-kelas.json'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export type KebutuhanKelasItem = {
  id: string
  masa: string
  kodeMatkul: string
  namaMatkul: string
  sks: number
  prodiCode: string
  prodiName: string
  semester?: number
  sipasNonTtm: number
  nonSipas: number
  ttmSipas: number
  tutonSipas: number
  jumlahTTM: number
  jumlahTuton: number
  totalMahasiswa: number
  kebutuhanKelas: number // Math.ceil(totalMahasiswa / 50)
  kebutuhanTutorMin: number // Math.ceil(kebutuhanKelas / 4)
  // Comparison fields when compareMasa is active
  deltaMahasiswa?: number
  deltaKelas?: number
  deltaTutor?: number
}

function getSemesterFromCourse(kodeMatkul: string): number {
  const match = kodeMatkul.match(/[A-Z]{3,4}(\d)(\d)/i)
  if (match && match[2]) {
    const sem = parseInt(match[2], 10)
    if (!isNaN(sem) && sem >= 1 && sem <= 8) return sem
  }
  return 1
}

export async function GET(request: Request) {
  try {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

    const { searchParams } = new URL(request.url)
    const masa = searchParams.get('masa') || '20261'
    const compareMasa = searchParams.get('compareMasa') || ''
    const prodiFilter = searchParams.get('prodi') || 'ALL'
    const semesterFilter = (searchParams.get('semester') || 'ALL').trim().toUpperCase()
    const query = (searchParams.get('query') || '').toLowerCase().trim()
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') || '10', 10)

    let items: KebutuhanKelasItem[] = []
    let compareMap = new Map<string, KebutuhanKelasItem>()

    // Fetch primary masa records from PostgreSQL
    try {
      const dbItems = await (prisma as any).prediksiKelas.findMany({
        where: {
          masa,
          ...(prodiFilter !== 'ALL' ? { prodiCode: { equals: prodiFilter, mode: 'insensitive' } } : {}),
        },
        orderBy: { kodeMatkul: 'asc' },
      })
      if (dbItems && dbItems.length > 0) {
        items = dbItems
      }

      // Fetch comparison masa records if requested
      if (compareMasa && compareMasa !== masa) {
        const compareItems = await (prisma as any).prediksiKelas.findMany({
          where: { masa: compareMasa },
        })
        if (compareItems && compareItems.length > 0) {
          compareItems.forEach((c: KebutuhanKelasItem) => compareMap.set(c.kodeMatkul, c))
        }
      }
    } catch {}

    // Fallback to JSON dataset ONLY for authentic masa 20261 if DB table is initializing
    if (items.length === 0 && masa === '20261') {
      items = (fhisipPrediksiData as any[]).map((item) => ({ ...item, masa: '20261' }))
      if (prodiFilter !== 'ALL') {
        items = items.filter((i) => i.prodiCode.toLowerCase() === prodiFilter.toLowerCase())
      }
    }

    // Attach comparison deltas if comparing
    if (compareMasa && compareMasa !== masa) {
      items = items.map((item) => {
        const compareObj = compareMap.get(item.kodeMatkul)
        if (compareObj) {
          return {
            ...item,
            deltaMahasiswa: item.totalMahasiswa - compareObj.totalMahasiswa,
            deltaKelas: item.kebutuhanKelas - compareObj.kebutuhanKelas,
            deltaTutor: item.kebutuhanTutorMin - compareObj.kebutuhanTutorMin,
          }
        }
        return item
      })
    }

    // Search query filter
    if (query) {
      items = items.filter(
        (i) =>
          i.kodeMatkul.toLowerCase().includes(query) ||
          i.namaMatkul.toLowerCase().includes(query) ||
          i.prodiName.toLowerCase().includes(query)
      )
    }

    // Attach semester to each item
    items = items.map((i) => ({
      ...i,
      semester: i.semester || getSemesterFromCourse(i.kodeMatkul),
    }))

    // Semester filter (GANJIL, GENAP, or specific 1-8)
    if (semesterFilter !== 'ALL') {
      items = items.filter((item) => {
        const sem = item.semester || getSemesterFromCourse(item.kodeMatkul)
        if (semesterFilter === 'GANJIL') return sem % 2 !== 0
        if (semesterFilter === 'GENAP') return sem % 2 === 0
        const parsedSem = parseInt(semesterFilter, 10)
        return !isNaN(parsedSem) ? sem === parsedSem : true
      })
    }

    const totalItems = items.length
    const totalPages = Math.ceil(totalItems / pageSize) || 1
    const startIndex = (page - 1) * pageSize
    const paginatedItems = items.slice(startIndex, startIndex + pageSize)

    // Summary calculations
    const totalMahasiswaAll = items.reduce((acc, item) => acc + item.totalMahasiswa, 0)
    const totalKebutuhanKelasAll = items.reduce((acc, item) => acc + item.kebutuhanKelas, 0)
    const totalKebutuhanTutorMinAll = items.reduce((acc, item) => acc + item.kebutuhanTutorMin, 0)

    const totalDeltaMahasiswa = items.reduce((acc, item) => acc + (item.deltaMahasiswa || 0), 0)
    const totalDeltaKelas = items.reduce((acc, item) => acc + (item.deltaKelas || 0), 0)
    const totalDeltaTutor = items.reduce((acc, item) => acc + (item.deltaTutor || 0), 0)

    return NextResponse.json({
      success: true,
      data: {
        items: paginatedItems,
        totalItems,
        totalPages,
        currentPage: page,
        pageSize,
        summary: {
          masa,
          compareMasa: compareMasa || null,
          totalMatkul: totalItems,
          totalMahasiswa: totalMahasiswaAll,
          totalKebutuhanKelas: totalKebutuhanKelasAll,
          totalKebutuhanTutorMin: totalKebutuhanTutorMinAll,
          totalDeltaMahasiswa,
          totalDeltaKelas,
          totalDeltaTutor,
          rasioKuota: '50 Mhs/Kelas',
          rasioTutor: 'Max 4 Kelas/Tutor',
          sourceApi: 'PostgreSQL Database & SRS UT API',
        },
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
