import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyAccessToken, ACCESS_COOKIE } from '@/lib/auth'
import fhisipPrediksiData from '@/data/fhisip-prediksi-kelas.json'
import puppeteer from 'puppeteer-core'
import fs from 'fs'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Mapping of prodi codes to UT Registrasi prodi identifiers / search terms
const PRODI_SEARCH_TERMS: Record<string, string[]> = {
  HKUM: ['321', '311', 'hukum'],
  FSIH: ['321', '311', 'hukum'],
  ADPU: ['350', '50', 'publik', 'administrasi negara'],
  FSAP: ['350', '50', 'publik', 'administrasi negara'],
  ADBI: ['351', '51', 'bisnis', 'administrasi niaga'],
  FSAB: ['351', '51', 'bisnis', 'administrasi niaga'],
  IKOM: ['72', '318', 'komunikasi'],
  FSIK: ['72', '318', 'komunikasi'],
  IPEM: ['71', '317', 'pemerintahan'],
  FSPE: ['71', '317', 'pemerintahan'],
  SOSI: ['70', '319', 'sosiologi'],
  FSSO: ['70', '319', 'sosiologi'],
  PUS: ['320', '310', '38', 'perpustakaan', 'kearsipan'],
  FSIP: ['320', '310', '38', 'perpustakaan', 'kearsipan'],
  FSKP: ['320', '310', '38', 'perpustakaan', 'kearsipan'],
  PAJAK: ['315', '35', 'pajak', 'perpajakan'],
  FSSP: ['315', '35', 'pajak', 'perpajakan'],
  SING: ['82', '316', 'sastra inggris', 'inggris'],
  FSSI: ['82', '316', 'sastra inggris', 'inggris'],
}

// Legacy course code mapping fallbacks if new curriculum codes yield 0
const LEGACY_PREFIX_MAP: Record<string, string> = {
  FSIH: 'HKUM',
  FSAP: 'ADPU',
  FSAB: 'ADBI',
  FSIK: 'SKOM',
  FSPE: 'IPEM',
  FSSO: 'SOSI',
  FSIP: 'PUST',
  FSKP: 'ASIP',
  FSSP: 'PAJA',
  FSSI: 'BING',
}

function getLegacyEquivalent(code: string): string | null {
  const prefix = code.substring(0, 4).toUpperCase()
  if (LEGACY_PREFIX_MAP[prefix]) {
    return LEGACY_PREFIX_MAP[prefix] + code.substring(4)
  }
  return null
}

export async function POST(req: Request) {
  let browser: any = null

  // Role Enforcement: Only Super Admin
  const token = cookies().get(ACCESS_COOKIE)?.value
  let isSuperAdmin = false

  if (token) {
    const session = await verifyAccessToken(token)
    if (session && (session.role === 'superadmin' || session.email === 'admin@kampus.ac.id')) {
      isSuperAdmin = true
    }
  }

  if (!isSuperAdmin) {
    const authHeader = req.headers.get('Authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const headerToken = authHeader.substring(7)
      const session = await verifyAccessToken(headerToken)
      if (session && (session.role === 'superadmin' || session.email === 'admin@kampus.ac.id')) {
        isSuperAdmin = true
      }
    }
  }

  if (!isSuperAdmin) {
    return NextResponse.json(
      { error: 'Akses ditolak: Hanya Super Admin yang dapat melakukan sinkronisasi peserta Tuton.' },
      { status: 403 }
    )
  }

  let body: any = {}
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  const masa = String(body.masa || '20261').trim()
  const prodiFilter = String(body.prodi || body.prodiCode || 'ALL').trim().toUpperCase()

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

        // 1. Fetch Auth Provider settings for Registrasi UT
        let provider = null
        if (body.providerId) {
          provider = await prisma.externalAuthProvider.findUnique({ where: { id: body.providerId } })
        }
        if (!provider) {
          provider = await prisma.externalAuthProvider.findFirst({
            where: {
              OR: [
                { name: { contains: 'Registrasi', mode: 'insensitive' } },
                { loginUrl: { contains: 'registrasi.ut.ac.id', mode: 'insensitive' } },
              ],
            },
          })
        }

        const loginUrl = provider?.loginUrl || 'https://registrasi.ut.ac.id/login'
        let username = ''
        let password = ''

        if (provider?.authPayloadJson) {
          try {
            const parsedPayload = JSON.parse(provider.authPayloadJson)
            username = parsedPayload.username || parsedPayload.email || parsedPayload.user || ''
            password = parsedPayload.password || parsedPayload.pass || ''
          } catch {}
        }

        if (body.username) username = body.username
        if (body.password) password = body.password

        // 2. Fetch Course List from PostgreSQL or JSON fallback
        let matkulList: { kodeMatkul: string; namaMatkul: string; sks: number; prodiCode: string; prodiName: string }[] = []

        try {
          const dbMatkul = await (prisma as any).prediksiKelas.findMany({
            where: { masa },
            select: { kodeMatkul: true, namaMatkul: true, sks: true, prodiCode: true, prodiName: true },
          })
          if (dbMatkul && dbMatkul.length > 0) {
            matkulList = dbMatkul
          }
        } catch {}

        if (matkulList.length === 0) {
          matkulList = (fhisipPrediksiData as any[]).map((m) => ({
            kodeMatkul: m.kodeMatkul,
            namaMatkul: m.namaMatkul,
            sks: m.sks || 3,
            prodiCode: m.prodiCode || 'FHISIP',
            prodiName: m.prodiName || 'FHISIP UT',
          }))
        }

        // Apply Prodi filter if specified
        if (prodiFilter !== 'ALL') {
          matkulList = matkulList.filter((m) => {
            const codeUpper = m.kodeMatkul.toUpperCase()
            const prodiUpper = m.prodiCode.toUpperCase()
            return prodiUpper === prodiFilter || codeUpper.startsWith(prodiFilter)
          })
        }

        send({
          type: 'progress',
          current: 0,
          total: matkulList.length,
          percentage: 0,
          itemLabel: 'Memulai peramban otomatis...',
          statusText: `Menghubungkan ke Portal Registrasi UT...`,
        })

        // 3. Launch Edge / Chromium Browser via Puppeteer
        const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
        const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
        const execPath = fs.existsSync(edgePath) ? edgePath : fs.existsSync(chromePath) ? chromePath : undefined

        if (!execPath) {
          send({ type: 'error', error: 'Gagal menemukan peramban web (Edge/Chrome) pada peladen.' })
          controller.close()
          return
        }

        browser = await puppeteer.launch({
          executablePath: execPath,
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--ignore-certificate-errors',
            '--disable-web-security',
          ],
        })

        const page = await browser.newPage()
        await page.setViewport({ width: 1280, height: 800 })

        // Login to UT Registrasi
        send({
          type: 'progress',
          current: 0,
          total: matkulList.length,
          percentage: 2,
          itemLabel: 'Otentikasi Login Portal Registrasi UT',
          statusText: `Login ke ${loginUrl}...`,
        })

        await page.goto(loginUrl, { waitUntil: 'networkidle2', timeout: 35000 })
        await page.type('input[name="username"]', username)
        await page.type('input[name="password"]', password)

        await Promise.all([
          page.click('button[type="submit"], .btn-login-main, input[type="submit"]'),
          page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 35000 }).catch(() => {}),
        ])

        // Ensure session is active on daftarmtkmhs
        await page.goto('https://registrasi.ut.ac.id/daftarmtkmhs', { waitUntil: 'networkidle2', timeout: 35000 })

        let successCount = 0
        const details: any[] = []

        // 4. Query student entries per course directly via the authenticated session
        for (let i = 0; i < matkulList.length; i++) {
          const item = matkulList[i]
          const kode = item.kodeMatkul.trim()
          const percentage = Math.round(((i + 1) / matkulList.length) * 100)

          send({
            type: 'progress',
            current: i + 1,
            total: matkulList.length,
            percentage,
            itemLabel: `${kode} — ${item.namaMatkul}`,
            statusText: `Mengambil data peserta Tuton ${kode} (${i + 1}/${matkulList.length})...`,
            successCount,
          })

          let totalTuton = 0
          let fetchedSuccessfully = false

          try {
            // Direct fetch inside the authenticated browser context to avoid slow DOM rendering
            const fetchResult = await page.evaluate(
              async (targetMasa: string, targetKode: string, prodiTarget: string, patterns: Record<string, string[]>) => {
                async function queryApi(c: string) {
                  const formData = new URLSearchParams()
                  formData.append('masa', targetMasa)
                  formData.append('mtk', c)

                  const res = await fetch('https://registrasi.ut.ac.id/DaftarMtkMhs/ajax_DaftarMhs/', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                      'X-Requested-With': 'XMLHttpRequest',
                    },
                    body: formData.toString(),
                  })
                  if (!res.ok) return []
                  const json = await res.json()
                  return Array.isArray(json) ? json : []
                }

                let rows = await queryApi(targetKode)

                if (rows.length === 0) {
                  return { success: true, count: 0, total: 0 }
                }

                const totalEntries = rows.length
                const searchKeys = patterns[prodiTarget] || []

                // Filter by prodi search keys (e.g. '321' for Hukum yields 18,336 from 25,145 entries)
                let filteredCount = 0
                if (searchKeys.length > 0) {
                  filteredCount = rows.filter((r: any) => {
                    const rowText = Object.values(r).join(' ').toLowerCase()
                    return searchKeys.some((k: string) => rowText.includes(k.toLowerCase()))
                  }).length
                }

                // Strictly take the filtered entries count if filtered, otherwise total entries
                const finalCount = filteredCount > 0 ? filteredCount : totalEntries
                return { success: true, count: finalCount, total: totalEntries, filteredCount }
              },
              masa,
              kode,
              prodiFilter !== 'ALL' ? prodiFilter : item.prodiCode,
              PRODI_SEARCH_TERMS
            )

            if (fetchResult && fetchResult.success) {
              if (fetchResult.count > 0) {
                totalTuton = fetchResult.count
                fetchedSuccessfully = true
              } else {
                // If 0, try legacy code fallback
                const legacyCode = getLegacyEquivalent(kode)
                if (legacyCode) {
                  const legacyResult = await page.evaluate(
                    async (targetMasa: string, targetKode: string, prodiTarget: string, patterns: Record<string, string[]>) => {
                      const formData = new URLSearchParams()
                      formData.append('masa', targetMasa)
                      formData.append('mtk', targetKode)

                      const res = await fetch('https://registrasi.ut.ac.id/DaftarMtkMhs/ajax_DaftarMhs/', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                          'X-Requested-With': 'XMLHttpRequest',
                        },
                        body: formData.toString(),
                      })
                      if (!res.ok) return { success: false, count: 0 }
                      const json = await res.json()
                      if (!Array.isArray(json) || json.length === 0) return { success: true, count: 0 }

                      const totalEntries = json.length
                      const searchKeys = patterns[prodiTarget] || []
                      let filteredCount = 0
                      if (searchKeys.length > 0) {
                        filteredCount = json.filter((r: any) => {
                          const rowText = Object.values(r).join(' ').toLowerCase()
                          return searchKeys.some((k: string) => rowText.includes(k.toLowerCase()))
                        }).length
                      }
                      const finalCount = filteredCount > 0 ? filteredCount : totalEntries
                      return { success: true, count: finalCount }
                    },
                    masa,
                    legacyCode,
                    prodiFilter !== 'ALL' ? prodiFilter : item.prodiCode,
                    PRODI_SEARCH_TERMS
                  )

                  if (legacyResult && legacyResult.count > 0) {
                    totalTuton = legacyResult.count
                    fetchedSuccessfully = true
                  }
                }
              }
            }
          } catch (err: any) {
            console.error(`[SYNC TUTON] Error on ${kode}:`, err?.message || err)
          }

          // Upsert to PostgreSQL database
          try {
            const existing = await (prisma as any).prediksiKelas.findUnique({
              where: { masa_kodeMatkul: { masa, kodeMatkul: kode } },
            })

            const sipasNonTtm = existing?.sipasNonTtm || 0
            const nonSipas = existing?.nonSipas || 0
            const ttmSipas = existing?.ttmSipas || 0

            // If fetched successfully, update with authentic extracted entries count
            const tutonCount = fetchedSuccessfully ? totalTuton : existing?.jumlahTuton || 0
            const totalMahasiswa = tutonCount > 0
              ? tutonCount
              : existing?.totalMahasiswa && existing.totalMahasiswa > 0
                ? existing.totalMahasiswa
                : (sipasNonTtm + nonSipas + ttmSipas + tutonCount) || 100
            const kebutuhanKelas = Math.ceil(totalMahasiswa / 50)
            const kebutuhanTutorMin = Math.ceil(kebutuhanKelas / 4)

            await (prisma as any).prediksiKelas.upsert({
              where: { masa_kodeMatkul: { masa, kodeMatkul: kode } },
              update: {
                jumlahTuton: tutonCount,
                tutonSipas: tutonCount,
                totalMahasiswa,
                kebutuhanKelas,
                kebutuhanTutorMin,
                updatedAt: new Date(),
              },
              create: {
                masa,
                kodeMatkul: kode,
                namaMatkul: item.namaMatkul,
                sks: item.sks,
                prodiCode: item.prodiCode,
                prodiName: item.prodiName,
                sipasNonTtm,
                nonSipas,
                ttmSipas,
                tutonSipas: tutonCount,
                jumlahTuton: tutonCount,
                totalMahasiswa,
                kebutuhanKelas,
                kebutuhanTutorMin,
              },
            })

            if (fetchedSuccessfully && tutonCount > 0) {
              successCount++
            }

            details.push({
              kodeMatkul: kode,
              namaMatkul: item.namaMatkul,
              jumlahTuton: tutonCount,
              success: fetchedSuccessfully,
            })
          } catch (dbErr: any) {
            console.error(`[SYNC DB] Error updating ${kode}:`, dbErr?.message || dbErr)
          }
        }

        send({
          type: 'complete',
          success: true,
          message: `Sinkronisasi selesai! Berhasil memperbarui data peserta Tuton untuk ${successCount} dari ${matkulList.length} mata kuliah.`,
          updatedCount: successCount,
          totalMatkul: matkulList.length,
          details,
        })
      } catch (error: any) {
        console.error('Failed sync tuton:', error)
        send({
          type: 'error',
          error: `Gagal melakukan sinkronisasi data peserta Tuton: ${error?.message || 'Server error'}`,
        })
      } finally {
        if (browser) {
          await browser.close().catch(() => {})
        }
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  })
}
