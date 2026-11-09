import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const pageSize = Math.max(1, parseInt(searchParams.get('pageSize') || '10', 10))
    const prodi = searchParams.get('prodi') || 'ALL'
    const status = searchParams.get('status') || 'ALL'
    const semester = searchParams.get('semester') || 'ALL'
    const minIpk = searchParams.get('minIpk') || 'ALL'
    const search = (searchParams.get('search') || '').trim()

    const andConditions: any[] = []

    if (prodi !== 'ALL') {
      const pUpper = prodi.trim().toUpperCase()
      if (pUpper === 'HKUM' || pUpper === 'FSIH') {
        andConditions.push({
          OR: [
            { prodiCode: '311' },
            { prodiCode: 'FSIH' },
            { prodiCode: 'HKUM' },
            { prodi: { contains: 'Hukum', mode: 'insensitive' } },
          ],
        })
      } else if (pUpper === 'IKOM' || pUpper === 'FSIK') {
        andConditions.push({
          OR: [
            { prodiCode: '72' },
            { prodiCode: 'FSIK' },
            { prodiCode: 'IKOM' },
            { prodi: { contains: 'Komunikasi', mode: 'insensitive' } },
          ],
        })
      } else if (pUpper === 'ADPU' || pUpper === 'FSAP') {
        andConditions.push({
          OR: [
            { prodiCode: { in: ['50', '52', '86', 'FSAP', 'ADPU'] } },
            { prodi: { contains: 'Administrasi Negara', mode: 'insensitive' } },
            { prodi: { contains: 'Administrasi Publik', mode: 'insensitive' } },
          ],
        })
      } else if (pUpper === 'ADBI' || pUpper === 'FSAB') {
        andConditions.push({
          OR: [
            { prodiCode: { in: ['51', 'FSAB', 'ADBI'] } },
            { prodi: { contains: 'Administrasi Bisnis', mode: 'insensitive' } },
          ],
        })
      } else if (pUpper === 'IPEM' || pUpper === 'FSPE') {
        andConditions.push({
          OR: [
            { prodiCode: { in: ['71', 'FSPE', 'IPEM'] } },
            { prodi: { contains: 'Pemerintahan', mode: 'insensitive' } },
          ],
        })
      } else if (pUpper === 'SOSI' || pUpper === 'FSSO') {
        andConditions.push({
          OR: [
            { prodiCode: { in: ['70', 'FSSO', 'SOSI'] } },
            { prodi: { contains: 'Sosiologi', mode: 'insensitive' } },
          ],
        })
      } else if (pUpper === 'SING' || pUpper === 'FSSI') {
        andConditions.push({
          OR: [
            { prodiCode: { in: ['87', '47', '63', '64', '49', '48', '25', '21', 'FSSI', 'SING'] } },
            { prodi: { contains: 'Sastra Inggris', mode: 'insensitive' } },
            { prodi: { contains: 'Bahasa Inggris', mode: 'insensitive' } },
            { prodi: { contains: 'English', mode: 'insensitive' } },
          ],
        })
      } else if (pUpper === 'PUS' || pUpper === 'FSIP') {
        andConditions.push({
          OR: [
            { prodiCode: { in: ['310', '43', 'FSIP', 'PUS'] } },
            { prodi: { contains: 'Perpustakaan', mode: 'insensitive' } },
          ],
        })
      } else if (pUpper === 'PAJAK' || pUpper === 'FSSP') {
        andConditions.push({
          OR: [
            { prodiCode: { in: ['312', 'FSSP', 'PAJAK'] } },
            { prodi: { contains: 'Perpajakan', mode: 'insensitive' } },
            { prodi: { contains: 'Pajak', mode: 'insensitive' } },
          ],
        })
      } else {
        andConditions.push({
          OR: [
            { prodiCode: { equals: pUpper } },
            { prodi: { contains: prodi, mode: 'insensitive' } },
          ],
        })
      }
    }

    if (status !== 'ALL') {
      const sLow = status.toLowerCase().trim()
      if (sLow === 'aktif') {
        andConditions.push({ status: { equals: 'Aktif', mode: 'insensitive' } })
      } else if (sLow === 'non-aktif' || sLow === 'nonaktif') {
        andConditions.push({ status: { equals: 'Non-Aktif', mode: 'insensitive' } })
      } else if (sLow === 'alumni') {
        andConditions.push({ status: { in: ['Alumni', 'alumni', 'Lulus'] } })
      } else if (sLow === 'belum-reg' || sLow === 'belum reg' || sLow === 'belum_reg') {
        andConditions.push({ status: { contains: 'Belum pernah registrasi', mode: 'insensitive' } })
      } else if (sLow === 'do' || sLow === 'drop-out' || sLow === 'dropout') {
        andConditions.push({ status: { in: ['Drop Out', 'DO atas permintaan', 'Mengundurkan Diri', 'Meninggal'] } })
      } else if (sLow === 'adm') {
        andConditions.push({ status: { contains: 'Persyaratan Adm', mode: 'insensitive' } })
      } else {
        andConditions.push({ status: { contains: status, mode: 'insensitive' } })
      }
    }

    if (semester !== 'ALL') {
      const semNum = parseInt(semester, 10)
      if (!isNaN(semNum)) {
        andConditions.push({ semester: semNum })
      }
    }

    if (minIpk !== 'ALL') {
      const minVal = parseFloat(minIpk)
      if (!isNaN(minVal)) {
        andConditions.push({ ipk: { gte: String(minVal) } })
      }
    }

    if (search) {
      andConditions.push({
        OR: [
          { nim: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { prodi: { contains: search, mode: 'insensitive' } },
        ],
      })
    }

    const where: any = andConditions.length > 0 ? { AND: andConditions } : {}

    // Query 1: Filtered page items & count for table
    // Query 2: UNFILTERED overall stats for top cards (so cards remain STABLE!)
    const [items, totalCount, globalStatusGroup, globalTotal, lastRecord] = await Promise.all([
      (prisma as any).mahasiswa.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { nim: 'asc' },
      }),
      (prisma as any).mahasiswa.count({ where }),
      (prisma as any).mahasiswa.groupBy({
        by: ['status'],
        _count: { nim: true },
      }),
      (prisma as any).mahasiswa.count(),
      (prisma as any).mahasiswa.findFirst({
        orderBy: { syncedAt: 'desc' },
        select: { syncedAt: true },
      }),
    ])

    // Calculate STABLE global category breakdown counts
    let countAktif = 0
    let countNonAktif = 0
    let countAlumni = 0
    let countBelumReg = 0
    let countDO = 0
    let countAdm = 0

    for (const g of globalStatusGroup) {
      const s = String(g.status || '').trim()
      const cnt = g._count.nim || 0

      if (s.toLowerCase() === 'aktif') {
        countAktif += cnt
      } else if (s.toLowerCase() === 'non-aktif') {
        countNonAktif += cnt
      } else if (['Alumni', 'alumni', 'Lulus'].includes(s)) {
        countAlumni += cnt
      } else if (s.toLowerCase().includes('belum pernah registrasi')) {
        countBelumReg += cnt
      } else if (['Drop Out', 'DO atas permintaan', 'Mengundurkan Diri', 'Meninggal'].includes(s)) {
        countDO += cnt
      } else {
        countAdm += cnt
      }
    }

    return NextResponse.json({
      items,
      totalCount,
      stats: {
        total: globalTotal,
        aktif: countAktif,
        nonAktif: countNonAktif,
        alumni: countAlumni,
        belumReg: countBelumReg,
        do: countDO,
        adm: countAdm,
      },
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize) || 1,
      lastSyncedAt: lastRecord?.syncedAt || null,
    })
  } catch (error: any) {
    console.error('Error fetching mahasiswa from DB:', error)
    return NextResponse.json(
      { error: 'Gagal memuat data mahasiswa karena gangguan koneksi server. Silakan coba beberapa saat lagi.' },
      { status: 500 }
    )
  }
}
