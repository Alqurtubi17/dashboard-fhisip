import { prisma } from './prisma'
import { getExternalToken } from './external-auth'

// Interval pembaruan token SRS: 20 menit (20 * 60 * 1000 ms)
const SRS_REFRESH_INTERVAL_MS = 20 * 60 * 1000

/**
 * Memperbarui token khusus untuk penyedia API SRS (Sistem Registrasi Mahasiswa UT).
 * Sesuai instruksi: Khusus token SRS yang diperbarui secara berkala tiap 20 menit,
 * sedangkan token FHISIP dan Registrasi tetap mengikuti pengaturan default sistem (on-demand saat kadaluarsa).
 */
export async function refreshSrsToken(): Promise<void> {
  try {
    // 1. Identifikasi penyedia akun SRS
    const srsProviders = await prisma.externalAuthProvider.findMany({
      where: {
        OR: [
          { name: { contains: 'SRS', mode: 'insensitive' } },
          { loginUrl: { contains: 'srs', mode: 'insensitive' } },
        ],
      },
    })

    if (srsProviders.length === 0) {
      return
    }

    for (const provider of srsProviders) {
      // Pastikan bukan portal registrasi biasa
      const isRegistrasiOnly =
        provider.loginUrl.includes('registrasi.ut.ac.id') &&
        !provider.name.toUpperCase().includes('SRS')

      if (isRegistrasiOnly) {
        continue
      }

      const timestamp = new Date().toLocaleTimeString('id-ID', { hour12: false })
      console.log(`[SRS SCHEDULER] [${timestamp}] Memperbarui token SRS "${provider.name}"...`)

      // Paksa penyegaran token ke endpoint login SRS
      const tokenResult = await getExternalToken(provider.id, true)

      if (tokenResult.success && tokenResult.token) {
        console.log(
          `[SRS SCHEDULER] [${timestamp}] ✅ Token SRS "${provider.name}" berhasil diperbarui! Kadaluarsa: ${tokenResult.expiresAt || 'N/A'}`
        )
      } else {
        console.warn(
          `[SRS SCHEDULER] [${timestamp}] ⚠️ Gagal memperbarui token SRS "${provider.name}":`,
          tokenResult.error || 'Respon login tidak valid'
        )
      }
    }
  } catch (err: any) {
    console.error('[SRS SCHEDULER] Terjadi kesalahan saat memperbarui token SRS:', err?.message || err)
  }
}

/**
 * Memastikan background scheduler aktif di runtime Node.js saat aplikasi berjalan.
 * Idempotent: timer hanya dibuat 1 kali dan berjalan tiap 20 menit.
 */
export function ensureSrsTokenSchedulerStarted(): void {
  const globalRef = globalThis as unknown as {
    __srsTokenSchedulerStarted?: boolean
    __srsTokenTimer?: NodeJS.Timeout
  }

  if (globalRef.__srsTokenSchedulerStarted) {
    return
  }

  globalRef.__srsTokenSchedulerStarted = true
  console.log('⚡ [SRS SCHEDULER] Penjadwal pembaruan token SRS otomatis aktif (interval: 20 menit).')

  // Jalankan penyegaran pertama setelah jeda singkat (5 detik) saat server mulai berjalan
  setTimeout(() => {
    refreshSrsToken().catch((err) => {
      console.warn('[SRS SCHEDULER] Inisialisasi awal token SRS:', err?.message || err)
    })
  }, 5000)

  // Jadwalkan eksekusi berulang tiap 20 menit
  globalRef.__srsTokenTimer = setInterval(() => {
    refreshSrsToken().catch((err) => {
      console.error('[SRS SCHEDULER] Eksekusi berkala token SRS:', err?.message || err)
    })
  }, SRS_REFRESH_INTERVAL_MS)

  if (globalRef.__srsTokenTimer && typeof globalRef.__srsTokenTimer.unref === 'function') {
    globalRef.__srsTokenTimer.unref()
  }
}
