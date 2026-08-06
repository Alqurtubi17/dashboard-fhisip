import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import fhisipPrediksiData from '../data/fhisip-prediksi-kelas.json'

const prisma = new PrismaClient()

const MODULES = [
  'dashboard',
  'mahasiswa',
  'dosen',
  'akademik',
  'kemahasiswaan',
  'laporan',
  'users',
  'roles',
  'permissions',
  'menus',
  'sinkronisasi',
]

const ACTIONS = ['view', 'create', 'edit', 'delete', 'approve', 'export']

const ROLES = [
  { name: 'Super Admin', slug: 'superadmin', isSystem: true },
  { name: 'Kaprodi', slug: 'kaprodi' },
  { name: 'Akademik', slug: 'akademik' },
  { name: 'Kemahasiswaan', slug: 'kemahasiswaan' },
  { name: 'Dekanat', slug: 'dekanat' },
]

const MENUS: {
  name: string
  icon: string
  url?: string
  permissionKey?: string
  sort: number
  children?: { name: string; icon: string; url: string; permissionKey?: string; sort: number }[]
}[] = [
  { name: 'Dashboard', icon: 'LayoutDashboard', url: '/dashboard', permissionKey: 'dashboard.view', sort: 1 },
  { name: 'Mahasiswa', icon: 'GraduationCap', url: '/mahasiswa', permissionKey: 'mahasiswa.view', sort: 2 },
  {
    name: 'Akademik',
    icon: 'BookOpen',
    permissionKey: 'akademik.view',
    sort: 3,
    children: [
      { name: 'Jadwal dan Agenda Akademik', icon: 'Calendar', url: '/akademik/jadwal', permissionKey: 'akademik.view', sort: 1 },
      { name: 'Kebutuhan Kelas & Tutor', icon: 'LayoutGrid', url: '/akademik/kelas', permissionKey: 'akademik.view', sort: 2 },
    ],
  },
  { name: 'Kemahasiswaan', icon: 'Award', url: '/kemahasiswaan/prestasi', permissionKey: 'kemahasiswaan.view', sort: 4 },
  {
    name: 'Pengaturan Akses',
    icon: 'Settings',
    permissionKey: 'roles.view',
    sort: 5,
    children: [
      { name: 'Manajemen Role', icon: 'Shield', url: '/roles', permissionKey: 'roles.view', sort: 1 },
      { name: 'Manajemen Menu', icon: 'Menu', url: '/menus', permissionKey: 'menus.view', sort: 2 },
      { name: 'Manajemen User', icon: 'UserCog', url: '/users', permissionKey: 'users.view', sort: 3 },
      { name: 'Integrasi API & Login', icon: 'KeyRound', url: '/api-configs', permissionKey: 'roles.view', sort: 4 },
      { name: 'Audit Log', icon: 'History', url: '/audit', permissionKey: 'roles.view', sort: 5 },
    ],
  },
]

async function main() {
  // 1. Permissions
  console.log('Seeding permissions...')
  const permissionData = MODULES.flatMap((module) =>
    ACTIONS.map((action) => ({ module, action, label: `${action} ${module}` }))
  )
  await prisma.permission.createMany({ data: permissionData, skipDuplicates: true })
  const allPermissions = await prisma.permission.findMany()

  // 2. Roles
  console.log('Seeding roles...')
  const roleRecords: Record<string, string> = {}
  for (const r of ROLES) {
    const role = await prisma.role.upsert({
      where: { slug: r.slug },
      update: {},
      create: { name: r.name, slug: r.slug, isSystem: !!r.isSystem },
    })
    roleRecords[r.slug] = role.id
  }

  // Superadmin gets ALL permissions
  const superadminId = roleRecords['superadmin']
  await prisma.rolePermission.createMany({
    data: allPermissions.map((p) => ({ roleId: superadminId, permissionId: p.id })),
    skipDuplicates: true,
  })

  // Sensible defaults for the other 4 roles
  const defaults: Record<string, string[]> = {
    kaprodi: ['dashboard', 'mahasiswa', 'akademik', 'laporan'],
    akademik: ['dashboard', 'mahasiswa', 'akademik', 'dosen'],
    kemahasiswaan: ['dashboard', 'kemahasiswaan'],
    dekanat: ['dashboard', 'laporan'],
  }
  for (const [slug, modules] of Object.entries(defaults)) {
    const perms = allPermissions.filter((p) => modules.includes(p.module) && ['view', 'export'].includes(p.action))
    await prisma.rolePermission.createMany({
      data: perms.map((p) => ({ roleId: roleRecords[slug], permissionId: p.id })),
      skipDuplicates: true,
    })
  }

  // 3. Menus (clean & recreate to prevent duplicates)
  console.log('Seeding menus...')
  await prisma.menu.deleteMany()
  for (const m of MENUS) {
    const parent = await prisma.menu.create({
      data: {
        name: m.name,
        icon: m.icon,
        url: m.url,
        sort: m.sort,
        permissionKey: m.permissionKey,
      },
    })
    if (m.children) {
      for (const c of m.children) {
        await prisma.menu.create({
          data: {
            name: c.name,
            icon: c.icon,
            url: c.url,
            sort: c.sort,
            permissionKey: c.permissionKey,
            parentId: parent.id,
          },
        })
      }
    }
  }

  // 4. Default users
  console.log('Seeding users...')
  const hash = await bcrypt.hash('Admin123!', 10)

  const sampleUsers = [
    { name: 'Super Admin', email: 'admin@kampus.ac.id', roleId: superadminId },
    { name: 'Dr. Hendra (Kaprodi)', email: 'kaprodi@kampus.ac.id', roleId: roleRecords['kaprodi'] },
    { name: 'Staf Akademik', email: 'akademik@kampus.ac.id', roleId: roleRecords['akademik'] },
    { name: 'Staf Kemahasiswaan', email: 'kemahasiswaan@kampus.ac.id', roleId: roleRecords['kemahasiswaan'] },
  ]

  for (const u of sampleUsers) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { roleId: u.roleId },
      create: {
        name: u.name,
        email: u.email,
        password: hash,
        roleId: u.roleId,
      },
    })
  }

  // 5. Prediksi Kelas per Masa Akademik (Authentic 20261 Only)
  console.log('Seeding Prediksi Kelas untuk 2026.1 di PostgreSQL...')
  // Clean up any 20262 dummy records if present
  await (prisma as any).prediksiKelas.deleteMany({ where: { masa: '20262' } })

  const items20261 = fhisipPrediksiData.map((item: any) => ({
    masa: '20261',
    kodeMatkul: item.kodeMatkul,
    namaMatkul: item.namaMatkul,
    sks: item.sks || 3,
    prodiCode: item.prodiCode,
    prodiName: item.prodiName,
    sipasNonTtm: item.sipasNonTtm || 0,
    nonSipas: item.nonSipas || 0,
    ttmSipas: item.ttmSipas || 0,
    tutonSipas: item.tutonSipas || 0,
    jumlahTTM: item.jumlahTTM || 0,
    jumlahTuton: item.jumlahTuton || 0,
    totalMahasiswa: item.totalMahasiswa || 0,
    kebutuhanKelas: item.kebutuhanKelas || 0,
    kebutuhanTutorMin: item.kebutuhanTutorMin || 0,
  }))

  for (const item of items20261) {
    await (prisma as any).prediksiKelas.upsert({
      where: { masa_kodeMatkul: { masa: '20261', kodeMatkul: item.kodeMatkul } },
      update: item,
      create: item,
    })
  }

  console.log('Seed selesai. Superadmin: admin@kampus.ac.id / Admin123!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
