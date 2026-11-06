import { prisma } from '../lib/prisma'
import bcrypt from 'bcryptjs'

async function main() {
  console.log('🌱 Seeding Pengguguran Mata Kuliah Module...')

  // 1. Ensure Menu Entry exists under 'Akademik'
  const akademikMenu = await prisma.menu.findFirst({
    where: { name: 'Akademik', parentId: null },
  })

  if (akademikMenu) {
    const existingPengguguranMenu = await prisma.menu.findFirst({
      where: {
        parentId: akademikMenu.id,
        url: '/akademik/pengguguran',
      },
    })

    if (!existingPengguguranMenu) {
      await prisma.menu.create({
        data: {
          name: 'Pengguguran Mata Kuliah',
          icon: 'BookX',
          url: '/akademik/pengguguran',
          permissionKey: 'akademik.view',
          sort: 3,
          parentId: akademikMenu.id,
        },
      })
      console.log('✅ Menu "Pengguguran Mata Kuliah" created under Akademik.')
    } else {
      console.log('ℹ️ Menu "Pengguguran Mata Kuliah" already exists.')
    }
  }

  // 2. Populate Master MataKuliah from PrediksiKelas if empty
  const countMataKuliah = await prisma.mataKuliah.count()
  if (countMataKuliah === 0) {
    console.log('📚 Importing master mata kuliah from PrediksiKelas...')
    const prediksiList = await prisma.prediksiKelas.findMany({
      select: {
        kodeMatkul: true,
        namaMatkul: true,
        sks: true,
        prodiCode: true,
        prodiName: true,
      },
    })

    // Deduplicate by kodeMatkul
    const uniqueMap = new Map<string, typeof prediksiList[0]>()
    for (const p of prediksiList) {
      if (!uniqueMap.has(p.kodeMatkul)) {
        uniqueMap.set(p.kodeMatkul, p)
      }
    }

    let createdCount = 0
    for (const item of Array.from(uniqueMap.values())) {
      // Logic for INTI vs NON_INTI:
      // Courses with "Pengantar", "Dasar", or certain introductory codes are marked INTI (Core),
      // others are NON_INTI (Elective / Non-Core).
      const isCore =
        item.kodeMatkul.endsWith('4101') ||
        item.namaMatkul.toLowerCase().includes('pengantar') ||
        item.namaMatkul.toLowerCase().includes('pancasila') ||
        item.namaMatkul.toLowerCase().includes('dasar') ||
        item.namaMatkul.toLowerCase().includes('metode penelitian')

      await prisma.mataKuliah.create({
        data: {
          kodeMatkul: item.kodeMatkul,
          namaMatkul: item.namaMatkul,
          sks: item.sks,
          prodiCode: item.prodiCode,
          prodiName: item.prodiName,
          kategori: isCore ? 'INTI' : 'NON_INTI',
          isActive: true,
        },
      })
      createdCount++
    }
    console.log(`✅ ${createdCount} Master Mata Kuliah imported.`)
  } else {
    console.log(`ℹ️ ${countMataKuliah} Mata Kuliah already in database.`)
  }

  // 3. Ensure an active PeriodePengguguran exists for 2026.1
  const existingPeriode = await prisma.periodePengguguran.findFirst({
    where: { semester: '20261' },
  })

  if (!existingPeriode) {
    const now = new Date()
    // Current date is 2026-11-06
    const pStart = new Date('2026-11-01T00:00:00+07:00')
    const pEnd = new Date('2026-12-15T23:59:59+07:00')
    const vStart = new Date('2026-11-01T00:00:00+07:00')
    const vEnd = new Date('2026-12-20T23:59:59+07:00')
    const aStart = new Date('2026-11-01T00:00:00+07:00')
    const aEnd = new Date('2026-12-25T23:59:59+07:00')
    const annDate = new Date('2026-12-28T00:00:00+07:00')

    await prisma.periodePengguguran.create({
      data: {
        semester: '20261',
        tahunAkademik: '2026/2027 Ganjil',
        nama: 'Periode Pengguguran Mata Kuliah Semester 2026.1',
        isActive: true,
        pengajuanStart: pStart,
        pengajuanEnd: pEnd,
        verifikasiProdiStart: vStart,
        verifikasiProdiEnd: vEnd,
        keputusanAkademikStart: aStart,
        keputusanAkademikEnd: aEnd,
        pengumumanDate: annDate,
        keterangan: 'Periode resmi pengajuan pengguguran mata kuliah Non-Inti semester ganjil 2026/2027.',
      },
    })
    console.log('✅ Active Periode Pengguguran 2026.1 created.')
  } else {
    console.log('ℹ️ Periode Pengguguran 2026.1 already exists.')
  }

  // 4. Update kaprodi sample user prodiCode to 'HKUM' if not set
  await prisma.user.updateMany({
    where: { email: 'kaprodi@kampus.ac.id', prodiCode: null },
    data: { prodiCode: 'HKUM' },
  })
  console.log('✅ Kaprodi sample user linked to prodiCode HKUM.')

  // 5. Seed / Update sample Mahasiswa portal accounts with hashed password
  const defaultStudentHash = await bcrypt.hash('Mahasiswa123!', 10)
  await prisma.mahasiswa.upsert({
    where: { nim: '041234567' },
    update: { password: defaultStudentHash, prodiCode: 'HKUM' },
    create: {
      nim: '041234567',
      name: 'Budi Pratama (Mahasiswa HKUM)',
      prodi: 'S1 Ilmu Hukum',
      prodiCode: 'HKUM',
      semester: 4,
      status: 'Aktif',
      ipk: '3.65',
      email: 'budi.pratama@mahasiswa.ut.ac.id',
      password: defaultStudentHash,
      kurikulum: '2024',
    },
  })
  console.log('✅ Sample student (NIM: 041234567 / Pass: Mahasiswa123!) seeded.')

  // Also update Cindy if present
  await prisma.mahasiswa.updateMany({
    where: { nim: '045130359' },
    data: { password: defaultStudentHash, kurikulum: '2024' },
  })
  console.log('✅ Student Cindy (NIM: 045130359) password configured.')

  console.log('🎉 Setup Pengguguran Mata Kuliah completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Setup error:', e)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

