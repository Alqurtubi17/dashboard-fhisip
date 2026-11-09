import { prisma } from './prisma'
import { fetchUtApi } from './ut-api-client'
import { resolveProdiInfo, isGeneralUniversityCourse } from './prodi-codes'

export type AcademicCourse = {
  kode_mk: string
  nama_mk: string
  sks: number
  kode_prodi: string
  nama_prodi: string
  kategori_mk: 'INTI' | 'NON_INTI'
  kurikulum: string
  status_mk: 'aktif' | 'nonaktif'
  canDrop: boolean
  dropIneligibleReason?: string
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
  }): Promise<AcademicApiResponse> {
    const { nim, prodiCode, kurikulum = '2024' } = params
    const prodiInfo = resolveProdiInfo(prodiCode)
    const officialProdiCode = prodiInfo?.officialCode || prodiCode.toUpperCase()
    const officialProdiName = prodiInfo?.name || 'FHISIP Universitas Terbuka'

    const cacheKey = `courses:${nim}:${officialProdiCode}:${kurikulum}`
    const now = Date.now()

    // 1. Cek In-Memory Cache
    const cached = cacheStore.get(cacheKey)
    if (cached && now - cached.timestamp < this.cacheTtlSeconds * 1000) {
      return {
        success: true,
        source: 'EXTERNAL_API',
        apiConfigured: true,
        message: 'Data mata kuliah berhasil dimuat dari sistem akademik.',
        timestamp: new Date(cached.timestamp).toISOString(),
        data: cached.data,
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
        const srsMatkulRes = await fetchUtApi('IA_YMX_KUDJQ', {
          kodeProgramStudi: prodiInfo.srsCodes[0],
          limit: 150,
        })
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

    // 4. Ambil data riwayat mata kuliah mahasiswa langsung dari API LKAM (UO_Z4X_MS_ZDE)
    let isFromLkam = false
    const lkamCourseMap = new Map<string, any>()
    const aliasToPrimary = new Map<string, string>()

    try {
      const lkamRes = await fetchUtApi('UO_Z4X_MS_ZDE', { nim })
      if (lkamRes.success && lkamRes.data?.data?.[0]?.body) {
        const bodyObj = lkamRes.data.data[0].body
        const bodyEntries = Object.values(bodyObj) as any[]

        for (const item of bodyEntries) {
          const rawKode = String(item.kodemtk || '').trim()
          if (!rawKode || rawKode === '-') continue

          // Handle format like "MKWU4108 (MKWN4108)" or "ADNI4211 (ADBI4330)"
          const primaryKode = rawKode.split('(')[0].trim().toUpperCase()
          const aliasMatch = rawKode.match(/\((.*?)\)/)
          const aliasKode = aliasMatch ? aliasMatch[1].trim().toUpperCase() : null

          if (aliasKode) {
            aliasToPrimary.set(aliasKode, primaryKode)
          }

          // Lewati jika baris ini merupakan alias dari mata kuliah alih kredit yang sudah dimasukkan
          if (aliasToPrimary.has(primaryKode) && lkamCourseMap.has(aliasToPrimary.get(primaryKode)!)) {
            continue
          }

          const matchedOfficial =
            officialMap.get(primaryKode) || (aliasKode ? officialMap.get(aliasKode) : undefined)

          const nama = item.namamtk || matchedOfficial?.namaMatkul || primaryKode
          const sks = parseInt(item.sks || '3', 10) || matchedOfficial?.sks || 3

          const isCore =
            matchedOfficial?.kategori === 'INTI' ||
            isGeneralUniversityCourse(primaryKode) ||
            primaryKode.endsWith('4500') ||
            primaryKode.endsWith('4560') ||
            nama.toUpperCase().includes('TUGAS AKHIR PROGRAM') ||
            nama.toUpperCase().includes('KARYA ILMIAH') ||
            nama.toUpperCase().includes('PANCASILA') ||
            nama.toUpperCase().includes('KEWARGANEGARAAN') ||
            nama.toUpperCase().includes('AGAMA')

          // SELALU tetapkan Program Studi mahasiswa bersangkutan
          // Tidak boleh mengambil prodiCode dari data mentah prodi lain (misal HKUM)
          lkamCourseMap.set(primaryKode, {
            id: `lkam-${primaryKode}`,
            kodeMatkul: primaryKode,
            namaMatkul: nama,
            sks,
            prodiCode: officialProdiCode,
            prodiName: officialProdiName,
            kategori: isCore ? 'INTI' : 'NON_INTI',
          })

          isFromLkam = true
        }

        // Hapus duplikat alias jika sempat terdaftar sebelum primary
        for (const [alias, primary] of aliasToPrimary.entries()) {
          if (lkamCourseMap.has(alias) && lkamCourseMap.has(primary)) {
            lkamCourseMap.delete(alias)
          }
        }
      }
    } catch {
      // Abaikan jika LKAM offline, gunakan repositori kurikulum resmi
    }

    // 5. Filter mata kuliah: HANYA mata kuliah yang relevan dengan Program Studi mahasiswa
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

    const finalMap = new Map<string, any>()

    if (isFromLkam) {
      // Mahasiswa dengan LKAM:
      // 1. Masukkan semua mata kuliah yang diambil mahasiswa dari LKAM
      for (const [k, c] of lkamCourseMap.entries()) {
        finalMap.set(k, c)
      }
      // 2. Tambahkan mata kuliah kurikulum resmi prodi mahasiswa yang belum diambil
      for (const c of officialMap.values()) {
        const key = c.kodeMatkul.toUpperCase()
        if (isProdiMatch(c) && !finalMap.has(key)) {
          finalMap.set(key, {
            ...c,
            prodiCode: officialProdiCode,
            prodiName: officialProdiName,
          })
        }
      }
    } else {
      // Mahasiswa tanpa riwayat LKAM: Sajikan mata kuliah kurikulum resmi prodinya saja
      for (const c of officialMap.values()) {
        const key = c.kodeMatkul.toUpperCase()
        if (isProdiMatch(c)) {
          finalMap.set(key, {
            ...c,
            prodiCode: officialProdiCode,
            prodiName: officialProdiName,
          })
        }
      }
    }

    // 6. Bentuk output akhir AcademicCourse
    const finalCourses: AcademicCourse[] = Array.from(finalMap.values()).map((c) => {
      const isCore =
        c.kategori === 'INTI' ||
        isGeneralUniversityCourse(c.kodeMatkul) ||
        c.kodeMatkul.endsWith('4500') ||
        c.kodeMatkul.endsWith('4560') ||
        c.namaMatkul.toUpperCase().includes('TUGAS AKHIR PROGRAM') ||
        c.namaMatkul.toUpperCase().includes('KARYA ILMIAH') ||
        c.namaMatkul.toUpperCase().includes('PANCASILA') ||
        c.namaMatkul.toUpperCase().includes('KEWARGANEGARAAN') ||
        c.namaMatkul.toUpperCase().includes('AGAMA')

      const kategori = isCore ? 'INTI' : 'NON_INTI'
      const canDrop = !isCore

      return {
        kode_mk: c.kodeMatkul,
        nama_mk: c.namaMatkul,
        sks: c.sks,
        kode_prodi: officialProdiCode,
        nama_prodi: officialProdiName,
        kategori_mk: kategori,
        kurikulum,
        status_mk: 'aktif',
        canDrop,
        dropIneligibleReason: !canDrop
          ? 'Mata kuliah ini termasuk kategori Mata Kuliah Inti dan tidak dapat diajukan untuk pengguguran.'
          : undefined,
      }
    })

    // Sort ascending berdasarkan kode mata kuliah
    finalCourses.sort((a, b) => a.kode_mk.localeCompare(b.kode_mk))

    // Simpan ke Cache
    cacheStore.set(cacheKey, { timestamp: now, data: finalCourses })

    return {
      success: true,
      source: isFromLkam || isFromExternalApi ? 'EXTERNAL_API' : 'LOCAL_REPOSITORY',
      apiConfigured: true,
      message: 'Data mata kuliah berhasil dimuat dari sistem akademik.',
      timestamp: new Date().toISOString(),
      data: finalCourses,
    }
  }

  /**
   * Reset / bersihkan cache
   */
  public static clearCache() {
    cacheStore.clear()
  }
}
