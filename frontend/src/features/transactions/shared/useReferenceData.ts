import { computed, ref, shallowRef } from 'vue'
import { toApiError, type ApiError } from '@/core/errors'
import type { Card, Category, CostCenter, Id, LegalEntity, Supplier, User } from '@/domain'
import { useServices } from '@/services'
import { maskedCard } from './labels'

/**
 * Référentiels utilisés par les écrans financiers pour afficher des NOMS au lieu d'identifiants
 * (entités, fournisseurs, catégories, collaborateurs, cartes, centres de coûts).
 *
 * Chaque liste est chargée par son service. Une liste refusée par les droits (ex. un
 * collaborateur ne peut pas lister les collaborateurs) reste simplement vide ; toute autre
 * erreur (réseau…) est exposée dans `error` pour que la page propose « Réessayer ».
 */
export function useReferenceData() {
  const services = useServices()
  const entities = shallowRef<LegalEntity[]>([])
  const suppliers = shallowRef<Supplier[]>([])
  const categories = shallowRef<Category[]>([])
  const users = shallowRef<User[]>([])
  const cards = shallowRef<Card[]>([])
  const costCenters = shallowRef<CostCenter[]>([])
  const loading = ref(false)
  const error = shallowRef<ApiError | null>(null)

  async function load(): Promise<void> {
    loading.value = true
    error.value = null
    const results = await Promise.allSettled([
      services.organization.listEntities(),
      services.suppliers.listSuppliers(),
      services.categories.listCategories(),
      services.users.listUsers(),
      services.cards.listCards(),
      services.costCenters.listCostCenters(),
    ])
    const value = <T>(index: number): T[] => {
      const result = results[index]
      if (result?.status === 'fulfilled') return result.value as T[]
      const apiError = toApiError(result?.reason)
      if (apiError.code !== 'FORBIDDEN' && !error.value) error.value = apiError
      return []
    }
    entities.value = value<LegalEntity>(0)
    suppliers.value = value<Supplier>(1)
    categories.value = value<Category>(2)
    users.value = value<User>(3)
    cards.value = value<Card>(4)
    costCenters.value = value<CostCenter>(5)
    loading.value = false
  }

  const byId = <T extends { id: Id }>(list: T[]) => new Map(list.map((item) => [item.id, item]))
  const entityMap = computed(() => byId(entities.value))
  const supplierMap = computed(() => byId(suppliers.value))
  const categoryMap = computed(() => byId(categories.value))
  const userMap = computed(() => byId(users.value))
  const cardMap = computed(() => byId(cards.value))
  const costCenterMap = computed(() => byId(costCenters.value))

  /** Nom de l'entité tel que fourni par le service, comme sur les tableaux de bord (QA-17). */
  const entityName = (id: Id | null | undefined) => (id && entityMap.value.get(id)?.name) || '—'
  const supplierName = (id: Id | null | undefined) => (id && supplierMap.value.get(id)?.name) || '—'
  const categoryName = (id: Id | null | undefined) =>
    (id && categoryMap.value.get(id)?.name) || 'Non catégorisée'
  function userName(id: Id | null | undefined): string {
    const user = id ? userMap.value.get(id) : undefined
    return user ? `${user.firstName} ${user.lastName}` : '—'
  }
  function cardLabel(id: Id | null | undefined): string {
    const card = id ? cardMap.value.get(id) : undefined
    return card ? maskedCard(card.last4) : '—'
  }
  /** Titulaire de la carte (collaborateur qui a payé), si paiement par carte. */
  function cardHolderName(cardId: Id | null | undefined): string {
    const card = cardId ? cardMap.value.get(cardId) : undefined
    return card ? userName(card.holderUserId) : '—'
  }
  const costCenterName = (id: Id | null | undefined) =>
    (id && costCenterMap.value.get(id)?.name) || ''

  /** Cible d'imputation lisible : « France — Projet France — Lancement Paris ». */
  function targetLabel(entityId: Id, costCenterId: Id | null): string {
    const cc = costCenterName(costCenterId)
    return cc ? `${entityName(entityId)} — ${cc}` : entityName(entityId)
  }

  return {
    entities,
    suppliers,
    categories,
    users,
    cards,
    costCenters,
    loading,
    error,
    load,
    entityName,
    supplierName,
    categoryName,
    userName,
    cardLabel,
    cardHolderName,
    costCenterName,
    targetLabel,
  }
}

export type ReferenceData = ReturnType<typeof useReferenceData>
