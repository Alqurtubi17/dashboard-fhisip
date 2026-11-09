import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyAccessToken, ACCESS_COOKIE } from '@/lib/auth'
import fhisipPrediksiData from '@/data/fhisip-prediksi-kelas.json'
import puppeteer from 'puppeteer-core'
import fs from 'fs'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const PRODI_NUMERIC_MAP: Record<string, string> = {
  FSIH: '311', // S1 Ilmu Hukum (FSIH4101, FSIH4201...)
  HKUM: '311',
  FSAP: '310', // S1 Administrasi Publik
  ADPU: '310',
  FSAB: '312', // S1 Administrasi Bisnis
  ADBI: '312',
  FSIK: '318', // S1 Ilmu Komunikasi
  IKOM: '318',
  FSIP: '317', // S1 Ilmu Pemerintahan
  IPEM: '317',
  FSSO: '319', // S1 Sosiologi
  SOSI: '319',
  FSKP: '314', // S1 Perpustakaan / Kearsipan
  PUS: '314',
  FSTX: '315', // S1/D3 Perpajakan
  PAJAK: '315',
  FSAG: '316', // S1 Sastra Inggris
  SING: '316',
}

function getSemesterFromCourse(kodeMatkul: string): number {
  const match = kodeMatkul.match(/[A-Z]{3,4}(\d)(\d)/i)
  if (match && match[2]) {
    const sem = parseInt(match[2], 10)
    if (!isNaN(sem) && sem >= 1 && sem <= 8) return sem
  }
  return 1
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
        const prodiFilter = String(body.prodi || body.prodiCode || 'ALL').trim().toUpperCase()
        if (prodiFilter !== 'ALL') {
          matkulList = matkulList.filter((m) => {
            const codeUpper = m.kodeMatkul.toUpperCase()
            const prodiUpper = m.prodiCode.toUpperCase()
            const numericCode = PRODI_NUMERIC_MAP[codeUpper.substring(0, 4)] || PRODI_NUMERIC_MAP[prodiUpper] || ''
            const targetNumeric = PRODI_NUMERIC_MAP[prodiFilter] || prodiFilter

            return (
              prodiUpper === prodiFilter ||
              codeUpper.startsWith(prodiFilter) ||
              (numericCode && targetNumeric && numericCode === targetNumeric)
            )
          })
        }

        // Apply Semester filter if specified
        const semesterFilter = String(body.semester || 'ALL').trim().toUpperCase()
        if (semesterFilter !== 'ALL') {
          matkulList = matkulList.filter((m) => {
            const sem = getSemesterFromCourse(m.kodeMatkul)
            if (semesterFilter === 'GANJIL') return sem % 2 !== 0
            if (semesterFilter === 'GENAP') return sem % 2 === 0
            const parsedSem = parseInt(semesterFilter, 10)
            return !isNaN(parsedSem) ? sem === parsedSem : true
          })
        }

        send({
          type: 'progress',
          current: 0,
          total: matkulList.length,
          percentage: 0,
          itemLabel: 'Memulai peramban otomatis...',
          statusText: `Menyiapkan koneksi ke Portal Registrasi UT...`,
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

        // Step A: Login Page
        send({
          type: 'progress',
          current: 0,
          total: matkulList.length,
          percentage: 2,
          itemLabel: 'Otentikasi Login Portal',
          statusText: `Login ke ${loginUrl}...`,
        })

        await page.goto(loginUrl, { waitUntil: 'networkidle2', timeout: 35000 })
        await page.type('input[name="username"]', username)
        await page.type('input[name="password"]', password)

        await Promise.all([
          page.click('button[type="submit"], .btn-login-main, input[type="submit"]'),
          page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 35000 }).catch(() => {}),
        ])

        // Step B: Navigate to daftarmtkmhs page
        send({
          type: 'progress',
          current: 0,
          total: matkulList.length,
          percentage: 5,
          itemLabel: 'Membuka Daftar Mhs Per MTK',
          statusText: `Membuka halaman daftarmtkmhs...`,
        })

        await page.goto('https://registrasi.ut.ac.id/daftarmtkmhs', { waitUntil: 'networkidle2', timeout: 35000 })

        let successCount = 0
        const details: any[] = []

        // 4. Scrape Tuton entries per course code
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
            await page.goto('https://registrasi.ut.ac.id/daftarmtkmhs', { waitUntil: 'networkidle2' }).catch(() => {})

            // Select masa if available
            await page.select('select[name="masa"]', masa).catch(() => {})

            // Clear and type course code
            await page.evaluate(() => {
              const input = document.querySelector('#mtk, input[name="mtk"]') as HTMLInputElement | null
              if (input) input.value = ''
            }).catch(() => {})

            await page.type('#mtk, input[name="mtk"]', kode)

            await Promise.all([
              page.click('input[name="pencarian"], button[type="submit"]'),
              page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {}),
            ])

            // Wait 1.5 seconds for initial search results
            await new Promise((r) => setTimeout(r, 1500))

            // Step: Search DataTables by Prodi Code or Semester only if explicitly requested
            const countMode = String(body.countMode || 'total').trim().toLowerCase()
            const shouldFilterTable = Boolean(body.applyProdiFilter || body.prodiSearch || countMode === 'filtered')
            const prefix4 = item.kodeMatkul.trim().substring(0, 4).toUpperCase()
            const prodiQuery = (body.prodiSearch || PRODI_NUMERIC_MAP[prefix4] || PRODI_NUMERIC_MAP[item.prodiCode.toUpperCase()] || item.prodiCode).trim()
            
            if (shouldFilterTable && prodiQuery) {
              try {
                const dtSearchInput = await page.$('input[type="search"][aria-controls="mytable4"], input[type="search"], div.dataTables_filter input')
                if (dtSearchInput) {
                  await page.evaluate((pq: string) => {
                    const input = document.querySelector('input[type="search"][aria-controls="mytable4"], input[type="search"], div.dataTables_filter input') as HTMLInputElement | null
                    if (input) {
                      input.value = pq
                      input.dispatchEvent(new Event('input', { bubbles: true }))
                      input.dispatchEvent(new Event('keyup', { bubbles: true }))
                      input.dispatchEvent(new Event('change', { bubbles: true }))
                    }
                  }, prodiQuery)

                  await dtSearchInput.click()
                  await page.keyboard.down('Control')
                  await page.keyboard.press('A')
                  await page.keyboard.up('Control')
                  await page.keyboard.press('Backspace')
                  await dtSearchInput.type(prodiQuery)
                  await page.keyboard.press('Enter')
                  await page.evaluate((pq: string) => {
                    const input = document.querySelector('input[type="search"][aria-controls="mytable4"], input[type="search"], div.dataTables_filter input') as HTMLInputElement | null
                    if (input) {
                      input.dispatchEvent(new Event('input', { bubbles: true }))
                      input.dispatchEvent(new Event('keyup', { bubbles: true }))
                      input.dispatchEvent(new Event('change', { bubbles: true }))
                    }
                  }, prodiQuery)
                  await new Promise((r) => setTimeout(r, 2000))
                }
              } catch {}
            }

            // Parse DataTables entries count:
            // Handles both "Showing 1 to 10 of 18,336 entries (filtered from 25,145 total entries)"
            // and Indonesian "Menampilkan 1 sampai 10 dari 18.336 entri (disaring dari 25.145 total entri)"
            // as well as plain unfiltered "Showing 1 to 10 of 25,145 entries"
            const resData = await page.evaluate((mode: string) => {
              const info = document.querySelector('#mytable4_info, .dataTables_info')
              if (info && info.textContent) {
                const text = info.textContent

                // 1. Total entries (e.g. "... filtered from 25,145 total entries" or "... disaring dari 25.145 total entri")
                let totalCount: number | null = null
                const totalMatch = text.match(/(?:filtered\s+from|disaring\s+dari)\s+([\d,.]+)\s+(?:total\s+entries|total\s+entri)/i)
                if (totalMatch && totalMatch[1]) {
                  totalCount = parseInt(totalMatch[1].replace(/[,.\s]/g, ''), 10)
                }

                // 2. Filtered entries (e.g. "of 18,336 entries" or "dari 18.336 entri")
                let filteredCount: number | null = null
                const filteredMatch = text.match(/(?:of|dari)\s+([\d,.]+)\s+(?:entries|entri)/i)
                if (filteredMatch && filteredMatch[1]) {
                  filteredCount = parseInt(filteredMatch[1].replace(/[,.\s]/g, ''), 10)
                }

                // If not filtered, "of X entries" is itself the total count
                if (totalCount === null && filteredCount !== null) {
                  totalCount = filteredCount
                }

                // User requested total count (e.g. 25,145)
                if (mode === 'total') {
                  return totalCount !== null ? totalCount : filteredCount
                }

                // User requested filtered count (e.g. 18,336)
                if (mode === 'filtered') {
                  return filteredCount !== null ? filteredCount : totalCount
                }

                // Default: use total count so real student enrollment is not truncated
                return totalCount !== null ? totalCount : filteredCount
              }
              return null
            }, countMode)

            if (resData !== null) {
              totalTuton = resData
              fetchedSuccessfully = true
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

            if (fetchedSuccessfully) {
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
