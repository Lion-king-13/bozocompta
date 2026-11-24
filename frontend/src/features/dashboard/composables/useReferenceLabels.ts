import { computed, shallowRef } from 'vue'
import { COST_CENTER_TYPE_LABELS } from '@/domain'
import type { Card, Category, CostCenter, LegalEntity, Supplier, User } from '@/domain'
import { useServices } from '@/services'
import { useAuthStore } from '@/stores/auth'

/**
 * Libellés des référentiels (entités, catégories, centres de coûts, collaborateurs, cartes,
 * fournisseurs) pour afficher des noms à la place des identifiants.
 * Chaque liste n'est chargée que si le rôle y a droit ; sinon on affiche un libellé neutre.
 * Un échec de chargement n'empêche pas l'écran de fonctionner (libellé de repli).
 */
export function useReferenceLabels() {
  const services = useServices()
  const auth = useAuthStore()
  const entities = shallowRef<LegalEntity[]>([])
  const categories = shallowRef<Category[]>([])
  const costCenters = shallowRef<CostCenter[]>([])
  const users = shallowRef<User[]>([])
  const cards = shallowRef<Card[]>([])
  const suppliers = shallowRef<Supplier[]>([])

  async function safe<T>(enabled: boolean, load: () => Promise<T[]>): Promise<T[]> {
    if (!enabled) return []
    try {
      return await load()
    } catch {
      return []
    }
  }

  async function load(): Promise<void> {
    const [e, cat, cc, u, c, s] = await Promise.all([
      safe(true, () => services.organization.listEntities()),
      safe(true, () => services.categories.listCategories()),
      safe(true, () => services.costCenters.listCostCenters()),
      safe(auth.can('users:read'), () => services.users.listUsers()),
      safe(auth.can('cards:read'), () => services.cards.listCards()),
      safe(true, () => services.suppliers.listSuppliers()),
    ])
    entities.value = e
    categories.value = cat
    costCenters.value = cc
    users.value = u
    cards.value = c
    suppliers.value = s
  }

  const fullAccess = () => auth.role === 'admin' || auth.role === 'finance'

  const byId = <T extends { id: string }>(list: T[]) => new Map(list.map((x) => [x.id, x]))
  const entityMap = computed(() => byId(entities.value))
  const categoryMap = computed(() => byId(categories.value))
  const costCenterMap = computed(() => byId(costCenters.value))
  const userMap = computed(() => byId(users.value))
  const cardMap = computed(() => byId(cards.value))
  const supplierMap = computed(() => byId(suppliers.value))

  /**
   * Emplacement de couleur d'une entité : sa position dans la liste de l'organisation
   * (Belgique = 1, France = 2 sur TOUS les écrans — la couleur suit l'entité, pas son rang).
   */
  function entitySlot(id: string): number {
    const index = entities.value.findIndex((e) => e.id === id)
    return index >= 0 ? index + 1 : 9
  }

  return {
    entities,
    categories,
    costCenters,
    load,
    entitySlot,
    entity: (id: string | null) => (id ? (entityMap.value.get(id)?.name ?? 'Entité') : '—'),
    category: (id: string | null) =>
      id ? (categoryMap.value.get(id)?.name ?? 'Catégorie') : 'Non catégorisé',
    costCenter: (id: string | null) => {
      if (!id) return 'Sans centre de coûts'
      const cc = costCenterMap.value.get(id)
      return cc ? `${COST_CENTER_TYPE_LABELS[cc.type]} · ${cc.name}` : 'Centre de coûts'
    },
    // Clé `null` : dépense sans carte, ET pour un utilisateur limité, dépense d'un porteur hors
    // de ses entités (le service retire nom et carte, QA-20). Aucun nom n'est déduit ici.
    user: (id: string | null) => {
      if (!id)
        return fullAccess()
          ? 'Hors carte (virements, prélèvements)'
          : 'Hors carte, ou autres porteurs (hors de vos entités)'
      const u = userMap.value.get(id)
      return u ? `${u.firstName} ${u.lastName}` : 'Collaborateur'
    },
    card: (id: string | null) => {
      if (!id) return fullAccess() ? 'Sans carte' : 'Sans carte, ou carte hors de vos entités'
      const c = cardMap.value.get(id)
      return c ? `${c.label} (•••• ${c.last4})` : 'Carte'
    },
    supplier: (id: string | null) =>
      id ? (supplierMap.value.get(id)?.name ?? 'Fournisseur') : '—',
  }
}

export type ReferenceLabels = ReturnType<typeof useReferenceLabels>
