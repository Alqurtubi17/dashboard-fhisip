import { prisma } from './prisma'

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
   * Mengambil daftar mata kuliah relevan untuk mahasiswa berdasarkan NIM, Prodi, dan Kurikulum.
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
        source: this.isConfigured() ? 'EXTERNAL_API' : 'LOCAL_REPOSITORY',
        apiConfigured: this.isConfigured(),
        message: 'Data mata kuliah dimuat dari cache memori server.',
        timestamp: new Date(cached.timestamp).toISOString(),
        data: cached.data,
      }
    }

    // Ambil tabel referensi klasifikasi resmi lokal untuk penggabungan kategori Inti/Non-Inti
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
    })

    const officialMap = new Map(officialCourses.map((c) => [c.kodeMatkul.toUpperCase(), c]))

    // 2. Jika External API Terkonfigurasi, coba panggil API Akademik
    if (this.isConfigured()) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), this.timeoutSeconds * 1000)

        // Prioritaskan endpoint spesifik mahasiswa (NIM) atau kurikulum prodi
        const targetUrl = `${this.baseUrl}/v1/mahasiswa/${encodeURIComponent(nim)}/mata-kuliah?prodi=${encodeURIComponent(
          prodiCode
        )}&kurikulum=${encodeURIComponent(kurikulum)}`

        console.log(`📡 [ACADEMIC API] Menghubungi external API mata kuliah: ${this.baseUrl}/v1/mahasiswa/***`)

        const headers: Record<string, string> = {
          Accept: 'application/json',
          'User-Agent': 'FHISIP-Academic-Platform/1.0',
        }
        if (this.apiToken) {
          headers['Authorization'] = `Bearer ${this.apiToken}`
        }

        const res = await fetch(targetUrl, {
          method: 'GET',
          headers,
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (res.ok) {
          const json = await res.json()
          const rawItems: any[] = Array.isArray(json) ? json : json.data || json.items || []

          if (rawItems.length > 0) {
            const mappedCourses: AcademicCourse[] = rawItems.map((item: any) => {
              const kode = String(item.kode_mk || item.kodeMatkul || item.code || '').trim().toUpperCase()
              const nama = String(item.nama_mk || item.namaMatkul || item.name || '').trim()
              const sks = parseInt(item.sks || 3, 10)
              const pCode = String(item.kode_prodi || item.prodiCode || prodiCode).trim().toUpperCase()
              const pName = String(item.nama_prodi || item.prodiName || '')
              const kuri = String(item.kurikulum || kurikulum).trim()

              // Aturan Mutlak: Kategori Wajib Berasal dari Tabel Klasifikasi Resmi
              const official = officialMap.get(kode)
              const kategori: 'INTI' | 'NON_INTI' = official
                ? official.kategori
                : item.kategori_mk === 'INTI'
                ? 'INTI'
                : 'NON_INTI'

              const canDrop = kategori === 'NON_INTI'
              const dropIneligibleReason = !canDrop
                ? 'Mata kuliah ini termasuk kategori Mata Kuliah Inti dan tidak dapat diajukan untuk pengguguran.'
                : undefined

              return {
                kode_mk: kode,
                nama_mk: nama,
                sks,
                kode_prodi: pCode,
                nama_prodi: pName,
                kategori_mk: kategori,
                kurikulum: kuri,
                status_mk: item.status_mk === 'nonaktif' ? 'nonaktif' : 'aktif',
                canDrop,
                dropIneligibleReason,
              }
            })

            // Simpan ke Cache
            cacheStore.set(cacheKey, { timestamp: now, data: mappedCourses })

            return {
              success: true,
              source: 'EXTERNAL_API',
              apiConfigured: true,
              message: 'Data mata kuliah berhasil disinkronkan dari Academic API eksternal.',
              timestamp: new Date().toISOString(),
              data: mappedCourses,
            }
          }
        } else {
          console.warn(`⚠️ [ACADEMIC API] Response status ${res.status}: Gagal memuat dari API eksternal.`)
        }
      } catch (err: any) {
        console.error('❌ [ACADEMIC API] Gagal terhubung ke Academic API:', err?.name === 'AbortError' ? 'Request Timeout' : err?.message)
      }
    }

    // 3. Fallback Aman ke Repositori Mata Kuliah Resmi Lokal (Filtered by Student's Prodi)
    console.log(`ℹ️ [ACADEMIC API] Menggunakan data repositori akademik resmi terverifikasi untuk Prodi: ${prodiCode}`)

    // Filter mata kuliah yang cocok dengan prodi mahasiswa
    let relevantCourses = officialCourses.filter(
      (c) => c.prodiCode.toUpperCase() === prodiCode.toUpperCase()
    )

    // Jika prodi tidak memiliki mata kuliah khusus, tampilkan seluruh mata kuliah fakultas
    if (relevantCourses.length === 0) {
      relevantCourses = officialCourses
    }

    const fallbackCourses: AcademicCourse[] = relevantCourses.map((c) => {
      const canDrop = c.kategori === 'NON_INTI'
      return {
        kode_mk: c.kodeMatkul,
        nama_mk: c.namaMatkul,
        sks: c.sks,
        kode_prodi: c.prodiCode,
        nama_prodi: c.prodiName,
        kategori_mk: c.kategori,
        kurikulum,
        status_mk: 'aktif',
        canDrop,
        dropIneligibleReason: !canDrop
          ? 'Mata kuliah ini termasuk kategori Mata Kuliah Inti dan tidak dapat diajukan untuk pengguguran.'
          : undefined,
      }
    })

    // Simpan ke Cache
    cacheStore.set(cacheKey, { timestamp: now, data: fallbackCourses })

    return {
      success: true,
      source: 'LOCAL_REPOSITORY',
      apiConfigured: this.isConfigured(),
      message: this.isConfigured()
        ? 'Academic API eksternal tidak merespons; data dimuat dari repositori akademik resmi lokal.'
        : 'Data mata kuliah dimuat dari repositori akademik resmi terverifikasi (API eksternal siap dikonfigurasi).',
      timestamp: new Date().toISOString(),
      data: fallbackCourses,
    }
  }

  /**
   * Reset / bersihkan cache
   */
  public static clearCache() {
    cacheStore.clear()
  }
}
