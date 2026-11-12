import { prisma } from './prisma'
import { fetchUtApi } from './ut-api-client'
import { resolveProdiInfo, isGeneralUniversityCourse } from './prodi-codes'
import { studentLoadBalancer } from './load-balancer'

export type AcademicCourse = {
  id?: string
  kode_mk: string
  primary_kode?: string
  nama_mk: string
  sks: number
  kode_prodi: string
  nama_prodi: string
  kategori_mk: 'INTI' | 'NON_INTI'
  kurikulum: string
  status_mk: 'aktif' | 'nonaktif'
  canDrop: boolean
  dropIneligibleReason?: string
  grade?: string
  masa?: string
  semester?: string | number
  kelompok?: string
}

export type AcademicApiResponse = {
  success: boolean
  source: 'EXTERNAL_API' | 'LOCAL_REPOSITORY'
  apiConfigured: boolean
  message: string
  timestamp: string
  data: AcademicCourse[]
}

// In-Memory cache with TTL
type CacheEntry = {
  timestamp: number
  data: AcademicCourse[]
}

const cacheStore = new Map<string, CacheEntry>()

/**
 * Service Client Integrasi API Akademik Mata Kuliah FHISIP UT
 * Menggunakan kode resmi API Program Studi:
 * - FSIH: S1 Ilmu Hukum
 * - FSSP: S1 Perpajakan
 * - FSAP: S1 Administrasi Publik
 * - FSAB: S1 Administrasi Bisnis
 * - FSIK: S1 Ilmu Komunikasi
 * - FSIP: S1 Ilmu Perpustakaan
 * - FSSO: S1 Sosiologi
 * - FSSI: S1 Sastra Inggris
 * - FSPE: S1 Ilmu Pemerintahan
 */
export class AcademicApiService {
  private static get baseUrl(): string {
    return (process.env.ACADEMIC_API_BASE_URL || '').trim().replace(/\/+$/, '')
  }

  private static get apiToken(): string {
    return (process.env.ACADEMIC_API_TOKEN || '').trim()
  }

  private static get timeoutSeconds(): number {
    const val = parseInt(process.env.ACADEMIC_API_TIMEOUT || '15', 10)
    return isNaN(val) || val <= 0 ? 15 : val
  }

  private static get cacheTtlSeconds(): number {
    const val = parseInt(process.env.ACADEMIC_API_CACHE_TTL || '3600', 10)
    return isNaN(val) || val <= 0 ? 3600 : val
  }

  public static clearCache(): void {
    cacheStore.clear()
  }

  public static isConfigured(): boolean {
    return Boolean(this.baseUrl && this.baseUrl.startsWith('http'))
  }

  /**
   * Mengambil daftar mata kuliah lengkap untuk mahasiswa berdasarkan NIM, Prodi, dan Kurikulum.
   * Setiap mahasiswa hanya disajikan mata kuliah yang relevan dengan Program Studi miliknya,
   * bebas dari kontaminasi/pencampuran mata kuliah program studi lain.
   */
  public static async getStudentCourses(params: {
    nim: string
    prodiCode: string
    kurikulum?: string
    bypassCache?: boolean
  }): Promise<AcademicApiResponse> {
    const { nim, prodiCode, kurikulum = '2024', bypassCache = false } = params
    const prodiInfo = resolveProdiInfo(prodiCode)
    const officialProdiCode = prodiInfo?.officialCode || prodiCode.toUpperCase()
    const officialProdiName = prodiInfo?.name || 'FHISIP Universitas Terbuka'

    const cacheKey = `courses:${nim}:${officialProdiCode}:${kurikulum}`
    const now = Date.now()

    // 1. Cek In-Memory Cache (hanya jika data transkrip valid dengan nilai)
    if (!bypassCache) {
      const cached = cacheStore.get(cacheKey)
      if (
        cached &&
        now - cached.timestamp < this.cacheTtlSeconds * 1000 &&
        cached.data.some((c) => c.grade && c.grade !== '-')
      ) {
        return {
          success: true,
          source: 'EXTERNAL_API',
          apiConfigured: true,
          message: 'Data mata kuliah berhasil dimuat dari sistem akademik.',
          timestamp: new Date(cached.timestamp).toISOString(),
          data: cached.data,
        }
      }
    }

    // 2. Ambil basis data kurikulum lokal
    const officialCourses = await prisma.mataKuliah.findMany({
      where: { isActive: true },
      select: {
        id: true,
        kodeMatkul: true,
        namaMatkul: true,
        sks: true,
        prodiCode: true,
        prodiName: true,
        kategori: true,
      },
      orderBy: [{ kodeMatkul: 'asc' }],
    })

    const officialMap = new Map(officialCourses.map((c) => [c.kodeMatkul.toUpperCase(), c]))

    let isFromExternalApi = false

    // 3. Ambil data mata kuliah resmi prodi mahasiswa dari API SRS UT (data-matkul: IA_YMX_KUDJQ)
    if (prodiInfo?.srsCodes?.[0]) {
      try {
        const lbRes = await studentLoadBalancer.executeRequest(nim, async () => {
          return await fetchUtApi('IA_YMX_KUDJQ', {
            kodeProgramStudi: prodiInfo.srsCodes![0],
            limit: 150,
          })
        })
        const srsMatkulRes = lbRes.result
        if (srsMatkulRes.success && srsMatkulRes.data?.data?.dataMataKuliah) {
          const apiCourses = srsMatkulRes.data.data.dataMataKuliah as any[]
          for (const item of apiCourses) {
            const rawKode = String(item.kode_matakuliah || '').trim().toUpperCase()
            if (!rawKode || rawKode === '-') continue

            const existing = officialMap.get(rawKode)
            const nama = item.nama_matakuliah || existing?.namaMatkul || rawKode
            const sks = parseInt(item.sks || '3', 10) || existing?.sks || 3

            const isCore =
              existing?.kategori === 'INTI' ||
              isGeneralUniversityCourse(rawKode) ||
              rawKode.endsWith('4500') ||
              rawKode.endsWith('4560') ||
              nama.toUpperCase().includes('TUGAS AKHIR PROGRAM') ||
              nama.toUpperCase().includes('KARYA ILMIAH') ||
              nama.toUpperCase().includes('PANCASILA') ||
              nama.toUpperCase().includes('KEWARGANEGARAAN') ||
              nama.toUpperCase().includes('AGAMA')

            officialMap.set(rawKode, {
              id: existing?.id || `api-${rawKode}`,
              kodeMatkul: rawKode,
              namaMatkul: nama,
              sks,
              prodiCode: officialProdiCode,
              prodiName: officialProdiName,
              kategori: isCore ? 'INTI' : 'NON_INTI',
            })
            isFromExternalApi = true
          }
        }
      } catch {
        // Fallback ke basis data lokal jika API SRS timeout/offline
      }
    }

    // 4. Ambil data riwayat mata kuliah mahasiswa langsung dari API LKAM (UO_Z4X_MS_ZDE - cetak-transkrip-sementara)
    let isFromLkam = false
    const lkamCourseMap = new Map<string, any>()
    const aliasToPrimary = new Map<string, string>()

    try {
      const lkamRes = await fetchUtApi('UO_Z4X_MS_ZDE', { nim })
      if (lkamRes.success && lkamRes.data?.data?.[0]?.body) {
        isFromLkam = true
        const bodyObj = lkamRes.data.data[0].body
        const bodyEntries = Object.values(bodyObj) as any[]

        for (const item of bodyEntries) {
          const rawKode = String(item.kodemtk || '').trim()
          if (!rawKode || rawKode === '-') continue

          // 1. Abaikan mata kuliah pilihan agama yang tidak diambil (flagdisplay: 1 penanda resmi SIA UT)
          if (item.flagdisplay === 1 || item.flagdisplay === '1') {
            continue
          }

          const masa = String(item.masa || '').trim().toUpperCase()
          const rawGrade = String(item.grade || '').trim()
          const rawKel = String(item.kel || '').trim().toUpperCase()

          // 2. KUNCI FILTER LKAM: HANYA MATA KULIAH YANG BENAR-BENAR DIAMBIL/DITEMPUH OLEH MAHASISWA
          // - masa === 'ZZZZZ' dan kel === 'BL' adalah mata kuliah dalam kurikulum yang BELUM PERNAH DIAMBIL mahasiswa.
          // - masa === '77777' atau grade === '**' adalah baris mapping ekuivalensi duplikat dari kurikulum baru.
          // - Mahasiswa hanya dapat mengajukan pengguguran untuk mata kuliah yang telah ditempuh dan memiliki nilai riil.
          if (
            masa === 'ZZZZZ' ||
            masa === '77777' ||
            rawKel === 'BL' ||
            rawGrade === '**' ||
            (!rawGrade && (masa === '-' || !masa))
          ) {
            continue
          }

          // Tangani format alih kredit seperti "ISIP4130 (FSIH4101)" atau "EMBS4209 (ADBI4438)"
          const primaryKode = rawKode.split('(')[0].trim().toUpperCase()
          const aliasMatch = rawKode.match(/\((.*?)\)/)
          const aliasKode = aliasMatch ? aliasMatch[1].trim().toUpperCase() : null

          if (aliasKode) {
            aliasToPrimary.set(aliasKode, primaryKode)
          }

          if (aliasToPrimary.has(primaryKode) && lkamCourseMap.has(aliasToPrimary.get(primaryKode)!)) {
            continue
          }

          const matchedOfficial =
            officialMap.get(primaryKode) || (aliasKode ? officialMap.get(aliasKode) : undefined)
          const aliasOfficial = aliasKode ? officialMap.get(aliasKode) : undefined

          const nama = item.namamtk || matchedOfficial?.namaMatkul || aliasOfficial?.namaMatkul || primaryKode
          const sks = parseInt(item.sks || '3', 10) || matchedOfficial?.sks || aliasOfficial?.sks || 3
          const displayGrade = rawGrade || '-'
          const displayMasa = masa && masa !== 'ZZZZZ' ? masa : '-'
          const kelompok = String(item['7'] || '').trim().toUpperCase() // "KI" = Kelompok Inti, "KN" = Kelompok Non-Inti

          // Evaluasi mata kuliah inti (KI atau mata kuliah universitas/prodi wajib)
          const isCore =
            kelompok === 'KI' ||
            matchedOfficial?.kategori === 'INTI' ||
            aliasOfficial?.kategori === 'INTI' ||
            isGeneralUniversityCourse(primaryKode) ||
            (aliasKode ? isGeneralUniversityCourse(aliasKode) : false) ||
            primaryKode.startsWith('MKWN') ||
            primaryKode.startsWith('MKWU') ||
            primaryKode.startsWith('MKDU') ||
            primaryKode.startsWith('MKDI') ||
            (aliasKode ? aliasKode.startsWith('MKWN') || aliasKode.startsWith('MKWU') || aliasKode.startsWith('MKDU') || aliasKode.startsWith('MKDI') : false) ||
            primaryKode.endsWith('4500') ||
            primaryKode.endsWith('4560') ||
            (aliasKode ? aliasKode.endsWith('4500') || aliasKode.endsWith('4560') : false) ||
            nama.toUpperCase().includes('TUGAS AKHIR PROGRAM') ||
            nama.toUpperCase().includes('KARYA ILMIAH') ||
            nama.toUpperCase().includes('PANCASILA') ||
            nama.toUpperCase().includes('KEWARGANEGARAAN') ||
            nama.toUpperCase().includes('BAHASA INDONESIA') ||
            nama.toUpperCase().includes('AGAMA')

          let dbId = matchedOfficial?.id || aliasOfficial?.id || `api-${primaryKode}`
          try {
            const dbRecord = await prisma.mataKuliah.upsert({
              where: { kodeMatkul: primaryKode },
              update: {
                namaMatkul: nama,
                sks,
                kategori: isCore ? 'INTI' : 'NON_INTI',
              },
              create: {
                kodeMatkul: primaryKode,
                namaMatkul: nama,
                sks,
                prodiCode: officialProdiCode,
                prodiName: officialProdiName,
                kategori: isCore ? 'INTI' : 'NON_INTI',
                isActive: true,
              },
              select: { id: true },
            })
            if (dbRecord?.id) {
              dbId = dbRecord.id
            }
          } catch {
            // Abaikan kesalahan DB jika terjadi konflik concurrency
          }

          // Simpan dengan key kode unik transkrip agar alih kredit tidak menimpa satu sama lain
          const courseKey = rawKode.toUpperCase()
          lkamCourseMap.set(courseKey, {
            id: dbId,
            kodeMatkul: rawKode,
            primaryKode,
            namaMatkul: nama,
            sks,
            prodiCode: officialProdiCode,
            prodiName: officialProdiName,
            kategori: isCore ? 'INTI' : 'NON_INTI',
            grade: displayGrade,
            masa: displayMasa,
            kelompok: kelompok || (isCore ? 'KI' : 'KN'),
            semester: item.semester || null,
          })
        }

        // Hapus duplikat alias jika sempat terdaftar sebelum primary
        for (const [alias, primary] of aliasToPrimary.entries()) {
          if (lkamCourseMap.has(alias) && lkamCourseMap.has(primary)) {
            lkamCourseMap.delete(alias)
          }
        }
      }
    } catch (err) {
      console.error('Error fetching UO_Z4X_MS_ZDE (cetak-transkrip-sementara):', err)
    }

    // 5. Pembentukan daftar mata kuliah pengguguran
    // Sesuai ketentuan: jika data LKAM berhasil diakses (UO_Z4X_MS_ZDE),
    // HANYA mata kuliah yang tercatat pernah diambil/ditempuh mahasiswa di LKAM tersebut yang disajikan!
    const finalMap = new Map<string, any>()

    if (isFromLkam) {
      // HANYA ambil mata kuliah dari LKAM mahasiswa yang sudah ditempuh
      for (const [k, c] of lkamCourseMap.entries()) {
        finalMap.set(k, c)
      }
    } else {
      // Fallback HANYA jika API UO_Z4X_MS_ZDE offline/gagal koneksi sama sekali:
      // Ambil mata kuliah prodi, namun cegah duplikasi mata kuliah pilihan agama (maksimal 1 agama)
      let includedAgama = false
      const isProdiMatch = (c: any) => {
        if (!prodiInfo) {
          return (c.prodiCode || '').toUpperCase() === officialProdiCode
        }
        const cProdiUpper = (c.prodiCode || '').toUpperCase()
        return (
          cProdiUpper === prodiInfo.officialCode ||
          cProdiUpper === prodiInfo.legacyCode ||
          prodiInfo.srsCodes.includes(cProdiUpper) ||
          prodiInfo.prefixes.some((pfx) => c.kodeMatkul.toUpperCase().startsWith(pfx))
        )
      }

      for (const c of officialMap.values()) {
        const key = c.kodeMatkul.toUpperCase()
        const isAgama = c.namaMatkul.toUpperCase().includes('AGAMA')
        if (isAgama) {
          if (includedAgama) continue // Cegah munculnya 6 agama sekaligus
          includedAgama = true
        }

        if (isProdiMatch(c)) {
          finalMap.set(key, {
            ...c,
            primaryKode: c.kodeMatkul,
            prodiCode: officialProdiCode,
            prodiName: officialProdiName,
            grade: '-',
            masa: '-',
          })
        }
      }
    }

    // 6. Bentuk output akhir AcademicCourse
    const finalCourses: AcademicCourse[] = Array.from(finalMap.values()).map((c) => {
      const isCore =
        c.kategori === 'INTI' ||
        c.kelompok === 'KI' ||
        isGeneralUniversityCourse(c.primaryKode || c.kodeMatkul) ||
        (c.primaryKode || c.kodeMatkul).endsWith('4500') ||
        (c.primaryKode || c.kodeMatkul).endsWith('4560') ||
        c.namaMatkul.toUpperCase().includes('TUGAS AKHIR PROGRAM') ||
        c.namaMatkul.toUpperCase().includes('KARYA ILMIAH') ||
        c.namaMatkul.toUpperCase().includes('PANCASILA') ||
        c.namaMatkul.toUpperCase().includes('KEWARGANEGARAAN') ||
        c.namaMatkul.toUpperCase().includes('AGAMA')

      const kategori = isCore ? 'INTI' : 'NON_INTI'
      const canDrop = !isCore

      return {
        id: c.id,
        kode_mk: c.kodeMatkul,
        primary_kode: c.primaryKode || c.kodeMatkul,
        nama_mk: c.namaMatkul,
        sks: c.sks,
        kode_prodi: officialProdiCode,
        nama_prodi: officialProdiName,
        kategori_mk: kategori,
        kurikulum,
        status_mk: 'aktif',
        canDrop,
        grade: c.grade || '-',
        masa: c.masa || '-',
        semester: c.semester,
        kelompok: c.kelompok,
        dropIneligibleReason: !canDrop
          ? 'Mata kuliah ini termasuk kategori Mata Kuliah Inti (KI) dan tidak dapat diajukan untuk pengguguran.'
          : undefined,
      }
    })

    // Sort ascending berdasarkan kode mata kuliah
    finalCourses.sort((a, b) => a.kode_mk.localeCompare(b.kode_mk))

    // Simpan ke Cache hanya jika berhasil memuat data transkrip
    if (isFromLkam && finalCourses.length > 0) {
      cacheStore.set(cacheKey, { timestamp: now, data: finalCourses })
    }

    const message = isFromLkam
      ? finalCourses.length > 0
        ? 'Data mata kuliah transkrip berhasil dimuat dari sistem akademik (UO_Z4X_MS_ZDE).'
        : 'Mahasiswa belum memiliki riwayat mata kuliah yang telah ditempuh / memiliki nilai pada transkrip akademik.'
      : 'Data mata kuliah berhasil dimuat dari sistem akademik.'

    return {
      success: true,
      source: isFromLkam || isFromExternalApi ? 'EXTERNAL_API' : 'LOCAL_REPOSITORY',
      apiConfigured: true,
      message,
      timestamp: new Date().toISOString(),
      data: finalCourses,
    }
  }
}
