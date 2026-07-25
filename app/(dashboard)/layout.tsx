import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getRolePermissionKeys, filterMenuByPermissions } from '@/lib/permissions'
import DashboardShell from '@/components/layout/dashboard-shell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const headerList = headers()
  const userId = headerList.get('x-user-id')
  if (!userId) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { id: userId! },
    include: { role: true },
  })
  if (!user) redirect('/login')

  const permissionKeys = await getRolePermissionKeys(user.roleId)

  const menuTree = await prisma.menu.findMany({
    where: { parentId: null },
    include: { children: { orderBy: { sort: 'asc' } } },
    orderBy: { sort: 'asc' },
  })

  const visibleMenus = filterMenuByPermissions(menuTree as any, permissionKeys)

  return (
    <DashboardShell menus={visibleMenus as any} user={{ name: user.name, role: user.role.name }}>
      {children}
    </DashboardShell>
  )
}
