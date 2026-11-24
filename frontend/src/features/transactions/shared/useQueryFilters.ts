import { reactive, watch } from 'vue'
import { useRoute, useRouter, type LocationQuery } from 'vue-router'

/**
 * Filtres d'une liste synchronisés avec l'URL (QA-01) :
 * - à l'arrivée, chaque filtre est LU dans `route.query` (lien partagé, compteur du tableau
 *   de bord, nouvel onglet) ;
 * - quand l'utilisateur filtre, l'URL est RÉÉCRITE (`router.replace`, pour ne pas empiler une
 *   entrée d'historique par frappe) ;
 * - si l'URL change sans quitter la page (lien du menu, retour arrière), les filtres suivent.
 * Les noms des paramètres sont ceux des champs des `XxxQuery` du domaine (`status`, `entityId`…).
 * Les paramètres du mode démo (`demoError…`) ne sont jamais réécrits, pour ne pas réactiver
 * une erreur simulée à chaque changement de filtre.
 */
export function useQueryFilters<T extends Record<string, string>>(defaults: T): T {
  const route = useRoute()
  const router = useRouter()
  const keys = Object.keys(defaults) as (keyof T & string)[]
  const filters = reactive({ ...defaults }) as T
  /** On ne réagit qu'aux changements d'URL de CETTE page (pas à la navigation vers une autre). */
  const pageName = route.name

  function readFrom(query: LocationQuery) {
    for (const key of keys) {
      const value = query[key]
      const next = (typeof value === 'string' ? value : defaults[key]) as T[typeof key]
      if (filters[key] !== next) filters[key] = next
    }
  }
  readFrom(route.query)

  watch(
    () => ({ ...filters }),
    (value) => {
      if (route.name !== pageName) return
      const query: LocationQuery = {}
      for (const [key, v] of Object.entries(route.query)) {
        if (!key.startsWith('demoError') && !keys.includes(key)) query[key] = v
      }
      for (const key of keys) if (value[key]) query[key] = value[key]
      if (JSON.stringify(query) !== JSON.stringify(stripDemo(route.query)))
        void router.replace({ query })
    },
  )
  watch(
    () => route.query,
    (query) => {
      if (route.name === pageName) readFrom(query)
    },
  )

  return filters
}

function stripDemo(query: LocationQuery): LocationQuery {
  return Object.fromEntries(Object.entries(query).filter(([k]) => !k.startsWith('demoError')))
}
