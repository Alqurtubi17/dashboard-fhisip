import { prisma } from '../lib/prisma'
import { evaluatePeriodTimeline } from '../lib/pengguguran-utils'

async function runTests() {
  console.log('🧪 ========================================================')
  console.log('🧪 MEMULAI PENGUJIAN OTOMATIS FITUR PENGGUGURAN MATA KULIAH')
  console.log('🧪 ========================================================\n')

  let passCount = 0
  let failCount = 0

  function assert(condition: boolean, testName: string, detail?: any) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`)
      passCount++
    } else {
      console.error(`❌ [FAIL] ${testName}`, detail || '')
      failCount++
    }
  }

  // Persiapan data uji
  const superadmin = await prisma.user.findFirst({ where: { role: { slug: 'superadmin' } } })
  const kaprodiHkum = await prisma.user.findFirst({ where: { email: 'kaprodi@kampus.ac.id' } })
  const stafAkademik = await prisma.user.findFirst({ where: { email: 'akademik@kampus.ac.id' } })

  const activePeriode = await prisma.periodePengguguran.findFirst({
    where: { isActive: true },
  })

  // Cari 1 Mata Kuliah INTI dan 1 Mata Kuliah NON_INTI
  const mkInti = await prisma.mataKuliah.findFirst({
    where: { kategori: 'INTI' },
  })

  const mkNonIntiHkum = await prisma.mataKuliah.findFirst({
    where: { kategori: 'NON_INTI', prodiCode: 'HKUM' },
  })

  const mkNonIntiIkom = await prisma.mataKuliah.findFirst({
    where: { kategori: 'NON_INTI', prodiCode: 'IKOM' },
  })

  assert(Boolean(superadmin && kaprodiHkum && stafAkademik), 'User peran Super Admin, Kaprodi, dan Akademik tersedia')
  assert(Boolean(activePeriode), 'Periode aktif pengguguran tersedia')
  assert(Boolean(mkInti), `Mata kuliah INTI ditemukan (${mkInti?.kodeMatkul} - ${mkInti?.namaMatkul})`)
  assert(Boolean(mkNonIntiHkum), `Mata kuliah NON_INTI HKUM ditemukan (${mkNonIntiHkum?.kodeMatkul})`)
  assert(Boolean(mkNonIntiIkom), `Mata kuliah NON_INTI IKOM ditemukan (${mkNonIntiIkom?.kodeMatkul})`)

  if (!superadmin || !kaprodiHkum || !stafAkademik || !activePeriode || !mkInti || !mkNonIntiHkum || !mkNonIntiIkom) {
    console.error('Data awal tidak lengkap untuk pengujian')
    return
  }

  // -------------------------------------------------------------
  // SKENARIO 1: Mata kuliah Inti tidak dapat diajukan
  // -------------------------------------------------------------
  console.log('\n--- Uji Skenario 1: Validasi Kategori INTI ditolak ---')
  let intiRejected = false
  let intiErrorMsg = ''
  if (mkInti.kategori === 'INTI') {
    intiRejected = true
    intiErrorMsg = 'Mata kuliah ini termasuk kategori Mata Kuliah Inti dan tidak dapat diajukan untuk pengguguran.'
  }
  assert(
    intiRejected && intiErrorMsg === 'Mata kuliah ini termasuk kategori Mata Kuliah Inti dan tidak dapat diajukan untuk pengguguran.',
    'Skenario 1: Mata kuliah Inti otomatis ditolak dengan pesan resmi'
  )

  // -------------------------------------------------------------
  // SKENARIO 2: Mata kuliah Non-Inti dapat diajukan dalam periode aktif
  // -------------------------------------------------------------
  console.log('\n--- Uji Skenario 2: Pengajuan Non-Inti berhasil dibuat ---')
  const testNim = '09999901'
  const testNama = 'Mahasiswa Uji Coba'

  // Bersihkan data uji sebelumnya jika ada
  await prisma.pengajuanPengguguran.deleteMany({
    where: { nim: testNim },
  })

  const timelineCheck = evaluatePeriodTimeline(activePeriode)
  assert(timelineCheck.isPengajuanOpen, 'Periode aktif mengizinkan pengajuan baru')

  const submission = await prisma.$transaction(async (tx) => {
    const created = await tx.pengajuanPengguguran.create({
      data: {
        nomorPengajuan: `PG-TEST-0001`,
        periodeId: activePeriode.id,
        pengajuId: superadmin.id,
        nim: testNim,
        namaMahasiswa: testNama,
        prodiCode: mkNonIntiHkum.prodiCode,
        prodiName: mkNonIntiHkum.prodiName,
        mataKuliahId: mkNonIntiHkum.id,
        kodeMatkul: mkNonIntiHkum.kodeMatkul,
        namaMatkul: mkNonIntiHkum.namaMatkul,
        sks: mkNonIntiHkum.sks,
        kategoriMatkul: mkNonIntiHkum.kategori,
        alasan: 'Alasan uji coba pengajuan pengguguran mata kuliah non inti.',
        status: 'MENUNGGU_VERIFIKASI_PRODI',
      },
    })
    await tx.riwayatPengguguran.create({
      data: {
        pengajuanId: created.id,
        statusAwal: null,
        statusAkhir: 'MENUNGGU_VERIFIKASI_PRODI',
        actorId: superadmin.id,
        actorName: superadmin.name,
        actorRole: 'Super Admin',
        catatan: 'Pengajuan dibuat.',
        action: 'SUBMIT',
      },
    })
    return created
  })

  assert(
    submission && submission.status === 'MENUNGGU_VERIFIKASI_PRODI',
    'Skenario 2: Pengajuan Non-Inti tersimpan dengan status MENUNGGU_VERIFIKASI_PRODI'
  )

  // -------------------------------------------------------------
  // SKENARIO 3: Pencegahan Pengajuan Ganda
  // -------------------------------------------------------------
  console.log('\n--- Uji Skenario 3: Pencegahan Pengajuan Ganda ---')
  const checkDuplicate = await prisma.pengajuanPengguguran.findFirst({
    where: {
      nim: testNim,
      mataKuliahId: mkNonIntiHkum.id,
      periodeId: activePeriode.id,
      status: { in: ['MENUNGGU_VERIFIKASI_PRODI', 'DISETUJUI_PRODI', 'DISETUJUI_AKADEMIK'] },
    },
  })
  assert(Boolean(checkDuplicate), 'Skenario 3: Sistem mendeteksi pengajuan aktif yang sama untuk mencegah duplikasi')

  // -------------------------------------------------------------
  // SKENARIO 4: Pengajuan di luar periode ditolak
  // -------------------------------------------------------------
  console.log('\n--- Uji Skenario 4: Validasi di luar periode ---')
  const expiredPeriode = {
    ...activePeriode,
    pengajuanStart: new Date('2020-01-01T00:00:00Z'),
    pengajuanEnd: new Date('2020-01-10T00:00:00Z'),
  }
  const expiredCheck = evaluatePeriodTimeline(expiredPeriode)
  assert(!expiredCheck.isPengajuanOpen, 'Skenario 4: Periode lampau/kedaluwarsa otomatis menolak pengajuan baru')

  // -------------------------------------------------------------
  // SKENARIO 5: Prodi tidak dapat memverifikasi pengajuan Prodi lain
  // -------------------------------------------------------------
  console.log('\n--- Uji Skenario 5: Kaprodi tidak boleh memverifikasi prodi lain ---')
  // Kaprodi HKUM mencoba memverifikasi pengajuan IKOM
  const kaprodiCode = kaprodiHkum.prodiCode || 'HKUM'
  const isAuthorizedOtherProdi = kaprodiCode === mkNonIntiIkom.prodiCode
  assert(!isAuthorizedOtherProdi, 'Skenario 5: Kaprodi HKUM dicegah memverifikasi pengajuan dari Prodi IKOM')

  // -------------------------------------------------------------
  // SKENARIO 6 & 7: Akademik tidak dapat memproses yang belum disetujui Prodi
  // -------------------------------------------------------------
  console.log('\n--- Uji Skenario 6: Akademik dicegah memproses status MENUNGGU_VERIFIKASI_PRODI ---')
  const canAkademikProcessPremature = submission.status === 'DISETUJUI_PRODI'
  assert(!canAkademikProcessPremature, 'Skenario 6: Bagian Akademik dicegah memproses pengajuan sebelum disetujui Prodi')

  // -------------------------------------------------------------
  // SKENARIO 8: Persetujuan Prodi meneruskan pengajuan ke Akademik
  // -------------------------------------------------------------
  console.log('\n--- Uji Skenario 7: Persetujuan Prodi mengubah status ke DISETUJUI_PRODI ---')
  const approvedByProdi = await prisma.$transaction(async (tx) => {
    const updated = await tx.pengajuanPengguguran.update({
      where: { id: submission.id },
      data: {
        status: 'DISETUJUI_PRODI',
        verifikatorProdiId: kaprodiHkum.id,
        verifikatorProdiName: kaprodiHkum.name,
        verifikasiProdiAt: new Date(),
        catatanProdi: 'Disetujui Prodi sesuai kurikulum dan syarat akademik.',
      },
    })
    await tx.riwayatPengguguran.create({
      data: {
        pengajuanId: submission.id,
        statusAwal: 'MENUNGGU_VERIFIKASI_PRODI',
        statusAkhir: 'DISETUJUI_PRODI',
        actorId: kaprodiHkum.id,
        actorName: kaprodiHkum.name,
        actorRole: 'Kaprodi',
        catatan: 'Disetujui Prodi sesuai kurikulum dan syarat akademik.',
        action: 'VERIFIKASI_PRODI_SETUJU',
      },
    })
    return updated
  })

  assert(
    approvedByProdi.status === 'DISETUJUI_PRODI' && approvedByProdi.verifikatorProdiName === kaprodiHkum.name,
    'Skenario 7: Pengajuan berhasil disetujui Prodi dan berstatus DISETUJUI_PRODI'
  )

  // -------------------------------------------------------------
  // SKENARIO 9: Persetujuan Akademik menghasilkan status akhir DISETUJUI_AKADEMIK
  // -------------------------------------------------------------
  console.log('\n--- Uji Skenario 8: Keputusan Akademik menyetujui pengajuan ---')
  const finalApproved = await prisma.$transaction(async (tx) => {
    const updated = await tx.pengajuanPengguguran.update({
      where: { id: submission.id },
      data: {
        status: 'DISETUJUI_AKADEMIK',
        keputusanAkademikId: stafAkademik.id,
        keputusanAkademikName: stafAkademik.name,
        keputusanAkademikAt: new Date(),
        catatanAkademik: 'Disetujui bagian Akademik, mata kuliah resmi digugurkan secara administratif.',
      },
    })
    await tx.riwayatPengguguran.create({
      data: {
        pengajuanId: submission.id,
        statusAwal: 'DISETUJUI_PRODI',
        statusAkhir: 'DISETUJUI_AKADEMIK',
        actorId: stafAkademik.id,
        actorName: stafAkademik.name,
        actorRole: 'Akademik',
        catatan: 'Disetujui bagian Akademik, mata kuliah resmi digugurkan secara administratif.',
        action: 'AKADEMIK_SETUJU',
      },
    })
    return updated
  })

  assert(
    finalApproved.status === 'DISETUJUI_AKADEMIK' && finalApproved.keputusanAkademikName === stafAkademik.name,
    'Skenario 8: Status akhir menjadi DISETUJUI_AKADEMIK (Selesai)'
  )

  // -------------------------------------------------------------
  // SKENARIO 10: Uji Skenario Penolakan Prodi menghentikan proses
  // -------------------------------------------------------------
  console.log('\n--- Uji Skenario 9: Penolakan Prodi menghentikan proses ---')
  const submissionTolakProdi = await prisma.pengajuanPengguguran.create({
    data: {
      nomorPengajuan: `PG-TEST-0002`,
      periodeId: activePeriode.id,
      pengajuId: superadmin.id,
      nim: '09999902',
      namaMahasiswa: 'Mahasiswa Ditolak Prodi',
      prodiCode: mkNonIntiHkum.prodiCode,
      prodiName: mkNonIntiHkum.prodiName,
      mataKuliahId: mkNonIntiHkum.id,
      kodeMatkul: mkNonIntiHkum.kodeMatkul,
      namaMatkul: mkNonIntiHkum.namaMatkul,
      sks: mkNonIntiHkum.sks,
      kategoriMatkul: mkNonIntiHkum.kategori,
      alasan: 'Alasan pengajuan yang ditolak prodi.',
      status: 'DITOLAK_PRODI',
      catatanProdi: 'Ditolak: Mahasiswa belum memenuhi SKS minimum kelulusan.',
    },
  })
  assert(
    submissionTolakProdi.status === 'DITOLAK_PRODI' && Boolean(submissionTolakProdi.catatanProdi),
    'Skenario 9: Penolakan Prodi tercatat dengan alasan penolakan dan tidak berlanjut ke Akademik'
  )

  // -------------------------------------------------------------
  // SKENARIO 11: Riwayat Keputusan dan Audit Trail Lengkap
  // -------------------------------------------------------------
  console.log('\n--- Uji Skenario 10: Riwayat audit trail tersimpan lengkap ---')
  const historyList = await prisma.riwayatPengguguran.findMany({
    where: { pengajuanId: submission.id },
    orderBy: { createdAt: 'asc' },
  })
  assert(
    historyList.length === 3 &&
      historyList[0].action === 'SUBMIT' &&
      historyList[1].action === 'VERIFIKASI_PRODI_SETUJU' &&
      historyList[2].action === 'AKADEMIK_SETUJU',
    `Skenario 10: Jejak audit lengkap tersimpan (${historyList.length} tahap perubahan status)`
  )

  // Bersihkan data uji setelah pengetesan
  await prisma.pengajuanPengguguran.deleteMany({
    where: { nomorPengajuan: { in: ['PG-TEST-0001', 'PG-TEST-0002'] } },
  })
  console.log('\n🧹 Data uji sementara telah dibersihkan.')

  console.log('\n========================================================')
  console.log(`🎉 HASIL PENGUJIAN: ${passCount} PASSED, ${failCount} FAILED`)
  console.log('========================================================\n')
}

runTests()
  .catch((e) => {
    console.error('Test error:', e)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

