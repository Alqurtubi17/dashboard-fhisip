import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

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
  {
    name: 'Mahasiswa',
    icon: 'GraduationCap',
    permissionKey: 'mahasiswa.view',
    sort: 2,
    children: [
      { name: 'Data Mahasiswa', icon: 'Users', url: '/mahasiswa', permissionKey: 'mahasiswa.view', sort: 1 },
      { name: 'Registrasi', icon: 'ClipboardList', url: '/mahasiswa/registrasi', permissionKey: 'akademik.view', sort: 2 },
      { name: 'KRS', icon: 'FileText', url: '/mahasiswa/krs', permissionKey: 'akademik.view', sort: 3 },
      { name: 'KHS', icon: 'FileText', url: '/mahasiswa/khs', permissionKey: 'akademik.view', sort: 4 },
    ],
  },
  {
    name: 'Akademik',
    icon: 'BookOpen',
    permissionKey: 'akademik.view',
    sort: 3,
    children: [
      { name: 'Jadwal', icon: 'Calendar', url: '/akademik/jadwal', permissionKey: 'akademik.view', sort: 1 },
      { name: 'Nilai', icon: 'Star', url: '/akademik/nilai', permissionKey: 'akademik.view', sort: 2 },
      { name: 'Kurikulum', icon: 'BookMarked', url: '/akademik/kurikulum', permissionKey: 'akademik.view', sort: 3 },
    ],
  },
  {
    name: 'Kemahasiswaan',
    icon: 'Award',
    permissionKey: 'kemahasiswaan.view',
    sort: 4,
    children: [
      { name: 'Beasiswa', icon: 'Wallet', url: '/kemahasiswaan/beasiswa', permissionKey: 'kemahasiswaan.view', sort: 1 },
      { name: 'Prestasi', icon: 'Trophy', url: '/kemahasiswaan/prestasi', permissionKey: 'kemahasiswaan.view', sort: 2 },
      { name: 'Organisasi', icon: 'Users2', url: '/kemahasiswaan/organisasi', permissionKey: 'kemahasiswaan.view', sort: 3 },
      { name: 'Alumni', icon: 'UserCheck', url: '/kemahasiswaan/alumni', permissionKey: 'kemahasiswaan.view', sort: 4 },
    ],
  },
  { name: 'Laporan', icon: 'FileBarChart', url: '/laporan', permissionKey: 'laporan.view', sort: 5 },
  {
    name: 'Pengaturan Akses',
    icon: 'Settings',
    permissionKey: 'roles.view',
    sort: 6,
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
