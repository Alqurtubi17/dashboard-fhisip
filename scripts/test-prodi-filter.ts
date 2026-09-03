import { prisma } from '../lib/prisma'

async function testProdiFilter(prodiCode: string) {
  const pUpper = prodiCode.trim().toUpperCase()
  const andConditions: any[] = []

  if (pUpper === 'HKUM') {
    andConditions.push({ OR: [{ prodiCode: '311' }, { prodi: { contains: 'Hukum', mode: 'insensitive' } }] })
  } else if (pUpper === 'IKOM') {
    andConditions.push({ OR: [{ prodiCode: '72' }, { prodi: { contains: 'Komunikasi', mode: 'insensitive' } }] })
  } else if (pUpper === 'ADPU') {
    andConditions.push({ OR: [{ prodiCode: { in: ['50', '52', '86'] } }, { prodi: { contains: 'Administrasi Negara', mode: 'insensitive' } }, { prodi: { contains: 'Administrasi Publik', mode: 'insensitive' } }] })
  } else if (pUpper === 'ADBI') {
    andConditions.push({ OR: [{ prodiCode: '51' }, { prodi: { contains: 'Administrasi Bisnis', mode: 'insensitive' } }] })
  } else if (pUpper === 'IPEM') {
    andConditions.push({ OR: [{ prodiCode: '71' }, { prodi: { contains: 'Pemerintahan', mode: 'insensitive' } }] })
  } else if (pUpper === 'SOSI') {
    andConditions.push({ OR: [{ prodiCode: '70' }, { prodi: { contains: 'Sosiologi', mode: 'insensitive' } }] })
  } else if (pUpper === 'SING') {
    andConditions.push({ OR: [{ prodiCode: { in: ['87', '47', '63', '64', '49', '48', '25', '21'] } }, { prodi: { contains: 'Sastra Inggris', mode: 'insensitive' } }, { prodi: { contains: 'Bahasa Inggris', mode: 'insensitive' } }, { prodi: { contains: 'English', mode: 'insensitive' } }] })
  } else if (pUpper === 'PUS') {
    andConditions.push({ OR: [{ prodiCode: { in: ['310', '43'] } }, { prodi: { contains: 'Perpustakaan', mode: 'insensitive' } }] })
  } else if (pUpper === 'PAJAK') {
    andConditions.push({ OR: [{ prodiCode: '312' }, { prodi: { contains: 'Perpajakan', mode: 'insensitive' } }, { prodi: { contains: 'Pajak', mode: 'insensitive' } }] })
  }

  const count = await (prisma as any).mahasiswa.count({ where: { AND: andConditions } })
  return count
}

async function main() {
  const codes = ['HKUM', 'IKOM', 'ADPU', 'ADBI', 'IPEM', 'SOSI', 'SING', 'PUS', 'PAJAK']
  console.log('🧪 Testing prodi filter counts:')
  for (const code of codes) {
    const count = await testProdiFilter(code)
    console.log(`   - Filter [${code}]: ${count.toLocaleString('id-ID')} mahasiswa`)
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
