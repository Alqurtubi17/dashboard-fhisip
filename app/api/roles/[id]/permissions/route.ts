import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const ACTIONS = ['view', 'create', 'edit', 'delete', 'export', 'approve']

// Helper function to extract a unique module slug from Menu object (based on URL / menu identity)
function extractModuleSlug(menu: { name: string; url?: string | null; permissionKey?: string | null }): {
  slug: string
  label: string
} {
  // Primary: Use clean URL path to ensure every unique page gets its own permission block
  if (menu.url && menu.url !== '#' && menu.url !== 'null') {
    const cleanUrl = menu.url.replace(/^\/+/, '').replace(/\/+$/, '').trim()
    if (cleanUrl) {
      const slug = cleanUrl.replace(/[^a-z0-9]/g, '_').toLowerCase()
      return { slug, label: menu.name }
    }
  }

  // Secondary: Slugify menu name
  const slug = menu.name.toLowerCase().replace(/[^a-z0-9]/g, '_').trim()
  return { slug, label: menu.name }
}

// GET -> returns all permissions grouped strictly in the exact order of active sidebar navigation menus
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const role = await prisma.role.findFirst({
      where: {
        OR: [{ id: params.id }, { slug: params.id }],
      },
    })

    if (!role) return NextResponse.json({ error: 'Role tidak ditemukan' }, { status: 404 })

    // 1. Fetch parent menus and children from PostgreSQL ordered strictly by sidebar sort order
    const dbMenus = await prisma.menu.findMany({
      where: { parentId: null },
      orderBy: { sort: 'asc' },
      include: {
        children: {
          orderBy: { sort: 'asc' },
        },
      },
    })

    const orderedModules: { slug: string; label: string }[] = []
    const activeSidebarModules = new Map<string, string>()

    for (const parent of dbMenus) {
      if (parent.children && parent.children.length > 0) {
        for (const child of parent.children) {
          const { slug } = extractModuleSlug(child)
          const label = `${child.name} (${parent.name})`
          if (slug && !activeSidebarModules.has(slug)) {
            activeSidebarModules.set(slug, label)
            orderedModules.push({ slug, label })
          }
        }
      } else if (parent.url && parent.url !== '#' && parent.url !== 'null') {
        const { slug } = extractModuleSlug(parent)
        const label = parent.name
        if (slug && !activeSidebarModules.has(slug)) {
          activeSidebarModules.set(slug, label)
          orderedModules.push({ slug, label })
        }
      }
    }

    const dynamicModuleLabels: Record<string, string> = {}

    // Auto-create permission entries for all active sidebar menus if missing
    for (const item of orderedModules) {
      dynamicModuleLabels[item.slug] = item.label

      for (const action of ACTIONS) {
        await prisma.permission.upsert({
          where: { module_action: { module: item.slug, action } },
          update: { label: `${item.label} - ${action}` },
          create: {
            module: item.slug,
            action,
            label: `${item.label} - ${action}`,
          },
        })
      }
    }

    // 2. Fetch all permissions from PostgreSQL and group them in exact sidebar sequence
    const allPermissions = await prisma.permission.findMany({ orderBy: [{ module: 'asc' }, { action: 'asc' }] })
    const rolePermissions = await prisma.rolePermission.findMany({ where: { roleId: role.id } })
    const checkedIds = new Set(rolePermissions.map((rp) => rp.permissionId))

    const grouped: Record<string, { id: string; action: string; checked: boolean }[]> = {}

    for (const item of orderedModules) {
      const perms = allPermissions.filter((p) => p.module === item.slug)
      if (perms.length > 0) {
        grouped[item.slug] = perms.map((p) => ({
          id: p.id,
          action: p.action,
          checked: checkedIds.has(p.id) || role.isSystem,
        }))
      }
    }

    return NextResponse.json({
      role,
      modules: grouped,
      moduleLabels: dynamicModuleLabels,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal memuat permission' }, { status: 500 })
  }
}

const putSchema = z.object({
  permissionIds: z.array(z.string()),
})

// PUT -> replace the full set of permissions assigned to this role
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const role = await prisma.role.findFirst({
      where: {
        OR: [{ id: params.id }, { slug: params.id }],
      },
    })

    if (!role) return NextResponse.json({ error: 'Role tidak ditemukan' }, { status: 404 })

    if (role.isSystem) {
      return NextResponse.json(
        { error: 'Hak Akses Super Admin memiliki otorisasi penuh dan tidak dapat diubah.' },
        { status: 403 }
      )
    }

    const body = await req.json().catch(() => null)
    const parsed = putSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    await prisma.$transaction([
      prisma.rolePermission.deleteMany({ where: { roleId: role.id } }),
      prisma.rolePermission.createMany({
        data: parsed.data.permissionIds.map((permissionId) => ({ roleId: role.id, permissionId })),
        skipDuplicates: true,
      }),
    ])

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal menyimpan permission' }, { status: 500 })
  }
}
