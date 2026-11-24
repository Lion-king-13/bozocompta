import { readonly, ref } from 'vue'
import type { ToastItem, Tone } from '@/components/ui/types'

/**
 * Notifications brèves (« toasts ») partagées par toute l'application.
 * État au niveau du module : chaque appel à `useToasts()` voit la même liste.
 * L'affichage est assuré par `<ToastRegion>`, monté une seule fois dans `App.vue`.
 *
 *   const toast = useToasts()
 *   toast.success('Facture validée et enregistrée.')
 *   toast.error('Impossible d’enregistrer : le serveur ne répond pas.')
 *
 * Règle : un toast confirme une action ou signale un échec non bloquant. Une erreur qui
 * empêche de continuer s'affiche dans la page (`ErrorMessage`, `BaseAlert`).
 */
const items = ref<ToastItem[]>([])
let counter = 0

/** Durées d'affichage (ms) : les erreurs restent plus longtemps. */
const DURATION: Record<Tone, number> = {
  neutral: 5000,
  info: 5000,
  success: 5000,
  warning: 8000,
  danger: 8000,
}

function push(tone: Tone, message: string): string {
  const id = `toast-${++counter}`
  items.value = [...items.value, { id, tone, title: message, duration: DURATION[tone] }]
  return id
}

function dismiss(id: string): void {
  items.value = items.value.filter((t) => t.id !== id)
}

export function useToasts() {
  return {
    /** Liste en lecture seule (à passer à `<ToastRegion :toasts>`). */
    toasts: readonly(items),
    success: (message: string) => push('success', message),
    error: (message: string) => push('danger', message),
    info: (message: string) => push('info', message),
    dismiss,
  }
}

/** Réservé aux tests : vide la liste. */
export function resetToasts(): void {
  items.value = []
  counter = 0
}
