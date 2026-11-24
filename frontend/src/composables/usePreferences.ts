import { ref, watch } from 'vue'
import type { Id } from '@/domain'

/**
 * Préférences d'affichage de l'utilisateur, conservées dans CE navigateur (localStorage).
 * Confort uniquement : rien de financier ni de sensible. Si le stockage est indisponible
 * (navigation privée), les valeurs par défaut s'appliquent.
 */
export interface Preferences {
  /** Périmètre appliqué à la connexion (null = organisation consolidée / toutes mes entités). */
  defaultEntityId: Id | null
  /** Afficher la légende de provenance IA en haut des écrans de correction. */
  showAiLegend: boolean
}

const STORAGE_KEY = 'cashlens.preferences'
const DEFAULTS: Preferences = { defaultEntityId: null, showAiLegend: true }

function read(): Preferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Preferences>) } : { ...DEFAULTS }
  } catch {
    return { ...DEFAULTS }
  }
}

const preferences = ref<Preferences>(read())

watch(
  preferences,
  (value) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    } catch {
      /* stockage indisponible : la préférence ne survivra pas au rechargement */
    }
  },
  { deep: true },
)

export function usePreferences() {
  return preferences
}
