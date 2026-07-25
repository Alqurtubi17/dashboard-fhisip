import { prisma } from './prisma'

/**
 * Loads the full set of "module.action" permission keys for a given role.
 * Superadmin (isSystem role) implicitly has every permission.
 */
export async function getRolePermissionKeys(roleId: string): Promise<Set<string>> {
  const role = await prisma.role.findUnique({
    where: { id: roleId },
    include: { permissions: { include: { permission: true } } },
  })
  if (!role) return new Set()

  if (role.isSystem) {
    const all = await prisma.permission.findMany()
    return new Set(all.map((p) => `${p.module}.${p.action}`))
  }

  return new Set(role.permissions.map((rp) => `${rp.permission.module}.${rp.permission.action}`))
}

export function hasPermission(keys: Set<string>, key: string): boolean {
  return keys.has(key)
}

/**
 * Filters the menu tree so a role only sees menus it has permission for.
 * A parent menu with no children left after filtering (and no url of its own) is dropped.
 */
export function filterMenuByPermissions<
  T extends { id: string; url?: string | null; permissionKey?: string | null; children?: T[] }
>(menus: T[], permissionKeys: Set<string>): T[] {
  return menus
    .filter((m) => !m.permissionKey || permissionKeys.has(m.permissionKey))
    .map((m) => ({
      ...m,
      children: m.children && m.children.length > 0 ? filterMenuByPermissions(m.children, permissionKeys) : undefined,
    }))
    .filter((m) => {
      const hasChildren = Boolean(m.children && m.children.length > 0)
      const hasUrl = Boolean(m.url && m.url.trim() !== '')
      return hasUrl || hasChildren
    })
}

