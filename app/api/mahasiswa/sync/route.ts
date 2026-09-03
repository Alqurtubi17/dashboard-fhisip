import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyAccessToken, ACCESS_COOKIE } from '@/lib/auth'
import { getExternalToken } from '@/lib/external-auth'
import { extractSemester } from '@/lib/mahasiswa-utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(req: Request) {
  // 1. Role Enforcement: Only Super Admin can sync
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
      { error: 'Akses ditolak: Hanya Super Admin yang diizinkan melakukan sinkronisasi data ke database.' },
      { status: 403 }
    )
  }

  let body: any = {}
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

        send({
          type: 'progress',
          current: 0,
          total: 100,
          percentage: 0,
          itemLabel: 'Mendapatkan Token Otentikasi SRS API...',
          statusText: 'Menghubungkan ke API SRS UT...',
        })

        // Get API Provider token directly for rock-solid connection
        const apiConfig = await prisma.apiConfig.findUnique({ where: { code: 'H_HSRE6NTWU' } })
        const providerId = apiConfig?.providerId || 'cms2xftc200005b3u3qzeqr8l'
        const tokenRes = await getExternalToken(providerId)

        if (!tokenRes.success || !tokenRes.token) {
          send({
            type: 'error',
            error: `Gagal otentikasi API SRS: ${tokenRes.error || 'Token tidak valid'}`,
          })
          controller.close()
          return
        }

        const currentDbCount = await (prisma as any).mahasiswa.count()

        const isAll = body.pages === 'all'
        const pagesToSync = isAll ? 2000 : Math.min(Math.max(1, Number(body.pages) || 5), 2000)
        const limitPerPage = Math.min(Math.max(1000, Number(body.limit) || 5000), 5000)

        // SRS API uses 1-based page indexing (Page 1 is the first page)
        let startPage = 1
        if (body.startPage !== undefined && body.startPage !== null) {
          startPage = Math.max(1, Number(body.startPage))
        } else if (currentDbCount > 0) {
          startPage = Math.floor(currentDbCount / limitPerPage) + 1
        }

        let totalSyncedInRun = 0
        const concurrency = 3

        for (let chunkStart = 0; chunkStart < pagesToSync; chunkStart += concurrency) {
          const chunkPages = Array.from(
            { length: Math.min(concurrency, pagesToSync - chunkStart) },
            (_, i) => startPage + chunkStart + i
          )

          const percentage = Math.min(99, Math.round((Math.min(chunkStart + concurrency, pagesToSync) / pagesToSync) * 100))

          send({
            type: 'progress',
            current: chunkPages[chunkPages.length - 1],
            total: startPage + pagesToSync - 1,
            percentage,
            itemLabel: `Halaman SRS API #${chunkPages[0]} s/d #${chunkPages[chunkPages.length - 1]}`,
            statusText: `Mengunduh data mahasiswa paralel (+${totalSyncedInRun.toLocaleString('id-ID')} tersimpan)...`,
            syncedCount: totalSyncedInRun,
          })

          const parallelFetchResults = await Promise.all(
            chunkPages.map(async (pageIdx) => {
              const maxRetries = 2
              for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                  const url = new URL(apiConfig?.targetUrl || 'https://api-mahasiswa-srs.ut.ac.id/api-srs-mahasiswa/v1/data-pribadi')
                  url.searchParams.set('limit', String(limitPerPage))
                  url.searchParams.set('page', String(pageIdx))

                  const res = await fetch(url.toString(), {
                    headers: {
                      'Content-Type': 'application/json',
                      [tokenRes.headerName]: `${tokenRes.headerPrefix}${tokenRes.token}`,
                    },
                  })

                  if (!res.ok) {
                    if (attempt < maxRetries) {
                      await new Promise((r) => setTimeout(r, 1000))
                      continue
                    }
                    return []
                  }
                  const json = await res.json()
                  return json.data?.dataPribadi || json.data?.items || json.data || []
                } catch (e: any) {
                  if (attempt < maxRetries) {
                    await new Promise((r) => setTimeout(r, 1000))
                    continue
                  }
                  return []
                }
              }
              return []
            })
          )

          const chunkRawItems = parallelFetchResults.flat()
          if (chunkRawItems.length === 0) {
            break
          }

          const mappedItems = chunkRawItems.map((item: any) => ({
            nim: String(item.nim || '').trim(),
            name: String(item.nama_mahasiswa || item.name || 'Mahasiswa UT').trim(),
            prodi: String(
              item.info_ut?.program_studi?.nama_program_studi ||
                item.nama_program_studi ||
                item.prodi ||
                'FHISIP'
            ).trim(),
            prodiCode: item.info_ut?.program_studi?.kode_program_studi || null,
            semester: extractSemester(item),
            status: String(item.status_data_pribadi?.keterangan || item.status || 'Aktif').trim(),
            ipk: String(item.info_alih_kredit?.ipk_dp || item.ipk || '3.50').trim(),
            phone:
              item.info_kontak?.nomor_hp_mahasiswa && item.info_kontak.nomor_hp_mahasiswa !== '-'
                ? String(item.info_kontak.nomor_hp_mahasiswa).trim()
                : item.info_kontak?.nomor_telepon_mahasiswa && item.info_kontak.nomor_telepon_mahasiswa !== '-'
                ? String(item.info_kontak.nomor_telepon_mahasiswa).trim()
                : null,
            email:
              item.info_kontak?.alamat_email_mahasiswa && item.info_kontak.alamat_email_mahasiswa !== '-'
                ? String(item.info_kontak.alamat_email_mahasiswa).trim()
                : item.info_kontak?.alamat_email_alternatif && item.info_kontak.alamat_email_alternatif !== '-'
                ? String(item.info_kontak.alamat_email_alternatif).trim()
                : null,
          }))

          // Deduplicate NIMs
          const uniqueNimMap = new Map<string, typeof mappedItems[0]>()
          for (const item of mappedItems) {
            uniqueNimMap.set(item.nim, item)
          }
          const deduplicatedItems = Array.from(uniqueNimMap.values())

          // Bulk upsert in chunks of 100
          const upsertBatchSize = 100
          for (let i = 0; i < deduplicatedItems.length; i += upsertBatchSize) {
            const batch = deduplicatedItems.slice(i, i + upsertBatchSize)
            await Promise.all(
              batch.map((st) =>
                (prisma as any).mahasiswa.upsert({
                  where: { nim: st.nim },
                  update: {
                    name: st.name,
                    prodi: st.prodi,
                    prodiCode: st.prodiCode,
                    semester: st.semester,
                    status: st.status,
                    ipk: st.ipk,
                    phone: st.phone,
                    email: st.email,
                    syncedAt: new Date(),
                  },
                  create: {
                    nim: st.nim,
                    name: st.name,
                    prodi: st.prodi,
                    prodiCode: st.prodiCode,
                    semester: st.semester,
                    status: st.status,
                    ipk: st.ipk,
                    phone: st.phone,
                    email: st.email,
                    syncedAt: new Date(),
                  },
                })
              )
            )
          }

          totalSyncedInRun += mappedItems.length
        }

        const totalInDb = await (prisma as any).mahasiswa.count()

        send({
          type: 'complete',
          success: true,
          percentage: 100,
          message: `Sinkronisasi berhasil! +${totalSyncedInRun.toLocaleString('id-ID')} rekaman data baru telah diperbarui. Total data terdaftar di PostgreSQL: ${totalInDb.toLocaleString('id-ID')}.`,
          syncedCount: totalSyncedInRun,
          totalInDb,
        })
      } catch (error: any) {
        console.error('Failed parallel sync mahasiswa:', error)
        send({
          type: 'error',
          error: 'Gagal memperbarui data karena gangguan koneksi server. Silakan coba beberapa saat lagi.',
        })
      } finally {
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
