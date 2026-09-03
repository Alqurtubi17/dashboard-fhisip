import { prisma } from '../lib/prisma'

async function main() {
  console.log('🔄 Memulai pembaruan cepat semester mahasiswa di PostgreSQL DB via Raw SQL...')

  const startTime = Date.now()

  // Fast set semester 1..8 based on hashtext(nim) in PostgreSQL
  const updatedCount = await prisma.$executeRawUnsafe(
    `UPDATE mahasiswa SET semester = (ABS(HASHTEXT(nim)) % 8) + 1;`
  )

  const duration = ((Date.now() - startTime) / 1000).toFixed(2)
  console.log(`✅ Selesai! Berhasil memperbarui ${updatedCount} data mahasiswa dalam ${duration} detik.`)

  // Check distribution
  const grouped: any[] = await prisma.$queryRawUnsafe(
    `SELECT semester, COUNT(*)::int as count FROM mahasiswa GROUP BY semester ORDER BY semester ASC;`
  )

  console.log('\n📈 Distribusi Semester Mahasiswa Saat Ini di PostgreSQL DB:')
  for (const g of grouped) {
    console.log(`   - Semester ${g.semester}: ${Number(g.count).toLocaleString('id-ID')} mahasiswa`)
  }
}

main()
  .catch((e) => {
    console.error('Error fixing semester via raw SQL:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
