import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function addKelasMenu() {
  const akademikParent = await prisma.menu.findFirst({
    where: { name: 'Akademik' },
  })

  if (!akademikParent) {
    console.log('Akademik parent menu not found')
    return
  }

  // Check if kelas menu exists
  const existing = await prisma.menu.findFirst({
    where: { url: '/akademik/kelas' },
  })

  if (!existing) {
    const created = await prisma.menu.create({
      data: {
        name: 'Kebutuhan Kelas',
        url: '/akademik/kelas',
        icon: 'LayoutGrid',
        sort: 5,
        parentId: akademikParent.id,
      },
    })
    console.log('Created menu:', created.name, created.url)
  } else {
    console.log('Kelas menu already exists:', existing.url)
  }
}

addKelasMenu()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
