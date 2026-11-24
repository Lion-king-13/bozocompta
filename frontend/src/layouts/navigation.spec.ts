import { describe, expect, it } from 'vitest'
import { hasPermission, type Role } from '@/domain'
import { RouteName } from '@/router/routeNames'
import { NAVIGATION, visibleNavGroups } from './navigation'

const routesFor = (role: Role) =>
  visibleNavGroups((p) => hasPermission(role, p)).flatMap((g) => g.items.map((i) => i.route))

describe('navigation', () => {
  it('l’administrateur voit toutes les entrées', () => {
    expect(routesFor('admin')).toHaveLength(NAVIGATION.length)
  })

  it('un collaborateur ne voit que les entrées autorisées, sans groupe vide', () => {
    const groups = visibleNavGroups((p) => hasPermission('member', p))
    expect(groups.every((g) => g.items.length > 0)).toBe(true)
    expect(routesFor('member')).toEqual([
      RouteName.OrganizationDashboard,
      RouteName.Transactions,
      RouteName.MissingReceipts,
      RouteName.Cards,
      RouteName.PrivacySettings,
      RouteName.Settings,
    ])
  })

  it('la consommation IA est masquée pour un manager', () => {
    expect(routesFor('manager')).not.toContain(RouteName.AiUsage)
    expect(routesFor('manager')).toContain(RouteName.Reconciliations)
  })
})
