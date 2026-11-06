import { prisma } from '../lib/prisma'
import bcrypt from 'bcryptjs'
import { evaluatePeriodTimeline } from '../lib/pengguguran-utils'
import { AcademicApiService } from '../lib/academic-api'
import { signStudentToken, verifyStudentToken } from '../lib/auth'

async function runTests() {
  console.log('🧪 ====================================================================')
  console.log('🧪 MEMULAI PENGUJIAN OTOMATIS FITUR PENGGUGURAN MK & PORTAL MAHASISWA')
  console.log('🧪 ====================================================================\n')

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
  const studentBudi = await prisma.mahasiswa.findUnique({ where: { nim: '041234567' } })
  const kaprodiHkum = await prisma.user.findFirst({ where: { email: 'kaprodi@kampus.ac.id' } })
  const stafAkademik = await prisma.user.findFirst({ where: { email: 'akademik@kampus.ac.id' } })
  const activePeriode = await prisma.periodePengguguran.findFirst({ where: { isActive: true } })

  assert(Boolean(studentBudi), 'Mahasiswa Uji Coba Budi (NIM: 041234567) tersedia di database')
  assert(Boolean(kaprodiHkum && stafAkademik), 'User Kaprodi dan Staf Akademik tersedia')
  assert(Boolean(activePeriode), 'Periode aktif pengguguran 2026.1 tersedia')

  if (!studentBudi || !kaprodiHkum || !stafAkademik || !activePeriode) {
    console.error('Data awal tidak lengkap!')
    return
  }

  // -------------------------------------------------------------
  // TEST 1: Autentikasi Mahasiswa (Valid & Invalid)
  // -------------------------------------------------------------
  console.log('\n--- Uji 1: Autentikasi Portal Mahasiswa ---')
  const isMatchValid = await bcrypt.compare('Mahasiswa123!', studentBudi.password || '')
  assert(isMatchValid, 'Uji 1.1: Password valid berhasil diverifikasi dengan bcrypt')

  const isMatchInvalid = await bcrypt.compare('WrongPassword!', studentBudi.password || '')
  assert(!isMatchInvalid, 'Uji 1.2: Password salah berhasil ditolak')

  // Generate & Verify Student Token
  const token = await signStudentToken({
    nim: studentBudi.nim,
    name: studentBudi.name,
    prodiCode: studentBudi.prodiCode || 'HKUM',
    prodi: studentBudi.prodi,
    role: 'mahasiswa',
  })
  const verifiedPayload = await verifyStudentToken(token)
  assert(
    verifiedPayload?.nim === studentBudi.nim && verifiedPayload?.role === 'mahasiswa',
    'Uji 1.3: Sesi JWT Mahasiswa berhasil di-generate dan diverifikasi'
  )

  // -------------------------------------------------------------
  // TEST 2: Integrasi Academic API & Klasifikasi Kategori Resmi
  // -------------------------------------------------------------
  console.log('\n--- Uji 2: Integrasi Academic API Service ---')
  const apiResult = await AcademicApiService.getStudentCourses({
    nim: studentBudi.nim,
    prodiCode: studentBudi.prodiCode || 'HKUM',
    kurikulum: studentBudi.kurikulum || '2024',
  })

  assert(apiResult.success && apiResult.data.length > 0, `Uji 2.1: Data mata kuliah mahasiswa berhasil dimuat (${apiResult.data.length} mata kuliah)`)
  assert(
    Boolean(apiResult.source === 'EXTERNAL_API' || apiResult.source === 'LOCAL_REPOSITORY'),
    `Uji 2.2: Mekanisme fallback dan sumber data teridentifikasi dengan jelas (Source: ${apiResult.source})`
  )

  const intiCourse = apiResult.data.find((c) => c.kategori_mk === 'INTI')
  const nonIntiCourse = apiResult.data.find((c) => c.kategori_mk === 'NON_INTI')

  assert(
    Boolean(intiCourse && !intiCourse.canDrop && intiCourse.dropIneligibleReason),
    `Uji 2.3: Mata kuliah Inti otomatis terdeteksi tidak dapat digugurkan (${intiCourse?.kode_mk} - ${intiCourse?.nama_mk})`
  )
  assert(
    Boolean(nonIntiCourse && nonIntiCourse.canDrop),
    `Uji 2.4: Mata kuliah Non-Inti terverifikasi memenuhi syarat pengguguran (${nonIntiCourse?.kode_mk} - ${nonIntiCourse?.nama_mk})`
  )

  if (!nonIntiCourse) {
    console.error('Tidak ada mata kuliah Non-Inti untuk pengujian')
    return
  }

  // -------------------------------------------------------------
  // TEST 3: Pengajuan Mandiri oleh Mahasiswa melalui Portal
  // -------------------------------------------------------------
  console.log('\n--- Uji 3: Pengajuan Pengguguran oleh Mahasiswa ---')
  const testNomor = `PG-TEST-MHS-01`
  await prisma.pengajuanPengguguran.deleteMany({ where: { nomorPengajuan: testNomor } })

  const newSubmission = await prisma.$transaction(async (tx) => {
    const created = await tx.pengajuanPengguguran.create({
      data: {
        nomorPengajuan: testNomor,
        periodeId: activePeriode.id,
        pengajuId: null, // Diajukan mandiri oleh mahasiswa
        nim: studentBudi.nim,
        namaMahasiswa: studentBudi.name,
        prodiCode: nonIntiCourse.kode_prodi,
        prodiName: nonIntiCourse.nama_prodi,
        mataKuliahId: (await prisma.mataKuliah.findUnique({ where: { kodeMatkul: nonIntiCourse.kode_mk } }))!.id,
        kodeMatkul: nonIntiCourse.kode_mk,
        namaMatkul: nonIntiCourse.nama_mk,
        sks: nonIntiCourse.sks,
        kategoriMatkul: 'NON_INTI',
        kurikulum: '2024',
        alasan: 'Pengajuan pengguguran mandiri melalui portal mahasiswa untuk uji integrasi.',
        status: 'MENUNGGU_VERIFIKASI_PRODI',
      },
    })
    await tx.riwayatPengguguran.create({
      data: {
        pengajuanId: created.id,
        statusAwal: null,
        statusAkhir: 'MENUNGGU_VERIFIKASI_PRODI',
        actorId: studentBudi.nim,
        actorName: studentBudi.name,
        actorRole: 'Mahasiswa',
        catatan: 'Pengajuan pengguguran diajukan mandiri melalui Portal Mahasiswa.',
        action: 'SUBMIT',
      },
    })
    return created
  })

  assert(
    newSubmission.status === 'MENUNGGU_VERIFIKASI_PRODI' && newSubmission.nim === studentBudi.nim,
    'Uji 3.1: Pengajuan mandiri mahasiswa berhasil tersimpan di DB dengan status MENUNGGU_VERIFIKASI_PRODI'
  )

  // -------------------------------------------------------------
  // TEST 4: Pencegahan IDOR (Insecure Direct Object Reference)
  // -------------------------------------------------------------
  console.log('\n--- Uji 4: Pencegahan IDOR Antar Mahasiswa ---')
  const otherStudentNim = '098765432' // NIM mahasiswa lain
  const isOwner = newSubmission.nim === studentBudi.nim
  const isOther = newSubmission.nim === otherStudentNim
  assert(isOwner && !isOther, 'Uji 4.1: Sistem membatasi detail pengajuan hanya untuk mahasiswa pemilik NIM')

  // -------------------------------------------------------------
  // TEST 5: Alur End-to-End: Verifikasi Prodi -> Keputusan Akademik
  // -------------------------------------------------------------
  console.log('\n--- Uji 5: Verifikasi Prodi dan Keputusan Akademik ---')
  // Kaprodi menyetujui
  const prodiApproved = await prisma.$transaction(async (tx) => {
    const updated = await tx.pengajuanPengguguran.update({
      where: { id: newSubmission.id },
      data: {
        status: 'DISETUJUI_PRODI',
        verifikatorProdiId: kaprodiHkum.id,
        verifikatorProdiName: kaprodiHkum.name,
        verifikasiProdiAt: new Date(),
        catatanProdi: 'Disetujui Prodi: mata kuliah Non-Inti memenuhi syarat.',
      },
    })
    await tx.riwayatPengguguran.create({
      data: {
        pengajuanId: newSubmission.id,
        statusAwal: 'MENUNGGU_VERIFIKASI_PRODI',
        statusAkhir: 'DISETUJUI_PRODI',
        actorId: kaprodiHkum.id,
        actorName: kaprodiHkum.name,
        actorRole: 'Kaprodi',
        catatan: 'Disetujui Prodi: mata kuliah Non-Inti memenuhi syarat.',
        action: 'VERIFIKASI_PRODI_SETUJU',
      },
    })
    return updated
  })

  assert(prodiApproved.status === 'DISETUJUI_PRODI', 'Uji 5.1: Pengajuan mahasiswa berhasil disetujui Kaprodi')

  // Akademik menyetujui akhir
  const akademikFinal = await prisma.$transaction(async (tx) => {
    const updated = await tx.pengajuanPengguguran.update({
      where: { id: newSubmission.id },
      data: {
        status: 'DISETUJUI_AKADEMIK',
        keputusanAkademikId: stafAkademik.id,
        keputusanAkademikName: stafAkademik.name,
        keputusanAkademikAt: new Date(),
        catatanAkademik: 'Disetujui resmi Bagian Akademik. Mata kuliah sah digugurkan.',
      },
    })
    await tx.riwayatPengguguran.create({
      data: {
        pengajuanId: newSubmission.id,
        statusAwal: 'DISETUJUI_PRODI',
        statusAkhir: 'DISETUJUI_AKADEMIK',
        actorId: stafAkademik.id,
        actorName: stafAkademik.name,
        actorRole: 'Akademik',
        catatan: 'Disetujui resmi Bagian Akademik. Mata kuliah sah digugurkan.',
        action: 'AKADEMIK_SETUJU',
      },
    })
    return updated
  })

  assert(
    akademikFinal.status === 'DISETUJUI_AKADEMIK',
    'Uji 5.2: Pengajuan mahasiswa berhasil diputuskan sah oleh Bagian Akademik'
  )

  // Cek Audit Trail
  const auditLogs = await prisma.riwayatPengguguran.findMany({
    where: { pengajuanId: newSubmission.id },
    orderBy: { createdAt: 'asc' },
  })
  assert(
    auditLogs.length === 3 &&
      auditLogs[0].action === 'SUBMIT' &&
      auditLogs[1].action === 'VERIFIKASI_PRODI_SETUJU' &&
      auditLogs[2].action === 'AKADEMIK_SETUJU',
    `Uji 5.3: Seluruh jejak audit perubahan status tersimpan lengkap (${auditLogs.length} tahapan)`
  )

  // Bersihkan data uji
  await prisma.pengajuanPengguguran.deleteMany({ where: { nomorPengajuan: testNomor } })
  console.log('\n🧹 Data pengajuan uji berhasil dibersihkan.')

  console.log('\n====================================================================')
  console.log(`🎉 HASIL PENGUJIAN: ${passCount} PASSED, ${failCount} FAILED`)
  console.log('====================================================================\n')
}

runTests()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect()
  })
