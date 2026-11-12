import fs from 'fs'
import path from 'path'
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
  isKesetaraan?: boolean
  kesetaraanKet?: string
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

function getSnapshotDir(): string {
  const dir = path.join(process.cwd(), 'data', 'lkam_snapshots')
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true })
    } catch {
      // Ignore
    }
  }
  return dir
}

function getStoredSnapshot(nim: string): AcademicCourse[] | null {
  try {
    const cleanNim = nim.trim()
    const filePath = path.join(getSnapshotDir(), `${cleanNim}.json`)
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8')
      const parsed = JSON.parse(content)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    }
  } catch (err) {
    console.error(`Error reading snapshot for NIM ${nim}:`, err)
  }
  return null
}

function saveSnapshot(nim: string, courses: AcademicCourse[]): void {
  try {
    if (!courses || courses.length === 0) return
    const cleanNim = nim.trim()
    const filePath = path.join(getSnapshotDir(), `${cleanNim}.json`)
    fs.writeFileSync(filePath, JSON.stringify(courses, null, 2), 'utf-8')
  } catch (err) {
    console.error(`Error saving snapshot for NIM ${nim}:`, err)
  }
}

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

    // 1. Cek In-Memory Cache atau Persistent Snapshot Storage
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

      // Cek Snapshot Penyimpanan Permanen (data tersimpan dari LKAM agar tidak hit API berulang kali)
      const snapshot = getStoredSnapshot(nim)
      if (snapshot && snapshot.length > 0) {
        cacheStore.set(cacheKey, { timestamp: now, data: snapshot })
        return {
          success: true,
          source: 'LOCAL_REPOSITORY',
          apiConfigured: true,
          message: 'Data mata kuliah LKAM berhasil dimuat dari arsip pangkalan data akademik.',
          timestamp: new Date().toISOString(),
          data: snapshot,
        }
      }
    }

    // 2. Ambil basis data kurikulum lokal
    let officialCourses: any[] = []
    try {
      officialCourses = await prisma.mataKuliah.findMany({
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
    } catch {
      // Abaikan jika database sedang tidak dapat dijangkau
    }

    const officialMap = new Map(officialCourses.map((c) => [c.kodeMatkul.toUpperCase(), c]))

    let isFromExternalApi = false

    // 3. Ambil data riwayat mata kuliah mahasiswa langsung dari API LKAM (UO_Z4X_MS_ZDE - cetak-transkrip-sementara)
    // Sesuai ketentuan akademik resmi: Pengajuan pengguguran hanya dapat dilakukan terhadap mata kuliah
    // yang tercatat pernah diambil dan telah lulus (LL) pada LKAM mahasiswa.
    let isFromLkam = false
    const lkamCourseMap = new Map<string, any>()
    const aliasToPrimary = new Map<string, string>()

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const lkamRes = await fetchUtApi('UO_Z4X_MS_ZDE', { nim })
        if (lkamRes.success && lkamRes.data?.data?.[0]?.body) {
          isFromLkam = true
          const bodyObj = lkamRes.data.data[0].body
          const bodyEntries = Object.values(bodyObj) as any[]

          // Peta pencocokan nilai mata kuliah kesetaraan (format: "KODE_LAMA (KODE_BARU)" -> nilai riil & masa)
          const kesetaraanGradeMap = new Map<string, { asalKode: string; rawKode: string; grade: string; masa: string }>()
          for (const item of bodyEntries) {
            const rawKode = String(item.kodemtk || '').trim()
            const aliasMatch = rawKode.match(/\((.*?)\)/)
            const rawGrade = String(item.grade || '').trim()
            const rawMasa = String(item.masa || '').trim()
            if (aliasMatch && rawGrade && rawGrade !== '**') {
              const targetKode = aliasMatch[1].trim().toUpperCase()
              const asalKode = rawKode.split('(')[0].trim().toUpperCase()
              kesetaraanGradeMap.set(targetKode, {
                asalKode,
                rawKode,
                grade: rawGrade,
                masa: rawMasa && rawMasa !== 'ZZZZZ' && rawMasa !== '77777' ? rawMasa : '',
              })
            }
          }

          for (const item of bodyEntries) {
            const rawKode = String(item.kodemtk || '').trim()
            if (!rawKode || rawKode === '-') continue

            // 1. Abaikan mata kuliah pilihan agama yang tidak diambil (flagdisplay: 1 penanda resmi SIA UT)
            if (item.flagdisplay === 1 || item.flagdisplay === '1') {
              continue
            }

            const rawKel = String(item.kel || '').trim().toUpperCase()

            // 2. KUNCI FILTER LKAM RESMI: HANYA MATA KULIAH BERSTATUS LULUS (LL)
            // Seluruh mata kuliah yang telah diselesaikan mahasiswa berstatus kelulusan 'LL' (Lulus).
            // Mata kuliah dengan status 'BL' (Belum Lulus / Belum Diambil) diabaikan.
            if (rawKel !== 'LL') {
              continue
            }

            const masa = String(item.masa || '').trim().toUpperCase()
            const rawGrade = String(item.grade || '').trim()

            // Tangani format alih kredit seperti "ISIP4130 (FSIH4101)" atau "EMBS4209 (ADBI4438)"
            const primaryKode = rawKode.split('(')[0].trim().toUpperCase()
            const aliasMatch = rawKode.match(/\((.*?)\)/)
            const aliasKode = aliasMatch ? aliasMatch[1].trim().toUpperCase() : null

            const matchedOfficial =
              officialMap.get(primaryKode) || (aliasKode ? officialMap.get(aliasKode) : undefined)
            const aliasOfficial = aliasKode ? officialMap.get(aliasKode) : undefined

            const nama = item.namamtk || matchedOfficial?.namaMatkul || aliasOfficial?.namaMatkul || primaryKode
            const sks = parseInt(item.sks || '3', 10) || matchedOfficial?.sks || aliasOfficial?.sks || 3
            let displayGrade = rawGrade || '-'
            let displayMasa = masa && masa !== 'ZZZZZ' ? masa : '-'
            let isKesetaraan = false
            let kesetaraanKet: string | undefined = undefined

            // Cek jika baris ini adalah mata kuliah kesetaraan kurikulum lama (kolom '7' kosong / ada tanda kurung)
            if (!item['7'] && rawKode.includes('(')) {
              isKesetaraan = true
              kesetaraanKet = 'Kesetaraan'
            }

            // Jika nilai berupa '**' (mata kuliah kurikulum baru hasil kesetaraan):
            // Ambil nilai riil dan masa registrasi dari mata kuliah kesetaraan pasangannya!
            if (displayGrade === '**' || masa === '77777') {
              const eq = kesetaraanGradeMap.get(primaryKode)
              if (eq) {
                displayGrade = eq.grade
                if (eq.masa) displayMasa = eq.masa
                isKesetaraan = true
                kesetaraanKet = `Kesetaraan (${eq.asalKode})`
              } else {
                isKesetaraan = true
                kesetaraanKet = 'Kesetaraan'
              }
            }

            const kelompok = String(item['7'] || '').trim().toUpperCase() // "KI" = Kelompok Inti, "KN" = Kelompok Non-Inti

            // Evaluasi mata kuliah inti (KI atau mata kuliah universitas/prodi wajib)
            const isCore =
              kelompok === 'KI' ||
              (kelompok !== 'KN' && (
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
              ))

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

            // Simpan dengan key kode unik transkrip agar seluruh baris LKAM tersimpan
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
              isKesetaraan,
              kesetaraanKet,
            })
          }
          break // Berhasil memuat LKAM, hentikan retry loop
        }
      } catch (err) {
        console.error(`Attempt ${attempt} error fetching UO_Z4X_MS_ZDE:`, err)
      }

      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    }

    // 4. Validasi hasil pemuatan transkrip LKAM
    // Jika API UO_Z4X_MS_ZDE gagal/timeout, fallback ke snapshot LKAM tersimpan agar tidak pernah error!
    if (!isFromLkam) {
      const fallbackSnapshot = getStoredSnapshot(nim)
      if (fallbackSnapshot && fallbackSnapshot.length > 0) {
        cacheStore.set(cacheKey, { timestamp: now, data: fallbackSnapshot })
        return {
          success: true,
          source: 'LOCAL_REPOSITORY',
          apiConfigured: true,
          message: 'Data mata kuliah LKAM dimuat dari arsip pangkalan data akademik.',
          timestamp: new Date().toISOString(),
          data: fallbackSnapshot,
        }
      }

      return {
        success: false,
        source: 'EXTERNAL_API',
        apiConfigured: true,
        message: 'Gagal memuat transkrip LKAM dari server akademik UT. Silakan muat ulang halaman.',
        timestamp: new Date().toISOString(),
        data: [],
      }
    }

    // 5. Pembentukan daftar mata kuliah pengguguran dari LKAM mahasiswa
    const finalMap = new Map<string, any>()
    for (const [k, c] of lkamCourseMap.entries()) {
      finalMap.set(k, c)
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
        isKesetaraan: c.isKesetaraan,
        kesetaraanKet: c.kesetaraanKet,
        dropIneligibleReason: !canDrop
          ? 'Mata kuliah ini termasuk kategori Mata Kuliah Inti (KI) dan tidak dapat diajukan untuk pengguguran.'
          : undefined,
      }
    })

    // Sort ascending berdasarkan kode mata kuliah
    finalCourses.sort((a, b) => a.kode_mk.localeCompare(b.kode_mk))

    // Simpan ke Cache dan Persistent Snapshot File agar tidak hit API berkali-kali
    if (isFromLkam && finalCourses.length > 0) {
      cacheStore.set(cacheKey, { timestamp: now, data: finalCourses })
      saveSnapshot(nim, finalCourses)
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
