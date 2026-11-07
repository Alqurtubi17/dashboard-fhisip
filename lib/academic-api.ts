import { prisma } from './prisma'
import { fetchUtApi } from './ut-api-client'

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
 * Service Client Integrasi API Akademik Mata Kuliah
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
   * Terhubung langsung ke API UT & basis data kurikulum akademik.
   */
  public static async getStudentCourses(params: {
    nim: string
    prodiCode: string
    kurikulum?: string
  }): Promise<AcademicApiResponse> {
    const { nim, prodiCode, kurikulum = '2024' } = params
    const cacheKey = `courses:${nim}:${prodiCode}:${kurikulum}`
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

    // Ambil tabel referensi klasifikasi resmi lokal
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

    // 2. Coba ambil data mata kuliah mahasiswa langsung dari API LKAM (cetak-transkrip-sementara)
    let isFromLkam = false
    try {
      const lkamRes = await fetchUtApi('UO_Z4X_MS_ZDE', { nim })
      if (lkamRes.success && lkamRes.data?.data?.[0]?.body) {
        const bodyObj = lkamRes.data.data[0].body
        const bodyEntries = Object.values(bodyObj) as any[]

        for (const item of bodyEntries) {
          const rawKode = String(item.kodemtk || '').trim()
          if (!rawKode || rawKode === '-') continue

          // Handle format like "ADNI4211 (ADBI4330)" or "ADBI4330"
          const primaryKode = rawKode.split('(')[0].trim().toUpperCase()
          const aliasMatch = rawKode.match(/\((.*?)\)/)
          const aliasKode = aliasMatch ? aliasMatch[1].trim().toUpperCase() : null

          const matchedOfficial =
            officialMap.get(primaryKode) || (aliasKode ? officialMap.get(aliasKode) : undefined)

          const nama = item.namamtk || matchedOfficial?.namaMatkul || primaryKode
          const sks = parseInt(item.sks || '3', 10) || matchedOfficial?.sks || 3

          const isCore =
            primaryKode.startsWith('MKWU') ||
            primaryKode.startsWith('MKDU') ||
            primaryKode.endsWith('4500') ||
            primaryKode.endsWith('4560') ||
            nama.toUpperCase().includes('TUGAS AKHIR PROGRAM') ||
            nama.toUpperCase().includes('KARYA ILMIAH') ||
            nama.toUpperCase().includes('PANCASILA') ||
            nama.toUpperCase().includes('KEWARGANEGARAAN') ||
            nama.toUpperCase().includes('AGAMA')

          officialMap.set(primaryKode, {
            id: matchedOfficial?.id || `lkam-${primaryKode}`,
            kodeMatkul: primaryKode,
            namaMatkul: nama,
            sks,
            prodiCode: matchedOfficial?.prodiCode || prodiCode,
            prodiName: matchedOfficial?.prodiName || 'FHISIP UT',
            kategori: isCore ? 'INTI' : 'NON_INTI',
          })

          isFromLkam = true
        }
      }
    } catch {
      // Abaikan jika LKAM offline, gunakan repositori kurikulum resmi
    }

    // 3. Susun daftar mata kuliah:
    // Sesuaikan antara Program Studi mahasiswa dan mata kuliah yang diambil mahasiswa (LKAM)
    const studentProdiUpper = prodiCode.toUpperCase()
    const allItems = Array.from(officialMap.values())

    let combinedList: typeof allItems = []

    if (isFromLkam) {
      // Jika mahasiswa memiliki data riwayat LKAM resmi, tampilkan mata kuliah yang telah diambil mahasiswa di LKAM
      combinedList = allItems.filter(
        (c) => c.id.startsWith('lkam-') || c.prodiCode.toUpperCase() === studentProdiUpper
      )
    } else {
      // Tampilkan hanya mata kuliah kurikulum Program Studi mahasiswa bersangkutan + MKWU/MKDU universitas
      const prodiSpecific = allItems.filter((c) => c.prodiCode.toUpperCase() === studentProdiUpper)
      const generalCourses = allItems.filter(
        (c) =>
          c.kodeMatkul.startsWith('MKWU') ||
          c.kodeMatkul.startsWith('MKDU') ||
          c.kodeMatkul.startsWith('ISIP') ||
          c.kodeMatkul.startsWith('FSIP')
      )
      combinedList = [...prodiSpecific, ...generalCourses]
    }

    // Deduplikasi
    const combinedMap = new Map<string, typeof allItems[0]>()
    for (const c of combinedList) {
      combinedMap.set(c.kodeMatkul, c)
    }

    const finalCourses: AcademicCourse[] = Array.from(combinedMap.values()).map((c) => {
      const isCore =
        c.kategori === 'INTI' ||
        c.kodeMatkul.startsWith('MKWU') ||
        c.kodeMatkul.startsWith('MKDU') ||
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
        kode_prodi: c.prodiCode,
        nama_prodi: c.prodiName,
        kategori_mk: kategori,
        kurikulum,
        status_mk: 'aktif',
        canDrop,
        dropIneligibleReason: !canDrop
          ? 'Mata kuliah ini termasuk kategori Mata Kuliah Inti dan tidak dapat diajukan untuk pengguguran.'
          : undefined,
      }
    })

    // Sort by kode_mk
    finalCourses.sort((a, b) => a.kode_mk.localeCompare(b.kode_mk))

    // Simpan ke Cache
    cacheStore.set(cacheKey, { timestamp: now, data: finalCourses })

    return {
      success: true,
      source: isFromLkam ? 'EXTERNAL_API' : 'LOCAL_REPOSITORY',
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


